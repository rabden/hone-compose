import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Ripple } from "@/components/ui/ripple";
import { History } from "lucide-react";

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

interface HistoryListProps {
  items: HistoryItem[];
  onItemClick: (item: HistoryItem) => void;
  getActionName: (code: string) => string;
  limit?: number;
  showOriginalText?: boolean;
  showTimeOnly?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function HistoryList({
  items,
  onItemClick,
  getActionName,
  limit,
  showOriginalText = false,
  showTimeOnly = false,
  emptyTitle = "No transformations recorded yet.",
  emptyDescription = "Start using Hone in webpage text boxes to build history.",
  className,
}: HistoryListProps) {
  const displayItems = limit ? items.slice(0, limit) : items;
  const totalItems = displayItems.length;

  const [pressedId, setPressedId] = useState<string | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const startPress = (id: string) => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressedId(id);
  };
  const endPress = () => {
    if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressedId(null), 180);
  };

  if (totalItems === 0) {
    return (
      <div
        className={cn(
          "py-12 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-secondary/5",
          className,
        )}
      >
        <History className="size-6 text-muted-foreground/20 mb-2 stroke-[1]" />
        <span className="text-xs text-muted-foreground/60 font-medium">
          {emptyTitle}
        </span>
        <span className="text-[10px] text-muted-foreground/40 mt-1">
          {emptyDescription}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col w-full min-w-0 gap-0.5", className)}>
      {displayItems.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick(item)}
          onPointerDown={() => startPress(item.id)}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          data-pressed={pressedId === item.id}
          className={cn(
            "relative flex items-center gap-4 px-5 cursor-default transition-[background-color,border-radius] duration-[600ms] ease-out text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/20 overflow-hidden select-none py-4 bg-background hover:bg-background/50",
            "data-[pressed=true]:duration-[600ms] data-[pressed=true]:delay-100 data-[pressed=true]:ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px]",
            totalItems === 1 && "rounded-3xl",
            totalItems > 1 && i === 0 && "rounded-t-3xl rounded-b-md",
            totalItems > 1 &&
              i === totalItems - 1 &&
              "rounded-b-3xl rounded-t-md",
            totalItems > 1 && i !== 0 && i !== totalItems - 1 && "rounded-md",
          )}
        >
          <Ripple />
          <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10 pointer-events-none">
            <Badge
              variant="secondary"
              className="text-[9px] font-mono border-border/40 shrink-0 py-0 font-semibold"
            >
              {getActionName(item.action)}
            </Badge>
            <span className="text-xs text-foreground/70 truncate leading-normal flex-1">
              {showOriginalText ? item.originalText : item.rewrittenText}
            </span>
          </div>
          <div className="flex flex-col items-end shrink-0 relative z-10 pointer-events-none">
            <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap font-mono">
              {showTimeOnly
                ? new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : new Date(item.timestamp).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground/30 mt-0.5">
              View details
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
