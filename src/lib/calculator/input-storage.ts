import type { CalculationInput } from "@/lib/calculator/types";
import type { MetalFamilyId, ProfileDefinition } from "@/lib/datasets/types";
import { getMaterialGradesByFamily } from "@/lib/datasets/materials";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";

export const INPUT_STORAGE_KEY = "advanced-calc-input-v1";

export function loadPersistedInput(): CalculationInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INPUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: number; input: CalculationInput };
    if (parsed?.v === 1 && parsed.input) return parsed.input;
    return null;
  } catch {
    return null;
  }
}

export function persistInput(input: CalculationInput): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INPUT_STORAGE_KEY, JSON.stringify({ v: 1, input }));
  } catch { /* quota exceeded — ignore */ }
}

function profileDefaults(profile: ProfileDefinition): {
  selectedSizeId?: string;
  manualDimensions: CalculationInput["manualDimensions"];
} {
  if (profile.mode === "standard") {
    return { selectedSizeId: profile.sizes[0]?.id, manualDimensions: {} };
  }
  const dims: CalculationInput["manualDimensions"] = {};
  for (const dimension of profile.dimensions) {
    dims[dimension.key] = { value: dimension.defaultMm, unit: "mm" };
  }
  return { manualDimensions: dims };
}

/** The seed input used when no persisted value exists yet — also the baseline
 *  for read-modify-write in settings-stores. */
export function getDefaultInput(): CalculationInput {
  const defaultFamily: MetalFamilyId = "steel";
  const defaultGrade = getMaterialGradesByFamily(defaultFamily)[0];
  const defaultProfile = PROFILE_DEFINITIONS[0];
  const seed = profileDefaults(defaultProfile);

  return {
    materialGradeId: defaultGrade.id,
    useCustomDensity: false,
    customDensityKgPerM3: 7850,
    profileId: defaultProfile.id,
    selectedSizeId: seed.selectedSizeId,
    manualDimensions: seed.manualDimensions,
    length: { value: 6000, unit: "mm" },
    quantity: 1,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 21,
    rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
  };
}
