/**
 * Local settings store for the standalone dashboard template.
 *
 * Replaces the extension's direct storage-API calls with a
 * localStorage-backed key/value map persisted as one JSON document.
 * Dependency-free on purpose: the unit test loads this module directly
 * under `node --test`, so only erasable TypeScript and no imports.
 *
 * All storage access is guarded, so the module is safe to import during
 * server rendering (every read/write no-ops to defaults without a DOM).
 */

export const SETTINGS_STORAGE_KEY = "hone:settings";

export const SETTINGS_CHANGED_EVENT = "hone:settings-changed";

/** Mirrors the shape of the extension's per-key storage change records. */
export interface SettingsChange {
  oldValue?: unknown;
  newValue?: unknown;
}

export type SettingsObject = Record<string, unknown>;

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStore(): SettingsObject {
  if (!hasLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as SettingsObject;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStore(settings: SettingsObject): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota or serialization failure: settings become best-effort, like the
    // extension treating storage failures as non-fatal.
  }
}

function emitChanges(changes: Record<string, SettingsChange>): void {
  if (typeof window === "undefined" || Object.keys(changes).length === 0) return;
  window.dispatchEvent(
    new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: changes }),
  );
}

/**
 * Read persisted settings. When `keys` is provided, only those keys are
 * returned (mirroring the extension's keyed storage get); otherwise the full
 * settings object is returned.
 */
export async function loadSettings(
  keys?: string[],
): Promise<SettingsObject> {
  const settings = readStore();
  if (!keys) return settings;
  const result: SettingsObject = {};
  for (const key of keys) {
    if (key in settings) result[key] = settings[key];
  }
  return result;
}

/** Merge a patch into the persisted settings (mirrors the extension's storage set). */
export async function saveSettings(patch: SettingsObject): Promise<void> {
  const settings = readStore();
  const changes: Record<string, SettingsChange> = {};
  for (const key of Object.keys(patch)) {
    const oldValue = settings[key];
    const newValue = patch[key];
    settings[key] = newValue;
    changes[key] = { oldValue, newValue };
  }
  writeStore(settings);
  emitChanges(changes);
}

/** Remove keys from the persisted settings (mirrors the extension's storage remove). */
export async function removeSettingKeys(keys: string[]): Promise<void> {
  const settings = readStore();
  const changes: Record<string, SettingsChange> = {};
  for (const key of keys) {
    if (key in settings) {
      changes[key] = { oldValue: settings[key], newValue: undefined };
      delete settings[key];
    }
  }
  if (Object.keys(changes).length === 0) return;
  writeStore(settings);
  emitChanges(changes);
}

/** Read a single setting with a fallback default. */
export function getSetting<T>(key: string, fallback: T): T {
  const settings = readStore();
  return key in settings ? (settings[key] as T) : fallback;
}

/**
 * Subscribe to settings changes made in this document (CustomEvent) and in
 * other tabs (native `storage` event). Returns an unsubscribe function,
 * mirroring the extension's storage-change listeners.
 */
export function onSettingsChanged(
  callback: (changes: Record<string, SettingsChange>) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<Record<string, SettingsChange>>).detail;
    if (detail) callback(detail);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SETTINGS_STORAGE_KEY && event.key !== null) return;
    callback({ [SETTINGS_STORAGE_KEY]: { newValue: event.newValue } });
  };

  window.addEventListener(SETTINGS_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SETTINGS_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
