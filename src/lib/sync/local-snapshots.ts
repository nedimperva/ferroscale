"use client";

/**
 * A local-only recovery net.
 *
 * Drive sync is the user's backup, but sync needs a working session to pull
 * from: a device that boots into a broken store — half-written records, a
 * failed migration, a browser that wiped part of the profile — has nothing to
 * restore, because the broken data is the only thing the other device would
 * have to overwrite. So every few minutes of activity this writes a snapshot
 * of the user's own collections into a database of its own, keeps a small ring
 * of the most recent ones, and a bad boot can offer to restore one.
 *
 * It is a net, not a sync mechanism: nothing here talks to Drive. The payload
 * is encrypted with a key derived from a random salt that never leaves this
 * device, so what sits on disk is no more readable than the Drive copy.
 */

import type { CompareItem } from "@/hooks/useCompare";
import type { Customer } from "@/hooks/useCustomers";
import type { PriceBookEntry } from "@/hooks/usePriceBook";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import { decryptAESGCM, encryptAESGCM } from "./crypto";
import {
  loadCompareItems,
  loadCustomers,
  loadPriceBook,
  loadProjects,
  loadQuickHistory,
  loadSavedEntries,
  persistCompareItems,
  persistCustomers,
  persistPriceBook,
  persistProjects,
  persistQuickHistory,
  persistSavedEntries,
} from "./collections";
import { notifyCollectionsReplaced } from "./external-changes";

const DB_NAME = "ferroscale-snapshots";
const STORE = "snapshots";
const AT_INDEX = "at";
/** Where the device-local salt lives. It never travels anywhere. */
const SALT_KEY = "ferroscale-snapshot-salt-v1";
const AUTO_LIMIT = 10;
const MANUAL_LIMIT = 3;

const textEncoder = new TextEncoder();

export interface LocalSnapshot {
  id: string;
  /** Milliseconds since the epoch. */
  at: number;
  /** "auto" for a rolling one, "manual" for one the user asked for. */
  kind: "auto" | "manual";
  /** The counts of what the snapshot holds, for a cheap preview. */
  summary: { saved: number; projects: number; customers: number; compare: number; history: number };
}

export interface LocalSnapshotState {
  saved: unknown[];
  projects: unknown[];
  customers: unknown[];
  compare: unknown[];
  quickHistory: string[];
  priceBook: unknown[];
}

interface StoredSnapshot extends LocalSnapshot {
  /** The collections, encrypted. */
  payload: string;
}

/** The salt is imported once; every write would otherwise read it again. */
let deviceKey: CryptoKey | null = null;

/** Two snapshots in the same millisecond must still order. */
let lastAt = 0;

function nextTimestamp(): number {
  const now = Date.now();
  lastAt = now > lastAt ? now : lastAt + 1;
  return lastAt;
}

function readSalt(): string | null {
  try {
    return localStorage.getItem(SALT_KEY);
  } catch {
    return null;
  }
}

/**
 * The salt is random and belongs to this device alone — it never leaves it,
 * so what sits on disk is no more readable than the Drive copy.
 */
function loadOrCreateSalt(): string {
  const existing = readSalt();
  if (existing) return existing;
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  }
  const encoded = btoa(String.fromCharCode(...Array.from(bytes)));
  try {
    localStorage.setItem(SALT_KEY, encoded);
  } catch {
    // noop — a browser that refuses storage still gets a session salt.
  }
  return encoded;
}

async function getDeviceKey(): Promise<CryptoKey | null> {
  if (deviceKey) return deviceKey;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(loadOrCreateSalt()),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    deviceKey = key;
    return key;
  } catch {
    return null;
  }
}

function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      try {
        const db = request.result;
        if (db.objectStoreNames.contains(STORE)) return;
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex(AT_INDEX, "at");
      } catch {
        // noop
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function withDb<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    return await run(db);
  } catch {
    return null;
  } finally {
    db.close();
  }
}

function transactionDone(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

async function readRecords(db: IDBDatabase): Promise<StoredSnapshot[]> {
  try {
    const tx = db.transaction(STORE, "readonly");
    const done = transactionDone(tx);
    const request = tx.objectStore(STORE).index(AT_INDEX).getAll();
    const rows = await new Promise<StoredSnapshot[]>((resolve) => {
      request.onsuccess = () => resolve((request.result as StoredSnapshot[]) ?? []);
      request.onerror = () => resolve([]);
    });
    await done;
    return rows;
  } catch {
    return [];
  }
}

async function readRecord(db: IDBDatabase, id: string): Promise<StoredSnapshot | null> {
  try {
    const tx = db.transaction(STORE, "readonly");
    const done = transactionDone(tx);
    const request = tx.objectStore(STORE).get(id);
    const record = await new Promise<StoredSnapshot | null>((resolve) => {
      request.onsuccess = () => resolve((request.result as StoredSnapshot | undefined) ?? null);
      request.onerror = () => resolve(null);
    });
    await done;
    return record;
  } catch {
    return null;
  }
}

/** The write and the eviction share one transaction, so the ring never grows past its cap. */
async function writeRecord(db: IDBDatabase, record: StoredSnapshot, evict: string[]): Promise<boolean> {
  try {
    const tx = db.transaction(STORE, "readwrite");
    const done = transactionDone(tx);
    const store = tx.objectStore(STORE);
    store.put(record);
    for (const id of evict) store.delete(id);
    return await done;
  } catch {
    return false;
  }
}

async function deleteRecord(db: IDBDatabase, id: string): Promise<void> {
  try {
    const tx = db.transaction(STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(STORE).delete(id);
    await done;
  } catch {
    // noop
  }
}

async function clearRecords(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction(STORE, "readwrite");
    const done = transactionDone(tx);
    tx.objectStore(STORE).clear();
    await done;
  } catch {
    // noop
  }
}

function captureState(): LocalSnapshotState {
  return {
    saved: loadSavedEntries(),
    projects: loadProjects(),
    customers: loadCustomers(),
    compare: loadCompareItems(),
    quickHistory: loadQuickHistory(),
    priceBook: loadPriceBook(),
  };
}

function summarize(state: LocalSnapshotState): LocalSnapshot["summary"] {
  return {
    saved: state.saved.length,
    projects: state.projects.length,
    customers: state.customers.length,
    compare: state.compare.length,
    history: state.quickHistory.length,
  };
}

function toPublic(record: StoredSnapshot): LocalSnapshot {
  return {
    id: record.id,
    at: record.at,
    kind: record.kind,
    summary: record.summary,
  };
}

/**
 * Which snapshots fall out of the ring once `snapshots` is what the device
 * holds. Each kind has its own cap, and a manual one is the user asking for
 * it — the rolling snapshots never push it out.
 */
export function selectSnapshotEvictions(snapshots: LocalSnapshot[], kind: "auto" | "manual"): string[] {
  const cap = kind === "auto" ? AUTO_LIMIT : MANUAL_LIMIT;
  const ring = snapshots
    .filter((snapshot) => snapshot.kind === kind)
    .sort((left, right) => left.at - right.at);
  return ring.slice(0, Math.max(0, ring.length - cap)).map((snapshot) => snapshot.id);
}

/** Write a snapshot now. Returns the snapshot's id. */
export async function writeLocalSnapshot(kind: "auto" | "manual" = "auto"): Promise<string> {
  try {
    const state = captureState();
    const key = await getDeviceKey();
    if (!key) return "";
    const payload = await encryptAESGCM(JSON.stringify(state), key);
    const at = nextTimestamp();
    const record: StoredSnapshot = {
      id: `${at}-${randomToken()}`,
      at,
      kind,
      summary: summarize(state),
      payload,
    };
    const written = await withDb(async (db) => {
      const existing = await readRecords(db);
      const evictions = selectSnapshotEvictions([...existing.map(toPublic), toPublic(record)], kind);
      return writeRecord(db, record, evictions);
    });
    return written ? record.id : "";
  } catch {
    return "";
  }
}

/** The ring of snapshots, newest first. */
export async function listLocalSnapshots(): Promise<LocalSnapshot[]> {
  try {
    const rows = await withDb((db) => readRecords(db));
    if (!rows) return [];
    return rows.map(toPublic).sort((left, right) => right.at - left.at);
  } catch {
    return [];
  }
}

/** One snapshot's contents. Null when the id is unknown. */
export async function readLocalSnapshot(id: string): Promise<LocalSnapshotState | null> {
  try {
    const record = await withDb((db) => readRecord(db, id));
    if (!record) return null;
    const key = await getDeviceKey();
    if (!key) return null;
    const parsed = JSON.parse(await decryptAESGCM(record.payload, key)) as Partial<LocalSnapshotState>;
    return {
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      compare: Array.isArray(parsed.compare) ? parsed.compare : [],
      quickHistory: Array.isArray(parsed.quickHistory)
        ? parsed.quickHistory.filter((line): line is string => typeof line === "string")
        : [],
      priceBook: Array.isArray(parsed.priceBook) ? parsed.priceBook : [],
    };
  } catch {
    return null;
  }
}

/**
 * Put the snapshot's contents back into local storage. The restore is not a
 * change the user made elsewhere, so it is written clean: it must not push
 * the restored collections to Drive on the next sync.
 */
export async function restoreLocalSnapshot(id: string): Promise<boolean> {
  try {
    const state = await readLocalSnapshot(id);
    if (!state) return false;
    persistSavedEntries(state.saved as SavedEntry[], { markDirty: false });
    persistProjects(state.projects as Project[], { markDirty: false });
    persistCustomers(state.customers as Customer[], { markDirty: false });
    persistCompareItems(state.compare as CompareItem[], { markDirty: false });
    persistQuickHistory(state.quickHistory, { markDirty: false });
    persistPriceBook(state.priceBook as PriceBookEntry[], { markDirty: false });
    // The hooks own their lists in React state; tell them storage changed.
    notifyCollectionsReplaced();
    return true;
  } catch {
    return false;
  }
}

/** Delete one snapshot. */
export async function deleteLocalSnapshot(id: string): Promise<void> {
  try {
    await withDb((db) => deleteRecord(db, id));
  } catch {
    // noop
  }
}

/** Delete every snapshot. */
export async function clearLocalSnapshots(): Promise<void> {
  try {
    await withDb((db) => clearRecords(db));
  } catch {
    // noop
  }
}
