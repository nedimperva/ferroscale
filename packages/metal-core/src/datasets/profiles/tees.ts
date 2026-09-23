import type { StandardProfileDefinition } from "../types";

export const TEE_PROFILES: StandardProfileDefinition[] = [
  {
    id: "tee_en",
    label: "Tee Section (T)",
    category: "structural",
    mode: "standard",
    formulaLabel: "A from EN size table",
    referenceLabel: "EN 10055",
    sizes: [
      { id: "t30x4", label: "T 30×30×4", areaMm2: 226, perimeterMm: 120, referenceLabel: "EN 10055" },
      { id: "t35x4.5", label: "T 35×35×4.5", areaMm2: 298, perimeterMm: 140, referenceLabel: "EN 10055" },
      { id: "t40x5", label: "T 40×40×5", areaMm2: 377, perimeterMm: 160, referenceLabel: "EN 10055" },
      { id: "t50x6", label: "T 50×50×6", areaMm2: 564, perimeterMm: 200, referenceLabel: "EN 10055" },
      { id: "t60x7", label: "T 60×60×7", areaMm2: 791, perimeterMm: 240, referenceLabel: "EN 10055" },
    ],
  },
];
