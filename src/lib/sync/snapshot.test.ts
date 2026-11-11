import { describe, expect, it } from "vitest";
import { mergeEntityPayload, mergeListPayload } from "./snapshot";

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
