import { cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { describe, expect, it } from "vitest";
import { diffFields, diffLines, diffTokens } from "./diff";

const SETTINGS: CommandParserSettings = {
  pricing: {
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

const parse = (query: string) => cmdParseLine(query, SETTINGS);

describe("diffTokens", () => {
  it("reports the same line as identical", () => {
    const diff = diffTokens("hea120 6m x2", "hea120 6m x2");
    expect(diff.identical).toBe(true);
    expect(diff.entries.every((entry) => entry.change === "same")).toBe(true);
    expect(diff.entries.map((entry) => entry.kind).sort()).toEqual(["len", "profile", "qty"]);
  });

  it("ignores order, because the grammar does", () => {
    const diff = diffTokens("hea120 6m x2", "x2 hea120 6m");
    expect(diff.identical).toBe(true);
    expect(diff.entries).toHaveLength(3);
  });

  it("ignores case and spacing", () => {
    expect(diffTokens("hea120 6m", "HEA120   6M").identical).toBe(true);
  });

  it("marks a token of the same role but different text as changed", () => {
    const diff = diffTokens("hea120 6m x2", "hea120 6m x3");
    const qty = diff.entries.find((entry) => entry.kind === "qty");
    expect(qty?.change).toBe("changed");
    expect(qty?.from).toBe("x2");
    expect(qty?.to).toBe("x3");
    expect(diff.identical).toBe(false);
  });

  it("marks a token only the left side has as removed", () => {
    const diff = diffTokens("hea120 6m x2 s235", "hea120 6m");
    const qty = diff.entries.find((entry) => entry.kind === "qty");
    const grade = diff.entries.find((entry) => entry.kind === "grade");
    expect(qty?.change).toBe("removed");
    expect(qty?.from).toBe("x2");
    expect(qty?.to).toBe("");
    expect(grade?.change).toBe("removed");
    expect(grade?.from).toBe("s235");
  });

  it("marks a token only the right side has as added", () => {
    const diff = diffTokens("hea120 6m", "hea120 6m x2 s235");
    const qty = diff.entries.find((entry) => entry.kind === "qty");
    const grade = diff.entries.find((entry) => entry.kind === "grade");
    expect(qty?.change).toBe("added");
    expect(qty?.from).toBe("");
    expect(qty?.to).toBe("x2");
    expect(grade?.change).toBe("added");
    expect(grade?.to).toBe("s235");
  });

  it("keeps a duplicate token in the count instead of dropping it", () => {
    const diff = diffTokens("hea120 6m 8m", "hea120 6m 8m");
    expect(diff.entries).toHaveLength(3);
    expect(diff.identical).toBe(true);
  });
});

describe("diffLines", () => {
  it("reports the same line as identical", () => {
    const diff = diffLines(parse("hea120 6m x2"), parse("hea120 6m x2"));
    expect(diff.identical).toBe(true);
    expect(diff.tokens.identical).toBe(true);
    expect(diff.weight.delta).toBe(0);
    expect(diff.cost.delta).toBe(0);
    expect(diff.quantity.delta).toBe(0);
  });

  it("reports the same line in another order as identical", () => {
    const diff = diffLines(parse("hea120 6m x2"), parse("x2 hea120 6m"));
    expect(diff.identical).toBe(true);
    expect(diff.weight.delta).toBe(0);
  });

  it("carries the weight, cost and quantity a changed quantity makes", () => {
    const two = parse("hea120 6m x2");
    const three = parse("hea120 6m x3");
    const diff = diffLines(two, three);

    expect(diff.identical).toBe(false);
    expect(diff.tokens.entries.find((entry) => entry.kind === "qty")?.change).toBe("changed");
    expect(diff.quantity.from).toBe(2);
    expect(diff.quantity.to).toBe(3);
    expect(diff.quantity.delta).toBe(1);
    expect(diff.quantity.percent).toBe(50);
    expect(diff.weight.to).toBeCloseTo(diff.weight.from! * 1.5, 6);
    expect(diff.weight.delta).toBeCloseTo(diff.weight.from! * 0.5, 6);
    expect(diff.weight.percent).toBeCloseTo(50, 6);
    expect(diff.cost.to).toBeCloseTo(diff.weight.to! * 1.2, 1);
    expect(diff.cost.delta).toBeCloseTo(diff.weight.delta! * 1.2, 1);
  });

  it("reads the quantity of the first item, not the sum of the line", () => {
    const one = parse("hea120 6m x2");
    const many = parse("hea120 6m x2 + hea120 6m x5");
    const diff = diffLines(one, many);
    expect(diff.quantity.from).toBe(2);
    expect(diff.quantity.to).toBe(2);
    expect(diff.quantity.delta).toBe(0);
  });

  it("gives no delta and no percentage for a line that computes nothing", () => {
    const good = parse("hea120 6m x2");
    const bad = parse("notaprofile 6m");
    expect(bad.totalKg).toBeNull();

    const diff = diffLines(bad, good);
    expect(diff.weight.delta).toBeNull();
    expect(diff.weight.percent).toBeNull();
    expect(diff.cost.delta).toBeNull();
    expect(diff.cost.percent).toBeNull();
    expect(diff.identical).toBe(false);
  });

  it("gives no delta when both sides compute nothing", () => {
    const diff = diffLines(parse("notaprofile 6m"), parse("notaprofile 8m"));
    expect(diff.weight.from).toBeNull();
    expect(diff.weight.to).toBeNull();
    expect(diff.weight.delta).toBeNull();
    expect(diff.weight.percent).toBeNull();
  });
});

describe("diffFields", () => {
  const older = {
    name: "Bridge deck",
    client: "City Works",
    dueDate: "2026-11-01",
    marginPercent: 20,
    notes: "two lifts",
  };
  const newer = {
    name: "Bridge deck",
    client: "City Works",
    dueDate: "2026-11-08",
    marginPercent: 25,
    status: "open",
  };

  it("marks each field of two project versions", () => {
    const entries = diffFields(older, newer);
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));
    expect(byKey.get("name")?.change).toBe("same");
    expect(byKey.get("client")?.change).toBe("same");
    expect(byKey.get("dueDate")?.change).toBe("changed");
    expect(byKey.get("marginPercent")?.change).toBe("changed");
    expect(byKey.get("notes")?.change).toBe("removed");
    expect(byKey.get("status")?.change).toBe("added");
    expect(byKey.get("status")?.from).toBeUndefined();
    expect(byKey.get("status")?.to).toBe("open");
    expect(byKey.get("notes")?.from).toBe("two lifts");
    expect(byKey.get("notes")?.to).toBeUndefined();
  });

  it("compares only the keys it is given", () => {
    const entries = diffFields(older, newer, ["name", "marginPercent"]);
    expect(entries.map((entry) => entry.key)).toEqual(["name", "marginPercent"]);
    expect(entries.map((entry) => entry.change)).toEqual(["same", "changed"]);
  });

  it("reads objects and arrays by their content", () => {
    const a = { costs: [{ amount: 10, label: "paint" }], tags: ["a", "b"] };
    const b = { costs: [{ amount: 10, label: "paint" }], tags: ["a", "b"] };
    const c = { costs: [{ amount: 12, label: "paint" }], tags: ["a", "b"] };
    expect(diffFields(a, b).every((entry) => entry.change === "same")).toBe(true);
    expect(diffFields(a, c).find((entry) => entry.key === "costs")?.change).toBe("changed");
  });
});
