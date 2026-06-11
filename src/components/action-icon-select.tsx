import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import {
  ACTION_ICON_OPTIONS,
  DEFAULT_ACTION_ICON,
  normalizeActionIconName,
  renderActionIcon,
} from "@/lib/action-icons";
import { cn } from "@/lib/utils";

interface ActionIconSelectProps {
  value?: string;
  onValueChange: (iconName: string) => void;
  accentColor?: string;
  className?: string;
}

export function ActionIconSelect({
  value,
  onValueChange,
  accentColor = "#8B5CF6",
  className,
}: ActionIconSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedIcon = normalizeActionIconName(value);
  const selectedLabel =
    ACTION_ICON_OPTIONS.find((o) => o.name === selectedIcon)?.label ?? "Icon";

  const filteredIcons = ACTION_ICON_OPTIONS.filter(
    (icon) =>
      icon.label.toLowerCase().includes(search.toLowerCase()) ||
      icon.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => searchRef.current?.focus(), 0);

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const handleSelect = (name: string) => {
    onValueChange(name);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background hover:bg-background/50 px-3",
          "text-xs transition-colors",
          open && "border-ring ring-3 ring-ring/50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {renderActionIcon(selectedIcon, { size: 15, color: accentColor })}
          <span className="truncate text-foreground/90 font-medium">
            {selectedLabel}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose action icon"
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[13rem] rounded-xl border border-border bg-card p-2 shadow-lg animate-in fade-in duration-200 ease-out"
        >
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 rounded-md border border-border/60 bg-background pl-8 pr-7 text-xs outline-none placeholder:text-muted-foreground/40 focus:border-foreground/25 focus:ring-2 focus:ring-ring/30 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filteredIcons.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
                No icons found
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {filteredIcons.map(({ name, label }) => {
                  const isSelected = selectedIcon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      title={label}
                      onClick={() => handleSelect(name)}
                       className={cn(
                         "flex size-8 items-center justify-center rounded-lg transition-all duration-150 ease-out",
                         "hover:bg-muted/60 active:scale-[0.92]",
                         isSelected && "bg-foreground/[0.06]",
                       )}
                      style={
                        isSelected
                          ? {
                              outline: `1.5px solid ${accentColor}`,
                              outlineOffset: -1,
                            }
                          : undefined
                      }
                    >
                      {renderActionIcon(name, {
                        size: 14,
                        color: accentColor,
                      })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-1.5 border-t border-border/40 pt-1.5 text-center text-[10px] text-muted-foreground/40">
            {filteredIcons.length} of {ACTION_ICON_OPTIONS.length} icons
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_ACTION_ICON };
