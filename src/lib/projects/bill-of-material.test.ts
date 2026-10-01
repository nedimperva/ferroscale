import { describe, expect, it } from "vitest";
import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import { projectBillOfMaterial } from "./bill-of-material";
import { computeProjectProcurementSummary } from "./cutting";

type Dims = Record<string, number>;

function calc(
  id: string,
  profileId: string,
  label: string,
  opts: { dims?: Dims; lengthMm: number; qty: number; kg: number; amount: number; grade?: string; assembly?: string },
): ProjectCalculation {
  const manualDimensions = Object.fromEntries(
    Object.entries(opts.dims ?? {}).map(([k, v]) => [k, { value: v, unit: "mm" }]),
  );
  return {
    id,
    timestamp: "2026-10-01T10:00:00.000Z",
    assembly: opts.assembly,
    input: {
      profileId,
      manualDimensions,
      length: { value: opts.lengthMm, unit: "mm" },
      quantity: opts.qty,
    },
    result: {
      profileId,
      profileLabel: label,
      gradeLabel: opts.grade ?? "S235JR",
      lengthMm: opts.lengthMm,
      quantity: opts.qty,
      unitWeightKg: opts.kg / opts.qty,
      totalWeightKg: opts.kg,
      grandTotalAmount: opts.amount,
    },
  } as unknown as ProjectCalculation;
}

function project(calculations: ProjectCalculation[]): Project {
  return {
    id: "p",
    name: "Stair",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    calculations,
  };
}

const angle = { legA: 50, legB: 50, thickness: 5 };

describe("projectBillOfMaterial", () => {
  it("puts cuts of one section and grade on one stock line, in first-seen order", () => {
    const lines = projectBillOfMaterial(
      project([
        calc("a", "angle", "Angle", { dims: angle, lengthMm: 250, qty: 28, kg: 26.4, amount: 35.64, assembly: "Treads" }),
        calc("b", "flat_bar", "Flat", { dims: { width: 40, thickness: 8 }, lengthMm: 4400, qty: 4, kg: 44.2, amount: 59.67 }),
        calc("c", "angle", "Angle", { dims: angle, lengthMm: 1200, qty: 2, kg: 9.05, amount: 12.22, assembly: "Landing" }),
      ]),
    );
    expect(lines.map((l) => l.name)).toEqual(["Angle 50x50x5", "Flat Bar 40x8"]);
    const [l50] = lines;
    expect(l50.cuts.map((c) => [c.cut, c.pieces, c.assembly])).toEqual([
      ["250 mm", 28, "Treads"],
      ["1200 mm", 2, "Landing"],
    ]);
    expect(l50.pieces).toBe(30);
    expect(l50.lengthM).toBeCloseTo(9.4, 6);
    expect(l50.weightKg).toBeCloseTo(35.45, 6);
    expect(l50.amount).toBeCloseTo(47.86, 6);
  });

  it("keeps grades apart — S235 and S355 of one size are bought separately", () => {
    const lines = projectBillOfMaterial(
      project([
        calc("a", "angle", "Angle", { dims: angle, lengthMm: 1000, qty: 1, kg: 3.77, amount: 5 }),
        calc("b", "angle", "Angle", { dims: angle, lengthMm: 1000, qty: 1, kg: 3.77, amount: 6, grade: "S355JR" }),
      ]),
    );
    expect(lines.map((l) => l.gradeLabel)).toEqual(["S235JR", "S355JR"]);
  });

  it("groups plate by thickness whatever its size, and sums area", () => {
    const lines = projectBillOfMaterial(
      project([
        calc("a", "chequered_plate", "Chequered", { dims: { width: 300, thickness: 5 }, lengthMm: 1000, qty: 14, kg: 178.1, amount: 276.06 }),
        calc("b", "chequered_plate", "Chequered", { dims: { width: 1200, thickness: 5 }, lengthMm: 1000, qty: 1, kg: 50.9, amount: 78.9 }),
        calc("c", "plate", "Plate", { dims: { width: 200, thickness: 5 }, lengthMm: 200, qty: 4, kg: 6.3, amount: 9 }),
      ]),
    );
    expect(lines.map((l) => l.name)).toEqual(["Chequered plate 5 mm", "Plate 5 mm"]);
    expect(lines[0].cuts.map((c) => c.cut)).toEqual(["300 × 1000 mm", "1200 × 1000 mm"]);
    expect(lines[0].areaM2).toBeCloseTo(5.4, 6);
    expect(lines[0].lengthM).toBe(0);
  });

  it("opens an inserted assembly into its parts, tagged with the assembly", () => {
    const upn = calc("u", "angle", "Angle", { dims: angle, lengthMm: 600, qty: 3, kg: 6.8, amount: 9 });
    const entry = {
      ...calc("t", "angle", "Angle", { dims: angle, lengthMm: 600, qty: 3, kg: 6.8, amount: 9 }),
      templateName: "Bracket",
      templateParts: [
        { id: "p1", name: "leg", input: upn.input, result: upn.result, normalizedProfile: upn.normalizedProfile },
        {
          id: "p2",
          name: "base",
          ...(() => {
            const plate = calc("x", "plate", "Plate", { dims: { width: 150, thickness: 10 }, lengthMm: 150, qty: 3, kg: 5.3, amount: 8 });
            return { input: plate.input, result: plate.result, normalizedProfile: plate.normalizedProfile };
          })(),
        },
      ],
    } as ProjectCalculation;
    const lines = projectBillOfMaterial(project([entry]));
    expect(lines.map((l) => l.name)).toEqual(["Angle 50x50x5", "Plate 10 mm"]);
    expect(lines[1].cuts[0]).toMatchObject({ key: "t:1", partIndex: 1, assembly: "Bracket", pieces: 3 });
  });

  it("shares its keys with the order list, so a line can show what to buy", () => {
    const p = project([
      calc("a", "angle", "Angle", { dims: angle, lengthMm: 2500, qty: 2, kg: 18.85, amount: 25 }),
    ]);
    const [line] = projectBillOfMaterial(p);
    const order = computeProjectProcurementSummary(p);
    expect(order.items.map((i) => i.groupKey)).toEqual([line.key]);
  });
});
