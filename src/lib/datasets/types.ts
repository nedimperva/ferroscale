export type MetalFamilyId = "steel" | "stainless_steel" | "aluminum";

export interface MetalFamily {
  id: MetalFamilyId;
  label: string;
  referenceLabel: string;
}

export interface MaterialGrade {
  id: string;
  familyId: MetalFamilyId;
  label: string;
  densityKgPerM3: number;
  referenceLabel: string;
}

export type ProfileId =
  | "round_bar"
  | "square_bar"
  | "flat_bar"
  | "hex_bar"
  | "sheet"
  | "plate"
  | "pipe"
  | "rectangular_tube"
  | "angle_equal_en"
  | "channel_upn_en"
  | "beam_ipe_en"
  | "tee_en";

export type DimensionKey =
  | "diameter"
  | "side"
  | "width"
  | "height"
  | "thickness"
  | "outerDiameter"
  | "wallThickness"
  | "acrossFlats";

export interface DimensionDefinition {
  key: DimensionKey;
  label: string;
  minMm: number;
  maxMm: number;
  defaultMm: number;
}

export interface StandardSizeOption {
  id: string;
  label: string;
  areaMm2: number;
  referenceLabel: string;
}

export interface ManualProfileDefinition {
  id: ProfileId;
  label: string;
  mode: "manual";
  formulaLabel: string;
  referenceLabel: string;
  dimensions: DimensionDefinition[];
}

export interface StandardProfileDefinition {
  id: ProfileId;
  label: string;
  mode: "standard";
  formulaLabel: string;
  referenceLabel: string;
  sizes: StandardSizeOption[];
}

export type ProfileDefinition = ManualProfileDefinition | StandardProfileDefinition;
