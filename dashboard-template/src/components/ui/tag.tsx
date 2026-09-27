import React from "react";
import { cn } from "@/lib/utils";

interface TagGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface TagProps extends React.HTMLAttributes<HTMLElement> {
  variant: "interactive" | "non-interactive";
  isFirst?: boolean;
  isLast?: boolean;
}

function TagGroup({ children, className }: TagGroupProps) {
  const count = React.Children.count(children);
  return (
    <div className={cn("flex flex-wrap gap-0.5", className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement<TagProps>(child)) {
          return React.cloneElement(child, {
            isFirst: index === 0,
            isLast: index === count - 1,
          });
        }
        return child;
      })}
    </div>
  );
}

function Tag({
  variant,
  isFirst,
  isLast,
  className,
  children,
  ...props
}: TagProps) {
  const interactive = variant === "interactive";
  const Comp = interactive ? "button" : "span";
  const [pressed, setPressed] = React.useState(false);
  const pressTimerRef = React.useRef<number | null>(null);

  const startPress = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressed(true);
  };
  const endPress = () => {
    if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressed(false), 180);
  };

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onPointerDown={interactive ? startPress : undefined}
      onPointerUp={interactive ? endPress : undefined}
      onPointerLeave={interactive ? endPress : undefined}
      data-pressed={interactive ? pressed : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-medium overflow-hidden relative rounded-md",
        isFirst && "rounded-l-3xl",
        isLast && "rounded-r-3xl",
        interactive
          ? "bg-background transition-[background-color,border-radius] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1.2)] cursor-default outline-none text-foreground select-none data-[pressed=true]:rounded-[36px]"
          : "bg-background text-foreground/80 select-none",
        className,
      )}
      {...(interactive ? { role: "button" } : {})}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { TagGroup, Tag };
