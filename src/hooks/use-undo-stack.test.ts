import { beforeEach, describe, expect, it } from "vitest";
import {
  clearUndo,
  getUndoSnapshot,
  listUndoEntries,
  pushUndo,
  redo,
  undo,
} from "./use-undo-stack";

beforeEach(() => {
  clearUndo();
});

function entry(label: string, log: string[]) {
  return {
    label,
    group: "action" as const,
    undo: () => log.push(`undo ${label}`),
    redo: () => log.push(`redo ${label}`),
  };
}

describe("pushUndo", () => {
  it("puts the newest entry on top", () => {
    const log: string[] = [];
    pushUndo(entry("first", log));
    pushUndo(entry("second", log));
    expect(getUndoSnapshot().nextUndoLabel).toBe("second");
    expect(listUndoEntries().map((item) => item.label)).toEqual(["second", "first"]);
  });

  it("clears the redo stack — undo then do something else", () => {
    const log: string[] = [];
    pushUndo(entry("first", log));
    undo();
    expect(getUndoSnapshot().canRedo).toBe(true);
    pushUndo(entry("second", log));
    expect(getUndoSnapshot().canRedo).toBe(false);
  });

  it("caps the stack", () => {
    const log: string[] = [];
    for (let i = 0; i < 120; i += 1) pushUndo(entry(`entry ${i}`, log));
    expect(listUndoEntries()).toHaveLength(100);
    expect(listUndoEntries()[99].label).toBe("entry 20");
  });
});

describe("undo and redo", () => {
  it("runs the entry's own undo and can put it back", () => {
    const log: string[] = [];
    pushUndo(entry("remove part", log));

    expect(undo()?.label).toBe("remove part");
    expect(log).toEqual(["undo remove part"]);
    expect(getUndoSnapshot().canUndo).toBe(false);

    expect(redo()?.label).toBe("remove part");
    expect(log).toEqual(["undo remove part", "redo remove part"]);
    expect(getUndoSnapshot().canUndo).toBe(true);
  });

  it("does nothing on an empty stack", () => {
    expect(undo()).toBeNull();
    expect(redo()).toBeNull();
  });

  it("walks back more than one step, newest first", () => {
    const log: string[] = [];
    pushUndo(entry("one", log));
    pushUndo(entry("two", log));
    undo();
    undo();
    expect(log).toEqual(["undo two", "undo one"]);
    expect(getUndoSnapshot().canUndo).toBe(false);
    expect(getUndoSnapshot().canRedo).toBe(true);
  });
});

describe("the snapshot", () => {
  it("keeps its identity until the stack changes", () => {
    const first = getUndoSnapshot();
    expect(getUndoSnapshot()).toBe(first);
    pushUndo(entry("one", []));
    expect(getUndoSnapshot()).not.toBe(first);
    const second = getUndoSnapshot();
    expect(getUndoSnapshot()).toBe(second);
  });
});
