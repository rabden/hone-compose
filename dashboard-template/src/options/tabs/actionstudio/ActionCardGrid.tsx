import { useState } from "react";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ui/ripple";
import { renderActionIcon } from "@/lib/action-icons";
import type { CustomAction } from "../../../content/storage";
import { getRounded } from "./getRounded";

interface ActionCardGridProps {
  actions: CustomAction[];
  onActionClick: (action: CustomAction) => void;
}

export function ActionCardGrid({ actions, onActionClick }: ActionCardGridProps) {
  const [pressedId, setPressedId] = useState<string | null>(null);
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
            onPointerDown={() => setPressedId(action.id)}
            onPointerUp={() => setPressedId(null)}
            onPointerLeave={() => setPressedId(null)}
            data-pressed={pressedId === action.id}
            style={{
              width: `calc((100% - ${gap * (columns - 1)}px) / ${columns})`,
            }}
            className={cn(
              "relative flex flex-col text-left transition-[background-color,color,box-shadow,border-radius] duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px] cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group border select-none",
              rounded,
              "bg-background hover:bg-background/50 hover:shadow-sm border-transparent",
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
                <span className="text-[10px] text-muted-foreground/60 leading-normal truncate">
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
