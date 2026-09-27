/**
 * Storage utility for the standalone dashboard template.
 *
 * Drop-in replacement for the extension's storage module (settings store +
 * IndexedDB history): identical call signatures and behavior, backed by the local
 * settings store (localStorage) for settings/action configs and by IndexedDB
 * for rewrite history, so the copied options UI works in a plain web app.
 */

import {
  loadSettings,
  saveSettings,
  removeSettingKeys,
  onSettingsChanged,
} from "../lib/settings-store";
import { BUILTIN_ACTION_DEFAULTS } from "./builtin-defaults";

export interface ShortcutConfig {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export interface CustomAction {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  promptTemplate: string
  systemPrompt?: string
  temperature?: number
  provider?: string
  model?: string
  shortcut?: ShortcutConfig
  category?: string
  type?: 'builtin' | 'custom' | 'marketplace'
  replaceMode: 'replace' | 'preview'
  enabled: boolean
  createdAt: number
  isLocal?: boolean
  // Marketplace-specific fields
  sourceId?: string
  version?: string
  author?: string
  installedAt?: number
  tags?: string[]
}

export type AutoSpellcheckMode = 'disabled' | 'browser_only' | 'always';

export interface Config {
  // Shortcuts
  shortcutKey?: string;
  shortcutCtrl?: boolean;
  shortcutAlt?: boolean;
  shortcutShift?: boolean;
  shortcutMeta?: boolean;
  shortcutAction?: string;

  dropdownShortcutKey?: string;
  dropdownShortcutCtrl?: boolean;
  dropdownShortcutAlt?: boolean;
  dropdownShortcutShift?: boolean;
  dropdownShortcutMeta?: boolean;

  // UI
  hideDot?: boolean;
  previewInCard?: boolean;
  autoSpellcheckMode?: AutoSpellcheckMode;
  autoSpellcheckWordThreshold?: number;

  // History
  historyLimit?: number;

  // API
  googleAiStudioKey?: string;
  googleAiStudioModel?: string;
  provider?: string;

  // Provider fallback — try other configured providers when the active one fails
  enableProviderFallback?: boolean;
}

const CONFIG_KEYS: (keyof Config)[] = [
  'shortcutKey',
  'shortcutCtrl',
  'shortcutAlt',
  'shortcutShift',
  'shortcutMeta',
  'shortcutAction',
  'dropdownShortcutKey',
  'dropdownShortcutCtrl',
  'dropdownShortcutAlt',
  'dropdownShortcutShift',
  'dropdownShortcutMeta',
  'hideDot',
  'previewInCard',
  'autoSpellcheckMode',
  'autoSpellcheckWordThreshold',
  'historyLimit',
  'googleAiStudioKey',
  'googleAiStudioModel',
  'provider',
  'enableProviderFallback',
];

/**
 * Load configuration from the local settings store.
 */
export async function loadConfig(): Promise<Config> {
  const result = await loadSettings(CONFIG_KEYS as string[]);
  return result as Config;
}

/**
 * Save configuration to the local settings store.
 */
export async function saveConfig(config: Partial<Config>): Promise<void> {
  await saveSettings(config as Record<string, unknown>);
}

/**
 * Get a single config value
 */
export async function getConfigValue<K extends keyof Config>(
  key: K
): Promise<Config[K] | undefined> {
  const result = await loadSettings([key as string]);
  return result[key as string] as Config[K] | undefined;
}

/**
 * Watch for config changes and call callback
 */
export function onConfigChanged(
  callback: (changes: { [key: string]: { newValue?: unknown; oldValue?: unknown } }) => void
): () => void {
  return onSettingsChanged((changes) => {
    // Only notify if config keys changed
    const hasConfigChanges = Object.keys(changes).some((key) =>
      CONFIG_KEYS.includes(key as keyof Config)
    );
    if (hasConfigChanges) {
      callback(changes);
    }
  });
}

const CUSTOM_ACTIONS_KEY = 'customActions';
const ACTION_CONFIGS_KEY = 'actionConfigs';

async function migrateCustomActions(): Promise<void> {
  const existing = await loadSettings([CUSTOM_ACTIONS_KEY, ACTION_CONFIGS_KEY]);
  if (ACTION_CONFIGS_KEY in existing) return;
  const legacy = (existing[CUSTOM_ACTIONS_KEY] as CustomAction[]) || [];
  await saveSettings({ [ACTION_CONFIGS_KEY]: legacy });
  await removeSettingKeys([CUSTOM_ACTIONS_KEY]);
}

export async function loadAllActionConfigs(): Promise<CustomAction[]> {
  await migrateCustomActions();
  const result = await loadSettings([ACTION_CONFIGS_KEY]);
  let configs = (result[ACTION_CONFIGS_KEY] as CustomAction[]) || [];
  const hadSpellingLocal = configs.some((c) => c.id === "fix_spelling_local");
  if (hadSpellingLocal) {
    configs = configs.filter((c) => c.id !== "fix_spelling_local");
    await saveSettings({ [ACTION_CONFIGS_KEY]: configs });
  }
  // Sync builtin templates/prompts and append missing builtins.
  let changed = false;
  const builtinIds = new Set(configs.filter((c) => c.type === "builtin").map((c) => c.id));

  configs = configs.map((c) => {
    if (c.type === "builtin") {
      const def = BUILTIN_ACTION_DEFAULTS.find((d) => d.id === c.id);
      if (def && (c.promptTemplate !== def.promptTemplate || c.systemPrompt !== def.systemPrompt)) {
        changed = true;
        return {
          ...c,
          promptTemplate: def.promptTemplate,
          systemPrompt: def.systemPrompt,
        };
      }
    }
    return c;
  });

  const missing = BUILTIN_ACTION_DEFAULTS.filter((d) => !builtinIds.has(d.id));
  if (missing.length) {
    configs = [...configs, ...missing];
    changed = true;
  }

  if (changed) {
    await saveSettings({ [ACTION_CONFIGS_KEY]: configs });
  }
  return configs;
}

export async function saveAllActionConfigs(configs: CustomAction[]): Promise<void> {
  await saveSettings({ [ACTION_CONFIGS_KEY]: configs });
}

export async function saveActionConfig(action: CustomAction): Promise<void> {
  const configs = await loadAllActionConfigs();
  const idx = configs.findIndex((a) => a.id === action.id);
  if (idx >= 0) {
    configs[idx] = action;
  } else {
    configs.push(action);
  }
  await saveSettings({ [ACTION_CONFIGS_KEY]: configs });
}

export async function deleteActionConfig(id: string): Promise<void> {
  const configs = await loadAllActionConfigs();
  await saveSettings({
    [ACTION_CONFIGS_KEY]: configs.filter((a) => a.id !== id),
  });
}

// Legacy wrappers for backward compat — operate on the unified key
// Includes marketplace actions so label resolution (getActionLabel) works
// for history entries and shortcut displays.
export async function loadCustomActions(): Promise<CustomAction[]> {
  const all = await loadAllActionConfigs();
  return all.filter((a) => a.type === 'custom' || a.type === 'marketplace' || !a.type);
}

export async function saveCustomAction(action: CustomAction): Promise<void> {
  await saveActionConfig(action);
}

export async function deleteCustomAction(id: string): Promise<void> {
  await deleteActionConfig(id);
}

/**
 * IndexedDB utilities for history (settings store for configuration only)
 */
const DB_NAME = 'AIAssistantDB';
const HISTORY_STORE = 'history';
const DB_VERSION = 1;

export interface HistoryEntry {
  id?: string;
  action: string;
  originalText: string;
  rewrittenText: string;
  timestamp: number;
  url: string;
  provider: string;
  model: string;
}

/** Fired on window after any history mutation (replaces the extension's
 * HISTORY_UPDATED runtime message). */
export const HISTORY_UPDATED_EVENT = 'hone:history-updated';

export function emitHistoryUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT));
}

export function onHistoryUpdated(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(HISTORY_UPDATED_EVENT, callback);
  return () => window.removeEventListener(HISTORY_UPDATED_EVENT, callback);
}

/**
 * Open or create the IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this context');
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const store = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

/**
 * Read history limit from the settings store (default 1000)
 */
async function getHistoryLimit(): Promise<number> {
  const res = await loadSettings(['historyLimit']);
  return typeof res.historyLimit === 'number' ? res.historyLimit : 1000;
}

/**
 * Prune oldest history entries when count exceeds the configured limit
 */
async function enforceHistoryLimit(): Promise<void> {
  const maxItems = await getHistoryLimit();
  const db = await openDB();

  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction([HISTORY_STORE], 'readonly');
    const store = tx.objectStore(HISTORY_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (count <= maxItems) return;

  const excess = count - maxItems;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([HISTORY_STORE], 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    const index = store.index('timestamp');
    const cursorReq = index.openCursor(null, 'next');
    let deleted = 0;

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor && deleted < excess) {
        store.delete(cursor.primaryKey);
        deleted++;
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Add history entry to IndexedDB
 */
export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<string> {
  const db = await openDB();
  const finalEntry: HistoryEntry = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    timestamp: entry.timestamp || Date.now()
  };

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE], 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.put(finalEntry);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

  await enforceHistoryLimit();
  emitHistoryUpdated();

  return finalEntry.id!;
}

/**
 * Get history entries (with optional filtering)
 */
export async function getHistory(
  options?: {
    limit?: number;
    url?: string;
    startTime?: number;
  }
): Promise<HistoryEntry[]> {
  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch {
    // No IndexedDB (e.g. server rendering): there is no history yet.
    return [];
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE], 'readonly');
    const store = transaction.objectStore(HISTORY_STORE);

    let request: IDBRequest;
    if (options?.url) {
      const index = store.index('url');
      request = index.getAll(options.url);
    } else {
      request = store.getAll();
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let results = (request.result as HistoryEntry[]) || [];

      // Filter by timestamp if provided
      if (options?.startTime) {
        results = results.filter((entry) => entry.timestamp >= options.startTime!);
      }

      // Sort newest first by default
      results.sort((a, b) => b.timestamp - a.timestamp);

      // Limit results (allowing much larger limits, e.g. 5000+)
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      resolve(results);
    };
  });
}

/**
 * Delete a single history entry from IndexedDB
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE], 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all history from IndexedDB
 */
export async function clearHistory(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE], 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
