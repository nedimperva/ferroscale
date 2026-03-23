import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import messages from "../../../messages/en.json";
import type { ProfileId, ProfileSpecDrawingKind, ProfileSpecGeometry } from "@/lib/datasets/types";
import { getDefaultInput } from "@/hooks/useCalculator";
import { ProfileSpecsDrawing, ProfileSpecsPanel } from "./profile-specs-panel";

function renderDrawing(
  profileId: ProfileId,
  drawingKind: ProfileSpecDrawingKind,
  geometry: ProfileSpecGeometry,
): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Sarajevo">
      <ProfileSpecsDrawing profileId={profileId} drawingKind={drawingKind} geometry={geometry} />
    </NextIntlClientProvider>,
  );
}

describe("ProfileSpecsDrawing", () => {
  it.each<[string, ProfileId, ProfileSpecDrawingKind, ProfileSpecGeometry]>([
    ["round", "round_bar", "round", { diameterMm: 60 }],
    ["hollow", "rectangular_tube", "rect_hollow", { widthMm: 120, heightMm: 80, wallThicknessMm: 4 }],
    ["sheet", "sheet", "sheet", { widthMm: 1250, thicknessMm: 2 }],
    ["angle-unequal", "angle", "angle", { legAMm: 80, legBMm: 60, thicknessMm: 8 }],
    ["ipe", "beam_ipe_en", "ibeam", { heightMm: 200, widthMm: 100, webThicknessMm: 5.6, flangeThicknessMm: 8.5, rootRadiusMm: 12 }],
    ["ipn", "beam_ipn_en", "ibeam", { heightMm: 200, widthMm: 90, webThicknessMm: 7.5, flangeThicknessMm: 11.3, rootRadiusMm: 11 }],
    ["hea", "beam_hea_en", "ibeam", { heightMm: 190, widthMm: 200, webThicknessMm: 6.5, flangeThicknessMm: 10, rootRadiusMm: 18 }],
    ["upe", "channel_upe_en", "channel", { heightMm: 200, widthMm: 80, webThicknessMm: 7.4, flangeThicknessMm: 11, rootRadiusMm: 12 }],
    ["upn", "channel_upn_en", "channel", { heightMm: 200, widthMm: 75, webThicknessMm: 8, flangeThicknessMm: 11, rootRadiusMm: 12 }],
    ["tee", "tee_en", "tee", { heightMm: 80, widthMm: 80, webThicknessMm: 8, flangeThicknessMm: 8, rootRadiusMm: 6 }],
    ["expanded", "expanded_metal", "expanded", { widthMm: 1250, thicknessMm: 3, meshPitchMm: 60, strandWidthMm: 6 }],
    ["corrugated", "corrugated_sheet", "corrugated", { widthMm: 1000, thicknessMm: 0.7, waveHeightMm: 18, wavePitchMm: 76 }],
  ])("renders %s drawing snapshot", (_name, profileId, drawingKind, geometry) => {
    expect(renderDrawing(profileId, drawingKind, geometry)).toMatchSnapshot();
  });

  it("renders the desktop specs panel for the active column selection", () => {
    const input = {
      ...getDefaultInput(),
      profileId: "beam_hea_en" as const,
      selectedSizeId: "hea200",
      manualDimensions: {},
    };

    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Sarajevo">
        <ProfileSpecsPanel
          input={input}
          onSelectStandardSize={() => undefined}
          onSelectManualDimensionsMm={() => undefined}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain("Profile specs");
    expect(markup).toContain("HEA 200");
    expect(markup).toContain("Family lookup");
    expect(markup).toContain("kg/m");
  });
});
