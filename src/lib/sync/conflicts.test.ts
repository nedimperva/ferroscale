// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearConflicts,
  dismissConflict,
  loadConflicts,
  normalizeConflicts,
  recordConflict,
  resolveConflict,
  unresolvedConflicts,
} from "./conflicts";

beforeEach(() => {
  localStorage.clear();
});

describe("recordConflict", () => {
  it("writes down which side won and keeps the loser", () => {
    const conflict = recordConflict({
      kind: "entity",
      entity: "project",
      label: "Hala 2",
      local: { name: "Hala 2 — old" },
      remote: { name: "Hala 2 — new" },
      winner: "remote",
    });

    const [stored] = loadConflicts();
    expect(stored.id).toBe(conflict.id);
    expect(stored.winner).toBe("remote");
    expect(stored.local).toEqual({ name: "Hala 2 — old" });
    expect(stored.remote).toEqual({ name: "Hala 2 — new" });
    expect(stored.resolved).toBe(false);
  });

  it("keeps the newest first", () => {
    recordConflict({ kind: "entity", entity: "project", label: "first", local: 1, remote: 2, winner: "local" });
    recordConflict({ kind: "entity", entity: "project", label: "second", local: 1, remote: 2, winner: "local" });
    expect(loadConflicts().map((entry) => entry.label)).toEqual(["second", "first"]);
  });

  it("caps the log so it cannot grow without bound", () => {
    for (let i = 0; i < 45; i += 1) {
      recordConflict({ kind: "list", entity: "compare", label: `row ${i}`, local: i, remote: i, winner: "local" });
    }
    expect(loadConflicts()).toHaveLength(40);
  });
});

describe("resolving", () => {
  it("marks a conflict resolved but keeps the record", () => {
    const conflict = recordConflict({
      kind: "settings",
      entity: "settings",
      label: "Settings",
      local: 1,
      remote: 2,
      winner: "remote",
    });
    resolveConflict(conflict.id);
    expect(unresolvedConflicts()).toHaveLength(0);
    expect(loadConflicts()).toHaveLength(1);
  });

  it("dismiss removes it entirely", () => {
    const conflict = recordConflict({
      kind: "corrections",
      entity: "corrections",
      label: "Learned",
      local: 1,
      remote: 2,
      winner: "local",
    });
    dismissConflict(conflict.id);
    expect(loadConflicts()).toHaveLength(0);
  });

  it("clear empties the log", () => {
    recordConflict({ kind: "entity", entity: "part", label: "HEA 120", local: 1, remote: 2, winner: "local" });
    clearConflicts();
    expect(loadConflicts()).toHaveLength(0);
  });
});

describe("normalizeConflicts", () => {
  it("drops rows that are not conflicts", () => {
    expect(
      normalizeConflicts([
        { id: "a", entity: "project", label: "Ok", winner: "local" },
        { id: "b", entity: "project", label: "Bad winner", winner: "both" },
        { nope: true },
        null,
      ]),
    ).toHaveLength(1);
  });

  it("is empty for anything that is not a list", () => {
    expect(normalizeConflicts({ id: "a" })).toEqual([]);
    expect(normalizeConflicts(null)).toEqual([]);
  });

  it("defaults a missing kind to entity", () => {
    const [entry] = normalizeConflicts([
      { id: "a", entity: "project", label: "Ok", winner: "local" },
    ]);
    expect(entry.kind).toBe("entity");
  });
});
