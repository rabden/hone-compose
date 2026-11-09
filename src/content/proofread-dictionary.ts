/**
 * Persistent proofreading state owned by the background grammar worker.
 * Only its serialized queue may load or mutate this state; content scripts
 * send state messages instead of keeping or writing full-array snapshots.
 *
 * Dictionary words prime Harper via importWords. Ignored context hashes are
 * filtered in our pipeline because Harper's lint() does not filter them.
 * All data stays local in chrome.storage.local.
 */

const WORDS_KEY = "proofreadWords";
const IGNORED_KEY = "proofreadIgnoredLintHashes";

/** Cap growth: ignoring is cheap, but no list should grow unbounded. */
const MAX_WORDS = 2000;
const MAX_IGNORED = 5000;

const words = new Set<string>();
const ignoredHashes = new Set<string>();
let loaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadProofreadState(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = (await chrome.storage.local.get([
      WORDS_KEY,
      IGNORED_KEY,
    ])) as Record<string, unknown>;
    const storedWords = Array.isArray(res[WORDS_KEY]) ? res[WORDS_KEY] : [];
    const storedIgnored = Array.isArray(res[IGNORED_KEY]) ? res[IGNORED_KEY] : [];
    const nextWords = new Set<string>();
    const nextIgnored = new Set<string>();
    for (const w of storedWords) {
      if (nextWords.size >= MAX_WORDS) break;
      if (typeof w === "string" && w.trim()) nextWords.add(w.trim());
    }
    for (const h of storedIgnored) {
      if (nextIgnored.size >= MAX_IGNORED) break;
      if (typeof h === "string" && h) nextIgnored.add(h);
    }
    // Also bound legacy oversized storage, not just the in-memory copies.
    if (storedWords.length > MAX_WORDS || storedIgnored.length > MAX_IGNORED) {
      await chrome.storage.local.set({
        [WORDS_KEY]: Array.from(nextWords),
        [IGNORED_KEY]: Array.from(nextIgnored),
      });
    }
    for (const w of nextWords) words.add(w);
    for (const h of nextIgnored) ignoredHashes.add(h);
    loaded = true;
  })();

  try {
    await loadPromise;
  } finally {
    // Failed reads/writes must be retryable, not an empty authoritative state.
    loadPromise = null;
  }
}

export function getDictionaryWords(): string[] {
  return Array.from(words);
}

export function isIgnoredHash(hash: string | undefined): boolean {
  return !!hash && ignoredHashes.has(hash);
}

/** Return whether a new word was persisted and needs importing into Harper. */
export async function addDictionaryWord(word: string): Promise<boolean> {
  await loadProofreadState();
  const trimmed = word.trim();
  if (!trimmed || words.has(trimmed)) return false;
  if (words.size >= MAX_WORDS) {
    throw new Error(`Personal dictionary is full (${MAX_WORDS} words).`);
  }
  await chrome.storage.local.set({ [WORDS_KEY]: [...words, trimmed] });
  // Commit in memory only after persistence succeeds, so a failed write can
  // be retried and is never accidentally imported into Harper.
  words.add(trimmed);
  return true;
}

export async function addIgnoredLintHash(hash: string): Promise<void> {
  await loadProofreadState();
  if (!hash || ignoredHashes.has(hash)) return;
  if (ignoredHashes.size >= MAX_IGNORED) {
    throw new Error(`Proofreading ignore list is full (${MAX_IGNORED} entries).`);
  }
  await chrome.storage.local.set({ [IGNORED_KEY]: [...ignoredHashes, hash] });
  ignoredHashes.add(hash);
}
