import { type RefObject, type ReactNode, useRef, useState, useEffect, useMemo } from "react";
import {
  CornerDownLeft,
} from "lucide-react";
import { HoneLogo } from "@/components/hone-logo";
import type { InferredSelection } from "./adapters";
import { renderActionIcon } from "@/lib/action-icons";
import type { ActionHandler } from "./actions";
import { Button } from "@/components/ui/material-design-3-button";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import { cn } from "@/lib/utils";

interface ShortcutBadge {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta?: boolean;
  action?: string;
}

export interface FloatingActionMenuProps {
  menuRef: RefObject<HTMLDivElement | null>;
  top: number;
  left: number;
  width: number;
  shortcut: ShortcutBadge | null;
  quickShortcut: ShortcutBadge | null;
  actions: ActionHandler[];
  focusedActionIdx: number;
  onFocusAction: (idx: number) => void;
  onTriggerAction: (actionId: string, override?: InferredSelection) => void;
  hasAdapter: boolean;
  primaryActionStartIdx?: number;
  customActionStartIdx: number;
  toneActionStartIdx: number;
  lengthActionStartIdx: number;
  onMouseDownCapture: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  getInferenceOverride: () => InferredSelection | undefined;

  // New Generalized Card Props
  cardResultText?: string;
  cardDiff?: Array<{ type: "equal" | "add" | "remove"; value: string }> | null;
  isCardLoading?: boolean;
  loadingActionId?: string | null;
  cardActionId?: string | null;
  onApplyCard?: () => void;
  onCancelCard?: () => void;

  // New Inline Confirmation Props
  confirmState?: {
    action: string;
    actionLabel: string;
  } | null;
  onConfirmAction?: () => void;
  onCancelConfirm?: () => void;
  isCardOnly: boolean;
  showCard?: boolean;
}

function formatShortcut(s: ShortcutBadge) {
  const parts: string[] = [];
  if (s.meta) parts.push("⌘");
  if (s.ctrl) parts.push("⌃");
  if (s.alt) parts.push("⌥");
  if (s.shift) parts.push("⇧");
  if (s.key) parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join("");
}

export function FloatingActionMenu({
  menuRef,
  top,
  left,
  width,
  shortcut,
  quickShortcut,
  actions,
  focusedActionIdx,
  onFocusAction,
  onTriggerAction,
  hasAdapter,
  customActionStartIdx,
  toneActionStartIdx,
  lengthActionStartIdx,
  onMouseDownCapture,
  onMouseDown,
  getInferenceOverride,
  cardResultText = "",
  cardDiff = null,
  isCardLoading = false,
  loadingActionId = null,
  cardActionId = null,
  onApplyCard,
  confirmState = null,
  onConfirmAction,
  onCancelConfirm,
  onCancelCard,
  isCardOnly,
  showCard = true,
}: FloatingActionMenuProps) {
  const override = getInferenceOverride();
  const cardRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);

  const [observedHeight, setObservedHeight] = useState<number | null>(null);
  const leftColHeight: number | null = isCardOnly ? null : observedHeight;

  useEffect(() => {
    if (isCardOnly) return;

    const leftCol = leftColRef.current;
    if (!leftCol) return;

    const updateLeftColHeight = () => {
      const h = leftCol.scrollHeight || leftCol.offsetHeight;
      setObservedHeight((prev) => (h > 0 && h !== prev ? h : prev));
    };

    updateLeftColHeight();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateLeftColHeight);
    ro.observe(leftCol);
    return () => ro.disconnect();
  }, [isCardOnly, actions.length]);

  const primaryActions = useMemo(() => actions.filter((a) => a.category === "primary"), [actions]);
  const customActions = useMemo(() => actions.filter((a) => a.category === "custom"), [actions]);
  const toneActions = useMemo(() => actions.filter((a) => a.category === "tone"), [actions]);
  const lengthActions = useMemo(() => actions.filter((a) => a.category === "length"), [actions]);
  const hasToneOrLength = toneActions.length > 0 || lengthActions.length > 0;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Hone actions"
      onMouseDownCapture={onMouseDownCapture}
      onMouseDown={onMouseDown}
      className="hone-surface hone-fade-in fixed flex flex-row items-start gap-3 p-2 antialiased select-none outline-none bg-background"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        minWidth: !showCard
          ? `${width + 16}px`
          : isCardOnly
          ? `${width + 16}px`
          : `${width * 2 + 28}px`,
        width: "max-content",
        pointerEvents: "auto",
        zIndex: 2147483646,
        transition: "min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Left Column: Actions List — animates out to zero width in card-only mode */}
      <div
        ref={leftColRef}
        className="flex flex-col gap-1 shrink-0"
        style={{
          width: isCardOnly ? "0px" : `${width}px`,
          opacity: isCardOnly ? 0 : 1,
          pointerEvents: isCardOnly ? "none" : "auto",
          marginRight: isCardOnly ? "-12px" : "0px",
          overflow: "hidden",
          maxHeight: isCardOnly ? "0px" : "1000px",
          transition:
            "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-1">
          <div className="flex min-w-0 items-center gap-2">
            <HoneLogo size={16} alt="" className="opacity-90" />
            <span className="text-xs font-semibold tracking-tight text-foreground">
              Hone compose
            </span>
          </div>
          {shortcut?.key ? (
            <span className="hone-kbd shrink-0 tabular-nums">
              {formatShortcut(shortcut)}
            </span>
          ) : null}
        </header>

        {hasAdapter ? (
          <>
            {primaryActions.length > 0 && (
              <div className="flex flex-col gap-0.5 px-0.5">
                {primaryActions.map((item, i) => (
                  <MenuRow
                    key={item.id}
                    idx={i}
                    focused={focusedActionIdx === i}
                    isLoading={loadingActionId === item.id}
                    icon={renderActionIcon(item.icon, {
                      size: 14,
                      color: item.type === "builtin" ? undefined : (item.color || "var(--foreground)"),
                    })}
                    label={item.name}
                    shortcut={shortcut?.action === item.id ? shortcut : null}
                    onFocus={() => onFocusAction(i)}
                    onSelect={() => onTriggerAction(item.id, override)}
                  />
                ))}
              </div>
            )}

            {customActions.length > 0 && (
              <div className="flex flex-col gap-0.5 px-0.5">
                {customActions.map((ca, i) => {
                  const idx = customActionStartIdx + i;
                  const actionShortcut =
                    quickShortcut?.action === ca.id ? quickShortcut : ca.shortcut;
                  return (
                    <MenuRow
                      key={ca.id}
                      idx={idx}
                      focused={focusedActionIdx === idx}
                      isLoading={loadingActionId === ca.id}
                      icon={renderActionIcon(ca.icon, {
                        size: 14,
                        color: ca.color || "var(--foreground)",
                      })}
                      label={ca.name}
                      shortcut={actionShortcut}
                      onFocus={() => onFocusAction(idx)}
                      onSelect={() => onTriggerAction(ca.id, override)}
                    />
                  );
                })}
              </div>
            )}

            {hasToneOrLength && (
              <>
                <div className="flex items-center gap-2 px-2 py-0.5">
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Change Tone or length
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="grid grid-cols-2 gap-1 px-1">
                  {toneActions.map((item, i) => {
                    const idx = toneActionStartIdx + i;
                    const isFocused = focusedActionIdx === idx;
                    const isLoading = loadingActionId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-action-idx={idx}
                        data-focused={isFocused ? "true" : undefined}
                        className="hone-tone-btn"
                        onMouseEnter={() => onFocusAction(idx)}
                        onClick={() => onTriggerAction(item.id, override)}
                      >
                        {isLoading ? (
                          <DotmSquare12 />
                        ) : (
                          renderActionIcon(item.icon, { size: 12, color: item.type === "builtin" ? undefined : (item.color || "var(--foreground)") })
                        )}
                        <span className="flex-1 truncate text-left">{item.name}</span>
                        {isFocused && !isLoading && (
                          <span className="hone-kbd shrink-0 flex items-center justify-center p-0.5 border-foreground/20 bg-foreground/10 text-foreground scale-90">
                            <CornerDownLeft className="size-2.5 text-foreground" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {lengthActions.map((item, i) => {
                    const idx = lengthActionStartIdx + i;
                    const isFocused = focusedActionIdx === idx;
                    const isLoading = loadingActionId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-action-idx={idx}
                        data-focused={isFocused ? "true" : undefined}
                        className="hone-tone-btn"
                        onMouseEnter={() => onFocusAction(idx)}
                        onClick={() => onTriggerAction(item.id, override)}
                      >
                        {isLoading ? (
                          <DotmSquare12 />
                        ) : (
                          renderActionIcon(item.icon, { size: 12, color: item.type === "builtin" ? undefined : (item.color || "var(--foreground)") })
                        )}
                        <span className="flex-1 truncate text-left">{item.name}</span>
                        {isFocused && !isLoading && (
                          <span className="hone-kbd shrink-0 flex items-center justify-center p-0.5 border-foreground/20 bg-foreground/10 text-foreground scale-90">
                            <CornerDownLeft className="size-2.5 text-foreground" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <p className="px-3 py-2 text-center text-xs text-muted-foreground">
            Text selected (read-only)
          </p>
        )}
      </div>

      {/* Right Column: Local Spellcheck & AI Preview Card */}
      {showCard && (
        <div
          ref={cardRef}
          className="flex flex-col rounded-lg border border-border/80 bg-card relative overflow-hidden"
          style={{
            position: "relative",
            flexShrink: 0,
            width: "100%",
            minWidth: `${width}px`,
            maxWidth: isCardOnly ? "480px" : `${width}px`,
            height: !isCardOnly && leftColHeight ? `${leftColHeight}px` : "auto",
            maxHeight: isCardOnly
              ? "480px"
              : leftColHeight
              ? `${leftColHeight}px`
              : "320px",
            transition:
              "min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {confirmState ? (
            <div className="flex-1 flex flex-col justify-between h-full p-3">
              <p className="text-xs leading-relaxed text-foreground font-medium">
                {confirmState.action === "cancel_generation"
                  ? "Are you sure you want to cancel the AI generation?"
                  : `An action is already running. Abort it and run "${confirmState.actionLabel}"?`}
              </p>
              <div className="flex items-center justify-end gap-1.5 pt-2 mt-auto">
                <Button
                  type="button"
                  variant="ghost"
                  noMorph
                  className="h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onCancelConfirm}
                >
                  No
                </Button>
                <Button
                  type="button"
                  variant="default"
                  noMorph
                  className="h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3 select-none cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onConfirmAction}
                >
                  <CornerDownLeft className="size-2.5" strokeWidth={3} />
                  Yes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={textContentRef}
                className="overflow-y-auto text-xs leading-normal select-text whitespace-pre-wrap"
                style={{
                  fontFamily: '"Geist Variable", system-ui, sans-serif',
                  height: "100%",
                  width: "100%",
                  padding: "12px 12px 40px 12px",
                }}
              >
                {isCardLoading && !cardResultText ? (
                  <span className="text-muted-foreground italic inline-flex items-center gap-2">
                    <DotmSquare12 />
                    {loadingActionId === "fix_spelling" || loadingActionId === "fix_spelling_auto"
                      ? "Checking for spelling and grammar errors..."
                      : "Honing your text..."}
                  </span>
                ) : cardDiff && cardDiff.length > 0 ? (
                  (cardDiff.length > 1 || cardDiff[0].type !== "equal") ? (
                    <div className="font-medium">
                      {cardDiff.map((token, i) => {
                        if (token.type === "remove") {
                          return (
                            <span
                              key={i}
                              className="bg-destructive/15 text-destructive line-through px-0.5 rounded mx-0.5 font-medium"
                            >
                              {token.value}
                            </span>
                          );
                        } else if (token.type === "add") {
                          return (
                            <span
                              key={i}
                              className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-0.5 rounded mx-0.5"
                            >
                              {token.value}
                            </span>
                          );
                        }
                        return (
                          <span key={i} className="text-foreground/90 font-normal">
                            {token.value}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/80 italic">
                      {cardActionId === "fix_spelling_local" || cardActionId === "fix_spelling" || cardActionId === "fix_spelling_auto"
                        ? "No spelling or grammar errors detected. Text is perfect!"
                        : "AI response matches original text. No changes needed."}
                    </span>
                  )
                ) : cardResultText ? (
                  <div className="text-foreground/90 font-medium whitespace-pre-wrap">
                    {cardResultText}
                  </div>
                ) : (
                  <span className="text-muted-foreground/80 italic">
                    No spelling or grammar errors detected. Text is perfect!
                  </span>
                )}
              </div>

              {/* Floating buttons overlay */}
              <div
                className="absolute bottom-1 right-1 flex items-center justify-end gap-1"
                style={{
                  zIndex: 10,
                  background: "transparent",
                  backdropFilter: "none",
                  padding: "0",
                  border: "none",
                }}
              >
                {isCardOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    noMorph
                    className="h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3 text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onCancelCard}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  noMorph
                  disabled={
                    !!(isCardLoading ||
                      !cardResultText ||
                      (cardDiff &&
                        cardDiff.length === 1 &&
                        cardDiff[0].type === "equal"))
                  }
                  className={cn(
                    "h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3 select-none cursor-pointer transition hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onApplyCard}
                >
                  <span>Apply</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    {!isCardOnly && (
                      <span
                        className="hone-kbd shrink-0 tabular-nums text-[9px] scale-90"
                        style={{
                          color: "var(--primary-foreground)",
                          borderColor: "color-mix(in oklch, var(--primary-foreground) 20%, transparent)",
                          backgroundColor: "color-mix(in oklch, var(--primary-foreground) 10%, transparent)",
                        }}
                      >
                        Ctrl
                      </span>
                    )}
                    <span
                      className="hone-kbd shrink-0 tabular-nums text-[9px] scale-90 flex items-center justify-center p-0.5"
                      style={{
                        color: "var(--primary-foreground)",
                        borderColor: "color-mix(in oklch, var(--primary-foreground) 20%, transparent)",
                        backgroundColor: "color-mix(in oklch, var(--primary-foreground) 10%, transparent)",
                      }}
                    >
                      <CornerDownLeft className="size-2.5" strokeWidth={3} />
                    </span>
                  </div>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


function MenuRow({
  idx,
  focused,
  isLoading,
  icon,
  label,
  shortcut,
  onFocus,
  onSelect,
}: {
  idx: number;
  focused: boolean;
  isLoading?: boolean;
  icon: ReactNode;
  label: string;
  shortcut?: {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta?: boolean;
  } | null;
  onFocus: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-action-idx={idx}
      data-focused={focused ? "true" : undefined}
      className="hone-menu-item"
      onMouseEnter={onFocus}
      onClick={onSelect}
    >
      <span className="hone-menu-item-icon">
        {isLoading ? (
          <DotmSquare12 />
        ) : (
          icon
        )}
      </span>
      <span className="truncate flex-1">{label}</span>
      {focused ? (
        <span className="hone-kbd shrink-0 flex items-center justify-center p-0.5 ml-1 border-foreground/20 bg-foreground/10 text-foreground scale-90">
          <CornerDownLeft className="size-2.5 text-foreground" strokeWidth={3} />
        </span>
      ) : shortcut ? (
        <span className="hone-kbd shrink-0 tabular-nums text-[9px]">
          {formatShortcut(shortcut)}
        </span>
      ) : null}
    </button>
  );
}
