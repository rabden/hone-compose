import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock";
import type { ExpandingSearchDockHandle } from "@/components/ui/expanding-search-dock";
import { Ripple } from "@/components/ui/ripple";
import { Badge, BadgeGroup } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/material-dialog";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import { renderActionIcon } from "@/lib/action-icons";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  Search01Icon,
  ChevronLeftIcon,
  DownloadIcon,
  RefreshIcon,
  WasteIcon,
} from "@hugeicons/core-free-icons";
import type { CustomAction } from "../../../content/storage";
import type { Registry, RegistryAction } from "./types";
import { MarketplaceContent } from "./MarketplaceContent";

interface MarketplaceViewProps {
  registry: Registry | null;
  loading: boolean;
  error: string | null;
  actionConfigs: CustomAction[];
  installingId: string | null;
  onInstall: (action: RegistryAction) => void;
  onUpdate: (action: RegistryAction) => void;
  onUninstall: (action: RegistryAction) => void;
  onRetry: () => void;
  onBack: () => void;
}

export function MarketplaceView({
  registry,
  loading,
  error,
  actionConfigs,
  installingId,
  onInstall,
  onUpdate,
  onUninstall,
  onRetry,
  onBack,
}: MarketplaceViewProps) {
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
  const [selectedMarketplaceAction, setSelectedMarketplaceAction] =
    useState<RegistryAction | null>(null);
  const [marketplaceDetailOpen, setMarketplaceDetailOpen] = useState(false);
  const [showMarketplaceFloatingBar, setShowMarketplaceFloatingBar] =
    useState(false);

  const marketplaceHeaderRef = useRef<HTMLDivElement>(null);
  const marketplaceSearchRef = useRef<ExpandingSearchDockHandle>(null);

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

  const filteredActions = useMemo(() => {
    return (
      registry?.actions.filter((a) => {
        if (!marketplaceSearch.trim()) return true;
        const q = marketplaceSearch.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
        );
      }) ?? []
    );
  }, [registry, marketplaceSearch]);

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
              <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5 text-muted-foreground relative z-10 pointer-events-none" />
            </button>
            <MaterialDesign3Button
              variant="ghost"
              size="sm"
              shape="round"
              onClick={onBack}
            >
              <HugeiconsIcon icon={ChevronLeftIcon} className="w-3.5 h-3.5" />
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
                onClick={onBack}
              >
                <HugeiconsIcon icon={ChevronLeftIcon} className="w-3.5 h-3.5" />
                Back
              </MaterialDesign3Button>
            </div>
          </div>
        </div>

        <MarketplaceContent
          loading={loading}
          error={error}
          registry={registry}
          filteredActions={filteredActions}
          marketplaceSearch={marketplaceSearch}
          actionConfigs={actionConfigs}
          installingId={installingId}
          onInstall={onInstall}
          onUpdate={onUpdate}
          onActionClick={(action) => {
            setSelectedMarketplaceAction(action);
            setMarketplaceDetailOpen(true);
          }}
          onRetry={onRetry}
        />

        <Dialog
          open={marketplaceDetailOpen}
          onOpenChange={setMarketplaceDetailOpen}
        >
          <DialogContent className="max-w-lg w-full min-w-[min(500px,95vw)]" onOpened={() => {}}>
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
                              onUpdate(selectedMarketplaceAction);
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
                                <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" />
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
                            onClick={() => {
                              onUninstall(selectedMarketplaceAction);
                              setMarketplaceDetailOpen(false);
                            }}
                          >
                            <HugeiconsIcon icon={WasteIcon} className="w-3 h-3" />
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
                            onInstall(selectedMarketplaceAction);
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
                              <HugeiconsIcon icon={DownloadIcon} className="w-3 h-3" />
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
