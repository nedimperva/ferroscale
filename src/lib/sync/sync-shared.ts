import { SYNC_FILE_PREFIX, SYNC_PROVIDER, SYNC_SCHEMA_VERSION, SYNC_SCOPE } from "./keys";
import type { SyncRecordKind } from "./types";

export { SYNC_FILE_PREFIX, SYNC_PROVIDER, SYNC_SCHEMA_VERSION, SYNC_SCOPE };

export interface SyncPushRecord {
  recordKey: string;
  kind: SyncRecordKind;
  entityId: string;
  updatedAt: string;
  contentHash: string;
  encryptedPayload: string;
  existingFileId?: string | null;
}

export interface SyncPushRequest {
  sessionToken: string;
  records: SyncPushRecord[];
  resetRemote?: boolean;
}

export interface SyncPushResult {
  recordKey: string;
  driveFileId: string;
  name: string;
  modifiedTime: string | null;
}

export interface SyncPushResponse {
  ok: true;
  records: SyncPushResult[];
  sessionToken?: string;
}

export interface SyncPullRequest {
  sessionToken: string;
  pageToken?: string | null;
}

export interface SyncPulledRecord {
  recordKey: string;
  kind: SyncRecordKind;
  driveFileId: string;
  encryptedPayload: string | null;
  removed: boolean;
  modifiedTime: string | null;
}

export interface SyncPullResponse {
  ok: true;
  records: SyncPulledRecord[];
  nextPageToken: string | null;
  sessionToken?: string;
}

export interface SyncAuthStartResponse {
  ok: true;
  authRequestId: string;
  authUrl: string;
  expiresAt: string;
}

export interface SyncAuthPollPending {
  ok: true;
  status: "pending";
}

export interface SyncAuthPollComplete {
  ok: true;
  status: "complete";
  session: {
    provider: typeof SYNC_PROVIDER;
    sessionToken: string;
    accountEmail: string | null;
    accountSub: string | null;
  };
}

export interface SyncAuthPollError {
  ok: true;
  status: "error";
  message: string;
}

export type SyncAuthPollResponse = SyncAuthPollPending | SyncAuthPollComplete | SyncAuthPollError;

export function buildRemoteFileName(kind: SyncRecordKind, recordKey: string) {
  return `${SYNC_FILE_PREFIX}--${kind}--${encodeURIComponent(recordKey)}.enc`;
}

export function parseRemoteFileName(name: string): { kind: SyncRecordKind; recordKey: string } | null {
  const prefix = `${SYNC_FILE_PREFIX}--`;
  if (!name.startsWith(prefix) || !name.endsWith(".enc")) return null;

  const trimmed = name.slice(prefix.length, -4);
  const separatorIndex = trimmed.indexOf("--");
  if (separatorIndex < 0) return null;

  const kind = trimmed.slice(0, separatorIndex) as SyncRecordKind;
  const encodedKey = trimmed.slice(separatorIndex + 2);
  if (!encodedKey) return null;

  return {
    kind,
    recordKey: decodeURIComponent(encodedKey),
  };
}
