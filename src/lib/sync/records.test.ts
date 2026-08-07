import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPendingSyncRecords, applyRemoteSyncRecords } from "./records";
import { clearAllIndexedRecords } from "./records";
import { persistSavedEntries, persistCompareItems } from "./collections";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import { saveSyncRecordIndex } from "./metadata";
import { SYNC_COLLECTION_UPDATED_AT_KEYS } from "./keys";
import { buildUsageSource, USAGE_STORAGE_KEY } from "@/lib/usage-stats";

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

    expect(JSON.parse(localStorage.getItem("ferroscale-compare-v2") || "[]")).toEqual([
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

  it("does not keep quick history pending forever when updatedAt key was missing", async () => {
    localStorage.setItem("ferroscale-quick-history", JSON.stringify(["quick-input"]));

    const firstPending = await getPendingSyncRecords("device-a");
    expect(firstPending.some((record) => record.recordKey === "quickHistory:root")).toBe(true);

    const quickRecord = firstPending.find((record) => record.recordKey === "quickHistory:root");
    expect(quickRecord).toBeDefined();
    if (!quickRecord) return;

    saveSyncRecordIndex({
      [quickRecord.recordKey]: {
        recordKey: quickRecord.recordKey,
        kind: quickRecord.kind,
        entityId: quickRecord.entityId,
        updatedAt: quickRecord.updatedAt,
        contentHash: quickRecord.contentHash,
        driveFileId: "drive-quick-history",
      },
    });

    const initializedUpdatedAt = localStorage.getItem(SYNC_COLLECTION_UPDATED_AT_KEYS.quickHistory);
    expect(initializedUpdatedAt).toBeTruthy();

    const secondPending = await getPendingSyncRecords("device-a");
    expect(secondPending.some((record) => record.recordKey === "quickHistory:root")).toBe(false);
  });
});

describe("usage records", () => {
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
  });

  it("pushes this device's own tally under its own record key", async () => {
    localStorage.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify({
        queries: [{ q: "hea120 6m", n: 2, t: Date.parse("2026-07-01T10:00:00Z") }],
        buckets: {},
      }),
    );

    const pending = await getPendingSyncRecords("device-a");
    const usage = pending.find((record) => record.recordKey === "usage:device-a");
    expect(usage).toBeDefined();
    expect(usage?.entityId).toBe("device-a");
    // The record's clock comes from the habits themselves, not a second store.
    expect(usage?.updatedAt).toBe("2026-07-01T10:00:00.000Z");
    expect(JSON.parse(usage?.payload ?? "{}").deviceId).toBe("device-a");
  });

  it("keeps another device's habits without touching its own tally", () => {
    // Both touched now, so the ranking turns on the counts rather than decay.
    const now = Date.now();
    localStorage.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify({ queries: [], buckets: { "size:shs": { "40x40x3": { n: 1, t: now } } } }),
    );

    applyRemoteSyncRecords(
      [
        {
          recordKey: "usage:device-b",
          kind: "usage",
          driveFileId: "drive-usage-b",
          removed: false,
          payload: JSON.stringify({
            deviceId: "device-b",
            updatedAt: "2026-07-02T10:00:00.000Z",
            stats: { queries: [], buckets: { "size:shs": { "45x45x4": { n: 3, t: now } } } },
          }),
          contentHash: "hash-usage-b",
          modifiedTime: "2026-07-02T10:00:00.000Z",
        },
      ],
      "device-a",
    );

    const own = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || "{}");
    expect(own.buckets["size:shs"]).toEqual({ "40x40x3": { n: 1, t: now } });
    expect(buildUsageSource().topSizes("shs")).toEqual(["45x45x4", "40x40x3"]);
  });

  it("ignores its own record coming back from the remote", () => {
    localStorage.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify({ queries: [], buckets: { "size:shs": { "40x40x3": { n: 1, t: 1 } } } }),
    );

    applyRemoteSyncRecords(
      [
        {
          recordKey: "usage:device-a",
          kind: "usage",
          driveFileId: "drive-usage-a",
          removed: false,
          payload: JSON.stringify({
            deviceId: "device-a",
            updatedAt: "2026-07-02T10:00:00.000Z",
            stats: { queries: [], buckets: { "size:shs": { "40x40x3": { n: 1, t: 1 } } } },
          }),
          contentHash: "hash-usage-a",
          modifiedTime: "2026-07-02T10:00:00.000Z",
        },
      ],
      "device-a",
    );

    // Merging our own echo would count the same use twice.
    expect(buildUsageSource().topSizes("shs")).toEqual(["40x40x3"]);
    expect(localStorage.getItem("ferroscale-usage-peers-v1")).toBeNull();
  });
});
