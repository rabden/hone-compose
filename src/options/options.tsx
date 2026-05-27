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
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B" },
  { id: "poolside/laguna-xs.2:free", label: "Laguna XS.2" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron 3 Nano 30B" },
  { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B" },
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

function SidebarHeaderInner() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="flex w-full">
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center p-1.5 w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-all cursor-pointer ml-1 mt-1"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <PanelLeftIcon className={cn("size-4", isCollapsed && "rotate-180")} />
      </button>
    </div>
  );
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

  // History & Toast status states

  // History & Toast status states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History tab: search, selection, dialog, virtualization
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
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
    [history, historySearch]
  );

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
        "history",
      ])
      .then((res: any) => {
        if (res.activeProvider) setActiveProvider(res.activeProvider);

        if (res.openaiKey) setOpenaiKey(res.openaiKey);
        if (res.openaiModel) setOpenaiModel(res.openaiModel);
        if (res.openaiEndpoint) setOpenaiEndpoint(res.openaiEndpoint);

        if (res.anthropicKey) setAnthropicKey(res.anthropicKey);
        if (res.anthropicModel) setAnthropicModel(res.anthropicModel);

        if (res.geminiKey) setGeminiKey(res.geminiKey);
        if (res.geminiModel) setGeminiModel(res.geminiModel);

        if (res.openrouterKey) setOpenrouterKey(res.openrouterKey);
        if (res.openrouterModel) setOpenrouterModel(res.openrouterModel);

        if (res.openrouterPaidKey) setOpenrouterPaidKey(res.openrouterPaidKey);
        if (res.openrouterPaidModel)
          setOpenrouterPaidModel(res.openrouterPaidModel);

        if (res.googleAiStudioKey) setGoogleAiStudioKey(res.googleAiStudioKey);
        if (res.googleAiStudioModel)
          setGoogleAiStudioModel(res.googleAiStudioModel);

        if (res.shortcutKey) setShortcutKey(res.shortcutKey);
        setShortcutCtrl(!!res.shortcutCtrl);
        setShortcutAlt(!!res.shortcutAlt);
        setShortcutShift(!!res.shortcutShift);
        setShortcutMeta(!!res.shortcutMeta);
        if (res.shortcutAction) setShortcutAction(res.shortcutAction);

        if (res.dropdownShortcutKey !== undefined)
          setDropdownShortcutKey(res.dropdownShortcutKey);
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

        if (res.history) setHistory(res.history);
      });
    loadCustomActions().then(setCustomActions);
    setInitialLoadComplete(true);
  }, []);

  // Auto-save provider settings on change
  useEffect(() => {
    if (!initialLoadComplete) return;
    chrome.storage.local.set({
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
    }).catch(console.error);
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
    chrome.storage.local.set({
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
    }).catch(console.error);
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
  ]);

  // Show status toasts
  const triggerSaveStatus = (message: string, type: "success" | "error") => {
    setSaveStatus({ message, type });
    setTimeout(() => setSaveStatus(null), 3000);
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
    const updatedHistory = history.filter((item) => item.id !== id);
    setHistory(updatedHistory);
    await chrome.storage.local.set({ history: updatedHistory });
    triggerSaveStatus("History item deleted.", "success");
  };

  // Clear all history logs
  const handleClearAllHistory = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear your entire transformation history? This cannot be undone.",
      )
    ) {
      setHistory([]);
      await chrome.storage.local.set({ history: [] });
      triggerSaveStatus("All history cleared.", "success");
    }
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
      <div className="flex w-full h-[100dvh] overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar
          collapsible="icon"
          variant="sidebar"
          className="hidden md:flex bg-background border-none"
        >
          <TooltipProvider>
            <SidebarHeader>
              <SidebarHeaderInner />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="p-2">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.value}>
                          <div
                            className={cn(
                              "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[150%] w-0.5 bg-foreground rounded-full transition-[opacity,transform] duration-200 ease-out",
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
                            className="relative data-[active=true]:bg-muted/70 data-[active=true]:text-foreground data-[active=true]:font-semibold hover:bg-muted/40 transition-[background-color,color] duration-150 ease-out rounded-lg"
                          >
                            <Icon className="size-4 shrink-0" />
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
              <div className="text-[10px] text-muted-foreground/60 select-none whitespace-nowrap flex">
                <span className="group-data-[collapsible=icon]:hidden">
                  Hone{" "}
                </span>
                v{chrome.runtime.getManifest().version}
              </div>
            </SidebarFooter>
          </TooltipProvider>
        </Sidebar>

        {/* Right section: Header + Content */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden bg-background">
          {/* Header */}
          <header className="flex items-center justify-center px-4 py-3 bg-background shrink-0 h-fit relative">
            <div className="flex items-center gap-2">
              <HoneLogo size={20} alt="" />
              <span className="font-semibold text-sm tracking-wide text-foreground">
                Hone
              </span>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 mb-2 mr-2 rounded-lg bg-card flex flex-col min-h-0 relative">
              <div className="flex-1 min-h-0 overflow-y-auto p-6">
                {/* TAB 0: Dashboard */}
                {activeTab === "dashboard" && (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-300 w-full">
                    {/* Hero */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground tracking-tight">
                          Dashboard
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Overview of your Hone setup and activity.
                        </p>
                      </div>
                    </div>

                    {/* Status Bar — inline compact indicators */}
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const hasKey =
                          (activeProvider === "openrouter" && openrouterKey.trim()) ||
                          (activeProvider === "openrouter_paid" && openrouterPaidKey.trim()) ||
                          (activeProvider === "openai" && openaiKey.trim()) ||
                          (activeProvider === "anthropic" && anthropicKey.trim()) ||
                          (activeProvider === "gemini" && geminiKey.trim()) ||
                          (activeProvider === "google_ai_studio" && googleAiStudioKey.trim());
                        return (
                          <button
                            onClick={() => setActiveTab("api")}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer outline-none",
                              hasKey
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                            )}
                          >
                            {hasKey ? <Check className="size-3 stroke-[2.5]" /> : <AlertCircle className="size-3" />}
                            {hasKey ? "API Connected" : "API Key Missing"}
                          </button>
                        );
                      })()}

                      <button
                        onClick={() => setActiveTab("shortcut")}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer outline-none",
                          dropdownShortcutKey
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                        )}
                      >
                        {dropdownShortcutKey ? <Check className="size-3 stroke-[2.5]" /> : <AlertCircle className="size-3" />}
                        {dropdownShortcutKey ? `Shortcut: ${getDropdownShortcutDisplay()}` : "No Shortcut Set"}
                      </button>

                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
                        "bg-secondary/40 text-muted-foreground"
                      )}>
                        <Info className="size-3" />
                        {hideDot ? "Trigger Dot Hidden" : "Trigger Dot Visible"}
                      </span>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Active Engine Card */}
                      <button
                        onClick={() => setActiveTab("api")}
                        className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border/80 transition-all duration-200 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <div className="p-2 rounded-lg bg-primary/8 text-primary shrink-0 mt-0.5">
                          <Key className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            AI Engine
                          </span>
                          <span className="text-sm font-semibold text-foreground mt-0.5 truncate">
                            {activeProvider === "openai" && "OpenAI Capable"}
                            {activeProvider === "anthropic" && "Anthropic Claude"}
                            {activeProvider === "gemini" && "Google Gemini"}
                            {activeProvider === "openrouter" && "OpenRouter Free"}
                            {activeProvider === "openrouter_paid" && "OpenRouter Paid"}
                            {activeProvider === "google_ai_studio" && "Google AI Studio"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate" title={
                            activeProvider === "openai" ? openaiModel :
                            activeProvider === "anthropic" ? anthropicModel :
                            activeProvider === "gemini" ? geminiModel :
                            activeProvider === "openrouter" ? openrouterModel || "google/gemma-4-26b-a4b-it:free" :
                            activeProvider === "openrouter_paid" ? openrouterPaidModel :
                            googleAiStudioModel
                          }>
                            {
                              activeProvider === "openai" ? openaiModel :
                              activeProvider === "anthropic" ? anthropicModel :
                              activeProvider === "gemini" ? geminiModel :
                              activeProvider === "openrouter" ? openrouterModel || "google/gemma-4-26b-a4b-it:free" :
                              activeProvider === "openrouter_paid" ? openrouterPaidModel :
                              googleAiStudioModel
                            }
                          </span>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200 mt-1 shrink-0" />
                      </button>

                      {/* Shortcut Card */}
                      <button
                        onClick={() => setActiveTab("shortcut")}
                        className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border/80 transition-all duration-200 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <div className="p-2 rounded-lg bg-primary/8 text-primary shrink-0 mt-0.5">
                          <Keyboard className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Actions Trigger
                          </span>
                          <span className="text-sm font-semibold text-foreground mt-0.5">
                            {getDropdownShortcutDisplay()}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Opens the actions menu
                          </span>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200 mt-1 shrink-0" />
                      </button>

                      {/* Transformations Card */}
                      <button
                        onClick={() => setActiveTab("history")}
                        className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border/80 transition-all duration-200 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <div className="p-2 rounded-lg bg-primary/8 text-primary shrink-0 mt-0.5">
                          <History className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Rewrites
                          </span>
                          <span className="text-sm font-semibold text-foreground mt-0.5">
                            {history.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Total transformations logged
                          </span>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200 mt-1 shrink-0" />
                      </button>

                      {/* Actions Card */}
                      <button
                        onClick={() => setActiveTab("actions")}
                        className="group flex items-start gap-3.5 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-border/80 transition-all duration-200 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <div className="p-2 rounded-lg bg-primary/8 text-primary shrink-0 mt-0.5">
                          <Wand2 className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Actions
                          </span>
                          <span className="text-sm font-semibold text-foreground mt-0.5">
                            {BUILTIN_SHORTCUT_ACTIONS.length + customActions.length}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {BUILTIN_SHORTCUT_ACTIONS.length} built-in · {customActions.length} custom
                          </span>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-200 mt-1 shrink-0" />
                      </button>
                    </div>

                    {/* Recent Activity */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-foreground">
                          Recent Activity
                        </h3>
                        {history.length > 0 && (
                          <button
                            onClick={() => setActiveTab("history")}
                            className="text-[10px] text-primary hover:text-primary/80 font-medium cursor-pointer outline-none transition-colors"
                          >
                            View all →
                          </button>
                        )}
                      </div>

                      {history.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-secondary/5">
                          <History className="size-7 text-muted-foreground/30 mb-2 stroke-[1.5]" />
                          <span className="text-xs text-muted-foreground/70">No rewrites yet</span>
                          <span className="text-[10px] text-muted-foreground/50 mt-0.5">
                            Select text on any page and run an action to get started.
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
                          {history.slice(0, 4).map((item) => (
                            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/5 transition-colors min-w-0">
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-medium text-foreground truncate">
                                    {getActionName(item.action)}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0">
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground/70 truncate leading-normal mt-0.5">
                                  {item.originalText}
                                </p>
                              </div>
                              <span className="text-[9px] text-muted-foreground/50 font-mono shrink-0 hidden sm:block">
                                {item.url.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 1: API Setup */}
                {activeTab === "api" && (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                    <div className="pb-4">
                      <h2 className="text-base font-semibold text-foreground">
                        API Providers
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select and configure the default AI engine to handle all of your web input transformations.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      {/* Active Provider Selector Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Active Provider
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Choose the service provider to run your transformations.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
                            ].map((prov) => (
                              <button
                                key={prov.id}
                                type="button"
                                onClick={() => setActiveProvider(prov.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-foreground/20
                            ${
                              activeProvider === prov.id
                                ? "bg-secondary/40 border-primary/40 text-foreground"
                                : "bg-transparent border-border/40 text-muted-foreground hover:bg-secondary/10 hover:text-foreground"
                            }`}
                              >
                                <div
                                  className={`size-3 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                                    activeProvider === prov.id
                                      ? "border-primary bg-primary/20 text-primary"
                                      : "border-muted-foreground/30"
                                  }`}
                                >
                                  {activeProvider === prov.id && (
                                    <div className="size-1.5 rounded-full bg-primary" />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span
                                    className={`text-[11px] font-semibold transition-colors ${
                                      activeProvider === prov.id
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {prov.label}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground mt-0.5 leading-normal">
                                    {prov.desc}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Info Notice Block */}
                      {activeProvider === "openrouter" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                          <div className="md:col-span-3">
                            <div className="bg-secondary/10 border border-border/40 rounded-lg p-4 flex gap-3 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                              <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                              <div>
                                A free OpenRouter API key is required (create
                                one at <strong>openrouter.ai</strong>). Select
                                your <strong>preferred starting model</strong>;
                                if it fails, the extension tries all other free
                                models — cycling through the full list up to{" "}
                                <strong>3 times</strong> before giving up.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeProvider === "openrouter_paid" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                          <div className="md:col-span-3">
                            <div className="bg-secondary/10 border border-border/40 rounded-lg p-4 flex gap-3 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                              <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                              <div>
                                Enter any model identifier available on{" "}
                                <strong>openrouter.ai</strong> — paid or
                                otherwise. Your API key must have sufficient
                                credits for the chosen model.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeProvider === "google_ai_studio" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                          <div className="md:col-span-3">
                            <div className="bg-secondary/10 border border-border/40 rounded-lg p-4 flex gap-3 text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-200">
                              <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                              <div>
                                Uses <strong>@google/genai</strong> SDK with
                                thinking config (MINIMAL). Get a free API key
                                from <strong>aistudio.google.com</strong> —
                                generous free tier. Supports Gemma models like{" "}
                                <span className="font-mono">
                                  gemma-4-26b-a4b-it
                                </span>
                                .
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* API Key Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            {activeProvider === "openrouter" && "OpenRouter API Key"}
                            {activeProvider === "openrouter_paid" && "OpenRouter API Key"}
                            {activeProvider === "openai" && "OpenAI Capable API Key"}
                            {activeProvider === "anthropic" && "Anthropic API Key"}
                            {activeProvider === "gemini" && "Gemini API Key"}
                            {activeProvider === "google_ai_studio" && "Google AI Studio API Key"}
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {activeProvider === "openrouter" && "Credentials for openrouter.ai free tier access."}
                            {activeProvider === "openrouter_paid" && "Credentials for openrouter.ai paid tier access."}
                            {activeProvider === "openai" && "Authentication key for OpenAI or any compatible custom gateway."}
                            {activeProvider === "anthropic" && "Key generated in Anthropic Developer Console."}
                            {activeProvider === "gemini" && "API Key generated in Google AI Studio."}
                            {activeProvider === "google_ai_studio" && "API key from aistudio.google.com."}
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
                              if (activeProvider === "openrouter") setOpenrouterKey(val);
                              else if (activeProvider === "openrouter_paid") setOpenrouterPaidKey(val);
                              else if (activeProvider === "openai") setOpenaiKey(val);
                              else if (activeProvider === "anthropic") setAnthropicKey(val);
                              else if (activeProvider === "gemini") setGeminiKey(val);
                              else setGoogleAiStudioKey(val);
                            }}
                            required={activeProvider === "openrouter"}
                            className="w-full bg-background border border-border/80 rounded-lg text-xs placeholder:text-muted-foreground/50 h-9"
                          />
                        </div>
                      </div>

                      {/* Model Engine Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            {activeProvider === "openrouter" ? "Preferred Starting Model" : "Model Engine"}
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {activeProvider === "openrouter" && "First fallback target. Error cycles others automatically."}
                            {activeProvider === "openrouter_paid" && "Model slug available on openrouter.ai/models."}
                            {activeProvider === "openai" && "Model identifier target (e.g. gpt-4o-mini)."}
                            {activeProvider === "anthropic" && "Model name identifier (e.g. claude-3-5-sonnet-latest)."}
                            {activeProvider === "gemini" && "Target Gemini model engine version."}
                            {activeProvider === "google_ai_studio" && "Gemini or Gemma model engine string."}
                          </p>
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-2">
                          {activeProvider === "openrouter" ? (
                            <Select
                              value={openrouterModel}
                              onValueChange={(val) => setOpenrouterModel(val)}
                            >
                              <SelectTrigger className="bg-background border border-border/80 rounded-lg text-xs h-9 justify-between w-full">
                                <SelectValue placeholder="Select starting model..." />
                              </SelectTrigger>
                              <SelectContent className="bg-card border border-border rounded-lg shadow-md">
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
                              <SelectTrigger className="bg-background border border-border/80 rounded-lg text-xs h-9 justify-between w-full">
                                <SelectValue placeholder="Select model..." />
                              </SelectTrigger>
                              <SelectContent className="bg-card border border-border rounded-lg shadow-md">
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
                                if (activeProvider === "openrouter_paid") setOpenrouterPaidModel(val);
                                else if (activeProvider === "openai") setOpenaiModel(val);
                                else if (activeProvider === "anthropic") setAnthropicModel(val);
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
                              className="bg-background border border-border/80 rounded-lg text-xs h-9 font-mono w-full"
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
                              Use any model slug from openrouter.ai/models — e.g. <span className="font-mono">openai/gpt-4o</span>.
                            </p>
                          )}
                          {activeProvider === "google_ai_studio" && (
                            <p className="text-[10px] text-muted-foreground/60 leading-normal">
                              Supports any model accessible via the Gemini API — e.g. <span className="font-mono">gemma-4-26b-a4b-it</span>.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Custom API Endpoint (Only for OpenAI) */}
                      {activeProvider === "openai" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                          <div className="pr-4">
                            <Label className="text-xs font-semibold text-foreground">
                              Custom API Endpoint
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Custom base target URL for OpenAI-compatible proxy, gateway, or local instance.
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              type="text"
                              value={openaiEndpoint}
                              onChange={(e) => setOpenaiEndpoint(e.target.value)}
                              placeholder="https://api.openai.com/v1"
                              className="bg-background border border-border/80 rounded-lg text-xs h-9 w-full"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* TAB 2: Keyboard Shortcuts */}
                {activeTab === "shortcut" && (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                    <div className="pb-4">
                      <h2 className="text-base font-semibold text-foreground">
                        Key Bindings
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure fast global and contextual keyboard shortcuts to trigger your text transformations on any webpage.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      {/* Active Key Combination Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Text Transformation Shortcut
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Combination to execute the chosen transformation action instantly on your focused or highlighted text.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex gap-3 items-center">
                            <div className="bg-background border border-border/80 rounded-lg px-4 py-3.5 text-xs text-center flex-1 font-mono font-bold text-foreground flex items-center justify-center gap-2 select-none min-h-[50px]">
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
                              Record Combination
                            </MaterialDesign3Button>
                          </div>
                        </div>
                      </div>

                      {/* Shortcut Action Trigger Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Shortcut Trigger Action
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Action that will run when the text transformation key combination is pressed.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Select
                            value={shortcutAction}
                            onValueChange={(val) => setShortcutAction(val)}
                          >
                            <SelectTrigger className="bg-background border border-border/80 rounded-lg text-xs h-9 justify-between w-full">
                              <SelectValue placeholder="Select shortcut action..." />
                            </SelectTrigger>
                            <SelectContent className="bg-card border border-border rounded-lg shadow-md max-h-72">
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

                          <div className="bg-secondary/15 border border-border/40 rounded-lg p-4 flex gap-3 text-xs text-muted-foreground leading-normal mt-4 animate-in fade-in duration-200">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                            <div>
                              <strong>Pro Tip:</strong> Pressing this combination
                              while focusing on any input or textarea on any
                              webpage will extract the selected text (or all text
                              if nothing is selected) and replace it with the
                              corrected version from your active AI provider.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Menu Toggle Shortcut Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Menu Toggle Shortcut
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Key combination to trigger the contextual dropdown helper menu on active inputs.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex gap-3 items-center">
                            <div className="bg-background border border-border/80 rounded-lg px-4 py-3.5 text-xs text-center flex-1 font-mono font-bold text-foreground flex items-center justify-center gap-2 select-none min-h-[50px]">
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
                              Record Combination
                            </MaterialDesign3Button>
                          </div>
                        </div>
                      </div>

                      {/* Overlay Settings Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-b border-border/40">
                        <div className="pr-4">
                          <Label className="text-xs font-semibold text-foreground">
                            Overlay Visuals
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Configure how Hone visual elements present themselves in inputs.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between border border-border/40 bg-secondary/10 rounded-xl p-4">
                            <div className="flex flex-col gap-1 pr-4">
                              <Label className="text-xs font-semibold text-foreground">
                                Hide Sparkle Trigger Dot
                              </Label>
                              <span className="text-[11px] text-muted-foreground leading-normal">
                                Completely hide the purple sparkle float button
                                from webpage inputs. You will still be able to
                                open the dropdown menu anytime by focusing an
                                input and pressing your dropdown shortcut.
                              </span>
                            </div>
                            <MaterialDesign3Switch
                              variant="primary"
                              size="default"
                              checked={hideDot}
                              onCheckedChange={(checked) => setHideDot(checked)}
                              haptic="none"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 3: History Viewer — absolutely positioned to escape the scroll wrapper */}
                {activeTab === "history" && (
                  <div className="absolute inset-0 flex flex-col animate-in fade-in duration-200 bg-card rounded-lg z-10">
                    {/* Fixed Floating Topbar */}
                    <div className="shrink-0 px-5 py-3.5 border-b border-border/40 flex items-center gap-3 bg-card rounded-t-lg">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-foreground">Rewrite History</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Review past Hone transformations, text replacements, and copies.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
                          <Input
                            type="text"
                            placeholder="Search history..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="pl-8 pr-7 h-8 text-xs bg-background border border-border/60 rounded-lg w-52"
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
                            onClick={handleClearAllHistory}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear All
                          </MaterialDesign3Button>
                        )}
                      </div>
                    </div>

                    {/* Virtualized List */}
                    <div ref={historyParentRef} className="flex-1 min-h-0 overflow-y-auto">
                      {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2.5">
                          <History className="w-8 h-8 text-muted-foreground/60" />
                          <p className="text-muted-foreground text-xs font-medium">
                            {historySearch ? "No results found." : "No transformations recorded yet."}
                          </p>
                          <p className="text-muted-foreground/60 text-[10px]">
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
                          {historyVirtualizer.getVirtualItems().map((virtualItem) => {
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
                                  className="w-full h-full flex items-center gap-4 px-5 border-b border-border/20 hover:bg-secondary/10 transition-colors text-left group"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0 py-2.5">
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] font-mono border-border shrink-0 py-0"
                                    >
                                      {getActionName(item.action)}
                                    </Badge>
                                    <span className="text-xs text-foreground/80 truncate leading-normal flex-1">
                                      {item.rewrittenText}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                    <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap">
                                      {new Date(item.timestamp).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
                                      View details →
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
                    <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                      <DialogContent className="max-w-2xl w-full">
                        {selectedHistoryItem && (
                          <>
                            {/* Title bar */}
                            <DialogTitle>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] font-mono border-border">
                                    {getActionName(selectedHistoryItem.action)}
                                  </Badge>
                                  <span className="text-sm font-semibold">Transformation Details</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setHistoryDialogOpen(false);
                                    setSelectedHistoryItem(null);
                                  }}
                                  className="text-muted-foreground/50 hover:text-foreground transition-colors rounded-lg p-1 hover:bg-secondary/20"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </DialogTitle>

                            {/* Body */}
                            <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
                              {/* Metadata */}
                              <div className="flex flex-wrap gap-2 text-[11px]">
                                <span className="px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground font-mono bg-secondary/10">
                                  {selectedHistoryItem.provider} · {selectedHistoryItem.model}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground bg-secondary/10">
                                  {new Date(selectedHistoryItem.timestamp).toLocaleString()}
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
                                <div className="flex flex-col gap-1.5 bg-secondary/10 border border-border/40 p-4 rounded-xl">
                                  <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">
                                    Original
                                  </span>
                                  <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto pr-1">
                                    {selectedHistoryItem.originalText}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5 bg-secondary/10 border border-border/40 p-4 rounded-xl">
                                  <span className="text-[9px] text-foreground uppercase font-semibold tracking-wide">
                                    Rewritten
                                  </span>
                                  <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto pr-1">
                                    {selectedHistoryItem.rewrittenText}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
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
                                  Delete Entry
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
                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  Copy Rewritten
                                </MaterialDesign3Button>
                              </div>
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* TAB 4: Actions Studio */}
                {activeTab === "actions" && (
                  <div className="absolute inset-0 flex overflow-hidden animate-in fade-in duration-200 rounded-lg z-10">
                    {/* Left: action list sidebar */}
                    <div className="w-72 shrink-0 flex flex-col gap-4 border-r border-border/40 p-6 pr-6 overflow-y-auto">
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <h2 className="text-base font-semibold text-foreground">Actions Studio</h2>
                        <p className="text-xs text-muted-foreground">
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
                        {customActions.map((ca) => {
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
                              className={cn(
                                "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 group relative",
                                isSelected
                                  ? "bg-secondary/15 border-foreground/30 shadow-sm"
                                  : "bg-transparent border-transparent hover:bg-secondary/10 hover:border-border/30"
                              )}
                            >
                              {/* Active indicator bar */}
                              {isSelected && (
                                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-md bg-foreground" />
                              )}

                              {/* Icon container with translucent background */}
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                                style={{
                                  backgroundColor: `${actionColor}1A`, // 10% opacity
                                  border: `1px solid ${actionColor}33`, // 20% opacity border
                                }}
                              >
                                {renderActionIcon(ca.icon, {
                                  size: 15,
                                  color: actionColor,
                                })}
                              </div>

                              {/* Title and prompt template preview */}
                              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span className={cn(
                                  "text-xs font-semibold truncate transition-colors",
                                  isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>
                                  {ca.name || "Untitled Action"}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 truncate leading-normal">
                                  {ca.description || ca.promptTemplate || "No description"}
                                </span>
                              </div>
                            </button>
                          );
                        })}

                        {customActions.length === 0 && (
                          <div className="text-center py-10 flex flex-col items-center justify-center gap-2">
                            <p className="text-[11px] text-muted-foreground/60 leading-normal">
                              No custom actions created yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: action editor panel */}
                    <div className="flex-1 min-w-0 h-full flex flex-col p-6 overflow-hidden">
                      {!editingAction ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6 border border-dashed border-border/60 rounded-2xl bg-secondary/5 animate-in fade-in duration-200">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-3">
                            <Wand2 className="w-6 h-6 text-muted-foreground/80 animate-pulse" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">Select or Create an Action</h3>
                          <p className="text-xs text-muted-foreground/75 mt-1.5 max-w-xs leading-normal">
                            Choose an action from the list on the left to edit its template, or click "Create New Action" to build your own custom text transformation.
                          </p>
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!editingAction) return;
                            await saveCustomAction({
                              ...editingAction,
                              icon: normalizeActionIconName(
                                editingAction.icon,
                              ),
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
                          className="flex-1 flex flex-col min-h-0 bg-card rounded-2xl border border-border/40 overflow-hidden shadow-sm animate-in fade-in duration-200"
                        >
                          {/* Sticky Sub-Header Action Bar */}
                          <div className="sticky top-0 z-20 px-6 py-4 bg-card border-b border-border/40 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${editingAction.color || "#8B5CF6"}1A`,
                                  border: `1px solid ${editingAction.color || "#8B5CF6"}33`,
                                }}
                              >
                                {renderActionIcon(editingAction.icon, {
                                  size: 14,
                                  color: editingAction.color || "#8B5CF6",
                                })}
                              </div>
                              <div className="min-w-0 flex flex-col">
                                <h3 className="text-sm font-semibold text-foreground truncate">
                                  {editingAction.name || "New Action"}
                                </h3>
                                <p className="text-[10px] text-muted-foreground/60 truncate">
                                  {isNewAction ? "Creating custom transformation" : "Editing action parameters"}
                                </p>
                              </div>
                            </div>

                            {/* Header actions (Enabled status, Delete, Save) */}
                            <div className="flex items-center gap-3.5 shrink-0">
                              {/* Enabled status switch */}
                              <div className="flex items-center gap-2 border border-border/40 bg-secondary/10 rounded-lg px-3 py-1">
                                <span className="text-[10px] font-semibold text-muted-foreground">Enabled</span>
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
                                    await deleteCustomAction(
                                      editingAction.id,
                                    );
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

                          {/* Scrollable Form Fields */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Group 1: Identity & Visuals */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/40">
                              <div className="pr-4">
                                <Label className="text-xs font-semibold text-foreground">
                                  Identity & Visuals
                                </Label>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                  Define the name, description, and visual representation of your action.
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
                                    placeholder={CUSTOM_ACTION_PLACEHOLDERS.name}
                                    value={editingAction.name}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        name: e.target.value,
                                      })
                                    }
                                    className="bg-background border border-border/80 rounded-lg text-xs h-9"
                                    required
                                  />
                                </div>

                                {/* Description Input */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    Description <span className="text-muted-foreground/50">(Optional)</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    placeholder={CUSTOM_ACTION_PLACEHOLDERS.description}
                                    value={editingAction.description || ""}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        description: e.target.value,
                                      })
                                    }
                                    className="bg-background border border-border/80 rounded-lg text-xs h-9"
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
                                      accentColor={editingAction.color || "#8B5CF6"}
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
                                            "h-6 w-6 rounded-full border p-0 transition-transform hover:scale-105 shrink-0",
                                            editingAction.color === c
                                              ? "border-foreground scale-110 ring-2 ring-foreground/25"
                                              : "border-transparent"
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/40">
                              <div className="pr-4">
                                <Label className="text-xs font-semibold text-foreground">
                                  AI Parameters
                                </Label>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                  Configure the AI brain, parameter constraints, and inline behaviour.
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
                                      value={editingAction.provider || "__default__"}
                                      onValueChange={(val) =>
                                        setEditingAction({
                                          ...editingAction,
                                          provider: val === "__default__" ? undefined : val,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-9 w-full justify-between rounded-lg border-border/80 bg-background text-xs">
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
                                      className="bg-background border border-border/80 rounded-lg text-xs h-9"
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
                                      className="bg-background border border-border/80 rounded-lg text-xs h-9"
                                    />
                                  </div>
                                </div>

                                {/* Replace Mode Switch */}
                                <div className="flex items-center justify-between border border-border/40 bg-secondary/10 rounded-xl p-4">
                                  <div className="flex flex-col gap-0.5 pr-4">
                                    <Label className="text-xs font-semibold text-foreground">
                                      Preview before replacing
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground leading-normal">
                                      Show the transformation in a preview panel instead of replacing text immediately inline.
                                    </span>
                                  </div>
                                  <MaterialDesign3Switch
                                    variant="primary"
                                    size="default"
                                    checked={editingAction.replaceMode === "preview"}
                                    onCheckedChange={(checked) =>
                                      setEditingAction({
                                        ...editingAction,
                                        replaceMode: checked ? "preview" : "replace",
                                      })
                                    }
                                    haptic="none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Group 3: Prompt Templates */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/40">
                              <div className="pr-4">
                                <Label className="text-xs font-semibold text-foreground">
                                  Instructions & Prompts
                                </Label>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                  Draft system context and prompt templates. Predefined variables will be populated dynamically.
                                </p>
                              </div>

                              <div className="md:col-span-2 space-y-4">
                                {/* System Prompt Textarea */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    System Prompt <span className="text-muted-foreground/50">(Optional)</span>
                                  </Label>
                                  <Textarea
                                    placeholder={CUSTOM_ACTION_PLACEHOLDERS.systemPrompt}
                                    value={editingAction.systemPrompt || ""}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        systemPrompt: e.target.value,
                                      })
                                    }
                                    className="min-h-[70px] resize-y font-mono text-xs leading-normal"
                                  />
                                </div>

                                {/* Prompt Template Textarea */}
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-[10px] font-semibold text-muted-foreground">
                                    Prompt Template
                                  </Label>
                                  <Textarea
                                    placeholder={CUSTOM_ACTION_PLACEHOLDERS.promptTemplate}
                                    value={editingAction.promptTemplate}
                                    onChange={(e) =>
                                      setEditingAction({
                                        ...editingAction,
                                        promptTemplate: e.target.value,
                                      })
                                    }
                                    className="min-h-[130px] resize-y font-mono text-xs leading-normal"
                                    required
                                  />
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 mt-0.5">
                                    <span className="font-semibold bg-secondary/15 px-1.5 py-0.5 rounded text-foreground font-mono">{"{{input}}"}</span>
                                    <span>represents the selected text target undergoing rewriting.</span>
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
                                  <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                    Test transformations instantly with sample text inputs.
                                  </p>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                  <div className="flex flex-col gap-2.5">
                                    <Textarea
                                      placeholder={CUSTOM_ACTION_PLACEHOLDERS.testInput}
                                      value={testInput}
                                      onChange={(e) =>
                                        setTestInput(e.target.value)
                                      }
                                      className="min-h-[70px] resize-y font-mono text-xs"
                                    />

                                    <div>
                                      <MaterialDesign3Button
                                        variant="default"
                                        size="sm"
                                        shape="round"
                                        type="button"
                                        disabled={!testInput.trim() || testLoading}
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
                                            if (response?.success && response.text) {
                                              setTestResult(response.text);
                                            } else {
                                              setTestResult(
                                                `Error: ${response?.error || "Unknown error"}`,
                                              );
                                            }
                                          } catch (err: any) {
                                            setTestResult(`Error: ${err.message}`);
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
                                            Run Test pad
                                          </>
                                        )}
                                      </MaterialDesign3Button>
                                    </div>
                                  </div>

                                  {testResult && (
                                    <div className="bg-secondary/5 border border-border/40 p-4 rounded-xl space-y-1.5">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide">
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
