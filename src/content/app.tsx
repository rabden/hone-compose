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
import { FloatingActionMenu } from "./floating-action-menu";
import { OverlayToast, TriggerDot } from "./overlay-chrome";
import { TargetHighlight } from "./target-highlight";
import {
  consumeKeyboardEvent,
  isActivationKey,
  shouldSuppressActivationKey,
} from "./keyboard-guard";
import { wordDiff, type DiffToken } from "./word-diff";
import { checkGrammarAndSpelling } from "./grammar-worker";
import { browserHasSpellingErrors } from "./browser-proofreader";
import { nspellHasSpellingErrors } from "./nspell-detector";
import type { AutoSpellcheckMode } from "./storage";

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
  const [customActions, setCustomActions] = useState<ActionHandler[]>([]);
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
  } | null>(null);

  // New Generalized Card & Settings states
  const [previewInCard, setPreviewInCard] = useState<boolean>(true);
  const [autoSpellcheckMode, setAutoSpellcheckMode] =
    useState<AutoSpellcheckMode>("browser_only");
  const [autoSpellcheckWordThreshold, setAutoSpellcheckWordThreshold] =
    useState(50);
  const [cardResultText, setCardResultText] = useState<string>("");
  const [cardDiff, setCardDiff] = useState<DiffToken[] | null>(null);
  const [isHarperLoading, setIsHarperLoading] = useState<boolean>(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [localResultText, setLocalResultText] = useState<string>("");
  const [localDiff, setLocalDiff] = useState<DiffToken[] | null>(null);
  const [revealMenuOverride, setRevealMenuOverride] = useState<boolean>(false);
  const [harperHasErrors, setHarperHasErrors] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const registryRef = useRef<ActionRegistry | null>(null);
  const focusedActionIdxRef = useRef(0);
  const suppressKeysUntilRef = useRef(0);
  const dotRef = useRef<HTMLButtonElement>(null);
  const isInsideShadow = useRef(false);
  const isMenuOpenRef = useRef(false);
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
  const grammarCheckCacheRef = useRef<Map<string, string>>(new Map());

  const clearCardState = useCallback(() => {
    setCardResultText("");
    setCardDiff(null);
    setLocalResultText("");
    setLocalDiff(null);
    setCardActionId(null);
    cardActionIdRef.current = null;
    cardApplyTextRef.current = "";
    cardOverrideInferenceRef.current = undefined;
    cardApplyTargetRef.current = null;
    setHarperHasErrors(false);
    setLoadingActionId(null);
    loadingActionIdRef.current = null;
    setIsHarperLoading(false);
  }, []);

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



  const activeLevelText = useMemo(() => {
    if (!inferenceOptions || !selectedInferenceLevel) return "";
    const opt = inferenceOptions[selectedInferenceLevel] as { text?: string } | undefined;
    return opt?.text ?? "";
  }, [inferenceOptions, selectedInferenceLevel]);

  useEffect(() => {
    let active = true;
    const runGrammarCheck = async () => {
      if (!isMenuOpen || !activeLevelText) return;

      const threshold = Math.min(100, Math.max(1, autoSpellcheckWordThreshold || 50));
      const wordCount = activeLevelText
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      const ctx = activeContextRef.current;
      const adapter = ctx?.adapter;
      const activeOverride =
        inferenceOptions && selectedInferenceLevel
          ? (inferenceOptions[selectedInferenceLevel] as InferredSelection | undefined)
          : undefined;
      const activeSpan = adapter
        ? resolveReplacementSpan(adapter, activeOverride)
        : null;
      const fieldSnapshot = adapter?.getText() ?? "";
      if (fieldSnapshot && fieldSnapshot === lastAcceptedFieldTextRef.current) {
        setIsHarperLoading(false);
        return;
      }

      if (wordCount <= threshold) {
        setIsHarperLoading(true);
        try {
          const corrected = await checkGrammarAndSpelling(activeLevelText);
          if (!active) return;
          if (loadingActionIdRef.current) {
            setIsHarperLoading(false);
            return;
          }

          const diff = wordDiff(activeLevelText, corrected);
          const hasErrors = diff.some((t) => t.type !== "equal");
          setHarperHasErrors(hasErrors);
          setCardResultText(corrected);
          cardApplyTextRef.current = corrected;
          setCardDiff(diff);
          setLocalResultText(corrected);
          setLocalDiff(diff);
          cardActionIdRef.current = "fix_spelling_local";
          setCardActionId("fix_spelling_local");
          cardOverrideInferenceRef.current = activeOverride;
          cardApplyTargetRef.current = activeSpan
            ? { ...activeSpan, fieldSnapshot }
            : null;
          setIsHarperLoading(false);
        } catch (err) {
          console.error("Failed to run Harper.js local check:", err);
          if (active) {
            setIsHarperLoading(false);
          }
        }
        return;
      }

      if (autoSpellcheckMode === "disabled") {
        setIsHarperLoading(false);
        return;
      }

      setIsHarperLoading(true);

      if (autoSpellcheckMode === "browser_only") {
        const browserHasErrors = await browserHasSpellingErrors(activeLevelText);
        if (!active || browserHasErrors === false) {
          if (active) setIsHarperLoading(false);
          return;
        }

        if (browserHasErrors === null) {
          const nspellHasErrors = nspellHasSpellingErrors(activeLevelText, 500);
          if (nspellHasErrors !== true) {
            setIsHarperLoading(false);
            return;
          }
        }
      }

      const cacheKey = activeLevelText;
      const cachedResponse = grammarCheckCacheRef.current.get(cacheKey);
      if (cachedResponse) {
        const diff = wordDiff(activeLevelText, cachedResponse);
        setCardResultText(cachedResponse);
        cardApplyTextRef.current = cachedResponse;
        setCardDiff(diff);
        setLocalResultText(cachedResponse);
        setLocalDiff(diff);
        cardActionIdRef.current = "fix_spelling_auto";
        setCardActionId("fix_spelling_auto");
        cardOverrideInferenceRef.current = activeOverride;
        cardApplyTargetRef.current = activeSpan
          ? { ...activeSpan, fieldSnapshot }
          : null;
        setHarperHasErrors(diff.some((t) => t.type !== "equal"));
        setLoadingActionId(null);
        loadingActionIdRef.current = null;
        if (active) setIsHarperLoading(false);
        return;
      }

      setLoadingActionId("fix_spelling_auto");
      loadingActionIdRef.current = "fix_spelling_auto";
      cardActionIdRef.current = "fix_spelling_auto";
      setCardActionId("fix_spelling_auto");
      cardOverrideInferenceRef.current = activeOverride;
      cardApplyTargetRef.current = activeSpan
        ? { ...activeSpan, fieldSnapshot }
        : null;
      setCardResultText("");
      cardApplyTextRef.current = "";
      setCardDiff(null);

      if (adapter && activeSpan) {
        const requestId = ++aiRequestIdRef.current;

        chrome.runtime.sendMessage(
          { type: "PROCESS_TEXT", action: "fix_spelling", text: activeSpan.text, requestId },
          (response: {
            success: boolean;
            text?: string;
            error?: string;
            requestId?: number;
          }) => {
            if (!active || requestId !== aiRequestIdRef.current) return;
            if (loadingActionIdRef.current !== "fix_spelling_auto") return;

            setLoadingActionId(null);
            loadingActionIdRef.current = null;
            setIsHarperLoading(false);

            if (response && response.success && response.text !== undefined) {
              grammarCheckCacheRef.current.set(cacheKey, response.text);

              const diff = wordDiff(activeLevelText, response.text);
              setCardResultText(response.text);
              cardApplyTextRef.current = response.text;
              setCardDiff(diff);
              setLocalResultText(response.text);
              setLocalDiff(diff);
              setHarperHasErrors(diff.some((t) => t.type !== "equal"));
            } else {
              showToast(response?.error || "AI request failed.", "error");
              setCardResultText(activeLevelText);
              cardApplyTextRef.current = activeLevelText;
              setCardDiff(null);
            }
          }
        );
      } else if (active) {
        setIsHarperLoading(false);
      }
    };

    void runGrammarCheck();

    return () => {
      active = false;
    };
  }, [isMenuOpen, activeLevelText, autoSpellcheckMode, inferenceOptions, selectedInferenceLevel, showToast]);

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
        "autoSpellcheckMode",
        "autoSpellcheckWordThreshold",
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
        setAutoSpellcheckMode(
          res.autoSpellcheckMode === "disabled" ||
          res.autoSpellcheckMode === "browser_only" ||
          res.autoSpellcheckMode === "always"
            ? (res.autoSpellcheckMode as AutoSpellcheckMode)
            : "browser_only",
        );
        setAutoSpellcheckWordThreshold(
          typeof res.autoSpellcheckWordThreshold === "number"
            ? Math.min(100, Math.max(1, Math.round(res.autoSpellcheckWordThreshold)))
            : 50,
        );
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
        changes.autoSpellcheckMode ||
        changes.autoSpellcheckWordThreshold
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
          const providerNames: Record<string, string> = {
            openai: "OpenAI",
            anthropic: "Anthropic",
            gemini: "Gemini",
            google_ai_studio: "AI Studio",
            openrouter_paid: "OpenRouter",
            openrouter: "OpenRouter Free"
          };
          const name = providerNames[response.fallbackUsed] || response.fallbackUsed;
          showToast(`Done! (Fell back to ${name})`, "success");
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
      cardActionIdRef.current || "fix_spelling_local",
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
      setCardResultText(localResultText);
      cardApplyTextRef.current = localResultText;
      setCardDiff(localDiff);
      cardActionIdRef.current = "fix_spelling_local";
      setCardActionId("fix_spelling_local");
      cardOverrideInferenceRef.current = undefined;
      cardApplyTargetRef.current = null;
      setLoadingActionId(null);
      loadingActionIdRef.current = null;
    }
  }, [localResultText, localDiff]);

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

      setActionConfirm(null);
      setRevealMenuOverride(false);
      suppressKeysUntilRef.current = performance.now() + 250;

      const handler = registryRef.current?.get(action);
      const isCustomPreview = handler?.type === "custom" && handler.replaceMode === "preview";
      const shouldPreviewInCard = previewInCard || isCustomPreview;

      if (!shouldPreviewInCard) {
        setIsMenuOpen(false);
        const fieldSnapshot = adapter.getText();
        setProcessingSpan({ start: span.start, end: span.end });
        setIsAiProcessing(true);
        processingAdapterRef.current = adapter;
        setProcessingAdapter(adapter);
        processingSpanRef.current = { start: span.start, end: span.end };

        if (handler?.isLocal) {
          const runLocal = async () => {
            let corrected = cardResultText;
            if (!corrected || span.text !== activeLevelText) {
              corrected = await checkGrammarAndSpelling(span.text);
            }
            await processAIResponse(
              { success: true, text: corrected },
              action,
              adapter,
              span,
              fieldSnapshot
            );
          };
          void runLocal();
          return;
        }

        const requestId = ++aiRequestIdRef.current;

        chrome.runtime.sendMessage(
          { type: "PROCESS_TEXT", action, text: span.text, requestId },
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

        if (handler?.isLocal) {
          const runLocal = async () => {
            const corrected = await checkGrammarAndSpelling(span.text);
            if (loadingActionIdRef.current !== action) return;
            setLoadingActionId(null);
            loadingActionIdRef.current = null;
            const diff = wordDiff(span.text, corrected);
            setCardResultText(corrected);
            cardApplyTextRef.current = corrected;
            setCardDiff(diff);
          };
          void runLocal();
          return;
        }

        // Check cache for fix_spelling action
        if (action === "fix_spelling") {
          const cachedResponse = grammarCheckCacheRef.current.get(span.text);
          if (cachedResponse) {
            setLoadingActionId(null);
            loadingActionIdRef.current = null;
            const diff = wordDiff(span.text, cachedResponse);
            setCardResultText(cachedResponse);
            cardApplyTextRef.current = cachedResponse;
            setCardDiff(diff);
            return;
          }
        }

        const requestId = ++aiRequestIdRef.current;
        chrome.runtime.sendMessage(
          { type: "PROCESS_TEXT", action, text: span.text, requestId },
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
              // Cache fix_spelling responses
              if (action === "fix_spelling") {
                grammarCheckCacheRef.current.set(span.text, response.text);
              }
              
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
    [showToast, processAIResponse, cardResultText, activeLevelText, previewInCard],
  );

  const triggerAIAction = useCallback(
    (action: string, overrideInference?: InferredSelection) => {
      if (isAiProcessingRef.current || loadingActionIdRef.current) {
        const handler = registryRef.current?.get(action);
        setIsMenuOpen(true);
        setActionConfirm({
          action,
          actionLabel: handler?.name ?? action,
          override: overrideInference,
        });
        setRevealMenuOverride(false);
        return;
      }
      executeAIAction(action, overrideInference);
    },
    [executeAIAction],
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
      loadingActionIdRef.current = null;
      executeAIAction(pending.action, pending.override);
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
      setLoadingActionId(null);
      loadingActionIdRef.current = null;
      cardActionIdRef.current = "fix_spelling_local";
      setCardActionId("fix_spelling_local");
      setCardResultText(localResultText);
      cardApplyTextRef.current = localResultText;
      setCardDiff(localDiff);
    });
  }, [localResultText, localDiff]);

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
        } catch {
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

  const cycleInferenceLevel = useCallback((direction: -1 | 1) => {
    if (!selectedInferenceLevel) return;
    const order: Array<"selection" | "paragraph" | "field"> = [
      "selection",
      "paragraph",
      "field",
    ];
    const currentLevel = selectedInferenceLevel === "sentence" ? "paragraph" : selectedInferenceLevel;
    const idx = order.indexOf(currentLevel as "selection" | "paragraph" | "field");
    const next = order[(idx + direction + order.length) % order.length];
    setSelectedInferenceLevel(next);
  }, [selectedInferenceLevel]);

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
        if (actionConfirm) {
          cancelActionConfirm();
        } else if (loadingActionIdRef.current) {
          setActionConfirm({
            action: "cancel_generation",
            actionLabel: "cancel generation",
            override: undefined,
          });
        } else if (cardActionIdRef.current && cardActionIdRef.current !== "fix_spelling_local") {
          handleCancelCard();
        } else {
          setIsMenuOpen(false);
          const el = activeContextRef.current?.adapter?.getElement();
          if (el) el.focus();
        }
        return;
      }

      const hasActivePreviewCardOnlyState =
        !revealMenuOverride &&
        (!!actionConfirm ||
          !!loadingActionIdRef.current ||
          (!!cardActionIdRef.current &&
            cardActionIdRef.current !== "fix_spelling_local"));

      // 4. Left/Right arrow keys change inference level only when the menu
      // column is actually available, not while a card-only preview owns the UI.
      if (isMenuOpen && inferenceOptions && !hasActivePreviewCardOnlyState) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          cycleInferenceLevel(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          cycleInferenceLevel(1);
        }
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
  }, [shortcut, dropdownShortcut, isMenuOpen, openAssistant, actionConfirm, cycleInferenceLevel, inferenceOptions, isAiProcessing, revealMenuOverride, cancelActionConfirm, handleCancelCard]);

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

  const hasNonLocalCardResult =
    !!cardResultText &&
    !!cardActionId &&
    cardActionId !== "fix_spelling_local" &&
    cardActionId !== "fix_spelling_auto";

  // Don't collapse to card-only mode for automatic grammar checking
  // (fix_spelling_local for Harper.js, fix_spelling_auto for AI), even during loading state
  const isCardOnly =
    !revealMenuOverride &&
    cardActionId !== "fix_spelling_local" &&
    cardActionId !== "fix_spelling_auto" &&
    loadingActionId !== "fix_spelling_auto" &&
    (!!actionConfirm || hasNonLocalCardResult || !!loadingActionId);

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
          } catch {
            setInferenceOptions(null);
            setSelectedInferenceLevel(null);
          }
        }
      }
    };

    const onFocusOut = () => {
      if (isInsideShadow.current) return;

      const hasPinnedCardState =
        isCardOnly ||
        !!actionConfirm ||
        !!loadingActionIdRef.current ||
        (!!cardActionIdRef.current &&
          cardActionIdRef.current !== "fix_spelling_local");

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
  }, [isCardOnly]);

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
      const override: InferredSelection | undefined =
        inferenceOptions && selectedInferenceLevel
          ? (inferenceOptions[selectedInferenceLevel] as InferredSelection | undefined)
          : undefined;

      const primary = ["improve", "paraphrase", "fix_spelling"] as const;
      const tones = [
        "tone_professional",
        "tone_casual",
        "tone_exciting",
        "tone_friendly",
      ] as const;
      const lengths = ["length_shorter", "length_longer"] as const;

      const actionId = (() => {
        if (idx < PRIMARY_ACTION_COUNT) {
          return primary[idx] ?? null;
        }
        if (idx < PRIMARY_ACTION_COUNT + customActions.length) {
          return customActions[idx - PRIMARY_ACTION_COUNT]?.id ?? null;
        }
        if (
          idx <
          PRIMARY_ACTION_COUNT + customActions.length + TONE_ACTION_COUNT
        ) {
          return tones[idx - PRIMARY_ACTION_COUNT - customActions.length] ?? null;
        }
        const lenIdx =
          idx -
          PRIMARY_ACTION_COUNT -
          customActions.length -
          TONE_ACTION_COUNT;
        return lengths[lenIdx] ?? null;
      })();
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

  const canApplyCard =
    !!cardResultText &&
    !isHarperLoading &&
    !loadingActionId &&
    (!cardDiff || cardDiff.some((token) => token.type !== "equal"));

  // Harper runs quietly in the background. Only reveal the card automatically
  // when it found local corrections, or when an explicit AI action needs it.
  const showCard =
    harperHasErrors ||
    !!loadingActionId ||
    !!actionConfirm ||
    (!!cardActionId && cardActionId !== "fix_spelling_local" && cardActionId !== "fix_spelling_auto");

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
      if (e.ctrlKey && e.key === "Enter" && canApplyCard) {
        consumeKeyboardEvent(e);
        handleApplyCard();
        return;
      }

      // If we are showing AI result in card (but menu is revealed) and user presses Escape, discard the AI result
      if (e.key === "Escape") {
        if (cardActionIdRef.current && cardActionIdRef.current !== "fix_spelling_local") {
          consumeKeyboardEvent(e);
          handleCancelCard();
          return;
        }
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
    isHarperLoading,
    loadingActionId,
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

  // ── Render ──
  if (
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
        adapter={isAiProcessing ? (processingAdapter ?? null) : (activeContext?.adapter ?? null)}
        start={highlightSpan?.start ?? 0}
        end={highlightSpan?.end ?? 0}
        mode={isAiProcessing ? "loading" : "idle"}
        active={highlightActive}
        onRestoreSelection={restoreEditorFocus}
      />

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
                    } catch {
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
          inferenceOptions={inferenceOptions as Record<string, { text?: string }> | null}
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
          cardResultText={cardResultText}
          cardDiff={cardDiff}
          isCardLoading={isHarperLoading || !!loadingActionId}
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
