import { describe, it, expect } from "vitest";
import { beamSectionDimGuide, parseStandardSizeGeometry } from "./standard-size-geometry";

describe("parseStandardSizeGeometry", () => {
  it("parses beam designation depth", () => {
    expect(parseStandardSizeGeometry("beam_ipe_en", "IPE 200")).toEqual({ depthMm: 200 });
    expect(parseStandardSizeGeometry("beam_hea_en", "HEA 100")).toEqual({ depthMm: 100 });
  });

  it("parses channel depth", () => {
    expect(parseStandardSizeGeometry("channel_upn_en", "UPN 200")).toEqual({ depthMm: 200 });
    expect(parseStandardSizeGeometry("channel_upe_en", "UPE 80")).toEqual({ depthMm: 80 });
  });

  it("parses tee legs and thickness", () => {
    expect(parseStandardSizeGeometry("tee_en", "T 50×50×6")).toEqual({
      legMm: 50,
      secondLegMm: 50,
      thicknessMm: 6,
    });
    expect(parseStandardSizeGeometry("tee_en", "T 100×100×10")).toEqual({
      legMm: 100,
      secondLegMm: 100,
      thicknessMm: 10,
    });
  });

  it("returns empty for unrelated labels", () => {
    expect(parseStandardSizeGeometry("beam_ipe_en", "")).toEqual({});
    expect(parseStandardSizeGeometry("round_bar", "IPE 200")).toEqual({});
  });
});

describe("beamSectionDimGuide", () => {
  it("returns wider vx for heavier families", () => {
    expect(beamSectionDimGuide("beam_ipe_en").vx).toBeLessThan(beamSectionDimGuide("beam_hem_en").vx);
  });
});
