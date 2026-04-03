"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GOOGLE_SYNC_PROVIDER_ID, SYNC_AUTH_RESULT_STORAGE_KEY } from "./keys";
import type { SyncAuthPollResponse, SyncAuthStartResponse, SyncPullResponse, SyncPushResponse } from "./sync-shared";
import type { AppliedSyncRecord, SyncStatus } from "./types";

type SyncOutcome = {
  status: SyncStatus["syncStatus"];
  message?: string;
};

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
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message || `Sync request failed (${response.status})`);
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
  return Promise.all(records.map(async (record): Promise<AppliedSyncRecord> => ({
    recordKey: record.recordKey,
    kind: record.kind,
    driveFileId: record.driveFileId,
    removed: record.removed,
    payload: record.encryptedPayload ? await decryptAESGCM(record.encryptedPayload, passphrase) : null,
    contentHash: record.encryptedPayload ? await sha256Text(await decryptAESGCM(record.encryptedPayload, passphrase)) : null,
    modifiedTime: record.modifiedTime,
  })));
}

function toStatus(currentAction?: string): SyncStatus {
  const metadata = getSyncMetadata();
  return {
    hydrated: true,
    connected: metadata.authState === "connected",
    providerId: GOOGLE_SYNC_PROVIDER_ID,
    authState: metadata.authState,
    connectedEmail: metadata.connectedEmail,
    lastPullAt: metadata.lastSuccessfulPullAt,
    lastPushAt: metadata.lastSuccessfulPushAt,
    lastError: metadata.syncError,
    syncing: metadata.syncStatus === "syncing",
    syncStatus: metadata.syncStatus,
    pendingChanges: metadata.pendingUploadCount > 0 || metadata.pendingDownloadCount > 0,
    pendingUploadCount: metadata.pendingUploadCount,
    pendingDownloadCount: metadata.pendingDownloadCount,
    passphraseConfigured: hasSyncPassphrase(),
    currentAction,
  };
}

export function useGoogleDriveSync() {
  const [status, setStatus] = useState<SyncStatus>(() => toStatus());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentActionRef = useRef<string | undefined>(undefined);
  const runLock = useRef<Promise<SyncOutcome> | null>(null);
  const pendingAuthCheckRef = useRef<Promise<SyncOutcome | null> | null>(null);

  const refreshStatus = useCallback(() => {
    setStatus(toStatus(currentActionRef.current));
  }, []);

  const syncNow = useCallback(async (opts?: { resetRemote?: boolean }) => {
    if (runLock.current) return runLock.current;

    runLock.current = (async () => {
      const current = getSyncMetadata();
      if (!current.syncEnabled || current.authState !== "connected") {
        refreshStatus();
        return { status: current.syncStatus };
      }

      const passphrase = loadSyncPassphrase();
      if (!passphrase) {
        const next = saveSyncMetadata({
          syncStatus: "error",
          syncError: "Enter the sync passphrase on this device.",
        });
        setStatus(toStatus(currentActionRef.current));
        return { status: next.syncStatus, message: next.syncError ?? undefined };
      }

      const session = loadSyncSession();
      if (!session) {
        const next = saveSyncMetadata({
          authState: "reauth_required",
          syncStatus: "error",
          syncError: "Reconnect Google Drive to continue syncing.",
        });
        setStatus(toStatus(currentActionRef.current));
        return { status: next.syncStatus, message: next.syncError ?? undefined };
      }

      saveSyncMetadata({
        syncStatus: "syncing",
        syncError: null,
        pendingDownloadCount: 0,
      });
      refreshStatus();

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

        if (pull.records.length > 0) {
          saveSyncMetadata({
            pendingDownloadCount: pull.records.length,
            syncStatus: "syncing",
            syncError: null,
          });
          const decrypted = await decryptPulledRecords(pull.records, passphrase);
          applyRemoteSyncRecords(decrypted);
          savePulledRecordsToIndex(decrypted);
        }

        saveSyncMetadata({
          lastDriveChangeToken: pull.nextPageToken ?? current.lastDriveChangeToken,
          lastSuccessfulPullAt: new Date().toISOString(),
          pendingDownloadCount: 0,
          syncStatus: "pending",
          syncError: null,
        });

        const latest = getSyncMetadata();
        const pending = await getPendingSyncRecords(latest.deviceId);
        saveSyncMetadata({
          pendingUploadCount: pending.length,
        });

        if (pending.length > 0 || opts?.resetRemote) {
          const activeSession = loadSyncSession();
          if (!activeSession) throw new Error("Google Drive session missing");

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
            syncStatus: "synced",
            syncError: null,
          });
        } else {
          saveSyncMetadata({
            syncStatus: "synced",
            syncError: null,
          });
        }

        refreshStatus();
        return { status: getSyncMetadata().syncStatus };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Google Drive sync failed";
        saveSyncMetadata({
          authState: /401|refresh token|authorization|reauth/i.test(message) ? "reauth_required" : getSyncMetadata().authState,
          syncStatus: "error",
          syncError: message,
        });
        refreshStatus();
        return { status: "error", message };
      } finally {
        runLock.current = null;
      }
    })();

    return runLock.current;
  }, [refreshStatus]);

  const finalizeConnectedSession = useCallback(async (session: NonNullable<SyncAuthPollResponse & { status: "complete" }>["session"]) => {
    saveSyncSession(session);
    saveSyncMetadata({
      syncEnabled: true,
      authState: "connected",
      pendingAuthRequestId: null,
      connectedEmail: session.accountEmail,
      syncStatus: "pending",
      syncError: null,
    });
    refreshStatus();
    return syncNow();
  }, [refreshStatus, syncNow]);

  const resumePendingAuth = useCallback(async () => {
    if (pendingAuthCheckRef.current) {
      return pendingAuthCheckRef.current;
    }

    pendingAuthCheckRef.current = (async () => {
      const stored = readStoredAuthResult();
      if (stored?.status === "complete") {
        return finalizeConnectedSession(stored.session);
      }
      if (stored?.status === "error") {
        saveSyncMetadata({
          authState: "reauth_required",
          pendingAuthRequestId: null,
          syncStatus: "error",
          syncError: stored.message,
        });
        refreshStatus();
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
        saveSyncMetadata({
          authState: /timed out/i.test(message) ? current.authState : "reauth_required",
          pendingAuthRequestId: /timed out/i.test(message) ? current.pendingAuthRequestId : null,
          syncStatus: "error",
          syncError: message,
        });
        refreshStatus();
        return { status: "error", message };
      }
    })();

    try {
      return await pendingAuthCheckRef.current;
    } finally {
      pendingAuthCheckRef.current = null;
    }
  }, [finalizeConnectedSession, refreshStatus]);

  const scheduleSync = useCallback((delayMs = 1500) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncNow();
    }, delayMs);
    refreshStatus();
  }, [refreshStatus, syncNow]);

  const connect = useCallback(async (passphrase: string) => {
    const trimmed = passphrase.trim();
    if (!trimmed) {
      throw new Error("Enter a sync passphrase before connecting Google Drive.");
    }

    currentActionRef.current = "connect";
    refreshStatus();
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
      });
      refreshStatus();
      navigateAuthWindow(authWindow, start.authUrl);
      if (authWindow.mode === "redirect") {
        return { status: "pending" as const };
      }

      const session = await waitForAuthCompletion(start.authRequestId);
      return finalizeConnectedSession(session);
    } catch (error) {
      if (authWindow.mode === "popup" && !authWindow.popup.closed) {
        authWindow.popup.close();
      }

      const message = error instanceof Error ? error.message : "Failed to connect Google Drive";
      saveSyncMetadata({
        authState: "reauth_required",
        pendingAuthRequestId: null,
        syncStatus: "error",
        syncError: message,
      });
      refreshStatus();
      throw error;
    } finally {
      currentActionRef.current = undefined;
      refreshStatus();
    }
  }, [finalizeConnectedSession, refreshStatus]);

  const reconnect = useCallback(async () => {
    const passphrase = loadSyncPassphrase();
    if (!passphrase) {
      throw new Error("Enter the sync passphrase first.");
    }
    return connect(passphrase);
  }, [connect]);

  const disconnect = useCallback(async () => {
    currentActionRef.current = "disconnect";
    refreshStatus();
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
    currentActionRef.current = undefined;
    refreshStatus();
  }, [refreshStatus]);

  const resetRemoteCopy = useCallback(async () => {
    currentActionRef.current = "reset-remote";
    refreshStatus();
    const outcome = await syncNow({ resetRemote: true });
    currentActionRef.current = undefined;
    refreshStatus();
    return outcome;
  }, [refreshStatus, syncNow]);

  const changePassphrase = useCallback(async (passphrase: string) => {
    const trimmed = passphrase.trim();
    if (!trimmed) {
      throw new Error("Enter the new sync passphrase.");
    }

    currentActionRef.current = "change-passphrase";
    saveSyncPassphrase(trimmed);
    clearAllIndexedRecords();
    saveSyncMetadata({
      syncStatus: "pending",
      syncError: null,
    });
    refreshStatus();

    if (getSyncMetadata().authState !== "connected") {
      currentActionRef.current = undefined;
      refreshStatus();
      return { status: getSyncMetadata().syncStatus };
    }

    const outcome = await syncNow({ resetRemote: true });
    currentActionRef.current = undefined;
    refreshStatus();
    return outcome;
  }, [refreshStatus, syncNow]);

  useEffect(() => {
    refreshStatus();
    const unsubscribe = subscribeSyncState(() => {
      refreshStatus();
      const current = getSyncMetadata();
      if (current.authState === "awaiting_browser" && current.pendingAuthRequestId) {
        void resumePendingAuth();
      } else if (current.syncEnabled && current.authState === "connected") {
        scheduleSync(250);
      }
    });

    registerSyncDirtyHandler(() => {
      const current = getSyncMetadata();
      if (current.syncEnabled && current.authState === "connected") {
        scheduleSync();
      } else {
        saveSyncMetadata({ pendingUploadCount: Math.max(current.pendingUploadCount, 1), syncStatus: "pending" });
        refreshStatus();
      }
    });

    const handleOnline = () => {
      void resumePendingAuth().then((outcome) => {
        if (!outcome) void syncNow();
      });
    };

    const handleFocus = () => {
      void resumePendingAuth().then((outcome) => {
        if (!outcome) void syncNow();
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void resumePendingAuth().then((outcome) => {
          if (!outcome) void syncNow();
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    void resumePendingAuth();

    return () => {
      unsubscribe();
      registerSyncDirtyHandler(null);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refreshStatus, resumePendingAuth, scheduleSync, syncNow]);

  return useMemo(() => ({
    status,
    connect,
    reconnect,
    disconnect,
    resetRemoteCopy,
    changePassphrase,
    syncNow,
  }), [changePassphrase, connect, disconnect, reconnect, resetRemoteCopy, status, syncNow]);
}
