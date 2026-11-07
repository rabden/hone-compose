import { LocalLinter, Dialect, createBinaryModuleFromUrl } from "harper.js";
import { runHarperLint, primeLinterState } from "../content/harper-lint";
import {
  addDictionaryWord,
  addIgnoredLintHash,
} from "../content/proofread-dictionary";
import type { ProofreadIssue } from "../content/proofread-issues";

let linterInstance: LocalLinter | null = null;
let initPromise: Promise<LocalLinter> | null = null;

function getWasmUrl(): string {
  return chrome.runtime.getURL("harper_wasm_bg.wasm");
}

export async function getLinter(): Promise<LocalLinter> {
  if (linterInstance) return linterInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const wasmUrl = getWasmUrl();
    const binary = createBinaryModuleFromUrl(wasmUrl);
    const linter = new LocalLinter({
      binary,
      dialect: Dialect.American,
    });
    await linter.setup();
    await primeLinterState(linter);
    linterInstance = linter;
    return linter;
  })();

  return initPromise;
}

async function isEnglishText(text: string): Promise<boolean> {
  if (!text || text.trim().length < 5) return true;

  return new Promise((resolve) => {
    chrome.i18n.detectLanguage(text, (result) => {
      if (!result || !result.isReliable) {
        resolve(true);
        return;
      }

      const primary = result.languages[0];
      if (primary && primary.language === "en" && primary.percentage >= 75) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

/** Background twin of the content worker's lintForIssues (CSP fallback path). */
export async function lintForIssues(text: string): Promise<ProofreadIssue[]> {
  if (!text || !text.trim()) {
    return [];
  }

  try {
    const isEnglish = await isEnglishText(text);
    if (!isEnglish) {
      return [];
    }

    const linter = await getLinter();
    return await runHarperLint(linter, text);
  } catch (error) {
    console.error("Background grammar check failed.", error);
    return [];
  }
}

/**
 * The content script persisted new proofreading state; mirror it here so the
 * background linter (used by every CSP-fallback tab) agrees with it.
 */
export async function syncProofreadState(added: {
  word?: string;
  hash?: string;
}): Promise<void> {
  if (added.word) {
    await addDictionaryWord(added.word);
    if (linterInstance) {
      try {
        await linterInstance.importWords([added.word.trim()]);
      } catch {
        // Best effort.
      }
    }
  }
  if (added.hash) {
    await addIgnoredLintHash(added.hash);
  }
}
