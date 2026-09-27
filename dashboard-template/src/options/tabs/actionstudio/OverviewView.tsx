import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  Store03Icon,
  PlusSignIcon,
  AiGenerativeIcon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import type { CustomAction } from "../../../content/storage";
import { ActionCardGrid } from "./ActionCardGrid";

interface OverviewViewProps {
  actionConfigs: CustomAction[];
  builtinConfigs: CustomAction[];
  customConfigs: CustomAction[];
  marketplaceConfigs: CustomAction[];
  onOpenEditor: (action: CustomAction | null) => void;
  onOpenMarketplace: () => void;
}

export function OverviewView({
  actionConfigs,
  builtinConfigs,
  customConfigs,
  marketplaceConfigs,
  onOpenEditor,
  onOpenMarketplace,
}: OverviewViewProps) {
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
              onClick={onOpenMarketplace}
            >
              <HugeiconsIcon icon={Store03Icon} className="w-3.5 h-3.5" />
              Browse Marketplace
            </MaterialDesign3Button>
            <MaterialDesign3Button
              variant="default"
              size="default"
              shape="round"
              onClick={() => onOpenEditor(null)}
            >
              <HugeiconsIcon icon={PlusSignIcon} className="w-3.5 h-3.5" />
              Create New Action
            </MaterialDesign3Button>
          </div>
        </div>
      </div>

      {actionConfigs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 animate-in fade-in duration-500">
          <HugeiconsIcon icon={AiGenerativeIcon} className="w-7 h-7 text-muted-foreground/20" />
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
                onActionClick={onOpenEditor}
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
                onActionClick={onOpenEditor}
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
                  onClick={onOpenMarketplace}
                >
                  Browse all
                  <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
                </MaterialDesign3Button>
              </div>
              <ActionCardGrid
                actions={marketplaceConfigs}
                onActionClick={onOpenEditor}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
