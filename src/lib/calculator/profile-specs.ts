import { calculateMetal, resolveAreaMm2, resolvePerimeterMm } from "@/lib/calculator/engine";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { toMillimeters } from "@/lib/calculator/units";
import { getMaterialGradeById } from "@/lib/datasets/materials";
import { getProfileById } from "@/lib/datasets/profiles";
import { getStandardProfileSpecRecord } from "@/lib/datasets/specs";
import { getStandardSizesForProfile } from "@/lib/datasets/standard-sizes";
import type {
  DimensionKey,
  ProfileDefinition,
  ProfileId,
  ProfileSpecDrawingKind,
  ProfileSpecGeometry,
} from "@/lib/datasets/types";

const MATCH_TOLERANCE_MM = 0.01;
const STRUCTURAL_ALTERNATIVE_GROUPS: Partial<Record<ProfileId, readonly ProfileId[]>> = {
  beam_ipe_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_ipn_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_hea_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_heb_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_hem_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  channel_upn_en: ["channel_upn_en", "channel_upe_en"],
  channel_upe_en: ["channel_upn_en", "channel_upe_en"],
  tee_en: ["tee_en"],
};

export type ProfileSpecsFamilyMode = "lookup" | "alternatives";
export type ProfileSpecsImpactMode = "currency" | "weight";

export type ProfileSpecsMetricKey =
  | DimensionKey
  | "areaMm2"
  | "perimeterMm"
  | "webThickness"
  | "flangeThickness"
  | "rootRadius"
  | "innerDiameter"
  | "waveHeight"
  | "wavePitch"
  | "meshPitch"
  | "strandWidth"
  | "massPerMeter"
  | "surfacePerMeter"
  | "innerWidth"
  | "innerHeight"
  | "clearHeight"
  | "flangeProjection";

export interface ProfileSpecsMetric {
  key: ProfileSpecsMetricKey;
  value: number;
  unit: string;
}

export interface ProfileSpecsFamilyRow {
  id: string;
  label: string;
  profileId: ProfileId;
  mode: "standard" | "manual";
  selected: boolean;
  sizeId?: string;
  dimensionsMm?: Partial<Record<DimensionKey, number>>;
  areaMm2: number | null;
  perimeterMm: number | null;
  massPerMeterKg: number | null;
  fitDeltaPercent?: number | null;
  impactValue?: number | null;
  impactMode?: ProfileSpecsImpactMode;
}

export interface ResolvedProfileSpecs {
  profileId: ProfileId;
  profileLabel: string;
  selectedLabel: string;
  formulaLabel: string;
  referenceLabels: string[];
  drawingKind: ProfileSpecDrawingKind | null;
  geometry: ProfileSpecGeometry | null;
  metrics: ProfileSpecsMetric[];
  familyMode: ProfileSpecsFamilyMode;
  familyRows: ProfileSpecsFamilyRow[];
  selectedFamilyRowId: string | null;
  isCustomSelection: boolean;
}

function dedupe(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function formatMm(value: number | undefined): string {
  if (!Number.isFinite(value)) return "?";
  return Number(value!.toFixed(3)).toString();
}

function parseLeadingNumber(label: string): number {
  const match = label.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function getManualDimensionsMm(input: CalculationInput, profile: ProfileDefinition): Partial<Record<DimensionKey, number>> {
  if (profile.mode !== "manual") return {};

  return Object.fromEntries(
    profile.dimensions.flatMap((dimension) => {
      const raw = input.manualDimensions[dimension.key];
      if (!raw) return [];
      return [[dimension.key, toMillimeters(raw.value, raw.unit)]];
    }),
  );
}

function hasRequiredManualDimensions(
  profile: ProfileDefinition,
  dimensionsMm: Partial<Record<DimensionKey, number>>,
): boolean {
  return profile.mode === "manual"
    && profile.dimensions.every((dimension) => Number.isFinite(dimensionsMm[dimension.key]));
}

function buildInputWithManualDimensions(
  input: CalculationInput,
  dimensionsMm: Partial<Record<DimensionKey, number>>,
): CalculationInput {
  return {
    ...input,
    manualDimensions: Object.fromEntries(
      Object.entries(dimensionsMm).map(([key, value]) => [key, { value, unit: "mm" }]),
    ),
  };
}

function buildManualSelectionLabel(
  profileId: ProfileId,
  dimensionsMm: Partial<Record<DimensionKey, number>>,
  fallback: string,
): string {
  switch (profileId) {
    case "round_bar":
      return `RB Ø${formatMm(dimensionsMm.diameter)}`;
    case "square_bar":
      return `SB ${formatMm(dimensionsMm.side)}x${formatMm(dimensionsMm.side)}`;
    case "flat_bar":
      return `FB ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.thickness)}`;
    case "angle":
      return `L ${formatMm(dimensionsMm.legA)}x${formatMm(dimensionsMm.legB)}x${formatMm(dimensionsMm.thickness)}`;
    case "pipe":
      return `CHS ${formatMm(dimensionsMm.outerDiameter)}x${formatMm(dimensionsMm.wallThickness)}`;
    case "rectangular_tube":
      return `RHS ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.height)}x${formatMm(dimensionsMm.wallThickness)}`;
    case "square_hollow":
      return `SHS ${formatMm(dimensionsMm.side)}x${formatMm(dimensionsMm.side)}x${formatMm(dimensionsMm.wallThickness)}`;
    case "sheet":
      return `SHT ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.thickness)}`;
    case "plate":
      return `PL ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.thickness)}`;
    case "chequered_plate":
      return `CHQ ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.thickness)}+${formatMm(dimensionsMm.patternHeight)}`;
    case "expanded_metal":
      return `EXP ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.thickness)}`;
    case "corrugated_sheet":
      return `CRG ${formatMm(dimensionsMm.width)}x${formatMm(dimensionsMm.thickness)}`;
    default:
      return fallback;
  }
}

function resolveDensityKgPerM3(input: CalculationInput): number | null {
  if (input.useCustomDensity && input.customDensityKgPerM3 && Number.isFinite(input.customDensityKgPerM3)) {
    return input.customDensityKgPerM3;
  }

  return getMaterialGradeById(input.materialGradeId)?.densityKgPerM3 ?? null;
}

function resolveManualGeometry(
  profileId: ProfileId,
  dimensionsMm: Partial<Record<DimensionKey, number>>,
): { drawingKind: ProfileSpecDrawingKind; geometry: ProfileSpecGeometry } | null {
  switch (profileId) {
    case "round_bar":
      if (!Number.isFinite(dimensionsMm.diameter)) return null;
      return {
        drawingKind: "round",
        geometry: { diameterMm: dimensionsMm.diameter },
      };
    case "square_bar":
      if (!Number.isFinite(dimensionsMm.side)) return null;
      return {
        drawingKind: "square",
        geometry: { sideMm: dimensionsMm.side },
      };
    case "flat_bar":
      if (!Number.isFinite(dimensionsMm.width) || !Number.isFinite(dimensionsMm.thickness)) return null;
      return {
        drawingKind: "flat",
        geometry: {
          widthMm: dimensionsMm.width,
          thicknessMm: dimensionsMm.thickness,
        },
      };
    case "sheet":
    case "plate":
      if (!Number.isFinite(dimensionsMm.width) || !Number.isFinite(dimensionsMm.thickness)) return null;
      return {
        drawingKind: "sheet",
        geometry: {
          widthMm: dimensionsMm.width,
          thicknessMm: dimensionsMm.thickness,
        },
      };
    case "chequered_plate":
      if (
        !Number.isFinite(dimensionsMm.width)
        || !Number.isFinite(dimensionsMm.thickness)
        || !Number.isFinite(dimensionsMm.patternHeight)
      ) return null;
      return {
        drawingKind: "chequered",
        geometry: {
          widthMm: dimensionsMm.width,
          thicknessMm: dimensionsMm.thickness,
          patternHeightMm: dimensionsMm.patternHeight,
        },
      };
    case "expanded_metal":
      if (!Number.isFinite(dimensionsMm.width) || !Number.isFinite(dimensionsMm.thickness)) return null;
      return {
        drawingKind: "expanded",
        geometry: {
          widthMm: dimensionsMm.width,
          thicknessMm: dimensionsMm.thickness,
          meshPitchMm: Math.max(20, Number((dimensionsMm.width! / 8).toFixed(1))),
          strandWidthMm: Math.max(4, Number((dimensionsMm.thickness! * 2.2).toFixed(1))),
        },
      };
    case "corrugated_sheet":
      if (!Number.isFinite(dimensionsMm.width) || !Number.isFinite(dimensionsMm.thickness)) return null;
      return {
        drawingKind: "corrugated",
        geometry: {
          widthMm: dimensionsMm.width,
          thicknessMm: dimensionsMm.thickness,
          waveHeightMm: Math.max(18, Number((dimensionsMm.thickness! * 18).toFixed(1))),
          wavePitchMm: 76,
        },
      };
    case "pipe":
      if (!Number.isFinite(dimensionsMm.outerDiameter) || !Number.isFinite(dimensionsMm.wallThickness)) return null;
      return {
        drawingKind: "pipe",
        geometry: {
          outerDiameterMm: dimensionsMm.outerDiameter,
          wallThicknessMm: dimensionsMm.wallThickness,
          innerDiameterMm: Math.max(0, dimensionsMm.outerDiameter! - (dimensionsMm.wallThickness! * 2)),
        },
      };
    case "rectangular_tube":
      if (
        !Number.isFinite(dimensionsMm.width)
        || !Number.isFinite(dimensionsMm.height)
        || !Number.isFinite(dimensionsMm.wallThickness)
      ) return null;
      return {
        drawingKind: "rect_hollow",
        geometry: {
          widthMm: dimensionsMm.width,
          heightMm: dimensionsMm.height,
          wallThicknessMm: dimensionsMm.wallThickness,
        },
      };
    case "square_hollow":
      if (!Number.isFinite(dimensionsMm.side) || !Number.isFinite(dimensionsMm.wallThickness)) return null;
      return {
        drawingKind: "rect_hollow",
        geometry: {
          widthMm: dimensionsMm.side,
          heightMm: dimensionsMm.side,
          sideMm: dimensionsMm.side,
          wallThicknessMm: dimensionsMm.wallThickness,
        },
      };
    case "angle":
      if (
        !Number.isFinite(dimensionsMm.legA)
        || !Number.isFinite(dimensionsMm.legB)
        || !Number.isFinite(dimensionsMm.thickness)
      ) return null;
      return {
        drawingKind: "angle",
        geometry: {
          legAMm: dimensionsMm.legA,
          legBMm: dimensionsMm.legB,
          thicknessMm: dimensionsMm.thickness,
        },
      };
    default:
      return null;
  }
}

function buildMetrics({
  input,
  profileId,
  geometry,
  areaMm2,
  perimeterMm,
}: {
  input: CalculationInput;
  profileId: ProfileId;
  geometry: ProfileSpecGeometry;
  areaMm2: number | null;
  perimeterMm: number | null;
}): ProfileSpecsMetric[] {
  const metrics: ProfileSpecsMetric[] = [];
  const densityKgPerM3 = resolveDensityKgPerM3(input);
  const push = (key: ProfileSpecsMetricKey, value: number | null | undefined, unit: string) => {
    if (value != null && Number.isFinite(value)) {
      metrics.push({ key, value, unit });
    }
  };

  switch (profileId) {
    case "round_bar":
      push("diameter", geometry.diameterMm, "mm");
      break;
    case "square_bar":
      push("side", geometry.sideMm, "mm");
      break;
    case "flat_bar":
    case "sheet":
    case "plate":
      push("width", geometry.widthMm, "mm");
      push("thickness", geometry.thicknessMm, "mm");
      break;
    case "chequered_plate":
      push("width", geometry.widthMm, "mm");
      push("thickness", geometry.thicknessMm, "mm");
      push("patternHeight", geometry.patternHeightMm, "mm");
      break;
    case "expanded_metal":
      push("width", geometry.widthMm, "mm");
      push("thickness", geometry.thicknessMm, "mm");
      push("meshPitch", geometry.meshPitchMm, "mm");
      push("strandWidth", geometry.strandWidthMm, "mm");
      break;
    case "corrugated_sheet":
      push("width", geometry.widthMm, "mm");
      push("thickness", geometry.thicknessMm, "mm");
      push("waveHeight", geometry.waveHeightMm, "mm");
      push("wavePitch", geometry.wavePitchMm, "mm");
      break;
    case "pipe":
      push("outerDiameter", geometry.outerDiameterMm, "mm");
      push("wallThickness", geometry.wallThicknessMm, "mm");
      push("innerDiameter", geometry.innerDiameterMm, "mm");
      break;
    case "rectangular_tube":
      push("width", geometry.widthMm, "mm");
      push("height", geometry.heightMm, "mm");
      push("wallThickness", geometry.wallThicknessMm, "mm");
      push(
        "innerWidth",
        geometry.widthMm != null && geometry.wallThicknessMm != null
          ? geometry.widthMm - (geometry.wallThicknessMm * 2)
          : null,
        "mm",
      );
      push(
        "innerHeight",
        geometry.heightMm != null && geometry.wallThicknessMm != null
          ? geometry.heightMm - (geometry.wallThicknessMm * 2)
          : null,
        "mm",
      );
      break;
    case "square_hollow":
      push("side", geometry.sideMm, "mm");
      push("wallThickness", geometry.wallThicknessMm, "mm");
      push(
        "innerWidth",
        geometry.sideMm != null && geometry.wallThicknessMm != null
          ? geometry.sideMm - (geometry.wallThicknessMm * 2)
          : null,
        "mm",
      );
      push(
        "innerHeight",
        geometry.sideMm != null && geometry.wallThicknessMm != null
          ? geometry.sideMm - (geometry.wallThicknessMm * 2)
          : null,
        "mm",
      );
      break;
    case "angle":
      push("legA", geometry.legAMm, "mm");
      push("legB", geometry.legBMm, "mm");
      push("thickness", geometry.thicknessMm, "mm");
      break;
    case "beam_ipe_en":
    case "beam_ipn_en":
    case "beam_hea_en":
    case "beam_heb_en":
    case "beam_hem_en":
    case "channel_upn_en":
    case "channel_upe_en":
    case "tee_en":
      push("height", geometry.heightMm, "mm");
      push("width", geometry.widthMm, "mm");
      push("webThickness", geometry.webThicknessMm, "mm");
      push("flangeThickness", geometry.flangeThicknessMm, "mm");
      push("rootRadius", geometry.rootRadiusMm, "mm");
      push(
        "clearHeight",
        geometry.heightMm != null && geometry.flangeThicknessMm != null
          ? geometry.heightMm - (profileId === "tee_en" ? geometry.flangeThicknessMm : geometry.flangeThicknessMm * 2)
          : null,
        "mm",
      );
      push(
        "flangeProjection",
        geometry.widthMm != null && geometry.webThicknessMm != null
          ? profileId === "channel_upn_en" || profileId === "channel_upe_en"
            ? geometry.widthMm - geometry.webThicknessMm
            : (geometry.widthMm - geometry.webThicknessMm) / 2
          : null,
        "mm",
      );
      break;
  }

  if (areaMm2 != null && Number.isFinite(areaMm2)) {
    push("areaMm2", areaMm2, "mm2");
  }

  if (perimeterMm != null && Number.isFinite(perimeterMm)) {
    push("perimeterMm", perimeterMm, "mm");
  }

  if (densityKgPerM3 != null && areaMm2 != null && Number.isFinite(areaMm2)) {
    push("massPerMeter", (areaMm2 * densityKgPerM3) / 1_000_000, "kg/m");
  }

  if (perimeterMm != null && Number.isFinite(perimeterMm)) {
    push("surfacePerMeter", perimeterMm / 1000, "m2/m");
  }

  return metrics;
}

function getAreaAndPerimeter(input: CalculationInput): { areaMm2: number | null; perimeterMm: number | null } {
  const area = resolveAreaMm2(input);
  const perimeter = resolvePerimeterMm(input);

  return {
    areaMm2: Number.isFinite(area.areaMm2) ? area.areaMm2 : null,
    perimeterMm: Number.isFinite(perimeter.perimeterMm) ? perimeter.perimeterMm : null,
  };
}

function getMassPerMeterKg(
  areaMm2: number | null,
  densityKgPerM3: number | null,
): number | null {
  if (areaMm2 == null || densityKgPerM3 == null) return null;
  if (!Number.isFinite(areaMm2) || !Number.isFinite(densityKgPerM3)) return null;
  return (areaMm2 * densityKgPerM3) / 1_000_000;
}

function buildStandardSelectionInput(
  input: CalculationInput,
  profileId: ProfileId,
  sizeId: string,
): CalculationInput {
  return {
    ...input,
    profileId,
    selectedSizeId: sizeId,
    manualDimensions: {},
  };
}

function resolveAlternativeImpactMode(
  input: CalculationInput,
  currentResult: CalculationResult,
): ProfileSpecsImpactMode {
  return input.unitPrice > 0 || Math.abs(currentResult.grandTotalAmount) > 0.0001
    ? "currency"
    : "weight";
}

function dimensionsMatch(
  currentMm: Partial<Record<DimensionKey, number>>,
  candidateMm: Partial<Record<DimensionKey, number>>,
): boolean {
  return Object.entries(candidateMm).every(([key, value]) => {
    const current = currentMm[key as DimensionKey];
    return current != null && value != null && Math.abs(current - value) <= MATCH_TOLERANCE_MM;
  });
}

function buildManualFamilyRows(
  input: CalculationInput,
  profileId: ProfileId,
  currentDimensionsMm: Partial<Record<DimensionKey, number>>,
): { rows: ProfileSpecsFamilyRow[]; selectedFamilyRowId: string | null } {
  const lookupRows = getStandardSizesForProfile(profileId);
  let selectedFamilyRowId: string | null = null;
  const densityKgPerM3 = resolveDensityKgPerM3(input);

  const scoreRow = (dimensions: Partial<Record<DimensionKey, number>>): number => {
    const entries = Object.entries(dimensions) as Array<[DimensionKey, number]>;
    if (entries.length === 0) return Number.POSITIVE_INFINITY;

    return entries.reduce((score, [key, candidate]) => {
      const current = currentDimensionsMm[key];
      if (current == null || !Number.isFinite(current)) return score + 1;
      return score + (Math.abs(current - candidate) / Math.max(candidate, 1));
    }, 0);
  };

  const rows = lookupRows.map((row, index) => {
    const rowId = `manual-${index}`;
    const selected = dimensionsMatch(currentDimensionsMm, row.dimensions);
    if (selected) {
      selectedFamilyRowId = rowId;
    }

    const rowInput = buildInputWithManualDimensions(input, row.dimensions);
    const { areaMm2, perimeterMm } = getAreaAndPerimeter(rowInput);

    return {
      id: rowId,
      label: row.label,
      profileId,
      mode: "manual" as const,
      selected,
      dimensionsMm: row.dimensions,
      areaMm2,
      perimeterMm,
      massPerMeterKg: getMassPerMeterKg(areaMm2, densityKgPerM3),
      score: scoreRow(row.dimensions),
    };
  }).sort((left, right) => {
    if (left.selected !== right.selected) return left.selected ? -1 : 1;
    return left.score - right.score;
  });

  return {
    rows: rows.map(({ score, ...row }) => row),
    selectedFamilyRowId,
  };
}

function buildStructuralAlternativeRows(
  input: CalculationInput,
  profileId: ProfileId,
  selectedSizeId: string,
  densityKgPerM3: number | null,
): { rows: ProfileSpecsFamilyRow[]; selectedFamilyRowId: string } | null {
  if (!STRUCTURAL_ALTERNATIVE_GROUPS[profileId]?.length) return null;

  const currentProfile = getProfileById(profileId);
  if (!currentProfile || currentProfile.mode !== "standard") return null;

  const selectedIndex = currentProfile.sizes.findIndex((size) => size.id === selectedSizeId);
  const selectedSize = currentProfile.sizes[selectedIndex];
  if (!selectedSize) return null;

  const currentCalculation = calculateMetal(buildStandardSelectionInput(input, profileId, selectedSizeId));
  if (!currentCalculation.ok) return null;

  const currentResult = currentCalculation.result;
  const impactMode = resolveAlternativeImpactMode(input, currentResult);

  type CandidateRow = ProfileSpecsFamilyRow & {
    recommendationScore: number;
  };

  const candidates = currentProfile.sizes.flatMap((size, index) => {
    const selected = size.id === selectedSizeId;
    const massPerMeterKg = getMassPerMeterKg(size.areaMm2, densityKgPerM3);

    const candidateCalculation = calculateMetal(buildStandardSelectionInput(input, profileId, size.id));
    if (!candidateCalculation.ok) return [];

    const result = candidateCalculation.result;
    const fitDeltaPercent = currentResult.unitWeightKg > 0
      ? ((result.unitWeightKg - currentResult.unitWeightKg) / currentResult.unitWeightKg) * 100
      : 0;
    const impactValue = impactMode === "currency"
      ? result.grandTotalAmount - currentResult.grandTotalAmount
      : result.totalWeightKg - currentResult.totalWeightKg;
    const recommendationScore = selected
      ? Number.POSITIVE_INFINITY
      : fitDeltaPercent >= 0
        ? Math.abs(fitDeltaPercent) + (Math.abs(index - selectedIndex) * 0.001)
        : 1000 + Math.abs(fitDeltaPercent) + (Math.abs(index - selectedIndex) * 0.001);

    return [{
      id: size.id,
      label: size.label,
      profileId,
      mode: "standard" as const,
      selected,
      sizeId: size.id,
      areaMm2: size.areaMm2,
      perimeterMm: size.perimeterMm ?? null,
      massPerMeterKg,
      fitDeltaPercent,
      impactValue,
      impactMode,
      recommendationScore,
    }];
  });

  return {
    rows: candidates.map(({ recommendationScore, ...row }) => row),
    selectedFamilyRowId: selectedSizeId,
  };
}

export function resolveProfileSpecs(input: CalculationInput): ResolvedProfileSpecs | null {
  const profile = getProfileById(input.profileId);
  if (!profile) return null;
  const densityKgPerM3 = resolveDensityKgPerM3(input);

  if (profile.mode === "standard") {
    const selectedSize = profile.sizes.find((size) => size.id === input.selectedSizeId) ?? profile.sizes[0];
    if (!selectedSize) return null;

    const record = getStandardProfileSpecRecord(profile.id, selectedSize.id);
    const geometry = record?.geometry ?? null;
    const metrics = geometry
      ? buildMetrics({
          input,
          profileId: profile.id,
          geometry,
          areaMm2: selectedSize.areaMm2,
          perimeterMm: selectedSize.perimeterMm ?? null,
        })
      : [];
    const structuralAlternatives = buildStructuralAlternativeRows(input, profile.id, selectedSize.id, densityKgPerM3);

    return {
      profileId: profile.id,
      profileLabel: profile.label,
      selectedLabel: selectedSize.label,
      formulaLabel: profile.formulaLabel,
      referenceLabels: dedupe([profile.referenceLabel, selectedSize.referenceLabel]),
      drawingKind: record?.drawingKind ?? null,
      geometry,
      metrics,
      familyMode: STRUCTURAL_ALTERNATIVE_GROUPS[profile.id] ? "alternatives" : "lookup",
      familyRows: structuralAlternatives?.rows
        ?? profile.sizes.map((size) => ({
          id: size.id,
          label: size.label,
          profileId: profile.id,
          mode: "standard" as const,
          selected: size.id === selectedSize.id,
          sizeId: size.id,
          areaMm2: size.areaMm2,
          perimeterMm: size.perimeterMm ?? null,
          massPerMeterKg: getMassPerMeterKg(size.areaMm2, densityKgPerM3),
        })),
      selectedFamilyRowId: structuralAlternatives?.selectedFamilyRowId
        ?? selectedSize.id,
      isCustomSelection: false,
    };
  }

  const dimensionsMm = getManualDimensionsMm(input, profile);
  const manualGeometry = resolveManualGeometry(profile.id, dimensionsMm);
  const canResolveManualMetrics = hasRequiredManualDimensions(profile, dimensionsMm);
  const manualMetrics = canResolveManualMetrics
    ? getAreaAndPerimeter(input)
    : { areaMm2: null, perimeterMm: null };
  const family = buildManualFamilyRows(input, profile.id, dimensionsMm);
  const selectedLabel = family.selectedFamilyRowId
    ? family.rows.find((row) => row.id === family.selectedFamilyRowId)?.label ?? profile.label
    : canResolveManualMetrics
      ? buildManualSelectionLabel(profile.id, dimensionsMm, profile.label)
      : profile.label;

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    selectedLabel,
    formulaLabel: profile.formulaLabel,
    referenceLabels: dedupe([profile.referenceLabel]),
    drawingKind: manualGeometry?.drawingKind ?? null,
    geometry: manualGeometry?.geometry ?? null,
    metrics: manualGeometry
      ? buildMetrics({
          input,
          profileId: profile.id,
          geometry: manualGeometry.geometry,
          areaMm2: manualMetrics.areaMm2,
          perimeterMm: manualMetrics.perimeterMm,
        })
      : [],
    familyMode: "lookup",
    familyRows: family.rows,
    selectedFamilyRowId: family.selectedFamilyRowId,
    isCustomSelection: family.selectedFamilyRowId == null,
  };
}
