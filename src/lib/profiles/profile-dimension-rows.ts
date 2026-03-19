import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { DimensionKey, SectionDimensionsMm } from "@/lib/datasets/types";
import { getProfileById } from "@/lib/datasets/profiles";
import { roundTo, toMillimeters } from "@/lib/calculator/units";

function fmtMm(value: number): string {
  const r = roundTo(value, 3);
  if (!Number.isFinite(r)) return "?";
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(3).replace(/\.?0+$/, "");
}

function dimMm(input: CalculationInput, key: DimensionKey): number | null {
  const d = input.manualDimensions[key];
  if (!d) return null;
  const mm = toMillimeters(d.value, d.unit);
  return Number.isFinite(mm) ? mm : null;
}

export type ProfileDimensionRow =
  | { kind: "manual"; key: DimensionKey; display: string }
  | { kind: "designation"; display: string }
  | { kind: "sectionDim"; field: "h" | "b" | "tw" | "tf"; display: string }
  | { kind: "derived"; key: "A" | "L"; display: string };

export function getSelectedSectionMm(input: CalculationInput): SectionDimensionsMm | undefined {
  const profile = getProfileById(input.profileId);
  if (!profile || profile.mode !== "standard") return undefined;
  const size = profile.sizes.find((s) => s.id === input.selectedSizeId) ?? profile.sizes[0];
  return size?.sectionMm;
}

/**
 * Ordered rows for the section drawing card and CSV-style traceability.
 */
export function buildProfileDimensionRows(
  input: CalculationInput,
  result: CalculationResult,
): ProfileDimensionRow[] {
  const profile = getProfileById(input.profileId);
  const rows: ProfileDimensionRow[] = [];

  if (!profile) {
    rows.push({ kind: "derived", key: "A", display: `${fmtMm(result.areaMm2)} mm²` });
    rows.push({ kind: "derived", key: "L", display: `${fmtMm(result.lengthMm)} mm` });
    return rows;
  }

  if (profile.mode === "manual") {
    for (const def of profile.dimensions) {
      const v = dimMm(input, def.key);
      if (v != null) {
        rows.push({ kind: "manual", key: def.key, display: `${fmtMm(v)} mm` });
      }
    }
  } else {
    const size = profile.sizes.find((s) => s.id === input.selectedSizeId) ?? profile.sizes[0];
    if (size) {
      rows.push({
        kind: "designation",
        display: size.label.replace(/\u00D7/g, "\u00d7"),
      });
      if (size.sectionMm) {
        const m = size.sectionMm;
        rows.push(
          { kind: "sectionDim", field: "h", display: `${fmtMm(m.h)} mm` },
          { kind: "sectionDim", field: "b", display: `${fmtMm(m.b)} mm` },
          { kind: "sectionDim", field: "tw", display: `${fmtMm(m.tw)} mm` },
          { kind: "sectionDim", field: "tf", display: `${fmtMm(m.tf)} mm` },
        );
      }
    }
  }

  rows.push({ kind: "derived", key: "A", display: `${fmtMm(result.areaMm2)} mm²` });
  rows.push({ kind: "derived", key: "L", display: `${fmtMm(result.lengthMm)} mm` });

  return rows;
}

export function findManualRow(
  rows: ProfileDimensionRow[],
  key: DimensionKey,
): ProfileDimensionRow | undefined {
  return rows.find((r): r is Extract<ProfileDimensionRow, { kind: "manual" }> => r.kind === "manual" && r.key === key);
}
