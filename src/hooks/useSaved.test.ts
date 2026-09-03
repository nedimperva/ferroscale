// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { useSaved, type TemplatePartDraft } from "./useSaved";

const SETTINGS: CommandParserSettings = {
  pricing: {
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 2.5,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

/**
 * What the Parts card's "add a cut" field does with what someone types: the
 * line goes through the same parser the command bar uses, and every item on it
 * becomes a part.
 */
function draftsFromCommand(command: string): TemplatePartDraft[] {
  return cmdParseLine(command, SETTINGS)
    .items.map((item) => item.parse)
    .filter((parse) => parse.calc)
    .map((parse) => ({
      name: parse.calc!.result.profileLabel,
      input: parse.calc!.input,
      result: parse.calc!.result,
    }));
}

function seedEntry(result: ReturnType<typeof renderHook<ReturnType<typeof useSaved>, unknown>>["result"]) {
  const drafts = draftsFromCommand("hea140 3m x1 s235");
  expect(drafts).toHaveLength(1);
  let id = "";
  act(() => {
    id = result.current.saveCalculation(drafts[0].input, drafts[0].result, "Mezzanine bay").id;
  });
  return id;
}

describe("useSaved — adding parts by command", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends every item of a multi-item line in one go", () => {
    const { result } = renderHook(() => useSaved());
    const id = seedEntry(result);
    expect(result.current.saved.find((e) => e.id === id)?.parts).toHaveLength(1);

    const drafts = draftsFromCommand("plt200x160x12 x2 s235 + l50x50x5 280mm x4 s235");
    expect(drafts).toHaveLength(2);

    let appended = false;
    act(() => {
      appended = result.current.appendPartsToSaved(id, drafts);
    });

    expect(appended).toBe(true);
    const entry = result.current.saved.find((e) => e.id === id);
    expect(entry?.parts).toHaveLength(3);
    // Each part carries its own snapshot, so the assembly totals stay right.
    expect(entry?.parts.every((part) => part.normalizedProfile?.shortLabel)).toBe(true);
    // Part ids are unique — the remove button addresses one row.
    expect(new Set(entry?.parts.map((p) => p.id)).size).toBe(3);
  });

  it("reports failure for a command that does not parse, leaving the entry alone", () => {
    const { result } = renderHook(() => useSaved());
    const id = seedEntry(result);

    expect(draftsFromCommand("not a real profile")).toHaveLength(0);

    let appended = true;
    act(() => {
      appended = result.current.appendPartsToSaved(id, []);
    });

    expect(appended).toBe(false);
    expect(result.current.saved.find((e) => e.id === id)?.parts).toHaveLength(1);
  });

  it("turns a single-part entry into an assembly and survives a remount", () => {
    const first = renderHook(() => useSaved());
    const id = seedEntry(first.result);
    act(() => {
      first.result.current.appendPartsToSaved(id, draftsFromCommand("plt200x160x12 x2 s235"));
    });
    first.unmount();

    const second = renderHook(() => useSaved());
    const entry = second.result.current.saved.find((e) => e.id === id);
    expect(entry?.parts).toHaveLength(2);
  });

  it("will not append to a deleted entry", () => {
    const { result } = renderHook(() => useSaved());
    const id = seedEntry(result);

    act(() => {
      result.current.removeSaved(id);
    });

    let appended = true;
    act(() => {
      appended = result.current.appendPartsToSaved(id, draftsFromCommand("plt200x160x12 x2 s235"));
    });

    expect(appended).toBe(false);
  });
});

describe("useSaved — removing and reordering parts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function seedAssembly(result: ReturnType<typeof renderHook<ReturnType<typeof useSaved>, unknown>>["result"]) {
    const id = seedEntry(result);
    act(() => {
      result.current.appendPartsToSaved(
        id,
        draftsFromCommand("plt200x160x12 x2 s235 + l50x50x5 280mm x4 s235"),
      );
    });
    return id;
  }

  it("reports a removal that applied, and refuses the last part", () => {
    const { result } = renderHook(() => useSaved());
    const id = seedAssembly(result);
    const parts = result.current.saved.find((e) => e.id === id)!.parts;
    expect(parts).toHaveLength(3);

    let removed = false;
    act(() => {
      removed = result.current.removePartFromSaved(id, parts[1].id);
    });
    expect(removed).toBe(true);
    expect(result.current.saved.find((e) => e.id === id)?.parts).toHaveLength(2);

    // Down to one, the part is the entry — removing it is refused, not silent.
    act(() => {
      result.current.removePartFromSaved(id, result.current.saved.find((e) => e.id === id)!.parts[1].id);
    });
    let removedLast = true;
    act(() => {
      removedLast = result.current.removePartFromSaved(id, result.current.saved.find((e) => e.id === id)!.parts[0].id);
    });
    expect(removedLast).toBe(false);
    expect(result.current.saved.find((e) => e.id === id)?.parts).toHaveLength(1);
  });

  it("refuses a removal for a part id that is not on the entry", () => {
    const { result } = renderHook(() => useSaved());
    const id = seedAssembly(result);
    let removed = true;
    act(() => {
      removed = result.current.removePartFromSaved(id, "not-a-part-id");
    });
    expect(removed).toBe(false);
    expect(result.current.saved.find((e) => e.id === id)?.parts).toHaveLength(3);
  });

  it("reports a reorder that applied, and refuses one off either end", () => {
    const { result } = renderHook(() => useSaved());
    const id = seedAssembly(result);
    const before = result.current.saved.find((e) => e.id === id)!.parts.map((p) => p.name);

    let moved = false;
    act(() => {
      moved = result.current.reorderPartInSaved(id, result.current.saved.find((e) => e.id === id)!.parts[2].id, -1);
    });
    expect(moved).toBe(true);
    const after = result.current.saved.find((e) => e.id === id)!.parts.map((p) => p.name);
    expect(after).toEqual([before[0], before[2], before[1]]);

    let offTop = true;
    act(() => {
      offTop = result.current.reorderPartInSaved(id, result.current.saved.find((e) => e.id === id)!.parts[0].id, -1);
    });
    expect(offTop).toBe(false);

    let offEnd = true;
    act(() => {
      offEnd = result.current.reorderPartInSaved(id, result.current.saved.find((e) => e.id === id)!.parts[2].id, 1);
    });
    expect(offEnd).toBe(false);
  });
});
