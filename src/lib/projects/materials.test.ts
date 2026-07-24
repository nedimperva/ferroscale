import { describe, expect, it } from "vitest";
import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import { computeProjectMaterials } from "./materials";

function calc(
  shortLabel: string,
  gradeLabel: string,
  lengthMm: number,
  quantity: number,
  totalWeightKg: number,
  grandTotalAmount: number,
): ProjectCalculation {
  return {
    id: `${shortLabel}-${quantity}-${grandTotalAmount}`,
    timestamp: "2026-07-01T00:00:00.000Z",
    input: {} as ProjectCalculation["input"],
    result: {
      gradeLabel,
      lengthMm,
      quantity,
      totalWeightKg,
      grandTotalAmount,
      currency: "EUR",
    } as unknown as ProjectCalculation["result"],
    normalizedProfile: { shortLabel } as ProjectCalculation["normalizedProfile"],
  };
}

function project(calculations: ProjectCalculation[]): Project {
  return {
    id: "p1",
    name: "Test",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    calculations,
  };
}

describe("computeProjectMaterials", () => {
  it("groups same profile+grade across different lengths and sums totals", () => {
    const groups = computeProjectMaterials(
      project([
        calc("HEA 120 · L 6000 mm", "S235JR", 6000, 2, 320, 400),
        calc("HEA 120 · L 3000 mm", "S235JR", 3000, 1, 80, 100),
      ]),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("HEA 120");
    expect(groups[0].pieceCount).toBe(3);
    expect(groups[0].totalLengthM).toBe(6 * 2 + 3 * 1);
    expect(groups[0].totalWeightKg).toBe(400);
    expect(groups[0].totalCost).toBe(500);
  });

  it("keeps different grades separate", () => {
    const groups = computeProjectMaterials(
      project([
        calc("HEA 120 · L 6000 mm", "S235JR", 6000, 1, 160, 200),
        calc("HEA 120 · L 6000 mm", "S355", 6000, 1, 160, 220),
      ]),
    );
    expect(groups).toHaveLength(2);
  });

  it("sorts heaviest group first", () => {
    const groups = computeProjectMaterials(
      project([
        calc("RND 20 · L 6000 mm", "S235JR", 6000, 1, 15, 20),
        calc("HEA 200 · L 6000 mm", "S235JR", 6000, 1, 200, 260),
      ]),
    );
    expect(groups[0].label).toBe("HEA 200");
    expect(groups[1].label).toBe("RND 20");
  });

  it("expands templates by their quantity multiplier", () => {
    const templateCalc: ProjectCalculation = {
      id: "tmpl",
      timestamp: "2026-07-01T00:00:00.000Z",
      input: {} as ProjectCalculation["input"],
      result: { gradeLabel: "Mixed", lengthMm: 0, quantity: 1, totalWeightKg: 0, grandTotalAmount: 0, currency: "EUR" } as unknown as ProjectCalculation["result"],
      normalizedProfile: { shortLabel: "Gate" } as ProjectCalculation["normalizedProfile"],
      templateName: "Gate",
      quantityMultiplier: 3,
      templateParts: [
        {
          id: "part1",
          name: "post",
          input: {} as ProjectCalculation["input"],
          result: { gradeLabel: "S235JR", lengthMm: 2000, quantity: 2, totalWeightKg: 30, grandTotalAmount: 40, currency: "EUR" } as unknown as ProjectCalculation["result"],
          normalizedProfile: { shortLabel: "SHS 40x40x3 · L 2000 mm" } as ProjectCalculation["normalizedProfile"],
        },
      ],
    };
    const groups = computeProjectMaterials(project([templateCalc]));
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("SHS 40x40x3");
    expect(groups[0].pieceCount).toBe(2 * 3);
    expect(groups[0].totalWeightKg).toBe(30 * 3);
    expect(groups[0].totalCost).toBe(40 * 3);
  });

  it("returns [] for an empty project", () => {
    expect(computeProjectMaterials(project([]))).toEqual([]);
  });
});
