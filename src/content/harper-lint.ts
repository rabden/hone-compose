/**
 * Background Harper lint pipeline: computes context hashes, drops persistently
 * ignored lints, and converts the rest to serializable issues for the page.
 */

import type { Linter } from "harper.js";
import {
  harperLintsToIssues,
  hasConsecutiveSpellingErrors,
  looksLikeNonEnglish,
  type ProofreadIssue,
  type RawLint,
} from "./proofread-issues";
import {
  getDictionaryWords,
  isIgnoredHash,
  loadProofreadState,
} from "./proofread-dictionary";

const configuredLinters = new WeakSet<Linter>();

async function ensureProofreadRules(linter: Linter): Promise<void> {
  if (configuredLinters.has(linter)) return;
  if (typeof linter.getLintConfig === "function" && typeof linter.setLintConfig === "function") {
    const config = await linter.getLintConfig();
    if (config && config.LongSentences !== false) {
      // Disable Harper's built-in LongSentences rule at lint time so its
      // whole-sentence Readability span cannot wipe out inner spelling/grammar lints.
      await linter.setLintConfig({ ...config, LongSentences: false });
    }
  }
  configuredLinters.add(linter);
}

/** Lint text into positioned issues, honoring the personal dictionary and
 *  the persistent ignore list. The density guard is a fallback for text whose
 *  language could not be confidently detected; confident English skips it. */
export async function runHarperLint(
  linter: Linter,
  text: string,
  options?: { densityGuard?: boolean },
): Promise<ProofreadIssue[]> {
  await ensureProofreadRules(linter);
  await loadProofreadState();

  const lints = await linter.lint(text, { language: "plaintext" });
  if (!lints || lints.length === 0) return [];

  const raw: RawLint[] = [];
  for (const lint of lints) {
    let contextHash: string | undefined;
    try {
      contextHash = String(await linter.contextHash(text, lint));
    } catch {
      contextHash = undefined;
    }
    if (isIgnoredHash(contextHash)) continue;

    // Harper already exposes UTF-16 spans, including after astral/ZWJ characters.
    const span = lint.span();
    const offsets = { start: span.start, end: span.end };
    span.free();
    raw.push({
      span: offsets,
      lintKind: lint.lint_kind(),
      message: lint.message(),
      problemText: lint.get_problem_text(),
      suggestions: lint.suggestions().map((s) => ({
        kind: s.kind() as number,
        replacementText: s.get_replacement_text(),
      })),
      ...(contextHash ? { contextHash } : {}),
    });
  }

  const issues = harperLintsToIssues(raw, text);
  // A run of consecutive misspellings is never English, whatever the
  // script-based language detector guesses for Latin characters.
  if (hasConsecutiveSpellingErrors(issues, text)) return [];
  if (options?.densityGuard !== false && looksLikeNonEnglish(issues, text)) return [];
  return issues;
}

/** Feed the persisted personal dictionary and rule tuning into a freshly set-up linter. */
export async function primeLinterState(linter: Linter): Promise<void> {
  await ensureProofreadRules(linter);
  await loadProofreadState();
  const words = getDictionaryWords();
  if (words.length === 0) return;
  await linter.importWords(words);
}
