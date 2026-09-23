"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyRemoteSyncRecords,
  clearAllIndexedRecords,
  getPendingSyncRecords,
  markSyncPushResults,
  savePulledRecordsToIndex,
} from "./records";
import { decryptAESGCM, encryptAESGCM, sha256Text } from "./crypto";
import { registerSyncDirtyHandler } from "./registry";
import {
  clearSyncSession,
  getSyncMetadata,
  hasSyncPassphrase,
  loadSyncPassphrase,
  loadSyncSession,
  resetSyncMetadata,
  saveSyncMetadata,
  saveSyncPassphrase,
  saveSyncSession,
  subscribeSyncState,
} from "./metadata";
import { GOOGLE_SYNC_PROVIDER_ID, SYNC_AUTH_RESULT_STORAGE_KEY, SYNC_METADATA_KEY } from "./keys";
import type { SyncAuthPollResponse, SyncAuthStartResponse, SyncPullResponse, SyncPushResponse } from "./sync-shared";
import type { AppliedSyncRecord, SyncAttention, SyncErrorKind, SyncMetadata, SyncStatus } from "./types";

/**
 * Google Drive sync, client side.
 *
 * The engine (timers, listeners, the dirty handler) is module state driven by
 * one `useSyncEngine()` mounted for the whole app, so sync runs whether or not
 * Settings is open. `useGoogleDriveSync()` is only a view onto it plus the
 * user actions, and can be mounted anywhere, any number of times.
 */

type SyncOutcome = {
  status: SyncStatus["syncStatus"];
  message?: string;
};

type SyncSession = NonNullable<SyncAuthPollResponse & { status: "complete" }>["session"];

/** Local edits settle for this long before a push. */
const DIRTY_DEBOUNCE_MS = 1500;
/** A visible tab checks Drive for other devices' changes this often. */
const BACKGROUND_PULL_MS = 3 * 60_000;
/** Transient failures retry at 30s, 1m, 2m… capped here. */
const MAX_RETRY_DELAY_MS = 15 * 60_000;

/** A request that failed, with the HTTP status (0 = never reached the server). */
class SyncRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "SyncRequestError";
  }
}

/** Drive holds data this passphrase cannot open. */
class SyncPassphraseError extends Error {
  constructor() {
    super("The sync passphrase does not match the one used on your other devices.");
    this.name = "SyncPassphraseError";
  }
}

export function classifySyncError(error: unknown): SyncErrorKind {
  if (error instanceof SyncPassphraseError) return "passphrase";
  if (error instanceof SyncRequestError) {
    if (error.code === "reauth" || error.status === 401) return "reauth";
    if (error.status === 0 || error.status === 429 || error.status >= 500) {
      // The server wraps Google's refusal of a revoked token as a plain 500
      // on older deployments — still an auth problem, not a flaky network.
      return /invalid_grant|unauthorized|reauth/i.test(error.message) ? "reauth" : "transient";
    }
    return "other";
  }
  const message = error instanceof Error ? error.message : "";
  if (/invalid_grant|refresh token|unauthorized|reauth/i.test(message)) return "reauth";
  if (/failed to fetch|network|load failed|timed out/i.test(message)) return "transient";
  return "other";
}

export function retryDelayMs(retryCount: number): number {
  return Math.min(MAX_RETRY_DELAY_MS, 30_000 * 2 ** Math.max(0, retryCount - 1));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMobileAuthRedirectPreferred() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

type PreparedAuthWindow =
  | { mode: "redirect" }
  | { mode: "popup"; popup: Window };

function prepareAuthWindow(): PreparedAuthWindow {
  if (isMobileAuthRedirectPreferred()) {
    return { mode: "redirect" };
  }

  const features = "popup=yes,width=540,height=720,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes";
  const opened = window.open("", "ferroscale-google-sync", features);
  if (!opened) {
    return { mode: "redirect" };
  }

  try {
    opened.document.title = "FerroScale Sync";
    opened.document.body.innerHTML = "<p style='font-family:system-ui,sans-serif;padding:24px'>Opening Google sign-in...</p>";
  } catch {
    // Ignore cross-window access failures and continue with navigation.
  }

  return { mode: "popup", popup: opened };
}

function navigateAuthWindow(target: PreparedAuthWindow, authUrl: string) {
  if (target.mode === "redirect") {
    window.location.assign(authUrl);
    return;
  }

  target.popup.location.href = authUrl;
  target.popup.focus();
}

async function apiJson<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new SyncRequestError(error instanceof Error ? error.message : "Network request failed", 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const body = payload as { message?: string; code?: string } | null;
    throw new SyncRequestError(
      body?.message || `Sync request failed (${response.status})`,
      response.status,
      body?.code,
    );
  }

  return payload as T;
}

function readStoredAuthResult() {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SYNC_AUTH_RESULT_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    window.localStorage.removeItem(SYNC_AUTH_RESULT_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }

  try {
    return JSON.parse(raw) as SyncAuthPollResponse;
  } catch {
    return null;
  }
}

async function pollForAuthCompletion(authRequestId: string) {
  const timeoutAt = Date.now() + 4 * 60_000;
  while (Date.now() < timeoutAt) {
    const response = await apiJson<SyncAuthPollResponse>(`/api/sync/google/auth/poll?authRequestId=${encodeURIComponent(authRequestId)}`);
    if (response.status === "complete") return response.session;
    if (response.status === "error") throw new Error(response.message);
    await sleep(1500);
  }

  throw new Error("Google Drive sign-in timed out");
}

async function waitForAuthCompletion(authRequestId: string) {
  const fromStorage = readStoredAuthResult();
  if (fromStorage?.status === "complete") return fromStorage.session;
  if (fromStorage?.status === "error") throw new Error(fromStorage.message);

  return new Promise<NonNullable<SyncAuthPollResponse & { status: "complete" }>["session"]>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("message", handleMessage);
    };

    const settleWith = (result: SyncAuthPollResponse | null) => {
      if (!result || settled || result.status === "pending") return;
      settled = true;
      cleanup();
      if (result.status === "complete") {
        resolve(result.session);
      } else {
        reject(new Error(result.message));
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SYNC_AUTH_RESULT_STORAGE_KEY) return;
      settleWith(readStoredAuthResult());
    };

    const handleFocus = () => {
      settleWith(readStoredAuthResult());
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "ferroscale-sync-auth-result") return;
      settleWith(readStoredAuthResult());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("message", handleMessage);

    void pollForAuthCompletion(authRequestId)
      .then((session) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(session);
      })
      .catch((error) => {
        if (settled) return;
        const latest = readStoredAuthResult();
        if (latest?.status === "complete") {
          settled = true;
          cleanup();
          resolve(latest.session);
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      });
  });
}

async function decryptPulledRecords(records: SyncPullResponse["records"], passphrase: string) {
  // Everything is decrypted before anything is applied, so a wrong passphrase
  // stops the pull cold instead of leaving half of Drive merged in.
  return Promise.all(records.map(async (record): Promise<AppliedSyncRecord> => {
    let payload: string | null = null;
    if (record.encryptedPayload) {
      try {
        payload = await decryptAESGCM(record.encryptedPayload, passphrase);
      } catch {
        throw new SyncPassphraseError();
      }
    }
    return {
      recordKey: record.recordKey,
      kind: record.kind,
      driveFileId: record.driveFileId,
      removed: record.removed,
      payload,
      contentHash: payload ? await sha256Text(payload) : null,
      modifiedTime: record.modifiedTime,
    };
  }));
}

function attentionFor(metadata: SyncMetadata): SyncAttention | null {
  // Only a device that has been connected can lose the connection; a first
  // sign-in the user abandoned is not something to nag about.
  if (!metadata.syncEnabled || !metadata.connectedEmail) return null;
  if (metadata.authState === "reauth_required") return "reconnect";
  if (metadata.authState !== "connected") return null;
  if (metadata.syncErrorKind === "passphrase" || !hasSyncPassphrase()) return "passphrase";
  return null;
}

function toStatus(): SyncStatus {
  const metadata = getSyncMetadata();
  return {
    hydrated: true,
    connected: metadata.authState === "connected",
    providerId: GOOGLE_SYNC_PROVIDER_ID,
    authState: metadata.authState,
    connectedEmail: metadata.connectedEmail,
    lastPullAt: metadata.lastSuccessfulPullAt,
    lastPushAt: metadata.lastSuccessfulPushAt,
    lastSyncedAt: metadata.lastSyncedAt ?? metadata.lastSuccessfulPullAt,
    lastError: metadata.syncError,
    attention: attentionFor(metadata),
    syncing: metadata.syncStatus === "syncing",
    syncStatus: metadata.syncStatus,
    pendingChanges: metadata.pendingUploadCount > 0 || metadata.pendingDownloadCount > 0,
    pendingUploadCount: metadata.pendingUploadCount,
    pendingDownloadCount: metadata.pendingDownloadCount,
    passphraseConfigured: hasSyncPassphrase(),
    currentAction,
  };
}

/** What renders before localStorage can be read — keeps SSR and hydration equal. */
const UNHYDRATED_STATUS: SyncStatus = {
  hydrated: false,
  connected: false,
  providerId: GOOGLE_SYNC_PROVIDER_ID,
  authState: "disconnected",
  attention: null,
  syncing: false,
  syncStatus: "idle",
  pendingChanges: false,
  pendingUploadCount: 0,
  pendingDownloadCount: 0,
  passphraseConfigured: false,
};

/* ---------------------------------------------------------------- engine state */

let currentAction: string | undefined;
const actionListeners = new Set<() => void>();
let runLock: Promise<SyncOutcome> | null = null;
let pendingAuthCheck: Promise<SyncOutcome | null> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** A local edit landed while a run was in flight — its snapshot missed it. */
let dirtyDuringRun = false;
let lastAutoRunAt = 0;

function setCurrentAction(action: string | undefined) {
  currentAction = action;
  for (const listener of actionListeners) listener();
}

function clearTimers() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (retryTimer) clearTimeout(retryTimer);
  debounceTimer = null;
  retryTimer = null;
}

function scheduleSync(delayMs = DIRTY_DEBOUNCE_MS) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, delayMs);
}

function scheduleRetry(delayMs: number) {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void syncNow({ auto: true });
  }, delayMs);
}

/**
 * Two tabs syncing at once would both create Drive files for the same new
 * record. Web Locks serialises them across tabs; the second run then finds
 * nothing left to push.
 */
async function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return fn();
  return locks.request("ferroscale-sync", fn) as Promise<T>;
}

async function runSyncOnce(opts?: { resetRemote?: boolean }): Promise<SyncOutcome> {
  const current = getSyncMetadata();
  if (!current.syncEnabled || current.authState !== "connected") {
    return { status: current.syncStatus };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    // Not an error: the `online` event picks this up again.
    const next = saveSyncMetadata({ syncStatus: "pending", syncErrorKind: "transient", syncError: null });
    return { status: next.syncStatus };
  }

  const passphrase = loadSyncPassphrase();
  if (!passphrase) {
    const next = saveSyncMetadata({
      syncStatus: "error",
      syncErrorKind: "passphrase",
      syncError: "Enter the sync passphrase on this device.",
    });
    return { status: next.syncStatus, message: next.syncError ?? undefined };
  }

  const session = loadSyncSession();
  if (!session) {
    const next = saveSyncMetadata({
      authState: "reauth_required",
      syncStatus: "error",
      syncErrorKind: "reauth",
      syncError: "Reconnect Google Drive to continue syncing.",
    });
    return { status: next.syncStatus, message: next.syncError ?? undefined };
  }

  saveSyncMetadata({
    syncStatus: "syncing",
    pendingDownloadCount: 0,
  });

  try {
    const pull = await apiJson<SyncPullResponse>("/api/sync/google/pull", {
      method: "POST",
      body: JSON.stringify({
        sessionToken: session.sessionToken,
        pageToken: current.lastDriveChangeToken,
      }),
    });

    if (pull.sessionToken && pull.sessionToken !== session.sessionToken) {
      saveSyncSession({
        ...session,
        sessionToken: pull.sessionToken,
      });
    }

    // A reset overwrites Drive with this device's copy, so what is there now
    // (possibly under an old passphrase) is not read, only replaced.
    if (pull.records.length > 0 && !opts?.resetRemote) {
      saveSyncMetadata({ pendingDownloadCount: pull.records.length });
      const decrypted = await decryptPulledRecords(pull.records, passphrase);
      applyRemoteSyncRecords(decrypted, current.deviceId);
      savePulledRecordsToIndex(decrypted);
    }

    saveSyncMetadata({
      lastDriveChangeToken: pull.nextPageToken ?? current.lastDriveChangeToken,
      lastSuccessfulPullAt: new Date().toISOString(),
      pendingDownloadCount: 0,
    });

    const pending = await getPendingSyncRecords(getSyncMetadata().deviceId);
    saveSyncMetadata({ pendingUploadCount: pending.length });

    if (pending.length > 0 || opts?.resetRemote) {
      const activeSession = loadSyncSession();
      if (!activeSession) throw new SyncRequestError("Google Drive session missing", 401, "reauth");

      const push = await apiJson<SyncPushResponse>("/api/sync/google/push", {
        method: "POST",
        body: JSON.stringify({
          sessionToken: activeSession.sessionToken,
          resetRemote: !!opts?.resetRemote,
          records: await Promise.all(pending.map(async (record) => ({
            recordKey: record.recordKey,
            kind: record.kind,
            entityId: record.entityId,
            updatedAt: record.updatedAt,
            contentHash: record.contentHash,
            encryptedPayload: await encryptAESGCM(record.payload, passphrase),
            existingFileId: opts?.resetRemote ? null : record.existingFileId,
          }))),
        }),
      });

      if (push.sessionToken && push.sessionToken !== activeSession.sessionToken) {
        saveSyncSession({
          ...activeSession,
          sessionToken: push.sessionToken,
        });
      }

      markSyncPushResults(pending, push.records);
      saveSyncMetadata({
        lastSuccessfulPushAt: new Date().toISOString(),
        pendingUploadCount: 0,
      });
    }

    saveSyncMetadata({
      syncStatus: "synced",
      syncError: null,
      syncErrorKind: null,
      retryCount: 0,
      lastSyncedAt: new Date().toISOString(),
    });
    return { status: "synced" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Drive sync failed";
    const kind = classifySyncError(error);

    if (kind === "transient") {
      // Offline, a timeout, Google having a moment: nothing the user can do,
      // so say nothing and try again later.
      const retryCount = (getSyncMetadata().retryCount ?? 0) + 1;
      saveSyncMetadata({
        syncStatus: "pending",
        syncError: message,
        syncErrorKind: "transient",
        retryCount,
      });
      scheduleRetry(retryDelayMs(retryCount));
      return { status: "pending", message };
    }

    saveSyncMetadata({
      authState: kind === "reauth" ? "reauth_required" : getSyncMetadata().authState,
      syncStatus: "error",
      syncError: message,
      syncErrorKind: kind,
      retryCount: 0,
    });
    return { status: "error", message };
  }
}

/**
 * Run one pull + push round. `auto` marks runs the app started on its own
 * (focus, timer, startup); those stand down while the passphrase is known
 * wrong, since only the user can fix that.
 */
export function syncNow(opts?: { resetRemote?: boolean; auto?: boolean }): Promise<SyncOutcome> {
  if (runLock) {
    if (opts?.resetRemote) return runLock.then(() => syncNow(opts));
    return runLock;
  }

  if (opts?.auto) {
    const metadata = getSyncMetadata();
    if (metadata.syncErrorKind === "passphrase") {
      return Promise.resolve({ status: metadata.syncStatus });
    }
    lastAutoRunAt = Date.now();
  }

  clearTimers();
  runLock = withCrossTabLock(() => runSyncOnce(opts)).finally(() => {
    runLock = null;
    if (dirtyDuringRun) {
      dirtyDuringRun = false;
      scheduleSync(250);
    }
  });
  return runLock;
}

/* ---------------------------------------------------------------- actions */

function finalizeConnectedSession(session: SyncSession) {
  saveSyncSession(session);
  saveSyncMetadata({
    syncEnabled: true,
    authState: "connected",
    pendingAuthRequestId: null,
    connectedEmail: session.accountEmail,
    syncStatus: "pending",
    syncError: null,
    syncErrorKind: null,
    retryCount: 0,
  });
  return syncNow();
}

async function resumePendingAuth(): Promise<SyncOutcome | null> {
  if (pendingAuthCheck) return pendingAuthCheck;

  pendingAuthCheck = (async (): Promise<SyncOutcome | null> => {
    const stored = readStoredAuthResult();
    if (stored?.status === "complete") {
      return finalizeConnectedSession(stored.session);
    }
    if (stored?.status === "error") {
      saveSyncMetadata({
        authState: "reauth_required",
        pendingAuthRequestId: null,
        syncStatus: "error",
        syncErrorKind: "reauth",
        syncError: stored.message,
      });
      return { status: "error", message: stored.message };
    }

    const current = getSyncMetadata();
    if (current.authState !== "awaiting_browser" || !current.pendingAuthRequestId) {
      return null;
    }

    try {
      const session = await waitForAuthCompletion(current.pendingAuthRequestId);
      return finalizeConnectedSession(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Drive sign-in could not be completed";
      const timedOut = /timed out/i.test(message);
      saveSyncMetadata({
        authState: timedOut ? current.authState : "reauth_required",
        pendingAuthRequestId: timedOut ? current.pendingAuthRequestId : null,
        syncStatus: "error",
        syncErrorKind: timedOut ? "transient" : "reauth",
        syncError: message,
      });
      return { status: "error", message };
    }
  })();

  try {
    return await pendingAuthCheck;
  } finally {
    pendingAuthCheck = null;
  }
}

async function connect(passphrase: string) {
  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error("Enter a sync passphrase before connecting Google Drive.");
  }

  setCurrentAction("connect");
  const authWindow = prepareAuthWindow();
  saveSyncPassphrase(trimmed);

  try {
    const start = await apiJson<SyncAuthStartResponse>("/api/sync/google/auth/start", {
      method: "POST",
    });
    saveSyncMetadata({
      syncEnabled: true,
      authState: "awaiting_browser",
      pendingAuthRequestId: start.authRequestId,
      syncStatus: "pending",
      syncError: null,
      syncErrorKind: null,
    });
    navigateAuthWindow(authWindow, start.authUrl);
    if (authWindow.mode === "redirect") {
      return { status: "pending" as const };
    }

    const session = await waitForAuthCompletion(start.authRequestId);
    return await finalizeConnectedSession(session);
  } catch (error) {
    if (authWindow.mode === "popup" && !authWindow.popup.closed) {
      authWindow.popup.close();
    }

    const message = error instanceof Error ? error.message : "Failed to connect Google Drive";
    saveSyncMetadata({
      authState: "reauth_required",
      pendingAuthRequestId: null,
      syncStatus: "error",
      syncErrorKind: "reauth",
      syncError: message,
    });
    throw error;
  } finally {
    setCurrentAction(undefined);
  }
}

async function reconnect() {
  const passphrase = loadSyncPassphrase();
  if (!passphrase) {
    throw new Error("Enter the sync passphrase first.");
  }
  return connect(passphrase);
}

async function disconnect() {
  setCurrentAction("disconnect");
  clearTimers();
  const session = loadSyncSession();
  if (session) {
    await apiJson<{ ok: true }>("/api/sync/google/disconnect", {
      method: "POST",
      body: JSON.stringify({ sessionToken: session.sessionToken }),
    }).catch(() => {});
  }

  clearSyncSession();
  clearAllIndexedRecords();
  resetSyncMetadata();
  setCurrentAction(undefined);
}

async function resetRemoteCopy() {
  setCurrentAction("reset-remote");
  try {
    return await syncNow({ resetRemote: true });
  } finally {
    setCurrentAction(undefined);
  }
}

/**
 * This device's passphrase was missing or wrong: store the one the user typed
 * and pull again. Unlike `changePassphrase`, Drive is left as it is — if this
 * one is wrong too, the pull says so and nothing is overwritten.
 */
async function setPassphrase(passphrase: string) {
  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error("Enter the sync passphrase.");
  }
  saveSyncPassphrase(trimmed);
  saveSyncMetadata({ syncStatus: "pending", syncError: null, syncErrorKind: null });
  return syncNow();
}

/** Re-encrypt everything on Drive under a new passphrase, from this device's copy. */
async function changePassphrase(passphrase: string) {
  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error("Enter the new sync passphrase.");
  }

  setCurrentAction("change-passphrase");
  try {
    saveSyncPassphrase(trimmed);
    clearAllIndexedRecords();
    saveSyncMetadata({
      syncStatus: "pending",
      syncError: null,
      syncErrorKind: null,
    });

    if (getSyncMetadata().authState !== "connected") {
      return { status: getSyncMetadata().syncStatus };
    }
    return await syncNow({ resetRemote: true });
  } finally {
    setCurrentAction(undefined);
  }
}

/* ---------------------------------------------------------------- hooks */

/**
 * Drives sync for the whole app. Mount exactly once, high in the tree — it
 * owns the dirty handler, which is a single slot.
 */
export function useSyncEngine() {
  useEffect(() => {
    const wake = () => {
      // focus and visibilitychange usually arrive together.
      if (Date.now() - lastAutoRunAt < 5_000) return;
      void resumePendingAuth().then((outcome) => {
        if (!outcome) void syncNow({ auto: true });
      });
    };

    registerSyncDirtyHandler(() => {
      const current = getSyncMetadata();
      if (current.syncEnabled && current.authState === "connected") {
        if (runLock) dirtyDuringRun = true;
        else scheduleSync();
      } else {
        saveSyncMetadata({ pendingUploadCount: Math.max(current.pendingUploadCount, 1), syncStatus: "pending" });
      }
    });

    const unsubscribe = subscribeSyncState(() => {
      const current = getSyncMetadata();
      if (current.authState === "awaiting_browser" && current.pendingAuthRequestId) {
        void resumePendingAuth();
      }
    });

    const handleOnline = () => {
      lastAutoRunAt = 0;
      wake();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") wake();
    };
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") wake();
    }, BACKGROUND_PULL_MS);

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", handleVisibility);

    // Opening the app is the moment another device's work should show up.
    wake();

    return () => {
      unsubscribe();
      registerSyncDirtyHandler(null);
      clearInterval(interval);
      clearTimers();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}

/** Sync status plus the user's actions. Safe to mount anywhere. */
export function useGoogleDriveSync() {
  const [status, setStatus] = useState<SyncStatus>(UNHYDRATED_STATUS);

  useEffect(() => {
    const refresh = () => setStatus(toStatus());
    refresh();
    const unsubscribe = subscribeSyncState(refresh);
    actionListeners.add(refresh);
    // Another tab's run writes the same metadata key.
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SYNC_METADATA_KEY) refresh();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      actionListeners.delete(refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return useMemo(() => ({
    status,
    connect,
    reconnect,
    disconnect,
    resetRemoteCopy,
    changePassphrase,
    setPassphrase,
    syncNow: () => syncNow(),
  }), [status]);
}
