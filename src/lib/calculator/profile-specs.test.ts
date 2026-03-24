import { describe, expect, it } from "vitest";
import { getDefaultInput } from "@/hooks/useCalculator";
import { resolveProfileSpecs } from "./profile-specs";

describe("resolveProfileSpecs", () => {
  it("resolves synced standard-profile specs for structural sections", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "beam_hea_en" as const,
      selectedSizeId: "hea200",
      manualDimensions: {},
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.drawingKind).toBe("ibeam");
    expect(specs?.selectedFamilyRowId).toBe("hea200");
    expect(specs?.geometry?.heightMm).toBeGreaterThan(150);
    expect(specs?.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(["height", "width", "webThickness", "flangeThickness", "areaMm2"]),
    );
    expect(specs?.familyRows).toHaveLength(24);
    expect(new Set(specs?.familyRows.map((row) => row.profileId))).toEqual(new Set(["beam_hea_en"]));
  });

  it("keeps alternatives driven only by the selected active size", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "beam_ipn_en" as const,
      selectedSizeId: "ipn80",
      manualDimensions: {},
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyMode).toBe("alternatives");
    expect(specs?.familyRows.some((row) => row.selected && row.label === "IPN 80")).toBe(true);
    expect(specs?.familyRows.every((row) => !("recommended" in row))).toBe(true);
  });

  it("matches commercial lookup rows for manual hollow sections", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "rectangular_tube" as const,
      selectedSizeId: undefined,
      manualDimensions: {
        width: { value: 120, unit: "mm" as const },
        height: { value: 80, unit: "mm" as const },
        wallThickness: { value: 4, unit: "mm" as const },
      },
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyMode).toBe("alternatives");
    expect(specs?.drawingKind).toBe("rect_hollow");
    expect(specs?.isCustomSelection).toBe(false);
    expect(specs?.selectedFamilyRowId).not.toBeNull();
    expect(specs?.familyRows.some((row) => row.selected)).toBe(true);
    expect(specs?.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(["width", "height", "wallThickness", "areaMm2", "perimeterMm"]),
    );
  });

  it("includes unequal angle lookup rows and matches them in the specs family table", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "angle" as const,
      selectedSizeId: undefined,
      manualDimensions: {
        legA: { value: 80, unit: "mm" as const },
        legB: { value: 60, unit: "mm" as const },
        thickness: { value: 8, unit: "mm" as const },
      },
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyMode).toBe("alternatives");
    expect(specs?.drawingKind).toBe("angle");
    expect(specs?.isCustomSelection).toBe(false);
    expect(specs?.familyRows.some((row) => row.label.includes("80×60×8"))).toBe(true);
    expect(specs?.familyRows.some((row) => row.selected && row.label.includes("80×60×8"))).toBe(true);
  });

  it("keeps manual custom sizes unmatched while still computing specs", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "round_bar" as const,
      selectedSizeId: undefined,
      manualDimensions: {
        diameter: { value: 37, unit: "mm" as const },
      },
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyMode).toBe("alternatives");
    expect(specs?.drawingKind).toBe("round");
    expect(specs?.isCustomSelection).toBe(true);
    expect(specs?.selectedFamilyRowId).toBeNull();
    expect(specs?.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(["diameter", "areaMm2", "perimeterMm"]),
    );
  });

  it("provides curated lookup rows for manual sheet-style families that did not have them before", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "corrugated_sheet" as const,
      selectedSizeId: undefined,
      manualDimensions: {
        width: { value: 1000, unit: "mm" as const },
        thickness: { value: 0.7, unit: "mm" as const },
      },
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyMode).toBe("alternatives");
    expect(specs?.drawingKind).toBe("corrugated");
    expect(specs?.familyRows.length).toBeGreaterThan(0);
    expect(specs?.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(["width", "thickness", "waveHeight", "wavePitch"]),
    );
  });
});
