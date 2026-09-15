import { describe, expect, it } from "vitest";
import {
  extractProjectCutGroups,
  computeProjectProcurementSummary,
  generateSupplierRfqText,
  getProfileSectionLabel,
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
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "beam_hea_en",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              height: { value: 114, unit: "mm" },
              width: { value: 120, unit: "mm" },
            },
            length: { value: 4, unit: "m" },
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
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "structural", shortLabel: "HEA 120", canonicalKey: "profile=beam_hea_en|len=4000|qty=4" },
        },
        {
          id: "c2",
          timestamp: "2026-08-01T10:05:00.000Z",
          note: "Header beams",
          input: {
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "beam_hea_en",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              height: { value: 114, unit: "mm" },
              width: { value: 120, unit: "mm" },
            },
            length: { value: 2.8, unit: "m" },
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
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "structural", shortLabel: "HEA 120", canonicalKey: "profile=beam_hea_en|len=4000|qty=4" },
        },
        {
          id: "c3",
          timestamp: "2026-08-01T10:10:00.000Z",
          input: {
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "square_hollow",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              side: { value: 50, unit: "mm" },
              thickness: { value: 3, unit: "mm" },
            },
            length: { value: 1.5, unit: "m" },
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
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "tubes", shortLabel: "SHS 50x50x3", canonicalKey: "profile=square_hollow|len=1500|qty=6" },
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
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
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
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "plates_sheets", shortLabel: "Plate 400×10", canonicalKey: "profile=plate|len=600|qty=8" },
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
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "beam_hea_en",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              height: { value: 114, unit: "mm" },
              width: { value: 120, unit: "mm" },
            },
            length: { value: 4, unit: "m" },
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
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "structural", shortLabel: "HEA 120", canonicalKey: "profile=beam_hea_en|len=4000|qty=4" },
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

  it("differentiates different manual profile sizes in cut groups and RFQ order", () => {
    const project: Project = {
      id: "p-sizes",
      name: "Truss Structure",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      calculations: [
        {
          id: "c-angle-small",
          timestamp: "2026-08-01T10:00:00.000Z",
          input: {
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "angle",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              legA: { value: 50, unit: "mm" },
              legB: { value: 50, unit: "mm" },
              thickness: { value: 5, unit: "mm" },
            },
            length: { value: 2, unit: "m" },
            quantity: 4,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 2,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "angle",
            profileLabel: "Angle",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 475,
            lengthMm: 2000,
            quantity: 4,
            unitWeightKg: 7.46,
            totalWeightKg: 29.84,
            totalWeightLb: 65.79,
            unitPriceAmount: 2,
            subtotalAmount: 59.68,
            wasteAmount: 0,
            subtotalWithWasteAmount: 59.68,
            vatAmount: 0,
            grandTotalAmount: 59.68,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "Manual",
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "bars", shortLabel: "Angle 50x50x5", canonicalKey: "k1" },
        },
        {
          id: "c-angle-large",
          timestamp: "2026-08-01T10:05:00.000Z",
          input: {
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "angle",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              legA: { value: 100, unit: "mm" },
              legB: { value: 100, unit: "mm" },
              thickness: { value: 10, unit: "mm" },
            },
            length: { value: 3, unit: "m" },
            quantity: 2,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 2,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "angle",
            profileLabel: "Angle",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 1900,
            lengthMm: 3000,
            quantity: 2,
            unitWeightKg: 44.75,
            totalWeightKg: 89.5,
            totalWeightLb: 197.3,
            unitPriceAmount: 2,
            subtotalAmount: 179,
            wasteAmount: 0,
            subtotalWithWasteAmount: 179,
            vatAmount: 0,
            grandTotalAmount: 179,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "Manual",
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "bars", shortLabel: "Angle 100x100x10", canonicalKey: "k2" },
        },
      ],
    };

    const groups = extractProjectCutGroups(project);
    expect(groups.length).toBe(2);

    const smallAngle = groups.find((g) => g.label.includes("Angle 50x50x5"));
    const largeAngle = groups.find((g) => g.label.includes("Angle 100x100x10"));
    expect(smallAngle).toBeDefined();
    expect(largeAngle).toBeDefined();
    expect(smallAngle?.pieces[0].lengthMm).toBe(2000);
    expect(smallAngle?.pieces[0].quantity).toBe(4);
    expect(largeAngle?.pieces[0].lengthMm).toBe(3000);
    expect(largeAngle?.pieces[0].quantity).toBe(2);

    const summary = computeProjectProcurementSummary(project);
    const rfq = generateSupplierRfqText(summary, project.name);
    expect(rfq).toContain("Angle 50x50x5 · S235JR");
    expect(rfq).toContain("Angle 100x100x10 · S235JR");
    expect(rfq).not.toMatch(/^\s*\d+\.\s+Angle\s+·/m);
  });

  it("extracts individual cut pieces without squaring piece counts in templates", () => {
    const project: Project = {
      id: "p-template-scale",
      name: "Balcony Railing",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      calculations: [
        {
          id: "c-composite-tpl",
          timestamp: "2026-08-01T10:00:00.000Z",
          templateName: "Stair Tread",
          quantityMultiplier: 4,
          input: {
            useCustomDensity: false,
            rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
            profileId: "angle",
            materialGradeId: "steel-s235jr",
            manualDimensions: {
              legA: { value: 50, unit: "mm" },
              legB: { value: 50, unit: "mm" },
              thickness: { value: 5, unit: "mm" },
            },
            length: { value: 1.5, unit: "m" },
            quantity: 8,
            priceBasis: "weight",
            priceUnit: "kg",
            unitPrice: 2,
            currency: "EUR",
            wastePercent: 0,
            includeVat: false,
            vatPercent: 0,
          },
          result: {
            profileId: "angle",
            profileLabel: "Angle 50x50x5",
            gradeLabel: "S235JR",
            densityKgPerM3: 7850,
            areaMm2: 475,
            lengthMm: 1500,
            quantity: 8,
            unitWeightKg: 5.59,
            totalWeightKg: 44.72,
            totalWeightLb: 98.59,
            unitPriceAmount: 2,
            subtotalAmount: 89.44,
            wasteAmount: 0,
            subtotalWithWasteAmount: 89.44,
            vatAmount: 0,
            grandTotalAmount: 89.44,
            currency: "EUR",
            priceBasis: "weight",
            priceUnit: "kg",
            formulaLabel: "Manual",
            breakdownRows: [],
            surfaceAreaM2: null,
            unitSurfaceAreaM2: null,
            datasetVersion: "1.0",
            referenceLabels: [],
          },
          normalizedProfile: { formatVersion: 1, iconKey: "bars", shortLabel: "Angle 50x50x5", canonicalKey: "k3" },
          templateParts: [
            {
              id: "part-1",
              name: "Step Bracket",
              input: {
                useCustomDensity: false,
                rounding: { weightDecimals: 3, priceDecimals: 2, dimensionDecimals: 2 },
                profileId: "angle",
                materialGradeId: "steel-s235jr",
                manualDimensions: {
                  legA: { value: 50, unit: "mm" },
                  legB: { value: 50, unit: "mm" },
                  thickness: { value: 5, unit: "mm" },
                },
                length: { value: 1.5, unit: "m" },
                quantity: 8, // 2 per unit * 4 units = 8
                priceBasis: "weight",
                priceUnit: "kg",
                unitPrice: 2,
                currency: "EUR",
                wastePercent: 0,
                includeVat: false,
                vatPercent: 0,
              },
              result: {
                profileId: "angle",
                profileLabel: "Angle",
                gradeLabel: "S235JR",
                densityKgPerM3: 7850,
                areaMm2: 475,
                lengthMm: 1500,
                quantity: 8,
                unitWeightKg: 5.59,
                totalWeightKg: 44.72,
                totalWeightLb: 98.59,
                unitPriceAmount: 2,
                subtotalAmount: 89.44,
                wasteAmount: 0,
                subtotalWithWasteAmount: 89.44,
                vatAmount: 0,
                grandTotalAmount: 89.44,
                currency: "EUR",
                priceBasis: "weight",
                priceUnit: "kg",
                formulaLabel: "Manual",
                breakdownRows: [],
                surfaceAreaM2: null,
                unitSurfaceAreaM2: null,
                datasetVersion: "1.0",
                referenceLabels: [],
              },
              normalizedProfile: { formatVersion: 1, iconKey: "bars", shortLabel: "Angle 50x50x5", canonicalKey: "k4" },
            },
          ],
        },
      ],
    };

    const groups = extractProjectCutGroups(project);
    expect(groups.length).toBe(1);
    expect(groups[0].label).toContain("Angle 50x50x5");
    expect(groups[0].totalPieces).toBe(8);
    expect(groups[0].pieces.length).toBe(1);
    expect(groups[0].pieces[0].lengthMm).toBe(1500);
    expect(groups[0].pieces[0].quantity).toBe(8); // exactly 8 pieces, NOT 8 * 4 = 32
  });
});

describe("getProfileSectionLabel", () => {
  it("formats section labels with explicit dimensions for manual and standard profiles", () => {
    // Angle
    const angleLabel = getProfileSectionLabel({
      profileId: "angle",
      manualDimensions: {
        legA: { value: 50, unit: "mm" },
        legB: { value: 50, unit: "mm" },
        thickness: { value: 5, unit: "mm" },
      },
    });
    expect(angleLabel).toBe("Angle 50x50x5");

    // Flat Bar
    const flatLabel = getProfileSectionLabel({
      profileId: "flat_bar",
      manualDimensions: {
        width: { value: 40, unit: "mm" },
        thickness: { value: 5, unit: "mm" },
      },
    });
    expect(flatLabel).toBe("Flat Bar 40x5");

    // SHS
    const shsLabel = getProfileSectionLabel({
      profileId: "square_hollow",
      manualDimensions: {
        side: { value: 40, unit: "mm" },
        thickness: { value: 3, unit: "mm" },
      },
    });
    expect(shsLabel).toBe("SHS 40x40x3");

    // RHS
    const rhsLabel = getProfileSectionLabel({
      profileId: "rectangular_tube",
      manualDimensions: {
        height: { value: 50, unit: "mm" },
        width: { value: 30, unit: "mm" },
        wallThickness: { value: 2, unit: "mm" },
      },
    });
    expect(rhsLabel).toBe("RHS 30x50x2");

    // CHS
    const chsLabel = getProfileSectionLabel({
      profileId: "pipe",
      manualDimensions: {
        outerDiameter: { value: 20, unit: "mm" },
        wallThickness: { value: 2, unit: "mm" },
      },
    });
    expect(chsLabel).toBe("CHS 20x2");

    // Round Bar
    const roundLabel = getProfileSectionLabel({
      profileId: "round_bar",
      manualDimensions: {
        diameter: { value: 20, unit: "mm" },
      },
    });
    expect(roundLabel).toBe("Round Bar Ø20");

    // Square Bar
    const squareLabel = getProfileSectionLabel({
      profileId: "square_bar",
      manualDimensions: {
        side: { value: 20, unit: "mm" },
      },
    });
    expect(squareLabel).toBe("Square Bar 20x20");

    // Plate
    const plateLabel = getProfileSectionLabel({
      profileId: "plate",
      manualDimensions: {
        thickness: { value: 4, unit: "mm" },
      },
    });
    expect(plateLabel).toBe("Plate 4 mm");

    // Standard profile with result
    const heaLabel = getProfileSectionLabel(
      { profileId: "beam_hea_en" },
      { profileId: "beam_hea_en", profileLabel: "HEA 120" },
    );
    expect(heaLabel).toBe("HEA 120");
  });
});

