import { LocalLinter, Dialect, createBinaryModuleFromUrl } from "harper.js";
import { runHarperLint, primeLinterState } from "../content/harper-lint";
import {
  addDictionaryWord,
  addIgnoredLintHash,
} from "../content/proofread-dictionary";
import type { ProofreadIssue } from "../content/proofread-issues";

let linterInstance: LocalLinter | null = null;
let queue: Promise<void> = Promise.resolve();

// One queue owns startup, linting, dictionary imports and persistence across
// every tab. A failed job rejects its caller without poisoning later jobs.
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.then(() => {}, () => {});
  return result;
}

// Only call inside the queue. Calling the public getLinter from queued work
// would enqueue behind itself and deadlock.
async function ensureLinter(): Promise<LocalLinter> {
  if (linterInstance) return linterInstance;

  // The wasm fetch can fail transiently while the service worker cold-starts
  // or right after an extension reload. harper drops the rejected load, so a
  // fresh binary module re-fetches; retry once before surfacing the failure.
  let binary = createBinaryModuleFromUrl(chrome.runtime.getURL("harper_wasm_bg.wasm"));
  try {
    // LocalLinter's constructor starts binary.setup without awaiting its failure.
    await binary.setup();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
    binary = createBinaryModuleFromUrl(chrome.runtime.getURL("harper_wasm_bg.wasm"));
    await binary.setup();
  }
  const linter = new LocalLinter({ binary, dialect: Dialect.American });
  try {
    await linter.setup();
    await primeLinterState(linter);
    linterInstance = linter;
    return linter;
  } catch (error) {
    await linter.dispose().catch(() => {});
    throw error;
  }
}

export async function getLinter(): Promise<LocalLinter> {
  return enqueue(ensureLinter);
}

type LanguageVerdict = "english" | "non-english" | "unknown";

async function detectTextLanguage(text: string): Promise<LanguageVerdict> {
  if (!text || text.trim().length < 5) return "english";

  return new Promise((resolve, reject) => {
    chrome.i18n.detectLanguage(text, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message || "Language detection failed."));
        return;
      }
      if (!result || !result.isReliable) {
        resolve("unknown");
        return;
      }
      resolve(result.languages[0]?.language === "en" ? "english" : "non-english");
    });
  });
}

/** All local proofreading runs off the page's UI thread. */
export async function lintForIssues(text: string): Promise<ProofreadIssue[]> {
  return enqueue(async () => {
    if (!text || !text.trim()) return [];
    const verdict = await detectTextLanguage(text);
    if (verdict === "non-english") return [];
    // Confident English detection outranks the density heuristic; only
    // uncertain text needs the fallback guard against non-English prose.
    return runHarperLint(await ensureLinter(), text, { densityGuard: verdict === "unknown" });
  });
}

/** Persist state as the sole writer, then update the active linter before the
 *  next queued check. No tab writes a stale full-array snapshot. */
export async function syncProofreadState(added: {
  word?: string;
  hash?: string;
}): Promise<void> {
  return enqueue(async () => {
    if (added.word) {
      const isNewWord = await addDictionaryWord(added.word);
      if (isNewWord && linterInstance) {
        try {
          await linterInstance.importWords([added.word.trim()]);
        } catch (error) {
          // Persistence succeeded, but this linter may be partially updated.
          // Re-prime from authoritative storage on the next startup, and report
          // this failure rather than claiming the import succeeded.
          const failedLinter = linterInstance;
          linterInstance = null;
          await failedLinter.dispose().catch(() => {});
          throw error;
        }
      }
    }
    if (added.hash) {
      await addIgnoredLintHash(added.hash);
    }
  });
}
