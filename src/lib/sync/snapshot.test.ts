import { describe, expect, it } from "vitest";
import { mergeEntityPayload, mergeListPayload, mergeSnapshots } from "./snapshot";
import type { SyncSnapshotV1 } from "./types";

describe("mergeEntityPayload", () => {
  it("keeps the newer update for the same entity id", () => {
    const merged = mergeEntityPayload(
      {
        items: [
          { id: "saved-1", updatedAt: "2026-03-31T10:00:00.000Z" },
        ],
      },
      {
        items: [
          { id: "saved-1", updatedAt: "2026-03-31T12:00:00.000Z" },
        ],
      },
    );

    expect(merged.items).toEqual([
      { id: "saved-1", updatedAt: "2026-03-31T12:00:00.000Z" },
    ]);
  });

  it("keeps a newer tombstone over an older update", () => {
    const merged = mergeEntityPayload(
      {
        items: [
          { id: "saved-1", updatedAt: "2026-03-31T10:00:00.000Z" },
        ],
      },
      {
        items: [
          {
            id: "saved-1",
            updatedAt: "2026-03-31T11:00:00.000Z",
            deletedAt: "2026-03-31T11:00:00.000Z",
          },
        ],
      },
    );

    expect(merged.items).toEqual([
      {
        id: "saved-1",
        updatedAt: "2026-03-31T11:00:00.000Z",
        deletedAt: "2026-03-31T11:00:00.000Z",
      },
    ]);
  });
});

describe("mergeListPayload", () => {
  it("keeps the newest whole-list payload", () => {
    const merged = mergeListPayload(
      {
        updatedAt: "2026-03-31T09:00:00.000Z",
        items: ["old"],
      },
      {
        updatedAt: "2026-03-31T13:00:00.000Z",
        items: ["new"],
      },
    );

    expect(merged.items).toEqual(["new"]);
  });
});

describe("mergeSnapshots", () => {
  it("merges entity collections independently and keeps newest list payloads", () => {
    const local: SyncSnapshotV1 = {
      schemaVersion: 1,
      snapshotUpdatedAt: "2026-03-31T10:00:00.000Z",
      deviceId: "device-a",
      collections: {
        saved: {
          items: [
            {
              id: "saved-1",
              timestamp: "2026-03-31T10:00:00.000Z",
              name: "Local",
              useCount: 0,
              updatedAt: "2026-03-31T10:00:00.000Z",
              parts: [],
              input: {} as never,
              result: {} as never,
              normalizedProfile: {} as never,
            },
          ],
        },
        projects: { items: [] },
        presets: { items: [] },
        compare: {
          updatedAt: "2026-03-31T10:00:00.000Z",
          items: [{ id: "cmp-local" } as never],
        },
        quickHistory: {
          updatedAt: "2026-03-31T10:00:00.000Z",
          items: ["lhs"],
        },
      },
    };

    const remote: SyncSnapshotV1 = {
      schemaVersion: 1,
      snapshotUpdatedAt: "2026-03-31T12:00:00.000Z",
      deviceId: "device-b",
      collections: {
        saved: {
          items: [
            {
              id: "saved-1",
              timestamp: "2026-03-31T10:00:00.000Z",
              name: "Remote",
              useCount: 0,
              updatedAt: "2026-03-31T12:00:00.000Z",
              parts: [],
              input: {} as never,
              result: {} as never,
              normalizedProfile: {} as never,
            },
          ],
        },
        projects: { items: [] },
        presets: { items: [] },
        compare: {
          updatedAt: "2026-03-31T11:00:00.000Z",
          items: [{ id: "cmp-remote" } as never],
        },
        quickHistory: {
          updatedAt: "2026-03-31T09:00:00.000Z",
          items: ["rhs"],
        },
      },
    };

    const merged = mergeSnapshots(local, remote, "device-a");

    expect(merged.deviceId).toBe("device-a");
    expect(merged.collections.saved.items[0]?.name).toBe("Remote");
    expect(merged.collections.compare.items[0]).toEqual({ id: "cmp-remote" });
    expect(merged.collections.quickHistory.items).toEqual(["lhs"]);
  });
});
