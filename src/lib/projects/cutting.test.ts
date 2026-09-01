import { describe, expect, it } from "vitest";
import { extractProjectCutGroups } from "./cutting";
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
});
