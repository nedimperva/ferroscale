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
const MAX_STANDARD_NEARBY_ROWS = 4;
const MAX_MANUAL_NEARBY_ROWS = 5;
const STANDARD_ALTERNATIVE_GROUPS: Partial<Record<ProfileId, readonly ProfileId[]>> = {
  beam_ipe_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_ipn_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_hea_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_heb_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  beam_hem_en: ["beam_ipe_en", "beam_ipn_en", "beam_hea_en", "beam_heb_en", "beam_hem_en"],
  channel_upn_en: ["channel_upn_en", "channel_upe_en"],
  channel_upe_en: ["channel_upn_en", "channel_upe_en"],
  tee_en: ["tee_en"],
};
const MANUAL_ALTERNATIVE_GROUPS: Partial<Record<ProfileId, readonly ProfileId[]>> = {
  square_hollow: ["square_hollow", "rectangular_tube"],
  rectangular_tube: ["square_hollow", "rectangular_tube"],
};

export type ProfileSpecsFamilyMode = "lookup" | "alternatives";
export type ProfileSpecsImpactMode = "currency" | "weight";
export type ProfileSpecsMatchKind = "current" | "exact_peer" | "nearest_peer" | "same_family_nearby";

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
  familyLabel: string;
  mode: "standard" | "manual";
  selected: boolean;
  matchKind: ProfileSpecsMatchKind;
  matchLabel: string;
  comparisonKey: string | null;
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

function getProfileFamilyLabel(profileId: ProfileId): string {
  return getProfileById(profileId)?.label ?? profileId;
}

function buildMatchLabel(matchKind: ProfileSpecsMatchKind): string {
  switch (matchKind) {
    case "current":
      return "Current";
    case "exact_peer":
      return "Exact peer";
    case "nearest_peer":
      return "Nearest peer";
    case "same_family_nearby":
      return "Same family";
  }
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

type ComparableDimensions = Record<string, number>;

function getComparableDimensions(
  profileId: ProfileId,
  dimensionsMm: Partial<Record<DimensionKey, number>>,
): ComparableDimensions {
  switch (profileId) {
    case "square_hollow": {
      if (!Number.isFinite(dimensionsMm.side) || !Number.isFinite(dimensionsMm.wallThickness)) return {};
      return {
        outerWidth: dimensionsMm.side!,
        outerHeight: dimensionsMm.side!,
        wallThickness: dimensionsMm.wallThickness!,
      };
    }
    case "rectangular_tube": {
      if (
        !Number.isFinite(dimensionsMm.width)
        || !Number.isFinite(dimensionsMm.height)
        || !Number.isFinite(dimensionsMm.wallThickness)
      ) return {};
      const width = Math.max(dimensionsMm.width!, dimensionsMm.height!);
      const height = Math.min(dimensionsMm.width!, dimensionsMm.height!);
      return {
        outerWidth: width,
        outerHeight: height,
        wallThickness: dimensionsMm.wallThickness!,
      };
    }
    default:
      return Object.fromEntries(
        Object.entries(dimensionsMm).filter(([, value]) => Number.isFinite(value)),
      ) as ComparableDimensions;
  }
}

function buildManualComparisonKey(
  profileId: ProfileId,
  dimensionsMm: Partial<Record<DimensionKey, number>>,
): string | null {
  const comparable = getComparableDimensions(profileId, dimensionsMm);
  const entries = Object.entries(comparable);
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => `${key}:${formatMm(value)}`).join("|");
}

function comparableDimensionsMatch(
  left: ComparableDimensions,
  right: ComparableDimensions,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length === 0 || leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every((key) => {
    const leftValue = left[key];
    const rightValue = right[key];
    return rightValue != null && Math.abs(leftValue - rightValue) <= MATCH_TOLERANCE_MM;
  });
}

function scoreComparableDimensions(
  current: ComparableDimensions,
  candidate: ComparableDimensions,
): number {
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(candidate)]));
  if (keys.length === 0) return Number.POSITIVE_INFINITY;

  return keys.reduce((score, key) => {
    const currentValue = current[key];
    const candidateValue = candidate[key];
    if (!Number.isFinite(currentValue) || !Number.isFinite(candidateValue)) return score + 1;
    return score + (Math.abs(currentValue - candidateValue) / Math.max(candidateValue, 1));
  }, 0);
}

function getStandardComparisonKey(label: string): string | null {
  const nominal = parseLeadingNumber(label);
  return nominal > 0 ? String(nominal) : null;
}

function parseComparisonNumber(comparisonKey: string | null): number {
  if (!comparisonKey) return Number.POSITIVE_INFINITY;
  const numeric = Number(comparisonKey);
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

function getStandardNearbyWindow(comparisonNumber: number): number {
  if (!Number.isFinite(comparisonNumber)) return 60;
  return Math.max(40, comparisonNumber * 0.35);
}

function buildAlternativeRow({
  id,
  label,
  profileId,
  mode,
  selected,
  matchKind,
  comparisonKey,
  areaMm2,
  perimeterMm,
  massPerMeterKg,
  fitDeltaPercent,
  impactValue,
  impactMode,
  sizeId,
  dimensionsMm,
}: {
  id: string;
  label: string;
  profileId: ProfileId;
  mode: "standard" | "manual";
  selected: boolean;
  matchKind: ProfileSpecsMatchKind;
  comparisonKey: string | null;
  areaMm2: number | null;
  perimeterMm: number | null;
  massPerMeterKg: number | null;
  fitDeltaPercent?: number | null;
  impactValue?: number | null;
  impactMode?: ProfileSpecsImpactMode;
  sizeId?: string;
  dimensionsMm?: Partial<Record<DimensionKey, number>>;
}): ProfileSpecsFamilyRow {
  return {
    id,
    label,
    profileId,
    familyLabel: getProfileFamilyLabel(profileId),
    mode,
    selected,
    matchKind,
    matchLabel: buildMatchLabel(matchKind),
    comparisonKey,
    sizeId,
    dimensionsMm,
    areaMm2,
    perimeterMm,
    massPerMeterKg,
    fitDeltaPercent,
    impactValue,
    impactMode,
  };
}

function buildManualFamilyRows(
  input: CalculationInput,
  profileId: ProfileId,
  currentDimensionsMm: Partial<Record<DimensionKey, number>>,
): { rows: ProfileSpecsFamilyRow[]; selectedFamilyRowId: string | null } {
  const comparisonProfiles = MANUAL_ALTERNATIVE_GROUPS[profileId] ?? [profileId];
  const densityKgPerM3 = resolveDensityKgPerM3(input);
  const currentCalculation = calculateMetal(input);
  const currentResult = currentCalculation.ok ? currentCalculation.result : null;
  const impactMode = currentResult ? resolveAlternativeImpactMode(input, currentResult) : null;
  const currentComparable = getComparableDimensions(profileId, currentDimensionsMm);
  const currentComparisonKey = buildManualComparisonKey(profileId, currentDimensionsMm);
  const currentAreaPerimeter = getAreaAndPerimeter(input);
  const currentMassPerMeterKg = getMassPerMeterKg(currentAreaPerimeter.areaMm2, densityKgPerM3);

  let selectedFamilyRowId: string | null = null;
  let currentRow: ProfileSpecsFamilyRow | null = null;
  const exactPeers: ProfileSpecsFamilyRow[] = [];
  const sameFamilyNearby: Array<ProfileSpecsFamilyRow & { score: number }> = [];
  const nearestPeerCandidates = new Map<ProfileId, Array<ProfileSpecsFamilyRow & { score: number }>>();

  for (const candidateProfileId of comparisonProfiles) {
    const lookupRows = getStandardSizesForProfile(candidateProfileId);

    lookupRows.forEach((row, index) => {
      const rowId = `${candidateProfileId}-manual-${index}`;
      const rowInput = buildInputWithManualDimensions(
        candidateProfileId === profileId ? input : { ...input, profileId: candidateProfileId, selectedSizeId: undefined },
        row.dimensions,
      );
      const comparable = getComparableDimensions(candidateProfileId, row.dimensions);
      const comparisonKey = buildManualComparisonKey(candidateProfileId, row.dimensions);
      const score = scoreComparableDimensions(currentComparable, comparable);
      const isExact = comparableDimensionsMatch(currentComparable, comparable);
      const { areaMm2, perimeterMm } = getAreaAndPerimeter(rowInput);
      const rowCalculation = calculateMetal(rowInput);
      const rowResult = rowCalculation.ok ? rowCalculation.result : null;
      const fitDeltaPercent = currentResult && rowResult && currentResult.unitWeightKg > 0
        ? ((rowResult.unitWeightKg - currentResult.unitWeightKg) / currentResult.unitWeightKg) * 100
        : null;
      const impactValue = currentResult && rowResult && impactMode
        ? impactMode === "currency"
          ? rowResult.grandTotalAmount - currentResult.grandTotalAmount
          : rowResult.totalWeightKg - currentResult.totalWeightKg
        : null;

      const baseRow = buildAlternativeRow({
        id: rowId,
        label: row.label,
        profileId: candidateProfileId,
        mode: "manual",
        selected: false,
        matchKind: "same_family_nearby",
        comparisonKey,
        dimensionsMm: row.dimensions,
        areaMm2,
        perimeterMm,
        massPerMeterKg: getMassPerMeterKg(areaMm2, densityKgPerM3),
        fitDeltaPercent,
        impactValue,
        impactMode: impactMode ?? undefined,
      });

      if (candidateProfileId === profileId && isExact && selectedFamilyRowId == null) {
        selectedFamilyRowId = rowId;
        currentRow = { ...baseRow, selected: true, matchKind: "current", matchLabel: buildMatchLabel("current") };
        return;
      }

      if (candidateProfileId !== profileId && isExact) {
        exactPeers.push({
          ...baseRow,
          matchKind: "exact_peer",
          matchLabel: buildMatchLabel("exact_peer"),
        });
        return;
      }

      if (candidateProfileId === profileId) {
        sameFamilyNearby.push({ ...baseRow, score });
        return;
      }

      const candidates = nearestPeerCandidates.get(candidateProfileId) ?? [];
      candidates.push({
        ...baseRow,
        matchKind: "nearest_peer",
        matchLabel: buildMatchLabel("nearest_peer"),
        score,
      });
      nearestPeerCandidates.set(candidateProfileId, candidates);
    });
  }

  if (!currentRow && currentComparisonKey) {
    currentRow = buildAlternativeRow({
      id: `current-${profileId}`,
      label: buildManualSelectionLabel(profileId, currentDimensionsMm, getProfileFamilyLabel(profileId)),
      profileId,
      mode: "manual",
      selected: true,
      matchKind: "current",
      comparisonKey: currentComparisonKey,
      dimensionsMm: currentDimensionsMm,
      areaMm2: currentAreaPerimeter.areaMm2,
      perimeterMm: currentAreaPerimeter.perimeterMm,
      massPerMeterKg: currentMassPerMeterKg,
      impactValue: 0,
      impactMode: impactMode ?? undefined,
    });
  }

  const exactPeerFamilies = new Set(exactPeers.map((row) => row.profileId));
  const nearestPeers = comparisonProfiles
    .filter((candidateProfileId) => candidateProfileId !== profileId && !exactPeerFamilies.has(candidateProfileId))
    .flatMap((candidateProfileId) => {
      const candidates = nearestPeerCandidates.get(candidateProfileId) ?? [];
      if (candidates.length === 0) return [];
      return [candidates.sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))[0]];
    });

  const rows: ProfileSpecsFamilyRow[] = [
    ...(currentRow ? [currentRow] : []),
    ...exactPeers,
    ...nearestPeers,
    ...sameFamilyNearby
      .sort((left, right) => left.score - right.score || left.label.localeCompare(right.label))
      .slice(0, MAX_MANUAL_NEARBY_ROWS)
      .map((candidate) => {
        const { score, ...row } = candidate;
        void score;
        return row;
      }),
  ];

  return {
    rows,
    selectedFamilyRowId,
  };
}

function buildStructuralAlternativeRows(
  input: CalculationInput,
  profileId: ProfileId,
  selectedSizeId: string,
  densityKgPerM3: number | null,
): { rows: ProfileSpecsFamilyRow[]; selectedFamilyRowId: string } | null {
  const comparisonProfiles = STANDARD_ALTERNATIVE_GROUPS[profileId];
  if (!comparisonProfiles?.length) return null;

  const currentProfile = getProfileById(profileId);
  if (!currentProfile || currentProfile.mode !== "standard") return null;

  const selectedSize = currentProfile.sizes.find((size) => size.id === selectedSizeId);
  if (!selectedSize) return null;

  const currentCalculation = calculateMetal(buildStandardSelectionInput(input, profileId, selectedSizeId));
  if (!currentCalculation.ok) return null;

  const currentResult = currentCalculation.result;
  const impactMode = resolveAlternativeImpactMode(input, currentResult);
  const currentComparisonKey = getStandardComparisonKey(selectedSize.label);
  const currentComparisonNumber = parseComparisonNumber(currentComparisonKey);
  const sameFamilyWindow = getStandardNearbyWindow(currentComparisonNumber);
  const currentRow = buildAlternativeRow({
    id: selectedSize.id,
    label: selectedSize.label,
    profileId,
    mode: "standard",
    selected: true,
    matchKind: "current",
    comparisonKey: currentComparisonKey,
    sizeId: selectedSize.id,
    areaMm2: selectedSize.areaMm2,
    perimeterMm: selectedSize.perimeterMm ?? null,
    massPerMeterKg: getMassPerMeterKg(selectedSize.areaMm2, densityKgPerM3),
    impactValue: 0,
    impactMode,
  });

  const exactPeers: ProfileSpecsFamilyRow[] = [];
  const sameFamilyNearby: Array<ProfileSpecsFamilyRow & { nominalDistance: number; areaDistance: number }> = [];
  const nearestPeerCandidates = new Map<
    ProfileId,
    Array<ProfileSpecsFamilyRow & { nominalDistance: number; areaDistance: number }>
  >();

  for (const candidateProfileId of comparisonProfiles) {
    const candidateProfile = getProfileById(candidateProfileId);
    if (!candidateProfile || candidateProfile.mode !== "standard") continue;

    for (const size of candidateProfile.sizes) {
      if (candidateProfileId === profileId && size.id === selectedSizeId) continue;

      const candidateComparisonKey = getStandardComparisonKey(size.label);
      const candidateComparisonNumber = parseComparisonNumber(candidateComparisonKey);
      const candidateCalculation = calculateMetal(buildStandardSelectionInput(input, candidateProfileId, size.id));
      if (!candidateCalculation.ok) continue;

      const result = candidateCalculation.result;
      const fitDeltaPercent = currentResult.unitWeightKg > 0
        ? ((result.unitWeightKg - currentResult.unitWeightKg) / currentResult.unitWeightKg) * 100
        : 0;
      const impactValue = impactMode === "currency"
        ? result.grandTotalAmount - currentResult.grandTotalAmount
        : result.totalWeightKg - currentResult.totalWeightKg;
      const areaDistance = Math.abs(size.areaMm2 - selectedSize.areaMm2);
      const nominalDistance = Math.abs(candidateComparisonNumber - currentComparisonNumber);

      const baseRow = buildAlternativeRow({
        id: `${candidateProfileId}-${size.id}`,
        label: size.label,
        profileId: candidateProfileId,
        mode: "standard",
        selected: false,
        matchKind: "same_family_nearby",
        comparisonKey: candidateComparisonKey,
        sizeId: size.id,
        areaMm2: size.areaMm2,
        perimeterMm: size.perimeterMm ?? null,
        massPerMeterKg: getMassPerMeterKg(size.areaMm2, densityKgPerM3),
        fitDeltaPercent,
        impactValue,
        impactMode,
      });

      if (
        candidateProfileId !== profileId
        && currentComparisonKey != null
        && candidateComparisonKey === currentComparisonKey
      ) {
        exactPeers.push({
          ...baseRow,
          matchKind: "exact_peer",
          matchLabel: buildMatchLabel("exact_peer"),
        });
        continue;
      }

      if (candidateProfileId === profileId) {
        sameFamilyNearby.push({ ...baseRow, nominalDistance, areaDistance });
        continue;
      }

      const candidates = nearestPeerCandidates.get(candidateProfileId) ?? [];
      candidates.push({
        ...baseRow,
        matchKind: "nearest_peer",
        matchLabel: buildMatchLabel("nearest_peer"),
        nominalDistance,
        areaDistance,
      });
      nearestPeerCandidates.set(candidateProfileId, candidates);
    }
  }

  const exactPeerFamilies = new Set(exactPeers.map((row) => row.profileId));
  const nearestPeers = comparisonProfiles
    .filter((candidateProfileId) => candidateProfileId !== profileId && !exactPeerFamilies.has(candidateProfileId))
    .flatMap((candidateProfileId) => {
      const candidates = nearestPeerCandidates.get(candidateProfileId) ?? [];
      if (candidates.length === 0) return [];
      return [candidates.sort((left, right) =>
        left.nominalDistance - right.nominalDistance
        || left.areaDistance - right.areaDistance
        || left.label.localeCompare(right.label))[0]];
    });

  return {
    rows: [
      currentRow,
      ...exactPeers,
      ...nearestPeers,
      ...sameFamilyNearby
        .sort((left, right) =>
          left.nominalDistance - right.nominalDistance
          || left.areaDistance - right.areaDistance
          || left.label.localeCompare(right.label))
        .filter((candidate) => candidate.nominalDistance <= sameFamilyWindow)
        .slice(0, MAX_STANDARD_NEARBY_ROWS)
        .map((candidate) => {
          const { nominalDistance, areaDistance, ...row } = candidate;
          void nominalDistance;
          void areaDistance;
          return row;
        }),
    ],
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
      familyMode: "alternatives",
      familyRows: structuralAlternatives?.rows
        ?? profile.sizes.map((size) => buildAlternativeRow({
          id: size.id,
          label: size.label,
          profileId: profile.id,
          mode: "standard",
          selected: size.id === selectedSize.id,
          matchKind: size.id === selectedSize.id ? "current" : "same_family_nearby",
          comparisonKey: getStandardComparisonKey(size.label),
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
    familyMode: "alternatives",
    familyRows: family.rows,
    selectedFamilyRowId: family.selectedFamilyRowId,
    isCustomSelection: family.selectedFamilyRowId == null,
  };
}
