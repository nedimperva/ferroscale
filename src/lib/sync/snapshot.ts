import type {
  SyncEntityPayload,
  SyncEntityRecord,
  SyncListPayload,
} from "./types";

/**
 * The merge rules for one collection: entities by id, newest version wins (a
 * tombstone beats an update of the same moment); whole lists by `updatedAt`.
 * Used by the backup restore's merge mode.
 */
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
