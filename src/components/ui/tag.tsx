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

  return (
    <Comp
      type={interactive ? "button" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-medium overflow-hidden relative rounded-md",
        isFirst && "rounded-l-3xl",
        isLast && "rounded-r-3xl",
        interactive
          ? "bg-background hover:bg-background transition-colors duration-200 cursor-pointer outline-none text-foreground"
          : "bg-background text-foreground/80",
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
