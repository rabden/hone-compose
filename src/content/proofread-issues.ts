/**
 * Pure Harper lint → issue conversion, shared by the content script and the
 * background grammar worker (both worlds must serialize lints the same way).
 *
 * Modeled on markview's spell::harper_issues: spelling lints win overlaps,
 * suggestions become labeled fixes, messages lose their Markdown.
 */

export interface ProofreadFix {
  /** What the card shows. */
  label: string;
  /** What replaces the flagged text. */
  replacement: string;
}

export interface ProofreadIssue {
  /** Character span in the checked text, [start, end). */
  start: number;
  end: number;
  /** Spelling underlines red, everything else blue (Google Docs/Word). */
  kind: "spelling" | "grammar";
  /** Short human name: "Spelling", "Grammar", "Punctuation", ... */
  category: string;
  /** One-sentence description, Markdown stripped. */
  message: string;
  /** Fixes, best first. May be empty. */
  fixes: ProofreadFix[];
  /**
   * Harper context hash (stringified bigint). Stable across linter
   * instances, so persisting it makes "Ignore" permanent. Absent when the
   * producing world could not compute one.
   */
  contextHash?: string;
}

/** The slice of harper.js's Lint surface we consume, already plain data. */
export interface RawLint {
  span: { start: number; end: number };
  lintKind: string;
  message: string;
  problemText: string;
  suggestions: { kind: number; replacementText: string }[];
  /** Stringified Harper context hash, when available. */
  contextHash?: string;
}

/** Mirrors harper.js's SuggestionKind enum. */
export const SUGGESTION_REPLACE = 0;
export const SUGGESTION_REMOVE = 1;
export const SUGGESTION_INSERT_AFTER = 2;

const MAX_FIXES = 6;

const CATEGORY_NAMES: Record<string, string> = {
  spelling: "Spelling",
  typo: "Typo",
  agreement: "Grammar",
  grammar: "Grammar",
  boundaryerror: "Grammar",
  capitalization: "Capitalization",
  punctuation: "Punctuation",
  formatting: "Formatting",
  eggcorn: "Word choice",
  malapropism: "Word choice",
  wordchoice: "Word choice",
  redundancy: "Repetition",
  repetition: "Repetition",
  readability: "Style",
  enhancement: "Style",
  style: "Style",
  regionalism: "Usage",
  nonstandard: "Usage",
  usage: "Usage",
};

function categoryOf(lintKind: string): string {
  return CATEGORY_NAMES[lintKind.toLowerCase()] ?? "Grammar";
}

/** Harper writes messages in Markdown; the card shows plain text. */
export function plainMessage(message: string): string {
  // Backticks come in pairs; close every second quote (markview's approach).
  const parts = message.replace(/`/g, "\u201C").replace(/\*\*/g, "").split("\u201C");
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    if (i === 0) out += parts[i];
    else if (i % 2 === 1) out += `\u201C${parts[i]}`;
    else out += `\u201D${parts[i]}`;
  }
  return out.trim();
}

/**
 * Session ignore key: same word misspelled anywhere ignores all copies;
 * grammar issues are keyed by flagged text + message.
 */
export function ignoreKey(issue: Pick<ProofreadIssue, "kind" | "message">, flagged: string): string {
  const lower = flagged.trim().toLowerCase();
  return issue.kind === "spelling"
    ? `w:${lower}`
    : `g:${lower}:${issue.message}`;
}

/**
 * Convert raw Harper lints into display issues:
 * - clamp spans to the text and drop empty ones
 * - sort spelling first (a misspelling wins when rules flag the same words)
 * - drop lints overlapping an already-taken span
 * - map suggestions to labeled fixes, dedupe, cap at 6
 */
export function harperLintsToIssues(lints: RawLint[], text: string): ProofreadIssue[] {
  const len = text.length;
  const sorted = [...lints].sort((a, b) => {
    const aSpelling = a.lintKind.toLowerCase() === "spelling" ? 0 : 1;
    const bSpelling = b.lintKind.toLowerCase() === "spelling" ? 0 : 1;
    if (aSpelling !== bSpelling) return aSpelling - bSpelling;
    return a.span.start - b.span.start;
  });

  const taken: { start: number; end: number }[] = [];
  const out: ProofreadIssue[] = [];

  for (const lint of sorted) {
    const start = Math.max(0, Math.min(lint.span.start, len));
    const end = Math.max(start, Math.min(lint.span.end, len));
    if (end <= start) continue;
    if (taken.some((t) => t.start < end && start < t.end)) continue;
    taken.push({ start, end });

    const flagged = text.slice(start, end);
    const fixes: ProofreadFix[] = [];
    for (const suggestion of lint.suggestions) {
      let label = "";
      let replacement = "";
      if (suggestion.kind === SUGGESTION_REMOVE) {
        const trimmed = flagged.trim();
        label = trimmed
          ? `Remove \u201C${trimmed}\u201D`
          : flagged === " "
            ? "Remove the space"
            : "Remove whitespace";
        replacement = "";
      } else if (suggestion.kind === SUGGESTION_INSERT_AFTER) {
        replacement = flagged + suggestion.replacementText;
        label = replacement.trim();
      } else {
        replacement = suggestion.replacementText;
        label = replacement.trim();
      }
      if (!label && !replacement) continue;
      if (replacement === flagged) continue;
      if (fixes.some((f) => f.replacement === replacement && f.label === label)) continue;
      fixes.push({ label, replacement });
      if (fixes.length >= MAX_FIXES) break;
    }

    const kind = lint.lintKind.toLowerCase() === "spelling" ? "spelling" : "grammar";
    out.push({
      start,
      end,
      kind,
      category: categoryOf(lint.lintKind),
      message:
        kind === "spelling"
          ? `\u201C${flagged.trim()}\u201D may be misspelled.`
          : plainMessage(lint.message) || "This text may need a second look.",
      fixes,
      ...(lint.contextHash ? { contextHash: lint.contextHash } : {}),
    });
  }

  out.sort((a, b) => a.start - b.start);
  return out;
}

/**
 * Non-English (or gibberish) text trips spelling rules on nearly every word.
 * When spelling issues dominate, the text is probably not English — check
 * nothing rather than underline everything.
 */
export function looksLikeNonEnglish(issues: ProofreadIssue[], text: string): boolean {
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  if (words.length < 3) return false;
  const spelling = issues.filter((i) => i.kind === "spelling").length;
  return spelling / words.length > 0.35;
}
