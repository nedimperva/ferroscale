import type { StandardProfileDefinition } from "../types";
import { mapSizes } from "../standard-section-mm";

export const CHANNEL_ANGLE_PROFILES: StandardProfileDefinition[] = [
  /* ------------------------------------------------------------------ */
  /*  UPN Channel (EN 10365)                                            */
  /* ------------------------------------------------------------------ */
  {
    id: "channel_upn_en",
    label: "UPN Channel",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10365",
    sizes: mapSizes([
      { id: "upn50", label: "UPN 50", areaMm2: 714, perimeterMm: 224, referenceLabel: "EN 10365" },
      { id: "upn65", label: "UPN 65", areaMm2: 903, perimeterMm: 267, referenceLabel: "EN 10365" },
      { id: "upn80", label: "UPN 80", areaMm2: 1100, perimeterMm: 307, referenceLabel: "EN 10365" },
      { id: "upn100", label: "UPN 100", areaMm2: 1350, perimeterMm: 366, referenceLabel: "EN 10365" },
      { id: "upn120", label: "UPN 120", areaMm2: 1707, perimeterMm: 423, referenceLabel: "EN 10365" },
      { id: "upn140", label: "UPN 140", areaMm2: 2040, perimeterMm: 480, referenceLabel: "EN 10365" },
      { id: "upn160", label: "UPN 160", areaMm2: 2395, perimeterMm: 538, referenceLabel: "EN 10365" },
      { id: "upn180", label: "UPN 180", areaMm2: 2800, perimeterMm: 596, referenceLabel: "EN 10365" },
      { id: "upn200", label: "UPN 200", areaMm2: 3223, perimeterMm: 653, referenceLabel: "EN 10365" },
      { id: "upn220", label: "UPN 220", areaMm2: 3748, perimeterMm: 709, referenceLabel: "EN 10365" },
      { id: "upn240", label: "UPN 240", areaMm2: 4230, perimeterMm: 768, referenceLabel: "EN 10365" },
      { id: "upn260", label: "UPN 260", areaMm2: 4833, perimeterMm: 824, referenceLabel: "EN 10365" },
      { id: "upn280", label: "UPN 280", areaMm2: 5320, perimeterMm: 881, referenceLabel: "EN 10365" },
      { id: "upn300", label: "UPN 300", areaMm2: 5878, perimeterMm: 939, referenceLabel: "EN 10365" },
      { id: "upn320", label: "UPN 320", areaMm2: 6475, perimeterMm: 967, referenceLabel: "EN 10365" },
      { id: "upn400", label: "UPN 400", areaMm2: 9179, perimeterMm: 1166, referenceLabel: "EN 10365" },
    ]),
  },

  /* ------------------------------------------------------------------ */
  /*  UPE Channel (EN 10279)                                            */
  /* ------------------------------------------------------------------ */
  {
    id: "channel_upe_en",
    label: "UPE Channel",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10279",
    sizes: mapSizes([
      { id: "upe80", label: "UPE 80", areaMm2: 1010, perimeterMm: 331, referenceLabel: "EN 10279" },
      { id: "upe100", label: "UPE 100", areaMm2: 1279, perimeterMm: 390, referenceLabel: "EN 10279" },
      { id: "upe120", label: "UPE 120", areaMm2: 1600, perimeterMm: 449, referenceLabel: "EN 10279" },
      { id: "upe140", label: "UPE 140", areaMm2: 1910, perimeterMm: 509, referenceLabel: "EN 10279" },
      { id: "upe160", label: "UPE 160", areaMm2: 2240, perimeterMm: 568, referenceLabel: "EN 10279" },
      { id: "upe180", label: "UPE 180", areaMm2: 2590, perimeterMm: 628, referenceLabel: "EN 10279" },
      { id: "upe200", label: "UPE 200", areaMm2: 2938, perimeterMm: 686, referenceLabel: "EN 10279" },
      { id: "upe220", label: "UPE 220", areaMm2: 3370, perimeterMm: 745, referenceLabel: "EN 10279" },
      { id: "upe240", label: "UPE 240", areaMm2: 3839, perimeterMm: 800, referenceLabel: "EN 10279" },
      { id: "upe270", label: "UPE 270", areaMm2: 4592, perimeterMm: 879, referenceLabel: "EN 10279" },
      { id: "upe300", label: "UPE 300", areaMm2: 5366, perimeterMm: 955, referenceLabel: "EN 10279" },
      { id: "upe330", label: "UPE 330", areaMm2: 6234, perimeterMm: 1027, referenceLabel: "EN 10279" },
      { id: "upe360", label: "UPE 360", areaMm2: 7218, perimeterMm: 1105, referenceLabel: "EN 10279" },
      { id: "upe400", label: "UPE 400", areaMm2: 8440, perimeterMm: 1197, referenceLabel: "EN 10279" },
    ]),
  },

];
