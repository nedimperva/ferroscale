import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import { toMillimeters } from "@/lib/calculator/units";
import { stockGroupFor, type CutGroupKind, type StockGroupKey } from "./stock";

/**
 * A project's bill of material, grouped the way the shop buys it — the
 * project-sized twin of the calculator's `groupBillOfMaterial`. Two cuts of
 * L 50×50×5 are one stock line with two lengths under it; every 5 mm
 * chequered plate is one line whatever its sizes. The key is the cut plan's
 * and the order list's (`stockGroupFor`), so line 03 here is line 03 there.
 *
 * Lines keep the order their first cut appears in the project, and a library
 * assembly that went in as one entry is opened up into its parts — each part
 * is bought on its own stock line, however it was inserted.
 */

export interface BomCut {
  /** Unique within the project: the entry id, plus the part for an assembly. */
  key: string;
  /** The project entry this cut belongs to — what quantity, note and remove act on. */
  calc: ProjectCalculation;
  /** Set for a part of an assembly that went in as one entry. */
  partIndex?: number;
  /** "4200 mm", or "300 × 1000 mm" for plate. */
  cut: string;
  pieces: number;
  weightKg: number;
  amount: number;
  /** The sub-assembly the cut is tagged with, or the assembly it came in as. */
  assembly?: string;
}

export interface BomLine {
  key: string;
  kind: CutGroupKind;
  /** "UPN 200", "Chequered plate 5 mm" — the grade is its own column. */
  name: string;
  gradeLabel: string;
  cuts: BomCut[];
  pieces: number;
  /** Bars: metres of stock across every cut. */
  lengthM: number;
  /** Plate: square metres across every cut. */
  areaM2: number;
  weightKg: number;
  amount: number;
}

const round = (n: number, places: number) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

function fmtMm(mm: number): string {
  return String(round(mm, 1));
}

function plateWidthMm(calc: { input: ProjectCalculation["input"] }): number | null {
  const w = calc.input.manualDimensions?.width;
  return w ? toMillimeters(w.value, w.unit) : null;
}

type SourcedCut = Omit<BomCut, "calc"> & { stock: StockGroupKey; gradeLabel: string };

function cutsOf(calc: ProjectCalculation): SourcedCut[] {
  const tag = calc.assembly?.trim() || calc.templateName || undefined;
  const sources =
    calc.templateParts && calc.templateParts.length > 0
      ? calc.templateParts.map((part, i) => ({ input: part.input, result: part.result, partIndex: i }))
      : [{ input: calc.input, result: calc.result, partIndex: undefined }];

  return sources.map(({ input, result, partIndex }) => {
    const stock = stockGroupFor(input, { ...result, profileId: result.profileId || input.profileId });
    const width = stock.kind === "2d_plate" ? plateWidthMm({ input }) : null;
    const cut =
      stock.kind === "2d_plate" && width != null
        ? `${fmtMm(width)} × ${fmtMm(result.lengthMm)} mm`
        : result.lengthMm > 0
          ? `${fmtMm(result.lengthMm)} mm`
          : "—";
    return {
      key: partIndex === undefined ? calc.id : `${calc.id}:${partIndex}`,
      partIndex,
      cut,
      pieces: Math.max(1, result.quantity),
      weightKg: result.totalWeightKg,
      amount: result.grandTotalAmount,
      assembly: tag,
      stock,
      gradeLabel: result.gradeLabel,
    };
  });
}

export function projectBillOfMaterial(project: Project): BomLine[] {
  const lines = new Map<string, BomLine>();
  for (const calc of project.calculations) {
    for (const { stock, gradeLabel, ...cut } of cutsOf(calc)) {
      let line = lines.get(stock.groupKey);
      if (!line) {
        line = {
          key: stock.groupKey,
          kind: stock.kind,
          name: stock.name,
          gradeLabel,
          cuts: [],
          pieces: 0,
          lengthM: 0,
          areaM2: 0,
          weightKg: 0,
          amount: 0,
        };
        lines.set(stock.groupKey, line);
      }
      line.cuts.push({ ...cut, calc });
    }
  }

  for (const line of lines.values()) {
    for (const cut of line.cuts) {
      const source = cut.partIndex === undefined ? cut.calc : cut.calc.templateParts![cut.partIndex];
      const lengthM = source.result.lengthMm / 1000;
      line.pieces += cut.pieces;
      line.weightKg += cut.weightKg;
      line.amount += cut.amount;
      if (line.kind === "2d_plate") {
        const width = plateWidthMm(source);
        if (width != null) line.areaM2 += (width / 1000) * lengthM * cut.pieces;
      } else {
        line.lengthM += lengthM * cut.pieces;
      }
    }
    line.amount = round(line.amount, 2);
    line.lengthM = round(line.lengthM, 3);
    line.areaM2 = round(line.areaM2, 3);
  }
  return [...lines.values()];
}

/**
 * Where the bill of material names an assembly — once, where it tells you
 * something. A project with one assembly (or none) names none: every cut
 * would carry the same word. A stock line whose cuts all belong to one
 * assembly names it once, on the line. Only a line that mixes assemblies
 * names each cut, since that is the line where "which one is this for" has
 * more than one answer.
 */
export interface AssemblyLabels {
  /** The assembly named on a stock line, by line key. */
  line: Map<string, string>;
  /** Lines whose cuts each carry their own assembly. */
  perCut: Set<string>;
}

export function assemblyLabels(lines: BomLine[]): AssemblyLabels {
  const labels: AssemblyLabels = { line: new Map(), perCut: new Set() };
  const all = new Set(lines.flatMap((line) => line.cuts.map((cut) => cut.assembly ?? "")));
  if (all.size < 2) return labels;
  for (const line of lines) {
    const own = new Set(line.cuts.map((cut) => cut.assembly ?? ""));
    if (own.size > 1) labels.perCut.add(line.key);
    else {
      const [only] = own;
      if (only) labels.line.set(line.key, only);
    }
  }
  return labels;
}
