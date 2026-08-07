import { describe, it, expect, vi } from "vitest";
import {
  buildPaletteActions,
  filterPalette,
  isPaletteQuery,
  paletteTerm,
  type PaletteHandlers,
  type PaletteItem,
} from "./palette";

const t = (key: string) => key.replace("palette.action.", "");

function handlers(overrides: Partial<PaletteHandlers> = {}): PaletteHandlers {
  return {
    navigate: vi.fn(),
    onNew: vi.fn(),
    onSave: vi.fn(),
    onCompare: vi.fn(),
    onCopySummary: vi.fn(),
    onShareLink: vi.fn(),
    onOpenHelp: vi.fn(),
    onToggleTheme: vi.fn(),
    hasResult: true,
    ...overrides,
  };
}

function item(id: string, label: string, kind: PaletteItem["kind"] = "saved"): PaletteItem {
  return { id, label, kind, run: vi.fn() };
}

describe("palette mode", () => {
  it("opens on a leading >", () => {
    expect(isPaletteQuery(">")).toBe(true);
    expect(isPaletteQuery("  >set")).toBe(true);
    expect(isPaletteQuery("hea120 6m")).toBe(false);
    // Not a palette line just because a > appears somewhere.
    expect(isPaletteQuery("hea120 > 6m")).toBe(false);
  });

  it("reads the term after the marker", () => {
    expect(paletteTerm(">")).toBe("");
    expect(paletteTerm("> settings ")).toBe("settings");
    expect(paletteTerm("hea120")).toBe("");
  });
});

describe("buildPaletteActions", () => {
  it("wires each action to its handler", () => {
    const h = handlers();
    const actions = buildPaletteActions(t, h);
    actions.find((a) => a.id === "save")!.run();
    actions.find((a) => a.id === "goProjects")!.run();
    expect(h.onSave).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith("projects");
  });

  it("disables the actions that need a finished calculation", () => {
    const actions = buildPaletteActions(t, handlers({ hasResult: false }));
    const disabled = actions.filter((a) => a.disabled).map((a) => a.id);
    expect(disabled).toEqual(["save", "compare", "copySummary", "shareLink"]);
    // Navigation never depends on the line.
    expect(actions.find((a) => a.id === "goSettings")!.disabled).toBe(false);
  });
});

describe("filterPalette", () => {
  it("returns everything, in order, for an empty term", () => {
    const items = [item("a", "Alpha"), item("b", "Beta")];
    expect(filterPalette(items, "").map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("ranks a prefix above a word start above a plain substring", () => {
    const items = [
      item("sub", "Balustrade"),
      item("word", "Go to saved"),
      item("prefix", "Save calculation"),
    ];
    expect(filterPalette(items, "sav").map((i) => i.id)).toEqual(["prefix", "word"]);
  });

  it("matches keywords as well as labels", () => {
    const items: PaletteItem[] = [
      { ...item("settings", "Go to settings", "action"), keywords: "preferences vat" },
      item("other", "Something else"),
    ];
    expect(filterPalette(items, "vat").map((i) => i.id)).toEqual(["settings"]);
  });

  it("narrows on every word of the term rather than widening", () => {
    const items = [item("a", "Gate frame"), item("b", "Gate post"), item("c", "Railing bay")];
    expect(filterPalette(items, "gate fr").map((i) => i.id)).toEqual(["a"]);
  });

  it("keeps the caller's order for equally good matches", () => {
    // Actions are built first, so they lead when nothing matches better.
    const items = [item("action", "Gate", "action"), item("entry", "Gate", "saved")];
    expect(filterPalette(items, "gate").map((i) => i.id)).toEqual(["action", "entry"]);
  });

  it("cuts the list so the panel stays readable", () => {
    const items = Array.from({ length: 30 }, (_, i) => item(`i${i}`, `Item ${i}`));
    expect(filterPalette(items, "item")).toHaveLength(8);
    expect(filterPalette(items, "item", 3)).toHaveLength(3);
  });

  it("returns nothing when the term matches nothing", () => {
    expect(filterPalette([item("a", "Alpha")], "zzz")).toEqual([]);
  });

  it("treats regex characters in the term as text", () => {
    expect(filterPalette([item("a", "Alpha (2)")], "(2)").map((i) => i.id)).toEqual(["a"]);
  });
});
