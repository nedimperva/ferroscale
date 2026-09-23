"use client";

/**
 * Where this device keeps the sync secret.
 *
 * The passphrase used to sit in localStorage as plain text — readable by any
 * script on the origin and by anyone with the browser profile, and it is the
 * one thing that unlocks the user's Drive data. What encryption actually
 * needs is PBKDF2 key material, so the passphrase is imported once as a
 * non-extractable CryptoKey and that is what gets persisted, in IndexedDB
 * (which can hold a CryptoKey; localStorage cannot). The browser will use it
 * to derive keys but will never hand the bytes back — not to us, not to an
 * injected script.
 *
 * localStorage keeps only a "configured" flag, so status can be read
 * synchronously while the key itself loads asynchronously.
 */

import { SYNC_KEY_CONFIGURED_KEY, SYNC_PASSPHRASE_KEY } from "./keys";

const DB_NAME = "ferroscale-sync";
const STORE = "keys";
const RECORD = "passphrase-key";

const textEncoder = new TextEncoder();

/** Session copy; also the whole store where IndexedDB is unavailable. */
let memoryKey: CryptoKey | null = null;

export function importPassphraseKey(passphrase: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", textEncoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result ?? null);
      tx.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    });
  } finally {
    db.close();
  }
}

function setConfiguredFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(SYNC_KEY_CONFIGURED_KEY, "1");
    else localStorage.removeItem(SYNC_KEY_CONFIGURED_KEY);
  } catch {
    // noop
  }
}

/** The plain-text passphrase an older release left behind, if any. */
function readLegacyPassphrase(): string {
  try {
    const raw = localStorage.getItem(SYNC_PASSPHRASE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "string" ? parsed.trim() : "";
  } catch {
    return "";
  }
}

function dropLegacyPassphrase() {
  try {
    localStorage.removeItem(SYNC_PASSPHRASE_KEY);
  } catch {
    // noop
  }
}

export async function saveSyncKey(passphrase: string): Promise<void> {
  const key = await importPassphraseKey(passphrase);
  memoryKey = key;
  await withStore("readwrite", (store) => store.put(key, RECORD));
  setConfiguredFlag(true);
  dropLegacyPassphrase();
}

/**
 * The stored key, or null. A plain-text passphrase from before this release
 * is converted on first read and then deleted, so upgrading needs nothing
 * from the user.
 */
export async function loadSyncKey(): Promise<CryptoKey | null> {
  if (memoryKey) return memoryKey;

  const stored = await withStore<CryptoKey>("readonly", (store) => store.get(RECORD) as IDBRequest<CryptoKey>);
  if (stored) {
    memoryKey = stored;
    return stored;
  }

  const legacy = readLegacyPassphrase();
  if (legacy) {
    await saveSyncKey(legacy);
    return memoryKey;
  }

  // The flag outlived its key (site data partly cleared): stop claiming one.
  setConfiguredFlag(false);
  return null;
}

export async function clearSyncKey(): Promise<void> {
  memoryKey = null;
  await withStore("readwrite", (store) => store.delete(RECORD));
  setConfiguredFlag(false);
  dropLegacyPassphrase();
}

/** Synchronous best guess for status: a key was stored, or a legacy one awaits conversion. */
export function hasSyncKey(): boolean {
  if (memoryKey) return true;
  try {
    return localStorage.getItem(SYNC_KEY_CONFIGURED_KEY) === "1" || readLegacyPassphrase().length > 0;
  } catch {
    return false;
  }
}
