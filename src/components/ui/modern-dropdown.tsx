"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ui/ripple";

// --- 1. MENU CONTEXT (drill-down pages + close) ---
type DrilldownContextType = {
  activePage: string;
  history: string[];
  navigate: (page: string) => void;
  goBack: () => void;
  menuHeight: number | null;
  setMenuHeight: (h: number) => void;
  close: () => void;
};

const DrilldownContext = React.createContext<DrilldownContextType | null>(null);

function useDrilldown() {
  const ctx = React.useContext(DrilldownContext);
  if (!ctx) throw new Error("Component must be used within a DropdownMenu");
  return ctx;
}

// --- 2. EXPRESSIVE PRESS PHYSICS ---
// Same shape-morph the other expressive surfaces use (RadioCard, HistoryList,
// Tag): corners spring out to a pill while held, then settle back.
const PRESS_RELEASE_MS = 180;
const SPRING = "ease-[cubic-bezier(0.2,0.8,0.2,1.2)]";

function usePress(disabled = false) {
  const [pressed, setPressed] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  React.useEffect(() => clearTimer, []);

  const startPress = () => {
    if (disabled) return;
    clearTimer();
    setPressed(true);
  };
  const endPress = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setPressed(false), PRESS_RELEASE_MS);
  };

  return { pressed, startPress, endPress };
}

/**
 * Press morph + select handling shared by every menu tile.
 *
 * `onSelect` runs immediately; only the *close* is held back by
 * `delayDuration` so the press morph and selection indicator can be seen.
 * Keyboard selections close instantly.
 */
function useTile({
  disabled,
  delayDuration,
  onSelect,
}: {
  disabled?: boolean;
  delayDuration: number;
  onSelect?: (event: Event) => void;
}) {
  const ctx = React.useContext(DrilldownContext);
  const { pressed, startPress, endPress } = usePress(disabled);
  const viaKeyboardRef = React.useRef(false);

  const handleSelect = (e: Event) => {
    const viaKeyboard = viaKeyboardRef.current;
    viaKeyboardRef.current = false;

    onSelect?.(e);
    if (e.defaultPrevented || viaKeyboard || delayDuration <= 0 || !ctx) return;

    e.preventDefault();
    window.setTimeout(ctx.close, delayDuration);
  };

  return {
    pressed,
    handleSelect,
    events: {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        viaKeyboardRef.current = false;
        if (e.button === 0) startPress();
      },
      onPointerUp: endPress,
      onPointerLeave: endPress,
      onPointerCancel: endPress,
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") viaKeyboardRef.current = true;
      },
    },
  };
}

// Segmented tile: tight inner corners, generous outer corners on the first and
// last tile of each run (a label or separator starts a new run).
const TILE = cn(
  "group relative flex min-h-7 cursor-default select-none items-center gap-2 overflow-hidden px-2.5 py-1 text-[11px] font-semibold outline-none",
  "rounded-md first:rounded-t-3xl last:rounded-b-3xl [.m3-gap+&]:rounded-t-3xl has-[+.m3-gap]:rounded-b-3xl",
  "transition-[background-color,color,border-radius] duration-300",
  SPRING,
  "data-[pressed=true]:rounded-[36px]!",
  "data-[highlighted]:bg-background data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
);

const TILE_ACTION = "text-foreground";

// Selectable tiles stay pill-shaped while checked, like an active RadioCard.
const TILE_SELECTABLE =
  "text-muted-foreground data-[highlighted]:text-foreground data-[state=checked]:text-foreground data-[state=checked]:rounded-[36px]!";

const TILE_CONTENT =
  "relative z-10 flex w-full min-w-0 items-center gap-2 pointer-events-none";

// --- 3. MOTION ---
const M3Styles = () => (
  <style
    id="m3-dropdown-styles"
    dangerouslySetInnerHTML={{
      __html: `
    @media (prefers-reduced-motion: no-preference) {
      @keyframes m3-menu-in {
        0% { opacity: 0; transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes m3-menu-out {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.96); }
      }
      @keyframes m3-scroll-on {
        from { overflow: hidden; }
        to { overflow: auto; }
      }
      @keyframes m3-item-in {
        0% { opacity: 0; transform: translateY(8px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Clip while the menu is animating so the still-growing box never shows a
         scrollbar. The 1ms animation at the end flips overflow back to auto, so
         long lists can scroll once the open transition has finished. */
      .m3-content[data-state="open"] {
        overflow: hidden;
        animation:
          m3-menu-in 350ms cubic-bezier(0.34, 1.56, 0.64, 1),
          m3-scroll-on 1ms 350ms forwards;
      }
      .m3-content[data-state="closed"] { animation: m3-menu-out 150ms cubic-bezier(0.4, 0, 1, 1) forwards; }

      .m3-content[data-state="open"] .m3-item-enter {
        animation: m3-item-in 350ms cubic-bezier(0.2, 0.8, 0.2, 1.2) both;
        animation-delay: calc(var(--m3-stagger, 0) * 30ms + 40ms);
      }
    }
  `,
    }}
  />
);

// --- 4. EXPORTED COMPONENTS ---

const DropdownMenu = ({
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );
  const open = openProp ?? uncontrolledOpen;

  const [history, setHistory] = React.useState(["main"]);
  const activePage = history[history.length - 1] || "main";
  const [menuHeight, setMenuHeight] = React.useState<number | null>(null);

  const navigate = React.useCallback((page: string) => {
    setHistory((prev) => {
      if (prev[prev.length - 1] === page) return prev;
      return [...prev, page].slice(-10);
    });
  }, []);

  const goBack = React.useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        setHistory(["main"]);
        setMenuHeight(null);
      }
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const close = React.useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  return (
    <DrilldownContext.Provider
      value={{ activePage, history, navigate, goBack, menuHeight, setMenuHeight, close }}
    >
      <DropdownMenuPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </DrilldownContext.Provider>
  );
};
DropdownMenu.displayName = "DropdownMenu";

type ChildWithChildren = { children?: React.ReactNode };

const TRIGGER = cn(
  "group relative flex items-center justify-center overflow-hidden rounded-3xl cursor-default select-none outline-none",
  "transition-[background-color,border-radius] duration-300",
  SPRING,
  "data-[pressed=true]:rounded-[36px] data-[state=open]:rounded-[36px]",
  "focus-visible:ring-2 focus-visible:ring-ring/20",
);

const TRIGGER_CONTENT =
  "relative z-10 flex w-full h-full items-center justify-center gap-[inherit] pointer-events-none";

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ children, className, asChild = false, ...props }, ref) => {
  const { pressed, startPress, endPress } = usePress(props.disabled);
  const events = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button === 0) startPress();
    },
    onPointerUp: endPress,
    onPointerLeave: endPress,
    onPointerCancel: endPress,
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<ChildWithChildren>;
    return (
      <DropdownMenuPrimitive.Trigger
        ref={ref}
        asChild
        data-pressed={pressed}
        className={cn(TRIGGER, className)}
        {...events}
        {...props}
      >
        {React.cloneElement(child, {
          children: (
            <>
              <Ripple disabled={props.disabled} />
              <div className={TRIGGER_CONTENT}>{child.props.children}</div>
            </>
          ),
        })}
      </DropdownMenuPrimitive.Trigger>
    );
  }

  return (
    <DropdownMenuPrimitive.Trigger ref={ref} asChild {...props}>
      <button
        type="button"
        data-pressed={pressed}
        className={cn(TRIGGER, className)}
        {...events}
      >
        <Ripple disabled={props.disabled} />
        <div className={TRIGGER_CONTENT}>{children}</div>
      </button>
    </DropdownMenuPrimitive.Trigger>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

type ChildWithStyle = { style?: React.CSSProperties };

function withStagger(
  children: React.ReactNode,
  offset: number,
): React.ReactNode {
  return React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      const el = child as React.ReactElement<ChildWithStyle>;
      return React.cloneElement(el, {
        style: {
          ...el.props.style,
          "--m3-stagger": index + offset,
        } as React.CSSProperties,
      });
    }
    return child;
  });
}

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => {
  const ctx = React.useContext(DrilldownContext);
  const paged = !!ctx?.menuHeight;

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "m3-content z-50 rounded-3xl border border-border/20 bg-card p-px text-foreground shadow-[0px_8px_32px_rgba(0,0,0,0.12)] outline-none",
          "overflow-x-hidden overflow-y-auto [scrollbar-width:thin] max-h-[var(--radix-dropdown-menu-content-available-height)]",
          "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
          className,
        )}
        {...props}
      >
        <M3Styles />
        <div
          className={cn("relative flex flex-col gap-0.5", paged && "overflow-hidden")}
          style={
            paged
              ? {
                  height: `${ctx.menuHeight}px`,
                  transition: "height 350ms cubic-bezier(0.2, 0, 0, 1)",
                }
              : undefined
          }
        >
          {withStagger(children, 0)}
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
    delayDuration?: number;
    enterAnimation?: boolean;
  }
>(
  (
    {
      className,
      inset,
      children,
      delayDuration = 200,
      enterAnimation = true,
      asChild = false,
      onSelect,
      ...props
    },
    ref,
  ) => {
    const { pressed, handleSelect, events } = useTile({
      disabled: props.disabled,
      delayDuration,
      onSelect,
    });

    const tileClassName = cn(
      TILE,
      TILE_ACTION,
      inset && "pl-11",
      enterAnimation && "m3-item-enter",
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<ChildWithChildren>;
      return (
        <DropdownMenuPrimitive.Item
          ref={ref}
          asChild
          data-pressed={pressed}
          className={tileClassName}
          {...events}
          {...props}
          onSelect={handleSelect}
        >
          {React.cloneElement(child, {
            children: (
              <>
                <Ripple disabled={props.disabled} />
                <span className={TILE_CONTENT}>{child.props.children}</span>
              </>
            ),
          })}
        </DropdownMenuPrimitive.Item>
      );
    }

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        data-pressed={pressed}
        className={tileClassName}
        {...events}
        {...props}
        onSelect={handleSelect}
      >
        <Ripple disabled={props.disabled} />
        <span className={TILE_CONTENT}>{children}</span>
      </DropdownMenuPrimitive.Item>
    );
  },
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & {
    delayDuration?: number;
    enterAnimation?: boolean;
  }
>(
  (
    { className, children, delayDuration = 200, enterAnimation = true, onSelect, ...props },
    ref,
  ) => {
    const { pressed, handleSelect, events } = useTile({
      disabled: props.disabled,
      delayDuration,
      onSelect,
    });
    return (
      <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        data-pressed={pressed}
        className={cn(
          TILE,
          TILE_SELECTABLE,
          enterAnimation && "m3-item-enter",
          className,
        )}
        {...events}
        {...props}
        onSelect={handleSelect}
      >
        <Ripple disabled={props.disabled} />
        <span className={TILE_CONTENT}>
          <span className="flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border-2 border-muted-foreground/30 text-background transition-colors duration-200 group-data-[highlighted]:border-muted-foreground/50 group-data-[state=checked]:border-foreground! group-data-[state=checked]:bg-foreground">
            <Check
              strokeWidth={3.5}
              className={cn(
                "size-2.5 scale-0 opacity-0 transition-all duration-200 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100",
                SPRING,
              )}
            />
          </span>
          {children}
        </span>
      </DropdownMenuPrimitive.CheckboxItem>
    );
  },
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioGroup = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioGroup>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioGroup
    ref={ref}
    className={cn("flex flex-col gap-0.5", className)}
    {...props}
  >
    {withStagger(children, 0)}
  </DropdownMenuPrimitive.RadioGroup>
));
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup";

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & {
    delayDuration?: number;
    enterAnimation?: boolean;
  }
>(
  (
    { className, children, delayDuration = 200, enterAnimation = true, onSelect, ...props },
    ref,
  ) => {
    const { pressed, handleSelect, events } = useTile({
      disabled: props.disabled,
      delayDuration,
      onSelect,
    });
    return (
      <DropdownMenuPrimitive.RadioItem
        ref={ref}
        data-pressed={pressed}
        className={cn(
          TILE,
          TILE_SELECTABLE,
          enterAnimation && "m3-item-enter",
          className,
        )}
        {...events}
        {...props}
        onSelect={handleSelect}
      >
        <Ripple disabled={props.disabled} />
        <span className={TILE_CONTENT}>
          <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors duration-200 group-data-[highlighted]:border-muted-foreground/50 group-data-[state=checked]:border-foreground!">
            <span className="size-1.5 scale-0 rounded-full bg-foreground opacity-0 transition-all duration-200 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100" />
          </span>
          {children}
        </span>
      </DropdownMenuPrimitive.RadioItem>
    );
  },
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

// A separator is a gap between tile runs, not a rule: the tiles on either side
// pick up their outer corners from it.
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("m3-gap h-1 shrink-0", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "m3-gap m3-item-enter px-2.5 pt-1.5 pb-1 text-[9px] font-semibold text-muted-foreground/70 select-none",
      inset && "pl-11",
      className,
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuInternalBack = () => {
  const ctx = useDrilldown();
  return (
    <DropdownMenuItem
      delayDuration={0}
      onSelect={(e) => {
        e.preventDefault();
        ctx.goBack();
      }}
      enterAnimation={false}
      className="text-muted-foreground data-[highlighted]:text-foreground"
    >
      <ChevronLeft className="size-3.5 shrink-0" />
      <span>Back</span>
    </DropdownMenuItem>
  );
};

const DropdownMenuPage = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { id: string }
>(({ id, children, className, ...props }, ref) => {
  const ctx = useDrilldown();
  const { activePage, history, setMenuHeight } = ctx;
  const isActive = activePage === id;
  const isLeft = history.includes(id) && !isActive;

  const [pageNode, setPageNode] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (isActive && pageNode) {
      const observer = new ResizeObserver((entries) => {
        setMenuHeight(
          entries[0].borderBoxSize?.[0]?.blockSize ?? entries[0].contentRect.height,
        );
      });
      observer.observe(pageNode);
      return () => observer.disconnect();
    }
  }, [isActive, pageNode, setMenuHeight]);

  return (
    <div
      ref={(node) => {
        setPageNode(node);
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={cn(
        "absolute top-0 left-0 flex w-full flex-col gap-0.5 transition-all duration-[350ms] ease-[cubic-bezier(0.2,0,0,1)]",
        isActive
          ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
          : isLeft
            ? "-translate-x-[20%] opacity-0 scale-[0.98] pointer-events-none"
            : "translate-x-[20%] opacity-0 scale-[0.98] pointer-events-none",
        className,
      )}
      {...props}
    >
      {id !== "main" && <DropdownMenuInternalBack />}
      {withStagger(children, id === "main" ? 0 : 1)}
    </div>
  );
});
DropdownMenuPage.displayName = "DropdownMenuPage";

const DropdownMenuPageTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuItem> & { targetId: string }
>(({ targetId, children, ...props }, ref) => {
  const ctx = useDrilldown();
  return (
    <DropdownMenuItem
      ref={ref}
      delayDuration={0}
      onSelect={(e) => {
        e.preventDefault();
        ctx.navigate(targetId);
      }}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground/60" />
    </DropdownMenuItem>
  );
});
DropdownMenuPageTrigger.displayName = "DropdownMenuPageTrigger";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuPage,
  DropdownMenuPageTrigger,
};
