import { type RefObject, type ReactNode, useRef, useState, useEffect, useLayoutEffect } from "react";
import {
  Briefcase,
  Feather,
  Heart,
  Maximize2,
  MessageSquare,
  Minimize2,
  RefreshCw,
  Zap,
  Sparkles,
  CornerDownLeft,
} from "lucide-react";
import { HoneLogo } from "@/components/hone-logo";
import type { InferredSelection } from "./adapters";
import { renderActionIcon } from "@/lib/action-icons";
import type { ActionHandler } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InferenceLevel = "selection" | "sentence" | "paragraph" | "field";

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
  inferenceOptions: Record<string, { text?: string }> | null;
  selectedInferenceLevel: InferenceLevel | null;
  onInferencePrev: () => void;
  onInferenceNext: () => void;
  customActions: ActionHandler[];
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

const PRIMARY_ACTIONS = [
  { action: "improve", icon: Feather, label: "Improve writing" },
  { action: "paraphrase", icon: RefreshCw, label: "Paraphrase" },
  { action: "fix_spelling", icon: Sparkles, label: "Fix spellings and grammer with AI" },
] as const;

const TONE_ACTIONS = [
  { action: "tone_professional", icon: Briefcase, label: "Professional" },
  { action: "tone_casual", icon: MessageSquare, label: "Casual" },
  { action: "tone_exciting", icon: Zap, label: "Exciting" },
  { action: "tone_friendly", icon: Heart, label: "Friendly" },
] as const;

const LENGTH_ACTIONS = [
  { action: "length_shorter", icon: Minimize2, label: "Shorter" },
  { action: "length_longer", icon: Maximize2, label: "Longer" },
] as const;

function formatShortcut(s: ShortcutBadge) {
  const parts: string[] = [];
  if (s.meta) parts.push("⌘");
  if (s.ctrl) parts.push("⌃");
  if (s.alt) parts.push("⌥");
  if (s.shift) parts.push("⇧");
  if (s.key) parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join("");
}

function inferencePreview(
  options: Record<string, { text?: string }> | null,
  level: InferenceLevel | null,
) {
  if (!options || !level) return "";
  const opt = options[level];
  if (!opt?.text) return "";
  const t = opt.text.replace(/\s+/g, " ").trim();
  return t.length > 72 ? `${t.slice(0, 69)}…` : t;
}

export function FloatingActionMenu({
  menuRef,
  top,
  left,
  width,
  shortcut,
  quickShortcut,
  inferenceOptions,
  selectedInferenceLevel,
  onInferencePrev,
  onInferenceNext,
  customActions,
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
  const [cardWidth, setCardWidth] = useState(width);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const heightRafRef = useRef<number>(0);
  const leftColHeightRef = useRef<number>(280);
  const displayCardHeight = showCard ? cardHeight : null;

  // Dynamic card width for 2-column mode: when text overflows the available
  // height (menu height minus padding), expand the card horizontally.
  useLayoutEffect(() => {
    if (isCardOnly || confirmState) return; // only in 2-column mode
    const card = cardRef.current;
    const textEl = textContentRef.current;
    const leftCol = leftColRef.current;
    if (!card || !textEl || !leftCol) return;

    card.style.width = `${width}px`;

    let leftColHeight = leftCol.clientHeight;
    if (leftColHeight > 0) {
      leftColHeightRef.current = leftColHeight;
    } else {
      leftColHeight = leftColHeightRef.current;
    }

    const nonTextHeight = 58;
    const availHeight = leftColHeight - nonTextHeight;
    if (availHeight <= 0) return;

    textEl.style.maxHeight = `${availHeight}px`;
    const textHeight = textEl.scrollHeight;

    if (textHeight > 0.85 * availHeight) {
      const targetHeight = 0.80 * availHeight;
      const textPadding = 48;
      const minTextWidth = width - textPadding;
      const targetTextWidth = (minTextWidth * textHeight) / targetHeight;
      const finalWidth = Math.min(480, Math.max(width, targetTextWidth + textPadding));
      card.style.width = `${finalWidth}px`;
      setCardWidth(finalWidth);
    } else {
      setCardWidth(width);
    }
  }, [
    cardResultText,
    cardDiff,
    width,
    customActions,
    inferenceOptions,
    selectedInferenceLevel,
    isCardOnly,
    confirmState,
  ]);

  // Capture the menu's natural height on mount so it's available as a
  // max-height cap in card-only mode (where left-col width becomes 0px).
  useEffect(() => {
    if (leftColRef.current) {
      const h = leftColRef.current.scrollHeight;
      if (h > 0) leftColHeightRef.current = h;
    }
  }, []);

  // Height animation for the card
  useEffect(() => {
    if (!showCard) return;
    const card = cardRef.current;
    const textEl = textContentRef.current;
    if (!card) return;

    if (heightRafRef.current) cancelAnimationFrame(heightRafRef.current);

    if (isCardOnly) {
      // In card-only mode: measure natural content height, cap at menu height.
      // alignSelf: flex-start on the card prevents the flex container's
      // items-stretch from interfering during measurement.
      if (textEl) textEl.style.maxHeight = "";
      const prevH = card.style.height;
      card.style.height = "auto";
      const naturalH = card.scrollHeight;
      card.style.height = prevH;
      const maxH = leftColHeightRef.current > 0
        ? leftColHeightRef.current
        : (leftColRef.current?.scrollHeight ?? 480);
      setCardHeight(Math.min(naturalH, maxH));
      return;
    }

    // 2-column mode: measure and match the left column's height.
    // Reset text maxHeight first so the card content can breathe.
    if (textEl) textEl.style.maxHeight = "";
    const prevH = card.style.height;
    card.style.height = "auto";
    const naturalH = card.scrollHeight;
    card.style.height = prevH;

    heightRafRef.current = requestAnimationFrame(() => {
      const leftCol = leftColRef.current;
      if (leftCol && leftCol.clientHeight > 0) {
        leftColHeightRef.current = leftCol.clientHeight;
        setCardHeight(leftCol.clientHeight);
      } else if (leftColHeightRef.current > 0) {
        setCardHeight(leftColHeightRef.current);
      } else {
        setCardHeight(naturalH);
      }
    });

    return () => {
      if (heightRafRef.current) cancelAnimationFrame(heightRafRef.current);
    };
  }, [cardResultText, cardDiff, isCardLoading, confirmState, showCard, isCardOnly]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Hone actions"
      onMouseDownCapture={onMouseDownCapture}
      onMouseDown={onMouseDown}
      className="hone-surface hone-fade-in fixed flex flex-row items-stretch gap-3 p-2 antialiased select-none outline-none"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        minWidth: !showCard
          ? `${width + 16}px`
          : isCardOnly
          ? `${width + 16}px`
          : `${width * 2 + 12}px`,
        width: "max-content",
        pointerEvents: "auto",
        zIndex: 2147483646,
        transition:
          "min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Left Column: Actions List */}
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

        {inferenceOptions && selectedInferenceLevel ? (
          <div className="mx-1 mb-0.5 flex h-7 gap-0">
            {/* Left button */}
            <button
              type="button"
              className="flex h-7 w-[18px] items-center justify-center rounded-l-lg text-muted-foreground hover:text-foreground"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--foreground) 8%, transparent)",
              }}
              onClick={onInferencePrev}
              aria-label="Previous text scope"
            >
              ‹
            </button>

            {/* Center text area */}
            <div
              className="flex min-w-0 flex-1 items-center justify-start px-2"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--foreground) 6%, transparent)",
              }}
            >
              <span className="truncate text-[11px] font-medium capitalize leading-tight text-foreground">
                {selectedInferenceLevel}
                {inferencePreview(inferenceOptions, selectedInferenceLevel) &&
                  " • "}
                <span className="font-normal text-muted-foreground">
                  {inferencePreview(inferenceOptions, selectedInferenceLevel)}
                </span>
              </span>
            </div>

            {/* Right button */}
            <button
              type="button"
              className="flex h-7 w-[18px] items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
              style={{
                backgroundColor:
                  "color-mix(in oklch, var(--foreground) 8%, transparent)",
              }}
              onClick={onInferenceNext}
              aria-label="Next text scope"
            >
              ›
            </button>
          </div>
        ) : null}

        {hasAdapter ? (
          <>
            <div className="flex flex-col gap-0.5 px-0.5">
              {PRIMARY_ACTIONS.map((item, i) => (
                <MenuRow
                  key={item.action}
                  idx={i}
                  focused={focusedActionIdx === i}
                  isLoading={loadingActionId === item.action}
                  icon={
                    <item.icon className="size-3.5 shrink-0" strokeWidth={2} />
                  }
                  label={item.label}
                  shortcut={shortcut?.action === item.action ? shortcut : null}
                  onFocus={() => onFocusAction(i)}
                  onSelect={() => onTriggerAction(item.action, override)}
                />
              ))}
            </div>

            {customActions.length > 0 ? (
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
            ) : null}

            <div className="flex items-center gap-2 px-2 py-0.5">
              <div className="flex-1 h-px bg-border/60" />
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Change Tone or length
              </span>
              <div className="flex-1 h-px bg-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-1 px-1">
              {TONE_ACTIONS.map((item, i) => {
                const idx = toneActionStartIdx + i;
                const isLoading = loadingActionId === item.action;
                const isFocused = focusedActionIdx === idx;
                return (
                  <button
                    key={item.action}
                    type="button"
                    data-action-idx={idx}
                    data-focused={isFocused ? "true" : undefined}
                    className="hone-tone-btn"
                    onMouseEnter={() => onFocusAction(idx)}
                    onClick={() => onTriggerAction(item.action, override)}
                  >
                    {isLoading ? (
                      <svg className="size-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <item.icon className="size-3 shrink-0" strokeWidth={2} />
                    )}
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {isFocused && !isLoading && (
                      <span className="hone-kbd shrink-0 flex items-center justify-center p-0.5 border-foreground/20 bg-foreground/10 text-foreground scale-90">
                        <CornerDownLeft className="size-2.5 text-foreground" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
              {LENGTH_ACTIONS.map((item, i) => {
                const idx = lengthActionStartIdx + i;
                const isLoading = loadingActionId === item.action;
                const isFocused = focusedActionIdx === idx;
                return (
                  <button
                    key={item.action}
                    type="button"
                    data-action-idx={idx}
                    data-focused={isFocused ? "true" : undefined}
                    className="hone-tone-btn"
                    onMouseEnter={() => onFocusAction(idx)}
                    onClick={() => onTriggerAction(item.action, override)}
                  >
                    {isLoading ? (
                      <svg className="size-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <item.icon className="size-3 shrink-0" strokeWidth={2} />
                    )}
                    <span className="flex-1 truncate text-left">{item.label}</span>
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
        ) : (
          <p className="px-3 py-2 text-center text-xs text-muted-foreground">
            Text selected (read-only)
          </p>
        )}
      </div>

      {/* Right Column: Local Spellcheck & AI Preview Card */}
      {showCard && <div
        ref={cardRef}
        className="flex-1 flex flex-col gap-2.5 p-3 rounded-lg border border-border/80 bg-muted/15 relative overflow-hidden"
        style={{
          width: isCardOnly ? `${width}px` : `${cardWidth}px`,
          minWidth: `${width}px`,
          maxWidth: "480px",
          height: displayCardHeight !== null ? `${displayCardHeight}px` : undefined,
          alignSelf: isCardOnly ? "flex-start" : undefined,
          transition:
            "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {confirmState ? (
          <div className="flex-1 flex flex-col justify-between h-full">
            <p className="text-xs leading-relaxed text-foreground font-medium">
              {confirmState.action === "cancel_generation"
                ? "Are you sure you want to cancel the AI generation?"
                : `An action is already running. Abort it and run “${confirmState.actionLabel}”?`}
            </p>
            <div className="flex items-center justify-end gap-1.5 pt-2 mt-auto">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onCancelConfirm}
              >
                No
              </Button>
              <Button
                type="button"
                variant="default"
                size="xs"
                className="h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3 bg-primary text-primary-foreground select-none cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onConfirmAction}
              >
                <CornerDownLeft className="size-2.5 text-primary-foreground" strokeWidth={3} />
                Yes
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={textContentRef}
              className="flex-1 overflow-y-auto text-xs leading-normal pr-6 whitespace-pre-wrap select-text"
              style={{
                fontFamily: '"Geist Variable", system-ui, sans-serif',
                maxHeight: "220px",
              }}
            >
              {isCardLoading && !cardResultText ? (
                <span className="text-muted-foreground italic">
                  Honing your text...
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
                    {cardActionId === "fix_spelling_local" || cardActionId === "fix_spelling"
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

            <div className="flex items-center justify-end gap-1 pt-0.5 mt-auto">
              {isCardOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
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
                size="xs"
                disabled={
                  !!(isCardLoading ||
                    !cardResultText ||
                    (cardDiff &&
                      cardDiff.length === 1 &&
                      cardDiff[0].type === "equal"))
                }
                className={cn(
                  "h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3 bg-primary text-primary-foreground select-none cursor-pointer transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
                    <CornerDownLeft className="size-2.5 text-primary-foreground" strokeWidth={3} />
                  </span>
                </div>
              </Button>
            </div>
          </>
        )}
      </div>}
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
          <svg className="size-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
