import { describe, it, expect } from "vitest";
import { materialAvailability } from "./availability";

describe("materialAvailability", () => {
  it("says nothing about steel on an EN section", () => {
    expect(materialAvailability("beam_heb_en", "steel-s235jr")).toBeNull();
    expect(materialAvailability("beam_hea_en", "steel-s355jr")).toBeNull();
  });

  it("flags stainless EN sections as made to order, not unavailable", () => {
    const a = materialAvailability("beam_heb_en", "stainless-316");
    expect(a?.level).toBe("madeToOrder");
    expect(a?.referenceLabel).toBe("EN 10088-3");
  });

  it("flags aluminium EN sections as outside the series", () => {
    expect(materialAvailability("beam_hea_en", "al-6060")?.level).toBe("notInSeries");
    expect(materialAvailability("channel_upn_en", "al-6082")?.level).toBe("notInSeries");
    expect(materialAvailability("tee_en", "al-6060")?.referenceLabel).toBe("EN 755");
  });

  it("covers every EN section family", () => {
    for (const id of [
      "beam_ipe_en",
      "beam_ipn_en",
      "beam_hea_en",
      "beam_heb_en",
      "beam_hem_en",
      "channel_upn_en",
      "channel_upe_en",
      "tee_en",
    ] as const) {
      expect(materialAvailability(id, "stainless-304"), id).not.toBeNull();
      expect(materialAvailability(id, "al-6060"), id).not.toBeNull();
      expect(materialAvailability(id, "steel-s235jr"), id).toBeNull();
    }
  });

  it("says nothing about bars, tubes and plate in any family", () => {
    for (const id of [
      "round_bar",
      "square_bar",
      "flat_bar",
      "pipe",
      "square_hollow",
      "rectangular_tube",
      "sheet",
      "plate",
    ] as const) {
      for (const grade of ["steel-s235jr", "stainless-316", "al-6060"]) {
        expect(materialAvailability(id, grade), `${id}/${grade}`).toBeNull();
      }
    }
  });

  it("flags 7075 only where it is not a stock form", () => {
    // Aerospace alloy: plate, sheet, bar and tube are stocked; sections are not.
    expect(materialAvailability("plate", "al-7075")).toBeNull();
    expect(materialAvailability("round_bar", "al-7075")).toBeNull();
    expect(materialAvailability("pipe", "al-7075")).toBeNull();
    expect(materialAvailability("angle", "al-7075")?.level).toBe("notInSeries");
    expect(materialAvailability("chequered_plate", "al-7075")?.level).toBe("notInSeries");
  });

  it("returns null rather than throwing for anything unknown", () => {
    expect(materialAvailability("beam_hea_en", "nope")).toBeNull();
  });
});
