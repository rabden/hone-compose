"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useRouter } from "next/navigation";
import type { CustomAction } from "../content/storage";
import type { AutoSpellcheckMode } from "../content/storage";
import {
  loadCustomActions,
  loadAllActionConfigs,
  getHistory,
  clearHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  onHistoryUpdated,
} from "../content/storage";
import { loadSettings, saveSettings, removeSettingKeys } from "@/lib/settings-store";
import { getActionLabel } from "@/lib/shortcuts";

/** Stand-in for the extension's manifest version lookup in the standalone app. */
export const TEMPLATE_VERSION = "0.1.2";

export type TabId =
  | "dashboard"
  | "api"
  | "shortcut"
  | "history"
  | "actions"
  | "customizations";

export const TAB_PATHS: Record<TabId, string> = {
  dashboard: "/",
  api: "/api",
  shortcut: "/shortcut",
  customizations: "/customizations",
  history: "/history",
  actions: "/actions",
};

export const PATH_TO_TAB: Record<string, TabId> = Object.fromEntries(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as TabId]),
);

export interface HistoryItem {
  id: string;
  timestamp: number;
  url: string;
  action: string;
  originalText: string;
  rewrittenText: string;
  provider: string;
  model: string;
}

interface SaveStatus {
  message: string;
  type: "success" | "error";
}

function useOptionsStateValue() {
  const router = useRouter();
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [actionConfigs, setActionConfigs] = useState<CustomAction[]>([]);
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  const [isNewAction, setIsNewAction] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // Provider & settings state
  const [activeProvider, setActiveProvider] = useState("openrouter");
  const [openaiCompatibleKey, setOpenaiCompatibleKey] = useState("");
  const [openaiCompatibleModel, setOpenaiCompatibleModel] = useState("gpt-5-mini");
  const [openaiCompatibleBaseUrl, setOpenaiCompatibleBaseUrl] = useState("");
  const [anthropicShapeKey, setAnthropicShapeKey] = useState("");
  const [anthropicShapeModel, setAnthropicShapeModel] = useState(
    "claude-sonnet-4-6",
  );
  const [anthropicShapeBaseUrl, setAnthropicShapeBaseUrl] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("");
  const [googleAiStudioKey, setGoogleAiStudioKey] = useState("");
  const [googleAiStudioModel, setGoogleAiStudioModel] =
    useState("gemma-4-31b-it");
  const [groqKey, setGroqKey] = useState("");
  const [groqModel, setGroqModel] = useState("groq/compound-mini");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("deepseek-chat");

  // Shortcut states
  const [shortcutKey, setShortcutKey] = useState("");
  const [shortcutCtrl, setShortcutCtrl] = useState(false);
  const [shortcutAlt, setShortcutAlt] = useState(false);
  const [shortcutShift, setShortcutShift] = useState(false);
  const [shortcutMeta, setShortcutMeta] = useState(false);
  const [shortcutAction, setShortcutAction] = useState("fix_spelling");
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [dropdownShortcutKey, setDropdownShortcutKey] = useState("d");
  const [dropdownShortcutCtrl, setDropdownShortcutCtrl] = useState(false);
  const [dropdownShortcutAlt, setDropdownShortcutAlt] = useState(true);
  const [dropdownShortcutShift, setDropdownShortcutShift] = useState(true);
  const [dropdownShortcutMeta, setDropdownShortcutMeta] = useState(false);
  const [isRecordingDropdownKey, setIsRecordingDropdownKey] = useState(false);

  // Appearance settings state
  const [hideDot, setHideDot] = useState(false);
  const [previewInCard, setPreviewInCard] = useState(true);
  const [enableProviderFallback, setEnableProviderFallback] = useState(true);
  const [autoSpellcheckMode, setAutoSpellcheckMode] =
    useState<AutoSpellcheckMode>("browser_only");
  const [autoSpellcheckWordThreshold, setAutoSpellcheckWordThreshold] =
    useState(20);

  // History limit
  const [historyLimit, setHistoryLimit] = useState(1000);

  // History & Toast status states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History tab: search, selection, dialog
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<HistoryItem | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
          item.originalText?.toLowerCase().includes(q) ||
          item.rewrittenText?.toLowerCase().includes(q) ||
          item.url?.toLowerCase().includes(q) ||
          item.action?.toLowerCase().includes(q) ||
          item.provider?.toLowerCase().includes(q) ||
          item.model?.toLowerCase().includes(q)
        );
      }),
    [history, historySearch],
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<HistoryItem | null>(
    null,
  );
  const contentRef = useRef<HTMLDivElement>(null);

  const initialLoadComplete = useRef(false);

  // Fetch initial settings from the local settings store
  useEffect(() => {
    loadSettings([
      "activeProvider",
      "openaiCompatibleKey",
      "openaiCompatibleModel",
      "openaiCompatibleBaseUrl",
      "anthropicShapeKey",
      "anthropicShapeModel",
      "anthropicShapeBaseUrl",
      "openrouterKey",
      "openrouterModel",
      "googleAiStudioKey",
      "googleAiStudioModel",
      "groqKey",
      "groqModel",
      "deepseekKey",
      "deepseekModel",
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
      "enableProviderFallback",
      "autoSpellcheckMode",
      "autoSpellcheckWordThreshold",
      "historyLimit",
      "history",
    ])
      .then((res: Record<string, unknown>) => {
        const r = res as Record<string, string | undefined>;
        if (r.activeProvider) setActiveProvider(r.activeProvider);

        if (r.openaiCompatibleKey) setOpenaiCompatibleKey(r.openaiCompatibleKey);
        if (r.openaiCompatibleModel) setOpenaiCompatibleModel(r.openaiCompatibleModel);
        if (r.openaiCompatibleBaseUrl) setOpenaiCompatibleBaseUrl(r.openaiCompatibleBaseUrl);

        if (r.anthropicShapeKey) setAnthropicShapeKey(r.anthropicShapeKey);
        if (r.anthropicShapeModel) setAnthropicShapeModel(r.anthropicShapeModel);
        if (r.anthropicShapeBaseUrl) setAnthropicShapeBaseUrl(r.anthropicShapeBaseUrl);

        if (r.openrouterKey) setOpenrouterKey(r.openrouterKey);
        if (r.openrouterModel) setOpenrouterModel(r.openrouterModel);

        if (r.googleAiStudioKey) setGoogleAiStudioKey(r.googleAiStudioKey);
        if (r.googleAiStudioModel)
          setGoogleAiStudioModel(r.googleAiStudioModel);

        if (r.groqKey) setGroqKey(r.groqKey);
        if (r.groqModel) setGroqModel(r.groqModel);

        if (r.deepseekKey) setDeepseekKey(r.deepseekKey);
        if (r.deepseekModel) setDeepseekModel(r.deepseekModel);

        if (r.shortcutKey) setShortcutKey(r.shortcutKey);
        setShortcutCtrl(!!res.shortcutCtrl);
        setShortcutAlt(!!res.shortcutAlt);
        setShortcutShift(!!res.shortcutShift);
        setShortcutMeta(!!res.shortcutMeta);
        if (r.shortcutAction) setShortcutAction(r.shortcutAction);

        if (r.dropdownShortcutKey !== undefined)
          setDropdownShortcutKey(r.dropdownShortcutKey);
        setDropdownShortcutCtrl(!!res.dropdownShortcutCtrl);
        setDropdownShortcutAlt(
          res.dropdownShortcutAlt !== undefined
            ? !!res.dropdownShortcutAlt
            : true,
        );
        setDropdownShortcutShift(
          res.dropdownShortcutShift !== undefined
            ? !!res.dropdownShortcutShift
            : true,
        );
        setDropdownShortcutMeta(!!res.dropdownShortcutMeta);

        setHideDot(!!res.hideDot);
        setPreviewInCard(res.previewInCard !== undefined ? !!res.previewInCard : true);
        setEnableProviderFallback(res.enableProviderFallback !== false);
        setAutoSpellcheckMode(
          res.autoSpellcheckMode === "disabled" ||
          res.autoSpellcheckMode === "browser_only" ||
          res.autoSpellcheckMode === "always"
            ? (res.autoSpellcheckMode as AutoSpellcheckMode)
            : "browser_only",
        );
        setAutoSpellcheckWordThreshold(
          typeof res.autoSpellcheckWordThreshold === "number"
            ? Math.min(50, Math.max(10, Math.round(res.autoSpellcheckWordThreshold)))
            : 20,
        );

        setHistoryLimit(
          typeof res.historyLimit === "number"
            ? Math.min(2000, Math.max(200, Math.round(res.historyLimit)))
            : 1000,
        );

        getHistory().then(async (existingDBHistory) => {
          let finalHistory = existingDBHistory;
          if (res.history && Array.isArray(res.history) && res.history.length > 0) {
            for (const item of res.history) {
              if (!existingDBHistory.some(existing => existing.id === item.id)) {
                await addHistoryEntry(item);
              }
            }
            finalHistory = await getHistory();
            await removeSettingKeys(['history']);
          }
          const sorted = [...finalHistory].sort((a, b) => b.timestamp - a.timestamp);
          setHistory(sorted as HistoryItem[]);
        }).catch((err) => console.error("Failed to load history from IndexedDB:", err));
      });
    loadCustomActions().then(setCustomActions);
    loadAllActionConfigs().then(setActionConfigs);
      initialLoadComplete.current = true;
  }, []);

  // Realtime history updates — listen for local history events + visibility change
  const refreshHistory = useCallback(async () => {
    try {
      const fresh = await getHistory();
      const sorted = [...fresh].sort((a, b) => b.timestamp - a.timestamp);
      setHistory(sorted as HistoryItem[]);
    } catch (err) {
      console.error("Failed to refresh history:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onHistoryUpdated(() => {
      void refreshHistory();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshHistory();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshHistory]);

  // Auto-save provider settings on change
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    saveSettings({
      activeProvider,
      openaiCompatibleKey,
      openaiCompatibleModel,
      openaiCompatibleBaseUrl,
      anthropicShapeKey,
      anthropicShapeModel,
      anthropicShapeBaseUrl,
      openrouterKey,
      openrouterModel,
      googleAiStudioKey,
      googleAiStudioModel,
      groqKey,
      groqModel,
      deepseekKey,
      deepseekModel,
    }).catch(console.error);
  }, [
    activeProvider,
    openaiCompatibleKey,
    openaiCompatibleModel,
    openaiCompatibleBaseUrl,
    anthropicShapeKey,
    anthropicShapeModel,
    anthropicShapeBaseUrl,
    openrouterKey,
    openrouterModel,
    googleAiStudioKey,
    googleAiStudioModel,
    groqKey,
    groqModel,
    deepseekKey,
    deepseekModel,
  ]);

  // Auto-save shortcut & appearance settings on change
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    saveSettings({
      shortcutKey,
      shortcutCtrl,
      shortcutAlt,
      shortcutShift,
      shortcutMeta,
      shortcutAction,
      dropdownShortcutKey,
      dropdownShortcutCtrl,
      dropdownShortcutAlt,
      dropdownShortcutShift,
      dropdownShortcutMeta,
      hideDot,
      previewInCard,
      enableProviderFallback,
      autoSpellcheckMode,
      autoSpellcheckWordThreshold,
      historyLimit,
    }).catch(console.error);
  }, [
    shortcutKey,
    shortcutCtrl,
    shortcutAlt,
    shortcutShift,
    shortcutMeta,
    shortcutAction,
    dropdownShortcutKey,
    dropdownShortcutCtrl,
    dropdownShortcutAlt,
    dropdownShortcutShift,
    dropdownShortcutMeta,
    hideDot,
    previewInCard,
    enableProviderFallback,
    autoSpellcheckMode,
    autoSpellcheckWordThreshold,
    historyLimit,
  ]);

  // Show status toasts
  const triggerSaveStatus = useCallback((message: string, type: "success" | "error") => {
    setSaveStatus({ message, type });
    setTimeout(() => {
      setSaveStatus(null);
      setLastDeletedItem(null);
    }, 3000);
  }, []);

  // Handle shortcut recording keypresses
  useEffect(() => {
    if (!isRecordingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      const key = e.key;
      if (key === "Escape") {
        setIsRecordingKey(false);
        return;
      }

      // Filter out pure modifier presses
      if (["Control", "Alt", "Shift", "Meta"].includes(key)) {
        setShortcutCtrl(e.ctrlKey);
        setShortcutAlt(e.altKey);
        setShortcutShift(e.shiftKey);
        setShortcutMeta(e.metaKey);
        return;
      }

      setShortcutCtrl(e.ctrlKey);
      setShortcutAlt(e.altKey);
      setShortcutShift(e.shiftKey);
      setShortcutMeta(e.metaKey);
      setShortcutKey(key);
      setIsRecordingKey(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecordingKey]);

  // Handle dropdown shortcut recording keypresses
  useEffect(() => {
    if (!isRecordingDropdownKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      const key = e.key;
      if (key === "Escape") {
        setIsRecordingDropdownKey(false);
        return;
      }

      // Filter out pure modifier presses
      if (["Control", "Alt", "Shift", "Meta"].includes(key)) {
        setDropdownShortcutCtrl(e.ctrlKey);
        setDropdownShortcutAlt(e.altKey);
        setDropdownShortcutShift(e.shiftKey);
        setDropdownShortcutMeta(e.metaKey);
        return;
      }

      setDropdownShortcutCtrl(e.ctrlKey);
      setDropdownShortcutAlt(e.altKey);
      setDropdownShortcutShift(e.shiftKey);
      setDropdownShortcutMeta(e.metaKey);
      setDropdownShortcutKey(key);
      setIsRecordingDropdownKey(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecordingDropdownKey]);

  // History action copy helper
  const handleCopyHistory = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Clear single history entry
  const handleDeleteHistory = useCallback(async (id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    const updatedHistory = history.filter((h) => h.id !== id);
    setHistory(updatedHistory);
    await deleteHistoryEntry(id);
    setLastDeletedItem(item);
    triggerSaveStatus("History item deleted.", "success");
  }, [history, triggerSaveStatus]);

  const handleUndoDelete = useCallback(async () => {
    if (!lastDeletedItem) return;
    const updatedHistory = [...history, lastDeletedItem].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    setHistory(updatedHistory);
    await addHistoryEntry(lastDeletedItem);
    setLastDeletedItem(null);
    setSaveStatus(null);
    triggerSaveStatus("Delete undone.", "success");
  }, [history, lastDeletedItem, triggerSaveStatus]);

  // Clear all history logs
  const handleClearAllHistory = useCallback(async () => {
    setHistory([]);
    await clearHistory();
    setClearAllDialogOpen(false);
    triggerSaveStatus("All history cleared.", "success");
  }, [triggerSaveStatus]);

  const getActionName = useCallback(
    (actionCode: string) => getActionLabel(actionCode, customActions),
    [customActions],
  );

  const setActiveTab = useCallback(
    (tab: TabId) => {
      router.push(TAB_PATHS[tab]);
    },
    [router],
  );

  return {
    activeProvider, setActiveProvider,
    openaiCompatibleKey, setOpenaiCompatibleKey,
    openaiCompatibleModel, setOpenaiCompatibleModel,
    openaiCompatibleBaseUrl, setOpenaiCompatibleBaseUrl,
    anthropicShapeKey, setAnthropicShapeKey,
    anthropicShapeModel, setAnthropicShapeModel,
    anthropicShapeBaseUrl, setAnthropicShapeBaseUrl,
    openrouterKey, setOpenrouterKey,
    openrouterModel, setOpenrouterModel,
    googleAiStudioKey, setGoogleAiStudioKey,
    googleAiStudioModel, setGoogleAiStudioModel,
    groqKey, setGroqKey,
    groqModel, setGroqModel,
    deepseekKey, setDeepseekKey,
    deepseekModel, setDeepseekModel,
    shortcutKey, setShortcutKey,
    shortcutCtrl, setShortcutCtrl,
    shortcutAlt, setShortcutAlt,
    shortcutShift, setShortcutShift,
    shortcutMeta, setShortcutMeta,
    shortcutAction, setShortcutAction,
    isRecordingKey, setIsRecordingKey,
    dropdownShortcutKey, setDropdownShortcutKey,
    dropdownShortcutCtrl, setDropdownShortcutCtrl,
    dropdownShortcutAlt, setDropdownShortcutAlt,
    dropdownShortcutShift, setDropdownShortcutShift,
    dropdownShortcutMeta, setDropdownShortcutMeta,
    isRecordingDropdownKey, setIsRecordingDropdownKey,
    hideDot, setHideDot,
    previewInCard, setPreviewInCard,
    enableProviderFallback, setEnableProviderFallback,
    autoSpellcheckMode, setAutoSpellcheckMode,
    autoSpellcheckWordThreshold, setAutoSpellcheckWordThreshold,
    historyLimit, setHistoryLimit,
    history, copiedId,
    historySearch, setHistorySearch,
    selectedHistoryItem, setSelectedHistoryItem,
    historyDialogOpen, setHistoryDialogOpen,
    clearAllDialogOpen, setClearAllDialogOpen,
    filteredHistory,
    saveStatus,
    lastDeletedItem,
    contentRef,
    customActions, actionConfigs, setActionConfigs,
    editingAction, setEditingAction,
    isNewAction, setIsNewAction,
    testInput, setTestInput,
    testResult, setTestResult,
    testLoading, setTestLoading,
    triggerSaveStatus,
    refreshHistory,
    handleCopyHistory,
    handleDeleteHistory,
    handleUndoDelete,
    handleClearAllHistory,
    getActionName,
    setActiveTab,
  };
}

type OptionsState = ReturnType<typeof useOptionsStateValue>;

const OptionsStateContext = createContext<OptionsState | null>(null);

export function OptionsStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useOptionsStateValue();
  return (
    <OptionsStateContext.Provider value={value}>
      {children}
    </OptionsStateContext.Provider>
  );
}

export function useOptionsState(): OptionsState {
  const ctx = useContext(OptionsStateContext);
  if (!ctx) {
    throw new Error("useOptionsState must be used within OptionsStateProvider");
  }
  return ctx;
}
