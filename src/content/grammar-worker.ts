import { LocalLinter, Dialect, createBinaryModuleFromUrl } from "harper.js";
import { runHarperLint, primeLinterState } from "./harper-lint";
import {
  addDictionaryWord,
  addIgnoredLintHash,
} from "./proofread-dictionary";
import type { ProofreadIssue } from "./proofread-issues";

// ponytail: try local WASM first (instant, stays in tab memory).
// If page CSP blocks WebAssembly, flip to background service worker fallback.
let linterInstance: LocalLinter | null = null;
let initPromise: Promise<LocalLinter> | null = null;
let useBackground = false;

function getWasmUrl(): string {
  return chrome.runtime.getURL("harper_wasm_bg.wasm");
}

async function getLocalLinter(): Promise<LocalLinter> {
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

function lintViaBackground(text: string): Promise<ProofreadIssue[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "LINT_TEXT", text }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        resolve([]);
        return;
      }
      resolve((response.issues ?? []) as ProofreadIssue[]);
    });
  });
}

function warmupViaBackground(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "WARMUP_LINTER" }, (response) => {
      if (chrome.runtime.lastError) { reject(chrome.runtime.lastError); return; }
      if (response?.success) { resolve(null); } else { reject(new Error(response?.error || "Warmup failed")); }
    });
  });
}

function switchToBackground(): void {
  useBackground = true;
  initPromise = null;
  linterInstance = null;
}

export async function getLinter(): Promise<unknown> {
  if (useBackground) return warmupViaBackground();
  try {
    return await getLocalLinter();
  } catch {
    switchToBackground();
    return warmupViaBackground();
  }
}

/**
 * Lint text and return positioned issues (with fixes) instead of corrected
 * text, so live proofreading can underline exactly what Harper flagged.
 */
export async function lintForIssues(text: string): Promise<ProofreadIssue[]> {
  if (!text || !text.trim()) return [];
  if (useBackground) return lintViaBackground(text);

  try {
    const isEnglish = await isEnglishText(text);
    if (!isEnglish) return [];

    const linter = await getLocalLinter();
    return await runHarperLint(linter, text);
  } catch (error) {
    // CSP or WASM compilation blocked — switch to background permanently for this tab
    if (
      error instanceof WebAssembly.CompileError ||
      (error instanceof Error && error.message.includes("WebAssembly"))
    ) {
      switchToBackground();
      return lintViaBackground(text);
    }
    console.error("Local grammar check failed.", error);
    return [];
  }
}

/** Mirror newly persisted state into the background linter. Awaited so a
 *  following LINT_TEXT never races the sync. */
async function notifyBackgroundStateAdded(added: {
  word?: string;
  hash?: string;
}): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: "PROOFREAD_STATE_ADDED", ...added });
  } catch {
    // Extension context gone — storage persistence already happened.
  }
}

/**
 * Add a word to the persistent personal dictionary. Persists to storage,
 * imports it into the local linter when active, and syncs the background.
 */
export async function proofreadAddWord(word: string): Promise<void> {
  const trimmed = word.trim();
  if (!trimmed) return;
  await addDictionaryWord(trimmed);
  if (!useBackground && linterInstance) {
    try {
      await linterInstance.importWords([trimmed]);
    } catch {
      // Best effort — the word still persists and primes future linters.
    }
  }
  await notifyBackgroundStateAdded({ word: trimmed });
}

/** Persistently ignore a lint by its Harper context hash. */
export async function proofreadIgnoreLint(contextHash: string): Promise<void> {
  if (!contextHash) return;
  await addIgnoredLintHash(contextHash);
  await notifyBackgroundStateAdded({ hash: contextHash });
}
