import { calculateMetal, cmdParse } from "@ferroscale/metal-core";
import type { CalculationInput } from "@/lib/calculator/types";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import type { SavedEntry, TemplatePart } from "@/hooks/useSaved";

/**
 * The standards that ship with the app.
 *
 * These used to be `AssemblyTemplate`s in a collection of their own. They are
 * library entries now — a template was only ever a multi-part saved entry that
 * also carried the labour and hardware a project would inherit, so those
 * fields moved onto the entry and the second store went away.
 *
 * A built-in is identified by `isBuiltin` and a stable id, never persisted
 * whole: `useSaved` merges this list in on read, and a removal is stored as a
 * tombstone carrying the same id. That way a later build can change a
 * standard's contents without resurrecting one the user threw away.
 */

const DEFAULT_PARSER_SETTINGS = {
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

/**
 * One cut, from the same command syntax the bar takes. The quantity lives in
 * the input, as it does for every other part — the old item type carried it
 * twice and the two could drift.
 */
export function partFromCommand(
  cmd: string,
  quantity: number,
  name: string,
  id?: string,
): TemplatePart | null {
  const parsed = cmdParse(cmd, DEFAULT_PARSER_SETTINGS);
  if (!parsed.calc) return null;
  const qty = Math.max(1, Math.floor(quantity || parsed.calc.input.quantity || 1));
  const input: CalculationInput = { ...parsed.calc.input, quantity: qty };
  const calc = calculateMetal(input);
  const result = calc.ok ? calc.result : { ...parsed.calc.result, quantity: qty };
  return {
    id: id ?? crypto.randomUUID(),
    name,
    input,
    result,
    normalizedProfile: normalizeProfileSnapshot(input),
  };
}

const BUILTIN_AT = "2026-01-01T00:00:00.000Z";

interface BuiltinSpec {
  id: string;
  name: string;
  notes: string;
  category: SavedEntry["category"];
  laborHours?: number;
  additionalCosts?: NonNullable<SavedEntry["additionalCosts"]>;
  /** `[command, quantity, part name]` — the part name was the item's note. */
  parts: Array<[string, number, string]>;
}

const BUILTINS: BuiltinSpec[] = [
  {
    id: "builtin-stair-tread",
    name: "Stair Step Tread (900mm)",
    notes:
      "Standard 900mm steel stair tread with 2x side mounting angles and front nosing flat bar.",
    category: "stairs_railings",
    laborHours: 0.35,
    additionalCosts: [
      { id: "cost-tread-bolts", label: "4x M12 Hex Bolts & Washers", amount: 3.2, category: "hardware" },
    ],
    parts: [
      ["plt280x900x4 x1 s235", 1, "Tread step plate"],
      ["l50x50x5 280mm x2 s235", 2, "Side fixing brackets"],
      ["flt40x5 900mm x1 s235", 1, "Front nosing bar"],
    ],
  },
  {
    id: "builtin-railing-post",
    name: "Railing Post & Base Flange (1m)",
    notes: "1-metre SHS 40x40 railing post with welded 120x120x10 base plate and top cap.",
    category: "stairs_railings",
    laborHours: 0.25,
    additionalCosts: [
      { id: "cost-post-anchors", label: "4x M12 Expansion Floor Anchors", amount: 4.8, category: "hardware" },
    ],
    parts: [
      ["shs40x40x3 1m x1 s235", 1, "Main post column"],
      ["plt120x120x10 x1 s235", 1, "Base anchor flange"],
      ["plt40x40x3 x1 s235", 1, "Top cap plate"],
    ],
  },
  {
    id: "builtin-baluster-bay",
    name: "Standard Baluster Railing Section (2m)",
    notes: "2-metre railing infill panel with 14 vertical square bars and horizontal runners.",
    category: "stairs_railings",
    laborHours: 1.0,
    parts: [
      ["rhs40x20x2 2m x1 s235", 1, "Top handrail tube"],
      ["rhs40x20x2 2m x1 s235", 1, "Bottom runner tube"],
      ["sq12 0.9m x14 s235", 14, "Vertical pickets / spindles"],
    ],
  },
  {
    id: "builtin-beam-end-plates",
    name: "Beam with Connection End Plates (3m)",
    notes: "3m HEA 140 structural beam with 2x 200x160x12 drilled end connection plates.",
    category: "structural",
    laborHours: 0.75,
    additionalCosts: [
      { id: "cost-beam-bolts", label: "8x M16 8.8 Structural Bolts", amount: 9.6, category: "hardware" },
    ],
    parts: [
      ["hea140 3m x1 s235", 1, "Main column / beam"],
      ["plt200x160x12 x2 s235", 2, "Welded end connection plates"],
    ],
  },
  {
    id: "builtin-fence-panel",
    name: "Industrial Fence Panel (2.5m)",
    notes: "2.5m wide perimeter fence panel with 20 vertical round tube pickets.",
    category: "gates_fences",
    laborHours: 1.2,
    parts: [
      ["rhs50x30x2 2.5m x2 s235", 2, "Top & bottom horizontal rails"],
      ["chs20x2 1.2m x20 s235", 20, "Vertical round tubes"],
    ],
  },
];

export function getBuiltinLibraryEntries(): SavedEntry[] {
  const out: SavedEntry[] = [];
  for (const spec of BUILTINS) {
    const parts = spec.parts
      .map(([cmd, qty, name], index) => partFromCommand(cmd, qty, name, `${spec.id}-p${index}`))
      .filter((part): part is TemplatePart => part != null);
    if (parts.length === 0) continue;
    out.push({
      id: spec.id,
      timestamp: BUILTIN_AT,
      name: spec.name,
      notes: spec.notes,
      category: spec.category,
      laborHours: spec.laborHours,
      additionalCosts: spec.additionalCosts,
      isBuiltin: true,
      // A standard is an assembly even when a variant parses down to one part.
      isAssembly: true,
      useCount: 0,
      updatedAt: BUILTIN_AT,
      parts,
      input: parts[0].input,
      result: parts[0].result,
      normalizedProfile: parts[0].normalizedProfile,
    });
  }
  return out;
}
