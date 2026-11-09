import { test } from "node:test";
import { strict as assert } from "node:assert";

Object.defineProperty(globalThis, "chrome", { value: undefined, writable: true, configurable: true });

let moduleId = 0;
async function freshDictionary() {
  return import(`../src/content/proofread-dictionary.ts?test=${moduleId++}`);
}

test("failed storage reads are retryable and cannot overwrite existing dictionary state", async (t) => {
  let failRead = true;
  const stored = { proofreadWords: ["Existing"], proofreadIgnoredLintHashes: ["123"] };
  t.mock.property(globalThis, "chrome", {
    storage: { local: {
      async get() {
        if (failRead) throw new Error("Read failed");
        return structuredClone(stored);
      },
      async set(update: object) { Object.assign(stored, update); },
    } },
  });
  const dictionary = await freshDictionary();
  await assert.rejects(dictionary.addDictionaryWord("New"), /Read failed/);
  assert.deepEqual(dictionary.getDictionaryWords(), []);
  failRead = false;
  await dictionary.addDictionaryWord("New");
  assert.deepEqual(stored.proofreadWords, ["Existing", "New"]);
  assert.equal(dictionary.isIgnoredHash("123"), true);
});

test("dictionary and ignore writes are awaited and only committed in memory on success", async (t) => {
  const stored: Record<string, string[]> = {};
  let failWrite = true;
  let releaseWrite = () => {};
  let pendingWrite = false;
  t.mock.property(globalThis, "chrome", {
    storage: { local: {
      async get() { return structuredClone(stored); },
      async set(update: object) {
        if (failWrite) throw new Error("Quota exceeded");
        pendingWrite = true;
        await new Promise<void>((resolve) => { releaseWrite = resolve; });
        Object.assign(stored, update);
      },
    } },
  });
  const dictionary = await freshDictionary();
  await assert.rejects(dictionary.addDictionaryWord("  Hone  "), /Quota exceeded/);
  await assert.rejects(dictionary.addIgnoredLintHash("123"), /Quota exceeded/);
  assert.deepEqual(dictionary.getDictionaryWords(), []);
  assert.equal(dictionary.isIgnoredHash("123"), false);
  failWrite = false;
  const word = dictionary.addDictionaryWord("  Hone  ");
  await Promise.resolve();
  assert.equal(pendingWrite, true);
  assert.deepEqual(dictionary.getDictionaryWords(), []);
  releaseWrite();
  await word;
  assert.deepEqual(stored.proofreadWords, ["Hone"]);
  assert.deepEqual(dictionary.getDictionaryWords(), ["Hone"]);
  const hash = dictionary.addIgnoredLintHash("123");
  await Promise.resolve();
  assert.equal(dictionary.isIgnoredHash("123"), false);
  releaseWrite();
  await hash;
  assert.deepEqual(stored.proofreadIgnoredLintHashes, ["123"]);
  assert.equal(dictionary.isIgnoredHash("123"), true);
});

test("legacy oversized state is bounded in storage and memory; new entries fail at the same limits", async (t) => {
  const stored = {
    proofreadWords: Array.from({ length: 2003 }, (_, i) => `Word${i}`),
    proofreadIgnoredLintHashes: Array.from({ length: 5003 }, (_, i) => `Hash${i}`),
  };
  t.mock.property(globalThis, "chrome", {
    storage: { local: {
      async get() { return structuredClone(stored); },
      async set(update: object) { Object.assign(stored, update); },
    } },
  });
  const dictionary = await freshDictionary();
  await dictionary.loadProofreadState();
  assert.equal(stored.proofreadWords.length, 2000);
  assert.equal(dictionary.getDictionaryWords().length, 2000);
  assert.equal(stored.proofreadIgnoredLintHashes.length, 5000);
  assert.equal(dictionary.isIgnoredHash("Hash4999"), true);
  assert.equal(dictionary.isIgnoredHash("Hash5000"), false);
  await assert.rejects(dictionary.addDictionaryWord("Overflow"), /dictionary is full/);
  await assert.rejects(dictionary.addIgnoredLintHash("Overflow"), /ignore list is full/);
  await dictionary.addDictionaryWord("Word0");
  await dictionary.addIgnoredLintHash("Hash0");
  assert.equal(dictionary.getDictionaryWords().length, 2000);
  assert.equal(dictionary.isIgnoredHash("Overflow"), false);
});

test("failed legacy trimming reports failure and retries without partial in-memory state", async (t) => {
  let failWrite = true;
  const stored = {
    proofreadWords: Array.from({ length: 2001 }, (_, i) => `Word${i}`),
    proofreadIgnoredLintHashes: ["123"],
  };
  t.mock.property(globalThis, "chrome", {
    storage: { local: {
      async get() { return structuredClone(stored); },
      async set(update: object) {
        if (failWrite) throw new Error("Write failed");
        Object.assign(stored, update);
      },
    } },
  });
  const dictionary = await freshDictionary();
  await assert.rejects(dictionary.loadProofreadState(), /Write failed/);
  assert.deepEqual(dictionary.getDictionaryWords(), []);
  assert.equal(dictionary.isIgnoredHash("123"), false);
  failWrite = false;
  await dictionary.loadProofreadState();
  assert.equal(dictionary.getDictionaryWords().length, 2000);
  assert.equal(dictionary.isIgnoredHash("123"), true);
});
