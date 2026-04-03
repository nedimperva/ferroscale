"use client";

import { loadFromStorage, persistToStorage } from "@/lib/storage";
import {
  GOOGLE_SYNC_PROVIDER_ID,
  SYNC_METADATA_KEY,
  SYNC_PASSPHRASE_KEY,
  SYNC_RECORD_INDEX_KEY,
  SYNC_SESSION_KEY,
} from "./keys";
import type {
  SyncMetadata,
  SyncRecordIndex,
  SyncSessionDescriptor,
} from "./types";

type Listener = () => void;

const DEFAULT_METADATA: Omit<SyncMetadata, "deviceId"> = {
  providerId: GOOGLE_SYNC_PROVIDER_ID,
  syncEnabled: false,
  authState: "disconnected",
  pendingAuthRequestId: null,
  connectedEmail: null,
  syncStatus: "idle",
  syncError: null,
  pendingUploadCount: 0,
  pendingDownloadCount: 0,
  lastSuccessfulPullAt: null,
  lastSuccessfulPushAt: null,
  lastDriveChangeToken: null,
};

let listeners: Listener[] = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMetadata(raw: Partial<SyncMetadata> | null | undefined): SyncMetadata {
  const deviceId = raw?.deviceId?.trim() || createDeviceId();
  return {
    ...DEFAULT_METADATA,
    ...raw,
    deviceId,
    providerId: GOOGLE_SYNC_PROVIDER_ID,
    syncEnabled: raw?.syncEnabled ?? false,
    authState: raw?.authState ?? "disconnected",
    pendingAuthRequestId: raw?.pendingAuthRequestId ?? null,
    connectedEmail: raw?.connectedEmail ?? null,
    syncStatus: raw?.syncStatus ?? "idle",
    syncError: raw?.syncError ?? null,
    pendingUploadCount: raw?.pendingUploadCount ?? 0,
    pendingDownloadCount: raw?.pendingDownloadCount ?? 0,
    lastSuccessfulPullAt: raw?.lastSuccessfulPullAt ?? null,
    lastSuccessfulPushAt: raw?.lastSuccessfulPushAt ?? null,
    lastDriveChangeToken: raw?.lastDriveChangeToken ?? null,
  };
}

export function loadSyncMetadata(): SyncMetadata {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_METADATA,
      deviceId: "server",
    };
  }

  return normalizeMetadata(loadFromStorage<Partial<SyncMetadata> | null>(SYNC_METADATA_KEY, null));
}

export function getSyncMetadata() {
  return loadSyncMetadata();
}

export function saveSyncMetadata(
  updater: Partial<SyncMetadata> | ((previous: SyncMetadata) => Partial<SyncMetadata> | SyncMetadata),
) {
  const previous = loadSyncMetadata();
  const patch = typeof updater === "function" ? updater(previous) : updater;
  const next = normalizeMetadata({
    ...previous,
    ...patch,
  });
  persistToStorage(SYNC_METADATA_KEY, next);
  emitChange();
  return next;
}

export function resetSyncMetadata() {
  const previous = loadSyncMetadata();
  const next = normalizeMetadata({
    ...DEFAULT_METADATA,
    deviceId: previous.deviceId,
  });
  persistToStorage(SYNC_METADATA_KEY, next);
  emitChange();
  return next;
}

export function subscribeSyncState(listener: Listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function loadSyncPassphrase() {
  if (typeof window === "undefined") return "";
  return loadFromStorage<string>(SYNC_PASSPHRASE_KEY, "");
}

export function saveSyncPassphrase(passphrase: string) {
  persistToStorage(SYNC_PASSPHRASE_KEY, passphrase);
  emitChange();
}

export function clearSyncPassphrase() {
  persistToStorage(SYNC_PASSPHRASE_KEY, "");
  emitChange();
}

export function hasSyncPassphrase() {
  return loadSyncPassphrase().trim().length > 0;
}

export function loadSyncSession() {
  if (typeof window === "undefined") return null;
  return loadFromStorage<SyncSessionDescriptor | null>(SYNC_SESSION_KEY, null);
}

export function saveSyncSession(session: SyncSessionDescriptor) {
  persistToStorage(SYNC_SESSION_KEY, session);
  emitChange();
}

export function clearSyncSession() {
  persistToStorage(SYNC_SESSION_KEY, null);
  emitChange();
}

export function loadSyncRecordIndex(): SyncRecordIndex {
  if (typeof window === "undefined") return {};
  return loadFromStorage<SyncRecordIndex>(SYNC_RECORD_INDEX_KEY, {});
}

export function saveSyncRecordIndex(index: SyncRecordIndex) {
  persistToStorage(SYNC_RECORD_INDEX_KEY, index);
  emitChange();
}

export function clearSyncRecordIndex() {
  persistToStorage(SYNC_RECORD_INDEX_KEY, {});
  emitChange();
}
