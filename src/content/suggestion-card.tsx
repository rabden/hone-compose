import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ProofreadFix, ProofreadIssue } from "./proofread-issues";

export interface SuggestionCardProps {
  issue: ProofreadIssue;
  /** The flagged source text (dictionary row label). */
  flagged: string;
  top: number;
  left: number;
  cardRef: (el: HTMLElement | null) => void;
  onPointerEnterCard: () => void;
  onPointerLeaveCard: () => void;
  onApplyFix: (fix: ProofreadFix) => void;
  onIgnore: () => void;
  onAddToDictionary?: () => void;
}

/**
 * QuillBot-style card anchored under an underlined issue: just the fixes
 * Harper offers (click to apply), plus dictionary/ignore. No error-type
 * header — the options speak for themselves.
 */
export function SuggestionCard({
  issue,
  flagged,
  top,
  left,
  cardRef,
  onPointerEnterCard,
  onPointerLeaveCard,
  onApplyFix,
  onIgnore,
  onAddToDictionary,
}: SuggestionCardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cardRef(rootRef.current);
    return () => cardRef(null);
  }, [cardRef]);

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label={`Suggestions for ${issue.category}: ${flagged.trim()}`}
      className="hone-surface hone-fade-in fixed flex w-60 flex-col gap-0.5 p-1.5 antialiased select-none"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        pointerEvents: "auto",
        zIndex: 2147483646,
      }}
      onPointerEnter={onPointerEnterCard}
      onPointerLeave={onPointerLeaveCard}
      onMouseDown={(e) => {
        // Keep the field focused so applying a fix needs no focus dance.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {issue.fixes.length === 0 ? (
        <span className="px-2 py-2 text-[11px] italic text-muted-foreground/70">
          No suggestions
        </span>
      ) : (
        <div className="flex max-h-56 flex-col overflow-y-auto">
          {issue.fixes.map((fix, i) => (
            <FixRow key={`${fix.label}-${i}`} onClick={() => onApplyFix(fix)}>
              {fix.label}
            </FixRow>
          ))}
        </div>
      )}

      <div className="mx-1.5 h-px bg-border/60" />

      {issue.kind === "spelling" && onAddToDictionary && (
        <FixRow muted onClick={onAddToDictionary}>
          Add “{flagged.trim()}” to dictionary
        </FixRow>
      )}
      <FixRow muted onClick={onIgnore}>
        Ignore
      </FixRow>
    </div>
  );
}

function FixRow({
  children,
  onClick,
  muted = false,
}: {
  children: ReactNode;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full items-center truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        muted
          ? "font-normal text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          : "font-semibold text-foreground hover:bg-primary/10",
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}
