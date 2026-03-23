import { describe, expect, it } from "vitest";
import { getInitialUndoableState, undoableReducer } from "./useCalculator";

describe("undoableReducer", () => {
  it("applies bulk manual dimensions as a single undoable action", () => {
    const initial = getInitialUndoableState();
    const withProfile = undoableReducer(initial, { type: "SET_PROFILE", profileId: "rectangular_tube" });
    const withBulkDimensions = undoableReducer(withProfile, {
      type: "SET_DIMENSIONS_MM",
      dimensions: { width: 120, height: 80, wallThickness: 4 },
    });

    expect(withBulkDimensions.present.manualDimensions.width?.value).toBe(120);
    expect(withBulkDimensions.present.manualDimensions.height?.value).toBe(80);
    expect(withBulkDimensions.present.manualDimensions.wallThickness?.value).toBe(4);

    const undone = undoableReducer(withBulkDimensions, { type: "UNDO" });

    expect(undone.present).toEqual(withProfile.present);
    expect(undone.future[0]).toEqual(withBulkDimensions.present);
  });

  it("preserves the current display unit when bulk mm dimensions are applied", () => {
    const initial = getInitialUndoableState();
    const withProfile = undoableReducer(initial, { type: "SET_PROFILE", profileId: "pipe" });
    const withUnit = undoableReducer(withProfile, { type: "SET_DIMENSION_UNIT", key: "outerDiameter", unit: "cm" });
    const withBulkDimensions = undoableReducer(withUnit, {
      type: "SET_DIMENSIONS_MM",
      dimensions: { outerDiameter: 60.3, wallThickness: 3.2 },
    });

    expect(withBulkDimensions.present.manualDimensions.outerDiameter?.unit).toBe("cm");
    expect(withBulkDimensions.present.manualDimensions.outerDiameter?.value).toBeCloseTo(6.03, 6);
    expect(withBulkDimensions.present.manualDimensions.wallThickness?.value).toBe(3.2);
  });
});
