import { useState } from "react";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ui/ripple";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import { Badge } from "@/components/ui/badge";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { renderActionIcon } from "@/lib/action-icons";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  Store03Icon,
  BadgeInfoIcon,
  RefreshIcon,
  DownloadIcon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import type { CustomAction } from "../../../content/storage";
import type { Registry, RegistryAction } from "./types";
import { getRounded } from "./getRounded";

interface MarketplaceContentProps {
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
}

export function MarketplaceContent({
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
}: MarketplaceContentProps) {
  if (error) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20 animate-in fade-in duration-300">
        <HugeiconsIcon icon={BadgeInfoIcon} className="w-3.5 h-3.5 text-destructive/60 shrink-0 mt-0.5" />
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
        <HugeiconsIcon icon={Store03Icon} className="w-7 h-7 text-muted-foreground/20" />
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

interface MarketplaceActionCardProps {
  action: RegistryAction;
  index: number;
  total: number;
  gap: number;
  installedConfigs: CustomAction[];
  installingId: string | null;
  onInstall: (action: RegistryAction) => void;
  onUpdate: (action: RegistryAction) => void;
  onActionClick: (action: RegistryAction) => void;
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
}: MarketplaceActionCardProps) {
  const [pressed, setPressed] = useState(false);
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
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      data-pressed={pressed}
      className={cn(
        "relative flex flex-col transition-[background-color,color,box-shadow,border-radius] duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px] overflow-hidden group border cursor-default select-none",
        rounded,
        "bg-background hover:bg-background/50 hover:shadow-sm border-transparent",
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
                <HugeiconsIcon icon={RefreshIcon} className="w-3 h-3" />
                Update
              </>
            )}
          </MaterialDesign3Button>
        ) : installed ? (
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 px-2 py-1">
            <HugeiconsIcon icon={PackageIcon} className="w-3 h-3" />
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
                <HugeiconsIcon icon={DownloadIcon} className="w-3 h-3" />
                Install
              </>
            )}
          </MaterialDesign3Button>
        )}
      </div>
    </div>
  );
}
