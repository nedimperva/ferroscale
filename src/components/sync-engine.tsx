"use client";

import { useSyncEngine } from "@/lib/sync/google-client";

/**
 * Runs Drive sync for the whole app. It used to live inside the Settings
 * sync card, so nothing synced unless Settings happened to be open.
 */
export function SyncEngine() {
  useSyncEngine();
  return null;
}
