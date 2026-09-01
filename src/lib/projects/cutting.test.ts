import { describe, expect, it } from "vitest";
import {
  extractProjectCutGroups,
  computeProjectProcurementSummary,
  generateSupplierRfqText,
} from "./cutting";
import type { Project } from "@/hooks/useProjects";

describe("extractProjectCutGroups", () => {
  it("groups project items with matching profile and grade", () => {
    const project: Project = {
      id: "p1",
      name: "Warehouse Framing",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      calculations: [
        {
          id: "c1",
          timestamp: "2026-08-01T10:00:00.000Z",
          note: "Main columns",
          input: {
            profileCategory: "structural",
            profileId: "beam_hea_en",
            materialGradeId: "steel-s235jr",
            dimensions: { height: 114, width: 120 },
            length: 4,
            lengthUnit: "m",
            quantity: 4,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 1.5,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "beam_hea_en",
            profileLabel: "HEA 120",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 2530,
            lengthMm: 4000,
            quantity: 4,
            unitWeightKg: 79.44,
            totalWeightKg: 317.76,
            totalWeightLb: 700.54,
            unitPriceAmount: 1.5,
            subtotalAmount: 476.64,
            wasteAmount: 0,
            subtotalWithWasteAmount: 476.64,
            vatAmount: 0,
            grandTotalAmount: 476.64,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "EN 10025",
            datasetVersion: "1.0",
            referenceLabels: [],
            dimensions: { height: 114, width: 120 },
          },
          normalizedProfile: { category: "structural", id: "beam_hea_en", mode: "standard" },
        },
        {
          id: "c2",
          timestamp: "2026-08-01T10:05:00.000Z",
          note: "Header beams",
          input: {
            profileCategory: "structural",
            profileId: "beam_hea_en",
            materialGradeId: "steel-s235jr",
            dimensions: { height: 114, width: 120 },
            length: 2.8,
            lengthUnit: "m",
            quantity: 2,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 1.5,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "beam_hea_en",
            profileLabel: "HEA 120",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 2530,
            lengthMm: 2800,
            quantity: 2,
            unitWeightKg: 55.61,
            totalWeightKg: 111.22,
            totalWeightLb: 245.2,
            unitPriceAmount: 1.5,
            subtotalAmount: 166.83,
            wasteAmount: 0,
            subtotalWithWasteAmount: 166.83,
            vatAmount: 0,
            grandTotalAmount: 166.83,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "EN 10025",
            datasetVersion: "1.0",
            referenceLabels: [],
            dimensions: { height: 114, width: 120 },
          },
          normalizedProfile: { category: "structural", id: "beam_hea_en", mode: "standard" },
        },
        {
          id: "c3",
          timestamp: "2026-08-01T10:10:00.000Z",
          input: {
            profileCategory: "tubes",
            profileId: "square_hollow",
            materialGradeId: "steel-s235jr",
            dimensions: { side: 50, thickness: 3 },
            length: 1.5,
            lengthUnit: "m",
            quantity: 6,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 1.8,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "square_hollow",
            profileLabel: "SHS 50x50x3",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 564,
            lengthMm: 1500,
            quantity: 6,
            unitWeightKg: 6.64,
            totalWeightKg: 39.85,
            totalWeightLb: 87.85,
            unitPriceAmount: 1.8,
            subtotalAmount: 71.73,
            wasteAmount: 0,
            subtotalWithWasteAmount: 71.73,
            vatAmount: 0,
            grandTotalAmount: 71.73,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "EN 10219",
            datasetVersion: "1.0",
            referenceLabels: [],
            dimensions: { side: 50, thickness: 3 },
          },
          normalizedProfile: { category: "tubes", id: "square_hollow", mode: "manual" },
        },
      ],
    };

    const groups = extractProjectCutGroups(project);

    // Should have 2 cut groups: HEA 120 (S235JR) and SHS 50x50x3 (S235JR)
    expect(groups.length).toBe(2);

    const heaGroup = groups.find((g) => g.profileId === "beam_hea_en");
    expect(heaGroup).toBeDefined();
    expect(heaGroup?.totalPieces).toBe(6); // 4 + 2
    expect(heaGroup?.totalLengthMm).toBe(4 * 4000 + 2 * 2800); // 21600 mm
    expect(heaGroup?.pieces.length).toBe(2);

    const shsGroup = groups.find((g) => g.profileId === "square_hollow");
    expect(shsGroup).toBeDefined();
    expect(shsGroup?.totalPieces).toBe(6);
    expect(shsGroup?.totalLengthMm).toBe(6 * 1500); // 9000 mm
  });

  it("extracts 2D plate groups and calculates area m²", () => {
    const project: Project = {
      id: "p2",
      name: "Flange Base Plates",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      calculations: [
        {
          id: "c1",
          timestamp: "2026-08-01T10:00:00.000Z",
          note: "Base plates",
          input: {
            profileCategory: "plates_sheets",
            profileId: "plate",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              width: { value: 400, unit: "mm" },
              thickness: { value: 10, unit: "mm" },
            },
            length: { value: 0.6, unit: "m" },
            quantity: 8,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 2.0,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "plate",
            profileLabel: "Plate 400×10",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 4000,
            lengthMm: 600,
            quantity: 8,
            unitWeightKg: 18.84,
            totalWeightKg: 150.72,
            totalWeightLb: 332.28,
            unitPriceAmount: 2.0,
            subtotalAmount: 301.44,
            wasteAmount: 0,
            subtotalWithWasteAmount: 301.44,
            vatAmount: 0,
            grandTotalAmount: 301.44,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "EN 10029",
            datasetVersion: "1.0",
            referenceLabels: [],
            dimensions: { width: 400, thickness: 10 },
          },
          normalizedProfile: { category: "plates_sheets", id: "plate", mode: "manual" },
        },
      ],
    };

    const groups = extractProjectCutGroups(project);
    expect(groups.length).toBe(1);
    expect(groups[0].kind).toBe("2d_plate");
    expect(groups[0].thicknessMm).toBe(10);
    expect(groups[0].platePieces?.length).toBe(1);
    expect(groups[0].platePieces?.[0].widthMm).toBe(400);
    expect(groups[0].platePieces?.[0].lengthMm).toBe(600);
    expect(groups[0].platePieces?.[0].quantity).toBe(8);
    // Area: 8 * (0.4 * 0.6) = 1.92 m²
    expect(groups[0].totalAreaM2).toBeCloseTo(1.92, 2);
  });

  it("computes project procurement summary and generates supplier RFQ", () => {
    const project: Project = {
      id: "p3",
      name: "Mezzanine Floor",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      calculations: [
        {
          id: "c1",
          timestamp: "2026-08-01T10:00:00.000Z",
          note: "Columns",
          input: {
            profileCategory: "structural",
            profileId: "beam_hea_en",
            materialGradeId: "steel-s235jr",
            dimensions: { height: 114, width: 120 },
            length: 4,
            lengthUnit: "m",
            quantity: 4,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 1.5,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "beam_hea_en",
            profileLabel: "HEA 120",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 2530,
            lengthMm: 4000,
            quantity: 4,
            unitWeightKg: 79.44,
            totalWeightKg: 317.76,
            totalWeightLb: 700.54,
            unitPriceAmount: 1.5,
            subtotalAmount: 476.64,
            wasteAmount: 0,
            subtotalWithWasteAmount: 476.64,
            vatAmount: 0,
            grandTotalAmount: 476.64,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "EN 10025",
            datasetVersion: "1.0",
            referenceLabels: [],
            dimensions: { height: 114, width: 120 },
          },
          normalizedProfile: { category: "structural", id: "beam_hea_en", mode: "standard" },
        },
      ],
    };

    const summary = computeProjectProcurementSummary(project);
    expect(summary.items.length).toBe(1);
    expect(summary.totalBarsCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalRawWeightKg).toBeGreaterThan(0);
    expect(summary.totalNetWeightKg).toBeCloseTo(317.76, 1);

    const rfq = generateSupplierRfqText(summary, project.name);
    expect(rfq).toContain("Mezzanine Floor");
    expect(rfq).toContain("HEA 120");
    expect(rfq).toContain("SUMMARY:");
  });
});
