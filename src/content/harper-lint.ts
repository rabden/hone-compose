/**
 * Shared Harper lint pipeline for both linter worlds (content script local
 * linter and the background CSP-fallback linter): computes context hashes,
 * drops persistently-ignored lints, converts the rest to issues.
 */

import type { Linter } from "harper.js";
import {
  harperLintsToIssues,
  looksLikeNonEnglish,
  type ProofreadIssue,
  type RawLint,
} from "./proofread-issues";
import {
  getDictionaryWords,
  isIgnoredHash,
  loadProofreadState,
} from "./proofread-dictionary";

/** Lint text into positioned issues, honoring the personal dictionary and
 *  the persistent ignore list. */
export async function runHarperLint(
  linter: Linter,
  text: string,
): Promise<ProofreadIssue[]> {
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

    raw.push({
      span: { start: lint.span().start, end: lint.span().end },
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
  if (looksLikeNonEnglish(issues, text)) return [];
  return issues;
}

/** Feed the persisted personal dictionary into a freshly set-up linter. */
export async function primeLinterState(linter: Linter): Promise<void> {
  await loadProofreadState();
  const words = getDictionaryWords();
  if (words.length === 0) return;
  try {
    await linter.importWords(words);
  } catch {
    // Dictionary import is best-effort; linting still works without it.
  }
}
