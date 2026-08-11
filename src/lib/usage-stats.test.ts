import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cmdParse } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import {
  buildUsageSource,
  mergeRemoteUsageStats,
  recordCommandUsage,
  usageStatsVersionStore,
  USAGE_PEERS_STORAGE_KEY,
  USAGE_STORAGE_KEY,
} from "./usage-stats";

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

  it("collapses a refinement chain into the latest, most complete form", () => {
    // Building one calculation across idle pauses must not leave a trail of
    // near-duplicate recents (the reported bug).
    record("hea120 6m");
    record("hea120 6m x2");
    record("hea120 6m x2 s355");
    expect(buildUsageSource().recentQueries()).toEqual(["hea120 6m x2 s355"]);
  });

  it("keeps genuinely different queries as separate recents", () => {
    record("hea120 6m x2 s355");
    record("rnd20 6m");
    const recents = buildUsageSource().recentQueries();
    expect(recents).toHaveLength(2);
    expect(recents[0]).toBe("rnd20 6m");
    expect(recents).toContain("hea120 6m x2 s355");
  });

  it("supersedes a stored entry when the user backs off to a shorter prefix", () => {
    record("hea120 6m x2 s355");
    record("hea120 6m");
    expect(buildUsageSource().recentQueries()).toEqual(["hea120 6m"]);
  });
});

describe("habits across devices", () => {
  it("sums a peer's counts and keeps the later touch", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00Z"));
    record("shs40x40x3 6m");

    mergeRemoteUsageStats("device-b", "2026-07-02T10:00:00.000Z", {
      queries: [{ q: "shs45x45x4 6m", n: 4, t: Date.parse("2026-07-02T10:00:00Z") }],
      buckets: {
        "size:shs": { "45x45x4": { n: 4, t: Date.parse("2026-07-02T10:00:00Z") } },
      },
    });

    const usage = buildUsageSource();
    // Four uses on the other device beat the one here.
    expect(usage.topSizes("shs")).toEqual(["45x45x4", "40x40x3"]);
    // ...and its recent line is offered here too, newest first.
    expect(usage.recentQueries()).toEqual(["shs45x45x4 6m", "shs40x40x3 6m"]);
  });

  it("adds one device's tally to another's for the same value", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00Z"));
    record("shs40x40x3 6m");
    mergeRemoteUsageStats("device-b", "2026-07-01T11:00:00.000Z", {
      queries: [],
      buckets: { "size:shs": { "40x40x3": { n: 6, t: Date.parse("2026-07-01T11:00:00Z") } } },
    });

    const own = JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || "{}");
    // The device's own record still holds only what it learned itself — that's
    // what keeps a pull from counting the same use twice.
    expect(own.buckets["size:shs"]["40x40x3"].n).toBe(1);
    // The reader sees the sum.
    expect(buildUsageSource().topSizes("shs")).toEqual(["40x40x3"]);
  });

  it("ignores a peer record that is not newer than the one already held", () => {
    const first = mergeRemoteUsageStats("device-b", "2026-07-02T10:00:00.000Z", {
      queries: [],
      buckets: { "size:shs": { "45x45x4": { n: 4, t: 1 } } },
    });
    const second = mergeRemoteUsageStats("device-b", "2026-07-02T10:00:00.000Z", {
      queries: [],
      buckets: { "size:shs": { "45x45x4": { n: 99, t: 1 } } },
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(buildUsageSource().topSizes("shs")).toEqual(["45x45x4"]);
  });

  it("rejects a malformed peer payload rather than poisoning the source", () => {
    expect(mergeRemoteUsageStats("device-b", "2026-07-02T10:00:00.000Z", null)).toBe(false);
    expect(mergeRemoteUsageStats("", "2026-07-02T10:00:00.000Z", { queries: [], buckets: {} })).toBe(
      false,
    );
    expect(localStorage.getItem(USAGE_PEERS_STORAGE_KEY)).toBeNull();
  });

  it("leaves a single-device user's ordering exactly as it was", () => {
    record("hea120 6m");
    record("ipe200 4m");
    expect(buildUsageSource().recentQueries()).toEqual(["ipe200 4m", "hea120 6m"]);
  });

  it("bumps the version store so readers rebuild", () => {
    const before = usageStatsVersionStore.getSnapshot();
    record("hea120 6m");
    expect(usageStatsVersionStore.getSnapshot()).toBeGreaterThan(before);

    const afterRecord = usageStatsVersionStore.getSnapshot();
    mergeRemoteUsageStats("device-b", "2026-07-02T10:00:00.000Z", { queries: [], buckets: {} });
    expect(usageStatsVersionStore.getSnapshot()).toBeGreaterThan(afterRecord);
  });
});
