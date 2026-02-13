import type { ProfileDefinition, ProfileId } from "@/lib/datasets/types";

export const PROFILE_DEFINITIONS: ProfileDefinition[] = [
  {
    id: "round_bar",
    label: "Round Bar",
    mode: "manual",
    formulaLabel: "A = pi * d^2 / 4",
    referenceLabel: "EN 10060",
    dimensions: [
      { key: "diameter", label: "Diameter", minMm: 4, maxMm: 600, defaultMm: 30 },
    ],
  },
  {
    id: "square_bar",
    label: "Square Bar",
    mode: "manual",
    formulaLabel: "A = a^2",
    referenceLabel: "EN 10059",
    dimensions: [{ key: "side", label: "Side", minMm: 4, maxMm: 500, defaultMm: 30 }],
  },
  {
    id: "flat_bar",
    label: "Flat Bar",
    mode: "manual",
    formulaLabel: "A = b * t",
    referenceLabel: "EN 10058",
    dimensions: [
      { key: "width", label: "Width", minMm: 10, maxMm: 1000, defaultMm: 80 },
      { key: "thickness", label: "Thickness", minMm: 2, maxMm: 120, defaultMm: 8 },
    ],
  },
  {
    id: "hex_bar",
    label: "Hex Bar",
    mode: "manual",
    formulaLabel: "A = (sqrt(3) / 2) * s^2",
    referenceLabel: "EN 10061",
    dimensions: [
      { key: "acrossFlats", label: "Across Flats", minMm: 6, maxMm: 300, defaultMm: 24 },
    ],
  },
  {
    id: "sheet",
    label: "Sheet",
    mode: "manual",
    formulaLabel: "A = width * thickness",
    referenceLabel: "EN 10051",
    dimensions: [
      { key: "width", label: "Width", minMm: 100, maxMm: 3000, defaultMm: 1250 },
      { key: "thickness", label: "Thickness", minMm: 0.4, maxMm: 6, defaultMm: 2 },
    ],
  },
  {
    id: "plate",
    label: "Plate",
    mode: "manual",
    formulaLabel: "A = width * thickness",
    referenceLabel: "EN 10029",
    dimensions: [
      { key: "width", label: "Width", minMm: 100, maxMm: 4000, defaultMm: 1500 },
      { key: "thickness", label: "Thickness", minMm: 6, maxMm: 250, defaultMm: 20 },
    ],
  },
  {
    id: "pipe",
    label: "Pipe",
    mode: "manual",
    formulaLabel: "A = pi * (OD^2 - ID^2) / 4",
    referenceLabel: "EN 10255 / EN 10216",
    dimensions: [
      { key: "outerDiameter", label: "Outer Diameter", minMm: 10, maxMm: 1200, defaultMm: 60.3 },
      { key: "wallThickness", label: "Wall Thickness", minMm: 1.2, maxMm: 80, defaultMm: 3.2 },
    ],
  },
  {
    id: "rectangular_tube",
    label: "Rectangular Tube",
    mode: "manual",
    formulaLabel: "A = B*H - (B-2t)*(H-2t)",
    referenceLabel: "EN 10219 / EN 10210",
    dimensions: [
      { key: "width", label: "Width (B)", minMm: 20, maxMm: 500, defaultMm: 120 },
      { key: "height", label: "Height (H)", minMm: 20, maxMm: 500, defaultMm: 80 },
      { key: "wallThickness", label: "Wall Thickness", minMm: 1.5, maxMm: 40, defaultMm: 4 },
    ],
  },
  {
    id: "angle_equal_en",
    label: "Equal Angle (EN)",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10056-1",
    sizes: [
      { id: "l40x4", label: "L 40x40x4", areaMm2: 304, referenceLabel: "EN 10056-1" },
      { id: "l50x5", label: "L 50x50x5", areaMm2: 475, referenceLabel: "EN 10056-1" },
      { id: "l60x6", label: "L 60x60x6", areaMm2: 684, referenceLabel: "EN 10056-1" },
      { id: "l80x8", label: "L 80x80x8", areaMm2: 1216, referenceLabel: "EN 10056-1" },
      { id: "l100x10", label: "L 100x100x10", areaMm2: 1885, referenceLabel: "EN 10056-1" },
    ],
  },
  {
    id: "channel_upn_en",
    label: "UPN Channel (EN)",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      { id: "upn80", label: "UPN 80", areaMm2: 1100, referenceLabel: "EN 10365" },
      { id: "upn100", label: "UPN 100", areaMm2: 1350, referenceLabel: "EN 10365" },
      { id: "upn120", label: "UPN 120", areaMm2: 1707, referenceLabel: "EN 10365" },
      { id: "upn160", label: "UPN 160", areaMm2: 2395, referenceLabel: "EN 10365" },
      { id: "upn200", label: "UPN 200", areaMm2: 3223, referenceLabel: "EN 10365" },
    ],
  },
  {
    id: "beam_ipe_en",
    label: "IPE Beam (EN)",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: [
      { id: "ipe80", label: "IPE 80", areaMm2: 764, referenceLabel: "EN 10365" },
      { id: "ipe100", label: "IPE 100", areaMm2: 1030, referenceLabel: "EN 10365" },
      { id: "ipe120", label: "IPE 120", areaMm2: 1320, referenceLabel: "EN 10365" },
      { id: "ipe160", label: "IPE 160", areaMm2: 2010, referenceLabel: "EN 10365" },
      { id: "ipe200", label: "IPE 200", areaMm2: 2620, referenceLabel: "EN 10365" },
    ],
  },
  {
    id: "tee_en",
    label: "Tee Section (EN)",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365 / EN 10055",
    sizes: [
      { id: "t40x5", label: "T 40x40x5", areaMm2: 375, referenceLabel: "EN 10365" },
      { id: "t50x6", label: "T 50x50x6", areaMm2: 564, referenceLabel: "EN 10365" },
      { id: "t60x7", label: "T 60x60x7", areaMm2: 791, referenceLabel: "EN 10365" },
      { id: "t80x8", label: "T 80x80x8", areaMm2: 1216, referenceLabel: "EN 10365" },
      { id: "t100x10", label: "T 100x100x10", areaMm2: 1885, referenceLabel: "EN 10365" },
    ],
  },
];

export function getProfileById(profileId: ProfileId): ProfileDefinition | undefined {
  return PROFILE_DEFINITIONS.find((profile) => profile.id === profileId);
}
