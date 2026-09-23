"use client";

import { useGoogleDriveSync } from "@/lib/sync/google-client";
import type { SyncAttention } from "@/lib/sync/types";

/**
 * Whether sync needs the user — the one sync state worth a mark outside
 * Settings. Synced, syncing, offline and retrying are all silent.
 */
export function useSyncAttention(): SyncAttention | null {
  return useGoogleDriveSync().status.attention;
}
