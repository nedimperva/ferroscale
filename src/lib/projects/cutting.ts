import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import type { CutPiece, PlatePiece, CalculationInput } from "@ferroscale/metal-core";
import { toMillimeters } from "@/lib/calculator/units";

export type CutGroupKind = "1d_bar" | "2d_plate";

export interface ProjectCutGroup {
  groupId: string;
  groupKey: string;
  kind: CutGroupKind;
  label: string;
  profileId: string;
  gradeLabel: string;
  thicknessMm?: number;
  /** 1D bar cut pieces */
  pieces: CutPiece[];
  /** 2D plate cut pieces */
  platePieces?: PlatePiece[];
  totalPieces: number;
  totalLengthMm: number;
  totalAreaM2?: number;
  estimatedWeightKg?: number;
}

const PLATE_PROFILE_IDS = new Set([
  "sheet",
  "plate",
  "chequered_plate",
  "expanded_metal",
  "corrugated_sheet",
]);

function isPlateProfile(profileId: string): boolean {
  return PLATE_PROFILE_IDS.has(profileId);
}

function getPlateWidthMm(input: CalculationInput): number {
  const w = input.manualDimensions?.width;
  return w ? toMillimeters(w.value, w.unit) : 1000;
}

function getPlateThicknessMm(input: CalculationInput): number {
  const t = input.manualDimensions?.thickness;
  return t ? toMillimeters(t.value, t.unit) : 1;
}

function extractCalculationPieces(calc: ProjectCalculation): Array<{
  groupKey: string;
  kind: CutGroupKind;
  label: string;
  profileId: string;
  gradeLabel: string;
  thicknessMm?: number;
  barPiece?: CutPiece;
  platePiece?: PlatePiece;
  unitWeightKg: number;
  quantity: number;
  lengthMm: number;
  areaM2?: number;
}> {
  const result = calc.result;
  const input = calc.input;

  // Multi-part assembly template
  if (calc.templateParts && calc.templateParts.length > 0) {
    const mult = calc.quantityMultiplier ?? 1;
    return calc.templateParts.flatMap((part, idx) => {
      const partResult = part.result;
      const partInput = part.input;
      const profileId = partResult.profileId;
      const lengthMm = partResult.lengthMm;
      const quantity = Math.max(1, partResult.quantity * mult);
      const isPlate = isPlateProfile(profileId);

      if (isPlate) {
        const widthMm = getPlateWidthMm(partInput);
        const thicknessMm = getPlateThicknessMm(partInput);
        const isChq = profileId === "chequered_plate";
        const groupKey = `plate:${thicknessMm}:${partResult.gradeLabel}:${isChq ? "chequered" : "flat"}`;
        const groupLabel = `${isChq ? "Chequered plate" : "Plate"} ${thicknessMm} mm · ${partResult.gradeLabel}`;
        const areaM2 = (widthMm * lengthMm * quantity) / 1_000_000;

        return {
          groupKey,
          kind: "2d_plate",
          label: groupLabel,
          profileId,
          gradeLabel: partResult.gradeLabel,
          thicknessMm,
          platePiece: {
            id: `${calc.id}-part-${idx + 1}`,
            label: part.name || `${widthMm}×${lengthMm} mm (${calc.templateName ?? "Assembly"})`,
            widthMm,
            lengthMm,
            thicknessMm,
            quantity,
          },
          unitWeightKg: partResult.unitWeightKg,
          quantity,
          lengthMm,
          areaM2,
        };
      }

      const groupKey = `${partResult.profileId}:${partResult.profileLabel}:${partResult.gradeLabel}`;
      const groupLabel = `${partResult.profileLabel} · ${partResult.gradeLabel}`;

      return {
        groupKey,
        kind: "1d_bar",
        label: groupLabel,
        profileId: partResult.profileId,
        gradeLabel: partResult.gradeLabel,
        unitWeightKg: partResult.unitWeightKg,
        barPiece: {
          id: `${calc.id}-part-${idx + 1}`,
          label: part.name || `${partResult.profileLabel} (${calc.templateName ?? "Assembly"})`,
          lengthMm,
          quantity,
        },
        quantity,
        lengthMm,
      };
    });
  }

  // Single calculation item
  const profileId = input.profileId;
  const lengthMm = result.lengthMm;
  const quantity = Math.max(1, result.quantity);
  const isPlate = isPlateProfile(profileId);

  if (isPlate) {
    const widthMm = getPlateWidthMm(input);
    const thicknessMm = getPlateThicknessMm(input);
    const isChq = profileId === "chequered_plate";
    const groupKey = `plate:${thicknessMm}:${result.gradeLabel}:${isChq ? "chequered" : "flat"}`;
    const groupLabel = `${isChq ? "Chequered plate" : "Plate"} ${thicknessMm} mm · ${result.gradeLabel}`;
    const areaM2 = (widthMm * lengthMm * quantity) / 1_000_000;

    return [
      {
        groupKey,
        kind: "2d_plate",
        label: groupLabel,
        profileId,
        gradeLabel: result.gradeLabel,
        thicknessMm,
        platePiece: {
          id: calc.id,
          label: calc.note || `${widthMm}×${lengthMm} mm`,
          widthMm,
          lengthMm,
          thicknessMm,
          quantity,
        },
        unitWeightKg: result.unitWeightKg,
        quantity,
        lengthMm,
        areaM2,
      },
    ];
  }

  const groupKey = `${result.profileId}:${result.profileLabel}:${result.gradeLabel}`;
  const groupLabel = `${result.profileLabel} · ${result.gradeLabel}`;

  return [
    {
      groupKey,
      kind: "1d_bar",
      label: groupLabel,
      profileId: input.profileId,
      gradeLabel: result.gradeLabel,
      unitWeightKg: result.unitWeightKg,
      barPiece: {
        id: calc.id,
        label: calc.note || result.profileLabel,
        lengthMm,
        quantity,
      },
      quantity,
      lengthMm,
    },
  ];
}

/**
 * Extracts and groups all cut pieces from a project by their physical
 * cross-section (1D linear bars or 2D plate thickness & grade).
 */
export function extractProjectCutGroups(project: Project): ProjectCutGroup[] {
  const groupMap = new Map<
    string,
    {
      kind: CutGroupKind;
      label: string;
      profileId: string;
      gradeLabel: string;
      thicknessMm?: number;
      barPieces: CutPiece[];
      platePieces: PlatePiece[];
      totalPieces: number;
      totalLengthMm: number;
      totalAreaM2: number;
      totalWeightKg: number;
    }
  >();

  for (const calc of project.calculations) {
    const extracted = extractCalculationPieces(calc);
    for (const item of extracted) {
      const existing = groupMap.get(item.groupKey);
      if (!existing) {
        groupMap.set(item.groupKey, {
          kind: item.kind,
          label: item.label,
          profileId: item.profileId,
          gradeLabel: item.gradeLabel,
          thicknessMm: item.thicknessMm,
          barPieces: item.barPiece ? [item.barPiece] : [],
          platePieces: item.platePiece ? [item.platePiece] : [],
          totalPieces: item.quantity,
          totalLengthMm: item.lengthMm * item.quantity,
          totalAreaM2: item.areaM2 ?? 0,
          totalWeightKg: item.unitWeightKg * item.quantity,
        });
      } else {
        if (item.barPiece) existing.barPieces.push(item.barPiece);
        if (item.platePiece) existing.platePieces.push(item.platePiece);
        existing.totalPieces += item.quantity;
        existing.totalLengthMm += item.lengthMm * item.quantity;
        existing.totalAreaM2 += item.areaM2 ?? 0;
        existing.totalWeightKg += item.unitWeightKg * item.quantity;
      }
    }
  }

  return Array.from(groupMap.entries()).map(([groupKey, data], idx) => ({
    groupId: `cut-group-${idx + 1}`,
    groupKey,
    kind: data.kind,
    label: data.label,
    profileId: data.profileId,
    gradeLabel: data.gradeLabel,
    thicknessMm: data.thicknessMm,
    pieces: data.barPieces,
    platePieces: data.platePieces,
    totalPieces: data.totalPieces,
    totalLengthMm: data.totalLengthMm,
    totalAreaM2: Number(data.totalAreaM2.toFixed(3)),
    estimatedWeightKg: Number(data.totalWeightKg.toFixed(2)),
  }));
}
