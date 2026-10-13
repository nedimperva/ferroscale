import { describe, expect, it } from "vitest";
import {
  filterHistory,
  groupHistoryByDay,
  historyDay,
  oftenLines,
  pushHistoryEntry,
  REFINE_WINDOW_MS,
  stampMissingTimes,
  todaysHistory,
} from "./history";

const NOON = new Date(2026, 9, 13, 12, 0, 0).getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const empty = { items: [], times: {}, counts: {} };

describe("pushHistoryEntry", () => {
  it("puts the newest line first and stamps it", () => {
    const s1 = pushHistoryEntry(empty, "hea120 6m", NOON);
    const s2 = pushHistoryEntry(s1, "shs40x40x3 6m", NOON + HOUR);
    expect(s2.items).toEqual(["shs40x40x3 6m", "hea120 6m"]);
    expect(s2.times["shs40x40x3 6m"]).toBe(NOON + HOUR);
  });

  it("treats spacing and capitals as the same line", () => {
    const s1 = pushHistoryEntry(empty, "hea120 6m", NOON);
    const s2 = pushHistoryEntry(s1, "upn100 3m", NOON + HOUR);
    const s3 = pushHistoryEntry(s2, "  HEA120   6m ", NOON + 2 * HOUR);
    expect(s3.items).toEqual(["HEA120 6m", "upn100 3m"]);
    expect(Object.keys(s3.times).sort()).toEqual(["HEA120 6m", "upn100 3m"]);
  });

  it("lets a line that finishes the previous one replace it", () => {
    const s1 = pushHistoryEntry(empty, "hea120 6m", NOON);
    const s2 = pushHistoryEntry(s1, "hea120 6m x2", NOON + 30_000);
    const s3 = pushHistoryEntry(s2, "hea120 6m x2 s355", NOON + 60_000);
    expect(s3.items).toEqual(["hea120 6m x2 s355"]);
  });

  it("keeps both once the refine window has passed", () => {
    const s1 = pushHistoryEntry(empty, "hea120 6m", NOON);
    const s2 = pushHistoryEntry(s1, "hea120 6m x2", NOON + REFINE_WINDOW_MS + 1);
    expect(s2.items).toEqual(["hea120 6m x2", "hea120 6m"]);
  });

  it("keeps a different length as its own line", () => {
    const s1 = pushHistoryEntry(empty, "hea120 6m", NOON);
    const s2 = pushHistoryEntry(s1, "hea120 4m", NOON + 10_000);
    expect(s2.items).toEqual(["hea120 4m", "hea120 6m"]);
  });

  it("does not treat a longer number as a refinement", () => {
    const s1 = pushHistoryEntry(empty, "hea120 6", NOON);
    const s2 = pushHistoryEntry(s1, "hea120 60", NOON + 10_000);
    expect(s2.items).toEqual(["hea120 60", "hea120 6"]);
  });

  it("caps the list and drops the times of lines that fall off", () => {
    let s = { items: [] as string[], times: {}, counts: {} };
    for (let i = 0; i < 5; i++) s = pushHistoryEntry(s, `fl${i}0x5 1m`, NOON + i * HOUR, 3);
    expect(s.items).toEqual(["fl40x5 1m", "fl30x5 1m", "fl20x5 1m"]);
    expect(Object.keys(s.times)).toHaveLength(3);
  });

  it("counts every time a line is logged, whatever its spacing", () => {
    let s = pushHistoryEntry(empty, "hea120 6m", NOON);
    s = pushHistoryEntry(s, "upn100 3m", NOON + HOUR);
    s = pushHistoryEntry(s, "HEA120  6m", NOON + 2 * HOUR);
    expect(s.counts).toEqual({ "HEA120 6m": 2, "upn100 3m": 1 });
  });

  it("keeps a line used before when a longer one follows it", () => {
    let s = pushHistoryEntry(empty, "hea120 6m", NOON);
    s = pushHistoryEntry(s, "hea120 6m", NOON + HOUR);
    s = pushHistoryEntry(s, "hea120 6m x2", NOON + HOUR + 10_000);
    expect(s.items).toEqual(["hea120 6m x2", "hea120 6m"]);
    expect(s.counts["hea120 6m"]).toBe(2);
  });

  it("ignores an empty line", () => {
    expect(pushHistoryEntry(empty, "   ", NOON)).toBe(empty);
  });
});

describe("stampMissingTimes", () => {
  it("stamps lines without a time and keeps the ones that have one", () => {
    const times = stampMissingTimes({ a: NOON - DAY, gone: 1 }, ["a", "b"], NOON);
    expect(times).toEqual({ a: NOON - DAY, b: NOON });
  });
});

describe("grouping by day", () => {
  it("buckets by the local calendar", () => {
    expect(historyDay(NOON - HOUR, NOON)).toBe("today");
    expect(historyDay(NOON - DAY, NOON)).toBe("yesterday");
    expect(historyDay(NOON - 3 * DAY, NOON)).toBe("week");
    expect(historyDay(NOON - 10 * DAY, NOON)).toBe("earlier");
    expect(historyDay(undefined, NOON)).toBe("earlier");
  });

  it("keeps the list order inside each group and leaves empty groups out", () => {
    const items = ["a", "b", "c", "d"];
    const times = { a: NOON, b: NOON - HOUR, c: NOON - 20 * DAY, d: NOON - 21 * DAY };
    expect(groupHistoryByDay(items, times, NOON)).toEqual([
      { day: "today", items: ["a", "b"] },
      { day: "earlier", items: ["c", "d"] },
    ]);
    expect(todaysHistory(items, times, NOON)).toEqual(["a", "b"]);
  });
});

describe("oftenLines", () => {
  it("lists lines used twice or more, most used first, newest on a tie", () => {
    const items = ["a", "b", "c", "d"];
    expect(oftenLines(items, { a: 2, b: 5, c: 1, d: 2 })).toEqual(["b", "a", "d"]);
    expect(oftenLines(items, { a: 2, b: 5, d: 2 }, 2)).toEqual(["b", "a"]);
  });
});

describe("filterHistory", () => {
  const items = ["hea120 6m x2", "shs 40x40x3 6m", "UPN100 3m s355"];

  it("matches every word in any order and case", () => {
    expect(filterHistory(items, "6m hea")).toEqual(["hea120 6m x2"]);
    expect(filterHistory(items, "s355")).toEqual(["UPN100 3m s355"]);
    expect(filterHistory(items, "upn 100")).toEqual(["UPN100 3m s355"]);
  });

  it("finds a size whatever the spacing around it", () => {
    expect(filterHistory(items, "shs40x40")).toEqual(["shs 40x40x3 6m"]);
  });

  it("returns everything for an empty search", () => {
    expect(filterHistory(items, "  ")).toEqual(items);
  });
});
