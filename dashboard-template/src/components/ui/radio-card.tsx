import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { Ripple } from "@/components/ui/ripple";

export interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioCardGroupProps {
  options: RadioCardOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function RadioCardGroup({
  options,
  value,
  onValueChange,
  className,
}: RadioCardGroupProps) {
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

  return (
    <div className={cn("grid gap-0.5", className)}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onValueChange(opt.value)}
              onPointerDown={() => startPress(opt.value)}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              data-pressed={pressedId === opt.value || isActive}
              data-active={isActive}
              className={cn(
                "relative flex items-center gap-3 p-3.5 rounded-3xl text-left transition-[background-color,color,border-radius] duration-[600ms] ease-out cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group select-none border border-transparent",
                "data-[pressed=true]:duration-[600ms] data-[pressed=true]:delay-100 data-[pressed=true]:ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px]",
                isActive
                  ? "bg-background text-foreground"
                  : "bg-background text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
            <Ripple />
            <div
              className={cn(
                "size-[18px] rounded-full flex items-center justify-center shrink-0 relative z-10 transition-all duration-200",
                isActive
                  ? "border-2 border-foreground"
                  : "border-2 border-muted-foreground/30 group-hover:border-muted-foreground/50",
              )}
            >
              <div
                className={cn(
                  "rounded-full bg-foreground transition-all duration-200",
                  isActive
                    ? "size-2.5 scale-100 opacity-100"
                    : "size-0 scale-0 opacity-0",
                )}
              />
            </div>
            <div className="flex flex-col gap-0.5 relative z-10 pointer-events-none min-w-0">
              <span
                className={cn(
                  "text-xs font-semibold transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[10px] text-muted-foreground/60 leading-normal">
                  {opt.description}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface RadioCardGroupGroupedProps extends RadioCardGroupProps {
  columns?: number;
}

export function RadioCardGroupGrouped({
  options,
  value,
  onValueChange,
  columns = 1,
  className,
}: RadioCardGroupGroupedProps) {
  const totalRows = Math.ceil(options.length / columns);
  const itemsInLastRow = options.length - (totalRows - 1) * columns;

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

  return (
    <div
      className={cn("grid gap-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {options.map((opt, index) => {
        const isActive = value === opt.value;
        const row = Math.floor(index / columns);
        const col = index % columns;
        const isFirstRow = row === 0;
        const isLastRow = row === totalRows - 1;
        const isFirstCol = col === 0;
        const isLastCol =
          col === (isLastRow ? itemsInLastRow - 1 : columns - 1);

        const rounded = cn(
          isFirstRow && isFirstCol && "rounded-tl-3xl",
          isFirstRow && isLastCol && "rounded-tr-3xl",
          isLastRow && isFirstCol && "rounded-bl-3xl",
          isLastRow && isLastCol && "rounded-br-3xl",
          !isFirstRow && "rounded-t-md",
          !isLastRow && "rounded-b-md",
          !isFirstCol && "rounded-l-md",
          !isLastCol && "rounded-r-md",
        );

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            onPointerDown={() => startPress(opt.value)}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            data-pressed={pressedId === opt.value || isActive}
            data-active={isActive}
            className={cn(
              "relative flex items-center gap-3 p-3.5 border border-transparent text-left transition-[background-color,color,border-radius] duration-[600ms] ease-out cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group select-none",
              rounded,
              "data-[pressed=true]:duration-[600ms] data-[pressed=true]:delay-100 data-[pressed=true]:ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px]",
              isActive
                ? "bg-background text-foreground"
                : "bg-background text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
            <Ripple />
            <div
              className={cn(
                "size-[18px] rounded-full flex items-center justify-center shrink-0 relative z-10 pointer-events-none transition-all duration-200",
                isActive
                  ? "border-2 border-foreground"
                  : "border-2 border-muted-foreground/30 group-hover:border-muted-foreground/50",
              )}
            >
              <div
                className={cn(
                  "rounded-full bg-foreground transition-all duration-200",
                  isActive
                    ? "size-2.5 scale-100 opacity-100"
                    : "size-0 scale-0 opacity-0",
                )}
              />
            </div>
            <div className="flex flex-col gap-0.5 relative z-10 pointer-events-none min-w-0">
              <span
                className={cn(
                  "text-xs font-semibold transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {opt.label}
              </span>
              {opt.description && (
                <span className="text-[10px] text-muted-foreground/60 leading-normal">
                  {opt.description}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
