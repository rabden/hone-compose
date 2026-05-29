import type { RefObject, ReactNode } from "react";
import {
  Briefcase,
  Check,
  Feather,
  Heart,
  Maximize2,
  MessageSquare,
  Minimize2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { HoneLogo } from "@/components/hone-logo";
import type { InferredSelection } from "./adapters";
import { renderActionIcon } from "@/lib/action-icons";
import type { ActionHandler } from "./actions";

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
}

const PRIMARY_ACTIONS = [
  { action: "improve", icon: Feather, label: "Improve writing" },
  { action: "paraphrase", icon: RefreshCw, label: "Paraphrase" },
  { action: "fix_spelling", icon: Check, label: "Fix spelling" },
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
}: FloatingActionMenuProps) {
  const override = getInferenceOverride();

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Hone actions"
      onMouseDownCapture={onMouseDownCapture}
      onMouseDown={onMouseDown}
      className="hone-surface hone-fade-in fixed flex flex-col gap-1 p-1.5 antialiased select-none outline-none"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        pointerEvents: "auto",
        zIndex: 2147483646,
      }}
    >
      <header className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-1">
        <div className="flex min-w-0 items-center gap-2">
          <HoneLogo size={16} alt="" className="opacity-90" />
          <span className="text-xs font-semibold tracking-tight text-foreground">
            Hone
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
              return (
                <button
                  key={item.action}
                  type="button"
                  data-action-idx={idx}
                  data-focused={focusedActionIdx === idx ? "true" : undefined}
                  className="hone-tone-btn"
                  onMouseEnter={() => onFocusAction(idx)}
                  onClick={() => onTriggerAction(item.action, override)}
                >
                  <item.icon className="size-3 shrink-0" strokeWidth={2} />
                  {item.label}
                </button>
              );
            })}
            {LENGTH_ACTIONS.map((item, i) => {
              const idx = lengthActionStartIdx + i;
              return (
                <button
                  key={item.action}
                  type="button"
                  data-action-idx={idx}
                  data-focused={focusedActionIdx === idx ? "true" : undefined}
                  className="hone-tone-btn"
                  onMouseEnter={() => onFocusAction(idx)}
                  onClick={() => onTriggerAction(item.action, override)}
                >
                  <item.icon className="size-3 shrink-0" strokeWidth={2} />
                  {item.label}
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
  );
}

function MenuRow({
  idx,
  focused,
  icon,
  label,
  shortcut,
  onFocus,
  onSelect,
}: {
  idx: number;
  focused: boolean;
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
      <span className="hone-menu-item-icon">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {shortcut && (
        <span className="hone-kbd shrink-0 tabular-nums text-[9px]">
          {formatShortcut(shortcut)}
        </span>
      )}
    </button>
  );
}
