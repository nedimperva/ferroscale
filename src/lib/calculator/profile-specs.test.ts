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
    expect(specs?.familyRows[0]).toMatchObject({
      label: "HEA 200",
      matchKind: "current",
      profileId: "beam_hea_en",
    });
    expect(new Set(specs?.familyRows.map((row) => row.profileId))).toEqual(new Set([
      "beam_hea_en",
      "beam_ipe_en",
      "beam_ipn_en",
      "beam_heb_en",
      "beam_hem_en",
    ]));
  });

  it("orders structural alternatives by logical exact peers before same-family nearby sizes", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "beam_ipe_en" as const,
      selectedSizeId: "ipe100",
      manualDimensions: {},
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyMode).toBe("alternatives");
    expect(specs?.familyRows.slice(0, 5).map((row) => row.label)).toEqual([
      "IPE 100",
      "IPN 100",
      "HEA 100",
      "HEB 100",
      "HEM 100",
    ]);
    expect(specs?.familyRows.slice(0, 5).map((row) => row.matchKind)).toEqual([
      "current",
      "exact_peer",
      "exact_peer",
      "exact_peer",
      "exact_peer",
    ]);
    expect(specs?.familyRows.some((row) => row.label === "IPE 600")).toBe(false);
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
    expect(specs?.familyRows[0]).toMatchObject({
      selected: true,
      matchKind: "current",
      profileId: "rectangular_tube",
    });
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
    expect(specs?.familyRows.some((row) => row.profileId === "angle")).toBe(true);
    expect(specs?.familyRows.some((row) => row.profileId === "angle" && row.matchKind === "current")).toBe(true);
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
    expect(specs?.familyRows[0]).toMatchObject({
      matchKind: "current",
      selected: true,
    });
    expect(specs?.familyRows[0]?.label).toContain("37");
    expect(specs?.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(["diameter", "areaMm2", "perimeterMm"]),
    );
  });

  it("uses nearest peer fallbacks when no exact nominal channel peer exists", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "channel_upn_en" as const,
      selectedSizeId: "upn50",
      manualDimensions: {},
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    const nearestPeer = specs?.familyRows.find((row) => row.profileId === "channel_upe_en");
    expect(nearestPeer).toMatchObject({
      label: "UPE 80",
      matchKind: "nearest_peer",
    });
    expect(specs?.familyRows[1]?.matchKind).toBe("nearest_peer");
  });

  it("matches SHS and RHS alternatives by normalized outer dimensions and thickness", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "square_hollow" as const,
      selectedSizeId: undefined,
      manualDimensions: {
        side: { value: 100, unit: "mm" as const },
        wallThickness: { value: 4, unit: "mm" as const },
      },
    };

    const specs = resolveProfileSpecs(input);

    expect(specs).not.toBeNull();
    expect(specs?.familyRows[0]).toMatchObject({
      profileId: "square_hollow",
      matchKind: "current",
    });
    expect(specs?.familyRows.some((row) =>
      row.profileId === "rectangular_tube"
      && (row.matchKind === "exact_peer" || row.matchKind === "nearest_peer"))).toBe(true);
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
