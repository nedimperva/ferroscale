"use client";

import type { CompareItem } from "@/hooks/useCompare";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import { sha256Text } from "./crypto";
import {
  getCompareUpdatedAt,
  getQuickHistoryUpdatedAt,
  loadCompareItems,
  loadPresets,
  loadProjects,
  loadQuickHistory,
  loadSavedEntries,
  normalizeCompareItems,
  normalizePresets,
  normalizeProjects,
  normalizeSavedEntries,
  persistCompareItems,
  persistPresets,
  persistProjects,
  persistQuickHistory,
  persistSavedEntries,
} from "./collections";
import { BOOTSTRAP_RECORD_KEY, SYNC_SCHEMA_VERSION } from "./keys";
import { loadSyncRecordIndex, saveSyncRecordIndex } from "./metadata";
import type {
  AppliedSyncRecord,
  SyncBootstrapPayload,
  SyncEntityRecord,
  SyncListPayload,
  SyncLocalRecord,
  SyncRecordIndex,
  SyncRecordKind,
} from "./types";

function isoOrEpoch(value: string | undefined) {
  return value?.trim() || new Date(0).toISOString();
}

function getEntityVersion(entity: SyncEntityRecord) {
  const updatedAt = isoOrEpoch(entity.updatedAt);
  const deletedAt = isoOrEpoch(entity.deletedAt);
  return deletedAt > updatedAt ? deletedAt : updatedAt;
}

function mergeEntityItem<T extends SyncEntityRecord>(items: T[], incoming: T) {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index < 0) {
    return [...items, incoming].sort((left, right) => getEntityVersion(right).localeCompare(getEntityVersion(left)));
  }

  const current = items[index];
  const useIncoming = getEntityVersion(incoming) > getEntityVersion(current)
    || (getEntityVersion(incoming) === getEntityVersion(current) && Boolean(incoming.deletedAt) && !current.deletedAt);
  if (!useIncoming) return items;

  const next = [...items];
  next[index] = incoming;
  return next.sort((left, right) => getEntityVersion(right).localeCompare(getEntityVersion(left)));
}

function singletonUpdatedAt(key: "compare" | "quickHistory") {
  return key === "compare" ? getCompareUpdatedAt() : getQuickHistoryUpdatedAt();
}

function buildEntityRecord<T extends SyncEntityRecord>(kind: SyncRecordKind, entityId: string, item: T) {
  return {
    recordKey: `${kind}:${entityId}`,
    kind,
    entityId,
    updatedAt: item.updatedAt,
    payload: JSON.stringify(item),
  };
}

function buildListRecord<T>(kind: "compare" | "quickHistory", items: T[]): Omit<SyncLocalRecord, "contentHash"> {
  const payload: SyncListPayload<T> = {
    updatedAt: singletonUpdatedAt(kind),
    items,
  };

  return {
    recordKey: `${kind}:root`,
    kind,
    entityId: "root",
    updatedAt: payload.updatedAt,
    payload: JSON.stringify(payload),
  };
}

async function finalizeRecords(
  drafts: Array<Omit<SyncLocalRecord, "contentHash">>,
  index: SyncRecordIndex,
): Promise<SyncLocalRecord[]> {
  return Promise.all(drafts.map(async (draft) => ({
    ...draft,
    contentHash: await sha256Text(draft.payload),
    existingFileId: index[draft.recordKey]?.driveFileId ?? null,
  })));
}

export async function buildLocalSyncRecords(deviceId: string) {
  const index = loadSyncRecordIndex();
  const bootstrap: SyncBootstrapPayload = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    deviceId,
  };

  const drafts: Array<Omit<SyncLocalRecord, "contentHash">> = [
    {
      recordKey: BOOTSTRAP_RECORD_KEY,
      kind: "bootstrap",
      entityId: "root",
      updatedAt: "1970-01-01T00:00:00.000Z",
      payload: JSON.stringify(bootstrap),
    },
    ...loadSavedEntries().map((item) => buildEntityRecord("saved", item.id, item)),
    ...loadProjects().map((item) => buildEntityRecord("project", item.id, item)),
    ...loadPresets().map((item) => buildEntityRecord("preset", item.id, item)),
    buildListRecord("compare", loadCompareItems()),
    buildListRecord("quickHistory", loadQuickHistory()),
  ];

  return finalizeRecords(drafts, index);
}

export async function getPendingSyncRecords(deviceId: string) {
  const index = loadSyncRecordIndex();
  const records = await buildLocalSyncRecords(deviceId);
  return records.filter((record) => {
    const current = index[record.recordKey];
    return !current
      || current.contentHash !== record.contentHash
      || current.updatedAt !== record.updatedAt
      || current.driveFileId !== record.existingFileId;
  });
}

export function clearIndexedRecord(recordKey: string) {
  const next = { ...loadSyncRecordIndex() };
  delete next[recordKey];
  saveSyncRecordIndex(next);
}

export function clearAllIndexedRecords() {
  saveSyncRecordIndex({});
}

export function savePulledRecordsToIndex(records: AppliedSyncRecord[]) {
  const next = { ...loadSyncRecordIndex() };
  for (const record of records) {
    if (record.removed || !record.payload || !record.contentHash) {
      delete next[record.recordKey];
      continue;
    }

    const parsed = record.recordKey.split(":");
    next[record.recordKey] = {
      recordKey: record.recordKey,
      kind: record.kind,
      entityId: parsed.slice(1).join(":") || "root",
      updatedAt: record.kind === "bootstrap"
        ? "1970-01-01T00:00:00.000Z"
        : resolveRecordUpdatedAt(record.kind, record.payload),
      contentHash: record.contentHash,
      driveFileId: record.driveFileId,
    };
  }
  saveSyncRecordIndex(next);
}

export function markSyncPushResults(records: SyncLocalRecord[], uploaded: Array<{ recordKey: string; driveFileId: string }>) {
  const next = { ...loadSyncRecordIndex() };
  const uploadedByKey = new Map(uploaded.map((entry) => [entry.recordKey, entry.driveFileId]));

  for (const record of records) {
    const driveFileId = uploadedByKey.get(record.recordKey) ?? record.existingFileId ?? null;
    next[record.recordKey] = {
      recordKey: record.recordKey,
      kind: record.kind,
      entityId: record.entityId,
      updatedAt: record.updatedAt,
      contentHash: record.contentHash,
      driveFileId,
    };
  }

  saveSyncRecordIndex(next);
}

function resolveRecordUpdatedAt(kind: SyncRecordKind, payload: string) {
  if (kind === "bootstrap") return "1970-01-01T00:00:00.000Z";
  if (kind === "compare" || kind === "quickHistory") {
    return (JSON.parse(payload) as SyncListPayload<unknown>).updatedAt;
  }
  return (JSON.parse(payload) as SyncEntityRecord).updatedAt;
}

export function applyRemoteSyncRecords(records: AppliedSyncRecord[]) {
  let saved = loadSavedEntries();
  let projects = loadProjects();
  let presets = loadPresets();
  let compare = loadCompareItems();
  let quickHistory = loadQuickHistory();
  let compareUpdatedAt = getCompareUpdatedAt();
  let quickHistoryUpdatedAt = getQuickHistoryUpdatedAt();

  let savedChanged = false;
  let projectsChanged = false;
  let presetsChanged = false;
  let compareChanged = false;
  let quickHistoryChanged = false;

  for (const record of records) {
    if (record.removed || !record.payload) continue;

    switch (record.kind) {
      case "bootstrap":
        break;
      case "saved": {
        const [entry] = normalizeSavedEntries([JSON.parse(record.payload) as SavedEntry]);
        if (!entry) break;
        const next = mergeEntityItem(saved, entry);
        savedChanged = savedChanged || next !== saved;
        saved = next;
        break;
      }
      case "project": {
        const [entry] = normalizeProjects([JSON.parse(record.payload) as Project]);
        if (!entry) break;
        const next = mergeEntityItem(projects, entry);
        projectsChanged = projectsChanged || next !== projects;
        projects = next;
        break;
      }
      case "preset": {
        const [entry] = normalizePresets([JSON.parse(record.payload) as DimensionPreset]);
        if (!entry) break;
        const next = mergeEntityItem(presets, entry);
        presetsChanged = presetsChanged || next !== presets;
        presets = next;
        break;
      }
      case "compare": {
        const payload = JSON.parse(record.payload) as SyncListPayload<CompareItem>;
        if (payload.updatedAt > compareUpdatedAt) {
          compare = normalizeCompareItems(payload.items as unknown[]);
          compareUpdatedAt = payload.updatedAt;
          compareChanged = true;
        }
        break;
      }
      case "quickHistory": {
        const payload = JSON.parse(record.payload) as SyncListPayload<string>;
        if (payload.updatedAt > quickHistoryUpdatedAt) {
          quickHistory = payload.items.filter((item) => typeof item === "string" && item.trim().length > 0);
          quickHistoryUpdatedAt = payload.updatedAt;
          quickHistoryChanged = true;
        }
        break;
      }
    }
  }

  if (savedChanged) persistSavedEntries(saved, { markDirty: false });
  if (projectsChanged) persistProjects(projects, { markDirty: false });
  if (presetsChanged) persistPresets(presets, { markDirty: false });
  if (compareChanged) persistCompareItems(compare, { markDirty: false, updatedAt: compareUpdatedAt });
  if (quickHistoryChanged) persistQuickHistory(quickHistory, { markDirty: false, updatedAt: quickHistoryUpdatedAt });
}
