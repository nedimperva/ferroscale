// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CorrectionEntry, CorrectionState } from "@/lib/sync/corrections-merge";

const mocks = vi.hoisted(() => ({
  state: { items: [], removed: {} } as CorrectionState,
  persist: vi.fn(),
  updatedAt: 0,
  replacedListeners: [] as Array<() => void>,
}));

vi.mock("@/lib/sync/collections", () => ({
  loadCorrections: () => mocks.state.items,
  loadCorrectionState: () => mocks.state,
  persistCorrections: (items: CorrectionEntry[], options?: { removed?: Record<string, number> }) => {
    mocks.state = { items, removed: options?.removed ?? mocks.state.removed };
    mocks.persist(items, options);
  },
  getCorrectionsUpdatedAt: () => mocks.updatedAt,
}));

vi.mock("@/lib/sync/external-changes", () => ({
  subscribeCollectionsReplaced: (listener: () => void) => {
    mocks.replacedListeners.push(listener);
    return () => {
      mocks.replacedListeners = mocks.replacedListeners.filter((item) => item !== listener);
    };
  },
}));

async function load() {
  vi.resetModules();
  return import("./corrections");
}

beforeEach(() => {
  mocks.state = { items: [], removed: {} };
  mocks.persist.mockClear();
  mocks.updatedAt = 0;
  mocks.replacedListeners = [];
});

describe("recordCorrection", () => {
  it("stores what was typed and what it became", async () => {
    const { recordCorrection, lookupCorrections } = await load();
    expect(recordCorrection("hae120", "hea120")).toBe(true);
    expect(lookupCorrections("HAE120 ")).toEqual([{ to: "hea120", n: 1 }]);
  });

  it("counts a repeat rather than duplicating it", async () => {
    const { recordCorrection, lookupCorrections } = await load();
    recordCorrection("hae120", "hea120");
    recordCorrection("hae120", "hea120");
    recordCorrection("HAE120", "hea120");
    expect(mocks.state.items).toHaveLength(1);
    expect(lookupCorrections("hae120")[0].n).toBe(3);
  });

  it("refuses a correction that changes nothing", async () => {
    const { recordCorrection, lookupCorrections } = await load();
    expect(recordCorrection("hea120", "HEA120")).toBe(false);
    expect(lookupCorrections("hea120")).toEqual([]);
  });

  it("refuses nonsense", async () => {
    const { recordCorrection } = await load();
    expect(recordCorrection("", "hea120")).toBe(false);
    expect(recordCorrection("hae120", "  ")).toBe(false);
    expect(recordCorrection("x".repeat(65), "hea120")).toBe(false);
  });

  it("caps the table", async () => {
    const { recordCorrection } = await load();
    for (let i = 0; i < 65; i += 1) recordCorrection(`typo${i}`, `size${i}`);
    expect(mocks.state.items).toHaveLength(60);
    expect(mocks.state.items[0].from).toBe("typo5");
  });
});

describe("forget", () => {
  it("forgets one correction", async () => {
    const { recordCorrection, forgetCorrection, lookupCorrections } = await load();
    recordCorrection("hae120", "hea120");
    recordCorrection("shs40", "shs40x40x3");
    expect(forgetCorrection("HAE120")).toBe(true);
    expect(lookupCorrections("hae120")).toEqual([]);
    expect(lookupCorrections("shs40")).toHaveLength(1);
  });

  it("reports nothing to forget", async () => {
    const { forgetCorrection } = await load();
    expect(forgetCorrection("nope")).toBe(false);
  });

  it("forgets everything", async () => {
    const { recordCorrection, forgetAllCorrections, lookupCorrections } = await load();
    recordCorrection("hae120", "hea120");
    recordCorrection("shs40", "shs40x40x3");
    forgetAllCorrections();
    expect(lookupCorrections("hae120")).toEqual([]);
    expect(lookupCorrections("shs40")).toEqual([]);
  });
});

describe("the snapshot the UI subscribes to", () => {
  it("returns the same array until the table changes", async () => {
    const { getCorrectionsSnapshot, recordCorrection } = await load();
    const first = getCorrectionsSnapshot();
    expect(getCorrectionsSnapshot()).toBe(first);
    recordCorrection("hae120", "hea120");
    expect(getCorrectionsSnapshot()).not.toBe(first);
    expect(getCorrectionsSnapshot()).toHaveLength(1);
  });

  it("re-reads when a pull replaces the collections", async () => {
    const { getCorrectionsSnapshot } = await load();
    expect(mocks.replacedListeners).toHaveLength(1);
    const before = getCorrectionsSnapshot();
    mocks.state = { items: [{ from: "hae120", to: "hea120", n: 2, t: 5 }], removed: {} };
    mocks.replacedListeners[0]();
    expect(getCorrectionsSnapshot()).not.toBe(before);
    expect(getCorrectionsSnapshot()).toHaveLength(1);
  });
});
