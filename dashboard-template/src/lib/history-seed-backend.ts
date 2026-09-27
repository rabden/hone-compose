/**
 * The app's seeding backend: IndexedDB history through the real storage
 * module's API, flag through the settings store. Split from the pure logic in
 * history-seed.ts so that module stays unit-testable under `node --test`.
 */

import {
  addHistoryEntry,
  getHistory,
} from "../content/storage";
import { loadSettings, saveSettings } from "./settings-store";
import {
  HISTORY_SEED_FLAG_KEY,
  seedHistoryOnce,
  type HistorySeedBackend,
  type SeedableHistoryEntry,
} from "./history-seed";

export const indexedDbHistorySeedBackend: HistorySeedBackend = {
  async hasSeedFlag() {
    const result = await loadSettings([HISTORY_SEED_FLAG_KEY]);
    return result[HISTORY_SEED_FLAG_KEY] === true;
  },
  async countEntries() {
    return (await getHistory()).length;
  },
  async writeEntries(entries) {
    for (const entry of entries) {
      await addHistoryEntry(entry);
    }
  },
  async markSeeded() {
    await saveSettings({ [HISTORY_SEED_FLAG_KEY]: true });
  },
};

/** Seed the sample history once, writing through the real history API. */
export async function seedAppHistory(): Promise<boolean> {
  return seedHistoryOnce(indexedDbHistorySeedBackend);
}
