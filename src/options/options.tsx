import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Key,
  Keyboard,
  History,
  Save,
  Trash2,
  Copy,
  Check,
  Info,
  ShieldAlert,
  AlertCircle,
  Plus,
  Wand2,
  Play,
  PanelLeftIcon,
  Search,
  X,
  LayoutDashboard,
  ArrowRight,
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
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch as MaterialDesign3Switch } from "@/components/ui/material-design-3-switch";
import type { CustomAction } from "../content/storage";
import {
  loadCustomActions,
  saveCustomAction,
  deleteCustomAction,
  getHistory,
  clearHistory,
  addHistoryEntry,
  deleteHistoryEntry,
} from "../content/storage";
import { ActionIconSelect } from "@/components/action-icon-select";
import { HoneLogo } from "@/components/hone-logo";
import {
  DEFAULT_ACTION_ICON,
  normalizeActionIconName,
  renderActionIcon,
} from "@/lib/action-icons";
import {
  BUILTIN_SHORTCUT_ACTIONS,
  CUSTOM_ACTION_PLACEHOLDERS,
  getActionLabel,
} from "@/lib/shortcuts";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/material-dialog";

const OPENROUTER_FREE_MODELS = [
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B" },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air" },
  { id: "moonshotai/kimi-k2.6:free", label: "Kimi K2.6" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B" },
  { id: "poolside/laguna-xs.2:free", label: "Laguna XS.2" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron 3 Nano 30B" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super" },
  { id: "poolside/laguna-m.1:free", label: "Laguna M.1" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B V2" },
  { id: "openrouter/owl-alpha:free", label: "Owl Alpha" },
];

const ACTION_PROVIDER_OPTIONS = [
  { value: "__default__", label: "Use global default" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "openrouter", label: "OpenRouter Free" },
  { value: "openrouter_paid", label: "OpenRouter Paid" },
  { value: "google_ai_studio", label: "Google AI Studio" },
] as const;

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
    <button
      onClick={toggleSidebar}
      className="flex items-center justify-center p-1.5 w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer"
      title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
    >
      <PanelLeftIcon
        className={cn(
          "size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isCollapsed && "rotate-180",
        )}
      />
    </button>
  );
}

export default function Options() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "api" | "shortcut" | "history" | "actions"
  >("dashboard");
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  const [isNewAction, setIsNewAction] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // Provider & settings state
  const [activeProvider, setActiveProvider] = useState("openai");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [openaiEndpoint, setOpenaiEndpoint] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState(
    "claude-sonnet-4-20250514",
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

  // History & Toast status states

  // History & Toast status states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History tab: search, selection, dialog, virtualization
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] =
    useState<HistoryItem | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const historyParentRef = useRef<HTMLDivElement>(null);

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

  // eslint-disable-next-line react-hooks/incompatible-library
  const historyVirtualizer = useVirtualizer({
    count: filteredHistory.length,
    getScrollElement: () => historyParentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });
  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [lastDeletedItem, setLastDeletedItem] = useState<HistoryItem | null>(
    null,
  );
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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
    setInitialLoadComplete(true);
  }, []);

  // Auto-save provider settings on change
  useEffect(() => {
    if (!initialLoadComplete) return;
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
      })
      .catch(console.error);
  }, [
    initialLoadComplete,
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
  ]);

  // Auto-save shortcut & appearance settings on change
  useEffect(() => {
    if (!initialLoadComplete) return;
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
      })
      .catch(console.error);
  }, [
    initialLoadComplete,
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

  // Clean format helper for shortcut display
  const getShortcutDisplay = () => {
    const keys = [];
    if (shortcutCtrl) keys.push("Ctrl");
    if (shortcutAlt) keys.push("Alt");
    if (shortcutShift) keys.push("Shift");
    if (shortcutMeta) keys.push("⌘");
    if (shortcutKey) keys.push(shortcutKey.toUpperCase());

    return keys.length > 0 ? keys.join(" + ") : "None configured";
  };

  const getDropdownShortcutDisplay = () => {
    const keys = [];
    if (dropdownShortcutCtrl) keys.push("Ctrl");
    if (dropdownShortcutAlt) keys.push("Alt");
    if (dropdownShortcutShift) keys.push("Shift");
    if (dropdownShortcutMeta) keys.push("⌘");
    if (dropdownShortcutKey) keys.push(dropdownShortcutKey.toUpperCase());

    return keys.length > 0 ? keys.join(" + ") : "None configured";
  };

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

  const isKnownShortcutAction = (id: string) =>
    BUILTIN_SHORTCUT_ACTIONS.some((a) => a.id === id) ||
    customActions.some((a) => a.id === id);

  const NAV_ITEMS = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "api", label: "API Providers", icon: Key },
    { value: "shortcut", label: "Key Bindings", icon: Keyboard },
    { value: "history", label: "Rewrite History", icon: History },
    { value: "actions", label: "Actions Studio", icon: Wand2 },
  ] as const;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-col w-full h-[100dvh] overflow-hidden bg-background">
        {/* Full-width Header */}
        <header className="flex items-center h-12 px-4 bg-background shrink-0 relative z-20">
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
            className="hidden md:flex bg-background border-border/15 !top-12 !h-[calc(100dvh-3rem)]"
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
                              className="relative data-[active=true]:bg-muted/60 data-[active=true]:text-foreground data-[active=true]:font-semibold hover:bg-muted/30 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 fill-mode-backwards"
                              style={{ animationDelay: `${index * 40}ms` }}
                            >
                              <Icon
                                className={cn(
                                  "size-4 shrink-0 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                  activeTab === item.value
                                    ? "text-foreground"
                                    : "text-muted-foreground/50",
                                )}
                              />
                              <span className="text-sm group-data-[collapsible=icon]:hidden">
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
              <div className="flex-1 min-h-0 overflow-y-auto p-6 overflow-x-hidden min-w-0">
                {/* TAB 0: Dashboard */}
                {activeTab === "dashboard" && (
                  <div className="flex flex-col gap-12 animate-in fade-in duration-500 w-full min-w-0 py-4">
                    {/* Attention: Editorial Hero Section */}
                    <div className="flex flex-col gap-4">
                      <div className="space-y-3">
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          System Status
                        </span>
                        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                          Your Hone Control Panel
                        </h1>
                        <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                          Everything is configured and ready. Below is a
                          snapshot of your transformation engine's current
                          state.
                        </p>
                      </div>
                    </div>

                    {/* Interest: Status Indicators (Minimal Pills) */}
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const hasKey =
                          (activeProvider === "openrouter" &&
                            openrouterKey.trim()) ||
                          (activeProvider === "openrouter_paid" &&
                            openrouterPaidKey.trim()) ||
                          (activeProvider === "openai" && openaiKey.trim()) ||
                          (activeProvider === "anthropic" &&
                            anthropicKey.trim()) ||
                          (activeProvider === "gemini" && geminiKey.trim()) ||
                          (activeProvider === "google_ai_studio" &&
                            googleAiStudioKey.trim());
                        return (
                          <button
                            onClick={() => setActiveTab("api")}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[10px] font-medium transition-all duration-200 cursor-pointer outline-none border",
                              hasKey
                                ? "border-border/60 bg-secondary/60 text-foreground hover:bg-secondary/80"
                                : "border-amber-200/50 bg-amber-50/70 text-amber-900 hover:bg-amber-50/90 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-200",
                            )}
                          >
                            {hasKey ? (
                              <Check className="size-3.5 stroke-[2]" />
                            ) : (
                              <AlertCircle className="size-3.5" />
                            )}
                            {hasKey ? "API Configured" : "Setup Required"}
                          </button>
                        );
                      })()}

                      <button
                        onClick={() => setActiveTab("shortcut")}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[10px] font-medium transition-all duration-200 cursor-pointer outline-none border",
                          dropdownShortcutKey
                            ? "border-border/60 bg-secondary/60 text-foreground hover:bg-secondary/80"
                            : "border-amber-200/50 bg-amber-50/70 text-amber-900 hover:bg-amber-50/90 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-200",
                        )}
                      >
                        {dropdownShortcutKey ? (
                          <Check className="size-3.5 stroke-[2]" />
                        ) : (
                          <AlertCircle className="size-3.5" />
                        )}
                        {dropdownShortcutKey
                          ? `${getDropdownShortcutDisplay()}`
                          : "No Shortcut"}
                      </button>

                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[10px] font-medium border border-border/60 bg-secondary/60 text-foreground">
                        <Info className="size-3.5" />
                        {hideDot ? "Dot: Hidden" : "Dot: Visible"}
                      </span>
                    </div>

                    {/* Desire: Asymmetric Bento Card Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 auto-rows-fr">
                      {/* Engine Card - Tall */}
                      <button
                        onClick={() => setActiveTab("api")}
                        className="group md:col-span-1 md:row-span-2 relative flex flex-col justify-between p-6 rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 transition-all duration-300 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-4 flex flex-col flex-1">
                          <div className="p-3 rounded-lg bg-foreground/6 w-fit group-hover:bg-foreground/10 transition-colors duration-300">
                            <Key className="size-5 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
                          </div>
                          <div className="space-y-2 flex-1">
                            <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block">
                              Active Engine
                            </span>
                            <span className="text-lg font-light text-foreground leading-tight block">
                              {activeProvider === "openai" && "OpenAI"}
                              {activeProvider === "anthropic" && "Claude"}
                              {activeProvider === "gemini" && "Gemini"}
                              {activeProvider === "openrouter" &&
                                "OpenRouter Free"}
                              {activeProvider === "openrouter_paid" &&
                                "OpenRouter Paid"}
                              {activeProvider === "google_ai_studio" &&
                                "AI Studio"}
                            </span>
                          </div>
                          <div className="space-y-1 pt-3 border-t border-border/30">
                            <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider block">
                              Model
                            </span>
                            <span
                              className="text-[10px] font-mono text-foreground/70 truncate block"
                              title={
                                activeProvider === "openai"
                                  ? openaiModel
                                  : activeProvider === "anthropic"
                                    ? anthropicModel
                                    : activeProvider === "gemini"
                                      ? geminiModel
                                      : activeProvider === "openrouter"
                                        ? openrouterModel || "gemma-4"
                                        : activeProvider === "openrouter_paid"
                                          ? openrouterPaidModel
                                          : googleAiStudioModel
                              }
                            >
                              {activeProvider === "openai"
                                ? openaiModel
                                : activeProvider === "anthropic"
                                  ? anthropicModel
                                  : activeProvider === "gemini"
                                    ? geminiModel
                                    : activeProvider === "openrouter"
                                      ? openrouterModel || "gemma-4"
                                      : activeProvider === "openrouter_paid"
                                        ? openrouterPaidModel
                                        : googleAiStudioModel}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="absolute top-6 right-6 size-4 text-muted-foreground/20 group-hover:text-muted-foreground/40 group-hover:translate-x-1 transition-all duration-300" />
                      </button>

                      {/* Shortcut + Visibility Cards - Stack */}
                      <button
                        onClick={() => setActiveTab("shortcut")}
                        className="group relative flex flex-col justify-between p-6 rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 transition-all duration-300 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-3">
                          <div className="p-2.5 rounded-lg bg-foreground/6 w-fit group-hover:bg-foreground/10 transition-colors duration-300">
                            <Keyboard className="size-4 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                              Trigger Shortcut
                            </span>
                            <span className="text-sm font-mono font-semibold text-foreground block">
                              {getDropdownShortcutDisplay()}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="absolute top-6 right-6 size-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-all duration-300" />
                      </button>

                      <button
                        onClick={() => setActiveTab("shortcut")}
                        className="group relative flex items-start justify-between p-6 rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 transition-all duration-300 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-3">
                          <div className="p-2.5 rounded-lg bg-foreground/6 w-fit group-hover:bg-foreground/10 transition-colors duration-300">
                            <PanelLeftIcon className="size-4 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                              Visual Indicator
                            </span>
                            <span className="text-sm font-light text-foreground">
                              {hideDot ? "Hidden" : "Visible"}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="absolute top-6 right-6 size-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-all duration-300" />
                      </button>

                      {/* Rewrites Card */}
                      <button
                        onClick={() => setActiveTab("history")}
                        className="group relative flex flex-col justify-between p-6 rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 transition-all duration-300 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-3">
                          <div className="p-2.5 rounded-lg bg-foreground/6 w-fit group-hover:bg-foreground/10 transition-colors duration-300">
                            <History className="size-4 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                              Transformations
                            </span>
                            <span className="text-2xl font-light text-foreground block">
                              {history.length}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="absolute top-6 right-6 size-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-all duration-300" />
                      </button>

                      {/* Actions Count Card */}
                      <button
                        onClick={() => setActiveTab("actions")}
                        className="group relative flex flex-col justify-between p-6 rounded-lg border border-border/60 bg-card/40 hover:bg-card/70 transition-all duration-300 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-3">
                          <div className="p-2.5 rounded-lg bg-foreground/6 w-fit group-hover:bg-foreground/10 transition-colors duration-300">
                            <Wand2 className="size-4 text-foreground/60 group-hover:text-foreground/80 transition-colors" />
                          </div>
                          <div>
                            <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                              Total Actions
                            </span>
                            <span className="text-2xl font-light text-foreground block">
                              {BUILTIN_SHORTCUT_ACTIONS.length +
                                customActions.length}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                              {BUILTIN_SHORTCUT_ACTIONS.length} Built-in ·{" "}
                              {customActions.length} Custom
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="absolute top-6 right-6 size-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-all duration-300" />
                      </button>
                    </div>

                    {/* Action: Recent Activity Section */}
                    <div className="flex flex-col gap-4 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">
                            Recent Transformations
                          </h2>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            Your latest rewrites across webpages
                          </p>
                        </div>
                        {history.length > 0 && (
                          <button
                            onClick={() => setActiveTab("history")}
                            className="text-xs text-foreground/60 hover:text-foreground font-medium cursor-pointer outline-none transition-colors"
                          >
                            View all
                          </button>
                        )}
                      </div>

                      {history.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-secondary/5">
                          <History className="size-6 text-muted-foreground/20 mb-2 stroke-[1]" />
                          <span className="text-xs text-muted-foreground/60 font-medium">
                            No transformations yet
                          </span>
                          <span className="text-[10px] text-muted-foreground/40 mt-1">
                            Start using Hone to build your history
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col divide-y divide-border/20 w-full min-w-0">
                          {history.slice(0, 5).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-4 px-2 py-4 group/activity hover:bg-foreground/[0.02] transition-colors duration-200 min-w-0"
                            >
                              <div className="flex-shrink-0 pt-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] font-semibold uppercase tracking-wider border-border/40"
                                >
                                  {getActionName(item.action).slice(0, 8)}
                                </Badge>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground/80 leading-snug truncate" title={item.originalText}>
                                  {item.originalText}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground/50">
                                  <span className="font-mono">
                                    {new Date(
                                      item.timestamp,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  <span className="truncate hidden sm:block">
                                    {
                                      item.url
                                        .replace(/https?:\/\/(www\.)?/, "")
                                        .split("/")[0]
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 1: API Setup */}
                {activeTab === "api" && (
                  <div className="flex flex-col gap-10 animate-in fade-in duration-500 w-full py-4">
                    {/* Editorial Hero */}
                    <div className="space-y-3">
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Configuration
                      </span>
                      <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                        API Providers
                      </h1>
                      <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                        Select and configure the AI engine that powers your text
                        transformations across the web.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      {/* Active Provider Selector Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Active Provider
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            Choose the service provider to run your
                            transformations.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {[
                              {
                                id: "openrouter",
                                label: "OpenRouter Free",
                                desc: "Auto-cycling free models",
                              },
                              {
                                id: "openrouter_paid",
                                label: "OpenRouter Paid",
                                desc: "Custom model identifier",
                              },
                              {
                                id: "openai",
                                label: "OpenAI Capable",
                                desc: "GPT-4o, Custom Endpoints",
                              },
                              {
                                id: "anthropic",
                                label: "Anthropic Claude",
                                desc: "Claude 3.5 Sonnet",
                              },
                              {
                                id: "gemini",
                                label: "Google Gemini",
                                desc: "Gemini 1.5 Flash",
                              },
                              {
                                id: "google_ai_studio",
                                label: "Google AI Studio",
                                desc: "Gemma via GenAI SDK",
                              },
                            ].map((prov) => {
                              const isActive = activeProvider === prov.id;
                              return (
                                <button
                                  key={prov.id}
                                  type="button"
                                  onClick={() => setActiveProvider(prov.id)}
                                  className={cn(
                                    "relative flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group",
                                    isActive
                                      ? "bg-foreground/[0.04] border-foreground/30 text-foreground"
                                      : "bg-transparent border-border/50 text-muted-foreground hover:bg-foreground/[0.02] hover:border-border/70 hover:text-foreground",
                                  )}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                                  <div
                                    className={cn(
                                      "size-3.5 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 relative z-10",
                                      isActive
                                        ? "border-foreground"
                                        : "border-muted-foreground/30 group-hover:border-muted-foreground/50",
                                    )}
                                  >
                                    {isActive && (
                                      <div className="size-2 rounded-full bg-foreground" />
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-0.5 relative z-10">
                                    <span
                                      className={cn(
                                        "text-xs font-semibold transition-colors",
                                        isActive
                                          ? "text-foreground"
                                          : "text-muted-foreground group-hover:text-foreground",
                                      )}
                                    >
                                      {prov.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60 leading-normal">
                                      {prov.desc}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* API Key Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            {activeProvider === "openrouter" &&
                              "OpenRouter API Key"}
                            {activeProvider === "openrouter_paid" &&
                              "OpenRouter API Key"}
                            {activeProvider === "openai" &&
                              "OpenAI Capable API Key"}
                            {activeProvider === "anthropic" &&
                              "Anthropic API Key"}
                            {activeProvider === "gemini" && "Gemini API Key"}
                            {activeProvider === "google_ai_studio" &&
                              "Google AI Studio API Key"}
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            {activeProvider === "openrouter" &&
                              "Credentials for openrouter.ai free tier access."}
                            {activeProvider === "openrouter_paid" &&
                              "Credentials for openrouter.ai paid tier access."}
                            {activeProvider === "openai" &&
                              "Authentication key for OpenAI or any compatible custom gateway."}
                            {activeProvider === "anthropic" &&
                              "Key generated in Anthropic Developer Console."}
                            {activeProvider === "gemini" &&
                              "API Key generated in Google AI Studio."}
                            {activeProvider === "google_ai_studio" &&
                              "API key from aistudio.google.com."}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Input
                            type="password"
                            placeholder={
                              activeProvider === "openai"
                                ? "sk-proj-..."
                                : activeProvider === "anthropic"
                                  ? "sk-ant-..."
                                  : activeProvider.startsWith("openrouter")
                                    ? "sk-or-v1-..."
                                    : "AIzaSy..."
                            }
                            value={
                              activeProvider === "openrouter"
                                ? openrouterKey
                                : activeProvider === "openrouter_paid"
                                  ? openrouterPaidKey
                                  : activeProvider === "openai"
                                    ? openaiKey
                                    : activeProvider === "anthropic"
                                      ? anthropicKey
                                      : activeProvider === "gemini"
                                        ? geminiKey
                                        : googleAiStudioKey
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (activeProvider === "openrouter")
                                setOpenrouterKey(val);
                              else if (activeProvider === "openrouter_paid")
                                setOpenrouterPaidKey(val);
                              else if (activeProvider === "openai")
                                setOpenaiKey(val);
                              else if (activeProvider === "anthropic")
                                setAnthropicKey(val);
                              else if (activeProvider === "gemini")
                                setGeminiKey(val);
                              else setGoogleAiStudioKey(val);
                            }}
                            required={activeProvider === "openrouter"}
                            className="w-full bg-background border border-border/60 rounded-lg text-xs placeholder:text-muted-foreground/40 h-9 font-mono"
                          />
                        </div>
                      </div>

                      {/* Model Engine Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            {activeProvider === "openrouter"
                              ? "Preferred Starting Model"
                              : "Model Engine"}
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            {activeProvider === "openrouter" &&
                              "First fallback target. Error cycles others automatically."}
                            {activeProvider === "openrouter_paid" &&
                              "Model slug available on openrouter.ai/models."}
                            {activeProvider === "openai" &&
                              "Model identifier target (e.g. gpt-4o-mini)."}
                            {activeProvider === "anthropic" &&
                              "Model name identifier (e.g. claude-sonnet-4-20250514)."}
                            {activeProvider === "gemini" &&
                              "Target Gemini model engine version."}
                            {activeProvider === "google_ai_studio" &&
                              "Gemini or Gemma model engine string."}
                          </p>
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-2">
                          {activeProvider === "openrouter" ? (
                            <Select
                              value={openrouterModel}
                              onValueChange={(val) => setOpenrouterModel(val)}
                            >
                              <SelectTrigger className="bg-background border border-border/60 rounded-lg text-xs h-9 justify-between w-full">
                                <SelectValue placeholder="Select starting model..." />
                              </SelectTrigger>
                              <SelectContent className="bg-card border border-border rounded-lg shadow-sm">
                                {OPENROUTER_FREE_MODELS.map((m) => (
                                  <SelectItem
                                    key={m.id}
                                    value={m.id}
                                    className="text-xs"
                                  >
                                    <span className="font-medium">
                                      {m.label}
                                    </span>
                                    <span className="ml-2 text-muted-foreground/60 font-mono text-[10px]">
                                      {m.id}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : activeProvider === "gemini" ? (
                            <Select
                              value={geminiModel}
                              onValueChange={(val) => setGeminiModel(val)}
                            >
                              <SelectTrigger className="bg-background border border-border/60 rounded-lg text-xs h-9 justify-between w-full">
                                <SelectValue placeholder="Select model..." />
                              </SelectTrigger>
                              <SelectContent className="bg-card border border-border rounded-lg shadow-sm">
                                <SelectItem
                                  value="gemini-1.5-flash"
                                  className="text-xs"
                                >
                                  gemini-1.5-flash
                                </SelectItem>
                                <SelectItem
                                  value="gemini-1.5-pro"
                                  className="text-xs"
                                >
                                  gemini-1.5-pro
                                </SelectItem>
                                <SelectItem
                                  value="gemini-2.5-flash"
                                  className="text-xs"
                                >
                                  gemini-2.5-flash
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="text"
                              value={
                                activeProvider === "openrouter_paid"
                                  ? openrouterPaidModel
                                  : activeProvider === "openai"
                                    ? openaiModel
                                    : activeProvider === "anthropic"
                                      ? anthropicModel
                                      : googleAiStudioModel
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (activeProvider === "openrouter_paid")
                                  setOpenrouterPaidModel(val);
                                else if (activeProvider === "openai")
                                  setOpenaiModel(val);
                                else if (activeProvider === "anthropic")
                                  setAnthropicModel(val);
                                else setGoogleAiStudioModel(val);
                              }}
                              placeholder={
                                activeProvider === "openrouter_paid"
                                  ? "e.g. anthropic/claude-3.5-sonnet"
                                  : activeProvider === "openai"
                                    ? "gpt-4o-mini"
                                    : activeProvider === "anthropic"
                                      ? "claude-sonnet-4-20250514"
                                      : "gemma-4-26b-a4b-it"
                              }
                              className="bg-background border border-border/60 rounded-lg text-xs h-9 font-mono w-full"
                            />
                          )}

                          {activeProvider === "openrouter" && (
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                              On error, all 5 models are tried in sequence,
                              repeated 3 times (15 total attempts).
                            </p>
                          )}
                          {activeProvider === "openrouter_paid" && (
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                              Use any model slug from openrouter.ai/models —
                              e.g.{" "}
                              <span className="font-mono text-foreground/80">
                                openai/gpt-4o
                              </span>
                              .
                            </p>
                          )}
                          {activeProvider === "google_ai_studio" && (
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                              Supports any model accessible via the Gemini API —
                              e.g.{" "}
                              <span className="font-mono text-foreground/80">
                                gemma-4-26b-a4b-it
                              </span>
                              .
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Custom API Endpoint (Only for OpenAI) */}
                      {activeProvider === "openai" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                          <div className="pr-4">
                            <Label className="text-xs font-semibold text-foreground">
                              Custom API Endpoint
                            </Label>
                            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                              Custom base target URL for OpenAI-compatible
                              proxy, gateway, or local instance.
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              type="text"
                              value={openaiEndpoint}
                              onChange={(e) =>
                                setOpenaiEndpoint(e.target.value)
                              }
                              placeholder="https://api.openai.com/v1"
                              className="w-full bg-background border border-border/60 rounded-lg text-xs h-9 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Bottom Info Notice */}
                      {(activeProvider === "openrouter" ||
                        activeProvider === "openrouter_paid" ||
                        activeProvider === "google_ai_studio") && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                          <div className="md:col-span-3">
                            {activeProvider === "openrouter" && (
                              <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                                <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                                <div>
                                  A free OpenRouter API key is required (create
                                  one at{" "}
                                  <strong className="text-foreground/80">
                                    openrouter.ai
                                  </strong>
                                  ). Select your{" "}
                                  <strong className="text-foreground/80">
                                    preferred starting model
                                  </strong>
                                  ; if it fails, the extension tries all other
                                  free models — cycling through the full list up
                                  to{" "}
                                  <strong className="text-foreground/80">
                                    3 times
                                  </strong>{" "}
                                  before giving up.
                                </div>
                              </div>
                            )}
                            {activeProvider === "openrouter_paid" && (
                              <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                                <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                                <div>
                                  Enter any model identifier available on{" "}
                                  <strong className="text-foreground/80">
                                    openrouter.ai
                                  </strong>{" "}
                                  — paid or otherwise. Your API key must have
                                  sufficient credits for the chosen model.
                                </div>
                              </div>
                            )}
                            {activeProvider === "google_ai_studio" && (
                              <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                                <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                                <div>
                                  Uses{" "}
                                  <strong className="text-foreground/80">
                                    @google/genai
                                  </strong>{" "}
                                  SDK with thinking config (MINIMAL). Get a free
                                  API key from{" "}
                                  <strong className="text-foreground/80">
                                    aistudio.google.com
                                  </strong>{" "}
                                  — generous free tier. Supports Gemma models
                                  like{" "}
                                  <span className="font-mono text-foreground/80">
                                    gemma-4-26b-a4b-it
                                  </span>
                                  .
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: Keyboard Shortcuts */}
                {activeTab === "shortcut" && (
                  <div className="flex flex-col gap-10 animate-in fade-in duration-500 w-full py-4">
                    {/* Editorial Hero */}
                    <div className="space-y-3">
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Key Bindings
                      </span>
                      <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                        Key Bindings
                      </h1>
                      <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                        Configure fast global and contextual keyboard shortcuts
                        to trigger your text transformations on any webpage.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      {/* Active Key Combination Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Text Transformation Shortcut
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            Combination to execute the chosen transformation
                            action instantly on your focused or highlighted
                            text.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex gap-3 items-center">
                            <div className="bg-background border border-border/60 rounded-lg px-4 py-3.5 text-xs text-center flex-1 font-mono font-semibold text-foreground flex items-center justify-center gap-2 select-none min-h-[50px]">
                              {isRecordingKey ? (
                                <span className="animate-pulse text-foreground flex items-center gap-2">
                                  <span className="w-2 h-2 bg-foreground rounded-full animate-ping" />
                                  Listening to keypresses...
                                </span>
                              ) : (
                                getShortcutDisplay()
                              )}
                            </div>

                            <MaterialDesign3Button
                              variant="default"
                              size="default"
                              shape="round"
                              type="button"
                              onClick={() => {
                                setShortcutKey("");
                                setShortcutCtrl(false);
                                setShortcutAlt(false);
                                setShortcutShift(false);
                                setShortcutMeta(false);
                                setIsRecordingKey(true);
                              }}
                            >
                              <Keyboard className="w-3.5 h-3.5" />
                              Record
                            </MaterialDesign3Button>
                          </div>
                        </div>
                      </div>

                      {/* Shortcut Action Trigger Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Shortcut Trigger Action
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            Action that will run when the text transformation
                            key combination is pressed.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Select
                            value={shortcutAction}
                            onValueChange={(val) => setShortcutAction(val)}
                          >
                            <SelectTrigger className="bg-background border border-border/60 rounded-lg text-xs h-9 justify-between w-full">
                              <SelectValue placeholder="Select shortcut action..." />
                            </SelectTrigger>
                            <SelectContent className="bg-card border border-border rounded-lg shadow-sm max-h-72">
                              <SelectGroup>
                                <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                                  Built-in actions
                                </SelectLabel>
                                {BUILTIN_SHORTCUT_ACTIONS.map((action) => (
                                  <SelectItem
                                    key={action.id}
                                    value={action.id}
                                    className="text-xs"
                                  >
                                    {action.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              {customActions.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                                    Custom actions
                                  </SelectLabel>
                                  {customActions.map((action) => (
                                    <SelectItem
                                      key={action.id}
                                      value={action.id}
                                      className="text-xs"
                                    >
                                      {action.name || "Untitled action"}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {shortcutAction &&
                                !isKnownShortcutAction(shortcutAction) && (
                                  <SelectGroup>
                                    <SelectItem
                                      value={shortcutAction}
                                      className="text-xs text-muted-foreground"
                                    >
                                      {getActionName(shortcutAction)}{" "}
                                      (unavailable)
                                    </SelectItem>
                                  </SelectGroup>
                                )}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 mt-4 animate-in fade-in duration-200">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                            <div>
                              <strong className="text-foreground/80">
                                Pro Tip:
                              </strong>{" "}
                              Pressing this combination while focusing on any
                              input or textarea on any webpage will extract the
                              selected text (or all text if nothing is selected)
                              and replace it with the corrected version from
                              your active AI provider.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Menu Toggle Shortcut Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Menu Toggle Shortcut
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            Key combination to trigger the contextual dropdown
                            helper menu on active inputs.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex gap-3 items-center">
                            <div className="bg-background border border-border/60 rounded-lg px-4 py-3.5 text-xs text-center flex-1 font-mono font-semibold text-foreground flex items-center justify-center gap-2 select-none min-h-[50px]">
                              {isRecordingDropdownKey ? (
                                <span className="animate-pulse text-foreground flex items-center gap-2">
                                  <span className="w-2 h-2 bg-foreground rounded-full animate-ping" />
                                  Listening to keypresses...
                                </span>
                              ) : (
                                getDropdownShortcutDisplay()
                              )}
                            </div>

                            <MaterialDesign3Button
                              variant="default"
                              size="default"
                              shape="round"
                              type="button"
                              onClick={() => {
                                setDropdownShortcutKey("");
                                setDropdownShortcutCtrl(false);
                                setDropdownShortcutAlt(false);
                                setDropdownShortcutShift(false);
                                setDropdownShortcutMeta(false);
                                setIsRecordingDropdownKey(true);
                              }}
                            >
                              <Keyboard className="w-3.5 h-3.5" />
                              Record
                            </MaterialDesign3Button>
                          </div>
                        </div>
                      </div>

                      {/* Overlay Settings Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Overlay Visuals
                          </Label>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                            Configure how Hone visual elements present
                            themselves in inputs.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex flex-col gap-0.5 rounded-xl border border-border/20 bg-foreground/[0.01] p-0.5">
                            <button
                              type="button"
                              onClick={() => setHideDot(!hideDot)}
                              className="flex items-center justify-between w-full rounded-t-[calc(0.75rem-2px)] bg-foreground/[0.02] hover:bg-foreground/[0.04] p-4 cursor-pointer transition-colors duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                            >
                              <div className="flex flex-col gap-1 pr-4">
                                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                                  Hide Trigger Dot
                                </Label>
                                <span className="text-[10px] text-muted-foreground/70 leading-normal">
                                  Completely hide the white arrow-up trigger dot
                                  from webpage inputs. You will still be able to
                                  open the dropdown menu anytime by focusing an
                                  input and pressing your dropdown shortcut.
                                </span>
                              </div>
                              <MaterialDesign3Switch
                                variant="primary"
                                size="default"
                                checked={hideDot}
                                onCheckedChange={(checked) =>
                                  setHideDot(checked)
                                }
                                haptic="none"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewInCard(!previewInCard)}
                              className="flex items-center justify-between w-full rounded-b-[calc(0.75rem-2px)] bg-foreground/[0.02] hover:bg-foreground/[0.04] p-4 cursor-pointer transition-colors duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/20 border-t border-border/10"
                            >
                              <div className="flex flex-col gap-1 pr-4">
                                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                                  Preview AI results in card
                                </Label>
                                <span className="text-[10px] text-muted-foreground/70 leading-normal">
                                  When enabled, selecting an action generates the response inside the right-hand preview card, keeping the menu open. You can then review and apply it manually. When disabled, the menu closes immediately and applies the result directly.
                                </span>
                              </div>
                              <MaterialDesign3Switch
                                variant="primary"
                                size="default"
                                checked={previewInCard}
                                onCheckedChange={(checked) =>
                                  setPreviewInCard(checked)
                                }
                                haptic="none"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: History Viewer */}
                {activeTab === "history" && (
                  <div className="absolute inset-0 flex flex-col animate-in fade-in duration-500 bg-card rounded-lg z-10">
                    {/* Fixed Floating Topbar */}
                    <div className="shrink-0 px-6 py-4 border-b border-border/30 flex items-center gap-3 bg-card rounded-t-lg">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-light text-foreground">
                          Rewrite History
                        </h2>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          Review past Hone transformations, text replacements,
                          and copies.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Search..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="pl-8 pr-7 h-8 text-xs bg-background border border-border/60 rounded-lg w-48 font-mono"
                          />
                          {historySearch && (
                            <button
                              onClick={() => setHistorySearch("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {history.length > 0 && (
                          <MaterialDesign3Button
                            variant="destructive"
                            size="sm"
                            shape="round"
                            onClick={() => setClearAllDialogOpen(true)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear All
                          </MaterialDesign3Button>
                        )}
                      </div>
                    </div>

                    {/* Virtualized List */}
                    <div
                      ref={historyParentRef}
                      className="flex-1 min-h-0 overflow-y-auto"
                    >
                      {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                          <History className="w-7 h-7 text-muted-foreground/30 stroke-[1]" />
                          <p className="text-muted-foreground text-xs font-medium">
                            {historySearch
                              ? "No results found."
                              : "No transformations recorded yet."}
                          </p>
                          <p className="text-muted-foreground/50 text-[10px]">
                            {historySearch
                              ? "Try a different search term."
                              : "Start using Hone in webpage text boxes to build history."}
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            height: `${historyVirtualizer.getTotalSize()}px`,
                            width: "100%",
                            position: "relative",
                          }}
                        >
                          {historyVirtualizer
                            .getVirtualItems()
                            .map((virtualItem) => {
                              const item = filteredHistory[virtualItem.index];
                              return (
                                <div
                                  key={virtualItem.key}
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    height: `${virtualItem.size}px`,
                                    transform: `translateY(${virtualItem.start}px)`,
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedHistoryItem(item);
                                      setHistoryDialogOpen(true);
                                    }}
                                    className="w-full h-full flex items-center gap-4 px-6 border-b border-border/20 hover:bg-foreground/[0.02] transition-colors text-left group"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0 py-2.5">
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] font-mono border-border/40 shrink-0 py-0 font-semibold"
                                      >
                                        {getActionName(item.action)}
                                      </Badge>
                                      <span className="text-xs text-foreground/70 truncate leading-normal flex-1">
                                        {item.rewrittenText}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                      <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap font-mono">
                                        {new Date(
                                          item.timestamp,
                                        ).toLocaleString()}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
                                        View details
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* History Item Detail Dialog */}
                    <Dialog
                      open={historyDialogOpen}
                      onOpenChange={setHistoryDialogOpen}
                    >
                      <DialogContent className="max-w-2xl w-full">
                        {selectedHistoryItem && (
                          <>
                            <DialogTitle>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-mono border-border/40"
                                  >
                                    {getActionName(selectedHistoryItem.action)}
                                  </Badge>
                                  <span className="text-sm font-light">
                                    Details
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    setHistoryDialogOpen(false);
                                    setSelectedHistoryItem(null);
                                  }}
                                  className="text-muted-foreground/50 hover:text-foreground transition-colors rounded-lg p-1 hover:bg-foreground/[0.04]"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </DialogTitle>

                            <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
                              {/* Metadata */}
                              <div className="flex flex-wrap gap-2 text-[11px]">
                                <span className="px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground font-mono bg-foreground/[0.02]">
                                  {selectedHistoryItem.provider} ·{" "}
                                  {selectedHistoryItem.model}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground bg-foreground/[0.02]">
                                  {new Date(
                                    selectedHistoryItem.timestamp,
                                  ).toLocaleString()}
                                </span>
                              </div>

                              {/* Source URL */}
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                                  Source URL
                                </span>
                                <a
                                  href={selectedHistoryItem.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-mono text-foreground/70 hover:text-foreground hover:underline truncate"
                                >
                                  {selectedHistoryItem.url}
                                </a>
                              </div>

                              {/* Text Comparison */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5 bg-foreground/[0.02] border border-border/40 p-4 rounded-lg">
                                  <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">
                                    Original
                                  </span>
                                  <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto pr-1 font-mono">
                                    {selectedHistoryItem.originalText}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5 bg-foreground/[0.02] border border-border/40 p-4 rounded-lg">
                                  <span className="text-[9px] text-foreground/80 uppercase font-semibold tracking-wide">
                                    Rewritten
                                  </span>
                                  <div className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto pr-1 font-mono">
                                    {selectedHistoryItem.rewrittenText}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 justify-end pt-3 border-t border-border/30">
                                <MaterialDesign3Button
                                  variant="destructive"
                                  size="sm"
                                  shape="round"
                                  onClick={() => {
                                    handleDeleteHistory(selectedHistoryItem.id);
                                    setHistoryDialogOpen(false);
                                    setSelectedHistoryItem(null);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </MaterialDesign3Button>
                                <MaterialDesign3Button
                                  variant="default"
                                  size="sm"
                                  shape="round"
                                  onClick={() =>
                                    handleCopyHistory(
                                      selectedHistoryItem.rewrittenText,
                                      selectedHistoryItem.id,
                                    )
                                  }
                                >
                                  {copiedId === selectedHistoryItem.id ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  {copiedId === selectedHistoryItem.id
                                    ? "Copied"
                                    : "Copy"}
                                </MaterialDesign3Button>
                              </div>
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>

                    {/* Clear All Confirmation Dialog */}
                    <Dialog
                      open={clearAllDialogOpen}
                      onOpenChange={setClearAllDialogOpen}
                    >
                      <DialogContent className="max-w-sm w-full">
                        <DialogTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-light text-foreground">
                              Clear All History
                            </span>
                          </div>
                        </DialogTitle>
                        <div className="px-6 pb-5 pt-4 flex flex-col gap-5">
                          <p className="text-xs text-muted-foreground/70 leading-normal">
                            Are you sure you want to clear your entire
                            transformation history? This cannot be undone.
                          </p>
                          <div className="flex gap-2 justify-end">
                            <MaterialDesign3Button
                              variant="ghost"
                              size="sm"
                              shape="round"
                              onClick={() => setClearAllDialogOpen(false)}
                            >
                              Cancel
                            </MaterialDesign3Button>
                            <MaterialDesign3Button
                              variant="destructive"
                              size="sm"
                              shape="round"
                              onClick={handleClearAllHistory}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Clear All
                            </MaterialDesign3Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* TAB 4: Actions Studio */}
                {activeTab === "actions" && (
                  <div className="absolute inset-0 flex overflow-hidden animate-in fade-in duration-500 rounded-lg z-10">
                    {/* Left: action list sidebar */}
                    <div className="w-72 shrink-0 flex flex-col gap-4 border-r border-border/30 p-6 pr-6 overflow-y-auto bg-card">
                      <div className="flex flex-col gap-2 shrink-0">
                        <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">
                          Editor
                        </span>
                        <h2 className="text-base font-light text-foreground">
                          Actions Studio
                        </h2>
                        <p className="text-xs text-muted-foreground/70">
                          Create custom AI text transformation actions.
                        </p>
                      </div>

                      <MaterialDesign3Button
                        variant="default"
                        size="sm"
                        shape="round"
                        onClick={() => {
                          setEditingAction({
                            id: crypto.randomUUID(),
                            name: "",
                            description: "",
                            promptTemplate: "",
                            systemPrompt: "",
                            icon: DEFAULT_ACTION_ICON,
                            color: "#8B5CF6",
                            category: "custom",
                            replaceMode: "replace",
                            enabled: true,
                            createdAt: Date.now(),
                          });
                          setIsNewAction(true);
                        }}
                        className="w-full shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Action
                      </MaterialDesign3Button>

                      {/* Scrollable list of custom actions */}
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                        {customActions.map((ca, idx) => {
                          const isSelected = editingAction?.id === ca.id;
                          const actionColor = ca.color || "#8B5CF6";
                          return (
                            <button
                              key={ca.id}
                              type="button"
                              onClick={() => {
                                setEditingAction(ca);
                                setIsNewAction(false);
                              }}
                              style={{ animationDelay: `${idx * 40}ms` }}
                              className={cn(
                                "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl border text-left transition-[transform,background,border,box-shadow] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards",
                                isSelected
                                  ? "bg-foreground/[0.02] border-border/60"
                                  : "bg-transparent border-transparent hover:bg-foreground/[0.02] hover:border-border/30 active:scale-[0.98]",
                              )}
                            >
                              {/* Active indicator bar */}
                              {isSelected && (
                                <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-sm bg-foreground/60" />
                              )}

                              {/* Icon container with translucent background */}
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  backgroundColor: `${actionColor}1A`,
                                  border: `1px solid ${actionColor}33`,
                                }}
                              >
                                {renderActionIcon(ca.icon, {
                                  size: 15,
                                  color: actionColor,
                                })}
                              </div>

                              {/* Title and prompt template preview */}
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span
                                  className={cn(
                                    "text-xs font-semibold truncate transition-colors duration-200",
                                    isSelected
                                      ? "text-foreground"
                                      : "text-muted-foreground group-hover:text-foreground",
                                  )}
                                >
                                  {ca.name || "Untitled Action"}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50 truncate leading-normal">
                                  {ca.description ||
                                    ca.promptTemplate ||
                                    "No description"}
                                </span>
                              </div>
                            </button>
                          );
                        })}

                        {customActions.length === 0 && (
                          <div className="text-center py-10 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-500">
                            <Wand2 className="w-5 h-5 text-muted-foreground/20 stroke-[1]" />
                            <p className="text-[11px] text-muted-foreground/50 leading-normal">
                              No custom actions created yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: action editor panel — flat on surface, no card wrapper */}
                    <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
                      {!editingAction ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6 animate-in fade-in duration-500">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
                            <Wand2 className="w-6 h-6 text-muted-foreground/30 stroke-[1]" />
                          </div>
                          <h3 className="text-sm font-light text-foreground">
                            Select or Create an Action
                          </h3>
                          <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs leading-normal">
                            Choose an action from the list on the left to edit
                            its template, or click Create New Action to build
                            your own custom text transformation.
                          </p>
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!editingAction) return;
                            await saveCustomAction({
                              ...editingAction,
                              icon: normalizeActionIconName(editingAction.icon),
                              color: editingAction.color || "#8B5CF6",
                            });
                            const updated = await loadCustomActions();
                            setCustomActions(updated);
                            setIsNewAction(false);
                            triggerSaveStatus(
                              "Action saved successfully!",
                              "success",
                            );
                          }}
                          className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        >
                          {/* Sticky Sub-Header Action Bar — flat on surface */}
                          <div className="sticky top-0 z-20 px-6 py-2.5 flex items-center justify-between gap-4 border-b border-border/30 min-h-12">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 active:scale-[0.95]"
                                style={{
                                  backgroundColor: `${editingAction.color || "#8B5CF6"}1A`,
                                  border: `1px solid ${editingAction.color || "#8B5CF6"}33`,
                                }}
                              >
                                {renderActionIcon(editingAction.icon, {
                                  size: 12,
                                  color: editingAction.color || "#8B5CF6",
                                })}
                              </div>
                              <div className="min-w-0 flex flex-col">
                                <h3 className="text-xs font-semibold text-foreground truncate">
                                  {editingAction.name || "New Action"}
                                </h3>
                                <p className="text-[10px] text-muted-foreground/60 truncate">
                                  {isNewAction ? "Creating" : "Editing"}
                                </p>
                              </div>
                            </div>

                            {/* Header actions (Delete, Save) */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-muted-foreground/60 min-w-[3.5rem] text-right select-none">
                                  {editingAction.enabled !== false
                                    ? "Enabled"
                                    : "Disabled"}
                                </span>
                                <MaterialDesign3Switch
                                  variant="primary"
                                  size="default"
                                  checked={editingAction.enabled !== false}
                                  onCheckedChange={(checked) =>
                                    setEditingAction({
                                      ...editingAction,
                                      enabled: checked,
                                    })
                                  }
                                  haptic="none"
                                />
                              </div>

                              {!isNewAction && (
                                <MaterialDesign3Button
                                  variant="destructive"
                                  size="sm"
                                  shape="round"
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `Delete "${editingAction.name}"? This cannot be undone.`,
                                      )
                                    )
                                      return;
                                    await deleteCustomAction(editingAction.id);
                                    const updated = await loadCustomActions();
                                    setCustomActions(updated);
                                    setEditingAction(null);
                                    triggerSaveStatus(
                                      "Action deleted.",
                                      "success",
                                    );
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </MaterialDesign3Button>
                              )}

                              <MaterialDesign3Button
                                variant="default"
                                size="sm"
                                shape="round"
                                type="submit"
                              >
                                <Save className="w-3.5 h-3.5" />
                                Save Action
                              </MaterialDesign3Button>
                            </div>
                          </div>

                          {/* Scrollable Form Fields — flush below topbar */}
                          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            {/* Group 1: Identity & Visuals */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                              <div className="pr-4">
                                <Label className="text-xs font-semibold text-foreground">
                                  Identity & Visuals
                                </Label>
                                <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                                  Define the name, description, and visual
                                  representation of your action.
                                </p>
                              </div>

                              <div className="md:col-span-2 space-y-4">
                                {/* Name Input */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    Action Name
                                  </Label>
                                  <Input
                                    type="text"
                                    placeholder={
                                      CUSTOM_ACTION_PLACEHOLDERS.name
                                    }
                                    value={editingAction.name}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        name: e.target.value,
                                      })
                                    }
                                    className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                    required
                                  />
                                </div>

                                {/* Description Input */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    Description{" "}
                                    <span className="text-muted-foreground/50">
                                      (Optional)
                                    </span>
                                  </Label>
                                  <Input
                                    type="text"
                                    placeholder={
                                      CUSTOM_ACTION_PLACEHOLDERS.description
                                    }
                                    value={editingAction.description || ""}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        description: e.target.value,
                                      })
                                    }
                                    className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                  />
                                </div>

                                {/* Icon + Color Selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                  <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-semibold text-muted-foreground">
                                      Icon Symbol
                                    </Label>
                                    <ActionIconSelect
                                      value={editingAction.icon}
                                      accentColor={
                                        editingAction.color || "#8B5CF6"
                                      }
                                      onValueChange={(icon) =>
                                        setEditingAction({
                                          ...editingAction,
                                          icon,
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Label className="text-[10px] font-semibold text-muted-foreground">
                                      Accent Color
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      {[
                                        "#8B5CF6",
                                        "#3B82F6",
                                        "#10B981",
                                        "#F59E0B",
                                        "#EF4444",
                                        "#EC4899",
                                        "#06B6D4",
                                        "#84CC16",
                                      ].map((c) => (
                                        <button
                                          key={c}
                                          type="button"
                                          onClick={() =>
                                            setEditingAction({
                                              ...editingAction,
                                              color: c,
                                            })
                                          }
                                          className={cn(
                                            "h-6 w-6 rounded-full border p-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-[0.95] shrink-0",
                                            editingAction.color === c
                                              ? "border-foreground scale-110 ring-2 ring-foreground/25"
                                              : "border-transparent",
                                          )}
                                          style={{ background: c }}
                                          aria-label={`Color ${c}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Group 2: AI Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                              <div className="pr-4">
                                <Label className="text-xs font-semibold text-foreground">
                                  AI Parameters
                                </Label>
                                <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                                  Configure the model, parameters, and inline
                                  behavior.
                                </p>
                              </div>

                              <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {/* Provider Select */}
                                  <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-semibold text-muted-foreground">
                                      API Provider
                                    </Label>
                                    <Select
                                      value={
                                        editingAction.provider || "__default__"
                                      }
                                      onValueChange={(val) =>
                                        setEditingAction({
                                          ...editingAction,
                                          provider:
                                            val === "__default__"
                                              ? undefined
                                              : val,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-9 w-full justify-between rounded-lg border-border/60 bg-background text-xs transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                        <SelectValue placeholder="Use global default" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-lg border border-border bg-card shadow-md">
                                        {ACTION_PROVIDER_OPTIONS.map((opt) => (
                                          <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            className="text-xs"
                                          >
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Model Input */}
                                  <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-semibold text-muted-foreground">
                                      Model Identifier
                                    </Label>
                                    <Input
                                      type="text"
                                      placeholder="gpt-4o-mini"
                                      value={editingAction.model || ""}
                                      onChange={(e) =>
                                        setEditingAction({
                                          ...editingAction,
                                          model: e.target.value || undefined,
                                        })
                                      }
                                      className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                    />
                                  </div>

                                  {/* Temperature Input */}
                                  <div className="flex flex-col gap-1.5">
                                    <Label className="text-[10px] font-semibold text-muted-foreground">
                                      Temperature (Creativity)
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="2"
                                      placeholder="0.7"
                                      value={editingAction.temperature ?? ""}
                                      onChange={(e) =>
                                        setEditingAction({
                                          ...editingAction,
                                          temperature: e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined,
                                        })
                                      }
                                      className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                    />
                                  </div>
                                </div>

                                {/* Replace Mode Switch — double-bezel nested card, fully clickable */}
                                <div className="rounded-xl border border-border/20 bg-foreground/[0.01] p-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingAction({
                                        ...editingAction,
                                        replaceMode:
                                          editingAction.replaceMode ===
                                          "preview"
                                            ? "replace"
                                            : "preview",
                                      })
                                    }
                                    className="flex items-center justify-between w-full rounded-[calc(0.75rem-2px)] bg-foreground/[0.02] hover:bg-foreground/[0.04] p-4 cursor-pointer transition-colors duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                                  >
                                    <div className="flex flex-col gap-0.5 pr-4">
                                      <Label className="text-xs font-semibold text-foreground cursor-pointer">
                                        Preview before replacing
                                      </Label>
                                      <span className="text-[10px] text-muted-foreground/70 leading-normal">
                                        Show the transformation in a preview
                                        panel instead of replacing text
                                        immediately inline.
                                      </span>
                                    </div>
                                    <MaterialDesign3Switch
                                      variant="primary"
                                      size="default"
                                      checked={
                                        editingAction.replaceMode === "preview"
                                      }
                                      onCheckedChange={(checked) =>
                                        setEditingAction({
                                          ...editingAction,
                                          replaceMode: checked
                                            ? "preview"
                                            : "replace",
                                        })
                                      }
                                      haptic="none"
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Group 3: Prompt Templates */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                              <div className="pr-4">
                                <Label className="text-xs font-semibold text-foreground">
                                  Instructions & Prompts
                                </Label>
                                <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                                  Draft system context and prompt templates.
                                  Predefined variables will be populated
                                  dynamically.
                                </p>
                              </div>

                              <div className="md:col-span-2 space-y-4">
                                {/* System Prompt Textarea */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    System Prompt{" "}
                                    <span className="text-muted-foreground/50">
                                      (Optional)
                                    </span>
                                  </Label>
                                  <Textarea
                                    placeholder={
                                      CUSTOM_ACTION_PLACEHOLDERS.systemPrompt
                                    }
                                    value={editingAction.systemPrompt || ""}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        systemPrompt: e.target.value,
                                      })
                                    }
                                    className="min-h-[70px] resize-y font-mono text-xs leading-normal border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                  />
                                </div>

                                {/* Prompt Template Textarea */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    Prompt Template
                                  </Label>
                                  <Textarea
                                    placeholder={
                                      CUSTOM_ACTION_PLACEHOLDERS.promptTemplate
                                    }
                                    value={editingAction.promptTemplate}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        promptTemplate: e.target.value,
                                      })
                                    }
                                    className="min-h-[130px] resize-y font-mono text-xs leading-normal border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                    required
                                  />
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mt-0.5">
                                    <span className="font-semibold bg-foreground/[0.04] px-1.5 py-0.5 rounded text-foreground font-mono">
                                      {"{{input}}"}
                                    </span>
                                    <span>
                                      represents the selected text target
                                      undergoing rewriting.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Group 4: Test Playground */}
                            {editingAction.promptTemplate && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                <div className="pr-4">
                                  <Label className="text-xs font-semibold text-foreground">
                                    Test Playground
                                  </Label>
                                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                                    Test transformations instantly with sample
                                    text inputs.
                                  </p>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                  <div className="flex flex-col gap-2.5">
                                    <Textarea
                                      placeholder={
                                        CUSTOM_ACTION_PLACEHOLDERS.testInput
                                      }
                                      value={testInput}
                                      onChange={(e) =>
                                        setTestInput(e.target.value)
                                      }
                                      className="min-h-[70px] resize-y font-mono text-xs border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                                    />

                                    <div>
                                      <MaterialDesign3Button
                                        variant="default"
                                        size="sm"
                                        shape="round"
                                        type="button"
                                        disabled={
                                          !testInput.trim() || testLoading
                                        }
                                        onClick={async () => {
                                          setTestLoading(true);
                                          setTestResult("");
                                          try {
                                            const response =
                                              await chrome.runtime.sendMessage({
                                                type: "PROCESS_TEXT",
                                                action: editingAction.id,
                                                text: testInput,
                                              });
                                            if (
                                              response?.success &&
                                              response.text
                                            ) {
                                              setTestResult(response.text);
                                            } else {
                                              setTestResult(
                                                `Error: ${response?.error || "Unknown error"}`,
                                              );
                                            }
                                          } catch (err: unknown) {
                                            setTestResult(
                                              `Error: ${(err as Error).message}`,
                                            );
                                          }
                                          setTestLoading(false);
                                        }}
                                      >
                                        {testLoading ? (
                                          <span className="animate-pulse flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-ping" />
                                            Running...
                                          </span>
                                        ) : (
                                          <>
                                            <Play className="w-3 h-3" />
                                            Run Test
                                          </>
                                        )}
                                      </MaterialDesign3Button>
                                    </div>
                                  </div>

                                  {testResult && (
                                    <div className="bg-foreground/[0.02] border border-border/30 p-4 rounded-xl space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                                      <span className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wide">
                                        Transformation Output
                                      </span>
                                      <Textarea
                                        readOnly
                                        value={testResult}
                                        className="max-h-[220px] min-h-[90px] resize-y font-mono text-xs leading-relaxed bg-transparent border-0 shadow-none focus-visible:ring-0 p-0"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Info — subtle micro-notice at bottom of form */}
                            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-foreground/[0.02] border border-border/20">
                              <Info className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5 stroke-[1.5]" />
                              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                                Variables like{" "}
                                <span className="font-mono text-foreground/60">
                                  {"{{input}}"}
                                </span>{" "}
                                and{" "}
                                <span className="font-mono text-foreground/60">
                                  {"{{selection}}"}
                                </span>{" "}
                                are replaced dynamically when the action runs.
                                Use the test playground above to verify your
                                template before saving.
                              </p>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
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
