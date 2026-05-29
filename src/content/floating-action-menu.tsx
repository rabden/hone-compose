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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-1 pb-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </p>
  );
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
        <div className="mx-1.5 mb-0.5 rounded-lg border border-border/60 bg-muted/30 p-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="hone-chip-btn"
              onClick={onInferencePrev}
              aria-label="Previous text scope"
            >
              ‹
            </button>
            <div className="min-w-0 flex-1 px-0.5">
              <p className="text-[10px] font-semibold capitalize text-foreground">
                {selectedInferenceLevel}
              </p>
              <p className="truncate text-[10px] leading-snug text-muted-foreground">
                {inferencePreview(inferenceOptions, selectedInferenceLevel)}
              </p>
            </div>
            <button
              type="button"
              className="hone-chip-btn"
              onClick={onInferenceNext}
              aria-label="Next text scope"
            >
              ›
            </button>
          </div>
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
                icon={<item.icon className="size-3.5 shrink-0" strokeWidth={2} />}
                label={item.label}
                shortcut={shortcut?.action === item.action ? shortcut : null}
                onFocus={() => onFocusAction(i)}
                onSelect={() => onTriggerAction(item.action, override)}
              />
            ))}
          </div>

          {customActions.length > 0 ? (
            <>
              <div className="mx-2 my-0.5 h-px bg-border/60" />
              <SectionLabel>Custom</SectionLabel>
              <div className="flex flex-col gap-0.5 px-0.5">
                {customActions.map((ca, i) => {
                  const idx = customActionStartIdx + i;
                  const actionShortcut = quickShortcut?.action === ca.id ? quickShortcut : ca.shortcut;
                  return (
                    <MenuRow
                      key={ca.id}
                      idx={idx}
                      focused={focusedActionIdx === idx}
                      icon={renderActionIcon(ca.icon, {
                        size: 14,
                        color: ca.color || "var(--brand)",
                      })}
                      label={ca.name}
                      shortcut={actionShortcut}
                      onFocus={() => onFocusAction(idx)}
                      onSelect={() => onTriggerAction(ca.id, override)}
                    />
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="mx-2 my-0.5 h-px bg-border/60" />
          <SectionLabel>Tone</SectionLabel>
          <div className="grid grid-cols-2 gap-1 px-1 pb-0.5">
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
          </div>

          <SectionLabel>Length</SectionLabel>
          <div className="grid grid-cols-2 gap-1 px-1 pb-1">
            {LENGTH_ACTIONS.map((item, i) => {
              const idx = lengthActionStartIdx + i;
              return (
                <button
                  key={item.action}
                  type="button"
                  data-action-idx={idx}
                  data-focused={focusedActionIdx === idx ? "true" : undefined}
                  className="hone-tone-btn justify-center"
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
  shortcut?: { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta?: boolean } | null;
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
