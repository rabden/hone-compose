import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Key,
  Keyboard,
  History,
  Check,
  AlertCircle,
  Wand2,
  PanelLeftIcon,
  Palette,
  LayoutDashboard,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Ripple } from "@/components/ui/ripple";
import { Button } from "@/components/ui/material-design-3-button";

import type { CustomAction } from "../content/storage";
import type { AutoSpellcheckMode } from "../content/storage";
import {
  loadCustomActions,
  loadAllActionConfigs,
  getHistory,
  clearHistory,
  addHistoryEntry,
  deleteHistoryEntry,
} from "../content/storage";
import { getActionLabel } from "@/lib/shortcuts";
import { HoneLogo } from "@/components/hone-logo";
import DashboardTab from "./tabs/DashboardTab";
import CustomizationsTab from "./tabs/CustomizationsTab";
import ApiProvidersTab from "./tabs/ApiProvidersTab";
import KeyBindingsTab from "./tabs/KeyBindingsTab";
import HistoryTab from "./tabs/HistoryTab";
import ActionsStudioTab from "./tabs/ActionsStudioTab";

interface HistoryItem {
  id: string;
  timestamp: number;
  url: string;
  action: string;
  originalText: string;
  rewrittenText: string;
  provider: string;
  model: string;
}

function SidebarWhitespaceTrigger() {
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (!isCollapsed) {
    return <div className="flex-1 min-h-0" />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 w-full bg-transparent border-none cursor-e-resize outline-none"
          aria-label="Expand Sidebar"
        />
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Expand
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarToggleInHeader() {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      shape="square"
      onClick={toggleSidebar}
      title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      className="text-muted-foreground"
    >
      <PanelLeftIcon
        className={cn(
          "size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isCollapsed && "rotate-180",
        )}
      />
    </Button>
  );
}

export default function Options() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "api" | "shortcut" | "history" | "actions" | "customizations"
  >("dashboard");
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [actionConfigs, setActionConfigs] = useState<CustomAction[]>([]);
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  const [isNewAction, setIsNewAction] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // Provider & settings state
  const [activeProvider, setActiveProvider] = useState("openai");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-5-mini");
  const [openaiEndpoint, setOpenaiEndpoint] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState(
    "claude-sonnet-4-6",
  );
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("");
  const [openrouterPaidKey, setOpenrouterPaidKey] = useState("");
  const [openrouterPaidModel, setOpenrouterPaidModel] = useState("");
  const [googleAiStudioKey, setGoogleAiStudioKey] = useState("");
  const [googleAiStudioModel, setGoogleAiStudioModel] =
    useState("gemma-3-27b-it");
  const [groqKey, setGroqKey] = useState("");
  const [groqModel, setGroqModel] = useState("groq/compound-mini");

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
  const [autoSpellcheckMode, setAutoSpellcheckMode] =
    useState<AutoSpellcheckMode>("browser_only");
  const [autoSpellcheckWordThreshold, setAutoSpellcheckWordThreshold] =
    useState(20);

  // History limit
  const [historyLimit, setHistoryLimit] = useState(1000);

  // History & Toast status states

  // History & Toast status states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History tab: search, selection, dialog, virtualization
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<HistoryItem | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

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

  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<HistoryItem | null>(
    null,
  );
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activeTab]);
  const initialLoadComplete = useRef(false);

  // Fetch initial settings from local storage
  useEffect(() => {
    chrome.storage.local
      .get([
        "activeProvider",
        "openaiKey",
        "openaiModel",
        "openaiEndpoint",
        "anthropicKey",
        "anthropicModel",
        "geminiKey",
        "geminiModel",
        "openrouterKey",
        "openrouterModel",
        "openrouterPaidKey",
        "openrouterPaidModel",
        "googleAiStudioKey",
        "googleAiStudioModel",
        "groqKey",
        "groqModel",
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
        "historyLimit",
        "history",
      ])
      .then((res: Record<string, unknown>) => {
        const r = res as Record<string, string | undefined>;
        if (r.activeProvider) setActiveProvider(r.activeProvider);

        if (r.openaiKey) setOpenaiKey(r.openaiKey);
        if (r.openaiModel) setOpenaiModel(r.openaiModel);
        if (r.openaiEndpoint) setOpenaiEndpoint(r.openaiEndpoint);

        if (r.anthropicKey) setAnthropicKey(r.anthropicKey);
        if (r.anthropicModel) setAnthropicModel(r.anthropicModel);

        if (r.geminiKey) setGeminiKey(r.geminiKey);
        if (r.geminiModel) setGeminiModel(r.geminiModel);

        if (r.openrouterKey) setOpenrouterKey(r.openrouterKey);
        if (r.openrouterModel) setOpenrouterModel(r.openrouterModel);

        if (r.openrouterPaidKey) setOpenrouterPaidKey(r.openrouterPaidKey);
        if (r.openrouterPaidModel)
          setOpenrouterPaidModel(r.openrouterPaidModel);

        if (r.googleAiStudioKey) setGoogleAiStudioKey(r.googleAiStudioKey);
        if (r.googleAiStudioModel)
          setGoogleAiStudioModel(r.googleAiStudioModel);

        if (r.groqKey) setGroqKey(r.groqKey);
        if (r.groqModel) setGroqModel(r.groqModel);

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
            await chrome.storage.local.remove('history');
          }
          const sorted = [...finalHistory].sort((a, b) => b.timestamp - a.timestamp);
          setHistory(sorted as HistoryItem[]);
        }).catch((err) => console.error("Failed to load history from IndexedDB:", err));
      });
    loadCustomActions().then(setCustomActions);
    loadAllActionConfigs().then(setActionConfigs);
      initialLoadComplete.current = true;
  }, []);

  // Realtime history updates — listen for messages from service worker + visibility change
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
    const handler = (msg: { type?: string }) => {
      if (msg.type === "HISTORY_UPDATED") refreshHistory();
    };
    chrome.runtime.onMessage.addListener(handler);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshHistory();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      chrome.runtime.onMessage.removeListener(handler);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshHistory]);

  // Auto-save provider settings on change
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    chrome.storage.local
      .set({
        activeProvider,
        openaiKey,
        openaiModel,
        openaiEndpoint,
        anthropicKey,
        anthropicModel,
        geminiKey,
        geminiModel,
        openrouterKey,
        openrouterModel,
        openrouterPaidKey,
        openrouterPaidModel,
        googleAiStudioKey,
        googleAiStudioModel,
        groqKey,
        groqModel,
      })
      .catch(console.error);
  }, [
    activeProvider,
    openaiKey,
    openaiModel,
    openaiEndpoint,
    anthropicKey,
    anthropicModel,
    geminiKey,
    geminiModel,
    openrouterKey,
    openrouterModel,
    openrouterPaidKey,
    openrouterPaidModel,
    googleAiStudioKey,
    googleAiStudioModel,
    groqKey,
    groqModel,
  ]);

  // Auto-save shortcut & appearance settings on change
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    chrome.storage.local
      .set({
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
        autoSpellcheckMode,
        autoSpellcheckWordThreshold,
        historyLimit,
      })
      .catch(console.error);
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
    autoSpellcheckMode,
    autoSpellcheckWordThreshold,
    historyLimit,
  ]);

  // Show status toasts
  const triggerSaveStatus = (message: string, type: "success" | "error") => {
    setSaveStatus({ message, type });
    setTimeout(() => {
      setSaveStatus(null);
      setLastDeletedItem(null);
    }, 3000);
  };

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
  const handleCopyHistory = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Clear single history entry
  const handleDeleteHistory = async (id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    const updatedHistory = history.filter((h) => h.id !== id);
    setHistory(updatedHistory);
    await deleteHistoryEntry(id);
    setLastDeletedItem(item);
    triggerSaveStatus("History item deleted.", "success");
  };

  const handleUndoDelete = async () => {
    if (!lastDeletedItem) return;
    const updatedHistory = [...history, lastDeletedItem].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    setHistory(updatedHistory);
    await addHistoryEntry(lastDeletedItem);
    setLastDeletedItem(null);
    setSaveStatus(null);
    triggerSaveStatus("Delete undone.", "success");
  };

  // Clear all history logs
  const handleClearAllHistory = async () => {
    setHistory([]);
    await clearHistory();
    setClearAllDialogOpen(false);
    triggerSaveStatus("All history cleared.", "success");
  };

  const getActionName = (actionCode: string) =>
    getActionLabel(actionCode, customActions);

  const NAV_ITEMS = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "api", label: "API Providers", icon: Key },
    { value: "shortcut", label: "Key Bindings", icon: Keyboard },
    { value: "customizations", label: "Customizations", icon: Palette },
    { value: "history", label: "Rewrite History", icon: History },
    { value: "actions", label: "Actions Studio", icon: Wand2 },
  ] as const;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-col w-full h-[100dvh] overflow-hidden bg-background">
        {/* Full-width Header */}
        <header className="flex items-center h-12 px-4 bg-background shrink-0 relative select-none">
          <div className="absolute left-2">
            <SidebarToggleInHeader />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <HoneLogo size={20} alt="" />
              <span className="font-semibold text-sm tracking-wide text-foreground">
                Hone compose
              </span>
            </div>
          </div>
          <div className="w-8" />
        </header>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 min-h-0 min-w-0">
          {/* Sidebar */}
          <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="hidden md:flex bg-background !top-12 !h-[calc(100dvh-3rem)] !border-r-0"
          >
            <TooltipProvider>
              <SidebarContent>
                <SidebarGroup className="p-2">
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {NAV_ITEMS.map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <SidebarMenuItem key={item.value}>
                            <div
                              className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[150%] w-0.5 bg-foreground rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                activeTab === item.value
                                  ? "h-5 opacity-100 scale-y-100"
                                  : "h-5 opacity-0 scale-y-0",
                                "group-data-[collapsible=icon]:hidden",
                              )}
                            />
                            <SidebarMenuButton
                              isActive={activeTab === item.value}
                              onClick={() => setActiveTab(item.value)}
                              tooltip={item.label}
                              className="relative data-[active=true]:bg-muted/60 data-[active=true]:text-foreground data-[active=true]:font-semibold hover:bg-muted/30 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 fill-mode-backwards select-none"
                              style={{ animationDelay: `${index * 40}ms` }}
                            >
                              <Ripple />
                              <Icon
                                className={cn(
                                  "size-4 shrink-0 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 pointer-events-none",
                                  activeTab === item.value
                                    ? "text-foreground"
                                    : "text-muted-foreground/50",
                                )}
                              />
                              <span className="text-sm group-data-[collapsible=icon]:hidden relative z-10 pointer-events-none">
                                {item.label}
                              </span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                <SidebarWhitespaceTrigger />
              </SidebarContent>
              <SidebarFooter className="pb-2 pl-3">
                <div className="text-[10px] text-muted-foreground/60 select-none whitespace-nowrap flex items-center gap-1.5">
                  <span className="group-data-[collapsible=icon]:hidden">
                    Hone compose
                  </span>
                  <span className="opacity-50 group-data-[collapsible=icon]:hidden">
                    /
                  </span>
                  <span>v{chrome.runtime.getManifest().version}</span>
                </div>
              </SidebarFooter>
            </TooltipProvider>
          </Sidebar>

          {/* Main content area */}
          <main className="flex-1 min-h-0 min-w-0 flex flex-col">
            <div className="flex-1 mb-2 mr-2 rounded-lg bg-card flex flex-col min-h-0 min-w-0 relative">
              <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto p-6 overflow-x-hidden min-w-0">
                {activeTab === "dashboard" && (
                  <DashboardTab
                    setActiveTab={setActiveTab}
                    activeProvider={activeProvider}
                    openrouterKey={openrouterKey}
                    openrouterPaidKey={openrouterPaidKey}
                    openaiKey={openaiKey}
                    anthropicKey={anthropicKey}
                    googleAiStudioKey={googleAiStudioKey}
                    groqKey={groqKey}
                    openaiModel={openaiModel}
                    anthropicModel={anthropicModel}
                    openrouterModel={openrouterModel}
                    openrouterPaidModel={openrouterPaidModel}
                    googleAiStudioModel={googleAiStudioModel}
                    groqModel={groqModel}
                    dropdownShortcutKey={dropdownShortcutKey}
                    dropdownShortcutCtrl={dropdownShortcutCtrl}
                    dropdownShortcutAlt={dropdownShortcutAlt}
                    dropdownShortcutShift={dropdownShortcutShift}
                    dropdownShortcutMeta={dropdownShortcutMeta}
                    hideDot={hideDot}
                    history={history}
                    customActions={customActions}
                  />
                )}

                {activeTab === "api" && (
                  <ApiProvidersTab
                    activeProvider={activeProvider}
                    setActiveProvider={setActiveProvider}
                    openaiKey={openaiKey}
                    setOpenaiKey={setOpenaiKey}
                    openaiModel={openaiModel}
                    setOpenaiModel={setOpenaiModel}
                    openaiEndpoint={openaiEndpoint}
                    setOpenaiEndpoint={setOpenaiEndpoint}
                    anthropicKey={anthropicKey}
                    setAnthropicKey={setAnthropicKey}
                    anthropicModel={anthropicModel}
                    setAnthropicModel={setAnthropicModel}
                    openrouterKey={openrouterKey}
                    setOpenrouterKey={setOpenrouterKey}
                    openrouterModel={openrouterModel}
                    setOpenrouterModel={setOpenrouterModel}
                    openrouterPaidKey={openrouterPaidKey}
                    setOpenrouterPaidKey={setOpenrouterPaidKey}
                    openrouterPaidModel={openrouterPaidModel}
                    setOpenrouterPaidModel={setOpenrouterPaidModel}
                    googleAiStudioKey={googleAiStudioKey}
                    setGoogleAiStudioKey={setGoogleAiStudioKey}
                    googleAiStudioModel={googleAiStudioModel}
                    setGoogleAiStudioModel={setGoogleAiStudioModel}
                    groqKey={groqKey}
                    setGroqKey={setGroqKey}
                    groqModel={groqModel}
                    setGroqModel={setGroqModel}
                  />
                )}

                {activeTab === "shortcut" && (
                  <KeyBindingsTab
                    shortcutKey={shortcutKey}
                    setShortcutKey={setShortcutKey}
                    shortcutCtrl={shortcutCtrl}
                    setShortcutCtrl={setShortcutCtrl}
                    shortcutAlt={shortcutAlt}
                    setShortcutAlt={setShortcutAlt}
                    shortcutShift={shortcutShift}
                    setShortcutShift={setShortcutShift}
                    shortcutMeta={shortcutMeta}
                    setShortcutMeta={setShortcutMeta}
                    shortcutAction={shortcutAction}
                    setShortcutAction={setShortcutAction}
                    isRecordingKey={isRecordingKey}
                    setIsRecordingKey={setIsRecordingKey}
                    dropdownShortcutKey={dropdownShortcutKey}
                    setDropdownShortcutKey={setDropdownShortcutKey}
                    dropdownShortcutCtrl={dropdownShortcutCtrl}
                    setDropdownShortcutCtrl={setDropdownShortcutCtrl}
                    dropdownShortcutAlt={dropdownShortcutAlt}
                    setDropdownShortcutAlt={setDropdownShortcutAlt}
                    dropdownShortcutShift={dropdownShortcutShift}
                    setDropdownShortcutShift={setDropdownShortcutShift}
                    dropdownShortcutMeta={dropdownShortcutMeta}
                    setDropdownShortcutMeta={setDropdownShortcutMeta}
                    isRecordingDropdownKey={isRecordingDropdownKey}
                    setIsRecordingDropdownKey={setIsRecordingDropdownKey}
                    customActions={customActions}
                  />
                )}

                {activeTab === "customizations" && (
                  <CustomizationsTab
                    hideDot={hideDot}
                    setHideDot={setHideDot}
                    previewInCard={previewInCard}
                    setPreviewInCard={setPreviewInCard}
                    autoSpellcheckMode={autoSpellcheckMode}
                    setAutoSpellcheckMode={setAutoSpellcheckMode}
                    autoSpellcheckWordThreshold={autoSpellcheckWordThreshold}
                    setAutoSpellcheckWordThreshold={setAutoSpellcheckWordThreshold}
                    historyLimit={historyLimit}
                    setHistoryLimit={setHistoryLimit}
                  />
                )}

                {activeTab === "history" && (
                  <HistoryTab
                    history={history}
                    historySearch={historySearch}
                    setHistorySearch={setHistorySearch}
                    selectedHistoryItem={selectedHistoryItem}
                    setSelectedHistoryItem={setSelectedHistoryItem}
                    historyDialogOpen={historyDialogOpen}
                    setHistoryDialogOpen={setHistoryDialogOpen}
                    clearAllDialogOpen={clearAllDialogOpen}
                    setClearAllDialogOpen={setClearAllDialogOpen}
                    copiedId={copiedId}
                    contentRef={contentRef}
                    filteredHistory={filteredHistory}
                    getActionName={getActionName}
                    handleCopyHistory={handleCopyHistory}
                    handleDeleteHistory={handleDeleteHistory}
                    handleClearAllHistory={handleClearAllHistory}
                  />
                )}

                {activeTab === "actions" && (
                  <ActionsStudioTab
                    actionConfigs={actionConfigs}
                    setActionConfigs={setActionConfigs}
                    editingAction={editingAction}
                    setEditingAction={setEditingAction}
                    isNewAction={isNewAction}
                    setIsNewAction={setIsNewAction}
                    testInput={testInput}
                    setTestInput={setTestInput}
                    testResult={testResult}
                    setTestResult={setTestResult}
                    testLoading={testLoading}
                    setTestLoading={setTestLoading}
                    triggerSaveStatus={triggerSaveStatus}
                  />
                )}

                {/* Sleek Scoped Global Toast */}
              </div>
              {saveStatus && (
                <div
                  className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4.5 py-3 rounded-lg text-xs shadow-lg border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 z-50 bg-card
            ${
              saveStatus.type === "success"
                ? "border-border text-foreground"
                : "border-red-500/20 text-red-400"
            }`}
                >
                  {saveStatus.type === "success" ? (
                    <Check className="w-4 h-4 text-foreground" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{saveStatus.message}</span>
                  {saveStatus.type === "success" && lastDeletedItem && (
                    <button
                      onClick={handleUndoDelete}
                      className="ml-1 text-[10px] font-semibold text-foreground/50 hover:text-foreground underline underline-offset-2 transition-colors whitespace-nowrap"
                    >
                      Undo
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
