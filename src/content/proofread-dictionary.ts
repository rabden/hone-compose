/**
 * Persistent proofreading state shared by the content script and the
 * background grammar worker:
 *
 * - Personal dictionary (words added from the suggestion card). These are
 *   imported into Harper's own dictionary via `importWords`, so Harper stops
 *   flagging them natively.
 * - Ignored lint hashes (Harper `contextHash` values). Harper's
 *   `ignoreLintHash` stores hashes but `lint()` does not filter by them, so
 *   we filter ourselves at lint time — the hashes stay stable across
 *   linter instances, which makes them safely persistable.
 *
 * Everything lives in chrome.storage.local; each world keeps an in-memory
 * copy and the content script notifies the background worker when new
 * entries are added so both linter instances stay in sync.
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
    try {
      const res = (await chrome.storage.local.get([
        WORDS_KEY,
        IGNORED_KEY,
      ])) as Record<string, unknown>;
      const storedWords = Array.isArray(res[WORDS_KEY]) ? res[WORDS_KEY] : [];
      const storedIgnored = Array.isArray(res[IGNORED_KEY])
        ? res[IGNORED_KEY]
        : [];
      for (const w of storedWords) {
        if (typeof w === "string" && w.trim()) words.add(w.trim());
      }
      for (const h of storedIgnored) {
        if (typeof h === "string" && h) ignoredHashes.add(h);
      }
    } catch {
      // Storage unavailable — run with empty state rather than failing checks.
    }
    loaded = true;
  })();

  return loadPromise;
}

export function getDictionaryWords(): string[] {
  return Array.from(words);
}

export function isIgnoredHash(hash: string | undefined): boolean {
  return !!hash && ignoredHashes.has(hash);
}

async function persist(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [WORDS_KEY]: Array.from(words).slice(0, MAX_WORDS),
      [IGNORED_KEY]: Array.from(ignoredHashes).slice(0, MAX_IGNORED),
    });
  } catch {
    // Best effort — in-memory state still applies for this session.
  }
}

export async function addDictionaryWord(word: string): Promise<void> {
  await loadProofreadState();
  const trimmed = word.trim();
  if (!trimmed || words.has(trimmed)) return;
  words.add(trimmed);
  await persist();
}

export async function addIgnoredLintHash(hash: string): Promise<void> {
  await loadProofreadState();
  if (!hash || ignoredHashes.has(hash)) return;
  ignoredHashes.add(hash);
  await persist();
}
