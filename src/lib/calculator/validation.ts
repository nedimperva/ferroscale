import { getMaterialGradeById } from "@/lib/datasets/materials";
import { getProfileById } from "@/lib/datasets/profiles";
import type { CalculationInput, ValidationIssue } from "@/lib/calculator/types";
import { toMillimeters } from "@/lib/calculator/units";

const MAX_LENGTH_MM = 50_000;
const MAX_UNIT_PRICE = 1_000_000;
const MAX_QUANTITY = 10_000;

export function validateCalculationInput(input: CalculationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const profile = getProfileById(input.profileId);
  const grade = getMaterialGradeById(input.materialGradeId);

  if (!profile) {
    issues.push({ field: "profileId", message: "Select a valid profile type." });
    return issues;
  }

  if (!input.useCustomDensity && !grade) {
    issues.push({ field: "materialGradeId", message: "Select a valid material grade." });
  }

  if (input.useCustomDensity) {
    if (typeof input.customDensityKgPerM3 !== "number" || Number.isNaN(input.customDensityKgPerM3)) {
      issues.push({ field: "customDensityKgPerM3", message: "Enter a custom density value." });
    } else if (input.customDensityKgPerM3 < 100 || input.customDensityKgPerM3 > 25_000) {
      issues.push({
        field: "customDensityKgPerM3",
        message: "Custom density must be between 100 and 25,000 kg/m3.",
      });
    }
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > MAX_QUANTITY) {
    issues.push({
      field: "quantity",
      message: `Quantity must be between 1 and ${MAX_QUANTITY}.`,
    });
  }

  const lengthMm = toMillimeters(input.length.value, input.length.unit);
  if (!Number.isFinite(lengthMm) || lengthMm <= 0 || lengthMm > MAX_LENGTH_MM) {
    issues.push({
      field: "length",
      message: `Length must be between 1 mm and ${MAX_LENGTH_MM} mm.`,
    });
  }

  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0 || input.unitPrice > MAX_UNIT_PRICE) {
    issues.push({
      field: "unitPrice",
      message: `Unit price must be between 0 and ${MAX_UNIT_PRICE}.`,
    });
  }

  if (!Number.isFinite(input.wastePercent) || input.wastePercent < 0 || input.wastePercent > 100) {
    issues.push({
      field: "wastePercent",
      message: "Waste percent must be between 0 and 100.",
    });
  }

  if (input.includeVat && (!Number.isFinite(input.vatPercent) || input.vatPercent < 0 || input.vatPercent > 35)) {
    issues.push({
      field: "vatPercent",
      message: "VAT percent must be between 0 and 35.",
    });
  }

  if (profile.mode === "standard") {
    if (!input.selectedSizeId) {
      issues.push({
        field: "selectedSizeId",
        message: "Select a standard EN size.",
      });
    } else if (!profile.sizes.some((size) => size.id === input.selectedSizeId)) {
      issues.push({
        field: "selectedSizeId",
        message: "Selected size is not valid for this profile.",
      });
    }
  } else {
    for (const dimension of profile.dimensions) {
      const value = input.manualDimensions[dimension.key];
      if (!value) {
        issues.push({
          field: `manualDimensions.${dimension.key}`,
          message: `${dimension.label} is required.`,
        });
        continue;
      }

      const mmValue = toMillimeters(value.value, value.unit);
      if (!Number.isFinite(mmValue) || mmValue < dimension.minMm || mmValue > dimension.maxMm) {
        issues.push({
          field: `manualDimensions.${dimension.key}`,
          message: `${dimension.label} must be between ${dimension.minMm} mm and ${dimension.maxMm} mm.`,
        });
      }
    }

    if (profile.id === "pipe") {
      const od = input.manualDimensions.outerDiameter;
      const wall = input.manualDimensions.wallThickness;
      if (od && wall) {
        const odMm = toMillimeters(od.value, od.unit);
        const wallMm = toMillimeters(wall.value, wall.unit);
        if (wallMm * 2 >= odMm) {
          issues.push({
            field: "manualDimensions.wallThickness",
            message: "Wall thickness must be less than half of the outer diameter.",
          });
        }
      }
    }

    if (profile.id === "rectangular_tube") {
      const width = input.manualDimensions.width;
      const height = input.manualDimensions.height;
      const wall = input.manualDimensions.wallThickness;
      if (width && height && wall) {
        const widthMm = toMillimeters(width.value, width.unit);
        const heightMm = toMillimeters(height.value, height.unit);
        const wallMm = toMillimeters(wall.value, wall.unit);
        if (wallMm * 2 >= Math.min(widthMm, heightMm)) {
          issues.push({
            field: "manualDimensions.wallThickness",
            message: "Wall thickness must be less than half of width and height.",
          });
        }
      }
    }
  }

  if (input.priceBasis === "weight" && !["kg", "lb"].includes(input.priceUnit)) {
    issues.push({
      field: "priceUnit",
      message: "Weight-based pricing requires kg or lb.",
    });
  }

  if (input.priceBasis === "length" && !["m", "ft"].includes(input.priceUnit)) {
    issues.push({
      field: "priceUnit",
      message: "Length-based pricing requires m or ft.",
    });
  }

  if (input.priceBasis === "piece" && input.priceUnit !== "piece") {
    issues.push({
      field: "priceUnit",
      message: "Piece-based pricing requires piece unit.",
    });
  }

  return issues;
}
