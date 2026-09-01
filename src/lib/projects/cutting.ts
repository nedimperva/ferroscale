import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import type { CutPiece } from "@ferroscale/metal-core";

export interface ProjectCutGroup {
  groupId: string;
  groupKey: string;
  label: string;
  profileId: string;
  gradeLabel: string;
  pieces: CutPiece[];
  totalPieces: number;
  totalLengthMm: number;
  estimatedWeightKg?: number;
}

function extractCalculationPieces(calc: ProjectCalculation): Array<{
  groupKey: string;
  label: string;
  profileId: string;
  gradeLabel: string;
  piece: CutPiece;
  unitWeightKg: number;
}> {
  const result = calc.result;
  const input = calc.input;

  // Multi-part assembly template
  if (calc.templateParts && calc.templateParts.length > 0) {
    const mult = calc.quantityMultiplier ?? 1;
    return calc.templateParts.flatMap((part, idx) => {
      const partResult = part.result;
      const groupKey = `${partResult.profileId}:${partResult.profileLabel}:${partResult.gradeLabel}`;
      const groupLabel = `${partResult.profileLabel} · ${partResult.gradeLabel}`;
      const lengthMm = partResult.lengthMm;
      const quantity = Math.max(1, partResult.quantity * mult);

      return {
        groupKey,
        label: groupLabel,
        profileId: partResult.profileId,
        gradeLabel: partResult.gradeLabel,
        unitWeightKg: partResult.unitWeightKg,
        piece: {
          id: `${calc.id}-part-${idx + 1}`,
          label: part.name || `${partResult.profileLabel} (${calc.templateName ?? "Assembly"})`,
          lengthMm,
          quantity,
        },
      };
    });
  }

  // Single calculation item
  const groupKey = `${result.profileId}:${result.profileLabel}:${result.gradeLabel}`;
  const groupLabel = `${result.profileLabel} · ${result.gradeLabel}`;
  const lengthMm = result.lengthMm;
  const quantity = Math.max(1, result.quantity);

  return [
    {
      groupKey,
      label: groupLabel,
      profileId: input.profileId,
      gradeLabel: result.gradeLabel,
      unitWeightKg: result.unitWeightKg,
      piece: {
        id: calc.id,
        label: calc.note || result.profileLabel,
        lengthMm,
        quantity,
      },
    },
  ];
}

/**
 * Extracts and groups all cut pieces from a project by their physical
 * cross-section (profile + dimensions + material grade).
 */
export function extractProjectCutGroups(project: Project): ProjectCutGroup[] {
  const groupMap = new Map<
    string,
    {
      label: string;
      profileId: string;
      gradeLabel: string;
      pieces: CutPiece[];
      totalPieces: number;
      totalLengthMm: number;
      totalWeightKg: number;
    }
  >();

  for (const calc of project.calculations) {
    const extracted = extractCalculationPieces(calc);
    for (const item of extracted) {
      const existing = groupMap.get(item.groupKey);
      if (!existing) {
        groupMap.set(item.groupKey, {
          label: item.label,
          profileId: item.profileId,
          gradeLabel: item.gradeLabel,
          pieces: [item.piece],
          totalPieces: item.piece.quantity,
          totalLengthMm: item.piece.lengthMm * item.piece.quantity,
          totalWeightKg: item.unitWeightKg * item.piece.quantity,
        });
      } else {
        existing.pieces.push(item.piece);
        existing.totalPieces += item.piece.quantity;
        existing.totalLengthMm += item.piece.lengthMm * item.piece.quantity;
        existing.totalWeightKg += item.unitWeightKg * item.piece.quantity;
      }
    }
  }

  return Array.from(groupMap.entries()).map(([groupKey, data], idx) => ({
    groupId: `cut-group-${idx + 1}`,
    groupKey,
    label: data.label,
    profileId: data.profileId,
    gradeLabel: data.gradeLabel,
    pieces: data.pieces,
    totalPieces: data.totalPieces,
    totalLengthMm: data.totalLengthMm,
    estimatedWeightKg: Number(data.totalWeightKg.toFixed(2)),
  }));
}
