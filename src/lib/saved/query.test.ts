import { describe, it, expect } from "vitest";
import type { SavedEntry } from "@/hooks/useSaved";
import { collectSavedTags, filterSortSaved } from "./query";

type EntrySeed = {
  id: string;
  name: string;
  timestamp: string;
  useCount?: number;
  lastUsedAt?: string;
  tags?: string[];
  notes?: string;
  pinned?: boolean;
  profileLabel?: string;
  gradeLabel?: string;
};

function entry(seed: EntrySeed): SavedEntry {
  return {
    id: seed.id,
    timestamp: seed.timestamp,
    name: seed.name,
    notes: seed.notes,
    tags: seed.tags,
    pinned: seed.pinned,
    useCount: seed.useCount ?? 0,
    lastUsedAt: seed.lastUsedAt,
    updatedAt: seed.timestamp,
    parts: [],
    input: {} as SavedEntry["input"],
    result: {
      profileLabel: seed.profileLabel ?? "HEA 120",
      gradeLabel: seed.gradeLabel ?? "S235",
    } as SavedEntry["result"],
    normalizedProfile: { shortLabel: seed.profileLabel ?? "HEA 120" } as SavedEntry["normalizedProfile"],
  };
}

const ENTRIES: SavedEntry[] = [
  entry({
    id: "a",
    name: "Gate post",
    timestamp: "2026-08-01T10:00:00.000Z",
    useCount: 2,
    lastUsedAt: "2026-08-05T10:00:00.000Z",
    tags: ["gate", "shop"],
    profileLabel: "SHS 40x40x3",
  }),
  entry({
    id: "b",
    name: "Beam run",
    timestamp: "2026-08-03T10:00:00.000Z",
    useCount: 9,
    lastUsedAt: "2026-08-04T10:00:00.000Z",
    tags: ["shop"],
    notes: "mezzanine job",
  }),
  entry({
    id: "c",
    name: "Railing",
    timestamp: "2026-08-02T10:00:00.000Z",
    useCount: 0,
    tags: ["gate"],
    gradeLabel: "304",
    profileLabel: "RND 20",
  }),
];

const ids = (list: SavedEntry[]) => list.map((e) => e.id);

describe("filterSortSaved", () => {
  it("defaults to newest first", () => {
    expect(ids(filterSortSaved(ENTRIES))).toEqual(["b", "c", "a"]);
  });

  it("sorts by use count, then by most recently used", () => {
    expect(ids(filterSortSaved(ENTRIES, { sort: "used" }))).toEqual(["b", "a", "c"]);
    expect(ids(filterSortSaved(ENTRIES, { sort: "lastUsed" }))).toEqual(["a", "b", "c"]);
  });

  it("sorts by name", () => {
    expect(ids(filterSortSaved(ENTRIES, { sort: "name" }))).toEqual(["b", "a", "c"]);
  });

  it("keeps pinned entries first in every sort mode", () => {
    const pinned = ENTRIES.map((e) => (e.id === "c" ? { ...e, pinned: true } : e));
    expect(ids(filterSortSaved(pinned))[0]).toBe("c");
    expect(ids(filterSortSaved(pinned, { sort: "used" }))[0]).toBe("c");
  });

  it("searches name, notes, tags, profile and grade", () => {
    expect(ids(filterSortSaved(ENTRIES, { search: "gate" }))).toEqual(["c", "a"]);
    expect(ids(filterSortSaved(ENTRIES, { search: "mezzanine" }))).toEqual(["b"]);
    expect(ids(filterSortSaved(ENTRIES, { search: "shs" }))).toEqual(["a"]);
    expect(ids(filterSortSaved(ENTRIES, { search: "304" }))).toEqual(["c"]);
  });

  it("treats multiple search words as AND, in any order", () => {
    expect(ids(filterSortSaved(ENTRIES, { search: "post gate" }))).toEqual(["a"]);
    expect(ids(filterSortSaved(ENTRIES, { search: "gate nothing" }))).toEqual([]);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(ids(filterSortSaved(ENTRIES, { search: "  RaIlInG " }))).toEqual(["c"]);
    expect(ids(filterSortSaved(ENTRIES, { search: "   " }))).toHaveLength(3);
  });

  it("narrows with tags (AND), and combines with search", () => {
    expect(ids(filterSortSaved(ENTRIES, { tags: ["shop"] }))).toEqual(["b", "a"]);
    expect(ids(filterSortSaved(ENTRIES, { tags: ["shop", "gate"] }))).toEqual(["a"]);
    expect(ids(filterSortSaved(ENTRIES, { tags: ["gate"], search: "railing" }))).toEqual(["c"]);
  });

  it("does not mutate the input array", () => {
    const original = [...ENTRIES];
    filterSortSaved(ENTRIES, { sort: "name" });
    expect(ENTRIES).toEqual(original);
  });
});

describe("collectSavedTags", () => {
  it("ranks tags by usage then alphabetically", () => {
    expect(collectSavedTags(ENTRIES)).toEqual(["gate", "shop"]);
  });

  it("returns nothing when no entry is tagged", () => {
    expect(collectSavedTags([entry({ id: "x", name: "x", timestamp: "2026-01-01" })])).toEqual([]);
  });
});
