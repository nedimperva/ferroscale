import type {
  ProfileId,
  StandardProfileDefinition,
  StandardProfileSpecRecord,
} from "./types";
import { BEAM_PROFILES, CHANNEL_ANGLE_PROFILES, TEE_PROFILES } from "./profiles";
import { SECTION_PROPERTIES } from "./section-properties";

function roundMm(value: number): number {
  return Number(value.toFixed(2));
}

function parseLeadingNumber(label: string): number {
  const match = label.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function parseAllNumbers(label: string): number[] {
  return Array.from(label.matchAll(/(\d+(?:\.\d+)?)/g), (match) => Number(match[1]));
}

function solveSectionThicknesses({
  areaMm2,
  heightMm,
  widthMm,
  thicknessRatio,
}: {
  areaMm2: number;
  heightMm: number;
  widthMm: number;
  thicknessRatio: number;
}): { webThicknessMm: number; flangeThicknessMm: number } {
  const a = 2 * thicknessRatio;
  const b = -(heightMm + 2 * thicknessRatio * widthMm);
  const c = areaMm2;
  const discriminant = Math.max(0, b * b - 4 * a * c);
  const root = (-b - Math.sqrt(discriminant)) / (2 * a);
  const webThicknessMm = roundMm(Math.max(2, root));
  const flangeThicknessMm = roundMm(Math.max(webThicknessMm, webThicknessMm * thicknessRatio));

  return { webThicknessMm, flangeThicknessMm };
}

function buildSectionRecord({
  sizeId,
  label,
  areaMm2,
  perimeterMm,
  referenceLabel,
  drawingKind,
  heightMm,
  widthMm,
  thicknessRatio,
  rootRadiusFactor = 0.9,
}: {
  sizeId: string;
  label: string;
  areaMm2: number;
  perimeterMm?: number;
  referenceLabel: string;
  drawingKind: "ibeam" | "channel";
  heightMm: number;
  widthMm: number;
  thicknessRatio: number;
  rootRadiusFactor?: number;
}): StandardProfileSpecRecord {
  // A size with a catalogue row is drawn from the catalogue: real depth (an
  // HE 100 M is 120 mm deep, not 100), web, flange and root radius — which the
  // drawing then labels. Only sizes without one fall back to solved proportions.
  const catalogue = SECTION_PROPERTIES[sizeId];
  if (catalogue) {
    return {
      sizeId,
      label,
      drawingKind,
      geometry: {
        heightMm: catalogue.hMm,
        widthMm: catalogue.bMm,
        webThicknessMm: catalogue.twMm,
        flangeThicknessMm: catalogue.tfMm,
        rootRadiusMm: catalogue.rMm,
      },
      areaMm2,
      perimeterMm,
      referenceLabel,
    };
  }

  const { webThicknessMm, flangeThicknessMm } = solveSectionThicknesses({
    areaMm2,
    heightMm,
    widthMm,
    thicknessRatio,
  });

  return {
    sizeId,
    label,
    drawingKind,
    geometry: {
      heightMm,
      widthMm,
      webThicknessMm,
      flangeThicknessMm,
      rootRadiusMm: roundMm(Math.max(3, Math.min(flangeThicknessMm * rootRadiusFactor, widthMm / 6))),
      thicknessEstimated: true,
    },
    areaMm2,
    perimeterMm,
    referenceLabel,
  };
}

function mapStandardProfile(
  profile: StandardProfileDefinition,
  getGeometry: (sizeId: string, label: string) => { heightMm: number; widthMm: number },
  drawingKind: "ibeam" | "channel",
  thicknessRatio: number,
  rootRadiusFactor?: number,
): Record<string, StandardProfileSpecRecord> {
  return Object.fromEntries(
    profile.sizes.map((size) => {
      const { heightMm, widthMm } = getGeometry(size.id, size.label);
      return [
        size.id,
        buildSectionRecord({
          sizeId: size.id,
          label: size.label,
          areaMm2: size.areaMm2,
          perimeterMm: size.perimeterMm,
          referenceLabel: size.referenceLabel,
          drawingKind,
          heightMm,
          widthMm,
          thicknessRatio,
          rootRadiusFactor,
        }),
      ];
    }),
  );
}

const IPE_WIDTHS: Record<number, number> = {
  80: 46,
  100: 55,
  120: 64,
  140: 73,
  160: 82,
  180: 91,
  200: 100,
  220: 110,
  240: 120,
  270: 135,
  300: 150,
  330: 160,
  360: 170,
  400: 180,
  450: 190,
  500: 200,
  550: 210,
  600: 220,
};

const IPN_WIDTHS: Record<number, number> = {
  80: 42,
  100: 50,
  120: 58,
  140: 66,
  160: 74,
  180: 82,
  200: 90,
  220: 98,
  240: 106,
  260: 113,
  280: 119,
  300: 125,
  320: 131,
  340: 137,
  360: 143,
  380: 149,
  400: 155,
};

const UPN_WIDTHS: Record<number, number> = {
  50: 38,
  65: 42,
  80: 45,
  100: 50,
  120: 55,
  140: 60,
  160: 65,
  180: 70,
  200: 75,
  220: 80,
  240: 85,
  260: 90,
  280: 95,
  300: 100,
  320: 100,
  400: 110,
};

const UPE_WIDTHS: Record<number, number> = {
  80: 50,
  100: 55,
  120: 60,
  140: 65,
  160: 70,
  180: 75,
  200: 80,
  220: 85,
  240: 90,
  270: 95,
  300: 100,
  330: 110,
  360: 110,
  400: 115,
};

/**
 * EN 10365 section heights for the HEA series. Below 200 the nominal size is
 * not "height − 10": HEA 120 is 114 mm tall, not 110.
 */
const HEA_HEIGHTS: Record<number, number> = {
  100: 96,
  120: 114,
  140: 133,
  160: 152,
  180: 171,
  200: 190,
  220: 210,
  240: 230,
  260: 250,
  280: 270,
  300: 290,
  320: 310,
  340: 330,
  360: 350,
  400: 390,
  450: 440,
  500: 490,
  550: 540,
  600: 590,
  650: 640,
  700: 690,
  800: 790,
  900: 890,
  1000: 990,
};

/** EN 10365 HEM sections are taller and wider than their nominal size. */
const HEM_DIMS: Record<number, { h: number; b: number }> = {
  100: { h: 120, b: 106 },
  120: { h: 140, b: 126 },
  140: { h: 160, b: 146 },
  160: { h: 180, b: 166 },
  180: { h: 200, b: 186 },
  200: { h: 220, b: 206 },
  220: { h: 240, b: 226 },
  240: { h: 270, b: 248 },
  260: { h: 290, b: 268 },
  280: { h: 310, b: 288 },
  300: { h: 340, b: 310 },
  320: { h: 359, b: 309 },
  340: { h: 377, b: 309 },
  360: { h: 395, b: 308 },
  400: { h: 432, b: 307 },
  450: { h: 478, b: 307 },
  500: { h: 524, b: 306 },
  550: { h: 572, b: 306 },
  600: { h: 620, b: 305 },
};

function heSeriesWidth(size: number): number {
  return size <= 300 ? size : 300;
}

function heaSeriesHeight(size: number): number {
  return HEA_HEIGHTS[size] ?? size - 10;
}

function hebSeriesHeight(size: number): number {
  return size;
}

function hemSeriesHeight(size: number): number {
  return HEM_DIMS[size]?.h ?? size;
}

function hemSeriesWidth(size: number): number {
  return HEM_DIMS[size]?.b ?? heSeriesWidth(size);
}

function widthFromLookup(value: number, lookup: Record<number, number>, fallbackRatio: number): number {
  return lookup[value] ?? roundMm(value * fallbackRatio);
}

function buildTeeSpecs(profile: StandardProfileDefinition): Record<string, StandardProfileSpecRecord> {
  return Object.fromEntries(
    profile.sizes.map((size) => {
      const [heightMm, widthMm, thicknessMm] = parseAllNumbers(size.label);
      return [
        size.id,
        {
          sizeId: size.id,
          label: size.label,
          drawingKind: "tee",
          geometry: {
            heightMm,
            widthMm,
            webThicknessMm: thicknessMm,
            flangeThicknessMm: thicknessMm,
            // EN 10055: r1 = t (flange/web = t, so nothing here is estimated).
            rootRadiusMm: roundMm(thicknessMm),
          },
          areaMm2: size.areaMm2,
          perimeterMm: size.perimeterMm,
          referenceLabel: size.referenceLabel,
        },
      ];
    }),
  );
}

function findProfile(profileId: ProfileId): StandardProfileDefinition {
  const profiles = [...BEAM_PROFILES, ...CHANNEL_ANGLE_PROFILES, ...TEE_PROFILES];
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error(`Missing standard profile definition for ${profileId}`);
  }
  return profile;
}

const IPE_PROFILE = findProfile("beam_ipe_en");
const IPN_PROFILE = findProfile("beam_ipn_en");
const HEA_PROFILE = findProfile("beam_hea_en");
const HEB_PROFILE = findProfile("beam_heb_en");
const HEM_PROFILE = findProfile("beam_hem_en");
const UPN_PROFILE = findProfile("channel_upn_en");
const UPE_PROFILE = findProfile("channel_upe_en");
const TEE_PROFILE = findProfile("tee_en");

export const STANDARD_PROFILE_SPECS: Partial<Record<ProfileId, Record<string, StandardProfileSpecRecord>>> = {
  beam_ipe_en: mapStandardProfile(
    IPE_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: nominal,
        widthMm: widthFromLookup(nominal, IPE_WIDTHS, 0.36),
      };
    },
    "ibeam",
    1.4,
    1,
  ),
  beam_ipn_en: mapStandardProfile(
    IPN_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: nominal,
        widthMm: widthFromLookup(nominal, IPN_WIDTHS, 0.39),
      };
    },
    "ibeam",
    1.35,
    0.9,
  ),
  beam_hea_en: mapStandardProfile(
    HEA_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: heaSeriesHeight(nominal),
        widthMm: heSeriesWidth(nominal),
      };
    },
    "ibeam",
    1.5,
    1.05,
  ),
  beam_heb_en: mapStandardProfile(
    HEB_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: hebSeriesHeight(nominal),
        widthMm: heSeriesWidth(nominal),
      };
    },
    "ibeam",
    1.6,
    1.05,
  ),
  beam_hem_en: mapStandardProfile(
    HEM_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: hemSeriesHeight(nominal),
        widthMm: hemSeriesWidth(nominal),
      };
    },
    "ibeam",
    2.2,
    1.1,
  ),
  channel_upn_en: mapStandardProfile(
    UPN_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: nominal,
        widthMm: widthFromLookup(nominal, UPN_WIDTHS, 0.34),
      };
    },
    "channel",
    1.2,
    0.8,
  ),
  channel_upe_en: mapStandardProfile(
    UPE_PROFILE,
    (_sizeId, label) => {
      const nominal = parseLeadingNumber(label);
      return {
        heightMm: nominal,
        widthMm: widthFromLookup(nominal, UPE_WIDTHS, 0.31),
      };
    },
    "channel",
    1.25,
    0.8,
  ),
  tee_en: buildTeeSpecs(TEE_PROFILE),
};

export function getStandardProfileSpecRecord(
  profileId: ProfileId,
  sizeId: string,
): StandardProfileSpecRecord | undefined {
  return STANDARD_PROFILE_SPECS[profileId]?.[sizeId];
}

export function getStandardProfileSpecRecords(profileId: ProfileId): StandardProfileSpecRecord[] {
  return Object.values(STANDARD_PROFILE_SPECS[profileId] ?? {});
}
