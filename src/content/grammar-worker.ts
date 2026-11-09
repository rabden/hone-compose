import type { ProofreadIssue } from "./proofread-issues";

// Failed off-page checks must reject, not become cacheable empty results.
function sendProofreadMessage(message: {
  type: "LINT_TEXT" | "WARMUP_LINTER" | "PROOFREAD_STATE_ADDED";
  text?: string;
  word?: string;
  hash?: string;
}): Promise<{ issues?: ProofreadIssue[] }> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const transportError = chrome.runtime.lastError;
      if (transportError) {
        reject(new Error(transportError.message || "Proofreading connection failed."));
      } else if (response?.success !== true) {
        reject(new Error(response?.error || "Background proofreading failed."));
      } else {
        resolve(response);
      }
    });
  });
}

export async function getLinter(): Promise<unknown> {
  await sendProofreadMessage({ type: "WARMUP_LINTER" });
  return null;
}

/** Lint off-page and return positioned issues, with fixes. */
export async function lintForIssues(text: string): Promise<ProofreadIssue[]> {
  if (!text || !text.trim()) return [];
  const response = await sendProofreadMessage({ type: "LINT_TEXT", text });
  if (!Array.isArray(response.issues)) {
    throw new Error("Invalid background proofreading response.");
  }
  return response.issues;
}

/** The background is the sole writer; await persistence and linter updates. */
export async function proofreadAddWord(word: string): Promise<void> {
  const trimmed = word.trim();
  if (!trimmed) return;
  await sendProofreadMessage({ type: "PROOFREAD_STATE_ADDED", word: trimmed });
}

/** Persistently ignore a lint by its Harper context hash. */
export async function proofreadIgnoreLint(contextHash: string): Promise<void> {
  if (!contextHash) return;
  await sendProofreadMessage({ type: "PROOFREAD_STATE_ADDED", hash: contextHash });
}

/** Notify cache owners about state changes from any tab; do not lint here. */
export function subscribeProofreadState(listener: () => void): () => void {
  const onChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (
      areaName === "local" &&
      ("proofreadWords" in changes || "proofreadIgnoredLintHashes" in changes)
    ) {
      listener();
    }
  };
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
}
