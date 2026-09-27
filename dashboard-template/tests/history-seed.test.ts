/**
 * Unit test for the once-only history seeding flow
 * (dashboard-template/src/lib/history-seed.ts).
 *
 * The shipped `seedHistoryOnce` runs for real; only the storage backend is an
 * in-memory double (same approach as the localStorage shim in
 * settings-store.test.ts), so the decision logic, sample data and flag
 * handling are exercised exactly as the app runs them.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

class LocalStorageShim {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

(globalThis as Record<string, unknown>).localStorage = new LocalStorageShim();
(globalThis as Record<string, unknown>).window = new EventTarget();

const { shouldSeedHistory, buildSampleHistoryEntries, seedHistoryOnce } =
  await import("../src/lib/history-seed.ts");

/** In-memory backend double that records every call seedHistoryOnce makes. */
function makeBackend() {
  let flag = false;
  let entries: unknown[] = [];
  let writes = 0;
  return {
    get writeCount() {
      return writes;
    },
    get entries() {
      return entries;
    },
    async hasSeedFlag() {
      return flag;
    },
    async countEntries() {
      return entries.length;
    },
    async writeEntries(incoming: unknown[]) {
      writes += 1;
      entries = [...entries, ...incoming];
    },
    async markSeeded() {
      flag = true;
    },
    /** Simulates the app's Clear All: entries emptied, flag untouched. */
    async clearEntries() {
      entries = [];
    },
    /** Simulates history that predates the seeding feature. */
    async presetEntries(incoming: unknown[]) {
      entries = incoming;
    },
  };
}

describe("history seed decision", () => {
  test("seeds only when the flag is unset and the store is empty", () => {
    assert.equal(shouldSeedHistory(false, 0), true);
    assert.equal(shouldSeedHistory(true, 0), false);
    assert.equal(shouldSeedHistory(false, 3), false);
    assert.equal(shouldSeedHistory(true, 3), false);
  });
});

describe("sample history entries shape", () => {
  const samples = buildSampleHistoryEntries(Date.now());

  test("produces a non-empty catalog of sample entries", () => {
    assert.ok(samples.length >= 5, "expected several sample entries");
  });

  test("every sample matches the HistoryEntry contract", () => {
    const now = Date.now();
    for (const entry of samples) {
      assert.equal(typeof entry.action, "string");
      assert.ok(entry.action.length > 0);
      assert.equal(typeof entry.originalText, "string");
      assert.equal(typeof entry.rewrittenText, "string");
      assert.ok(entry.originalText.length > 0);
      assert.ok(entry.rewrittenText.length > 0);
      assert.equal(typeof entry.timestamp, "number");
      assert.ok(
        entry.timestamp <= now,
        "sample timestamps must not be in the future",
      );
      assert.ok(entry.url.startsWith("https://"));
      assert.equal(typeof entry.provider, "string");
      assert.equal(typeof entry.model, "string");
      assert.equal("id" in entry, false, "ids are minted by the storage layer");
    }
  });

  test("sample actions use real builtin action codes", async () => {
    const { BUILTIN_SHORTCUT_ACTIONS } = await import(
      "../src/lib/shortcuts.ts"
    );
    const codes = new Set(
      (BUILTIN_SHORTCUT_ACTIONS as Array<{ id: string }>).map((a) => a.id),
    );
    for (const entry of samples) {
      assert.ok(
        codes.has(entry.action),
        `sample action "${entry.action}" is not a builtin action code`,
      );
    }
  });
});

describe("seedHistoryOnce (real shipped flow, in-memory backend)", () => {
  test("first run on an empty store seeds samples and sets the flag", async () => {
    const backend = makeBackend();
    const seeded = await seedHistoryOnce(backend);
    assert.equal(seeded, true);
    assert.equal(backend.entries.length >= 5, true);
    assert.equal(backend.writeCount, 1, "samples are written in one batch");
    assert.equal(await backend.hasSeedFlag(), true);
  });

  test("second run is a no-op", async () => {
    const backend = makeBackend();
    await seedHistoryOnce(backend);
    const writesAfterFirst = backend.writeCount;
    const seededAgain = await seedHistoryOnce(backend);
    assert.equal(seededAgain, false);
    assert.equal(backend.writeCount, writesAfterFirst);
    assert.equal(backend.entries.length >= 5, true);
  });

  test("an externally cleared store is respected and stays empty", async () => {
    const backend = makeBackend();
    await seedHistoryOnce(backend);
    await backend.clearEntries();
    const seededAfterClear = await seedHistoryOnce(backend);
    assert.equal(seededAfterClear, false);
    assert.equal(backend.entries.length, 0, "cleared store must stay empty");
  });

  test("pre-existing user history is never polluted by samples", async () => {
    const backend = makeBackend();
    await backend.presetEntries([{ id: "user-entry", action: "improve" }]);
    const seeded = await seedHistoryOnce(backend);
    assert.equal(seeded, false);
    assert.equal(backend.writeCount, 0);
    assert.equal(backend.entries.length, 1, "user entries untouched");
    assert.equal(await backend.hasSeedFlag(), true, "flag adopted");
  });
});
