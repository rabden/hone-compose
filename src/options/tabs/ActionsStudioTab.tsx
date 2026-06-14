import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { Switch as MaterialDesign3Switch } from "@/components/ui/material-design-3-switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionIconSelect } from "@/components/action-icon-select";
import {
  DEFAULT_ACTION_ICON,
  normalizeActionIconName,
  renderActionIcon,
} from "@/lib/action-icons";
import { CUSTOM_ACTION_PLACEHOLDERS } from "@/lib/shortcuts";
import {
  saveActionConfig,
  saveAllActionConfigs,
  deleteActionConfig,
  loadAllActionConfigs,
} from "../../content/storage";
import { BUILTIN_ACTION_DEFAULTS } from "../../content/builtin-defaults";
import type { CustomAction } from "../../content/storage";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/material-dialog";
import { SwitchCard } from "@/components/ui/switch-card";
import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock";
import type { ExpandingSearchDockHandle } from "@/components/ui/expanding-search-dock";
import { Ripple } from "@/components/ui/ripple";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";

import { Badge, BadgeGroup } from "@/components/ui/badge";

import {
  Plus,
  Wand2,
  Save,
  Trash2,
  Play,
  Info,
  ArrowLeft,
  RotateCcw,
  Store,
  RefreshCw,
  AlertCircle,
  PackageCheck,
  Download,
  ChevronLeft,
  Search,
  ArrowUpRight,
} from "lucide-react";

// ── Marketplace types ──
interface RegistryAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  author: string;
  tags: string[];
  path: string;
}

interface Registry {
  schemaVersion: number;
  actions: RegistryAction[];
}

const ACTION_PROVIDER_OPTIONS = [
  { value: "__default__", label: "Use global default" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },

  { value: "openrouter", label: "OpenRouter Free" },
  { value: "openrouter_paid", label: "OpenRouter Paid" },
  { value: "google_ai_studio", label: "Google AI Studio" },
  { value: "groq", label: "Groq" },
] as const;

interface ActionsStudioTabProps {
  actionConfigs: CustomAction[];
  setActionConfigs: (configs: CustomAction[]) => void;
  editingAction: CustomAction | null;
  setEditingAction: (action: CustomAction | null) => void;
  isNewAction: boolean;
  setIsNewAction: (val: boolean) => void;
  testInput: string;
  setTestInput: (val: string) => void;
  testResult: string;
  setTestResult: (val: string) => void;
  testLoading: boolean;
  setTestLoading: (val: boolean) => void;
  triggerSaveStatus: (message: string, type: "success" | "error") => void;
}

export default function ActionsStudioTab({
  actionConfigs,
  setActionConfigs,
  editingAction,
  setEditingAction,
  isNewAction,
  setIsNewAction,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  testLoading,
  setTestLoading,
  triggerSaveStatus,
}: ActionsStudioTabProps) {
  const [viewMode, setViewMode] = useState<
    "overview" | "editor" | "marketplace"
  >("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Marketplace state
  const [marketplaceRegistry, setMarketplaceRegistry] =
    useState<Registry | null>(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [selectedMarketplaceAction, setSelectedMarketplaceAction] =
    useState<RegistryAction | null>(null);
  const [marketplaceDetailOpen, setMarketplaceDetailOpen] = useState(false);
  const marketplaceHeaderRef = useRef<HTMLDivElement>(null);
  const marketplaceSearchRef = useRef<ExpandingSearchDockHandle>(null);
  const [showMarketplaceFloatingBar, setShowMarketplaceFloatingBar] =
    useState(false);

  useEffect(() => {
    const el = marketplaceHeaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMarketplaceFloatingBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const builtinConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "builtin"),
    [actionConfigs],
  );
  const customConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "custom" || !a.type),
    [actionConfigs],
  );
  const marketplaceConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "marketplace"),
    [actionConfigs],
  );

  const handleOpenEditor = (action: CustomAction | null) => {
    if (action) {
      setEditingAction(action);
      setIsNewAction(false);
    } else {
      setEditingAction({
        id: crypto.randomUUID(),
        name: "",
        description: "",
        promptTemplate: "",
        systemPrompt: "",
        icon: DEFAULT_ACTION_ICON,
        color: "#8B5CF6",
        type: "custom",
        category: "custom",
        replaceMode: "replace",
        enabled: true,
        createdAt: Date.now(),
      });
      setIsNewAction(true);
    }
    setViewMode("editor");
  };

  const handleBackToOverview = () => {
    setEditingAction(null);
    setIsNewAction(false);
    setViewMode("overview");
  };

  const handleSave = async () => {
    if (!editingAction) return;
    const updated = {
      ...editingAction,
      icon: normalizeActionIconName(editingAction.icon),
      color: editingAction.color || "#8B5CF6",
    };
    await saveActionConfig(updated);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    setIsNewAction(false);
    triggerSaveStatus("Action saved successfully!", "success");
  };

  const handleResetBuiltin = async () => {
    if (!editingAction || editingAction.type !== "builtin") return;
    const defaults = await loadAllActionConfigs();
    const defaultAction = BUILTIN_ACTION_DEFAULTS.find(
      (d) => d.id === editingAction.id,
    );
    if (!defaultAction) return;
    const idx = defaults.findIndex((a) => a.id === editingAction.id);
    if (idx >= 0) {
      defaults[idx] = { ...defaultAction };
    } else {
      defaults.push({ ...defaultAction });
    }
    await saveAllActionConfigs(defaults);
    setActionConfigs(defaults);
    setEditingAction({ ...defaultAction });
    triggerSaveStatus("Action reset to defaults.", "success");
  };

  const handleDelete = async () => {
    if (!editingAction) return;
    await deleteActionConfig(editingAction.id);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    setEditingAction(null);
    setViewMode("overview");
    setDeleteDialogOpen(false);
    triggerSaveStatus("Action deleted.", "success");
  };

  const fetchMarketplace = useCallback(async (forceRefresh = false) => {
    setMarketplaceLoading(true);
    setMarketplaceError(null);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: "MARKETPLACE_FETCH_REGISTRY",
        forceRefresh,
      })) as { success: boolean; registry?: Registry; error?: string };
      if (response?.success && response.registry) {
        setMarketplaceRegistry(response.registry);
      } else {
        setMarketplaceError(response?.error || "Failed to load marketplace.");
      }
    } catch (err) {
      setMarketplaceError(
        err instanceof Error ? err.message : "Failed to load marketplace.",
      );
    } finally {
      setMarketplaceLoading(false);
    }
  }, []);

  const handleOpenMarketplace = useCallback(() => {
    if (!marketplaceRegistry) {
      setMarketplaceLoading(true);
      void fetchMarketplace();
    }
    setViewMode("marketplace");
  }, [marketplaceRegistry, fetchMarketplace]);

  const handleInstallAction = useCallback(
    async (registryAction: RegistryAction) => {
      setInstallingId(registryAction.id);
      try {
        const response = (await chrome.runtime.sendMessage({
          type: "MARKETPLACE_INSTALL_ACTION",
          sourceId: registryAction.id,
          path: registryAction.path,
        })) as { success: boolean; error?: string };
        if (response?.success) {
          const all = await loadAllActionConfigs();
          setActionConfigs(all);
          triggerSaveStatus(`"${registryAction.name}" installed!`, "success");
        } else {
          triggerSaveStatus(response?.error || "Install failed.", "error");
        }
      } catch (err) {
        triggerSaveStatus(
          err instanceof Error ? err.message : "Install failed.",
          "error",
        );
      } finally {
        setInstallingId(null);
      }
    },
    [setActionConfigs, triggerSaveStatus],
  );

  const handleUpdateAction = useCallback(
    async (registryAction: RegistryAction) => {
      setInstallingId(registryAction.id);
      try {
        // Find the installed action to preserve enabled state
        const installed = actionConfigs.find(
          (a) => a.sourceId === registryAction.id || a.id === registryAction.id,
        );
        const response = (await chrome.runtime.sendMessage({
          type: "MARKETPLACE_INSTALL_ACTION",
          sourceId: registryAction.id,
          path: registryAction.path,
        })) as { success: boolean; error?: string };
        if (response?.success) {
          // Restore the user's enabled state after update
          if (installed && installed.enabled === false) {
            const all = await loadAllActionConfigs();
            const idx = all.findIndex((a) => a.id === registryAction.id);
            if (idx >= 0) {
              all[idx] = { ...all[idx], enabled: false };
              await saveActionConfig(all[idx]);
            }
          }
          const all = await loadAllActionConfigs();
          setActionConfigs(all);
          triggerSaveStatus(`"${registryAction.name}" updated!`, "success");
        } else {
          triggerSaveStatus(response?.error || "Update failed.", "error");
        }
      } catch (err) {
        triggerSaveStatus(
          err instanceof Error ? err.message : "Update failed.",
          "error",
        );
      } finally {
        setInstallingId(null);
      }
    },
    [actionConfigs, setActionConfigs, triggerSaveStatus],
  );

  // Fetch marketplace when switching to marketplace view
  useEffect(() => {
    if (
      viewMode === "marketplace" &&
      !marketplaceRegistry &&
      !marketplaceLoading
    ) {
      void fetchMarketplace();
    }
  }, [viewMode, marketplaceRegistry, marketplaceLoading, fetchMarketplace]);

  if (viewMode === "marketplace") {
    const filteredActions =
      marketplaceRegistry?.actions.filter((a) => {
        if (!marketplaceSearch.trim()) return true;
        const q = marketplaceSearch.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
        );
      }) ?? [];

    return (
      <div
        key="marketplace"
        data-marketplace-scroll
        className="flex flex-col animate-in slide-in-from-bottom-3 duration-300 ease-out w-full py-4 mx-auto max-w-4xl"
      >
        <div
          className={cn(
            "sticky top-0 z-40 h-0 overflow-visible pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          )}
        >
          <div
            className={cn(
              "pointer-events-auto bg-card border border-border/40 shadow-lg rounded-full p-4 pl-8 flex items-center justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              showMarketplaceFloatingBar
                ? "translate-y-1 opacity-100"
                : "-translate-y-full opacity-0",
            )}
          >
            <span className="text-sm font-light text-foreground">
              Action Marketplace
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const el = document.querySelector(
                    "[data-marketplace-scroll]",
                  );
                  el?.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => marketplaceSearchRef.current?.expand(), 200);
                }}
                className="relative overflow-hidden flex h-8 w-8 items-center justify-center rounded-full bg-background hover:bg-muted transition-colors"
                aria-label="Search actions"
              >
                <Ripple />
                <Search className="w-3.5 h-3.5 text-muted-foreground relative z-10 pointer-events-none" />
              </button>
              <MaterialDesign3Button
                variant="ghost"
                size="sm"
                shape="round"
                onClick={() => setViewMode("overview")}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </MaterialDesign3Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-10">
          <div ref={marketplaceHeaderRef} className="space-y-3">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Marketplace
            </span>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                  Action Marketplace
                </h1>
                <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed mt-1">
                  Browse and install community-built actions from the public
                  registry.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-1">
                <ExpandingSearchDock
                  ref={marketplaceSearchRef}
                  onSearch={setMarketplaceSearch}
                  placeholder="Search actions by name, description, or tags…"
                />
                <MaterialDesign3Button
                  variant="ghost"
                  size="sm"
                  shape="round"
                  onClick={() => setViewMode("overview")}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </MaterialDesign3Button>
              </div>
            </div>
          </div>

          <MarketplaceContent
            loading={marketplaceLoading || !marketplaceRegistry}
            error={marketplaceError}
            registry={marketplaceRegistry}
            filteredActions={filteredActions}
            marketplaceSearch={marketplaceSearch}
            actionConfigs={actionConfigs}
            installingId={installingId}
            onInstall={handleInstallAction}
            onUpdate={handleUpdateAction}
            onActionClick={(action) => {
              setSelectedMarketplaceAction(action);
              setMarketplaceDetailOpen(true);
            }}
            onRetry={() => fetchMarketplace(true)}
          />

          <Dialog
            open={marketplaceDetailOpen}
            onOpenChange={setMarketplaceDetailOpen}
          >
            <DialogContent className="max-w-lg w-full" onOpened={() => {}}>
              {selectedMarketplaceAction && (
                <>
                  <DialogTitle>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${selectedMarketplaceAction.color || "#8B5CF6"}1A`,
                          border: `1px solid ${selectedMarketplaceAction.color || "#8B5CF6"}33`,
                        }}
                      >
                        {renderActionIcon(selectedMarketplaceAction.icon, {
                          size: 16,
                          color: selectedMarketplaceAction.color || "#8B5CF6",
                        })}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {selectedMarketplaceAction.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {selectedMarketplaceAction.author && (
                            <>by {selectedMarketplaceAction.author} · </>
                          )}
                          v{selectedMarketplaceAction.version}
                        </span>
                      </div>
                    </div>
                  </DialogTitle>

                  <div className="px-6 pb-5 flex flex-col gap-5">
                    {selectedMarketplaceAction.tags.length > 0 && (
                      <BadgeGroup>
                        {selectedMarketplaceAction.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </BadgeGroup>
                    )}

                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      {selectedMarketplaceAction.description}
                    </p>

                    <div className="flex justify-end pt-2">
                      {(() => {
                        const installed = actionConfigs.find(
                          (c) =>
                            c.sourceId === selectedMarketplaceAction.id ||
                            c.id === selectedMarketplaceAction.id,
                        );
                        const isInstalling =
                          installingId === selectedMarketplaceAction.id;
                        const hasUpdate =
                          installed &&
                          installed.version !==
                            selectedMarketplaceAction.version;

                        if (hasUpdate) {
                          return (
                            <MaterialDesign3Button
                              variant="ghost"
                              size="sm"
                              shape="round"
                              type="button"
                              disabled={isInstalling}
                              onClick={() => {
                                handleUpdateAction(selectedMarketplaceAction);
                                setMarketplaceDetailOpen(false);
                              }}
                            >
                              {isInstalling ? (
                                <span className="flex items-center gap-1.5">
                                  <DotmSquare12 />
                                  Updating…
                                </span>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" />
                                  Update
                                </>
                              )}
                            </MaterialDesign3Button>
                          );
                        }

                        if (installed) {
                          return (
                            <MaterialDesign3Button
                              variant="destructive"
                              size="sm"
                              shape="round"
                              type="button"
                              onClick={async () => {
                                await deleteActionConfig(
                                  selectedMarketplaceAction.id,
                                );
                                const all = await loadAllActionConfigs();
                                setActionConfigs(all);
                                setMarketplaceDetailOpen(false);
                                triggerSaveStatus(
                                  `"${selectedMarketplaceAction.name}" uninstalled.`,
                                  "success",
                                );
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Uninstall
                            </MaterialDesign3Button>
                          );
                        }

                        return (
                          <MaterialDesign3Button
                            variant="default"
                            size="sm"
                            shape="round"
                            type="button"
                            disabled={isInstalling}
                            onClick={() => {
                              handleInstallAction(selectedMarketplaceAction);
                              setMarketplaceDetailOpen(false);
                            }}
                          >
                            {isInstalling ? (
                              <span className="flex items-center gap-1.5">
                                <DotmSquare12 />
                                Installing…
                              </span>
                            ) : (
                              <>
                                <Download className="w-3 h-3" />
                                Install
                              </>
                            )}
                          </MaterialDesign3Button>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (viewMode === "overview") {
    return (
      <div
        key="overview"
        className="flex flex-col gap-10 animate-in slide-in-from-bottom-3 duration-300 ease-out w-full py-4 mx-auto max-w-4xl"
      >
        <div className="space-y-3">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Editor
          </span>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                Actions Studio
              </h1>
              <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed mt-1">
                Manage all AI text transformation actions — built-in and custom.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <MaterialDesign3Button
                variant="ghost"
                size="default"
                shape="round"
                onClick={handleOpenMarketplace}
              >
                <Store className="w-3.5 h-3.5" />
                Browse Marketplace
              </MaterialDesign3Button>
              <MaterialDesign3Button
                variant="default"
                size="default"
                shape="round"
                onClick={() => handleOpenEditor(null)}
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Action
              </MaterialDesign3Button>
            </div>
          </div>
        </div>

        {actionConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 animate-in fade-in duration-500">
            <Wand2 className="w-7 h-7 text-muted-foreground/20 stroke-[1]" />
            <p className="text-muted-foreground text-xs font-medium">
              No actions found.
            </p>
            <p className="text-muted-foreground/50 text-[10px]">
              Click "Create New Action" above to build your first
              transformation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {builtinConfigs.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
                  Built-in Actions
                </span>
                <ActionCardGrid
                  actions={builtinConfigs}
                  onActionClick={handleOpenEditor}
                />
              </div>
            )}
            {customConfigs.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
                  Custom Actions
                </span>
                <ActionCardGrid
                  actions={customConfigs}
                  onActionClick={handleOpenEditor}
                />
              </div>
            )}
            {marketplaceConfigs.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Installed from Marketplace
                  </span>
                  <MaterialDesign3Button
                    variant="ghost"
                    size="sm"
                    shape="round"
                    onClick={handleOpenMarketplace}
                  >
                    Browse all
                    <ArrowUpRight className="size-3.5" />
                  </MaterialDesign3Button>
                </div>
                <ActionCardGrid
                  actions={marketplaceConfigs}
                  onActionClick={handleOpenEditor}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const isBuiltin = editingAction?.type === "builtin";
  const isMarketplace = editingAction?.type === "marketplace";

  return (
    <>
      <div className="absolute inset-0 flex overflow-hidden animate-in fade-in duration-500 rounded-lg z-10">
        <div className="w-80 shrink-0 flex flex-col border-r border-border/30 bg-card h-full">
          <div className="shrink-0 px-6 py-4.5 border-b border-border/30">
            <div className="flex items-center gap-1 justify-between">
              <MaterialDesign3Button
                variant="ghost"
                size="sm"
                shape="round"
                onClick={handleBackToOverview}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </MaterialDesign3Button>
              <MaterialDesign3Button
                variant="default"
                size="sm"
                shape="round"
                onClick={() => handleOpenEditor(null)}
              >
                <Plus className="w-3.5 h-3.5" />
                New Action
              </MaterialDesign3Button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto min-h-0">
            <div className="sticky top-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
            <div className="flex flex-col gap-3 px-6 pt-2 pb-12">
              {builtinConfigs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
                    Built-in
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {builtinConfigs.map((ca, idx) => {
                      const isSelected = editingAction?.id === ca.id;
                      const groupLen = builtinConfigs.length;
                      const isFirst = idx === 0;
                      const isLast = idx === groupLen - 1;
                      const rounded = cn(
                        isFirst && "rounded-t-3xl",
                        isLast && "rounded-b-3xl",
                        !isFirst && "rounded-t-md",
                        !isLast && "rounded-b-md",
                      );
                      return (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => handleOpenEditor(ca)}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-200 ease-out group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border select-none",
                            rounded,
                            isSelected
                              ? "bg-background/20 border-foreground/30"
                              : "bg-background border-transparent hover:bg-background/50 active:scale-[0.98]",
                          )}
                        >
                          <Ripple />
                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none bg-foreground/[0.04]">
                            {renderActionIcon(ca.icon, {
                              size: 16,
                            })}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10 pointer-events-none">
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
                  </div>
                </div>
              )}
              {customConfigs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
                    Custom
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {customConfigs.map((ca, idx) => {
                      const isSelected = editingAction?.id === ca.id;
                      const actionColor = ca.color || "#8B5CF6";
                      const groupLen = customConfigs.length;
                      const isFirst = idx === 0;
                      const isLast = idx === groupLen - 1;
                      const rounded = cn(
                        isFirst && "rounded-t-3xl",
                        isLast && "rounded-b-3xl",
                        !isFirst && "rounded-t-md",
                        !isLast && "rounded-b-md",
                      );
                      return (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => handleOpenEditor(ca)}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-200 ease-out group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border select-none",
                            rounded,
                            isSelected
                              ? "bg-background/20 border-foreground/30"
                              : "bg-background border-transparent hover:bg-background/50 active:scale-[0.98]",
                          )}
                        >
                          <Ripple />
                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none"
                            style={{
                              backgroundColor: `${actionColor}1A`,
                              border: `1px solid ${actionColor}33`,
                            }}
                          >
                            {renderActionIcon(ca.icon, {
                              size: 16,
                              color: actionColor,
                            })}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10 pointer-events-none">
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
                  </div>
                </div>
              )}
              {marketplaceConfigs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
                    Marketplace
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {marketplaceConfigs.map((ca, idx) => {
                      const isSelected = editingAction?.id === ca.id;
                      const actionColor = ca.color || "#8B5CF6";
                      const groupLen = marketplaceConfigs.length;
                      const isFirst = idx === 0;
                      const isLast = idx === groupLen - 1;
                      const rounded = cn(
                        isFirst && "rounded-t-3xl",
                        isLast && "rounded-b-3xl",
                        !isFirst && "rounded-t-md",
                        !isLast && "rounded-b-md",
                      );
                      return (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => handleOpenEditor(ca)}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-200 ease-out group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border select-none",
                            rounded,
                            isSelected
                              ? "bg-background/20 border-foreground/30"
                              : "bg-background border-transparent hover:bg-background/50 active:scale-[0.98]",
                          )}
                        >
                          <Ripple />
                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none"
                            style={{
                              backgroundColor: `${actionColor}1A`,
                              border: `1px solid ${actionColor}33`,
                            }}
                          >
                            {renderActionIcon(ca.icon, {
                              size: 16,
                              color: actionColor,
                            })}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10 pointer-events-none">
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
                  </div>
                </div>
              )}
              {actionConfigs.length === 0 && (
                <div className="text-center py-10 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-500">
                  <Wand2 className="w-5 h-5 text-muted-foreground/20 stroke-[1]" />
                  <p className="text-[11px] text-muted-foreground/50 leading-normal">
                    No actions found.
                  </p>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          </div>
        </div>

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
                Choose an action from the list on the left to edit its template,
                or click Create New Action to build your own custom text
                transformation.
              </p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isMarketplace) {
                  // For marketplace actions, only save the enabled state
                  if (!editingAction) return;
                  await saveActionConfig(editingAction);
                  const all = await loadAllActionConfigs();
                  setActionConfigs(all);
                  triggerSaveStatus("Action updated.", "success");
                  return;
                }
                await handleSave();
              }}
              className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-300 ease-out"
            >
              <div className="sticky top-0 z-20 px-6 py-2.5 flex items-center justify-between gap-4 border-b border-border/30 min-h-12">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 active:scale-[0.95] bg-foreground/[0.04]">
                    {renderActionIcon(editingAction.icon, {
                      size: 12,
                      color: isBuiltin
                        ? undefined
                        : editingAction.color || "#8B5CF6",
                    })}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <h3 className="text-xs font-semibold text-foreground truncate">
                      {editingAction.name || "New Action"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {isBuiltin
                        ? "Built-in"
                        : isMarketplace
                          ? "Marketplace"
                          : isNewAction
                            ? "Creating"
                            : "Editing"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground/60 min-w-[3.5rem] text-right select-none">
                      {editingAction.enabled !== false ? "Enabled" : "Disabled"}
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

                  {isBuiltin ? (
                    <MaterialDesign3Button
                      variant="ghost"
                      size="sm"
                      shape="round"
                      type="button"
                      onClick={handleResetBuiltin}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </MaterialDesign3Button>
                  ) : isMarketplace ? (
                    <MaterialDesign3Button
                      variant="destructive"
                      size="sm"
                      shape="round"
                      type="button"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Uninstall
                    </MaterialDesign3Button>
                  ) : !isNewAction ? (
                    <MaterialDesign3Button
                      variant="destructive"
                      size="sm"
                      shape="round"
                      type="button"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </MaterialDesign3Button>
                  ) : null}

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

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {isMarketplace && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-foreground/[0.03] border border-border/30 animate-in fade-in duration-300">
                    <PackageCheck className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5 stroke-[1.5]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground/80 leading-relaxed">
                        Marketplace actions cannot be edited. You can
                        enable/disable or remove them.
                      </p>
                      {editingAction.author && (
                        <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                          By{" "}
                          <span className="font-medium text-muted-foreground/70">
                            {editingAction.author}
                          </span>
                          {editingAction.version && (
                            <> · v{editingAction.version}</>
                          )}
                        </p>
                      )}
                      {editingAction.tags && editingAction.tags.length > 0 && (
                        <div className="mt-2">
                          <BadgeGroup>
                            {editingAction.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </BadgeGroup>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                  <div className="pr-4">
                    <Label className="text-xs font-semibold text-foreground">
                      Identity & Visuals
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                      {isMarketplace
                        ? "Marketplace action identity and metadata."
                        : "Define the name, description, and visual representation of your action."}
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    {isMarketplace ? (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Action Name
                          </Label>
                          <div className="h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40 flex items-center">
                            <span className="text-xs text-foreground/80">
                              {editingAction.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Description
                          </Label>
                          <div className="min-h-[2.25rem] px-3 py-2 rounded-lg bg-foreground/[0.02] border border-border/40 flex items-center">
                            <span className="text-xs text-muted-foreground/60">
                              {editingAction.description || "No description"}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-[10px] font-semibold text-muted-foreground">
                              Icon Symbol
                            </Label>
                            <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                              {renderActionIcon(editingAction.icon, {
                                size: 14,
                              })}
                              <span className="text-xs text-muted-foreground/60">
                                {editingAction.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-[10px] font-semibold text-muted-foreground">
                              Accent Color
                            </Label>
                            <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                              <div
                                className="h-4 w-4 rounded-full shrink-0"
                                style={{
                                  background: editingAction.color || "#8B5CF6",
                                }}
                              />
                              <span className="text-xs text-muted-foreground/60 font-mono">
                                {editingAction.color || "#8B5CF6"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
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
                            className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Description{" "}
                            <span className="text-muted-foreground/50">
                              (Optional)
                            </span>
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
                            className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                          />
                        </div>
                        <div
                          className={cn(
                            "grid grid-cols-1 gap-4 pt-1",
                            !isBuiltin && "sm:grid-cols-2",
                          )}
                        >
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-[10px] font-semibold text-muted-foreground">
                              Icon Symbol
                            </Label>
                            {isBuiltin ? (
                              <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                                {renderActionIcon(editingAction.icon, {
                                  size: 14,
                                })}
                                <span className="text-xs text-muted-foreground/60">
                                  {editingAction.name}
                                </span>
                              </div>
                            ) : (
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
                            )}
                          </div>
                          {!isBuiltin && (
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
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                  <div className="pr-4">
                    <Label className="text-xs font-semibold text-foreground">
                      AI Parameters
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                      Configure the model, parameters, and inline behavior.
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                    <SwitchCard
                      label="Preview before replacing"
                      description="Show the transformation in a preview panel instead of replacing text immediately inline."
                      checked={editingAction.replaceMode === "preview"}
                      onCheckedChange={(checked) =>
                        setEditingAction({
                          ...editingAction,
                          replaceMode: checked ? "preview" : "replace",
                        })
                      }
                      className="rounded-xl border border-border/20"
                    />
                  </div>
                </div>

                {!isMarketplace && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                    <div className="pr-4">
                      <Label className="text-xs font-semibold text-foreground">
                        Instructions & Prompts
                      </Label>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                        Draft system context and prompt templates. Predefined
                        variables will be populated dynamically.
                      </p>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          System Prompt{" "}
                          <span className="text-muted-foreground/50">
                            (Optional)
                          </span>
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
                          className="min-h-[70px] resize-y font-mono text-xs leading-normal border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                        />
                      </div>

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
                            represents the selected text target undergoing
                            rewriting.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isMarketplace && editingAction.promptTemplate && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="pr-4">
                      <Label className="text-xs font-semibold text-foreground">
                        Test Playground
                      </Label>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                        Test transformations instantly with sample text inputs.
                      </p>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <div className="flex flex-col gap-2.5">
                        <Textarea
                          placeholder={CUSTOM_ACTION_PLACEHOLDERS.testInput}
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          className="min-h-[70px] resize-y font-mono text-xs border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
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
                              } catch (err: unknown) {
                                setTestResult(
                                  `Error: ${(err as Error).message}`,
                                );
                              }
                              setTestLoading(false);
                            }}
                          >
                            {testLoading ? (
                              <span className="flex items-center gap-1.5">
                                <DotmSquare12 />
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
                          <span className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5 block">
                            Transformation Output
                          </span>
                          <div
                            className="max-h-[220px] overflow-y-auto font-mono text-xs leading-relaxed p-3.5 rounded-lg border bg-foreground/[0.015] border-border/40 text-foreground/90 select-text whitespace-pre-wrap break-words"
                            tabIndex={-1}
                          >
                            {testResult}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isMarketplace && (
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
                      are replaced dynamically when the action runs. Use the
                      test playground above to verify your template before
                      saving.
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm w-full" onOpened={() => {}}>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-light text-foreground">
                {editingAction?.type === "marketplace"
                  ? "Uninstall Action"
                  : "Delete Action"}
              </span>
            </div>
          </DialogTitle>
          <div className="px-6 pb-5 pt-4 flex flex-col gap-5">
            <p className="text-xs text-muted-foreground/70 leading-normal">
              {editingAction?.type === "marketplace" ? (
                <>
                  Are you sure you want to uninstall{" "}
                  <span className="font-semibold text-foreground">
                    &ldquo;{editingAction?.name}&rdquo;
                  </span>
                  ? You can reinstall it from the marketplace at any time.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">
                    &ldquo;{editingAction?.name}&rdquo;
                  </span>
                  ? This cannot be undone.
                </>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <MaterialDesign3Button
                variant="ghost"
                size="sm"
                shape="round"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </MaterialDesign3Button>
              <MaterialDesign3Button
                variant="destructive"
                size="sm"
                shape="round"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {editingAction?.type === "marketplace" ? "Uninstall" : "Delete"}
              </MaterialDesign3Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MarketplaceContent({
  loading,
  error,
  registry,
  filteredActions,
  marketplaceSearch,
  actionConfigs,
  installingId,
  onInstall,
  onUpdate,
  onActionClick,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  registry: Registry | null;
  filteredActions: RegistryAction[];
  marketplaceSearch: string;
  actionConfigs: CustomAction[];
  installingId: string | null;
  onInstall: (action: RegistryAction) => void;
  onUpdate: (action: RegistryAction) => void;
  onActionClick: (action: RegistryAction) => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20 animate-in fade-in duration-300">
        <AlertCircle className="w-3.5 h-3.5 text-destructive/60 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-destructive/80 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-[10px] text-destructive/60 underline mt-1 hover:text-destructive/80 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 animate-in fade-in duration-300">
        <DotmSquare12 />
      </div>
    );
  }

  if (registry && filteredActions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-in fade-in duration-500">
        <Store className="w-7 h-7 text-muted-foreground/20 stroke-[1]" />
        <p className="text-muted-foreground text-xs font-medium">No actions found.</p>
        {marketplaceSearch && (
          <p className="text-muted-foreground/50 text-[10px]">Try a different search term.</p>
        )}
      </div>
    );
  }

  const gap = 2;

  return (
    <div className="flex flex-wrap" style={{ gap: `${gap}px` }}>
      {filteredActions.map((action, index) => (
        <MarketplaceActionCard
          key={action.id}
          action={action}
          index={index}
          total={filteredActions.length}
          gap={gap}
          installedConfigs={actionConfigs}
          installingId={installingId}
          onInstall={onInstall}
          onUpdate={onUpdate}
          onActionClick={onActionClick}
        />
      ))}
    </div>
  );
}

function MarketplaceActionCard({
  action,
  index,
  total,
  gap,
  installedConfigs,
  installingId,
  onInstall,
  onUpdate,
  onActionClick,
}: {
  action: RegistryAction;
  index: number;
  total: number;
  gap: number;
  installedConfigs: CustomAction[];
  installingId: string | null;
  onInstall: (action: RegistryAction) => void;
  onUpdate: (action: RegistryAction) => void;
  onActionClick: (action: RegistryAction) => void;
}) {
  const installed = installedConfigs.find(
    (c) => c.sourceId === action.id || c.id === action.id,
  );
  const isInstalling = installingId === action.id;
  const hasUpdate = installed && installed.version !== action.version;
  const actionColor = action.color || "#8B5CF6";
  const rounded = getRounded(index, total);

  return (
    <div
      key={action.id}
      style={{
        width: `calc((100% - ${gap * 2}px) / 3)`,
      }}
      className={cn(
        "relative flex flex-col transition-all duration-200 overflow-hidden group border cursor-pointer select-none",
        rounded,
        "bg-background hover:bg-background/50 hover:shadow-sm active:scale-[0.98] border-transparent",
      )}
      onClick={() => onActionClick(action)}
    >
      <Ripple />
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
      <div className="relative z-10 pointer-events-none flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: `${actionColor}1A`,
              border: `1px solid ${actionColor}33`,
            }}
          >
            {renderActionIcon(action.icon, {
              size: 15,
              color: actionColor,
            })}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate">
                {action.name}
              </span>
              {hasUpdate && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 py-0 shrink-0 border-amber-500/40 text-amber-500/80"
                >
                  Update available
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/60 leading-normal line-clamp-2">
              {action.description}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-end px-4 pb-4">
        {hasUpdate ? (
          <MaterialDesign3Button
            variant="ghost"
            size="sm"
            shape="round"
            type="button"
            disabled={isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(action);
            }}
          >
            {isInstalling ? (
              <span className="flex items-center gap-1.5">
                <DotmSquare12 />
                Updating…
              </span>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Update
              </>
            )}
          </MaterialDesign3Button>
        ) : installed ? (
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 px-2 py-1">
            <PackageCheck className="w-3 h-3" />
            Installed
          </span>
        ) : (
          <MaterialDesign3Button
            variant="default"
            size="sm"
            shape="round"
            type="button"
            disabled={isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              onInstall(action);
            }}
          >
            {isInstalling ? (
              <span className="flex items-center gap-1.5">
                <DotmSquare12 />
                Installing…
              </span>
            ) : (
              <>
                <Download className="w-3 h-3" />
                Install
              </>
            )}
          </MaterialDesign3Button>
        )}
      </div>
    </div>
  );
}

function getRounded(index: number, total: number, columns = 3): string {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const totalRows = Math.ceil(total / columns);
  const itemsInLastRow = total - (totalRows - 1) * columns;
  const isFirstRow = row === 0;
  const isLastRow = row === totalRows - 1;
  const isFirstCol = col === 0;
  const isLastCol = col === (isLastRow ? itemsInLastRow - 1 : columns - 1);
  const colHasItemInLastRow = col < itemsInLastRow;
  const isVisualBottom = colHasItemInLastRow
    ? isLastRow
    : row === totalRows - 2;

  return cn(
    isFirstRow && isFirstCol && "rounded-tl-3xl",
    isFirstRow && isLastCol && "rounded-tr-3xl",
    isVisualBottom && isFirstCol && "rounded-bl-3xl",
    isVisualBottom && isLastCol && "rounded-br-3xl",
    !isFirstRow && "rounded-t-md",
    !isVisualBottom && "rounded-b-md",
    !isFirstCol && "rounded-l-md",
    !isLastCol && "rounded-r-md",
  );
}

function ActionCardGrid({
  actions,
  onActionClick,
}: {
  actions: CustomAction[];
  onActionClick: (action: CustomAction) => void;
}) {
  const columns = 3;
  const gap = 2;

  return (
    <div className="flex flex-wrap" style={{ gap: `${gap}px` }}>
      {actions.map((action, index) => {
        const rounded = getRounded(index, actions.length);
        const actionColor = action.color || "#8B5CF6";
        const isBuiltin = action.type === "builtin";

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onActionClick(action)}
            style={{
              width: `calc((100% - ${gap * (columns - 1)}px) / ${columns})`,
            }}
            className={cn(
              "relative flex flex-col text-left transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group border select-none",
              rounded,
              "bg-background hover:bg-background/50 hover:shadow-sm active:scale-[0.98] border-transparent",
            )}
          >
            <Ripple />
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
            <div className="relative z-10 pointer-events-none flex items-start gap-3.5 p-4">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  isBuiltin && "bg-foreground/[0.04]",
                )}
                style={
                  isBuiltin
                    ? {}
                    : {
                        backgroundColor: `${actionColor}1A`,
                        border: `1px solid ${actionColor}33`,
                      }
                }
              >
                {renderActionIcon(action.icon, {
                  size: 15,
                  color: isBuiltin ? undefined : actionColor,
                })}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {action.name || "Untitled Action"}
                </span>
                <span className="text-[10px] text-muted-foreground/60 leading-normal line-clamp-2">
                  {action.description ||
                    action.promptTemplate ||
                    "No description"}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span
                    className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                      action.enabled !== false
                        ? "text-emerald-500/80 bg-emerald-500/8"
                        : "text-muted-foreground/40 bg-foreground/[0.03]",
                    )}
                  >
                    {action.enabled !== false ? "Active" : "Disabled"}
                  </span>
                  {isBuiltin && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-muted-foreground/50 bg-foreground/[0.03]">
                      Built-in
                    </span>
                  )}
                  {action.type === "marketplace" && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-blue-500/70 bg-blue-500/8">
                      Marketplace
                    </span>
                  )}
                  {action.type === "marketplace" && action.version && (
                    <span className="text-[9px] text-muted-foreground/40">
                      v{action.version}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
