import type { SyncedCollectionKey } from "./types";

type DirtyHandler = (key: SyncedCollectionKey) => void;

let dirtyHandler: DirtyHandler | null = null;

export function registerSyncDirtyHandler(handler: DirtyHandler | null): void {
  dirtyHandler = handler;
}

export function notifySyncedCollectionDirty(key: SyncedCollectionKey): void {
  dirtyHandler?.(key);
}
