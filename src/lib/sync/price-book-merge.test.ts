import { describe, expect, it } from "vitest";
import { canonicalPriceBook, mergePriceBooks, stampPriceBookEdit } from "./price-book-merge";

const T1 = "2026-09-01T10:00:00.000Z";
const T2 = "2026-09-01T11:00:00.000Z";
const T3 = "2026-09-01T12:00:00.000Z";

describe("mergePriceBooks", () => {
  it("keeps both devices' edits to different grades", () => {
    const base = { gradeId: "s235", unitPrice: 1.2, updatedAt: T1 };
    const phone = {
      items: [{ ...base, unitPrice: 1.35, updatedAt: T2 }, { gradeId: "1.4301", unitPrice: 4.8, updatedAt: T1 }],
      removed: {},
    };
    const laptop = {
      items: [base, { gradeId: "1.4301", unitPrice: 5.1, updatedAt: T3 }],
      removed: {},
    };

    const merged = mergePriceBooks(phone, laptop);
    expect(merged.items).toEqual([
      { gradeId: "s235", unitPrice: 1.35, updatedAt: T2 },
      { gradeId: "1.4301", unitPrice: 5.1, updatedAt: T3 },
    ]);
  });

  it("keeps a removal newer than the other device's rate", () => {
    const merged = mergePriceBooks(
      { items: [], removed: { s355: T2 } },
      { items: [{ gradeId: "s355", unitPrice: 1.5, updatedAt: T1 }], removed: {} },
    );
    expect(merged.items).toEqual([]);
    expect(merged.removed).toEqual({ s355: T2 });
  });

  it("brings back a rate set again after it was removed", () => {
    const merged = mergePriceBooks(
      { items: [], removed: { s355: T1 } },
      { items: [{ gradeId: "s355", unitPrice: 1.6, updatedAt: T2 }], removed: {} },
    );
    expect(merged.items).toEqual([{ gradeId: "s355", unitPrice: 1.6, updatedAt: T2 }]);
    expect(merged.removed).toEqual({});
  });

  it("resolves ties identically from either side, so devices converge", () => {
    const a = { items: [{ gradeId: "s235", unitPrice: 1.2 }], removed: {} };
    const b = { items: [{ gradeId: "s235", unitPrice: 1.4 }], removed: {} };
    const ab = canonicalPriceBook(mergePriceBooks(a, b));
    const ba = canonicalPriceBook(mergePriceBooks(b, a));
    expect(ab).toEqual(ba);
    expect(ab.items[0].unitPrice).toBe(1.4);
  });
});

describe("stampPriceBookEdit", () => {
  it("stamps only what changed and tombstones what was removed", () => {
    const previous = {
      items: [
        { gradeId: "s235", unitPrice: 1.2, updatedAt: T1 },
        { gradeId: "s355", unitPrice: 1.5, updatedAt: T1 },
      ],
      removed: { al6061: T1 },
    };
    const next = stampPriceBookEdit(
      previous,
      [
        { gradeId: "s235", unitPrice: 1.2 },
        { gradeId: "al6061", unitPrice: 6 },
      ],
      T3,
    );
    expect(next.items).toEqual([
      { gradeId: "s235", unitPrice: 1.2, updatedAt: T1 },
      { gradeId: "al6061", unitPrice: 6, updatedAt: T3 },
    ]);
    expect(next.removed).toEqual({ s355: T3 });
  });
});
