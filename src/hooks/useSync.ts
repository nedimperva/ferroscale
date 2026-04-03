"use client";

import { useCallback } from "react";
import { downloadBlob } from "@/lib/csv-utils";
import { useGoogleDriveSync } from "@/lib/sync/google-client";
import { getSyncMetadata } from "@/lib/sync/metadata";
import { applySnapshotToLocal, buildLocalSyncSnapshot, mergeSnapshots, parseSyncSnapshot } from "@/lib/sync/snapshot";

export function useSync() {
  const sync = useGoogleDriveSync();

  const exportSnapshot = useCallback(() => {
    const snapshot = buildLocalSyncSnapshot(getSyncMetadata().deviceId);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json;charset=utf-8" });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `ferroscale-sync-${date}.json`);
  }, []);

  const importSnapshot = useCallback(async (file: File) => {
    const text = await file.text();
    const imported = parseSyncSnapshot(text);
    const local = buildLocalSyncSnapshot(getSyncMetadata().deviceId);
    const merged = mergeSnapshots(local, imported, getSyncMetadata().deviceId);
    applySnapshotToLocal(merged);
    if (sync.status.connected) {
      await sync.syncNow();
    }
  }, [sync]);

  return {
    status: sync.status,
    connectProvider: sync.connect,
    reconnectProvider: sync.reconnect,
    disconnectProvider: sync.disconnect,
    changePassphrase: sync.changePassphrase,
    resetRemoteCopy: sync.resetRemoteCopy,
    syncNow: sync.syncNow,
    exportSnapshot,
    importSnapshot,
  } as const;
}
