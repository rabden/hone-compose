import type { ProofreadIssue } from "./proofread-issues.ts";

const SETTLE_MS = 500;
const MAX_PARAGRAPH_LENGTH = 8000;
const CACHE_LIMIT = 128;
const cache = new Map<string, ProofreadIssue[]>();
const invalidationListeners = new Set<() => void>();
let cacheRevision = 0;

export function invalidateLintCache(): void {
  cacheRevision++;
  cache.clear();
  for (const listener of invalidationListeners) listener();
}

export function proofreadParagraphs(text: string) {
  const paragraphs: {
    start: number;
    text: string;
    lintText: string;
    issues?: ProofreadIssue[];
    carried?: ProofreadIssue[];
  }[] = [];
  let start = 0;
  while (start < text.length) {
    const newline = text.indexOf("\n", start);
    const end = newline < 0 ? text.length : newline + 1;
    const paragraph = text.slice(start, end);
    // A trailing token is still being typed until whitespace completes it.
    const lintText = newline < 0 ? paragraph.replace(/\S+$/u, "") : paragraph;
    paragraphs.push({ start, text: paragraph, lintText });
    start = end;
  }
  return paragraphs;
}

// Spans touching the edited region drop; the rest keep underlines until the
// next lint lands, so typing never blanks existing highlights.
export function rebaseIssues(
  issues: ProofreadIssue[],
  oldText: string,
  newText: string,
): ProofreadIssue[] {
  if (oldText === newText) return issues;
  const shorter = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < shorter && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < shorter - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) suffix++;
  const delta = newText.length - oldText.length;
  const kept: ProofreadIssue[] = [];
  for (const issue of issues) {
    if (issue.end <= prefix) kept.push(issue);
    else if (issue.start >= oldText.length - suffix) {
      kept.push({ ...issue, start: issue.start + delta, end: issue.end + delta });
    }
  }
  return kept;
}

export class ProofreadScheduler {
  private text = "";
  private paragraphs: ReturnType<typeof proofreadParagraphs> = [];
  private publishedIssues: ProofreadIssue[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private revision = 0;
  private busy = false;
  private ready = false;
  private stopped = false;
  private paused = false;
  private readonly lint: (text: string) => Promise<ProofreadIssue[]>;
  private readonly publish: (text: string, issues: ProofreadIssue[]) => void;

  constructor(
    lint: (text: string) => Promise<ProofreadIssue[]>,
    publish: (text: string, issues: ProofreadIssue[]) => void,
  ) {
    this.lint = lint;
    this.publish = publish;
    invalidationListeners.add(this.refresh);
  }

  update(text: string, delay = SETTLE_MS): void {
    if (this.stopped) return;
    this.cancelPending();
    const carried = rebaseIssues(this.publishedIssues, this.text, text);
    const previous = new Map(this.paragraphs.map((p) => [p.lintText, p]));
    this.text = text;
    this.paragraphs = proofreadParagraphs(text).map((paragraph) => {
      const prev = previous.get(paragraph.lintText);
      const lintEnd = paragraph.start + paragraph.lintText.length;
      const rebased = carried
        .filter((issue) => issue.start >= paragraph.start && issue.end <= lintEnd)
        .map((issue) => ({
          ...issue,
          start: issue.start - paragraph.start,
          end: issue.end - paragraph.start,
        }));
      return {
        ...paragraph,
        issues: prev?.issues ?? cache.get(paragraph.lintText),
        carried: prev?.carried ?? (rebased.length > 0 ? rebased : undefined),
      };
    });
    this.emit();
    if (this.paused) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.ready = true;
      void this.check();
    }, delay);
  }

  pause(): void {
    this.paused = true;
    this.cancelPending();
  }

  resume(text: string): void {
    this.paused = false;
    this.update(text);
  }

  stop(): void {
    this.stopped = true;
    this.cancelPending();
    invalidationListeners.delete(this.refresh);
  }

  private cancelPending(): void {
    this.revision++;
    this.ready = false;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private refresh = (): void => {
    this.paragraphs = [];
    this.update(this.text, 0);
  };

  private emit(): void {
    const issues = this.paragraphs.flatMap((paragraph) =>
      (paragraph.issues ?? paragraph.carried ?? []).map((issue) => ({
        ...issue,
        start: issue.start + paragraph.start,
        end: issue.end + paragraph.start,
      })),
    );
    this.publishedIssues = issues;
    this.publish(this.text, issues);
  }

  private async check(): Promise<void> {
    if (this.busy || !this.ready || this.stopped || this.paused) return;
    this.ready = false;
    this.busy = true;
    const revision = this.revision;
    const stateRevision = cacheRevision;
    try {
      for (const paragraph of this.paragraphs) {
        if (this.revision !== revision || this.stopped) return;
        if (paragraph.issues) continue;
        const text = paragraph.lintText;
        if (!text.trim() || text.length > MAX_PARAGRAPH_LENGTH) {
          paragraph.issues = [];
          continue;
        }
        const issues = cache.get(text) ?? await this.lint(text);
        // Invalidated responses must not repopulate either the view or cache.
        if (this.revision !== revision || cacheRevision !== stateRevision || this.stopped) return;
        paragraph.issues = issues;
        cache.delete(text);
        cache.set(text, issues);
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      }
      this.emit();
    } catch {
      // A failed transport is not an empty, cacheable lint result.
    } finally {
      this.busy = false;
      if (this.ready) void this.check();
    }
  }
}
