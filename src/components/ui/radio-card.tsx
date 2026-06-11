import { cn } from "@/lib/utils";
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
  return (
    <div className={cn("grid gap-0.5", className)}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "relative flex items-center gap-3 p-3.5 rounded-3xl text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group",
              isActive
                ? "bg-background/20 border border-foreground/30 text-foreground"
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
            <div className="flex flex-col gap-0.5 relative z-10 min-w-0">
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
            className={cn(
              "relative flex items-center gap-3 p-3.5 border text-left transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group",
              rounded,
              isActive
                ? "bg-background/20 border-foreground/30 text-foreground"
                : "bg-background border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground",
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
