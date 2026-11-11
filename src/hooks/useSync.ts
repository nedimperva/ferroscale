"use client";

import { useGoogleDriveSync } from "@/lib/sync/google-client";

export function useSync() {
  const sync = useGoogleDriveSync();

  return {
    status: sync.status,
    connectProvider: sync.connect,
    reconnectProvider: sync.reconnect,
    disconnectProvider: sync.disconnect,
    changePassphrase: sync.changePassphrase,
    setPassphrase: sync.setPassphrase,
    syncNow: sync.syncNow,
  } as const;
}
