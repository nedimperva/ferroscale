import { calculateMetal, cmdParse } from "@ferroscale/metal-core";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import type { CalculationInput } from "@/lib/calculator/types";
import type { ProjectAdditionalCost, ProjectCategory } from "@/hooks/useProjects";
import type { SavedEntry, TemplatePart } from "@/hooks/useSaved";

/**
 * Library assemblies for tests, built from the same command syntax the bar
 * takes. The app used to ship five standards, and the tests leaned on them as
 * fixtures — which meant a test could only exercise a shape the product
 * happened to include. These are the tests' own.
 */

const SETTINGS = {
  pricing: {
    priceBasis: "weight" as const,
    priceUnit: "kg" as const,
    unitPrice: 2.5,
    currency: "EUR" as const,
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m" as const,
};

/** `[command, quantity, part name]` — the shape an assembly's cuts come in. */
export type PartSpec = [command: string, quantity: number, name: string];

export function libraryPart([command, quantity, name]: PartSpec, id: string): TemplatePart {
  const parsed = cmdParse(command, SETTINGS);
  if (!parsed.calc) throw new Error(`fixture does not parse: ${command}`);
  const qty = Math.max(1, Math.floor(quantity || parsed.calc.input.quantity || 1));
  const input: CalculationInput = { ...parsed.calc.input, quantity: qty };
  const calc = calculateMetal(input);
  return {
    id,
    name,
    input,
    result: calc.ok ? calc.result : { ...parsed.calc.result, quantity: qty },
    normalizedProfile: normalizeProfileSnapshot(input),
  };
}

export function libraryAssembly(
  id: string,
  name: string,
  specs: PartSpec[],
  extras: {
    notes?: string;
    category?: ProjectCategory;
    laborHours?: number;
    additionalCosts?: ProjectAdditionalCost[];
  } = {},
): SavedEntry {
  const at = "2026-01-01T00:00:00.000Z";
  const parts = specs.map((spec, index) => libraryPart(spec, `${id}-p${index}`));
  return {
    id,
    timestamp: at,
    updatedAt: at,
    name,
    useCount: 0,
    isAssembly: true,
    parts,
    input: parts[0].input,
    result: parts[0].result,
    normalizedProfile: parts[0].normalizedProfile,
    ...extras,
  };
}
