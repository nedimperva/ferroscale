import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMN_LAYOUT,
  clampColumnPairPercents,
  getAvailableColumnPanelIds,
  getMaxColumnsForWidth,
  getMinColumnLayoutWidth,
  normalizeColumnLayoutState,
  rebalanceColumnWidths,
} from "./column-layout";

describe("normalizeColumnLayoutState", () => {
  it("drops duplicate panels and normalizes width shares", () => {
    const state = normalizeColumnLayoutState({
      enabled: true,
      columns: [
        { id: "calc", panelId: "calculator", widthPercent: 60 },
        { id: "saved", panelId: "saved" },
        { id: "dup-calc", panelId: "calculator", widthPercent: 40 },
        { id: "result", panelId: "result" },
      ],
    });

    expect(state.enabled).toBe(true);
    expect(state.columns.map((column) => column.id)).toEqual(["calc", "saved", "result"]);
    expect(state.columns.map((column) => column.panelId)).toEqual(["calculator", "saved", "result"]);
    expect(state.columns[0].widthPercent).toBeCloseTo(60, 6);
    expect(state.columns[1].widthPercent).toBeCloseTo(20, 6);
    expect(state.columns[2].widthPercent).toBeCloseTo(20, 6);
    expect(
      state.columns.reduce((sum, column) => sum + (column.widthPercent ?? 0), 0),
    ).toBeCloseTo(100, 6);
  });

  it("falls back to the default layout when persisted columns are missing", () => {
    const state = normalizeColumnLayoutState({
      enabled: true,
      columns: [],
    });

    expect(state.enabled).toBe(true);
    expect(state.columns.map((column) => column.id)).toEqual(
      DEFAULT_COLUMN_LAYOUT.columns.map((column) => column.id),
    );
    expect(state.columns.map((column) => column.panelId)).toEqual(
      DEFAULT_COLUMN_LAYOUT.columns.map((column) => column.panelId),
    );
    expect(
      state.columns.reduce((sum, column) => sum + (column.widthPercent ?? 0), 0),
    ).toBeCloseTo(100, 6);
  });
});

describe("rebalanceColumnWidths", () => {
  it("assigns equal normalized widths", () => {
    const columns = rebalanceColumnWidths([
      { id: "a", panelId: "calculator" },
      { id: "b", panelId: "result" },
      { id: "c", panelId: "saved" },
    ]);

    expect(columns[0].widthPercent).toBeCloseTo(33.333333, 6);
    expect(columns[1].widthPercent).toBeCloseTo(33.333333, 6);
    expect(columns[2].widthPercent).toBeCloseTo(33.333334, 6);
    expect(
      columns.reduce((sum, column) => sum + (column.widthPercent ?? 0), 0),
    ).toBeCloseTo(100, 6);
  });
});

describe("getAvailableColumnPanelIds", () => {
  it("omits panels already used elsewhere but keeps the current column option", () => {
    const columns = [
      { id: "calc", panelId: "calculator" as const },
      { id: "saved", panelId: "saved" as const },
      { id: "result", panelId: "result" as const },
    ];

    expect(getAvailableColumnPanelIds(columns)).toEqual(["projects", "settings", "compare", "specs"]);
    expect(getAvailableColumnPanelIds(columns, "saved")).toEqual([
      "saved",
      "projects",
      "settings",
      "compare",
      "specs",
    ]);
  });
});

describe("getMaxColumnsForWidth", () => {
  it("uses the shared min width and handle size for fit thresholds", () => {
    expect(getMaxColumnsForWidth(getMinColumnLayoutWidth(2) - 1)).toBe(1);
    expect(getMaxColumnsForWidth(getMinColumnLayoutWidth(2))).toBe(2);
    expect(getMaxColumnsForWidth(getMinColumnLayoutWidth(3))).toBe(3);
    expect(getMaxColumnsForWidth(getMinColumnLayoutWidth(4))).toBe(4);
    expect(getMaxColumnsForWidth(10000)).toBe(4);
  });
});

describe("clampColumnPairPercents", () => {
  it("clamps pointer and keyboard resizing against the shared minimum width", () => {
    const leftClamped = clampColumnPairPercents({
      leftPx: 400,
      rightPx: 400,
      leftPercent: 50,
      rightPercent: 50,
      nextLeftPx: 100,
    });

    const rightClamped = clampColumnPairPercents({
      leftPx: 400,
      rightPx: 400,
      leftPercent: 50,
      rightPercent: 50,
      nextLeftPx: 700,
    });

    expect(leftClamped.left).toBeCloseTo(45, 6);
    expect(leftClamped.right).toBeCloseTo(55, 6);
    expect(rightClamped.left).toBeCloseTo(55, 6);
    expect(rightClamped.right).toBeCloseTo(45, 6);
  });

  it("falls back to an even split when the combined width is too small", () => {
    const result = clampColumnPairPercents({
      leftPx: 300,
      rightPx: 300,
      leftPercent: 50,
      rightPercent: 50,
      nextLeftPx: 540,
    });

    expect(result.left).toBeCloseTo(50, 6);
    expect(result.right).toBeCloseTo(50, 6);
  });
});
