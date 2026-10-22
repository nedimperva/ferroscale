import { describe, expect, it } from "vitest";
import {
  canonicalCorrections,
  correctionKey,
  mergeCorrections,
  sameCorrections,
  stampCorrectionEdit,
  type CorrectionEntry,
  type CorrectionState,
} from "./corrections-merge";

function entry(overrides: Partial<CorrectionEntry> & Pick<CorrectionEntry, "from">): CorrectionEntry {
  return { to: "hea120", n: 1, t: 1, ...overrides };
}

describe("correctionKey", () => {
  it("normalizes case and surrounding space", () => {
    expect(correctionKey("  HAE120 ")).toBe("hae120");
  });
});

describe("mergeCorrections", () => {
  it("keeps a correction only one side learned", () => {
    const local: CorrectionState = { items: [entry({ from: "hae120" })], removed: {} };
    const remote: CorrectionState = {
      items: [entry({ from: "shs40", to: "shs40x40x3" })],
      removed: {},
    };
    const merged = mergeCorrections(local, remote);
    expect(merged.items.map((item) => item.from).sort()).toEqual(["hae120", "shs40"]);
  });

  it("takes the larger count, never the sum", () => {
    const local: CorrectionState = { items: [entry({ from: "hae120", n: 3, t: 10 })], removed: {} };
    const remote: CorrectionState = { items: [entry({ from: "hae120", n: 5, t: 20 })], removed: {} };
    expect(mergeCorrections(local, remote).items[0].n).toBe(5);
  });

  it("keeps the destination from the newer edit", () => {
    const local: CorrectionState = {
      items: [entry({ from: "hae120", to: "hea120", n: 1, t: 10 })],
      removed: {},
    };
    const remote: CorrectionState = {
      items: [entry({ from: "hae120", to: "hea100", n: 1, t: 20 })],
      removed: {},
    };
    expect(mergeCorrections(local, remote).items[0].to).toBe("hea100");
  });

  it("does not resurrect a correction a tombstone killed", () => {
    const local: CorrectionState = {
      items: [entry({ from: "hae120", t: 5 })],
      removed: {},
    };
    const remote: CorrectionState = { items: [], removed: { hae120: 10 } };
    const merged = mergeCorrections(local, remote);
    expect(merged.items).toHaveLength(0);
    expect(merged.removed.hae120).toBe(10);
  });

  it("keeps a correction learned again after the tombstone", () => {
    const local: CorrectionState = { items: [], removed: { hae120: 10 } };
    const remote: CorrectionState = { items: [entry({ from: "hae120", t: 20 })], removed: {} };
    expect(mergeCorrections(local, remote).items).toHaveLength(1);
  });

  it("is stable when merged twice — a pull must not inflate counts", () => {
    const local: CorrectionState = {
      items: [entry({ from: "hae120", n: 2, t: 10 }), entry({ from: "shs40", n: 1, t: 8 })],
      removed: { upn100: 4 },
    };
    const remote: CorrectionState = {
      items: [entry({ from: "hae120", n: 2, t: 10 }), entry({ from: "ipe200", n: 1, t: 9 })],
      removed: { upn100: 4 },
    };
    const once = mergeCorrections(local, remote);
    const twice = mergeCorrections(once, remote);
    expect(sameCorrections(once, twice)).toBe(true);
  });
});

describe("canonicalCorrections", () => {
  it("does not depend on the order of the list", () => {
    const a: CorrectionState = {
      items: [entry({ from: "b" }), entry({ from: "a" })],
      removed: { y: 2, x: 1 },
    };
    const b: CorrectionState = {
      items: [entry({ from: "a" }), entry({ from: "b" })],
      removed: { x: 1, y: 2 },
    };
    expect(sameCorrections(a, b)).toBe(true);
    expect(canonicalCorrections(a).items.map((item) => item.from)).toEqual(["a", "b"]);
  });
});

describe("stampCorrectionEdit", () => {
  it("stamps a changed correction with the edit time", () => {
    const previous: CorrectionState = {
      items: [entry({ from: "hae120", to: "hea120", n: 1, t: 5 })],
      removed: {},
    };
    const next = stampCorrectionEdit(previous, [{ from: "hae120", to: "hea100", n: 1, t: 5 }], 99);
    expect(next.items[0]).toMatchObject({ to: "hea100", t: 99 });
  });

  it("leaves an unchanged correction alone", () => {
    const previous: CorrectionState = {
      items: [entry({ from: "hae120", n: 2, t: 5 })],
      removed: {},
    };
    const next = stampCorrectionEdit(previous, [{ from: "hae120", to: "hea120", n: 1, t: 5 }], 99);
    expect(next.items[0].n).toBe(2);
    expect(next.items[0].t).toBe(5);
  });

  it("writes a tombstone for a correction that disappeared", () => {
    const previous: CorrectionState = {
      items: [entry({ from: "hae120", t: 5 })],
      removed: {},
    };
    const next = stampCorrectionEdit(previous, [], 99);
    expect(next.items).toHaveLength(0);
    expect(next.removed.hae120).toBe(99);
  });

  it("drops the tombstone when the correction comes back", () => {
    const previous: CorrectionState = { items: [], removed: { hae120: 5 } };
    const next = stampCorrectionEdit(previous, [{ from: "hae120", to: "hea120", n: 1, t: 9 }], 99);
    expect(next.removed.hae120).toBeUndefined();
    expect(next.items).toHaveLength(1);
  });
});
