import { DATASET_VERSION } from "../datasets/version";
import { getMaterialGradeById } from "../datasets/materials";
import { getProfileById } from "../datasets/profiles";
import type {
  CalculationInput,
  CalculationResponse,
  BreakdownRow,
  PriceBasis,
} from "./types";
import { CURRENCY_SYMBOLS } from "./types";
import {
  kilogramsToPounds,
  manualDimensionsToMm,
  metersToFeet,
  millimetersToMeters,
  roundTo,
  toMillimeters,
} from "./units";
import { validateCalculationInput } from "./validation";

export function resolveAreaMm2(input: CalculationInput): { areaMm2: number; expression: string } {
  const profile = getProfileById(input.profileId);
  if (!profile) {
    return { areaMm2: 0, expression: "Invalid profile" };
  }

  if (profile.mode === "standard") {
    const size = profile.sizes.find((item) => item.id === input.selectedSizeId);
    if (!size) {
      return { areaMm2: 0, expression: "Missing EN size selection" };
    }

    return {
      areaMm2: size.areaMm2,
      expression: `A from EN size table (${size.label})`,
    };
  }

  // Manual profiles carry their own formula on the definition.
  return profile.area(manualDimensionsToMm(input.manualDimensions));
}

export function resolvePerimeterMm(input: CalculationInput): { perimeterMm: number | null; expression: string } {
  const profile = getProfileById(input.profileId);
  if (!profile) {
    return { perimeterMm: null, expression: "Invalid profile" };
  }

  if (profile.mode === "standard") {
    const size = profile.sizes.find((item) => item.id === input.selectedSizeId);
    if (!size || size.perimeterMm == null) {
      return { perimeterMm: null, expression: "Perimeter data not available for this EN size" };
    }
    return {
      perimeterMm: size.perimeterMm,
      expression: `P from EN size table (${size.label})`,
    };
  }

  const resolved = profile.perimeter(manualDimensionsToMm(input.manualDimensions));
  return { perimeterMm: resolved.perimeterMm, expression: resolved.expression };
}

function calculateUnitPrice(
  basis: PriceBasis,
  priceUnit: CalculationInput["priceUnit"],
  unitPrice: number,
  unitWeightKg: number,
  pieceLengthMm: number,
): { unitPriceAmount: number; expression: string } {
  if (basis === "weight") {
    if (priceUnit === "lb") {
      const unitWeightLb = kilogramsToPounds(unitWeightKg);
      return {
        unitPriceAmount: unitWeightLb * unitPrice,
        expression: `${unitWeightLb.toFixed(6)} lb * ${unitPrice}`,
      };
    }

    return {
      unitPriceAmount: unitWeightKg * unitPrice,
      expression: `${unitWeightKg.toFixed(6)} kg * ${unitPrice}`,
    };
  }

  if (basis === "length") {
    const lengthM = millimetersToMeters(pieceLengthMm);
    if (priceUnit === "ft") {
      const lengthFt = metersToFeet(lengthM);
      return {
        unitPriceAmount: lengthFt * unitPrice,
        expression: `${lengthFt.toFixed(6)} ft * ${unitPrice}`,
      };
    }

    return {
      unitPriceAmount: lengthM * unitPrice,
      expression: `${lengthM.toFixed(6)} m * ${unitPrice}`,
    };
  }

  return {
    unitPriceAmount: unitPrice,
    expression: `${unitPrice} / piece`,
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function calculateMetal(input: CalculationInput): CalculationResponse {
  const issues = validateCalculationInput(input);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const profile = getProfileById(input.profileId);
  if (!profile) {
    return {
      ok: false,
      issues: [{
        field: "profileId",
        message: "Profile not found.",
        messageKey: "validation.profileNotFound",
      }],
    };
  }

  const grade = getMaterialGradeById(input.materialGradeId);
  const densityKgPerM3 = input.useCustomDensity ? input.customDensityKgPerM3 ?? 0 : grade?.densityKgPerM3 ?? 0;
  const gradeLabel = input.useCustomDensity ? "Custom density input" : grade?.label ?? "Unknown";

  const lengthMm = toMillimeters(input.length.value, input.length.unit);
  const { areaMm2, expression: areaExpression } = resolveAreaMm2(input);
  const volumePerPieceM3 = (areaMm2 * lengthMm) / 1_000_000_000;

  const unitWeightKg = volumePerPieceM3 * densityKgPerM3;
  const rawTotalWeightKg = unitWeightKg * input.quantity;
  const wasteMultiplier = 1 + input.wastePercent / 100;
  const totalWeightKg = rawTotalWeightKg * wasteMultiplier;
  const totalWeightLb = kilogramsToPounds(totalWeightKg);

  const price = calculateUnitPrice(input.priceBasis, input.priceUnit, input.unitPrice, unitWeightKg, lengthMm);
  const subtotalAmount = price.unitPriceAmount * input.quantity;
  const wasteAmount = subtotalAmount * (wasteMultiplier - 1);
  const subtotalWithWasteAmount = subtotalAmount + wasteAmount;
  const vatAmount = input.includeVat ? subtotalWithWasteAmount * (input.vatPercent / 100) : 0;
  const grandTotalAmount = subtotalWithWasteAmount + vatAmount;

  const { perimeterMm, expression: perimeterExpression } = resolvePerimeterMm(input);
  let unitSurfaceAreaM2: number | null = null;
  let surfaceAreaM2: number | null = null;
  if (perimeterMm != null) {
    unitSurfaceAreaM2 = (perimeterMm / 1000) * (lengthMm / 1000);
    surfaceAreaM2 = unitSurfaceAreaM2 * input.quantity;
  }

  const rows: BreakdownRow[] = [
    {
      label: "Cross-section area",
      labelKey: "resultRows.crossSectionArea",
      expression: areaExpression,
      value: areaMm2,
      unit: "mm2",
    },
    {
      label: "Volume per piece",
      labelKey: "resultRows.volumePerPiece",
      expression: `${areaMm2.toFixed(4)} * ${lengthMm.toFixed(4)} / 1e9`,
      value: volumePerPieceM3,
      unit: "m3",
    },
    {
      label: "Unit weight",
      labelKey: "resultRows.unitWeight",
      expression: `${volumePerPieceM3.toExponential(6)} * ${densityKgPerM3}`,
      value: unitWeightKg,
      unit: "kg",
    },
    {
      label: "Unit price",
      labelKey: "resultRows.unitPrice",
      expression: price.expression,
      value: price.unitPriceAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    },
    {
      label: "Subtotal",
      labelKey: "resultRows.subtotal",
      expression: `${price.unitPriceAmount.toFixed(4)} * ${input.quantity}`,
      value: subtotalAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    },
    {
      label: "Waste adjustment",
      labelKey: "resultRows.wasteAdjustment",
      expression: `${subtotalAmount.toFixed(4)} * (${input.wastePercent}/100)`,
      value: wasteAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    },
  ];

  if (input.includeVat) {
    rows.push({
      label: "VAT",
      labelKey: "resultRows.vat",
      expression: `${subtotalWithWasteAmount.toFixed(4)} * (${input.vatPercent}/100)`,
      value: vatAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    });
  }

  if (perimeterMm != null && surfaceAreaM2 != null) {
    rows.push({
      label: "Surface area",
      labelKey: "resultRows.surfaceArea",
      expression: perimeterExpression + ` → ${(perimeterMm / 1000).toFixed(6)} m × ${(lengthMm / 1000).toFixed(6)} m × ${input.quantity}`,
      value: surfaceAreaM2,
      unit: "m2",
    });
  }

  const sizeReference =
    profile.mode === "standard"
      ? profile.sizes.find((item) => item.id === input.selectedSizeId)?.referenceLabel
      : undefined;

  const references = dedupe(
    [
      `Dataset ${DATASET_VERSION}`,
      profile.referenceLabel,
      sizeReference,
      input.useCustomDensity ? "User-provided custom density" : grade?.referenceLabel,
    ].filter((value): value is string => Boolean(value)),
  );

  return {
    ok: true,
    result: {
      profileId: profile.id,
      profileLabel: profile.label,
      gradeLabel,
      densityKgPerM3: roundTo(densityKgPerM3, input.rounding.dimensionDecimals),
      areaMm2: roundTo(areaMm2, input.rounding.dimensionDecimals),
      lengthMm: roundTo(lengthMm, input.rounding.dimensionDecimals),
      quantity: input.quantity,
      unitWeightKg: roundTo(unitWeightKg, input.rounding.weightDecimals),
      totalWeightKg: roundTo(totalWeightKg, input.rounding.weightDecimals),
      totalWeightLb: roundTo(totalWeightLb, input.rounding.weightDecimals),
      unitPriceAmount: roundTo(price.unitPriceAmount, input.rounding.priceDecimals),
      subtotalAmount: roundTo(subtotalAmount, input.rounding.priceDecimals),
      wasteAmount: roundTo(wasteAmount, input.rounding.priceDecimals),
      subtotalWithWasteAmount: roundTo(subtotalWithWasteAmount, input.rounding.priceDecimals),
      vatAmount: roundTo(vatAmount, input.rounding.priceDecimals),
      grandTotalAmount: roundTo(grandTotalAmount, input.rounding.priceDecimals),
      currency: input.currency,
      priceBasis: input.priceBasis,
      priceUnit: input.priceUnit,
      formulaLabel: profile.formulaLabel,
      datasetVersion: DATASET_VERSION,
      referenceLabels: references,
      surfaceAreaM2: surfaceAreaM2 != null ? roundTo(surfaceAreaM2, input.rounding.dimensionDecimals) : null,
      unitSurfaceAreaM2: unitSurfaceAreaM2 != null ? roundTo(unitSurfaceAreaM2, input.rounding.dimensionDecimals) : null,
      breakdownRows: rows.map((row) => ({
        ...row,
        value: roundTo(
          row.value,
          row.unit === CURRENCY_SYMBOLS[input.currency] ? input.rounding.priceDecimals : input.rounding.dimensionDecimals,
        ),
      })),
    },
  };
}
