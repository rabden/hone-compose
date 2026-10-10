import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import {
  ACTION_ICON_OPTIONS,
  DEFAULT_ACTION_ICON,
  normalizeActionIconName,
  renderActionIcon,
} from "@/lib/action-icons";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ui/ripple";

const SPRING = "ease-[cubic-bezier(0.2,0.8,0.2,1.2)]";

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
          "group relative flex h-9 w-full cursor-default select-none items-center justify-between gap-2 overflow-hidden rounded-3xl bg-background px-4 outline-none",
          "text-xs font-semibold transition-[background-color,border-radius] duration-300 hover:bg-background/50",
          SPRING,
          "active:rounded-[36px] focus-visible:ring-2 focus-visible:ring-ring/20",
          open && "rounded-[36px]",
        )}
      >
        <Ripple />
        <span className="pointer-events-none relative z-10 flex min-w-0 items-center gap-2">
          {renderActionIcon(selectedIcon, { size: 15, color: accentColor })}
          <span className="truncate text-foreground">{selectedLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none relative z-10 size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose action icon"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[13rem] origin-top rounded-3xl border border-border/20 bg-card p-1.5 text-foreground shadow-[0px_8px_32px_rgba(0,0,0,0.12)] animate-in fade-in-0 zoom-in-90 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        >
          <div className="relative mb-1.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-3xl bg-background pl-8 pr-8 text-[11px] font-semibold text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-default rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filteredIcons.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-[11px] font-semibold text-muted-foreground/60">
                No icons found
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-0.5">
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
                        "group relative flex size-8 cursor-default select-none items-center justify-center overflow-hidden rounded-xl outline-none",
                        "transition-[background-color,border-radius] duration-300 hover:bg-background focus-visible:bg-background",
                        SPRING,
                        "active:rounded-[36px]",
                        isSelected && "rounded-[36px]",
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
                      <Ripple />
                      <span className="pointer-events-none relative z-10 flex">
                        {renderActionIcon(name, {
                          size: 14,
                          color: accentColor,
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-1.5 border-t border-border/10 pt-1.5 text-center text-[9px] font-semibold text-muted-foreground/60">
            {filteredIcons.length} of {ACTION_ICON_OPTIONS.length} icons
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_ACTION_ICON };
