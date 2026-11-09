import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from "react";
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
import { FloatingActionMenu } from "./floating-action-menu";
import { OverlayToast, TriggerDot } from "./overlay-chrome";
import { TargetHighlight } from "./target-highlight";
import {
  consumeKeyboardEvent,
  isActivationKey,
  shouldSuppressActivationKey,
} from "./keyboard-guard";
import { wordDiff, type DiffToken } from "./word-diff";
import type { ProofreadFix, ProofreadIssue } from "./proofread-issues";
import {
  LiveProofreader,
  type HoverCardState,
} from "./live-proofread";
import { SuggestionCard } from "./suggestion-card";
import { getSpansClientRects } from "./span-geometry";
import { getProviderLabel } from "../providers";

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

type CardApplyTarget = InferredSelection & {
  fieldSnapshot: string;
};

export default function App({
  portalContainer,
}: {
  portalContainer?: HTMLElement;
}) {
  void portalContainer;
  const [activeContext, setActiveContext] = useState<ActiveContext | null>(
    null,
  );
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef(0);
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
  const [inferenceOptions, setInferenceOptions] = useState<Record<string, unknown> | null>(null);
  const [selectedInferenceLevel, setSelectedInferenceLevel] = useState<
    "selection" | "sentence" | "paragraph" | "field" | null
  >(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [focusedActionIdx, setFocusedActionIdx] = useState(0);
  const [actions, setActions] = useState<ActionHandler[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processingSpan, setProcessingSpan] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [processingAdapter, setProcessingAdapter] = useState<EditableAdapter | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{
    action: string;
    actionLabel: string;
    override?: InferredSelection;
    extraParams?: Record<string, string>;
  } | null>(null);

  // New Generalized Card & Settings states
  const [previewInCard, setPreviewInCard] = useState<boolean>(true);
  const [liveProofread, setLiveProofread] = useState<boolean>(true);
  const [cardResultText, setCardResultText] = useState<string>("");
  const [cardDiff, setCardDiff] = useState<DiffToken[] | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [revealMenuOverride, setRevealMenuOverride] = useState<boolean>(false);
  
  // Accordion expansion states (lifted to allow unified keyboard navigation)
  const [toneExpanded, setToneExpanded] = useState<boolean>(false);
  const [lengthExpanded, setLengthExpanded] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const registryRef = useRef<ActionRegistry | null>(null);
  const focusedActionIdxRef = useRef(0);
  const suppressKeysUntilRef = useRef(0);
  const dotRef = useRef<HTMLButtonElement>(null);
  const isInsideShadow = useRef(false);
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

  // New refs for card state management
  const loadingActionIdRef = useRef<string | null>(null);
  const cardActionIdRef = useRef<string | null>(null);
  const [cardActionId, setCardActionId] = useState<string | null>(null);
  const cardApplyTextRef = useRef("");
  const cardOverrideInferenceRef = useRef<InferredSelection | undefined>(undefined);
  const cardApplyTargetRef = useRef<CardApplyTarget | null>(null);
  const lastAcceptedFieldTextRef = useRef<string | null>(null);
  const blurTimeoutRef = useRef(0);
  const heldResponseRef = useRef<{
    response: {
      success: boolean;
      text?: string;
      error?: string;
      aborted?: boolean;
    };
    action: string;
    adapter: EditableAdapter;
    span: { start: number; end: number; text: string; level: string };
    fieldSnapshot: string;
  } | null>(null);

  // ── Live proofreading (Harper underlines + hover suggestion cards) ──
  const proofreaderRef = useRef<LiveProofreader | null>(null);
  const [proofreadIssues, setProofreadIssues] = useState<ProofreadIssue[]>([]);
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const [suggestionCardPos, setSuggestionCardPos] = useState({ top: 0, left: 0 });
  const suggestionCardRef = useRef<HTMLDivElement | null>(null);

  const [pendingActionOverride, setPendingActionOverride] = useState<{ actionId: string; override?: InferredSelection } | null>(null);

  const clearCardState = useCallback(() => {
    setCardResultText("");
    setCardDiff(null);
    setCardActionId(null);
    cardActionIdRef.current = null;
    cardApplyTextRef.current = "";
    cardOverrideInferenceRef.current = undefined;
    cardApplyTargetRef.current = null;
    setLoadingActionId(null);
    loadingActionIdRef.current = null;
    setPendingActionOverride(null); // Clear grade picker when resetting card state
  }, []);

  // Sync refs synchronously
  useEffect(() => {
    activeContextRef.current = activeContext;
  }, [activeContext]);
  useEffect(() => {
    anchorRectRef.current = anchorRect;
  }, [anchorRect]);

  // ── Load all actions from registry ──
  useEffect(() => {
    const load = async () => {
      const registry = new ActionRegistry();
      await registry.loadActions();
      registryRef.current = registry;
      setActions(registry.getAll());
    };
    load();

    const onChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.actionConfigs || changes.customActions) {
        load();
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      setToast({ message, type });
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
    },
    [],
  );

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

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

  // Make `ctx` the active editing context and recompute the scope options for it
  const applyContext = useCallback((ctx: ActiveContext) => {
    activeContextRef.current = ctx;
    setActiveContext(ctx);
    anchorRectRef.current = ctx.rect;
    setAnchorRect(ctx.rect);
    if (!ctx.adapter) {
      setInferenceOptions(null);
      setSelectedInferenceLevel(null);
      return;
    }
    try {
      const opts = computeInferenceOptions(ctx.adapter);
      setInferenceOptions(opts);
      setSelectedInferenceLevel(opts.best?.level ?? null);
    } catch {
      setInferenceOptions(null);
      setSelectedInferenceLevel(null);
    }
  }, []);

  // ── Live proofreading: underline Harper issues as the user types ──
  // One controller per focused field; underlines on CE come from the CSS
  // Custom Highlight API inside the controller, native fields get overlay
  // strips rendered below, and dwelling on an issue opens a suggestion card.
  useEffect(() => {
    const adapter = activeContext?.adapter ?? null;
    if (!liveProofread || !adapter || activeContext?.type !== "input") {
      // stop() clears published state through the controller's own callbacks.
      proofreaderRef.current?.stop();
      proofreaderRef.current = null;
      return;
    }

    const proofreader = new LiveProofreader({
      adapter,
      onIssues: (issues) => setProofreadIssues(issues),
      onHoverCard: (card) => setHoverCard(card),
    });
    proofreaderRef.current = proofreader;
    proofreader.start();

    return () => {
      if (proofreaderRef.current === proofreader) {
        proofreaderRef.current = null;
      }
      proofreader.stop();
    };
    // Identity: a fresh adapter is created per focus, which is exactly the
    // lifecycle we want (re-focus re-checks instantly from the lint cache).
  }, [activeContext?.adapter, activeContext?.type, liveProofread]);

  // The suggestion card never competes with the menu, confirm states or AI runs.
  useEffect(() => {
    if (isMenuOpen || actionConfirm || isAiProcessing || !!loadingActionId) {
      proofreaderRef.current?.closeHoverCard();
    }
  }, [isMenuOpen, actionConfirm, isAiProcessing, loadingActionId]);

  // ── Anchor the suggestion card under the hovered issue ──
  useEffect(() => {
    if (!hoverCard || !suggestionCardRef.current) return;

    const virtualEl: VirtualElement = {
      getBoundingClientRect: () => hoverCard.anchor,
    };

    return autoPositionElement(virtualEl, suggestionCardRef.current, (pos) => {
      setSuggestionCardPos({ top: pos.top, left: pos.left });
    }, {
      placement: "bottom-start",
      gap: 6,
    });
  }, [hoverCard]);

  const registerSuggestionCard = useCallback((el: HTMLElement | null) => {
    suggestionCardRef.current = el as HTMLDivElement | null;
    proofreaderRef.current?.setCardElement(el);
  }, []);

  const handleCardPointerEnter = useCallback(() => {
    proofreaderRef.current?.cardPointerEntered();
  }, []);

  const handleCardPointerLeave = useCallback(() => {
    proofreaderRef.current?.cardPointerLeft();
  }, []);

  const handleApplyProofreadFix = useCallback(
    async (issue: ProofreadIssue, fix: ProofreadFix) => {
      setHoverCard(null); // never leave the card stranded, whatever happens
      const proofreader = proofreaderRef.current;
      if (!proofreader) return;
      const result = await proofreader.applyFix(issue, fix);
      if (result.committed) return;

      if (result.suggestClipboardPaste && fix.replacement !== "") {
        const copied = await copyForManualPaste(fix.replacement);
        showToast(
          copied
            ? "Copied to clipboard — press Ctrl+V in the field to apply."
            : "Could not apply automatically. Copy the fix and paste manually.",
          copied ? "success" : "error",
        );
      } else {
        showToast("Could not apply fix — the field changed.", "error");
      }
    },
    [showToast],
  );

  const handleIgnoreProofreadIssue = useCallback((issue: ProofreadIssue) => {
    setHoverCard(null);
    void proofreaderRef.current?.ignoreIssue(issue);
  }, []);

  const handleAddProofreadWord = useCallback((issue: ProofreadIssue) => {
    setHoverCard(null);
    void proofreaderRef.current?.addToDictionary(issue);
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
        "previewInCard",
        "liveProofread",
      ])) as Record<string, unknown>;

      if (res.shortcutKey) {
        setShortcut({
          key: (res.shortcutKey as string).toLowerCase(),
          ctrl: !!res.shortcutCtrl,
          alt: !!res.shortcutAlt,
          shift: !!res.shortcutShift,
          meta: !!res.shortcutMeta,
          action: (res.shortcutAction as string) || "fix_spelling",
        });
      }

      setDropdownShortcut({
        key: ((res.dropdownShortcutKey as string) || "d").toLowerCase(),
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
        setPreviewInCard(res.previewInCard !== undefined ? !!res.previewInCard : true);
        setLiveProofread(res.liveProofread !== undefined ? !!res.liveProofread : true);
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
        changes.hideDot ||
        changes.previewInCard ||
        changes.liveProofread
      ) {
        loadConfig();
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  // ── AI response processor ──
  const processAIResponse = useCallback(
    async (
      response: {
        success: boolean;
        text?: string;
        error?: string;
        aborted?: boolean;
        fallbackUsed?: string;
      },
      _action: string,
      adapter: EditableAdapter,
      span: { start: number; end: number; text: string; level: string },
      fieldSnapshot: string,
    ) => {
      setIsAiProcessing(false);
      setProcessingSpan(null);
      processingAdapterRef.current = null;
      setProcessingAdapter(null);
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
        cardApplyTargetRef.current = null;
        const expectedText =
          fieldSnapshot.slice(0, span.start) +
          response.text +
          fieldSnapshot.slice(span.end);
        lastAcceptedFieldTextRef.current = adapter.getText() || expectedText;

        if (response.fallbackUsed) {
          showToast(`Done! (Fell back to ${getProviderLabel(response.fallbackUsed)})`, "success");
        } else {
          showToast(`Done! (${span.level})`, "success");
        }

        clearCardState();
      } else {
        showToast(response?.error || "AI request failed.", "error");
      }
    },
    [showToast, clearCardState],
  );

  // ── Apply suggestion card contents to editor ──
  const handleApplyCard = useCallback(async () => {
    const applyText = cardApplyTextRef.current || cardResultText;
    if (!applyText) return;
    const ctx = activeContextRef.current;
    const adapter = ctx?.adapter;
    if (!adapter) return;

    const target = cardApplyTargetRef.current;
    const span = target ?? resolveReplacementSpan(adapter, cardOverrideInferenceRef.current);
    const fieldSnapshot = target?.fieldSnapshot ?? adapter.getText();

    setIsMenuOpen(false);
    setActionConfirm(null);
    setIsAiProcessing(false);

    await processAIResponse(
      { success: true, text: applyText },
      cardActionIdRef.current || "improve",
      adapter,
      span,
      fieldSnapshot
    );
  }, [cardResultText, processAIResponse]);

  const handleCancelCard = useCallback(() => {
    if (loadingActionIdRef.current) {
      setActionConfirm({
        action: "cancel_generation",
        actionLabel: "cancel generation",
        override: undefined,
      });
    } else {
      clearCardState();
    }
  }, [clearCardState]);

  // ── AI action dispatcher ──
  const executeAIAction = useCallback(
    (action: string, overrideInference?: InferredSelection, extraParams?: Record<string, string>) => {
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

      setActionConfirm(null);
      setRevealMenuOverride(false);
      setPendingActionOverride(null); // Clear grade picker or any pending override when starting a new action
      suppressKeysUntilRef.current = performance.now() + 250;

      const handler = registryRef.current?.get(action);
      const isCustomPreview = (handler?.type === "custom" || handler?.type === "marketplace") && handler.replaceMode === "preview";
      const shouldPreviewInCard = previewInCard || isCustomPreview;

      if (!shouldPreviewInCard) {
        setIsMenuOpen(false);
        const fieldSnapshot = adapter.getText();
        setProcessingSpan({ start: span.start, end: span.end });
        setIsAiProcessing(true);
        processingAdapterRef.current = adapter;
        setProcessingAdapter(adapter);
        processingSpanRef.current = { start: span.start, end: span.end };

        const requestId = ++aiRequestIdRef.current;

        chrome.runtime.sendMessage(
          { type: "PROCESS_TEXT", action, text: span.text, requestId, extraParams },
          async (response: {
            success: boolean;
            text?: string;
            error?: string;
            aborted?: boolean;
            requestId?: number;
            fallbackUsed?: string;
          }) => {
            if (requestId !== aiRequestIdRef.current) return;

            if (actionConfirmRef.current) {
              heldResponseRef.current = {
                response,
                action,
                adapter,
                span,
                fieldSnapshot,
              };
              return;
            }

            await processAIResponse(response, action, adapter, span, fieldSnapshot);
          },
        );
      } else {
        // previewInCard is true: load response inside card
        setLoadingActionId(action);
        loadingActionIdRef.current = action;
        cardActionIdRef.current = action;
        setCardActionId(action);
        cardOverrideInferenceRef.current = overrideInference;
        cardApplyTargetRef.current = {
          ...span,
          fieldSnapshot: adapter.getText(),
        };

        setCardResultText("");
        cardApplyTextRef.current = "";
        setCardDiff(null);

        const requestId = ++aiRequestIdRef.current;
        chrome.runtime.sendMessage(
          { type: "PROCESS_TEXT", action, text: span.text, requestId, extraParams },
          (response: {
            success: boolean;
            text?: string;
            error?: string;
            requestId?: number;
          }) => {
            if (requestId !== aiRequestIdRef.current) return;
            if (loadingActionIdRef.current !== action) return;

            setLoadingActionId(null);
            loadingActionIdRef.current = null;

            if (response && response.success && response.text !== undefined) {
              setCardResultText(response.text);
              cardApplyTextRef.current = response.text;
              if (action === "fix_spelling") {
                const diff = wordDiff(span.text, response.text);
                setCardDiff(diff);
              } else {
                setCardDiff(null);
              }
            } else {
              showToast(response?.error || "AI request failed.", "error");
              setCardResultText(span.text);
              cardApplyTextRef.current = span.text;
              setCardDiff(null);
            }
          }
        );
      }
    },
    [showToast, processAIResponse, previewInCard],
  );

  const triggerAIAction = useCallback(
    (action: string, overrideInference?: InferredSelection, extraParams?: Record<string, string>) => {
      if (action === "tone_reading_level" && !extraParams?.grade_level) {
        setPendingActionOverride({ actionId: action, override: overrideInference });
        return;
      }
      
      if (isAiProcessingRef.current || loadingActionIdRef.current) {
        const handler = registryRef.current?.get(action);
        setIsMenuOpen(true);
        setActionConfirm({
          action,
          actionLabel: handler?.name ?? action,
          override: overrideInference,
          extraParams,
        });
        setRevealMenuOverride(false);
        return;
      }
      executeAIAction(action, overrideInference, extraParams);
    },
    [executeAIAction, setPendingActionOverride],
  );

  const confirmAbortAndRun = useCallback(() => {
    const pending = actionConfirm;
    if (!pending) return;

    heldResponseRef.current = null;
    setActionConfirm(null);
    setRevealMenuOverride(false);
    aiRequestIdRef.current += 1;
    chrome.runtime.sendMessage({ type: "ABORT_PROCESS_TEXT" }, () => {
      setIsAiProcessing(false);
      setProcessingSpan(null);
      setLoadingActionId(null);
      executeAIAction(pending.action, pending.override, pending.extraParams);
    });
  }, [actionConfirm, executeAIAction]);

  const confirmCancelGeneration = useCallback(() => {
    heldResponseRef.current = null;
    setActionConfirm(null);
    aiRequestIdRef.current += 1;
    chrome.runtime.sendMessage({ type: "ABORT_PROCESS_TEXT" }, () => {
      setIsAiProcessing(false);
      setProcessingSpan(null);
      processingAdapterRef.current = null;
      setProcessingAdapter(null);
      processingSpanRef.current = null;
      clearCardState();
    });
  }, [clearCardState]);

  const cancelActionConfirm = useCallback(() => {
    setActionConfirm(null);
    const held = heldResponseRef.current;
    if (held) {
      heldResponseRef.current = null;
      processAIResponse(
        held.response,
        held.action,
        held.adapter,
        held.span,
        held.fieldSnapshot,
      );
    }
  }, [processAIResponse]);

  // ── Unified entry point: resolve context and open the assistant ──
  const openAssistant = useCallback(
    (immediateAction?: string) => {
      const ctx = resolveActiveContext();
      if (!ctx) {
        showToast("Focus an editable field or select text first", "error");
        return;
      }

      applyContext(ctx);
      setIsMenuOpen(true);

      // If an immediate action was requested and we have an adapter, execute it
      if (immediateAction && ctx.adapter) {
        triggerAIAction(immediateAction);
      }
    },
    [showToast, triggerAIAction, applyContext],
  );

  const getInferenceOverride = useCallback((): InferredSelection | undefined => {
    if (!inferenceOptions || !selectedInferenceLevel) return undefined;
    return inferenceOptions[selectedInferenceLevel] as InferredSelection | undefined;
  }, [inferenceOptions, selectedInferenceLevel]);

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

      // 3. Escape key handler when menu is open
      if (e.key === "Escape" && isMenuOpen) {
        e.preventDefault();
        if (pendingActionOverride) {
          setPendingActionOverride(null);
        } else if (actionConfirm) {
          cancelActionConfirm();
        } else if (loadingActionIdRef.current) {
          setActionConfirm({
            action: "cancel_generation",
            actionLabel: "cancel generation",
            override: undefined,
          });
        } else if (cardActionIdRef.current) {
          handleCancelCard();
        } else {
          setIsMenuOpen(false);
          const el = activeContextRef.current?.adapter?.getElement();
          if (el) el.focus();
        }
        return;
      }

      // 5. Escape key to cancel background AI generation when menu is closed
      if (e.key === "Escape" && isAiProcessing && !actionConfirm && !isMenuOpen) {
        e.preventDefault();
        setIsMenuOpen(true);
        setActionConfirm({
          action: "cancel_generation",
          actionLabel: "cancel generation",
          override: undefined,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [shortcut, dropdownShortcut, isMenuOpen, openAssistant, actionConfirm, isAiProcessing, revealMenuOverride, cancelActionConfirm, handleCancelCard, pendingActionOverride]);

  // ── Chrome command shortcuts (manifest commands) ──
  useEffect(() => {
    const handleCommand = (
      message: Record<string, unknown>,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (message.type === "COMMAND_TRIGGERED" && message.action) {
        if (message.action === "toggle_menu") {
          if (isMenuOpen) {
            setIsMenuOpen(false);
          } else {
            openAssistant();
          }
        } else {
          openAssistant(message.action as string);
        }
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(handleCommand);
    return () => chrome.runtime.onMessage.removeListener(handleCommand);
  }, [isMenuOpen, openAssistant]);

  const hasCardResult = !!cardResultText && !!cardActionId;

  // Card-only mode: an explicit AI action (or confirm/grade picker) owns the UI.
  const isCardOnly =
    pendingActionOverride?.actionId === "tone_reading_level" ||
    (!revealMenuOverride &&
      (!!actionConfirm || hasCardResult || !!loadingActionId));

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
          // Don't close menu when user focuses a new input - let them open it in the new input
          applyContext({
            type: "input",
            adapter,
            text: adapter.getSelection().text || adapter.getText(),
            rect: adapter.getCaretRect(),
          });
        }
      }
    };

    const onFocusOut = () => {
      if (isInsideShadow.current) return;

      const hasPinnedCardState =
        isCardOnly ||
        actionConfirmRef.current ||
        !!loadingActionIdRef.current ||
        !!cardActionIdRef.current;

      if (hasPinnedCardState && !document.hasFocus()) return;

      if (isCardOnly) return;

      blurTimeoutRef.current = window.setTimeout(() => {
        if (isInsideShadow.current) return;
        if (hasPinnedCardState && !document.hasFocus()) return;
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
  }, [isCardOnly, applyContext]);

  // ── Throttled rect updater ──
  const updateRect = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const ctx = activeContextRef.current;
      if (!ctx) return;

      if (ctx.type === "input" && ctx.adapter) {
        const newRect = ctx.adapter.getCaretRect();
        anchorRectRef.current = newRect;
        setAnchorRect(newRect);
      } else if (ctx.type === "selection") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const newRect = range.getBoundingClientRect() || range.getClientRects()?.[0];
          if (newRect && (newRect.width > 0 || newRect.height > 0)) {
            anchorRectRef.current = newRect;
            setAnchorRect(newRect);
          }
        }
      }
    });
  }, []);

  // Re-attach scroll/input listeners when the active context changes
  useEffect(() => {
    if (!activeContext) return;

    updateRect();

    window.addEventListener("scroll", updateRect, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", updateRect, { passive: true });

    const el = activeContext.adapter?.getElement();
    if (el) {
      el.addEventListener("input", updateRect);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      if (el) {
        el.removeEventListener("input", updateRect);
      }
    };
  }, [activeContext, updateRect]);

  // ── Floating-ui auto-positioning ──
  useEffect(() => {
    if (!isMenuOpen || !menuRef.current || !anchorRect) return;

    const virtualEl: VirtualElement = {
      getBoundingClientRect: () => anchorRect,
    };

    return autoPositionElement(virtualEl, menuRef.current, setMenuPos, {
      placement: "top",
      gap: 6,
    });
  }, [isMenuOpen, anchorRect]);

  // ── Click outside to close ──
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = () => {
      if (!isInsideShadow.current) {
        if (!isCardOnly) {
          setIsMenuOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClick, true);
    return () => document.removeEventListener("mousedown", handleClick, true);
  }, [isMenuOpen, isCardOnly]);

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
  const primaryActions = useMemo(() => actions.filter((a) => a.category === "primary"), [actions]);
  const customActions = useMemo(() => actions.filter((a) => a.category === "custom"), [actions]);
  const toneActions = useMemo(() => actions.filter((a) => a.category === "tone"), [actions]);
  const lengthActions = useMemo(() => actions.filter((a) => a.category === "length"), [actions]);
  // ── Menu keyboard-nav items (primary → custom → tone accordion → tone actions → length accordion → length actions) ──
  const menuItems = useMemo(() => {
    const items: (
      | { type: "action"; action: ActionHandler }
      | { type: "accordion"; id: "tone" | "length"; label: string }
    )[] = [];

    primaryActions.forEach(a => items.push({ type: "action", action: a }));
    customActions.forEach(a => items.push({ type: "action", action: a }));
    
    if (toneActions.length > 0) {
      items.push({ type: "accordion", id: "tone", label: "Tone" });
      if (toneExpanded) {
        toneActions.forEach(a => items.push({ type: "action", action: a }));
      }
    }
    
    if (lengthActions.length > 0) {
      items.push({ type: "accordion", id: "length", label: "Length" });
      if (lengthExpanded) {
        lengthActions.forEach(a => items.push({ type: "action", action: a }));
      }
    }

    return items;
  }, [primaryActions, customActions, toneActions, lengthActions, toneExpanded, lengthExpanded]);

  const actionItemCount = menuItems.length;

  useEffect(() => {
    actionConfirmRef.current = !!actionConfirm;
  }, [actionConfirm]);

  useEffect(() => {
    isAiProcessingRef.current = isAiProcessing;
  }, [isAiProcessing]);

  useEffect(() => {
    loadingActionIdRef.current = loadingActionId;
  }, [loadingActionId]);

  useEffect(() => {
    if (!isMenuOpen) return;
    return () => {
      clearCardState();
    };
  }, [isMenuOpen, clearCardState]);

  // ── Keep editor focused while menu is open ──
  useEffect(() => {
    if (isMenuOpen) {
      const timeout = setTimeout(() => setFocusedActionIdx(0), 0);
      saveEditorFocus();
      return () => clearTimeout(timeout);
    }
    // Don't restore focus when menu closes - user may have intentionally moved to another input
  }, [isMenuOpen, saveEditorFocus]);

  useEffect(() => {
    focusedActionIdxRef.current = focusedActionIdx;
  }, [focusedActionIdx]);

  // Keep focus index valid when custom actions load or change while menu is open
  useEffect(() => {
    if (!isMenuOpen || actionItemCount === 0) return;
    const timeout = setTimeout(() =>
      setFocusedActionIdx((prev) =>
        prev >= actionItemCount ? actionItemCount - 1 : prev,
      ), 0);
    return () => clearTimeout(timeout);
  }, [isMenuOpen, actionItemCount]);

  const activateMenuActionAtIndex = useCallback(
    (idx: number) => {
      const item = menuItems[idx];
      if (!item) return;

      if (item.type === "accordion") {
        if (item.id === "tone") setToneExpanded(prev => !prev);
        if (item.id === "length") setLengthExpanded(prev => !prev);
        return;
      }

      const override: InferredSelection | undefined =
        inferenceOptions && selectedInferenceLevel
          ? (inferenceOptions[selectedInferenceLevel] as InferredSelection | undefined)
          : undefined;

      const actionId = item.action.id;
      suppressKeysUntilRef.current = performance.now() + 250;
      triggerAIAction(actionId, override);
    },
    [
      menuItems,
      inferenceOptions,
      selectedInferenceLevel,
      triggerAIAction,
    ],
  );

  const canApplyCard =
    !!cardResultText &&
    !loadingActionId &&
    (!cardDiff || cardDiff.some((token) => token.type !== "equal"));

  // The card only exists for explicit AI actions, confirms and the grade picker.
  const showCard =
    !!loadingActionId ||
    !!actionConfirm ||
    pendingActionOverride?.actionId === "tone_reading_level" ||
    !!cardActionId;

  // ── Capture keyboard so Enter/Space never reach the field behind ──
  useEffect(() => {
    if (!isMenuOpen && !actionConfirm) return;

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
          if (actionConfirm.action === "cancel_generation") {
            confirmCancelGeneration();
          } else {
            confirmAbortAndRun();
          }
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

      if (!isMenuOpen) return;

      // ── Keydown handling in Card-Only mode ──
      if (isCardOnly) {
        // Left/Right arrow key reveals the menu
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          consumeKeyboardEvent(e);
          setRevealMenuOverride(true);
          return;
        }

        // Enter key applies the card content (if not loading and has result)
        if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          if (canApplyCard) {
            consumeKeyboardEvent(e);
            handleApplyCard();
            return;
          }
        }

        // Escape key cancels/discards
        if (e.key === "Escape") {
          consumeKeyboardEvent(e);
          if (loadingActionIdRef.current) {
            setActionConfirm({
              action: "cancel_generation",
              actionLabel: "cancel generation",
              override: undefined,
            });
          } else {
            handleCancelCard();
          }
          return;
        }

        // Prevent navigation to menu items while the card owns the UI.
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          consumeKeyboardEvent(e);
          return;
        }

        // Suppress typing in field
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          consumeKeyboardEvent(e);
          return;
        }

        return;
      }

      // ── Normal Menu Keydown handling (isCardOnly is false) ──
      if (e.altKey && e.key === "Enter" && canApplyCard) {
        consumeKeyboardEvent(e);
        handleApplyCard();
        return;
      }

      // If we are showing AI result in card (but menu is revealed) and user presses Escape, discard the AI result
      if (e.key === "Escape") {
        if (cardActionIdRef.current) {
          consumeKeyboardEvent(e);
          handleCancelCard();
          return;
        }
      }

      if (pendingActionOverride) {
        // let slider handle arrows, but consume typing
        if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            consumeKeyboardEvent(e);
          }
        }
        return;
      }

      if (actionItemCount === 0) return;

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
        (isMenuOpen && isActivationKey(e.key))
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
    actionConfirm,
    actionItemCount,
    activateMenuActionAtIndex,
    confirmAbortAndRun,
    confirmCancelGeneration,
    cancelActionConfirm,
    handleApplyCard,
    handleCancelCard,
    isCardOnly,
    canApplyCard,
    loadingActionId,
    pendingActionOverride,
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
      if (isAiProcessing && processingSpan) {
        return processingSpan;
      }
      return null;
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

  const handleDotMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      saveEditorFocus();
      if (!isMenuOpen) {
        const ctx = resolveActiveContext();
        if (ctx) applyContext(ctx);
      }
      setIsMenuOpen((prev) => !prev);
    },
    [saveEditorFocus, isMenuOpen, applyContext],
  );

  // ── Render ──
  if (
    !isAiProcessing &&
    !actionConfirm &&
    !isMenuOpen &&
    !hoverCard &&
    (!anchorRect || !activeContext)
  ) {
    return null;
  }

  const rect = anchorRect;
  const showFieldChrome =
    !!activeContext && !!rect && rect.height >= 5;

  const menuWidth = 264;

  const showDot =
    showFieldChrome && !hideDot && activeContext!.type === "input";
  const dotSize = 16;

  const proofreadElement = activeContext?.adapter?.getElement();

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
        adapter={isAiProcessing ? (processingAdapter ?? null) : (activeContext?.adapter ?? null)}
        start={highlightSpan?.start ?? 0}
        end={highlightSpan?.end ?? 0}
        mode={isAiProcessing ? "loading" : "idle"}
        active={highlightActive}
        onRestoreSelection={restoreEditorFocus}
      />

      {/* Live proofreading: wavy underlines on native fields (contenteditable
          underlines come from the CSS Custom Highlight API in the controller) */}
      {liveProofread &&
        proofreadElement &&
        (proofreadElement instanceof HTMLInputElement ||
          proofreadElement instanceof HTMLTextAreaElement) &&
        activeContext?.adapter &&
        !isAiProcessing && (
          <NativeProofreadUnderlines
            adapter={activeContext.adapter}
            issues={proofreadIssues}
          />
        )}

      {/* QuillBot-style hover card anchored to the underlined issue */}
      {hoverCard && (
        <SuggestionCard
          issue={hoverCard.issue}
          flagged={hoverCard.flagged}
          top={suggestionCardPos.top}
          left={suggestionCardPos.left}
          cardRef={registerSuggestionCard}
          onPointerEnterCard={handleCardPointerEnter}
          onPointerLeaveCard={handleCardPointerLeave}
          onApplyFix={(fix) => void handleApplyProofreadFix(hoverCard.issue, fix)}
          onIgnore={() => handleIgnoreProofreadIssue(hoverCard.issue)}
          onAddToDictionary={() => handleAddProofreadWord(hoverCard.issue)}
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
            onMouseDown={handleDotMouseDown}
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

          actions={actions}
          menuItems={menuItems}
          focusedActionIdx={focusedActionIdx}
          onFocusAction={setFocusedActionIdx}
          pendingActionOverride={pendingActionOverride}
          onCancelPending={() => setPendingActionOverride(null)}
          onTriggerAction={triggerAIAction}
          hasAdapter={!!activeContext?.adapter}
          toneExpanded={toneExpanded}
          onSetToneExpanded={setToneExpanded}
          lengthExpanded={lengthExpanded}
          onSetLengthExpanded={setLengthExpanded}
          getInferenceOverride={getInferenceOverride}
          cardResultText={cardResultText}
          cardDiff={cardDiff}
          isCardLoading={!!loadingActionId}
          loadingActionId={loadingActionId}
          cardActionId={cardActionId}
          onApplyCard={handleApplyCard}
          onCancelCard={handleCancelCard}
          isCardOnly={isCardOnly}
          showCard={showCard}
          confirmState={actionConfirm}
          onConfirmAction={actionConfirm?.action === "cancel_generation" ? confirmCancelGeneration : confirmAbortAndRun}
          onCancelConfirm={cancelActionConfirm}
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

// ── Wavy underlines for input/textarea fields (overlay strips) ──
// Contenteditable fields are underlined via the CSS Custom Highlight API
// inside LiveProofreader; native fields have no DOM ranges, so thin wavy
// strips are measured with the span-geometry mirror and drawn here.
function NativeProofreadUnderlines({
  adapter,
  issues,
}: {
  adapter: EditableAdapter;
  issues: ProofreadIssue[];
}) {
  const [strips, setStrips] = useState<
    { key: string; kind: ProofreadIssue["kind"]; rects: DOMRect[] }[]
  >([]);

  useEffect(() => {
    if (issues.length === 0) return;

    let raf = 0;
    let last: { key: string; kind: ProofreadIssue["kind"]; rects: DOMRect[] }[] = [];

    const measure = () => {
      raf = 0;
      const next: typeof last = [];
      const groups = getSpansClientRects(adapter, issues);
      for (let i = 0; i < issues.length; i++) {
        const rects = groups[i];
        if (rects.length > 0) next.push({ key: `${i}`, kind: issues[i].kind, rects });
      }
      if (!rectGroupsEqual(last, next)) {
        last = next;
        setStrips(next);
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule, { passive: true });
    const el = adapter.getElement();
    el.addEventListener("scroll", schedule, { passive: true });
    el.addEventListener("input", schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      el.removeEventListener("scroll", schedule);
      el.removeEventListener("input", schedule);
    };
  }, [adapter, issues]);

  if (issues.length === 0 || strips.length === 0) return null;

  return (
    <>
      {strips.map((strip) =>
        strip.rects.map((rect, i) => (
          <div
            key={`squiggle-${strip.key}-${i}`}
            aria-hidden
            className={
              strip.kind === "spelling"
                ? "hone-squiggle hone-squiggle--spelling"
                : "hone-squiggle hone-squiggle--grammar"
            }
            style={{
              position: "fixed",
              left: rect.left,
              top: rect.bottom - 2,
              width: Math.max(rect.width, 4),
              height: 3,
              zIndex: 2147483644,
            }}
          />
        )),
      )}
    </>
  );
}

function rectGroupsEqual(
  a: { key: string; rects: DOMRect[] }[],
  b: { key: string; rects: DOMRect[] }[],
): boolean {
  if (a.length !== b.length) return false;
  for (let g = 0; g < a.length; g++) {
    if (a[g].key !== b[g].key || a[g].rects.length !== b[g].rects.length) {
      return false;
    }
    for (let i = 0; i < a[g].rects.length; i++) {
      const ra = a[g].rects[i];
      const rb = b[g].rects[i];
      if (
        Math.abs(ra.left - rb.left) > 1 ||
        Math.abs(ra.top - rb.top) > 1 ||
        Math.abs(ra.width - rb.width) > 1
      ) {
        return false;
      }
    }
  }
  return true;
}
