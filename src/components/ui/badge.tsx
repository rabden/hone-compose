import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

interface BadgeGroupProps {
  children: React.ReactNode;
  className?: string;
}

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3! select-none",
  {
    variants: {
      variant: {
        default:
          "bg-background text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "bg-transparent text-foreground",
        ghost:
          "bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function BadgeGroup({ children, className }: BadgeGroupProps) {
  const count = React.Children.count(children)
  return (
    <div className={cn("flex flex-wrap gap-0.5", className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            isFirst: index === 0,
            isLast: index === count - 1,
          } as Record<string, unknown>)
        }
        return child
      })}
    </div>
  )
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  isFirst,
  isLast,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean; isFirst?: boolean; isLast?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(
        badgeVariants({ variant }),
        (isFirst == null && isLast == null) || (isFirst && isLast)
          ? "rounded-xl"
          : isFirst
            ? "rounded-l-xl rounded-r-sm"
            : isLast
              ? "rounded-r-xl rounded-l-sm"
              : "rounded-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Badge, BadgeGroup }
export { badgeVariants }
