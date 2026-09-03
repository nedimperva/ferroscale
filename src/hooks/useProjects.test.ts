// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjects } from "./useProjects";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

function calc(label: string, kg: number): { input: CalculationInput; result: CalculationResult } {
  return {
    input: {
      profileId: "square_hollow",
      gradeId: "steel-s235jr",
      quantity: 1,
      length: { value: 2, unit: "m" },
      manualDimensions: {
        side: { value: 80, unit: "mm" },
        wallThickness: { value: 4, unit: "mm" },
      },
    } as unknown as CalculationInput,
    result: {
      profileLabel: label,
      quantity: 1,
      unitWeightKg: kg,
      totalWeightKg: kg,
      grandTotalAmount: kg * 2.5,
      currency: "EUR",
    } as unknown as CalculationResult,
  };
}

describe("useProjects — writes report what actually happened", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * The bug this covers: the flag was assigned inside a `setState` updater,
   * which React defers, so a project created and added to in the same tick
   * reported failure while the calculation landed.
   */
  it("reports success when adding to a project created moments earlier", () => {
    const { result } = renderHook(() => useProjects());

    let added = false;
    act(() => {
      const project = result.current.createProject("Halle 4");
      const { input, result: res } = calc("SHS 80x80x4", 18.84);
      added = result.current.addCalculation(project.id, input, res);
    });

    expect(added).toBe(true);
    expect(result.current.projects[0].calculations).toHaveLength(1);
  });

  it("refuses an unknown project, and a duplicate calculation", () => {
    const { result } = renderHook(() => useProjects());
    const { input, result: res } = calc("SHS 80x80x4", 18.84);

    let unknown = true;
    act(() => {
      unknown = result.current.addCalculation("not-a-project", input, res);
    });
    expect(unknown).toBe(false);

    let first = false;
    let second = true;
    act(() => {
      const project = result.current.createProject("Halle 4");
      first = result.current.addCalculation(project.id, input, res);
      second = result.current.addCalculation(project.id, input, res);
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(result.current.projects[0].calculations).toHaveLength(1);
  });

  it("keeps the write and the render in step across a remount", () => {
    const first = renderHook(() => useProjects());
    act(() => {
      const project = first.result.current.createProject("Halle 4");
      const { input, result: res } = calc("SHS 80x80x4", 18.84);
      first.result.current.addCalculation(project.id, input, res);
    });
    first.unmount();

    const second = renderHook(() => useProjects());
    expect(second.result.current.projects).toHaveLength(1);
    expect(second.result.current.projects[0].calculations).toHaveLength(1);
  });
});
