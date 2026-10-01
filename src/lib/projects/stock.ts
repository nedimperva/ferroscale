import type { CalculationInput } from "@ferroscale/metal-core";
import { toMillimeters } from "@/lib/calculator/units";
import { getProfileById } from "@/lib/datasets/profiles";

/**
 * What a cut is bought as — the stock key the cut plan, the order list and
 * the project's bill of material share. Kept apart from `cutting.ts` so the
 * bill of material can group without pulling the bar and plate optimisers
 * onto the first-load path.
 */

export type CutGroupKind = "1d_bar" | "2d_plate";

const PLATE_PROFILE_IDS = new Set([
  "sheet",
  "plate",
  "chequered_plate",
  "expanded_metal",
  "corrugated_sheet",
]);

export function isPlateProfile(profileId: string): boolean {
  return PLATE_PROFILE_IDS.has(profileId);
}

export function getPlateWidthMm(input: CalculationInput): number {
  const w = input.manualDimensions?.width;
  return w ? toMillimeters(w.value, w.unit) : 1000;
}

function getPlateThicknessMm(input: CalculationInput): number {
  const t = input.manualDimensions?.thickness;
  return t ? toMillimeters(t.value, t.unit) : 1;
}

function formatDim(val: number): string {
  if (!Number.isFinite(val)) return "?";
  if (Number.isInteger(val)) return String(val);
  return Number(val.toFixed(2)).toString();
}

function dimMm(input: Partial<CalculationInput>, key: string): number | null {
  const dim = input.manualDimensions?.[key as keyof typeof input.manualDimensions];
  if (!dim) return null;
  const val = toMillimeters(dim.value, dim.unit);
  return Number.isFinite(val) ? val : null;
}

export function getProfileSectionLabel(
  input: Partial<CalculationInput>,
  result?: { profileId?: string; profileLabel?: string } | null,
): string {
  if (!input.profileId) {
    return result?.profileLabel || "";
  }
  const profile = getProfileById(input.profileId);
  if (profile?.mode === "standard") {
    if (input.selectedSizeId) {
      const size = profile.sizes.find((s) => s.id === input.selectedSizeId);
      if (size) return size.label;
    }
    if (result?.profileLabel && result.profileLabel !== profile.label) return result.profileLabel;
    return profile.sizes[0]?.label ?? profile.label;
  }

  switch (input.profileId) {
    case "angle": {
      const a = dimMm(input, "legA");
      const b = dimMm(input, "legB");
      const t = dimMm(input, "thickness");
      if (a != null && b != null && t != null) {
        return `Angle ${formatDim(a)}x${formatDim(b)}x${formatDim(t)}`;
      }
      break;
    }
    case "flat_bar": {
      const w = dimMm(input, "width");
      const t = dimMm(input, "thickness");
      if (w != null && t != null) {
        return `Flat Bar ${formatDim(w)}x${formatDim(t)}`;
      }
      break;
    }
    case "square_hollow": {
      const s = dimMm(input, "side") ?? dimMm(input, "width");
      const t = dimMm(input, "wallThickness") ?? dimMm(input, "thickness");
      if (s != null && t != null) {
        return `SHS ${formatDim(s)}x${formatDim(s)}x${formatDim(t)}`;
      }
      break;
    }
    case "rectangular_tube": {
      const w = dimMm(input, "width");
      const h = dimMm(input, "height");
      const t = dimMm(input, "wallThickness") ?? dimMm(input, "thickness");
      if (w != null && h != null && t != null) {
        return `RHS ${formatDim(w)}x${formatDim(h)}x${formatDim(t)}`;
      }
      break;
    }
    case "pipe": {
      const od = dimMm(input, "outerDiameter") ?? dimMm(input, "diameter");
      const t = dimMm(input, "wallThickness") ?? dimMm(input, "thickness");
      if (od != null && t != null) {
        return `CHS ${formatDim(od)}x${formatDim(t)}`;
      }
      break;
    }
    case "round_bar": {
      const d = dimMm(input, "diameter");
      if (d != null) {
        return `Round Bar Ø${formatDim(d)}`;
      }
      break;
    }
    case "square_bar": {
      const s = dimMm(input, "side");
      if (s != null) {
        return `Square Bar ${formatDim(s)}x${formatDim(s)}`;
      }
      break;
    }
    case "sheet":
    case "plate": {
      const t = dimMm(input, "thickness");
      if (t != null) {
        return `${input.profileId === "sheet" ? "Sheet" : "Plate"} ${formatDim(t)} mm`;
      }
      break;
    }
    case "chequered_plate": {
      const t = dimMm(input, "thickness");
      const p = dimMm(input, "patternHeight");
      if (t != null && p != null) {
        return `Chequered Plate ${formatDim(t)}+${formatDim(p)} mm`;
      } else if (t != null) {
        return `Chequered Plate ${formatDim(t)} mm`;
      }
      break;
    }
    default:
      break;
  }

  return result?.profileLabel || profile?.label || input.profileId;
}

export interface StockGroupKey {
  /** Same key for every cut bought from the same stock. */
  groupKey: string;
  kind: CutGroupKind;
  /** What the stock is, without the grade: "UPN 200", "Chequered plate 5 mm". */
  name: string;
  /** `name · grade`, as the cut plan and order list title a group. */
  label: string;
  thicknessMm?: number;
}

/**
 * What a cut is bought as. Bars and sections group by section and grade;
 * plate groups by thickness and grade (chequered apart from flat), since
 * every 10 mm plate is cut from the same sheet whatever its width and length.
 * The cut plan, the order list and the project's bill of material all group
 * by this one key, so a stock line means the same thing on each.
 */
export function stockGroupFor(
  input: CalculationInput,
  result: { profileId: string; profileLabel?: string; gradeLabel: string },
): StockGroupKey {
  const profileId = result.profileId || input.profileId;
  if (isPlateProfile(profileId)) {
    const thicknessMm = getPlateThicknessMm(input);
    const isChq = profileId === "chequered_plate";
    const name = `${isChq ? "Chequered plate" : "Plate"} ${thicknessMm} mm`;
    return {
      groupKey: `plate:${thicknessMm}:${result.gradeLabel}:${isChq ? "chequered" : "flat"}`,
      kind: "2d_plate",
      name,
      label: `${name} · ${result.gradeLabel}`,
      thicknessMm,
    };
  }
  const name = getProfileSectionLabel(input, result);
  return {
    groupKey: `${profileId}:${name}:${result.gradeLabel}`,
    kind: "1d_bar",
    name,
    label: `${name} · ${result.gradeLabel}`,
  };
}
