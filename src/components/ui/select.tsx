"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ui/ripple";
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react";

// --- MATERIAL EXPRESSIVE THEME ---
// Same language as ModernDropdown: segmented tiles with tight inner corners and
// large outer corners, spring shape-morph on press, and `bg-background` only on
// hovered/focused tiles so the rest blend into the popover surface.
const SPRING = "ease-[cubic-bezier(0.2,0.8,0.2,1.2)]";

const TILE = cn(
  "group relative flex min-h-7 w-full cursor-default select-none items-center gap-2 overflow-hidden px-2.5 py-1 text-[11px] font-normal text-muted-foreground outline-hidden",
  "rounded-md first:rounded-t-3xl last:rounded-b-3xl",
  "[[data-slot=select-label]+&]:rounded-t-3xl [[data-slot=select-separator]+&]:rounded-t-3xl has-[+[data-slot=select-separator]]:rounded-b-3xl",
  "transition-[background-color,color,border-radius] duration-300",
  SPRING,
  "active:rounded-[36px]! data-[state=checked]:rounded-[36px]! data-[state=checked]:font-medium data-[state=checked]:text-foreground",
  "data-[highlighted]:bg-background data-[highlighted]:text-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
);

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group relative flex w-fit items-center justify-between gap-2 overflow-hidden rounded-3xl border border-transparent bg-background px-4 text-left text-xs font-semibold whitespace-nowrap text-foreground outline-none cursor-default select-none",
        "transition-[background-color,border-radius] duration-300",
        SPRING,
        "hover:bg-background/50 active:rounded-[36px] data-[state=open]:rounded-[36px]",
        "focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-default disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "data-placeholder:font-medium data-placeholder:text-muted-foreground",
        "data-[size=default]:h-9 data-[size=sm]:h-7 data-[size=sm]:px-3 data-[size=sm]:text-[11px]",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <Ripple disabled={props.disabled} />
      <span className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-2 *:data-[slot=select-value]:line-clamp-1">
        {children}
      </span>
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none relative z-10 size-3.5 text-muted-foreground/60 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-align-trigger={position === "item-aligned"}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) gap-0.5 overflow-hidden rounded-3xl border border-border/20 bg-card p-px text-foreground shadow-[0px_8px_32px_rgba(0,0,0,0.12)] outline-none",
          "duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[align-trigger=true]:animate-none",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-in",
          className,
        )}
        position={position}
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          data-position={position}
          className={cn(
            "flex flex-col gap-0.5",
            position === "popper" &&
              "w-full min-w-(--radix-select-trigger-width)",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "px-2.5 pt-2 pb-1 text-xs font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(TILE, className)}
      {...props}
    >
      <Ripple disabled={props.disabled} />
      <span className="pointer-events-none relative z-10 flex w-full min-w-0 items-center gap-2">
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <span className="ml-auto flex size-3.5 shrink-0 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <CheckIcon className="size-3.5" />
          </SelectPrimitive.ItemIndicator>
        </span>
      </span>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none h-1 shrink-0", className)}
      {...props}
    />
  );
}

// Pinned pill tiles above/below the scrolling viewport: they take the outer
// corners of the popover, with tight inner corners towards the list.
const SCROLL_BUTTON = cn(
  "z-10 flex h-6 shrink-0 cursor-default select-none items-center justify-center text-muted-foreground outline-none",
  "transition-[background-color,color,border-radius] duration-300",
  SPRING,
  "hover:bg-background hover:text-foreground active:rounded-[36px]!",
  "[&_svg]:size-3.5",
);

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(SCROLL_BUTTON, "rounded-t-3xl rounded-b-md", className)}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(SCROLL_BUTTON, "rounded-b-3xl rounded-t-md", className)}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
