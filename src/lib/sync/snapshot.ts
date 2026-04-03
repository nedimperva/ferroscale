import {
  getCompareUpdatedAt,
  getQuickHistoryUpdatedAt,
  loadCompareItems,
  loadPresets,
  loadProjects,
  loadQuickHistory,
  loadSavedEntries,
  persistCompareItems,
  persistPresets,
  persistProjects,
  persistQuickHistory,
  persistSavedEntries,
} from "./collections";
import type {
  SyncEntityPayload,
  SyncEntityRecord,
  SyncListPayload,
  SyncSnapshotV1,
} from "./types";

function isoOrEpoch(value: string | undefined): string {
  return value?.trim() || new Date(0).toISOString();
}

function getEntityVersion(entity: SyncEntityRecord): string {
  const updatedAt = isoOrEpoch(entity.updatedAt);
  const deletedAt = isoOrEpoch(entity.deletedAt);
  if (deletedAt > updatedAt) return deletedAt;
  return updatedAt;
}

function pickLatestEntity<T extends SyncEntityRecord>(left: T, right: T): T {
  const leftVersion = getEntityVersion(left);
  const rightVersion = getEntityVersion(right);
  if (leftVersion === rightVersion) {
    if (left.deletedAt && !right.deletedAt) return left;
    if (right.deletedAt && !left.deletedAt) return right;
    return left;
  }
  return leftVersion > rightVersion ? left : right;
}

export function mergeEntityPayload<T extends SyncEntityRecord>(
  local: SyncEntityPayload<T>,
  remote: SyncEntityPayload<T>,
): SyncEntityPayload<T> {
  const merged = new Map<string, T>();

  for (const item of local.items) merged.set(item.id, item);
  for (const item of remote.items) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      continue;
    }
    merged.set(item.id, pickLatestEntity(existing, item));
  }

  return {
    items: [...merged.values()].sort((left, right) => getEntityVersion(right).localeCompare(getEntityVersion(left))),
  };
}

export function mergeListPayload<T>(
  local: SyncListPayload<T>,
  remote: SyncListPayload<T>,
): SyncListPayload<T> {
  return isoOrEpoch(remote.updatedAt) > isoOrEpoch(local.updatedAt) ? remote : local;
}

export function buildLocalSyncSnapshot(deviceId: string): SyncSnapshotV1 {
  const snapshotUpdatedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    snapshotUpdatedAt,
    deviceId,
    collections: {
      saved: { items: loadSavedEntries() },
      projects: { items: loadProjects() },
      presets: { items: loadPresets() },
      compare: {
        updatedAt: getCompareUpdatedAt(),
        items: loadCompareItems(),
      },
      quickHistory: {
        updatedAt: getQuickHistoryUpdatedAt(),
        items: loadQuickHistory(),
      },
    },
  };
}

export function mergeSnapshots(local: SyncSnapshotV1, remote: SyncSnapshotV1, deviceId: string): SyncSnapshotV1 {
  return {
    schemaVersion: 1,
    snapshotUpdatedAt: new Date().toISOString(),
    deviceId,
    collections: {
      saved: mergeEntityPayload(local.collections.saved, remote.collections.saved),
      projects: mergeEntityPayload(local.collections.projects, remote.collections.projects),
      presets: mergeEntityPayload(local.collections.presets, remote.collections.presets),
      compare: mergeListPayload(local.collections.compare, remote.collections.compare),
      quickHistory: mergeListPayload(local.collections.quickHistory, remote.collections.quickHistory),
    },
  };
}

export function applySnapshotToLocal(snapshot: SyncSnapshotV1): void {
  persistSavedEntries(snapshot.collections.saved.items, { markDirty: false });
  persistProjects(snapshot.collections.projects.items, { markDirty: false });
  persistPresets(snapshot.collections.presets.items, { markDirty: false });
  persistCompareItems(snapshot.collections.compare.items, {
    markDirty: false,
    updatedAt: snapshot.collections.compare.updatedAt,
  });
  persistQuickHistory(snapshot.collections.quickHistory.items, {
    markDirty: false,
    updatedAt: snapshot.collections.quickHistory.updatedAt,
  });
}

export function isSyncSnapshotV1(value: unknown): value is SyncSnapshotV1 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SyncSnapshotV1>;
  return candidate.schemaVersion === 1 && typeof candidate.snapshotUpdatedAt === "string" && Boolean(candidate.collections);
}

export function parseSyncSnapshot(json: string): SyncSnapshotV1 {
  const parsed = JSON.parse(json) as unknown;
  if (!isSyncSnapshotV1(parsed)) {
    throw new Error("Invalid sync snapshot.");
  }
  return parsed;
}
