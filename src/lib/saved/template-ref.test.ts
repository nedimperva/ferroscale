import { describe, expect, it } from "vitest";
import { cmdParse } from "@ferroscale/metal-core";
import type { CommandParserSettings, CommandPricing } from "@ferroscale/metal-core";
import {
  expandTemplateReference,
  findTemplateSource,
  parseTemplateRef,
  slugifyName,
  stripLengthToken,
  type TemplateSource,
} from "./template-ref";

const PRICING: CommandPricing = {
  priceBasis: "weight",
  priceUnit: "kg",
  unitPrice: 1.2,
  currency: "EUR",
  wastePercent: 0,
  includeVat: false,
  vatPercent: 0,
};

const SETTINGS: CommandParserSettings = {
  pricing: PRICING,
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

const OPTS = {
  defaultUnit: "m" as const,
  defaultGradeId: "steel-s235jr",
  defaultPricing: PRICING,
};

/** Build a saved source by parsing a real query through the engine. */
function source(name: string, query: string, updatedAt?: string): TemplateSource {
  const p = cmdParse(query, SETTINGS);
  if (!p.calc) throw new Error(`fixture query did not parse: ${query}`);
  return { name, input: p.calc.input, updatedAt };
}

describe("slugifyName", () => {
  it("lowercases and hyphenates non-alphanumerics", () => {
    expect(slugifyName("Gate frame #2")).toBe("gate-frame-2");
    expect(slugifyName("  Balcony  Railing ")).toBe("balcony-railing");
  });
});

describe("parseTemplateRef", () => {
  it("parses a bare reference and a multiplier", () => {
    expect(parseTemplateRef("#gate")).toEqual({ slug: "gate", multiplier: null });
    expect(parseTemplateRef("#gate x3")).toEqual({ slug: "gate", multiplier: 3 });
    expect(parseTemplateRef("#Gate-Frame")).toEqual({ slug: "gate-frame", multiplier: null });
  });

  it("rejects non-references and bad multipliers", () => {
    expect(parseTemplateRef("hea120 6m")).toBeNull();
    expect(parseTemplateRef("#gate extra")).toBeNull();
    expect(parseTemplateRef("#")).toBeNull();
    expect(parseTemplateRef("#gate x0")).toBeNull();
  });
});

describe("findTemplateSource", () => {
  const a = source("gate", "hea120 6m");
  const b = source("gate frame", "hea140 6m", "2026-01-01T00:00:00Z");
  const c = source("gate frame extended", "hea160 6m", "2026-06-01T00:00:00Z");

  it("prefers an exact slug match", () => {
    expect(findTemplateSource("gate", [a, b, c])).toBe(a);
  });

  it("falls back to the freshest prefix match", () => {
    // "gate-fram" is a prefix of both but an exact match of neither.
    expect(findTemplateSource("gate-fram", [b, c])).toBe(c);
  });

  it("returns undefined when nothing matches", () => {
    expect(findTemplateSource("balcony", [a, b, c])).toBeUndefined();
  });
});

describe("expandTemplateReference", () => {
  const sources = [source("gate", "hea120 6m x2")];

  it("expands a bare reference to the entry's canonical query", () => {
    expect(expandTemplateReference("#gate", sources, OPTS)).toEqual({
      query: "hea120 6m x2",
      name: "gate",
    });
  });

  it("overrides quantity with the multiplier", () => {
    expect(expandTemplateReference("#gate x3", sources, OPTS)?.query).toBe("hea120 6m x3");
  });

  it("drops the qty token when multiplier is 1", () => {
    expect(expandTemplateReference("#gate x1", sources, OPTS)?.query).toBe("hea120 6m");
  });

  it("returns null for an unknown reference or a non-reference query", () => {
    expect(expandTemplateReference("#nope", sources, OPTS)).toBeNull();
    expect(expandTemplateReference("hea120 6m", sources, OPTS)).toBeNull();
  });

  it("drops the length for a length-parametric template", () => {
    const parametric = [{ ...source("gate", "hea120 6m x2"), variableParam: "length" as const }];
    expect(expandTemplateReference("#gate", parametric, OPTS)?.query).toBe("hea120 x2");
    // multiplier still applies, length still dropped
    expect(expandTemplateReference("#gate x4", parametric, OPTS)?.query).toBe("hea120 x4");
  });
});

describe("stripLengthToken", () => {
  it("removes the length token, keeping profile, quantity, and grade", () => {
    expect(stripLengthToken("hea120 6m x2")).toBe("hea120 x2");
    expect(stripLengthToken("rnd20 3m s355")).toBe("rnd20 s355");
  });

  it("leaves a query without a separate length token unchanged", () => {
    expect(stripLengthToken("hea120 x2")).toBe("hea120 x2");
  });
});
