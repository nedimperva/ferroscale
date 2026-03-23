import type {
  ProfileId,
  StandardProfileDefinition,
  StandardProfileSpecRecord,
} from "./types";
import { BEAM_PROFILES, CHANNEL_ANGLE_PROFILES, TEE_PROFILES } from "./profiles";

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

const HEA_HEIGHT_OFFSETS = new Set([100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300]);

function heSeriesWidth(size: number): number {
  return size <= 300 ? size : 300;
}

function heaSeriesHeight(size: number): number {
  return HEA_HEIGHT_OFFSETS.has(size) ? size - 10 : size - 10;
}

function hebSeriesHeight(size: number): number {
  return size;
}

function hemSeriesHeight(size: number): number {
  return size;
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
            rootRadiusMm: roundMm(Math.max(2, thicknessMm * 0.8)),
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
        widthMm: heSeriesWidth(nominal),
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
