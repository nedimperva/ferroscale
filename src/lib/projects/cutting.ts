import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import {
  optimizeCutList,
  optimizePlateCutList,
  STANDARD_EURO_SHEET_FORMATS,
  type CutPiece,
  type PlatePiece,
  type CalculationInput,
} from "@ferroscale/metal-core";
import { toMillimeters } from "@/lib/calculator/units";
import { getProfileById } from "@/lib/datasets/profiles";

export type CutGroupKind = "1d_bar" | "2d_plate";

export interface ProjectCutGroup {
  groupId: string;
  groupKey: string;
  kind: CutGroupKind;
  label: string;
  profileId: string;
  gradeLabel: string;
  thicknessMm?: number;
  kgPerMeter?: number;
  kgPerM2?: number;
  /** 1D bar cut pieces */
  pieces: CutPiece[];
  /** 2D plate cut pieces */
  platePieces?: PlatePiece[];
  totalPieces: number;
  totalLengthMm: number;
  totalAreaM2?: number;
  estimatedWeightKg?: number;
}

export interface ProcurementStockItem {
  groupId: string;
  label: string;
  kind: CutGroupKind;
  profileId: string;
  gradeLabel: string;
  stockDescription: string;
  rawStockUnits: string;
  rawCount: number;
  rawWeightKg: number;
  netWeightKg: number;
  scrapWeightKg: number;
  yieldPercent: number;
  scrapPercent: number;
}

export interface ProjectProcurementSummary {
  items: ProcurementStockItem[];
  totalRawWeightKg: number;
  totalNetWeightKg: number;
  totalScrapWeightKg: number;
  globalYieldPercent: number;
  globalScrapPercent: number;
  totalBarsCount: number;
  totalSheetsCount: number;
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

function extractCalculationPieces(calc: ProjectCalculation): Array<{
  groupKey: string;
  kind: CutGroupKind;
  label: string;
  profileId: string;
  gradeLabel: string;
  thicknessMm?: number;
  kgPerMeter?: number;
  kgPerM2?: number;
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
    return calc.templateParts.flatMap((part, idx) => {
      const partResult = part.result;
      const partInput = part.input;
      const profileId = partResult.profileId;
      const lengthMm = partResult.lengthMm;
      // partResult.quantity in recalculatedParts already incorporates any multiplier
      const quantity = Math.max(1, partResult.quantity);
      const isPlate = isPlateProfile(profileId);

      if (isPlate) {
        const widthMm = getPlateWidthMm(partInput);
        const thicknessMm = getPlateThicknessMm(partInput);
        const isChq = profileId === "chequered_plate";
        const groupKey = `plate:${thicknessMm}:${partResult.gradeLabel}:${isChq ? "chequered" : "flat"}`;
        const groupLabel = `${isChq ? "Chequered plate" : "Plate"} ${thicknessMm} mm · ${partResult.gradeLabel}`;
        const pieceAreaM2 = (widthMm * lengthMm) / 1_000_000;
        const areaM2 = pieceAreaM2 * quantity;
        const kgPerM2 = pieceAreaM2 > 0 ? partResult.unitWeightKg / pieceAreaM2 : 78.5;

        return {
          groupKey,
          kind: "2d_plate",
          label: groupLabel,
          profileId,
          gradeLabel: partResult.gradeLabel,
          thicknessMm,
          kgPerM2,
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

      const sectionLabel = getProfileSectionLabel(partInput, partResult);
      const groupKey = `${profileId}:${sectionLabel}:${partResult.gradeLabel}`;
      const groupLabel = `${sectionLabel} · ${partResult.gradeLabel}`;
      const lengthM = lengthMm / 1000;
      const kgPerMeter = lengthM > 0 ? partResult.unitWeightKg / lengthM : 0;

      return {
        groupKey,
        kind: "1d_bar",
        label: groupLabel,
        profileId: partResult.profileId,
        gradeLabel: partResult.gradeLabel,
        kgPerMeter,
        unitWeightKg: partResult.unitWeightKg,
        barPiece: {
          id: `${calc.id}-part-${idx + 1}`,
          label: part.name || `${sectionLabel} (${calc.templateName ?? "Assembly"})`,
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
    const pieceAreaM2 = (widthMm * lengthMm) / 1_000_000;
    const areaM2 = pieceAreaM2 * quantity;
    const kgPerM2 = pieceAreaM2 > 0 ? result.unitWeightKg / pieceAreaM2 : 78.5;

    return [
      {
        groupKey,
        kind: "2d_plate",
        label: groupLabel,
        profileId,
        gradeLabel: result.gradeLabel,
        thicknessMm,
        kgPerM2,
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

  const sectionLabel = getProfileSectionLabel(input, result);
  const groupKey = `${profileId}:${sectionLabel}:${result.gradeLabel}`;
  const groupLabel = `${sectionLabel} · ${result.gradeLabel}`;
  const lengthM = lengthMm / 1000;
  const kgPerMeter = lengthM > 0 ? result.unitWeightKg / lengthM : 0;

  return [
    {
      groupKey,
      kind: "1d_bar",
      label: groupLabel,
      profileId: input.profileId,
      gradeLabel: result.gradeLabel,
      kgPerMeter,
      unitWeightKg: result.unitWeightKg,
      barPiece: {
        id: calc.id,
        label: calc.note || sectionLabel,
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
      kgPerMeter?: number;
      kgPerM2?: number;
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
          kgPerMeter: item.kgPerMeter,
          kgPerM2: item.kgPerM2,
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
        if (!existing.kgPerMeter && item.kgPerMeter) existing.kgPerMeter = item.kgPerMeter;
        if (!existing.kgPerM2 && item.kgPerM2) existing.kgPerM2 = item.kgPerM2;
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
    kgPerMeter: data.kgPerMeter,
    kgPerM2: data.kgPerM2,
    pieces: data.barPieces,
    platePieces: data.platePieces,
    totalPieces: data.totalPieces,
    totalLengthMm: data.totalLengthMm,
    totalAreaM2: Number(data.totalAreaM2.toFixed(3)),
    estimatedWeightKg: Number(data.totalWeightKg.toFixed(2)),
  }));
}

/**
 * Computes a unified project-wide material purchasing & procurement order summary.
 * Optimizes all 1D bars and 2D master sheets to recommend exact purchasing quantities.
 */
export function computeProjectProcurementSummary(
  project: Project,
  options: {
    stockLengthsMm?: number[];
    kerfMm?: number;
    edgeTrimMm?: number;
    allowRotation?: boolean;
  } = {},
): ProjectProcurementSummary {
  const groups = extractProjectCutGroups(project);
  const items: ProcurementStockItem[] = [];

  let totalRawWeightKg = 0;
  let totalNetWeightKg = 0;
  let totalBarsCount = 0;
  let totalSheetsCount = 0;

  for (const group of groups) {
    if (group.kind === "1d_bar" && group.pieces.length > 0) {
      const opt = optimizeCutList(group.pieces, {
        stockLengthsMm: options.stockLengthsMm ?? [6000, 12000],
        kerfMm: options.kerfMm ?? 3,
      });

      // Count occurrences of each stock length used
      const lengthCounts = new Map<number, number>();
      for (const p of opt.patterns) {
        lengthCounts.set(p.stockLengthMm, (lengthCounts.get(p.stockLengthMm) ?? 0) + 1);
      }

      const descParts = Array.from(lengthCounts.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([lenMm, count]) => `${count} × ${(lenMm / 1000).toFixed(0)}m`);

      const rawStockUnits = descParts.join(" + ") || `${opt.totalStockBars} bars`;
      const kgPerM = group.kgPerMeter ?? (group.totalLengthMm > 0 ? (group.estimatedWeightKg ?? 0) / (group.totalLengthMm / 1000) : 0);
      const rawWeightKg = Number(((opt.totalStockLengthMm / 1000) * kgPerM).toFixed(2));
      const netWeightKg = Number((group.estimatedWeightKg ?? ((opt.totalCutLengthMm / 1000) * kgPerM)).toFixed(2));
      const scrapWeightKg = Number(Math.max(0, rawWeightKg - netWeightKg).toFixed(2));

      totalRawWeightKg += rawWeightKg;
      totalNetWeightKg += netWeightKg;
      totalBarsCount += opt.totalStockBars;

      items.push({
        groupId: group.groupId,
        label: group.label,
        kind: group.kind,
        profileId: group.profileId,
        gradeLabel: group.gradeLabel,
        stockDescription: `${opt.totalStockBars} bars (${(opt.totalStockLengthMm / 1000).toFixed(1)} m total)`,
        rawStockUnits,
        rawCount: opt.totalStockBars,
        rawWeightKg,
        netWeightKg,
        scrapWeightKg,
        yieldPercent: opt.yieldPercent,
        scrapPercent: opt.scrapPercent,
      });
    } else if (group.kind === "2d_plate" && group.platePieces && group.platePieces.length > 0) {
      const opt = optimizePlateCutList(group.platePieces, {
        standardSheets: STANDARD_EURO_SHEET_FORMATS,
        kerfMm: options.kerfMm ?? 3,
        edgeTrimMm: options.edgeTrimMm ?? 10,
        allowRotation: options.allowRotation ?? true,
      });

      // Count occurrences of each sheet format used
      const formatCounts = new Map<string, number>();
      for (const p of opt.patterns) {
        formatCounts.set(p.formatLabel, (formatCounts.get(p.formatLabel) ?? 0) + 1);
      }

      const descParts = Array.from(formatCounts.entries())
        .map(([fmt, count]) => `${count} × (${fmt.replace(/\s*\([^)]*\)/, "")})`);

      const rawStockUnits = descParts.join(" + ") || `${opt.totalMasterSheets} sheets`;
      const kgPerM2 = group.kgPerM2 ?? (group.totalAreaM2 && group.totalAreaM2 > 0 ? (group.estimatedWeightKg ?? 0) / group.totalAreaM2 : 78.5);
      const rawWeightKg = Number((opt.totalMasterAreaM2 * kgPerM2).toFixed(2));
      const netWeightKg = Number((group.estimatedWeightKg ?? (opt.totalCutAreaM2 * kgPerM2)).toFixed(2));
      const scrapWeightKg = Number(Math.max(0, rawWeightKg - netWeightKg).toFixed(2));

      totalRawWeightKg += rawWeightKg;
      totalNetWeightKg += netWeightKg;
      totalSheetsCount += opt.totalMasterSheets;

      items.push({
        groupId: group.groupId,
        label: group.label,
        kind: group.kind,
        profileId: group.profileId,
        gradeLabel: group.gradeLabel,
        stockDescription: `${opt.totalMasterSheets} plates (${opt.totalMasterAreaM2} m² total)`,
        rawStockUnits,
        rawCount: opt.totalMasterSheets,
        rawWeightKg,
        netWeightKg,
        scrapWeightKg,
        yieldPercent: opt.yieldPercent,
        scrapPercent: opt.scrapPercent,
      });
    }
  }

  totalRawWeightKg = Number(totalRawWeightKg.toFixed(2));
  totalNetWeightKg = Number(totalNetWeightKg.toFixed(2));
  const totalScrapWeightKg = Number(Math.max(0, totalRawWeightKg - totalNetWeightKg).toFixed(2));
  const globalYieldPercent = totalRawWeightKg > 0 ? Number(((totalNetWeightKg / totalRawWeightKg) * 100).toFixed(1)) : 0;
  const globalScrapPercent = totalRawWeightKg > 0 ? Number(((totalScrapWeightKg / totalRawWeightKg) * 100).toFixed(1)) : 0;

  return {
    items,
    totalRawWeightKg,
    totalNetWeightKg,
    totalScrapWeightKg,
    globalYieldPercent,
    globalScrapPercent,
    totalBarsCount,
    totalSheetsCount,
  };
}

/**
 * Generates plain-text supplier Request for Quotation (RFQ) or Purchase Order BOM.
 */
export function generateSupplierRfqText(
  summary: ProjectProcurementSummary,
  projectName = "Steel Project",
): string {
  const lines: string[] = [
    `MATERIAL ORDER / PURCHASE LIST`,
    `Project: ${projectName}`,
    `Date: ${new Date().toLocaleDateString()}`,
    `----------------------------------------------------------------------`,
    `ITEMS TO ORDER:`,
  ];

  summary.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. ${item.label}`,
      `   Order: ${item.rawStockUnits} (${item.stockDescription})`,
      `   Weight: ~${item.rawWeightKg.toLocaleString()} kg (Net: ${item.netWeightKg.toLocaleString()} kg)`,
    );
  });

  lines.push(
    `----------------------------------------------------------------------`,
    `SUMMARY:`,
    `Total Raw Material Weight: ${summary.totalRawWeightKg.toLocaleString()} kg (${(summary.totalRawWeightKg / 1000).toFixed(2)} t)`,
    `Total Stock Bars: ${summary.totalBarsCount} pcs`,
    `Total Master Plates: ${summary.totalSheetsCount} pcs`,
    `Overall Material Yield: ${summary.globalYieldPercent}%`,
    `----------------------------------------------------------------------`,
  );

  return lines.join("\n");
}
