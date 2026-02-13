import type { StandardProfileDefinition } from "@/lib/datasets/types";

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
    sizes: [
      { id: "upn50", label: "UPN 50", areaMm2: 714, referenceLabel: "EN 10365" },
      { id: "upn65", label: "UPN 65", areaMm2: 903, referenceLabel: "EN 10365" },
      { id: "upn80", label: "UPN 80", areaMm2: 1100, referenceLabel: "EN 10365" },
      { id: "upn100", label: "UPN 100", areaMm2: 1350, referenceLabel: "EN 10365" },
      { id: "upn120", label: "UPN 120", areaMm2: 1707, referenceLabel: "EN 10365" },
      { id: "upn140", label: "UPN 140", areaMm2: 2040, referenceLabel: "EN 10365" },
      { id: "upn160", label: "UPN 160", areaMm2: 2395, referenceLabel: "EN 10365" },
      { id: "upn180", label: "UPN 180", areaMm2: 2800, referenceLabel: "EN 10365" },
      { id: "upn200", label: "UPN 200", areaMm2: 3223, referenceLabel: "EN 10365" },
      { id: "upn220", label: "UPN 220", areaMm2: 3748, referenceLabel: "EN 10365" },
      { id: "upn240", label: "UPN 240", areaMm2: 4230, referenceLabel: "EN 10365" },
      { id: "upn260", label: "UPN 260", areaMm2: 4833, referenceLabel: "EN 10365" },
      { id: "upn280", label: "UPN 280", areaMm2: 5320, referenceLabel: "EN 10365" },
      { id: "upn300", label: "UPN 300", areaMm2: 5878, referenceLabel: "EN 10365" },
      { id: "upn320", label: "UPN 320", areaMm2: 6475, referenceLabel: "EN 10365" },
      { id: "upn400", label: "UPN 400", areaMm2: 9179, referenceLabel: "EN 10365" },
    ],
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
    sizes: [
      { id: "upe80", label: "UPE 80", areaMm2: 1010, referenceLabel: "EN 10279" },
      { id: "upe100", label: "UPE 100", areaMm2: 1279, referenceLabel: "EN 10279" },
      { id: "upe120", label: "UPE 120", areaMm2: 1600, referenceLabel: "EN 10279" },
      { id: "upe140", label: "UPE 140", areaMm2: 1910, referenceLabel: "EN 10279" },
      { id: "upe160", label: "UPE 160", areaMm2: 2240, referenceLabel: "EN 10279" },
      { id: "upe180", label: "UPE 180", areaMm2: 2590, referenceLabel: "EN 10279" },
      { id: "upe200", label: "UPE 200", areaMm2: 2938, referenceLabel: "EN 10279" },
      { id: "upe220", label: "UPE 220", areaMm2: 3370, referenceLabel: "EN 10279" },
      { id: "upe240", label: "UPE 240", areaMm2: 3839, referenceLabel: "EN 10279" },
      { id: "upe270", label: "UPE 270", areaMm2: 4592, referenceLabel: "EN 10279" },
      { id: "upe300", label: "UPE 300", areaMm2: 5366, referenceLabel: "EN 10279" },
      { id: "upe330", label: "UPE 330", areaMm2: 6234, referenceLabel: "EN 10279" },
      { id: "upe360", label: "UPE 360", areaMm2: 7218, referenceLabel: "EN 10279" },
      { id: "upe400", label: "UPE 400", areaMm2: 8440, referenceLabel: "EN 10279" },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Equal Angle (EN 10056-1)                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "angle_equal_en",
    label: "Equal Angle (L)",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10056-1",
    sizes: [
      { id: "l20x3", label: "L 20×20×3", areaMm2: 113, referenceLabel: "EN 10056-1" },
      { id: "l25x3", label: "L 25×25×3", areaMm2: 143, referenceLabel: "EN 10056-1" },
      { id: "l25x4", label: "L 25×25×4", areaMm2: 188, referenceLabel: "EN 10056-1" },
      { id: "l30x3", label: "L 30×30×3", areaMm2: 174, referenceLabel: "EN 10056-1" },
      { id: "l30x4", label: "L 30×30×4", areaMm2: 228, referenceLabel: "EN 10056-1" },
      { id: "l35x4", label: "L 35×35×4", areaMm2: 268, referenceLabel: "EN 10056-1" },
      { id: "l40x4", label: "L 40×40×4", areaMm2: 304, referenceLabel: "EN 10056-1" },
      { id: "l40x5", label: "L 40×40×5", areaMm2: 378, referenceLabel: "EN 10056-1" },
      { id: "l45x5", label: "L 45×45×5", areaMm2: 432, referenceLabel: "EN 10056-1" },
      { id: "l50x5", label: "L 50×50×5", areaMm2: 475, referenceLabel: "EN 10056-1" },
      { id: "l50x6", label: "L 50×50×6", areaMm2: 569, referenceLabel: "EN 10056-1" },
      { id: "l60x5", label: "L 60×60×5", areaMm2: 582, referenceLabel: "EN 10056-1" },
      { id: "l60x6", label: "L 60×60×6", areaMm2: 684, referenceLabel: "EN 10056-1" },
      { id: "l60x8", label: "L 60×60×8", areaMm2: 906, referenceLabel: "EN 10056-1" },
      { id: "l70x7", label: "L 70×70×7", areaMm2: 938, referenceLabel: "EN 10056-1" },
      { id: "l75x8", label: "L 75×75×8", areaMm2: 1140, referenceLabel: "EN 10056-1" },
      { id: "l80x8", label: "L 80×80×8", areaMm2: 1216, referenceLabel: "EN 10056-1" },
      { id: "l80x10", label: "L 80×80×10", areaMm2: 1508, referenceLabel: "EN 10056-1" },
      { id: "l90x9", label: "L 90×90×9", areaMm2: 1546, referenceLabel: "EN 10056-1" },
      { id: "l100x10", label: "L 100×100×10", areaMm2: 1885, referenceLabel: "EN 10056-1" },
      { id: "l100x12", label: "L 100×100×12", areaMm2: 2268, referenceLabel: "EN 10056-1" },
      { id: "l120x10", label: "L 120×120×10", areaMm2: 2318, referenceLabel: "EN 10056-1" },
      { id: "l120x12", label: "L 120×120×12", areaMm2: 2762, referenceLabel: "EN 10056-1" },
      { id: "l150x12", label: "L 150×150×12", areaMm2: 3476, referenceLabel: "EN 10056-1" },
      { id: "l150x15", label: "L 150×150×15", areaMm2: 4302, referenceLabel: "EN 10056-1" },
      { id: "l200x16", label: "L 200×200×16", areaMm2: 6159, referenceLabel: "EN 10056-1" },
      { id: "l200x20", label: "L 200×200×20", areaMm2: 7636, referenceLabel: "EN 10056-1" },
      { id: "l200x24", label: "L 200×200×24", areaMm2: 9069, referenceLabel: "EN 10056-1" },
    ],
  },
];
