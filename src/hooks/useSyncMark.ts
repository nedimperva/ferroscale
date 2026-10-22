"use client";

import { useGoogleDriveSync } from "@/lib/sync/google-client";
import { useSyncQueue } from "@/lib/sync/queue";
import { unresolvedConflicts } from "@/lib/sync/conflicts";
import type { SyncAttention } from "@/lib/sync/types";

/**
 * What the sync mark shows, in one place.
 *
 * Outside Settings the app used to carry exactly one mark: a red dot when
 * sync needed the user. Everything else — syncing, offline, retrying — was
 * silent, and so was the number of records still waiting to go up. That
 * number is the one piece of information a user actually wants: "my other
 * device has not seen this yet".
 *
 * The mark stays quiet. Terracotta belongs to the answer, so sync uses ink
 * and grey, and red only when sync is genuinely broken.
 */
export type SyncMarkState =
  | "offline"
  | "syncing"
  | "error"
  | "attention"
  | "waiting"
  | "synced";

export interface SyncMark {
  state: SyncMarkState;
  /** Which kind of attention, when the state is `attention`. */
  attention: SyncAttention | null;
  /** How many records are waiting to go up. */
  pending: number;
  /** How many merges dropped something and want a look. */
  conflicts: number;
  /** When the last successful sync finished, epoch ms. 0 when never. */
  lastSyncedAt: number;
}

export function useSyncMark(): SyncMark {
  const { status } = useGoogleDriveSync();
  const queue = useSyncQueue();
  const conflicts = unresolvedConflicts().length;
  const lastSyncedAt = status.lastSyncedAt ? Date.parse(status.lastSyncedAt) : 0;

  if (!status.connected) {
    return { state: "offline", attention: null, pending: 0, conflicts, lastSyncedAt: 0 };
  }
  if (status.attention) {
    return {
      state: "attention",
      attention: status.attention,
      pending: status.pendingUploadCount,
      conflicts,
      lastSyncedAt,
    };
  }
  if (status.syncing || status.syncStatus === "syncing") {
    return {
      state: "syncing",
      attention: null,
      pending: status.pendingUploadCount,
      conflicts,
      lastSyncedAt,
    };
  }
  if (status.syncStatus === "error") {
    return {
      state: "error",
      attention: null,
      pending: status.pendingUploadCount,
      conflicts,
      lastSyncedAt,
    };
  }
  if (status.pendingUploadCount > 0 || queue.attempts > 0) {
    return {
      state: "waiting",
      attention: null,
      pending: status.pendingUploadCount,
      conflicts,
      lastSyncedAt,
    };
  }
  return { state: "synced", attention: null, pending: 0, conflicts, lastSyncedAt };
}
