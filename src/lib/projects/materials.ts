import type { Project, ProjectCalculation } from "@/hooks/useProjects";

/**
 * A purchasing/cut-list view of a project: its calculations grouped by profile
 * size + grade (length-agnostic), so a fabricator can read "how much of each
 * thing do I order" instead of scanning a flat line list. Pure and testable —
 * a straight fold over the project's calculations.
 */

export interface MaterialGroup {
  key: string;
  /** Profile-size label with any per-piece length stripped ("HEA 120"). */
  label: string;
  gradeLabel: string;
  pieceCount: number;
  totalLengthM: number;
  totalWeightKg: number;
  totalCost: number;
  currency: string;
}

/** Drop a trailing " · L 6000 mm" / " x L 6000 mm" so lengths group together.
 *  Sheet-like labels bake length into the size and have no " L " part, so they
 *  pass through unchanged (and rightly group per full sheet spec). */
function stripLength(shortLabel: string): string {
  return shortLabel.split(/ [x·] L /)[0].trim();
}

interface Leaf {
  shortLabel: string;
  gradeLabel: string;
  lengthMm: number;
  quantity: number;
  weightKg: number;
  cost: number;
  currency: string;
}

/** Flatten a project calculation into leaves — templates expand into their
 *  parts, each scaled by the template's quantity multiplier. */
function leavesOf(calc: ProjectCalculation): Leaf[] {
  if (calc.templateParts && calc.templateParts.length > 0) {
    const mult = calc.quantityMultiplier ?? 1;
    return calc.templateParts.map((part) => ({
      shortLabel: part.normalizedProfile.shortLabel,
      gradeLabel: part.result.gradeLabel,
      lengthMm: part.result.lengthMm,
      quantity: part.result.quantity * mult,
      weightKg: part.result.totalWeightKg * mult,
      cost: part.result.grandTotalAmount * mult,
      currency: part.result.currency,
    }));
  }
  return [
    {
      shortLabel: calc.normalizedProfile.shortLabel,
      gradeLabel: calc.result.gradeLabel,
      lengthMm: calc.result.lengthMm,
      quantity: calc.result.quantity,
      weightKg: calc.result.totalWeightKg,
      cost: calc.result.grandTotalAmount,
      currency: calc.result.currency,
    },
  ];
}

export function computeProjectMaterials(project: Project): MaterialGroup[] {
  const groups = new Map<string, MaterialGroup>();
  for (const calc of project.calculations) {
    for (const leaf of leavesOf(calc)) {
      const label = stripLength(leaf.shortLabel);
      const key = `${label}||${leaf.gradeLabel}`;
      const existing = groups.get(key);
      const lengthM = (leaf.lengthMm / 1000) * leaf.quantity;
      if (existing) {
        existing.pieceCount += leaf.quantity;
        existing.totalLengthM += lengthM;
        existing.totalWeightKg += leaf.weightKg;
        existing.totalCost += leaf.cost;
      } else {
        groups.set(key, {
          key,
          label,
          gradeLabel: leaf.gradeLabel,
          pieceCount: leaf.quantity,
          totalLengthM: lengthM,
          totalWeightKg: leaf.weightKg,
          totalCost: leaf.cost,
          currency: leaf.currency,
        });
      }
    }
  }
  return [...groups.values()].sort((a, b) => b.totalWeightKg - a.totalWeightKg);
}
