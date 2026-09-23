/**
 * The dirty bit for synced settings, kept apart from settings-sync.ts so the
 * setting stores can import it without a cycle (settings-sync reads the
 * stores; the stores only need to say "I moved").
 */

import { SYNC_SETTINGS_UPDATED_AT_KEY } from "./keys";
import { notifySyncedCollectionDirty } from "./registry";

const EPOCH = new Date(0).toISOString();

let suppressDepth = 0;

export function readSettingsUpdatedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SYNC_SETTINGS_UPDATED_AT_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function writeSettingsUpdatedAt(value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_SETTINGS_UPDATED_AT_KEY, value);
  } catch {
    // noop
  }
}

export { EPOCH as SETTINGS_EPOCH };

/** A user changed a synced setting: stamp it and let sync know. */
export function markSettingsDirty(): void {
  if (suppressDepth > 0) return;
  writeSettingsUpdatedAt(new Date().toISOString());
  queueMicrotask(() => notifySyncedCollectionDirty("settings"));
}

/** Writes made inside `fn` came from Drive — they must not bounce back as edits. */
export function withSettingsDirtySuppressed(fn: () => void): void {
  suppressDepth += 1;
  try {
    fn();
  } finally {
    suppressDepth -= 1;
  }
}
