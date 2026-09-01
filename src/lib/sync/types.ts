import type { CompareItem } from "@/hooks/useCompare";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import type { PriceBookEntry } from "@/hooks/usePriceBook";
import { GOOGLE_SYNC_PROVIDER_ID } from "./keys";

export type { CompareItem, CompareItem as SyncCompareItem, DimensionPreset, Project, SavedEntry, PriceBookEntry };

export type SyncProviderId = typeof GOOGLE_SYNC_PROVIDER_ID;

export type SyncEntityCollectionKey = "saved" | "projects" | "presets";
export type SyncListCollectionKey = "compare" | "quickHistory" | "priceBook";
/**
 * Collections that neither replace wholesale nor key by entity: usage stats
 * are a grow-only counter per device, so every device owns one record and the
 * reader sums them.
 */
export type SyncMergeCollectionKey = "usage";
export type SyncedCollectionKey =
  | SyncEntityCollectionKey
  | SyncListCollectionKey
  | SyncMergeCollectionKey;

export interface SyncEntityRecord {
  id: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SyncEntityPayload<T extends SyncEntityRecord> {
  items: T[];
}

export interface SyncListPayload<T> {
  updatedAt: string;
  items: T[];
}

/** One device's typing habits. `stats` is usage-stats.ts's own shape. */
export interface SyncUsagePayload {
  deviceId: string;
  updatedAt: string;
  stats: unknown;
}

export interface SyncSnapshotV1 {
  schemaVersion: 1;
  snapshotUpdatedAt: string;
  deviceId: string;
  collections: {
    saved: SyncEntityPayload<SavedEntry>;
    projects: SyncEntityPayload<Project>;
    presets: SyncEntityPayload<DimensionPreset>;
    compare: SyncListPayload<CompareItem>;
    quickHistory: SyncListPayload<string>;
    priceBook: SyncListPayload<PriceBookEntry>;
  };
}

export interface SyncMetadata {
  deviceId: string;
  providerId: SyncProviderId | null;
  syncEnabled: boolean;
  authState: SyncAuthState;
  pendingAuthRequestId?: string | null;
  connectedEmail?: string | null;
  syncStatus: SyncRunStatus;
  syncError?: string | null;
  pendingUploadCount: number;
  pendingDownloadCount: number;
  lastSuccessfulPullAt?: string | null;
  lastSuccessfulPushAt?: string | null;
  lastDriveChangeToken?: string | null;
}

export interface SyncStatus {
  hydrated: boolean;
  connected: boolean;
  providerId: SyncProviderId | null;
  authState: SyncAuthState;
  connectedEmail?: string | null;
  lastPullAt?: string | null;
  lastPushAt?: string | null;
  lastError?: string | null;
  syncing: boolean;
  syncStatus: SyncRunStatus;
  pendingChanges: boolean;
  pendingUploadCount: number;
  pendingDownloadCount: number;
  passphraseConfigured: boolean;
  currentAction?: string;
}

export type SyncAuthState = "disconnected" | "awaiting_browser" | "connected" | "reauth_required";

export type SyncRunStatus = "idle" | "pending" | "syncing" | "synced" | "error";

export type SyncRecordKind =
  | "bootstrap"
  | "saved"
  | "project"
  | "preset"
  | "compare"
  | "quickHistory"
  | "priceBook"
  | "usage";

export interface SyncSessionDescriptor {
  provider: "google";
  sessionToken: string;
  accountEmail: string | null;
  accountSub: string | null;
}

export interface SyncSessionPayload {
  provider: "google";
  refreshToken: string;
  scope: string;
  accountEmail: string | null;
  accountSub: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncRecordIndexEntry {
  recordKey: string;
  kind: SyncRecordKind;
  entityId: string;
  updatedAt: string;
  contentHash: string;
  driveFileId?: string | null;
}

export type SyncRecordIndex = Record<string, SyncRecordIndexEntry>;

export interface SyncLocalRecord {
  recordKey: string;
  kind: SyncRecordKind;
  entityId: string;
  updatedAt: string;
  payload: string;
  contentHash: string;
  existingFileId?: string | null;
}

export interface AppliedSyncRecord {
  recordKey: string;
  kind: SyncRecordKind;
  driveFileId: string;
  removed: boolean;
  payload: string | null;
  contentHash: string | null;
  modifiedTime: string | null;
}

export interface SyncBootstrapPayload {
  schemaVersion: typeof import("./keys").SYNC_SCHEMA_VERSION;
  deviceId: string;
}
