import { useState } from "react";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ui/ripple";
import { Switch as MaterialDesign3Switch } from "@/components/ui/material-design-3-switch";

export interface SwitchCardItem {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

interface SwitchCardProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  switchSize?: "default" | "sm";
}

export function SwitchCard({
  label,
  description,
  checked,
  onCheckedChange,
  className,
  switchSize = "default",
}: SwitchCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    onCheckedChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCheckedChange(!checked);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      className={cn(
        "relative flex items-center justify-between w-full bg-background hover:bg-background/50 p-4 cursor-pointer transition-colors duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden select-none rounded-3xl",
        className,
      )}
    >
      <Ripple />
      <div className="flex flex-col gap-1 pr-4 relative z-10 pointer-events-none">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground/70 leading-normal">
            {description}
          </span>
        )}
      </div>
      <div className="relative z-10 shrink-0 pointer-events-none">
        <MaterialDesign3Switch
          variant="primary"
          size={switchSize}
          checked={checked}
          onCheckedChange={onCheckedChange}
          haptic="none"
          pressed={isPressed}
        />
      </div>
    </div>
  );
}

interface SwitchCardGroupProps {
  items: SwitchCardItem[];
  className?: string;
}

export function SwitchCardGroup({ items, className }: SwitchCardGroupProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-3xl border border-border/20 p-0.5 overflow-hidden",
        className,
      )}
    >
      {items.map((item, idx) => (
        <SwitchCard
          key={item.id}
          label={item.label}
          description={item.description}
          checked={item.checked}
          onCheckedChange={item.onCheckedChange}
          className={cn(
            idx === 0 && "rounded-t-3xl rounded-b-md",
            idx === items.length - 1 && "rounded-b-3xl rounded-t-md",
            idx > 0 && idx < items.length - 1 && "rounded-md",
            idx > 0 && "border-t border-border/10",
          )}
        />
      ))}
    </div>
  );
}
