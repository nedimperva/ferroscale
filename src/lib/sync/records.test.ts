import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPendingSyncRecords, applyRemoteSyncRecords } from "./records";
import { clearAllIndexedRecords } from "./records";
import { persistSavedEntries, persistCompareItems } from "./collections";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import { saveSyncRecordIndex } from "./metadata";

function createSavedEntry(overrides?: Partial<SavedEntry>): SavedEntry {
  return {
    id: "saved-1",
    timestamp: "2026-04-03T00:00:00.000Z",
    name: "Template",
    useCount: 0,
    updatedAt: "2026-04-03T00:00:00.000Z",
    parts: [],
    input: {} as never,
    result: {} as never,
    normalizedProfile: {} as never,
    ...overrides,
  };
}

function createCompareItem(id: string): CompareItem {
  return {
    id,
    timestamp: "2026-04-03T00:00:00.000Z",
    input: {} as never,
    result: {} as never,
    normalizedProfile: {} as never,
  };
}

describe("sync records", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    };

    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
    localStorage.clear();
    saveSyncRecordIndex({});
    clearAllIndexedRecords();
  });

  it("marks local entities as pending when no indexed record exists", async () => {
    persistSavedEntries([createSavedEntry()], { markDirty: false });

    const pending = await getPendingSyncRecords("device-a");

    expect(pending.some((record) => record.kind === "saved" && record.entityId === "saved-1")).toBe(true);
  });

  it("applies newer singleton compare payloads", () => {
    persistCompareItems([createCompareItem("cmp-local")], {
      markDirty: false,
      updatedAt: "2026-04-03T08:00:00.000Z",
    });

    applyRemoteSyncRecords([{
      recordKey: "compare:root",
      kind: "compare",
      driveFileId: "drive-1",
      removed: false,
      payload: JSON.stringify({
        updatedAt: "2026-04-03T09:00:00.000Z",
        items: [createCompareItem("cmp-remote")],
      }),
      contentHash: "hash-1",
      modifiedTime: "2026-04-03T09:00:00.000Z",
    }]);

    expect(JSON.parse(localStorage.getItem("advanced-calc-compare-v2") || "[]")).toEqual([
      expect.objectContaining({ id: "cmp-remote" }),
    ]);
  });

  it("keeps a newer local tombstone over an older remote entity", () => {
    persistSavedEntries([createSavedEntry({
      deletedAt: "2026-04-03T10:00:00.000Z",
      updatedAt: "2026-04-03T10:00:00.000Z",
    })], { markDirty: false });

    applyRemoteSyncRecords([{
      recordKey: "saved:saved-1",
      kind: "saved",
      driveFileId: "drive-1",
      removed: false,
      payload: JSON.stringify(createSavedEntry({
        updatedAt: "2026-04-03T09:00:00.000Z",
        deletedAt: undefined,
      })),
      contentHash: "hash-1",
      modifiedTime: "2026-04-03T09:00:00.000Z",
    }]);

    const stored = JSON.parse(localStorage.getItem("ferroscale-saved-v2") || "[]") as SavedEntry[];
    expect(stored[0]?.deletedAt).toBe("2026-04-03T10:00:00.000Z");
  });
});
