/**
 * Unit test for the template's real settings store
 * (dashboard-template/src/lib/settings-store.ts).
 *
 * The module under test is imported as shipped — no re-implementation and
 * no mocks of its internals. A plain localStorage shim is installed on
 * globalThis so the store's browser persistence path runs under `node --test`.
 * Node's built-in TypeScript stripping executes the file directly.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Storage shim (spec-shaped subset of the DOM localStorage) ──
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

const shim = new LocalStorageShim();
(globalThis as Record<string, unknown>).localStorage = shim;
// The store guards on `typeof window` and uses window event APIs for change
// notifications; give it a real EventTarget so the browser code path is
// exercised for real under node.
(globalThis as Record<string, unknown>).window = new EventTarget();

const {
  loadSettings,
  saveSettings,
  removeSettingKeys,
  getSetting,
  onSettingsChanged,
  SETTINGS_STORAGE_KEY,
} = await import("../src/lib/settings-store.ts");

describe("settings-store round-trip", () => {
  test("write → read returns the stored settings", async () => {
    const patch = {
      activeProvider: "groq",
      openrouterKey: "sk-or-v1-test-123",
      dropdownShortcutKey: "d",
      historyLimit: 800,
    };
    await saveSettings(patch);
    const all = await loadSettings();
    for (const [key, value] of Object.entries(patch)) {
      assert.equal(all[key], value, `round-trip mismatch for ${key}`);
    }
  });

  test("read with a key subset mirrors the extension's keyed storage get", async () => {
    await saveSettings({ openrouterKey: "sk-or-v1-test-123", groqKey: "gsk_x" });
    const subset = await loadSettings(["openrouterKey"]);
    assert.deepEqual(subset, { openrouterKey: "sk-or-v1-test-123" });
  });

  test("settings persist across reads (storage-backed, no memory cache)", async () => {
    await saveSettings({ openaiCompatibleBaseUrl: "http://localhost:8080/v1" });
    // Read the raw storage document — proves persistence, not just state.
    const raw = JSON.parse(shim.getItem(SETTINGS_STORAGE_KEY) as string);
    assert.equal(raw.openaiCompatibleBaseUrl, "http://localhost:8080/v1");
    // A fresh read (as after a page reload) sees the same value.
    const again = await loadSettings(["openaiCompatibleBaseUrl"]);
    assert.equal(again.openaiCompatibleBaseUrl, "http://localhost:8080/v1");
  });

  test("removeSettingKeys deletes and keeps other keys intact", async () => {
    await saveSettings({ hideDot: true, previewInCard: false });
    await removeSettingKeys(["hideDot"]);
    const all = await loadSettings();
    assert.equal("hideDot" in all, false);
    assert.equal(all.previewInCard, false);
  });

  test("getSetting falls back for missing keys", async () => {
    await removeSettingKeys(["historyLimit"]);
    assert.equal(getSetting("nonexistent-key", 42), 42);
    assert.equal(getSetting("historyLimit", 1000), 1000);
  });

  test("change listeners observe saved patches", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const unsubscribe = onSettingsChanged((changes) => seen.push(changes));
    await saveSettings({ groqKey: "gsk_abc" });
    unsubscribe();
    await saveSettings({ groqKey: "gsk_after_unsub" });
    assert.equal(seen.length, 1);
    const change = seen[0].groqKey as { newValue: string };
    assert.equal(change.newValue, "gsk_abc");
  });
});
