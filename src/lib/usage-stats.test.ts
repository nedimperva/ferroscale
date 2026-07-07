import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cmdParse } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { buildUsageSource, recordCommandUsage } from "./usage-stats";

const mockStorage = new Map<string, string>();

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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
  defaultLengthUnit: "mm",
};

function record(query: string) {
  recordCommandUsage(cmdParse(query, SETTINGS), query);
}

describe("recordCommandUsage / buildUsageSource", () => {
  it("buckets tokens per profile family", () => {
    record("shs45x45x4 6m x3 s355");
    record("hea120 4m");
    const usage = buildUsageSource();
    expect(usage.topSizes("shs")).toEqual(["45x45x4"]);
    expect(usage.topSizes("beam")).toEqual(["120"]);
    expect(usage.topLengths("shs")).toEqual(["6m"]);
    expect(usage.topLengths("beam")).toEqual(["4m"]);
    expect(usage.topQuantities("shs")).toEqual(["x3"]);
    expect(usage.topQuantities("beam")).toEqual([]);
    expect(usage.topGradeIds("shs")).toEqual(["steel-s355jr"]);
    // default grade (not typed) is not a habit
    expect(usage.topGradeIds("beam")).toEqual([]);
  });

  it("keeps bare-number lengths as typed (default unit)", () => {
    record("rnd20 4500");
    expect(buildUsageSource().topLengths("round")).toEqual(["4500"]);
  });

  it("frequency beats a single more recent use", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00Z"));
    record("shs40x40x3 6m");
    record("shs40x40x3 6m");
    record("shs40x40x3 6m");
    vi.setSystemTime(new Date("2026-07-02T10:00:00Z"));
    record("shs45x45x4 6m");
    expect(buildUsageSource().topSizes("shs")).toEqual(["40x40x3", "45x45x4"]);
  });

  it("stale habits decay: an old heavy habit loses to a fresh regular one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    for (let i = 0; i < 5; i++) record("shs40x40x3 6m");
    vi.setSystemTime(new Date("2026-07-01T10:00:00Z"));
    record("shs45x45x4 6m");
    record("shs45x45x4 6m");
    expect(buildUsageSource().topSizes("shs")[0]).toBe("45x45x4");
  });

  it("records recent queries newest-first, deduped", () => {
    record("hea120 6m");
    record("ipe200 4m");
    record("hea120 6m");
    expect(buildUsageSource().recentQueries()).toEqual(["hea120 6m", "ipe200 4m"]);
  });

  it("ignores invalid queries and does not record a separate length for sheet-like sizes", () => {
    record("zzz nonsense");
    record("plt1500x3000x3");
    const usage = buildUsageSource();
    expect(usage.recentQueries()).toEqual(["plt1500x3000x3"]);
    expect(usage.topSizes("panel")).toEqual(["1500x3000x3"]);
    expect(usage.topLengths("panel")).toEqual([]);
  });
});
