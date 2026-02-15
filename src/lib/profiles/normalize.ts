import type { CalculationInput } from "@/lib/calculator/types";
import { roundTo, toMillimeters } from "@/lib/calculator/units";
import { getProfileById } from "@/lib/datasets/profiles";
import type { DimensionKey, ProfileCategory, ProfileDefinition } from "@/lib/datasets/types";

export const PROFILE_FORMAT_VERSION = 1;

export interface NormalizedProfileSnapshot {
  formatVersion: number;
  iconKey: ProfileCategory;
  shortLabel: string;
  canonicalKey: string;
}

function formatMm(value: number): string {
  const rounded = roundTo(value, 3);
  if (!Number.isFinite(rounded)) return "?";
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(3).replace(/\.?0+$/, "");
}

function fixedMm(value: number): string {
  if (!Number.isFinite(value)) return "nan";
  return roundTo(value, 3).toFixed(3);
}

function normalizeSizeLabel(label: string): string {
  return label.replace(/\u00D7/g, "x");
}

function dimMm(input: CalculationInput, key: DimensionKey): number | null {
  const dimension = input.manualDimensions[key];
  if (!dimension) return null;
  const value = toMillimeters(dimension.value, dimension.unit);
  return Number.isFinite(value) ? value : null;
}

function labelForStandard(profile: ProfileDefinition, input: CalculationInput, lengthMm: number): { label: string; canonical: string } {
  if (profile.mode !== "standard") {
    return {
      label: `${profile.label} x L ${formatMm(lengthMm)} mm`,
      canonical: `profile=${profile.id}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
    };
  }

  const selectedSize = profile.sizes.find((size) => size.id === input.selectedSizeId) ?? profile.sizes[0];
  const sizeLabel = selectedSize ? normalizeSizeLabel(selectedSize.label) : profile.label;
  return {
    label: `${sizeLabel} x L ${formatMm(lengthMm)} mm`,
    canonical: `profile=${profile.id}|size=${selectedSize?.id ?? "none"}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
  };
}

function manualSnapshot(profile: ProfileDefinition, input: CalculationInput, lengthMm: number): { label: string; canonical: string } {
  const diameter = dimMm(input, "diameter");
  const side = dimMm(input, "side");
  const width = dimMm(input, "width");
  const height = dimMm(input, "height");
  const thickness = dimMm(input, "thickness");
  const outerDiameter = dimMm(input, "outerDiameter");
  const wallThickness = dimMm(input, "wallThickness");
  const patternHeight = dimMm(input, "patternHeight");
  const legA = dimMm(input, "legA");
  const legB = dimMm(input, "legB");

  switch (profile.id) {
    case "round_bar":
      return {
        label: `Round Bar Dia ${formatMm(diameter ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=round_bar|d=${fixedMm(diameter ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "square_bar":
      return {
        label: `Square Bar ${formatMm(side ?? NaN)} x ${formatMm(side ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=square_bar|side=${fixedMm(side ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "flat_bar":
      return {
        label: `Flat Bar ${formatMm(width ?? NaN)} x ${formatMm(thickness ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=flat_bar|w=${fixedMm(width ?? NaN)}|t=${fixedMm(thickness ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "angle":
      return {
        label: `Angle ${formatMm(legA ?? NaN)} x ${formatMm(legB ?? NaN)} x ${formatMm(thickness ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=angle|a=${fixedMm(legA ?? NaN)}|b=${fixedMm(legB ?? NaN)}|t=${fixedMm(thickness ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "pipe":
      return {
        label: `Round Tube OD ${formatMm(outerDiameter ?? NaN)} x WT ${formatMm(wallThickness ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=pipe|od=${fixedMm(outerDiameter ?? NaN)}|wt=${fixedMm(wallThickness ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "rectangular_tube":
      return {
        label: `Rect Tube ${formatMm(width ?? NaN)} x ${formatMm(height ?? NaN)} x ${formatMm(wallThickness ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=rectangular_tube|w=${fixedMm(width ?? NaN)}|h=${fixedMm(height ?? NaN)}|wt=${fixedMm(wallThickness ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "square_hollow":
      return {
        label: `SHS ${formatMm(side ?? NaN)} x ${formatMm(side ?? NaN)} x ${formatMm(wallThickness ?? NaN)} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=square_hollow|side=${fixedMm(side ?? NaN)}|wt=${fixedMm(wallThickness ?? NaN)}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
    case "sheet":
      return {
        label: `Sheet ${formatMm(width ?? NaN)} x ${formatMm(lengthMm)} x ${formatMm(thickness ?? NaN)} mm`,
        canonical: `profile=sheet|w=${fixedMm(width ?? NaN)}|len=${fixedMm(lengthMm)}|t=${fixedMm(thickness ?? NaN)}|qty=${input.quantity}`,
      };
    case "plate":
      return {
        label: `Plate ${formatMm(width ?? NaN)} x ${formatMm(lengthMm)} x ${formatMm(thickness ?? NaN)} mm`,
        canonical: `profile=plate|w=${fixedMm(width ?? NaN)}|len=${fixedMm(lengthMm)}|t=${fixedMm(thickness ?? NaN)}|qty=${input.quantity}`,
      };
    case "chequered_plate":
      return {
        label: `Chequered Plate ${formatMm(width ?? NaN)} x ${formatMm(lengthMm)} x ${formatMm(thickness ?? NaN)}+${formatMm(patternHeight ?? NaN)} mm`,
        canonical: `profile=chequered_plate|w=${fixedMm(width ?? NaN)}|len=${fixedMm(lengthMm)}|t=${fixedMm(thickness ?? NaN)}|p=${fixedMm(patternHeight ?? NaN)}|qty=${input.quantity}`,
      };
    case "expanded_metal":
      return {
        label: `Expanded Metal ${formatMm(width ?? NaN)} x ${formatMm(lengthMm)} x t${formatMm(thickness ?? NaN)} mm`,
        canonical: `profile=expanded_metal|w=${fixedMm(width ?? NaN)}|len=${fixedMm(lengthMm)}|t=${fixedMm(thickness ?? NaN)}|qty=${input.quantity}`,
      };
    case "corrugated_sheet":
      return {
        label: `Corrugated Sheet ${formatMm(width ?? NaN)} x ${formatMm(lengthMm)} x t${formatMm(thickness ?? NaN)} mm`,
        canonical: `profile=corrugated_sheet|w=${fixedMm(width ?? NaN)}|len=${fixedMm(lengthMm)}|t=${fixedMm(thickness ?? NaN)}|qty=${input.quantity}`,
      };
    default:
      return {
        label: `${profile.label} x L ${formatMm(lengthMm)} mm`,
        canonical: `profile=${profile.id}|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
      };
  }
}

export function normalizeProfileSnapshot(input: CalculationInput): NormalizedProfileSnapshot {
  const profile = getProfileById(input.profileId);
  const lengthMm = toMillimeters(input.length.value, input.length.unit);

  if (!profile) {
    return {
      formatVersion: PROFILE_FORMAT_VERSION,
      iconKey: "bars",
      shortLabel: "Unknown Profile",
      canonicalKey: `profile=unknown|len=${fixedMm(lengthMm)}|qty=${input.quantity}`,
    };
  }

  const normalized = profile.mode === "manual"
    ? manualSnapshot(profile, input, lengthMm)
    : labelForStandard(profile, input, lengthMm);

  return {
    formatVersion: PROFILE_FORMAT_VERSION,
    iconKey: profile.category,
    shortLabel: normalized.label,
    canonicalKey: normalized.canonical,
  };
}
