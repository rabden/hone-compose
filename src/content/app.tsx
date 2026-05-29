import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  createAdapter,
  isEditableElement,
  computeInferenceOptions,
  resolveReplacementSpan,
  resolveActiveContext,
  type InferredSelection,
  type ActiveContext,
  type EditableAdapter,
} from "./adapters";
import { copyForManualPaste } from "./rich-editor-replace";
import { autoPositionElement, type VirtualElement } from "./positioning";
import { ActionRegistry, type ActionHandler } from "./actions";
import { PreviewPanel } from "./preview-panel";
import type { PendingPreview } from "./preview-types";
import { FloatingActionMenu } from "./floating-action-menu";
import { OverlayToast, TriggerDot } from "./overlay-chrome";
import { TargetHighlight } from "./target-highlight";
import { ConfirmDialog } from "./confirm-dialog";
import {
  consumeKeyboardEvent,
  isActivationKey,
  shouldSuppressActivationKey,
} from "./keyboard-guard";

interface Toast {
  message: string;
  type: "success" | "error";
}

interface Shortcut {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  action: string;
}

export default function App({
  portalContainer: _portalContainer,
}: {
  portalContainer?: HTMLElement;
}) {
  const [activeContext, setActiveContext] = useState<ActiveContext | null>(
    null,
  );
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [shortcut, setShortcut] = useState<Shortcut | null>(null);
  const [dropdownShortcut, setDropdownShortcut] = useState<Shortcut>({
    key: "d",
    ctrl: false,
    alt: true,
    shift: true,
    meta: false,
    action: "toggle_menu",
  });
  const [hideDot, setHideDot] = useState(false);
  const [inferenceOptions, setInferenceOptions] = useState<any | null>(null);
  const [selectedInferenceLevel, setSelectedInferenceLevel] = useState<
    "selection" | "sentence" | "paragraph" | "field" | null
  >(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const [focusedActionIdx, setFocusedActionIdx] = useState(0);
  const [customActions, setCustomActions] = useState<ActionHandler[]>([]);
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(
    null,
  );
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processingSpan, setProcessingSpan] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{
    action: string;
    actionLabel: string;
    override?: InferredSelection;
  } | null>(null);
  const [confirmPos, setConfirmPos] = useState({ top: 0, left: 0 });

  const menuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const registryRef = useRef<ActionRegistry | null>(null);
  const focusedActionIdxRef = useRef(0);
  const suppressKeysUntilRef = useRef(0);
  const dotRef = useRef<HTMLButtonElement>(null);
  const isInsideShadow = useRef(false);
  const isMenuOpenRef = useRef(false);
  const pendingPreviewRef = useRef(false);
  const actionConfirmRef = useRef(false);
  const isAiProcessingRef = useRef(false);
  const aiRequestIdRef = useRef(0);
  const editorElementRef = useRef<HTMLElement | null>(null);
  const savedSelectionRef = useRef<unknown>(null);
  const activeContextRef = useRef<ActiveContext | null>(null);
  const processingAdapterRef = useRef<EditableAdapter | null>(null);
  const processingSpanRef = useRef<{ start: number; end: number } | null>(null);
  const anchorRectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef(0);
  const blurTimeoutRef = useRef(0);

  // Sync refs synchronously
  useEffect(() => {
    activeContextRef.current = activeContext;
  }, [activeContext]);
  useEffect(() => {
    anchorRectRef.current = anchorRect;
  }, [anchorRect]);

  // ── Load custom actions from registry ──
  useEffect(() => {
    const load = async () => {
      const registry = new ActionRegistry();
      await registry.loadCustoms();
      registryRef.current = registry;
      setCustomActions(registry.getByCategory("custom"));
    };
    load();

    // Reload on storage changes
    const onChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.customActions) {
        load();
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  const saveEditorFocus = useCallback(() => {
    const adapter = activeContextRef.current?.adapter;
    if (!adapter) return;
    editorElementRef.current = adapter.getElement();
    savedSelectionRef.current = adapter.saveSelection();
  }, []);

  const restoreEditorFocus = useCallback(() => {
    const el = editorElementRef.current;
    if (!el || !document.contains(el)) return;
    // Check if focus has already moved to a different element
    const active = document.activeElement;
    if (active && active !== el && !el.contains(active)) {
      // Focus has moved to a different element, don't steal it back
      return;
    }
    el.focus({ preventScroll: true });
    const adapter = createAdapter(el);
    if (adapter && savedSelectionRef.current != null) {
      try {
        adapter.restoreSelection(savedSelectionRef.current);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const applyPendingPreview = useCallback(() => {
    const preview = pendingPreview;
    if (!preview) return;

    let ctx = activeContextRef.current;
    if (!ctx?.adapter) {
      const resolved = resolveActiveContext();
      if (resolved?.adapter) {
        ctx = resolved;
        activeContextRef.current = resolved;
        setActiveContext(resolved);
      }
    }

    if (!ctx?.adapter) {
      showToast("Cannot apply — focus the field again first.", "error");
      setPendingPreview(null);
      return;
    }

    const applyResult = async () => {
      const tx = await ctx.adapter!.replaceRange(
        preview.span.start,
        preview.span.end,
        preview.resultText,
        {
          expectedText: preview.span.text,
          fieldSnapshot: preview.fieldSnapshot,
        },
      );

      const committed = typeof tx === "boolean" ? tx : tx.committed;
      const suggestClipboard =
        typeof tx === "object" && tx.suggestClipboardPaste;

      if (!committed) {
        if (suggestClipboard) {
          const copied = await copyForManualPaste(preview.resultText);
          showToast(
            copied
              ? "Copied to clipboard — press Ctrl+V in the field to apply."
              : "Could not apply automatically. Copy the result and paste manually.",
            copied ? "success" : "error",
          );
        } else {
          showToast(
            "Could not apply — the field changed while you were reviewing.",
            "error",
          );
        }
        setPendingPreview(null);
        return;
      }

      setPendingPreview(null);
      // Clear saved focus after applying to prevent focus stealing
      editorElementRef.current = null;
      savedSelectionRef.current = null;
      suppressKeysUntilRef.current = performance.now() + 250;
      showToast(`Applied (${preview.span.level})`, "success");
    };

    void applyResult();
  }, [pendingPreview, showToast]);

  const discardPendingPreview = useCallback(() => {
    setPendingPreview(null);
    setIsAiProcessing(false);
    setProcessingSpan(null);
  }, []);

  // Load config from storage
  useEffect(() => {
    const loadConfig = async () => {
      const res = (await chrome.storage.local.get([
        "shortcutKey",
        "shortcutCtrl",
        "shortcutAlt",
        "shortcutShift",
        "shortcutMeta",
        "shortcutAction",
        "dropdownShortcutKey",
        "dropdownShortcutCtrl",
        "dropdownShortcutAlt",
        "dropdownShortcutShift",
        "dropdownShortcutMeta",
        "hideDot",
      ])) as any;

      if (res.shortcutKey) {
        setShortcut({
          key: (res.shortcutKey as string).toLowerCase(),
          ctrl: !!res.shortcutCtrl,
          alt: !!res.shortcutAlt,
          shift: !!res.shortcutShift,
          meta: !!res.shortcutMeta,
          action: res.shortcutAction || "fix_spelling",
        });
      }

      setDropdownShortcut({
        key: (res.dropdownShortcutKey || "d").toLowerCase(),
        ctrl: !!res.dropdownShortcutCtrl,
        alt:
          res.dropdownShortcutAlt !== undefined
            ? !!res.dropdownShortcutAlt
            : true,
        shift:
          res.dropdownShortcutShift !== undefined
            ? !!res.dropdownShortcutShift
            : true,
        meta: !!res.dropdownShortcutMeta,
        action: "toggle_menu",
      });

      setHideDot(!!res.hideDot);
    };
    loadConfig();

    const onChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (
        changes.shortcutKey ||
        changes.shortcutCtrl ||
        changes.shortcutAlt ||
        changes.shortcutShift ||
        changes.shortcutMeta ||
        changes.shortcutAction ||
        changes.dropdownShortcutKey ||
        changes.dropdownShortcutCtrl ||
        changes.dropdownShortcutAlt ||
        changes.dropdownShortcutShift ||
        changes.dropdownShortcutMeta ||
        changes.hideDot
      ) {
        loadConfig();
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  // ── AI action dispatcher ──
  const executeAIAction = useCallback(
    (action: string, overrideInference?: InferredSelection) => {
      const ctx = activeContextRef.current;
      const adapter = ctx?.adapter;
      if (!adapter) {
        showToast("No editable text found", "error");
        return;
      }

      const span = resolveReplacementSpan(adapter, overrideInference);

      if (!span.text.trim()) {
        showToast("No text selected or input is empty!", "error");
        return;
      }

      setIsMenuOpen(false);
      setActionConfirm(null);
      suppressKeysUntilRef.current = performance.now() + 250;

      const fieldSnapshot = adapter.getText();
      setProcessingSpan({ start: span.start, end: span.end });
      setIsAiProcessing(true);
      processingAdapterRef.current = adapter;
      processingSpanRef.current = { start: span.start, end: span.end };

      const requestId = ++aiRequestIdRef.current;

      chrome.runtime.sendMessage(
        { type: "PROCESS_TEXT", action, text: span.text, requestId },
        async (response: {
          success: boolean;
          text?: string;
          error?: string;
          aborted?: boolean;
          requestId?: number;
        }) => {
          if (requestId !== aiRequestIdRef.current) return;

          setIsAiProcessing(false);
          setProcessingSpan(null);
          processingAdapterRef.current = null;
          processingSpanRef.current = null;

          if (chrome.runtime.lastError) {
            showToast(
              "Could not reach Hone. Is the extension service worker running?",
              "error",
            );
            return;
          }

          if (response?.aborted) return;

          if (response?.success && response.text) {
            const handler = registryRef.current?.get(action);
            const usePreview =
              handler?.type === "custom" && handler.replaceMode === "preview";

            if (usePreview) {
              setPendingPreview({
                actionName: handler.name,
                icon: handler.icon,
                color: handler.color,
                originalText: span.text,
                resultText: response.text,
                fieldSnapshot,
                span: {
                  start: span.start,
                  end: span.end,
                  text: span.text,
                  level: span.level,
                },
              });
              return;
            }

            const tx = await adapter.replaceRange(
              span.start,
              span.end,
              response.text,
              { expectedText: span.text, fieldSnapshot },
            );

            const committed =
              typeof tx === "boolean" ? tx : tx.committed;
            const suggestClipboard =
              typeof tx === "object" && tx.suggestClipboardPaste;

            if (!committed) {
              if (suggestClipboard) {
                const copied = await copyForManualPaste(response.text);
                showToast(
                  copied
                    ? "Copied to clipboard — press Ctrl+V in the field to apply."
                    : "Could not apply automatically. Copy the result and paste manually.",
                  copied ? "success" : "error",
                );
              } else {
                showToast(
                  "Could not apply edit — the field changed while waiting for AI.",
                  "error",
                );
              }
              return;
            }

            // Clear saved focus after applying to prevent focus stealing
            editorElementRef.current = null;
            savedSelectionRef.current = null;
            showToast(`Done! (${span.level})`, "success");
          } else {
            showToast(response?.error || "AI request failed.", "error");
          }
        },
      );
    },
    [showToast],
  );

  const triggerAIAction = useCallback(
    (action: string, overrideInference?: InferredSelection) => {
      if (isAiProcessingRef.current) {
        const handler = registryRef.current?.get(action);
        setIsMenuOpen(false);
        setActionConfirm({
          action,
          actionLabel: handler?.name ?? action,
          override: overrideInference,
        });
        return;
      }
      executeAIAction(action, overrideInference);
    },
    [executeAIAction],
  );

  const confirmAbortAndRun = useCallback(() => {
    const pending = actionConfirm;
    if (!pending) return;

    setActionConfirm(null);
    aiRequestIdRef.current += 1;
    chrome.runtime.sendMessage({ type: "ABORT_PROCESS_TEXT" }, () => {
      setIsAiProcessing(false);
      setProcessingSpan(null);
      executeAIAction(pending.action, pending.override);
    });
  }, [actionConfirm, executeAIAction]);

  const confirmCancelGeneration = useCallback(() => {
    setActionConfirm(null);
    aiRequestIdRef.current += 1;
    chrome.runtime.sendMessage({ type: "ABORT_PROCESS_TEXT" }, () => {
      setIsAiProcessing(false);
      setProcessingSpan(null);
      processingAdapterRef.current = null;
      processingSpanRef.current = null;
    });
  }, []);

  const cancelActionConfirm = useCallback(() => {
    setActionConfirm(null);
  }, []);

  // ── Unified entry point: resolve context and open the assistant ──
  const openAssistant = useCallback(
    (immediateAction?: string) => {
      const ctx = resolveActiveContext();
      if (!ctx) {
        showToast("Focus an editable field or select text first", "error");
        return;
      }

      activeContextRef.current = ctx;
      setActiveContext(ctx);
      anchorRectRef.current = ctx.rect;
      setAnchorRect(ctx.rect);
      setIsMenuOpen(true);

      if (ctx.adapter) {
        try {
          const opts = computeInferenceOptions(ctx.adapter);
          setInferenceOptions(opts);
          setSelectedInferenceLevel(opts.best?.level ?? null);
        } catch (_err) {
          setInferenceOptions(null);
          setSelectedInferenceLevel(null);
        }
      } else {
        setInferenceOptions(null);
        setSelectedInferenceLevel(null);
      }

      // If an immediate action was requested and we have an adapter, execute it
      if (immediateAction && ctx.adapter) {
        triggerAIAction(immediateAction);
      }
    },
    [showToast, triggerAIAction],
  );

  // ── Keyboard shortcut listener ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Direct action shortcut
      if (shortcut && shortcut.key) {
        if (
          e.ctrlKey === shortcut.ctrl &&
          e.altKey === shortcut.alt &&
          e.shiftKey === shortcut.shift &&
          e.metaKey === shortcut.meta &&
          e.key.toLowerCase() === shortcut.key
        ) {
          e.preventDefault();
          openAssistant(shortcut.action);
          return;
        }
      }

      // 2. Dropdown menu toggle shortcut
      if (dropdownShortcut && dropdownShortcut.key) {
        if (
          e.ctrlKey === dropdownShortcut.ctrl &&
          e.altKey === dropdownShortcut.alt &&
          e.shiftKey === dropdownShortcut.shift &&
          e.metaKey === dropdownShortcut.meta &&
          e.key.toLowerCase() === dropdownShortcut.key
        ) {
          e.preventDefault();
          if (isMenuOpen) {
            setIsMenuOpen(false);
          } else {
            openAssistant();
          }
          return;
        }
      }

      // 3. Escape key to close menu
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
        const el = activeContextRef.current?.adapter?.getElement();
        if (el) el.focus();
      }

      // 4. Left/Right arrow keys to change inference level when menu is open
      if (isMenuOpen && inferenceOptions) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          cycleInferenceLevel(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          cycleInferenceLevel(1);
        }
      }

      // 5. Escape key to cancel AI generation
      if (e.key === "Escape" && isAiProcessing && !actionConfirm) {
        e.preventDefault();
        setActionConfirm({
          action: "cancel_generation",
          actionLabel: "cancel generation",
          override: undefined,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [shortcut, dropdownShortcut, isMenuOpen, openAssistant]);

  // ── Chrome command shortcuts (manifest commands) ──
  useEffect(() => {
    const handleCommand = (
      message: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void,
    ) => {
      if (message.type === "COMMAND_TRIGGERED" && message.action) {
        if (message.action === "toggle_menu") {
          if (isMenuOpen) {
            setIsMenuOpen(false);
          } else {
            openAssistant();
          }
        } else {
          openAssistant(message.action);
        }
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(handleCommand);
    return () => chrome.runtime.onMessage.removeListener(handleCommand);
  }, [isMenuOpen, openAssistant]);

  // ── Focus tracking ──
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      // Cancel pending blur timeout (handles tab-switch race)
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = 0;
      }

      const target = e.target as Element;
      if (isEditableElement(target)) {
        // Clear saved focus when user focuses a new input to prevent focus stealing
        editorElementRef.current = null;
        savedSelectionRef.current = null;

        const adapter = createAdapter(target);
        if (adapter) {
          const ctx: ActiveContext = {
            type: "input",
            adapter,
            text: adapter.getSelection().text || adapter.getText(),
            rect: adapter.getCaretRect(),
          };
          activeContextRef.current = ctx;
          setActiveContext(ctx);
          anchorRectRef.current = ctx.rect;
          setAnchorRect(ctx.rect);
          // Don't close menu when user focuses a new input - let them open it in the new input
          // setIsMenuOpen(false);
          try {
            const opts = computeInferenceOptions(adapter);
            setInferenceOptions(opts);
            setSelectedInferenceLevel(opts.best?.level ?? null);
          } catch (_err) {
            setInferenceOptions(null);
            setSelectedInferenceLevel(null);
          }
        }
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      if (isInsideShadow.current) return;
      if (
        isMenuOpenRef.current ||
        pendingPreviewRef.current ||
        actionConfirmRef.current
      ) {
        return;
      }

      const relatedTarget = e.relatedTarget as Element | null;
      if (relatedTarget && isEditableElement(relatedTarget)) return;

      blurTimeoutRef.current = window.setTimeout(() => {
        if (isInsideShadow.current) return;
        if (
          isMenuOpenRef.current ||
          pendingPreviewRef.current ||
          actionConfirmRef.current
        ) {
          return;
        }
        activeContextRef.current = null;
        setActiveContext(null);
        anchorRectRef.current = null;
        setAnchorRect(null);
        setIsMenuOpen(false);
      }, 120);
    };

    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("focusout", onFocusOut, true);

    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      window.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);

  // ── Throttled rect updater (input type only) ──
  const updateRect = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const ctx = activeContextRef.current;
      if (ctx?.type === "input" && ctx.adapter) {
        const newRect = ctx.adapter.getCaretRect();
        anchorRectRef.current = newRect;
        setAnchorRect(newRect);
      }
    });
  }, []);

  // Re-attach scroll/input listeners when the input element changes
  const trackedElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el =
      activeContext?.type === "input" && activeContext.adapter
        ? activeContext.adapter.getElement()
        : null;

    if (el === trackedElRef.current) return;
    trackedElRef.current = el;

    if (!el) return;

    updateRect();

    window.addEventListener("scroll", updateRect, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", updateRect, { passive: true });
    el.addEventListener("input", updateRect);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      el.removeEventListener("input", updateRect);
    };
  }, [activeContext, updateRect]);

  // ── Floating-ui auto-positioning ──
  useEffect(() => {
    if (!isMenuOpen || !menuRef.current || !anchorRectRef.current) return;

    const virtualEl: VirtualElement = {
      getBoundingClientRect: () => anchorRectRef.current || new DOMRect(0, 0, 0, 0),
    };

    return autoPositionElement(virtualEl, menuRef.current, setMenuPos, {
      placement: "top",
      gap: 6,
    });
  }, [isMenuOpen]);

  // ── Click outside to close ──
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (_e: MouseEvent) => {
      if (!isInsideShadow.current) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [isMenuOpen]);

  // ── MutationObserver: detect removed active element ──
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const ctx = activeContextRef.current;
      if (ctx?.adapter) {
        const el = ctx.adapter.getElement();
        if (!document.contains(el)) {
          activeContextRef.current = null;
          setActiveContext(null);
          anchorRectRef.current = null;
          setAnchorRect(null);
          setIsMenuOpen(false);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  // ── Menu keyboard-nav indices (primary → custom → tone → length) ──
  const PRIMARY_ACTION_COUNT = 3;
  const TONE_ACTION_COUNT = 4;
  const LENGTH_ACTION_COUNT = 2;
  const customActionCount = customActions.length;
  const toneActionStartIdx = PRIMARY_ACTION_COUNT + customActionCount;
  const lengthActionStartIdx = toneActionStartIdx + TONE_ACTION_COUNT;
  const actionItemCount =
    lengthActionStartIdx + LENGTH_ACTION_COUNT;

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    pendingPreviewRef.current = !!pendingPreview;
  }, [pendingPreview]);

  useEffect(() => {
    actionConfirmRef.current = !!actionConfirm;
  }, [actionConfirm]);

  useEffect(() => {
    isAiProcessingRef.current = isAiProcessing;
  }, [isAiProcessing]);

  useEffect(() => {
    if (!pendingPreview) return;
    saveEditorFocus();
  }, [pendingPreview, saveEditorFocus]);

  // ── Keep editor focused while menu is open ──
  useEffect(() => {
    if (isMenuOpen) {
      setFocusedActionIdx(0);
      saveEditorFocus();
    }
    // Don't restore focus when menu closes - user may have intentionally moved to another input
  }, [isMenuOpen, saveEditorFocus]);

  useEffect(() => {
    focusedActionIdxRef.current = focusedActionIdx;
  }, [focusedActionIdx]);

  // Keep focus index valid when custom actions load or change while menu is open
  useEffect(() => {
    if (!isMenuOpen || actionItemCount === 0) return;
    setFocusedActionIdx((prev) =>
      prev >= actionItemCount ? actionItemCount - 1 : prev,
    );
  }, [isMenuOpen, actionItemCount]);

  const activateMenuActionAtIndex = useCallback(
    (idx: number) => {
      const override =
        inferenceOptions && selectedInferenceLevel
          ? inferenceOptions[selectedInferenceLevel]
          : undefined;

      const primary = ["improve", "paraphrase", "fix_spelling"] as const;
      const tones = [
        "tone_professional",
        "tone_casual",
        "tone_exciting",
        "tone_friendly",
      ] as const;
      const lengths = ["length_shorter", "length_longer"] as const;

      let actionId: string | null = null;
      if (idx < PRIMARY_ACTION_COUNT) {
        actionId = primary[idx] ?? null;
      } else if (idx < PRIMARY_ACTION_COUNT + customActions.length) {
        actionId = customActions[idx - PRIMARY_ACTION_COUNT]?.id ?? null;
      } else if (
        idx <
        PRIMARY_ACTION_COUNT + customActions.length + TONE_ACTION_COUNT
      ) {
        actionId =
          tones[idx - PRIMARY_ACTION_COUNT - customActions.length] ?? null;
      } else {
        const lenIdx =
          idx -
          PRIMARY_ACTION_COUNT -
          customActions.length -
          TONE_ACTION_COUNT;
        actionId = lengths[lenIdx] ?? null;
      }

      if (actionId) {
        suppressKeysUntilRef.current = performance.now() + 250;
        triggerAIAction(actionId, override);
      }
    },
    [
      inferenceOptions,
      selectedInferenceLevel,
      customActions,
      triggerAIAction,
    ],
  );

  // ── Preview floating position ──
  useEffect(() => {
    if (!pendingPreview || !previewRef.current || !anchorRectRef.current) {
      return;
    }

    const virtualEl: VirtualElement = {
      getBoundingClientRect: () => anchorRectRef.current || new DOMRect(0, 0, 0, 0),
    };

    return autoPositionElement(virtualEl, previewRef.current, setPreviewPos, {
      placement: "top",
      gap: 6,
    });
  }, [pendingPreview]);

  // ── Confirm dialog floating position ──
  useEffect(() => {
    if (!actionConfirm || !confirmRef.current || !anchorRectRef.current) {
      return;
    }

    const virtualEl: VirtualElement = {
      getBoundingClientRect: () => anchorRectRef.current || new DOMRect(0, 0, 0, 0),
    };

    return autoPositionElement(virtualEl, confirmRef.current, setConfirmPos, {
      placement: "top",
      gap: 6,
    });
  }, [actionConfirm]);

  // ── Capture keyboard so Enter/Space never reach the field behind ──
  useEffect(() => {
    if (!isMenuOpen && !pendingPreview && !actionConfirm) return;

    const armSuppression = () => {
      suppressKeysUntilRef.current = performance.now() + 250;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldSuppressActivationKey(e, suppressKeysUntilRef.current)) {
        consumeKeyboardEvent(e);
        return;
      }

      if (actionConfirm) {
        if (isActivationKey(e.key)) {
          consumeKeyboardEvent(e);
          confirmAbortAndRun();
          armSuppression();
          return;
        }
        if (e.key === "Escape") {
          consumeKeyboardEvent(e);
          cancelActionConfirm();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          consumeKeyboardEvent(e);
          return;
        }
      }

      if (pendingPreview) {
        if (isActivationKey(e.key)) {
          consumeKeyboardEvent(e);
          applyPendingPreview();
          armSuppression();
          return;
        }
        if (e.key === "Escape") {
          consumeKeyboardEvent(e);
          discardPendingPreview();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          consumeKeyboardEvent(e);
        }
        return;
      }

      if (!isMenuOpen || actionItemCount === 0) return;

      switch (e.key) {
        case "ArrowDown":
          consumeKeyboardEvent(e);
          setFocusedActionIdx(
            (prev) => (prev + 1) % actionItemCount,
          );
          break;
        case "ArrowUp":
          consumeKeyboardEvent(e);
          setFocusedActionIdx(
            (prev) => (prev - 1 + actionItemCount) % actionItemCount,
          );
          break;
        case "Enter":
        case " ":
        case "Spacebar":
          consumeKeyboardEvent(e);
          activateMenuActionAtIndex(focusedActionIdxRef.current);
          break;
        case "Escape":
          consumeKeyboardEvent(e);
          setIsMenuOpen(false);
          break;
        default:
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        shouldSuppressActivationKey(e, suppressKeysUntilRef.current) ||
        (isMenuOpen && isActivationKey(e.key)) ||
        (pendingPreview && isActivationKey(e.key))
      ) {
        consumeKeyboardEvent(e);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [
    isMenuOpen,
    pendingPreview,
    actionConfirm,
    actionItemCount,
    activateMenuActionAtIndex,
    applyPendingPreview,
    discardPendingPreview,
    confirmAbortAndRun,
    cancelActionConfirm,
  ]);

  const handleShadowEnter = () => {
    isInsideShadow.current = true;
  };
  const handleShadowLeave = () => {
    isInsideShadow.current = false;
  };

  const highlightSpan = useMemo(() => {
    const adapter = activeContext?.adapter;
    if (!adapter) {
      // If AI is processing and we have a saved span, use it
      if (isAiProcessing && processingSpanRef.current) {
        return processingSpanRef.current;
      }
      return null;
    }

    if (pendingPreview) {
      return {
        start: pendingPreview.span.start,
        end: pendingPreview.span.end,
      };
    }

    if (isAiProcessing && processingSpan) {
      return processingSpan;
    }

    if (isMenuOpen) {
      const override =
        inferenceOptions && selectedInferenceLevel
          ? (inferenceOptions[selectedInferenceLevel] as InferredSelection)
          : undefined;
      const span = resolveReplacementSpan(adapter, override);
      if (span.end <= span.start) return null;
      return { start: span.start, end: span.end };
    }

    return null;
  }, [
    activeContext?.adapter,
    pendingPreview,
    isAiProcessing,
    processingSpan,
    isMenuOpen,
    inferenceOptions,
    selectedInferenceLevel,
  ]);

  const highlightActive =
    !!highlightSpan &&
    (!!activeContext?.adapter || isAiProcessing) &&
    highlightSpan.end > highlightSpan.start;

  // ── Render ──
  if (
    !pendingPreview &&
    !isAiProcessing &&
    !actionConfirm &&
    !isMenuOpen &&
    (!anchorRect || !activeContext)
  ) {
    return null;
  }

  const rect = anchorRect;
  const showFieldChrome =
    !!activeContext && !!rect && rect.height >= 5;

  const menuWidth = 264;
  const previewWidth = 300;

  const cycleInferenceLevel = (direction: -1 | 1) => {
    if (!selectedInferenceLevel) return;
    const order: Array<"selection" | "paragraph" | "field"> = [
      "selection",
      "paragraph",
      "field",
    ];
    // Handle case where current level might be "sentence" from previous state
    const currentLevel = selectedInferenceLevel === "sentence" ? "paragraph" : selectedInferenceLevel;
    const idx = order.indexOf(currentLevel as "selection" | "paragraph" | "field");
    const next = order[(idx + direction + order.length) % order.length];
    setSelectedInferenceLevel(next);
  };

  const getInferenceOverride = (): InferredSelection | undefined => {
    if (!inferenceOptions || !selectedInferenceLevel) return undefined;
    return inferenceOptions[selectedInferenceLevel] as InferredSelection | undefined;
  };

  const showDot =
    showFieldChrome && !hideDot && activeContext!.type === "input";
  const dotSize = 16;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 2147483647,
      }}
      onMouseEnter={handleShadowEnter}
      onMouseLeave={handleShadowLeave}
    >
      <TargetHighlight
        adapter={isAiProcessing ? processingAdapterRef.current : (activeContext?.adapter ?? null)}
        start={highlightSpan?.start ?? 0}
        end={highlightSpan?.end ?? 0}
        mode={isAiProcessing ? "loading" : "idle"}
        active={highlightActive}
        onRestoreSelection={restoreEditorFocus}
      />

      {/* ── Preview dialog (custom actions with preview replace mode) ── */}
      {actionConfirm && (
        <ConfirmDialog
          panelRef={confirmRef}
          message={
            actionConfirm.action === "cancel_generation"
              ? "Are you sure you want to cancel the AI generation?"
              : `An action is already running. Abort it and run “${actionConfirm.actionLabel}”?`
          }
          top={confirmPos.top}
          left={confirmPos.left}
          width={previewWidth}
          onConfirm={() => {
            suppressKeysUntilRef.current = performance.now() + 250;
            if (actionConfirm.action === "cancel_generation") {
              confirmCancelGeneration();
            } else {
              confirmAbortAndRun();
            }
          }}
          onCancel={cancelActionConfirm}
          onPointerEnter={handleShadowEnter}
          onPointerLeave={handleShadowLeave}
        />
      )}

      {pendingPreview && (
        <PreviewPanel
          panelRef={previewRef}
          preview={pendingPreview}
          top={previewPos.top}
          left={previewPos.left}
          width={previewWidth}
          onApply={() => {
            suppressKeysUntilRef.current = performance.now() + 250;
            applyPendingPreview();
          }}
          onDiscard={discardPendingPreview}
          onPointerEnter={handleShadowEnter}
          onPointerLeave={handleShadowLeave}
        />
      )}

      {showDot && (() => {
        const el = activeContext!.adapter?.getElement();
        if (!el) return null;
        const elRect = el.getBoundingClientRect();
        return (
          <TriggerDot
            dotRef={dotRef}
            bottom={window.innerHeight - elRect.bottom + 4}
            right={window.innerWidth - elRect.right + 4}
            size={dotSize}
            loading={isAiProcessing}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveEditorFocus();
              if (!isMenuOpen) {
                const ctx = resolveActiveContext();
                if (ctx) {
                  activeContextRef.current = ctx;
                  setActiveContext(ctx);
                  anchorRectRef.current = ctx.rect;
                  setAnchorRect(ctx.rect);
                  if (ctx.adapter) {
                    try {
                      const opts = computeInferenceOptions(ctx.adapter);
                      setInferenceOptions(opts);
                      setSelectedInferenceLevel(opts.best?.level ?? null);
                    } catch (_err) {
                      setInferenceOptions(null);
                      setSelectedInferenceLevel(null);
                    }
                  }
                }
              }
              setIsMenuOpen((prev) => !prev);
            }}
          />
        );
      })()}

      {showFieldChrome && isMenuOpen && (
        <FloatingActionMenu
          menuRef={menuRef}
          top={menuPos.top}
          left={menuPos.left}
          width={menuWidth}
          shortcut={dropdownShortcut}
          quickShortcut={shortcut}
          inferenceOptions={inferenceOptions}
          selectedInferenceLevel={selectedInferenceLevel}
          onInferencePrev={() => cycleInferenceLevel(-1)}
          onInferenceNext={() => cycleInferenceLevel(1)}
          customActions={customActions}
          focusedActionIdx={focusedActionIdx}
          onFocusAction={setFocusedActionIdx}
          onTriggerAction={triggerAIAction}
          hasAdapter={!!activeContext?.adapter}
          customActionStartIdx={PRIMARY_ACTION_COUNT}
          toneActionStartIdx={toneActionStartIdx}
          lengthActionStartIdx={lengthActionStartIdx}
          getInferenceOverride={getInferenceOverride}
          onMouseDownCapture={(e) => {
            e.preventDefault();
            isInsideShadow.current = true;
            restoreEditorFocus();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        />
      )}

      {toast && <OverlayToast message={toast.message} type={toast.type} />}
    </div>
  );
}
