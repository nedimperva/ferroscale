import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { DimensionKey } from "@/lib/datasets/types";
import { getDefaultInput } from "@/hooks/useCalculator";

/**
 * Encode calculation inputs into URL search parameters for sharing.
 * Uses short param names to keep URLs reasonable.
 */
export function encodeInputToParams(input: CalculationInput): URLSearchParams {
  const defaults = getDefaultInput();
  const params = new URLSearchParams();

  // Always include profile ID
  params.set("p", input.profileId);

  if (input.selectedSizeId) params.set("s", input.selectedSizeId);
  if (input.materialGradeId !== defaults.materialGradeId) params.set("g", input.materialGradeId);
  if (input.length.value !== defaults.length.value) params.set("l", String(input.length.value));
  if (input.length.unit !== defaults.length.unit) params.set("lu", input.length.unit);
  if (input.quantity !== defaults.quantity) params.set("q", String(input.quantity));

  // Manual dimensions
  for (const [key, dim] of Object.entries(input.manualDimensions)) {
    if (dim) {
      params.set(`d.${key}`, String(dim.value));
      if (dim.unit !== "mm") params.set(`du.${key}`, dim.unit);
    }
  }

  // Custom density
  if (input.useCustomDensity && input.customDensityKgPerM3) {
    params.set("cd", String(input.customDensityKgPerM3));
  }

  // Pricing (only if non-default)
  if (input.unitPrice !== defaults.unitPrice) params.set("up", String(input.unitPrice));
  if (input.priceBasis !== defaults.priceBasis) params.set("pb", input.priceBasis);
  if (input.currency !== defaults.currency) params.set("c", input.currency);
  if (input.wastePercent !== defaults.wastePercent) params.set("w", String(input.wastePercent));
  if (input.includeVat) params.set("vat", String(input.vatPercent));

  return params;
}

/**
 * Decode URL search parameters back into a CalculationInput.
 * Returns null if no valid profile param is found.
 */
export function decodeParamsToInput(params: URLSearchParams): CalculationInput | null {
  const profileId = params.get("p");
  if (!profileId) return null;

  const defaults = getDefaultInput();
  const manualDimensions: CalculationInput["manualDimensions"] = {};

  // Extract manual dimensions
  for (const [key, value] of params.entries()) {
    if (key.startsWith("d.")) {
      const dimKey = key.slice(2);
      const unitKey = `du.${dimKey}`;
      const unit = (params.get(unitKey) ?? "mm") as LengthUnit;
      manualDimensions[dimKey as DimensionKey] = { value: Number(value), unit };
    }
  }

  const vatParam = params.get("vat");
  const customDensity = params.get("cd");

  return {
    profileId: profileId as CalculationInput["profileId"],
    selectedSizeId: params.get("s") ?? undefined,
    materialGradeId: params.get("g") ?? defaults.materialGradeId,
    useCustomDensity: customDensity !== null,
    customDensityKgPerM3: customDensity ? Number(customDensity) : defaults.customDensityKgPerM3,
    manualDimensions,
    length: {
      value: params.has("l") ? Number(params.get("l")) : defaults.length.value,
      unit: (params.get("lu") ?? defaults.length.unit) as LengthUnit,
    },
    quantity: params.has("q") ? Number(params.get("q")) : defaults.quantity,
    unitPrice: params.has("up") ? Number(params.get("up")) : defaults.unitPrice,
    priceBasis: (params.get("pb") ?? defaults.priceBasis) as CalculationInput["priceBasis"],
    priceUnit: defaults.priceUnit,
    currency: (params.get("c") ?? defaults.currency) as CalculationInput["currency"],
    wastePercent: params.has("w") ? Number(params.get("w")) : defaults.wastePercent,
    includeVat: vatParam !== null,
    vatPercent: vatParam ? Number(vatParam) : defaults.vatPercent,
    rounding: defaults.rounding,
  };
}
