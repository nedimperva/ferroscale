/**
 * Published section properties for the standard sizes — the second-moment and
 * modulus figures an engineer otherwise keeps a catalogue tab open for.
 *
 * Every number here is transcribed from a named, citable table; none is
 * computed by this package. The test beside this file holds each row to
 * checks that do not read the row back (its area against the size table's
 * `areaMm2`, its elastic moduli against I / c, and for the parallel-flange
 * I-sections A, I and Wpl recomputed from h, b, tw, tf and r). A size with no
 * row is listed in SECTION_PROPERTIES_UNSOURCED with the reason, and a
 * coverage test fails when a new standard size ships with neither.
 *
 * Radii of gyration are not stored: they are derived as sqrt(I / A). The
 * catalogue truncates them to 0.1 cm and carries at least two typos in them
 * (IPE 100, UPN 320), so a derived radius is the more faithful one.
 */

export type SectionPropertySourceId = "arcelormittal-2024" | "din-en-10055-ezzat";

export interface SectionPropertySource {
  label: string;
  /** What a results row has room for. */
  shortLabel: string;
  url: string;
}

export const SECTION_PROPERTY_SOURCES: Record<SectionPropertySourceId, SectionPropertySource> = {
  "arcelormittal-2024": {
    label: "ArcelorMittal, Sections and Merchant Bars — Sales programme 2024-1",
    shortLabel: "ArcelorMittal 2024-1",
    url: "https://sections.arcelormittal.com/repository2/Sections/Sections_MB_ArcelorMittal_FR_EN_DE.pdf",
  },
  "din-en-10055-ezzat": {
    label: "DIN EN 10055 equal flange tees — Querschnittswerte table (ezzat.org)",
    shortLabel: "DIN EN 10055 (ezzat.org)",
    url: "https://www.ezzat.org/de/Querschnittswerte/gewalzt/T/t.php",
  },
};

export interface SectionProperties {
  /** Depth, flange width, web and flange thickness, root radius — mm. Tees: tw = tf = t, r = r1. */
  hMm: number;
  bMm: number;
  twMm: number;
  tfMm: number;
  rMm: number;
  /** Section area as the source prints it, cm². */
  areaCm2: number;
  /** Strong axis y-y: second moment (cm⁴), elastic and plastic modulus (cm³). */
  iyCm4: number;
  welYCm3: number;
  wplYCm3: number;
  /** Weak axis z-z. */
  izCm4: number;
  welZCm3: number;
  wplZCm3: number;
  /** Channels: web back to the centroid (the z-z axis), mm. */
  ysMm?: number;
  /** Tees: flange top to the centroid (the y-y axis), mm. Wel.y is the smaller, toe-side modulus. */
  eMm?: number;
  source: SectionPropertySourceId;
  /** Page of the source PDF the row is on (the file's page index, not the printed folio). */
  pdfPage?: number;
}

type Row = Omit<SectionProperties, "source" | "pdfPage">;

const am = (pdfPage: number, row: Row): SectionProperties => ({
  ...row,
  source: "arcelormittal-2024",
  pdfPage,
});

const tee = (row: Row): SectionProperties => ({ ...row, source: "din-en-10055-ezzat" });

export const SECTION_PROPERTIES: Readonly<Record<string, SectionProperties>> = {
  // IPE — EN 10365
  ipe80: am(53, { hMm: 80, bMm: 46, twMm: 3.8, tfMm: 5.2, rMm: 5, areaCm2: 7.6, iyCm4: 80.13, welYCm3: 20.03, wplYCm3: 23.21, izCm4: 8.489, welZCm3: 3.69, wplZCm3: 5.817 }),
  ipe100: am(53, { hMm: 100, bMm: 55, twMm: 4.1, tfMm: 5.7, rMm: 7, areaCm2: 10.3, iyCm4: 171, welYCm3: 34.2, wplYCm3: 39.4, izCm4: 15.91, welZCm3: 5.788, wplZCm3: 9.145 }),
  ipe120: am(53, { hMm: 120, bMm: 64, twMm: 4.4, tfMm: 6.3, rMm: 7, areaCm2: 13.2, iyCm4: 317.7, welYCm3: 52.95, wplYCm3: 60.72, izCm4: 27.66, welZCm3: 8.646, wplZCm3: 13.58 }),
  ipe140: am(53, { hMm: 140, bMm: 73, twMm: 4.7, tfMm: 6.9, rMm: 7, areaCm2: 16.4, iyCm4: 541.2, welYCm3: 77.31, wplYCm3: 88.34, izCm4: 44.91, welZCm3: 12.3, wplZCm3: 19.24 }),
  ipe160: am(53, { hMm: 160, bMm: 82, twMm: 5, tfMm: 7.4, rMm: 9, areaCm2: 20.1, iyCm4: 869.2, welYCm3: 108.6, wplYCm3: 123.8, izCm4: 68.31, welZCm3: 16.66, wplZCm3: 26.09 }),
  ipe180: am(51, { hMm: 180, bMm: 91, twMm: 5.3, tfMm: 8, rMm: 9, areaCm2: 23.9, iyCm4: 1316, welYCm3: 146.3, wplYCm3: 166.4, izCm4: 100.8, welZCm3: 22.16, wplZCm3: 34.59 }),
  ipe200: am(51, { hMm: 200, bMm: 100, twMm: 5.6, tfMm: 8.5, rMm: 12, areaCm2: 28.5, iyCm4: 1943, welYCm3: 194.3, wplYCm3: 220.6, izCm4: 142.3, welZCm3: 28.47, wplZCm3: 44.61 }),
  ipe220: am(51, { hMm: 220, bMm: 110, twMm: 5.9, tfMm: 9.2, rMm: 12, areaCm2: 33.4, iyCm4: 2771, welYCm3: 251.9, wplYCm3: 285.4, izCm4: 204.8, welZCm3: 37.25, wplZCm3: 58.11 }),
  ipe240: am(51, { hMm: 240, bMm: 120, twMm: 6.2, tfMm: 9.8, rMm: 15, areaCm2: 39.1, iyCm4: 3891, welYCm3: 324.3, wplYCm3: 366.6, izCm4: 283.6, welZCm3: 47.27, wplZCm3: 73.92 }),
  ipe270: am(51, { hMm: 270, bMm: 135, twMm: 6.6, tfMm: 10.2, rMm: 15, areaCm2: 45.9, iyCm4: 5789, welYCm3: 428.8, wplYCm3: 483.9, izCm4: 419.8, welZCm3: 62.2, wplZCm3: 96.95 }),
  ipe300: am(51, { hMm: 300, bMm: 150, twMm: 7.1, tfMm: 10.7, rMm: 15, areaCm2: 53.8, iyCm4: 8356, welYCm3: 557, wplYCm3: 628.3, izCm4: 603.7, welZCm3: 80.5, wplZCm3: 125.2 }),
  ipe330: am(51, { hMm: 330, bMm: 160, twMm: 7.5, tfMm: 11.5, rMm: 18, areaCm2: 62.6, iyCm4: 11760, welYCm3: 713.1, wplYCm3: 804.3, izCm4: 788.1, welZCm3: 98.51, wplZCm3: 153.6 }),
  ipe360: am(51, { hMm: 360, bMm: 170, twMm: 8, tfMm: 12.7, rMm: 18, areaCm2: 72.7, iyCm4: 16260, welYCm3: 903.6, wplYCm3: 1019, izCm4: 1043, welZCm3: 122.7, wplZCm3: 191 }),
  ipe400: am(49, { hMm: 400, bMm: 180, twMm: 8.6, tfMm: 13.5, rMm: 21, areaCm2: 84.5, iyCm4: 23120, welYCm3: 1156, wplYCm3: 1307, izCm4: 1317, welZCm3: 146.4, wplZCm3: 229 }),
  ipe450: am(49, { hMm: 450, bMm: 190, twMm: 9.4, tfMm: 14.6, rMm: 21, areaCm2: 98.8, iyCm4: 33740, welYCm3: 1499, wplYCm3: 1701, izCm4: 1675, welZCm3: 176.4, wplZCm3: 276.3 }),
  ipe500: am(49, { hMm: 500, bMm: 200, twMm: 10.2, tfMm: 16, rMm: 21, areaCm2: 115.5, iyCm4: 48190, welYCm3: 1927, wplYCm3: 2194, izCm4: 2141, welZCm3: 214.1, wplZCm3: 335.8 }),
  ipe550: am(49, { hMm: 550, bMm: 210, twMm: 11.1, tfMm: 17.2, rMm: 24, areaCm2: 134.4, iyCm4: 67110, welYCm3: 2440, wplYCm3: 2787, izCm4: 2667, welZCm3: 254, wplZCm3: 400.5 }),
  ipe600: am(49, { hMm: 600, bMm: 220, twMm: 12, tfMm: 19, rMm: 24, areaCm2: 156, iyCm4: 92080, welYCm3: 3069, wplYCm3: 3512, izCm4: 3387, welZCm3: 307.9, wplZCm3: 485.6 }),
  // IPN — EN 10365 (taper flanges)
  ipn80: am(93, { hMm: 80, bMm: 42, twMm: 3.9, tfMm: 5.9, rMm: 3.9, areaCm2: 7.6, iyCm4: 77.8, welYCm3: 19.5, wplYCm3: 22.8, izCm4: 6.29, welZCm3: 3, wplZCm3: 5 }),
  ipn100: am(93, { hMm: 100, bMm: 50, twMm: 4.5, tfMm: 6.8, rMm: 4.5, areaCm2: 10.6, iyCm4: 171, welYCm3: 34.2, wplYCm3: 39.8, izCm4: 12.2, welZCm3: 4.88, wplZCm3: 8.1 }),
  ipn120: am(93, { hMm: 120, bMm: 58, twMm: 5.1, tfMm: 7.7, rMm: 5.1, areaCm2: 14.2, iyCm4: 328, welYCm3: 54.7, wplYCm3: 63.6, izCm4: 21.5, welZCm3: 7.41, wplZCm3: 12.4 }),
  ipn140: am(93, { hMm: 140, bMm: 66, twMm: 5.7, tfMm: 8.6, rMm: 5.7, areaCm2: 18.2, iyCm4: 573, welYCm3: 81.9, wplYCm3: 95.4, izCm4: 35.2, welZCm3: 10.7, wplZCm3: 17.9 }),
  ipn160: am(93, { hMm: 160, bMm: 74, twMm: 6.3, tfMm: 9.5, rMm: 6.3, areaCm2: 22.8, iyCm4: 935, welYCm3: 117, wplYCm3: 136, izCm4: 54.7, welZCm3: 14.8, wplZCm3: 24.9 }),
  ipn180: am(93, { hMm: 180, bMm: 82, twMm: 6.9, tfMm: 10.4, rMm: 6.9, areaCm2: 27.9, iyCm4: 1450, welYCm3: 161, wplYCm3: 187, izCm4: 81.3, welZCm3: 19.8, wplZCm3: 33.2 }),
  ipn200: am(93, { hMm: 200, bMm: 90, twMm: 7.5, tfMm: 11.3, rMm: 7.5, areaCm2: 33.4, iyCm4: 2140, welYCm3: 214, wplYCm3: 250, izCm4: 117, welZCm3: 26, wplZCm3: 43.5 }),
  ipn220: am(93, { hMm: 220, bMm: 98, twMm: 8.1, tfMm: 12.2, rMm: 8.1, areaCm2: 39.5, iyCm4: 3060, welYCm3: 278, wplYCm3: 324, izCm4: 162, welZCm3: 33.1, wplZCm3: 55.7 }),
  ipn240: am(93, { hMm: 240, bMm: 106, twMm: 8.7, tfMm: 13.1, rMm: 8.7, areaCm2: 46.1, iyCm4: 4250, welYCm3: 354, wplYCm3: 412, izCm4: 221, welZCm3: 41.7, wplZCm3: 70 }),
  ipn260: am(93, { hMm: 260, bMm: 113, twMm: 9.4, tfMm: 14.1, rMm: 9.4, areaCm2: 53.3, iyCm4: 5740, welYCm3: 442, wplYCm3: 514, izCm4: 288, welZCm3: 51, wplZCm3: 85.9 }),
  ipn280: am(93, { hMm: 280, bMm: 119, twMm: 10.1, tfMm: 15.2, rMm: 10.1, areaCm2: 61, iyCm4: 7590, welYCm3: 542, wplYCm3: 632, izCm4: 364, welZCm3: 61.2, wplZCm3: 103 }),
  ipn300: am(93, { hMm: 300, bMm: 125, twMm: 10.8, tfMm: 16.2, rMm: 10.8, areaCm2: 69, iyCm4: 9800, welYCm3: 653, wplYCm3: 762, izCm4: 451, welZCm3: 72.2, wplZCm3: 121 }),
  ipn320: am(93, { hMm: 320, bMm: 131, twMm: 11.5, tfMm: 17.3, rMm: 11.5, areaCm2: 77.7, iyCm4: 12510, welYCm3: 782, wplYCm3: 914, izCm4: 555, welZCm3: 84.7, wplZCm3: 143 }),
  ipn340: am(93, { hMm: 340, bMm: 137, twMm: 12.2, tfMm: 18.3, rMm: 12.2, areaCm2: 86.7, iyCm4: 15700, welYCm3: 923, wplYCm3: 1080, izCm4: 674, welZCm3: 98.4, wplZCm3: 166 }),
  ipn360: am(93, { hMm: 360, bMm: 143, twMm: 13, tfMm: 19.5, rMm: 13, areaCm2: 97, iyCm4: 19610, welYCm3: 1090, wplYCm3: 1276, izCm4: 818, welZCm3: 114, wplZCm3: 194 }),
  ipn380: am(93, { hMm: 380, bMm: 149, twMm: 13.7, tfMm: 20.5, rMm: 13.7, areaCm2: 107, iyCm4: 24010, welYCm3: 1260, wplYCm3: 1482, izCm4: 975, welZCm3: 131, wplZCm3: 221 }),
  ipn400: am(93, { hMm: 400, bMm: 155, twMm: 14.4, tfMm: 21.6, rMm: 14.4, areaCm2: 117.7, iyCm4: 29210, welYCm3: 1460, wplYCm3: 1714, izCm4: 1160, welZCm3: 149, wplZCm3: 253 }),
  // HEA — EN 10365
  hea100: am(61, { hMm: 96, bMm: 100, twMm: 5, tfMm: 8, rMm: 12, areaCm2: 21.2, iyCm4: 349.2, welYCm3: 72.75, wplYCm3: 83.01, izCm4: 133.8, welZCm3: 26.76, wplZCm3: 41.14 }),
  hea120: am(61, { hMm: 114, bMm: 120, twMm: 5, tfMm: 8, rMm: 12, areaCm2: 25.3, iyCm4: 606.1, welYCm3: 106.3, wplYCm3: 119.4, izCm4: 230.8, welZCm3: 38.48, wplZCm3: 58.85 }),
  hea140: am(61, { hMm: 133, bMm: 140, twMm: 5.5, tfMm: 8.5, rMm: 12, areaCm2: 31.4, iyCm4: 1033, welYCm3: 155.3, wplYCm3: 173.4, izCm4: 389.3, welZCm3: 55.61, wplZCm3: 84.84 }),
  hea160: am(61, { hMm: 152, bMm: 160, twMm: 6, tfMm: 9, rMm: 15, areaCm2: 38.8, iyCm4: 1672, welYCm3: 220.1, wplYCm3: 245.1, izCm4: 615.5, welZCm3: 76.94, wplZCm3: 117.6 }),
  hea180: am(61, { hMm: 171, bMm: 180, twMm: 6, tfMm: 9.5, rMm: 15, areaCm2: 45.3, iyCm4: 2510, welYCm3: 293.6, wplYCm3: 324.8, izCm4: 924.6, welZCm3: 102.7, wplZCm3: 156.4 }),
  hea200: am(61, { hMm: 190, bMm: 200, twMm: 6.5, tfMm: 10, rMm: 18, areaCm2: 53.8, iyCm4: 3692, welYCm3: 388.6, wplYCm3: 429.4, izCm4: 1335, welZCm3: 133.5, wplZCm3: 203.8 }),
  hea220: am(61, { hMm: 210, bMm: 220, twMm: 7, tfMm: 11, rMm: 18, areaCm2: 64.3, iyCm4: 5409, welYCm3: 515.2, wplYCm3: 568.4, izCm4: 1954, welZCm3: 177.6, wplZCm3: 270.5 }),
  hea240: am(59, { hMm: 230, bMm: 240, twMm: 7.5, tfMm: 12, rMm: 21, areaCm2: 76.8, iyCm4: 7763, welYCm3: 675, wplYCm3: 744.6, izCm4: 2768, welZCm3: 230.7, wplZCm3: 351.6 }),
  hea260: am(59, { hMm: 250, bMm: 260, twMm: 7.5, tfMm: 12.5, rMm: 24, areaCm2: 86.8, iyCm4: 10450, welYCm3: 836.3, wplYCm3: 919.7, izCm4: 3667, welZCm3: 282.1, wplZCm3: 430.1 }),
  hea280: am(59, { hMm: 270, bMm: 280, twMm: 8, tfMm: 13, rMm: 24, areaCm2: 97.3, iyCm4: 13670, welYCm3: 1012, wplYCm3: 1112, izCm4: 4762, welZCm3: 340.1, wplZCm3: 518.1 }),
  hea300: am(59, { hMm: 290, bMm: 300, twMm: 8.5, tfMm: 14, rMm: 27, areaCm2: 112.5, iyCm4: 18260, welYCm3: 1259, wplYCm3: 1383, izCm4: 6309, welZCm3: 420.6, wplZCm3: 641.1 }),
  hea320: am(59, { hMm: 310, bMm: 300, twMm: 9, tfMm: 15.5, rMm: 27, areaCm2: 124.4, iyCm4: 22920, welYCm3: 1479, wplYCm3: 1628, izCm4: 6985, welZCm3: 465.6, wplZCm3: 709.7 }),
  hea340: am(59, { hMm: 330, bMm: 300, twMm: 9.5, tfMm: 16.5, rMm: 27, areaCm2: 133.5, iyCm4: 27690, welYCm3: 1678, wplYCm3: 1850, izCm4: 7435, welZCm3: 495.7, wplZCm3: 755.9 }),
  hea360: am(57, { hMm: 350, bMm: 300, twMm: 10, tfMm: 17.5, rMm: 27, areaCm2: 142.8, iyCm4: 33080, welYCm3: 1890, wplYCm3: 2088, izCm4: 7886, welZCm3: 525.7, wplZCm3: 802.2 }),
  hea400: am(57, { hMm: 390, bMm: 300, twMm: 11, tfMm: 19, rMm: 27, areaCm2: 159, iyCm4: 45060, welYCm3: 2311, wplYCm3: 2561, izCm4: 8563, welZCm3: 570.9, wplZCm3: 872.8 }),
  hea450: am(57, { hMm: 440, bMm: 300, twMm: 11.5, tfMm: 21, rMm: 27, areaCm2: 178, iyCm4: 63720, welYCm3: 2896, wplYCm3: 3215, izCm4: 9465, welZCm3: 631, wplZCm3: 965.5 }),
  hea500: am(57, { hMm: 490, bMm: 300, twMm: 12, tfMm: 23, rMm: 27, areaCm2: 197.5, iyCm4: 86970, welYCm3: 3549, wplYCm3: 3948, izCm4: 10360, welZCm3: 691.1, wplZCm3: 1058 }),
  hea550: am(57, { hMm: 540, bMm: 300, twMm: 12.5, tfMm: 24, rMm: 27, areaCm2: 211.8, iyCm4: 111930, welYCm3: 4145, wplYCm3: 4621, izCm4: 10810, welZCm3: 721.2, wplZCm3: 1106 }),
  hea600: am(57, { hMm: 590, bMm: 300, twMm: 13, tfMm: 25, rMm: 27, areaCm2: 226.5, iyCm4: 141200, welYCm3: 4786, wplYCm3: 5350, izCm4: 11270, welZCm3: 751.4, wplZCm3: 1155 }),
  hea650: am(57, { hMm: 640, bMm: 300, twMm: 13.5, tfMm: 26, rMm: 27, areaCm2: 241.6, iyCm4: 175170, welYCm3: 5474, wplYCm3: 6136, izCm4: 11720, welZCm3: 781.5, wplZCm3: 1204 }),
  hea700: am(55, { hMm: 690, bMm: 300, twMm: 14.5, tfMm: 27, rMm: 27, areaCm2: 260.5, iyCm4: 215300, welYCm3: 6240, wplYCm3: 7031, izCm4: 12170, welZCm3: 811.9, wplZCm3: 1256 }),
  hea800: am(55, { hMm: 790, bMm: 300, twMm: 15, tfMm: 28, rMm: 30, areaCm2: 285.8, iyCm4: 303440, welYCm3: 7682, wplYCm3: 8699, izCm4: 12630, welZCm3: 842.5, wplZCm3: 1312 }),
  hea900: am(55, { hMm: 890, bMm: 300, twMm: 16, tfMm: 30, rMm: 30, areaCm2: 320.5, iyCm4: 422070, welYCm3: 9484, wplYCm3: 10810, izCm4: 13540, welZCm3: 903.1, wplZCm3: 1414 }),
  hea1000: am(55, { hMm: 990, bMm: 300, twMm: 16.5, tfMm: 31, rMm: 30, areaCm2: 346.8, iyCm4: 553840, welYCm3: 11180, wplYCm3: 12820, izCm4: 14000, welZCm3: 933.6, wplZCm3: 1469 }),
  // HEB — EN 10365
  heb100: am(61, { hMm: 100, bMm: 100, twMm: 6, tfMm: 10, rMm: 12, areaCm2: 26, iyCm4: 449.5, welYCm3: 89.9, wplYCm3: 104.2, izCm4: 167.2, welZCm3: 33.45, wplZCm3: 51.42 }),
  heb120: am(61, { hMm: 120, bMm: 120, twMm: 6.5, tfMm: 11, rMm: 12, areaCm2: 34, iyCm4: 864.3, welYCm3: 144, wplYCm3: 165.2, izCm4: 317.5, welZCm3: 52.92, wplZCm3: 80.96 }),
  heb140: am(61, { hMm: 140, bMm: 140, twMm: 7, tfMm: 12, rMm: 12, areaCm2: 43, iyCm4: 1509, welYCm3: 215.6, wplYCm3: 245.4, izCm4: 549.6, welZCm3: 78.52, wplZCm3: 119.7 }),
  heb160: am(61, { hMm: 160, bMm: 160, twMm: 8, tfMm: 13, rMm: 15, areaCm2: 54.3, iyCm4: 2491, welYCm3: 311.4, wplYCm3: 353.9, izCm4: 889.2, welZCm3: 111.1, wplZCm3: 169.9 }),
  heb180: am(61, { hMm: 180, bMm: 180, twMm: 8.5, tfMm: 14, rMm: 15, areaCm2: 65.3, iyCm4: 3831, welYCm3: 425.6, wplYCm3: 481.4, izCm4: 1362, welZCm3: 151.4, wplZCm3: 231 }),
  heb200: am(61, { hMm: 200, bMm: 200, twMm: 9, tfMm: 15, rMm: 18, areaCm2: 78.1, iyCm4: 5696, welYCm3: 569.6, wplYCm3: 642.5, izCm4: 2003, welZCm3: 200.3, wplZCm3: 305.8 }),
  heb220: am(59, { hMm: 220, bMm: 220, twMm: 9.5, tfMm: 16, rMm: 18, areaCm2: 91, iyCm4: 8090, welYCm3: 735.5, wplYCm3: 827, izCm4: 2843, welZCm3: 258.4, wplZCm3: 393.8 }),
  heb240: am(59, { hMm: 240, bMm: 240, twMm: 10, tfMm: 17, rMm: 21, areaCm2: 106, iyCm4: 11250, welYCm3: 938.2, wplYCm3: 1053, izCm4: 3922, welZCm3: 326.8, wplZCm3: 498.4 }),
  heb260: am(59, { hMm: 260, bMm: 260, twMm: 10, tfMm: 17.5, rMm: 24, areaCm2: 118.4, iyCm4: 14910, welYCm3: 1147, wplYCm3: 1282, izCm4: 5134, welZCm3: 394.9, wplZCm3: 602.2 }),
  heb280: am(59, { hMm: 280, bMm: 280, twMm: 10.5, tfMm: 18, rMm: 24, areaCm2: 131.4, iyCm4: 19270, welYCm3: 1376, wplYCm3: 1534, izCm4: 6594, welZCm3: 471, wplZCm3: 717.5 }),
  heb300: am(59, { hMm: 300, bMm: 300, twMm: 11, tfMm: 19, rMm: 27, areaCm2: 149.1, iyCm4: 25160, welYCm3: 1677, wplYCm3: 1868, izCm4: 8562, welZCm3: 570.8, wplZCm3: 870.1 }),
  heb320: am(59, { hMm: 320, bMm: 300, twMm: 11.5, tfMm: 20.5, rMm: 27, areaCm2: 161.3, iyCm4: 30820, welYCm3: 1926, wplYCm3: 2149, izCm4: 9238, welZCm3: 615.9, wplZCm3: 939 }),
  heb340: am(59, { hMm: 340, bMm: 300, twMm: 12, tfMm: 21.5, rMm: 27, areaCm2: 170.9, iyCm4: 36650, welYCm3: 2156, wplYCm3: 2408, izCm4: 9689, welZCm3: 645.9, wplZCm3: 985.7 }),
  heb360: am(57, { hMm: 360, bMm: 300, twMm: 12.5, tfMm: 22.5, rMm: 27, areaCm2: 180.6, iyCm4: 43190, welYCm3: 2399, wplYCm3: 2682, izCm4: 10140, welZCm3: 676, wplZCm3: 1032 }),
  heb400: am(57, { hMm: 400, bMm: 300, twMm: 13.5, tfMm: 24, rMm: 27, areaCm2: 197.8, iyCm4: 57680, welYCm3: 2884, wplYCm3: 3231, izCm4: 10810, welZCm3: 721.2, wplZCm3: 1104 }),
  heb450: am(57, { hMm: 450, bMm: 300, twMm: 14, tfMm: 26, rMm: 27, areaCm2: 218, iyCm4: 79880, welYCm3: 3550, wplYCm3: 3982, izCm4: 11720, welZCm3: 781.4, wplZCm3: 1197 }),
  heb500: am(57, { hMm: 500, bMm: 300, twMm: 14.5, tfMm: 28, rMm: 27, areaCm2: 238.6, iyCm4: 107170, welYCm3: 4287, wplYCm3: 4814, izCm4: 12620, welZCm3: 841.5, wplZCm3: 1291 }),
  heb550: am(57, { hMm: 550, bMm: 300, twMm: 15, tfMm: 29, rMm: 27, areaCm2: 254.1, iyCm4: 136690, welYCm3: 4970, wplYCm3: 5590, izCm4: 13070, welZCm3: 871.7, wplZCm3: 1341 }),
  heb600: am(57, { hMm: 600, bMm: 300, twMm: 15.5, tfMm: 30, rMm: 27, areaCm2: 270, iyCm4: 171040, welYCm3: 5701, wplYCm3: 6425, izCm4: 13530, welZCm3: 902, wplZCm3: 1391 }),
  heb650: am(57, { hMm: 650, bMm: 300, twMm: 16, tfMm: 31, rMm: 27, areaCm2: 286.3, iyCm4: 210610, welYCm3: 6480, wplYCm3: 7319, izCm4: 13980, welZCm3: 932.2, wplZCm3: 1441 }),
  heb700: am(55, { hMm: 700, bMm: 300, twMm: 17, tfMm: 32, rMm: 27, areaCm2: 306.4, iyCm4: 256880, welYCm3: 7339, wplYCm3: 8327, izCm4: 14440, welZCm3: 962.7, wplZCm3: 1495 }),
  heb800: am(55, { hMm: 800, bMm: 300, twMm: 17.5, tfMm: 33, rMm: 30, areaCm2: 334.2, iyCm4: 359080, welYCm3: 8977, wplYCm3: 10220, izCm4: 14900, welZCm3: 993.5, wplZCm3: 1553 }),
  heb900: am(55, { hMm: 900, bMm: 300, twMm: 18.5, tfMm: 35, rMm: 30, areaCm2: 371.3, iyCm4: 494060, welYCm3: 10970, wplYCm3: 12580, izCm4: 15810, welZCm3: 1054, wplZCm3: 1658 }),
  heb1000: am(55, { hMm: 1000, bMm: 300, twMm: 19, tfMm: 36, rMm: 30, areaCm2: 400, iyCm4: 644740, welYCm3: 12890, wplYCm3: 14850, izCm4: 16270, welZCm3: 1085, wplZCm3: 1716 }),
  // HEM — EN 10365
  hem100: am(61, { hMm: 120, bMm: 106, twMm: 12, tfMm: 20, rMm: 12, areaCm2: 53.2, iyCm4: 1142, welYCm3: 190.4, wplYCm3: 235.8, izCm4: 399.1, welZCm3: 75.31, wplZCm3: 116.3 }),
  hem120: am(61, { hMm: 140, bMm: 126, twMm: 12.5, tfMm: 21, rMm: 12, areaCm2: 66.4, iyCm4: 2017, welYCm3: 288.2, wplYCm3: 350.6, izCm4: 702.7, welZCm3: 111.5, wplZCm3: 171.6 }),
  hem140: am(61, { hMm: 160, bMm: 146, twMm: 13, tfMm: 22, rMm: 12, areaCm2: 80.6, iyCm4: 3291, welYCm3: 411.4, wplYCm3: 493.8, izCm4: 1144, welZCm3: 156.7, wplZCm3: 240.5 }),
  hem160: am(61, { hMm: 180, bMm: 166, twMm: 14, tfMm: 23, rMm: 15, areaCm2: 97.1, iyCm4: 5098, welYCm3: 566.4, wplYCm3: 674.5, izCm4: 1758, welZCm3: 211.8, wplZCm3: 325.4 }),
  hem180: am(61, { hMm: 200, bMm: 186, twMm: 14.5, tfMm: 24, rMm: 15, areaCm2: 113.3, iyCm4: 7483, welYCm3: 748.3, wplYCm3: 883.4, izCm4: 2580, welZCm3: 277.4, wplZCm3: 425.1 }),
  hem200: am(61, { hMm: 220, bMm: 206, twMm: 15, tfMm: 25, rMm: 18, areaCm2: 131.3, iyCm4: 10640, welYCm3: 967.4, wplYCm3: 1135, izCm4: 3651, welZCm3: 354.4, wplZCm3: 543.2 }),
  hem220: am(59, { hMm: 240, bMm: 226, twMm: 15.5, tfMm: 26, rMm: 18, areaCm2: 149.4, iyCm4: 14600, welYCm3: 1217, wplYCm3: 1419, izCm4: 5012, welZCm3: 443.5, wplZCm3: 678.5 }),
  hem240: am(59, { hMm: 270, bMm: 248, twMm: 18, tfMm: 32, rMm: 21, areaCm2: 199.6, iyCm4: 24280, welYCm3: 1799, wplYCm3: 2116, izCm4: 8152, welZCm3: 657.4, wplZCm3: 1005 }),
  hem260: am(59, { hMm: 290, bMm: 268, twMm: 18, tfMm: 32.5, rMm: 24, areaCm2: 219.6, iyCm4: 31300, welYCm3: 2159, wplYCm3: 2523, izCm4: 10440, welZCm3: 779.7, wplZCm3: 1192 }),
  hem280: am(59, { hMm: 310, bMm: 288, twMm: 18.5, tfMm: 33, rMm: 24, areaCm2: 240.2, iyCm4: 39540, welYCm3: 2551, wplYCm3: 2965, izCm4: 13160, welZCm3: 914, wplZCm3: 1396 }),
  hem300: am(59, { hMm: 340, bMm: 310, twMm: 21, tfMm: 39, rMm: 27, areaCm2: 303.1, iyCm4: 59200, welYCm3: 3482, wplYCm3: 4077, izCm4: 19400, welZCm3: 1251, wplZCm3: 1913 }),
  // UPN — EN 10365 (taper flanges)
  upn50: am(101, { hMm: 50, bMm: 38, twMm: 5, tfMm: 7, rMm: 7, areaCm2: 7.1, iyCm4: 26.4, welYCm3: 10.6, wplYCm3: 13.1, izCm4: 9.12, welZCm3: 3.75, wplZCm3: 6.78, ysMm: 14 }),
  upn65: am(101, { hMm: 65, bMm: 42, twMm: 5.5, tfMm: 7.5, rMm: 8, areaCm2: 9, iyCm4: 57.5, welYCm3: 17.7, wplYCm3: 21.7, izCm4: 14.1, welZCm3: 5.07, wplZCm3: 9.38, ysMm: 14 }),
  upn80: am(101, { hMm: 80, bMm: 45, twMm: 6, tfMm: 8, rMm: 8, areaCm2: 11, iyCm4: 106, welYCm3: 26.5, wplYCm3: 32.3, izCm4: 19.4, welZCm3: 6.36, wplZCm3: 11.9, ysMm: 15 }),
  upn100: am(101, { hMm: 100, bMm: 50, twMm: 6, tfMm: 8.5, rMm: 9, areaCm2: 13.5, iyCm4: 206, welYCm3: 41.2, wplYCm3: 49, izCm4: 29.3, welZCm3: 8.49, wplZCm3: 16.2, ysMm: 16 }),
  upn120: am(101, { hMm: 120, bMm: 55, twMm: 7, tfMm: 9, rMm: 9, areaCm2: 17, iyCm4: 364, welYCm3: 60.7, wplYCm3: 72.6, izCm4: 43.2, welZCm3: 11.1, wplZCm3: 21.2, ysMm: 16 }),
  upn140: am(101, { hMm: 140, bMm: 60, twMm: 7, tfMm: 10, rMm: 10, areaCm2: 20.4, iyCm4: 605, welYCm3: 86.4, wplYCm3: 103, izCm4: 62.7, welZCm3: 14.8, wplZCm3: 28.3, ysMm: 18 }),
  upn160: am(101, { hMm: 160, bMm: 65, twMm: 7.5, tfMm: 10.5, rMm: 11, areaCm2: 24, iyCm4: 925, welYCm3: 116, wplYCm3: 138, izCm4: 85.3, welZCm3: 18.3, wplZCm3: 35.2, ysMm: 18 }),
  upn180: am(101, { hMm: 180, bMm: 70, twMm: 8, tfMm: 11, rMm: 11, areaCm2: 28, iyCm4: 1350, welYCm3: 150, wplYCm3: 179, izCm4: 114, welZCm3: 22.4, wplZCm3: 42.9, ysMm: 19 }),
  upn200: am(101, { hMm: 200, bMm: 75, twMm: 8.5, tfMm: 11.5, rMm: 12, areaCm2: 32.2, iyCm4: 1910, welYCm3: 191, wplYCm3: 228, izCm4: 148, welZCm3: 27, wplZCm3: 51.8, ysMm: 20 }),
  upn220: am(101, { hMm: 220, bMm: 80, twMm: 9, tfMm: 12.5, rMm: 13, areaCm2: 37.4, iyCm4: 2690, welYCm3: 245, wplYCm3: 292, izCm4: 197, welZCm3: 33.6, wplZCm3: 64.1, ysMm: 21 }),
  upn240: am(101, { hMm: 240, bMm: 85, twMm: 9.5, tfMm: 13, rMm: 13, areaCm2: 42.3, iyCm4: 3600, welYCm3: 300, wplYCm3: 358, izCm4: 248, welZCm3: 39.6, wplZCm3: 75.7, ysMm: 22 }),
  upn260: am(101, { hMm: 260, bMm: 90, twMm: 10, tfMm: 14, rMm: 14, areaCm2: 48.3, iyCm4: 4820, welYCm3: 371, wplYCm3: 442, izCm4: 317, welZCm3: 47.7, wplZCm3: 91.6, ysMm: 24 }),
  upn280: am(101, { hMm: 280, bMm: 95, twMm: 10, tfMm: 15, rMm: 15, areaCm2: 53.3, iyCm4: 6280, welYCm3: 448, wplYCm3: 532, izCm4: 399, welZCm3: 57.2, wplZCm3: 109, ysMm: 25 }),
  upn300: am(101, { hMm: 300, bMm: 100, twMm: 10, tfMm: 16, rMm: 16, areaCm2: 58.8, iyCm4: 8030, welYCm3: 535, wplYCm3: 632, izCm4: 495, welZCm3: 67.8, wplZCm3: 130, ysMm: 27 }),
  upn320: am(101, { hMm: 320, bMm: 100, twMm: 14, tfMm: 17.5, rMm: 18, areaCm2: 75.8, iyCm4: 10870, welYCm3: 679, wplYCm3: 826, izCm4: 597, welZCm3: 80.6, wplZCm3: 152, ysMm: 26 }),
  upn400: am(101, { hMm: 400, bMm: 110, twMm: 14, tfMm: 18, rMm: 18, areaCm2: 91.5, iyCm4: 20350, welYCm3: 1020, wplYCm3: 1240, izCm4: 846, welZCm3: 102, wplZCm3: 190, ysMm: 27 }),
  // UPE — EN 10365
  upe80: am(97, { hMm: 80, bMm: 50, twMm: 4, tfMm: 7, rMm: 10, areaCm2: 10.1, iyCm4: 107, welYCm3: 26.8, wplYCm3: 31.2, izCm4: 25.5, welZCm3: 8, wplZCm3: 13.94, ysMm: 18 }),
  upe100: am(97, { hMm: 100, bMm: 55, twMm: 4.5, tfMm: 7.5, rMm: 10, areaCm2: 12.5, iyCm4: 207, welYCm3: 41.4, wplYCm3: 48, izCm4: 38.3, welZCm3: 10.6, wplZCm3: 18.88, ysMm: 19 }),
  upe120: am(97, { hMm: 120, bMm: 60, twMm: 5, tfMm: 8, rMm: 12, areaCm2: 15.4, iyCm4: 364, welYCm3: 60.6, wplYCm3: 70.3, izCm4: 55.5, welZCm3: 13.8, wplZCm3: 24.8, ysMm: 20 }),
  upe140: am(97, { hMm: 140, bMm: 65, twMm: 5, tfMm: 9, rMm: 12, areaCm2: 18.4, iyCm4: 600, welYCm3: 85.6, wplYCm3: 98.8, izCm4: 78.8, welZCm3: 18.2, wplZCm3: 32.58, ysMm: 22 }),
  upe160: am(97, { hMm: 160, bMm: 70, twMm: 5.5, tfMm: 9.5, rMm: 12, areaCm2: 21.7, iyCm4: 911, welYCm3: 114, wplYCm3: 132, izCm4: 107, welZCm3: 22.6, wplZCm3: 40.72, ysMm: 23 }),
  upe180: am(97, { hMm: 180, bMm: 75, twMm: 5.5, tfMm: 10.5, rMm: 12, areaCm2: 25.1, iyCm4: 1350, welYCm3: 150, wplYCm3: 173, izCm4: 144, welZCm3: 28.6, wplZCm3: 51.47, ysMm: 25 }),
  upe200: am(97, { hMm: 200, bMm: 80, twMm: 6, tfMm: 11, rMm: 13, areaCm2: 29, iyCm4: 1910, welYCm3: 191, wplYCm3: 220, izCm4: 187, welZCm3: 34.5, wplZCm3: 62.2, ysMm: 26 }),
  upe220: am(97, { hMm: 220, bMm: 85, twMm: 6.5, tfMm: 12, rMm: 13, areaCm2: 33.9, iyCm4: 2680, welYCm3: 244, wplYCm3: 281, izCm4: 247, welZCm3: 42.5, wplZCm3: 76.88, ysMm: 27 }),
  upe240: am(97, { hMm: 240, bMm: 90, twMm: 7, tfMm: 12.5, rMm: 15, areaCm2: 38.5, iyCm4: 3600, welYCm3: 300, wplYCm3: 347, izCm4: 311, welZCm3: 50.1, wplZCm3: 90.84, ysMm: 28 }),
  upe270: am(97, { hMm: 270, bMm: 95, twMm: 7.5, tfMm: 13.5, rMm: 15, areaCm2: 44.8, iyCm4: 5250, welYCm3: 389, wplYCm3: 451, izCm4: 401, welZCm3: 60.7, wplZCm3: 110.2, ysMm: 29 }),
  upe300: am(97, { hMm: 300, bMm: 100, twMm: 9.5, tfMm: 15, rMm: 15, areaCm2: 56.6, iyCm4: 7820, welYCm3: 522, wplYCm3: 613, izCm4: 538, welZCm3: 75.6, wplZCm3: 140.1, ysMm: 29 }),
  upe330: am(97, { hMm: 330, bMm: 105, twMm: 11, tfMm: 16, rMm: 18, areaCm2: 67.8, iyCm4: 11010, welYCm3: 667, wplYCm3: 792, izCm4: 681, welZCm3: 89.7, wplZCm3: 161.7, ysMm: 29 }),
  upe360: am(97, { hMm: 360, bMm: 110, twMm: 12, tfMm: 17, rMm: 18, areaCm2: 77.9, iyCm4: 14830, welYCm3: 824, wplYCm3: 982, izCm4: 844, welZCm3: 105, wplZCm3: 189.2, ysMm: 30 }),
  upe400: am(97, { hMm: 400, bMm: 115, twMm: 13.5, tfMm: 18, rMm: 18, areaCm2: 91.9, iyCm4: 20980, welYCm3: 1050, wplYCm3: 1260, izCm4: 1045, welZCm3: 123, wplZCm3: 220.8, ysMm: 30 }),
  // T — DIN EN 10055 (radiused root and toes)
  t30x4: tee({ hMm: 30, bMm: 30, twMm: 4, tfMm: 4, rMm: 4, areaCm2: 2.26, iyCm4: 1.725, welYCm3: 0.8, wplYCm3: 1.5, izCm4: 0.869, welZCm3: 0.58, wplZCm3: 0.98, eMm: 8.5 }),
  "t35x4.5": tee({ hMm: 35, bMm: 35, twMm: 4.5, tfMm: 4.5, rMm: 4.5, areaCm2: 2.97, iyCm4: 3.1, welYCm3: 1.24, wplYCm3: 2.3, izCm4: 1.55, welZCm3: 0.89, wplZCm3: 1.49, eMm: 9.9 }),
  t40x5: tee({ hMm: 40, bMm: 40, twMm: 5, tfMm: 5, rMm: 5, areaCm2: 3.78, iyCm4: 5.28, welYCm3: 1.83, wplYCm3: 3.35, izCm4: 2.57, welZCm3: 1.29, wplZCm3: 2.17, eMm: 11.2 }),
  t50x6: tee({ hMm: 50, bMm: 50, twMm: 6, tfMm: 6, rMm: 6, areaCm2: 5.67, iyCm4: 12.14, welYCm3: 3.36, wplYCm3: 6.28, izCm4: 6.04, welZCm3: 2.42, wplZCm3: 4.05, eMm: 13.9 }),
  t60x7: tee({ hMm: 60, bMm: 60, twMm: 7, tfMm: 7, rMm: 7, areaCm2: 7.94, iyCm4: 24, welYCm3: 5.53, wplYCm3: 10.54, izCm4: 12.2, welZCm3: 4.07, wplZCm3: 6.79, eMm: 16.6 }),
};

/**
 * Standard sizes with no properties, and why. Empty: every standard size has
 * a cited row. A size added without one must be named here with the reason.
 */
export const SECTION_PROPERTIES_UNSOURCED: Readonly<Record<string, string>> = {};

export interface ResolvedSectionProperties extends SectionProperties {
  /** Radii of gyration, cm — derived as sqrt(I / A). */
  iyRadiusCm: number;
  izRadiusCm: number;
}

/** The published properties for a standard size id, or null when there is no sourced row. */
export function getSectionProperties(sizeId: string | null | undefined): ResolvedSectionProperties | null {
  if (!sizeId) return null;
  const row = SECTION_PROPERTIES[sizeId];
  if (!row) return null;
  return {
    ...row,
    iyRadiusCm: Math.sqrt(row.iyCm4 / row.areaCm2),
    izRadiusCm: Math.sqrt(row.izCm4 / row.areaCm2),
  };
}
