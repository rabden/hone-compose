/**
 * Live proofreading controller (QuillBot-style, modeled on markview's
 * editor::spell): lints the focused field ~500ms after typing settles,
 * underlines Harper's spans (CSS Custom Highlight API on contenteditable),
 * and opens an anchored suggestion card when the pointer dwells on one.
 *
 * One controller per focused field; created and torn down by app.tsx.
 */

import type { EditableAdapter } from "./adapters";
import { getPlainTextMap, offsetFromDomPoint } from "./plain-text-dom";
import { getSpanClientRects, getSpansClientRects } from "./span-geometry";
import { lintForIssues, proofreadAddWord, proofreadIgnoreLint, subscribeProofreadState } from "./grammar-worker";
import { ProofreadScheduler, invalidateLintCache } from "./proofread-scheduler";
export { invalidateLintCache } from "./proofread-scheduler";
import {
  ignoreKey,
  type ProofreadFix,
  type ProofreadIssue,
} from "./proofread-issues";

/** Pointer must rest on an issue this long before the card opens. */
const DWELL_MS = 160;
/** Grace after the pointer leaves before the card closes. */
const LEAVE_GRACE_MS = 260;

export interface HoverCardState {
  issue: ProofreadIssue;
  /** The flagged source text (dictionary row label, apply-fix fallback). */
  flagged: string;
  anchor: DOMRect;
}

export interface ApplyFixResult {
  committed: boolean;
  suggestClipboardPaste: boolean;
}

/** Session-scoped ignores (per tab), shared across fields. */
const sessionIgnores = new Set<string>();
subscribeProofreadState(invalidateLintCache);

const HIGHLIGHT_SPELL = "hone-spell";
const HIGHLIGHT_GRAMMAR = "hone-grammar";
const STYLE_ID = "hone-proofread-styles";

function supportsCssHighlights(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof Highlight !== "undefined"
  );
}

function injectHighlightStyles(): void {
  if (!supportsCssHighlights()) return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ::highlight(${HIGHLIGHT_SPELL}) {
      text-decoration: underline wavy rgba(220, 38, 38, 0.85);
      text-decoration-skip-ink: none;
      background-color: rgba(220, 38, 38, 0.07);
    }
    ::highlight(${HIGHLIGHT_GRAMMAR}) {
      text-decoration: underline wavy rgba(37, 99, 235, 0.8);
      text-decoration-skip-ink: none;
      background-color: rgba(37, 99, 235, 0.06);
    }
  `;
  document.head.appendChild(style);
}

function caretPointAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    return pos ? { node: pos.offsetNode, offset: pos.offset } : null;
  }
  if (typeof doc.caretRangeFromPoint === "function") {
    const range = doc.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }
  return null;
}

export class LiveProofreader {
  private readonly adapter: EditableAdapter;
  private readonly onIssues: (issues: ProofreadIssue[]) => void;
  private readonly onHoverCard: (card: HoverCardState | null) => void;

  private readonly element: HTMLElement;
  private isNative: boolean;

  private checkedText = "";
  private scheduler: ProofreadScheduler | null = null;
  private observer: MutationObserver | null = null;
  private running = false;
  private savedSpellcheck: string | null = null;
  private nativeSpellcheckDisabled = false;

  /** Filtered issues currently underlined (what the user sees). */
  private paintedIssues: ProofreadIssue[] = [];
  /** Cached rects per painted issue (native fields only, hit-testing). */
  private nativeRects: DOMRect[][] = [];
  private nativeRectsValid = false;

  private hoveredIssue: ProofreadIssue | null = null;
  /** The issue the open card is currently showing (click-to-open toggling). */
  private cardIssue: ProofreadIssue | null = null;
  /** Issue whose card was just closed by a click — don't hover-reopen it. */
  private suppressIssue: ProofreadIssue | null = null;
  private dwellTimer = 0;
  private closeTimer = 0;
  private cardElement: HTMLElement | null = null;
  private rafId = 0;

  constructor(opts: {
    adapter: EditableAdapter;
    onIssues: (issues: ProofreadIssue[]) => void;
    onHoverCard: (card: HoverCardState | null) => void;
  }) {
    this.adapter = opts.adapter;
    this.onIssues = opts.onIssues;
    this.onHoverCard = opts.onHoverCard;
    this.element = opts.adapter.getElement();
    this.isNative =
      this.element instanceof HTMLInputElement ||
      this.element instanceof HTMLTextAreaElement;
  }

  // ── lifecycle ──────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    injectHighlightStyles();
    this.disableNativeSpellcheck();
    this.scheduler = new ProofreadScheduler(lintForIssues, (text, issues) => {
      if (!this.running) return;
      if (this.safeGetText() !== text) {
        this.handleInput();
        return;
      }
      this.checkedText = text;
      this.publish(issues);
    });
    if (!this.isNative) {
      this.observer = new MutationObserver(() => {
        if (this.safeGetText() !== this.checkedText) this.handleInput();
      });
      this.observer.observe(this.element, { childList: true, characterData: true, subtree: true });
    }

    this.element.addEventListener("input", this.handleInput, true);
    this.element.addEventListener("compositionstart", this.handleCompositionStart);
    this.element.addEventListener("compositionend", this.handleCompositionEnd);
    this.element.addEventListener("pointermove", this.handlePointerMove, true);
    this.element.addEventListener("pointerout", this.handlePointerOut, true);
    this.element.addEventListener("pointerdown", this.handlePointerDown, true);
    this.element.addEventListener("blur", this.handleBlur, true);
    window.addEventListener("scroll", this.handleViewportChange, true);
    window.addEventListener("resize", this.handleViewportChange, true);
    window.addEventListener("keydown", this.handleKeyDown, true);
    window.addEventListener("pointermove", this.handleGlobalPointerMove, true);

    this.scheduler.update(this.safeGetText() ?? "");
  }

  stop(): void {
    this.running = false;
    this.restoreNativeSpellcheck();
    this.scheduler?.stop();
    this.scheduler = null;
    this.observer?.disconnect();
    this.observer = null;
    this.clearTimers();
    this.element.removeEventListener("input", this.handleInput, true);
    this.element.removeEventListener("compositionstart", this.handleCompositionStart);
    this.element.removeEventListener("compositionend", this.handleCompositionEnd);
    this.element.removeEventListener("pointermove", this.handlePointerMove, true);
    this.element.removeEventListener("pointerout", this.handlePointerOut, true);
    this.element.removeEventListener("pointerdown", this.handlePointerDown, true);
    this.element.removeEventListener("blur", this.handleBlur, true);
    window.removeEventListener("scroll", this.handleViewportChange, true);
    window.removeEventListener("resize", this.handleViewportChange, true);
    window.removeEventListener("keydown", this.handleKeyDown, true);
    window.removeEventListener("pointermove", this.handleGlobalPointerMove, true);

    this.closeHoverCard();
    this.paintedIssues = [];
    this.nativeRects = [];
    this.checkedText = "";
    this.clearHighlights();
    this.onIssues([]);
  }

  /** The hover card registers itself so pointer-over-card keeps it open. */
  setCardElement(el: HTMLElement | null): void {
    this.cardElement = el;
  }

  // Native spellcheck is element-scoped — it cannot be exempted per word, so
  // Hone replaces it on this field while proofreading and restores the
  // field's own setting when the controller releases it.
  private disableNativeSpellcheck(): void {
    if (this.nativeSpellcheckDisabled) return;
    this.savedSpellcheck = this.element.getAttribute("spellcheck");
    this.element.setAttribute("spellcheck", "false");
    this.nativeSpellcheckDisabled = true;
  }

  private restoreNativeSpellcheck(): void {
    if (!this.nativeSpellcheckDisabled) return;
    this.nativeSpellcheckDisabled = false;
    if (this.savedSpellcheck === null) this.element.removeAttribute("spellcheck");
    else this.element.setAttribute("spellcheck", this.savedSpellcheck);
  }

  closeHoverCard(): void {
    this.clearTimers();
    this.hoveredIssue = null;
    this.cardIssue = null;
    // Unconditional: even if this controller never opened a card (e.g. it
    // replaced one that did), the app's hoverCard state gets cleared. React
    // bails out on the redundant null so this costs nothing.
    this.onHoverCard(null);
  }

  private clearTimers(): void {
    if (this.dwellTimer) window.clearTimeout(this.dwellTimer);
    this.dwellTimer = 0;
    if (this.closeTimer) window.clearTimeout(this.closeTimer);
    this.closeTimer = 0;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  // ── checking ───────────────────────────────────────────────────────────

  private handleInput = (): void => {
    this.closeHoverCard();
    this.invalidateNativeRects();
    this.scheduler?.update(this.safeGetText() ?? "");
  };

  private handleCompositionStart = (): void => {
    this.closeHoverCard();
    this.scheduler?.pause();
  };

  private handleCompositionEnd = (): void => {
    this.scheduler?.resume(this.safeGetText() ?? "");
  };

  private safeGetText(): string | null {
    try {
      return this.adapter.getText();
    } catch {
      return null;
    }
  }

  /** Paint the filtered set: highlights on CE, published rects for native. */
  private publish(issues: ProofreadIssue[]): void {
    if (this.cardIssue) this.closeHoverCard();
    const visible = issues.filter((issue) => {
      const flagged = this.checkedText.slice(issue.start, issue.end);
      return flagged && !sessionIgnores.has(ignoreKey(issue, flagged));
    });
    this.paintedIssues = visible;
    this.invalidateNativeRects();
    this.paintHighlights();
    this.onIssues(visible);
  }

  private paintHighlights(): void {
    if (this.isNative || !supportsCssHighlights()) return;
    if (!this.element.isConnected) return;

    const spellRanges: Range[] = [];
    const grammarRanges: Range[] = [];
    const map = getPlainTextMap(this.element);
    for (const issue of this.paintedIssues) {
      const range = this.buildDomRange(issue.start, issue.end, map);
      if (!range) continue;
      (issue.kind === "spelling" ? spellRanges : grammarRanges).push(range);
    }

    try {
      CSS.highlights.set(HIGHLIGHT_SPELL, new Highlight(...spellRanges));
      CSS.highlights.set(HIGHLIGHT_GRAMMAR, new Highlight(...grammarRanges));
    } catch {
      // Out-of-document ranges or partial support — drop the highlights.
      this.clearHighlights();
    }
  }

  private clearHighlights(): void {
    if (!supportsCssHighlights()) return;
    try {
      CSS.highlights.delete(HIGHLIGHT_SPELL);
      CSS.highlights.delete(HIGHLIGHT_GRAMMAR);
    } catch {
      /* ignore */
    }
  }

  private buildDomRange(start: number, end: number, map: ReturnType<typeof getPlainTextMap>): Range | null {
    try {
      const s = map.pointAt(start);
      const e = map.pointAt(end);
      if (!s || !e) return null;
      const range = document.createRange();
      range.setStart(s.node, s.offset);
      range.setEnd(e.node, e.offset);
      return range;
    } catch {
      return null;
    }
  }

  // ── hover hit-testing + card lifecycle ─────────────────────────────────

  private handlePointerMove = (e: PointerEvent): void => {
    if (e.buttons !== 0) {
      this.closeHoverCard();
      return;
    }
    if (this.rafId) return;
    const x = e.clientX;
    const y = e.clientY;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.hitTest(x, y);
    });
  };

  private handlePointerOut = (e: PointerEvent): void => {
    // Leaving the field entirely starts the close grace (card may cancel it).
    if (!this.element.contains(e.relatedTarget as Node | null)) {
      this.scheduleClose();
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.cardElement?.contains(e.target as Node | null)) return;

    const issue = this.issueAtPoint(e.clientX, e.clientY);
    if (issue) {
      // Click on an underlined issue: toggle its card (QuillBot-style
      // click-to-open; a second click on the same one dismisses it).
      if (this.cardIssue === issue) {
        this.suppressIssue = issue;
        this.closeHoverCard();
      } else {
        this.suppressIssue = null;
        this.openCardFor(issue);
      }
      return;
    }

    // Clicking elsewhere in the field moves the caret; never keep a card
    // open over that.
    this.closeHoverCard();
  };

  private handleBlur = (): void => {
    this.closeHoverCard();
  };

  /**
   * Close arbiter of last resort. The card lives in the shadow DOM, not in
   * the field, so once the pointer is over it the field's own listeners go
   * quiet. While a card is open, any pointermove that is neither over the
   * card nor over the field re-arms the close — so the card can never get
   * stranded open after the pointer wanders off.
   *
   * The card check is geometric on purpose: events leaving our open shadow
   * root are retargeted to the host element, so `cardElement.contains(
   * event.target)` is never true from a window-level listener.
   */
  private handleGlobalPointerMove = (e: PointerEvent): void => {
    if (!this.cardIssue) return;
    if (this.isPointOverCard(e.clientX, e.clientY)) {
      this.cardPointerEntered();
      return;
    }
    const target = e.target as Node | null;
    if (target && this.element.contains(target)) {
      // Over the field — its own hit-testing decides whether to keep open.
      return;
    }
    this.scheduleClose();
  };

  /** Pointer-inside-card test by viewport coordinates (retargeting-proof). */
  private isPointOverCard(x: number, y: number): boolean {
    const el = this.cardElement;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    );
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.hoveredIssue) {
      e.preventDefault();
      e.stopPropagation();
      this.closeHoverCard();
    }
  };

  private handleViewportChange = (): void => {
    this.invalidateNativeRects();
    if (this.hoveredIssue) {
      // Anchor moved under the pointer; easiest correct move is to close.
      this.closeHoverCard();
    }
  };

  private invalidateNativeRects(): void {
    this.nativeRects = [];
    this.nativeRectsValid = false;
  }

  private hitTest(x: number, y: number): void {
    if (!this.running) return;
    const issue = this.issueAtPoint(x, y);
    if (!issue) {
      if (this.hoveredIssue) this.scheduleClose();
      else if (this.dwellTimer) {
        window.clearTimeout(this.dwellTimer);
        this.dwellTimer = 0;
      }
      this.hoveredIssue = null;
      this.suppressIssue = null; // pointer left — allow hover again
      return;
    }

    if (this.closeTimer) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = 0;
    }
    if (this.hoveredIssue === issue) return;
    if (this.suppressIssue === issue) return; // click-dismissed; stay quiet

    this.hoveredIssue = issue;
    if (this.dwellTimer) window.clearTimeout(this.dwellTimer);
    this.dwellTimer = window.setTimeout(() => {
      this.dwellTimer = 0;
      this.openCardFor(this.hoveredIssue);
    }, DWELL_MS);
  }

  /** Open (or switch) the suggestion card for an issue, anchored under it. */
  private openCardFor(issue: ProofreadIssue | null): void {
    if (!issue || !this.running) return;
    const anchor = this.issueAnchorRect(issue);
    if (!anchor) return;
    this.hoveredIssue = issue;
    this.cardIssue = issue;
    if (this.closeTimer) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = 0;
    }
    this.onHoverCard({
      issue,
      flagged: this.checkedText.slice(issue.start, issue.end),
      anchor,
    });
  }

  private scheduleClose(): void {
    if (this.dwellTimer) {
      window.clearTimeout(this.dwellTimer);
      this.dwellTimer = 0;
    }
    if (this.closeTimer) window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = 0;
      this.closeHoverCard();
    }, LEAVE_GRACE_MS);
  }

  /** The card calls this when the pointer enters it (cancels close). */
  cardPointerEntered(): void {
    if (this.closeTimer) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = 0;
    }
  }

  /** The card calls this when the pointer leaves it (re-arms close; the
   *  grace window lets the pointer cross back onto the error or the field). */
  cardPointerLeft(): void {
    if (this.cardIssue) this.scheduleClose();
  }

  private issueAtPoint(x: number, y: number): ProofreadIssue | null {
    if (this.paintedIssues.length === 0) return null;

    if (this.isNative) {
      for (let i = 0; i < this.paintedIssues.length; i++) {
        const rects = this.nativeRectsFor(i);
        for (const rect of rects) {
          const padY = Math.max(4, rect.height * 0.35);
          if (
            x >= rect.left - 1 &&
            x <= rect.right + 1 &&
            y >= rect.top - padY &&
            y <= rect.bottom + padY
          ) {
            return this.paintedIssues[i];
          }
        }
      }
      return null;
    }

    const point = caretPointAt(x, y);
    if (!point) return null;
    if (!this.element.contains(point.node)) return null;
    let offset = 0;
    try {
      offset = offsetFromDomPoint(this.element, point.node, point.offset);
    } catch {
      return null;
    }
    return (
      this.paintedIssues.find(
        (issue) => offset >= issue.start && offset <= issue.end,
      ) ?? null
    );
  }

  private nativeRectsFor(index: number): DOMRect[] {
    if (!this.nativeRectsValid) {
      this.nativeRects = getSpansClientRects(this.adapter, this.paintedIssues);
      this.nativeRectsValid = true;
    }
    return this.nativeRects[index] ?? [];
  }

  /** Anchor rect for the hover card (first client rect of the span). */
  issueAnchorRect(issue: ProofreadIssue): DOMRect | null {
    try {
      const rects = getSpanClientRects(this.adapter, issue.start, issue.end);
      return rects[0] ?? null;
    } catch {
      return null;
    }
  }

  // ── actions from the card ──────────────────────────────────────────────

  /**
   * Dismiss this issue. With a context hash the ignore persists (Harper's
   * stable hash goes to storage and both linter worlds); without one it
   * falls back to the session-scoped key.
   */
  async ignoreIssue(issue: ProofreadIssue): Promise<void> {
    this.closeHoverCard();
    if (!this.paintedIssues.includes(issue)) return;
    const flagged = this.checkedText.slice(issue.start, issue.end);
    if (issue.contextHash) {
      try {
        await proofreadIgnoreLint(issue.contextHash);
      } catch {
        // Persistence failed — session ignore below still applies.
      }
    }
    if (flagged) sessionIgnores.add(ignoreKey(issue, flagged));
    await this.refreshAfterStateChange();
  }

  /**
   * Add the flagged word to the persistent personal dictionary. Harper's
   * own dictionary learns the word, so it stops being flagged everywhere.
   */
  async addToDictionary(issue: ProofreadIssue): Promise<void> {
    this.closeHoverCard();
    if (!this.paintedIssues.includes(issue)) return;
    const word = this.checkedText.slice(issue.start, issue.end).trim();
    if (!word) return;
    try {
      await proofreadAddWord(word);
    } catch {
      // Best effort — nothing to refresh if it failed.
      return;
    }
    await this.refreshAfterStateChange();
  }

  /** Dictionary/ignore changes invalidate cached lints — re-check now. */
  private async refreshAfterStateChange(): Promise<void> {
    invalidateLintCache();
  }

  async applyFix(issue: ProofreadIssue, fix: ProofreadFix): Promise<ApplyFixResult> {
    this.closeHoverCard();
    const expectedText = this.checkedText.slice(issue.start, issue.end);
    if (!expectedText || !this.paintedIssues.includes(issue)) {
      return { committed: false, suggestClipboardPaste: false };
    }

    let committed: boolean;
    let suggestClipboardPaste = false;
    try {
      const tx = await this.adapter.replaceRange(
        issue.start,
        issue.end,
        fix.replacement,
        {
          expectedText,
          fieldSnapshot: this.checkedText,
        },
      );
      committed = typeof tx === "boolean" ? tx : tx.committed;
      suggestClipboardPaste =
        typeof tx === "object" && tx.suggestClipboardPaste;
    } catch {
      committed = false;
    }

    if (committed) {
      // Check immediately so fresh underlines land right after the edit, and
      // again shortly after: Slate/Lexical flush their DOM a beat after the
      // transaction resolves, and the lint cache makes the retry free.
      this.scheduler?.update(this.safeGetText() ?? "", 0);
      window.setTimeout(() => {
        if (this.running && this.checkedText !== this.safeGetText()) {
          this.scheduler?.update(this.safeGetText() ?? "", 0);
        }
      }, 350);
    }
    return { committed, suggestClipboardPaste };
  }
}

/** Session ignores survive field switches within the tab (module state). */
export function isSessionIgnored(issue: ProofreadIssue, flagged: string): boolean {
  return sessionIgnores.has(ignoreKey(issue, flagged));
}
