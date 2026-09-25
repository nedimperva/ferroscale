import type { CommandAlias, CommandLine, CommandParseResult } from "@ferroscale/metal-core";

/**
 * The bill of material, grouped the way a shop orders it. Bars and sections
 * group by profile and size — two cuts of L 45×45×5 are one stock line with
 * two lengths under it. Sheet goods group by thickness — every 10 mm plate
 * is cut from the same plate whatever its width and length. The grade is
 * part of both keys: S235 and S355 of one size are bought separately.
 *
 * Groups keep the order their first part appears on the line, and every
 * member keeps its item index, so the numbers match the command line and the
 * part tabs. A part that doesn't compute is a group of its own.
 */

/** Families sold as sheet stock and ordered by thickness. */
const SHEET_FAMILIES = new Set(["panel", "chequered", "expanded", "corrugated"]);

export interface BomMember {
  /** Position on the command line (0-based). */
  index: number;
  parse: CommandParseResult;
  /** What sets this member apart inside its group: the cut length, or width × length for a sheet. */
  cut: string;
}

export interface BomGroup {
  key: string;
  kind: "section" | "sheet" | "single";
  alias: CommandAlias | null;
  /** Sheet groups: the thickness they share, in mm. */
  thicknessMm: number | null;
  gradeLabel: string | null;
  members: BomMember[];
  pieces: number;
  totalKg: number | null;
  totalAmount: number | null;
  /** Section groups: the metres of stock across every member. */
  totalLengthM: number | null;
}

function toMm(dim: { value: number; unit: string } | undefined): number | null {
  if (!dim) return null;
  switch (dim.unit) {
    case "mm":
      return dim.value;
    case "cm":
      return dim.value * 10;
    case "m":
      return dim.value * 1000;
    case "in":
      return dim.value * 25.4;
    case "ft":
      return dim.value * 304.8;
    default:
      return dim.value;
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function isSheetParse(parse: CommandParseResult): boolean {
  return Boolean(parse.valid && parse.alias && SHEET_FAMILIES.has(parse.alias.fam));
}

function sheetThicknessMm(parse: CommandParseResult): number | null {
  const input = parse.calc?.input;
  if (!input) return null;
  const mm = toMm(input.manualDimensions?.thickness);
  return mm != null ? round(mm) : null;
}

/** "4500 mm", or "1500 × 3000" for a sheet (both in mm). */
export function bomCut(parse: CommandParseResult): string {
  if (isSheetParse(parse)) {
    const input = parse.calc!.input;
    const width = toMm(input.manualDimensions?.width);
    const length = toMm(input.length);
    if (width != null && length != null) return `${round(width)} × ${round(length)} mm`;
  }
  return parse.lengthRaw != null ? `${parse.lengthRaw} ${parse.lengthUnit}` : "";
}

function groupKey(parse: CommandParseResult, index: number): { key: string; kind: BomGroup["kind"] } {
  if (!parse.valid || !parse.alias || !parse.calc) return { key: `single:${index}`, kind: "single" };
  const grade = parse.calc.result.gradeLabel ?? parse.gradeId ?? "";
  if (isSheetParse(parse)) {
    const thickness = sheetThicknessMm(parse);
    if (thickness != null) return { key: `sheet:${parse.alias.fam}:${thickness}:${grade}`, kind: "sheet" };
  }
  if (!parse.hasSize) return { key: `single:${index}`, kind: "single" };
  const size = parse.size.toLowerCase().replace(/,/g, ".");
  return { key: `section:${parse.alias.alias}:${size}:${grade}`, kind: "section" };
}

const sumOrNull = (values: (number | null | undefined)[]) =>
  values.every((v) => v != null) ? values.reduce<number>((n, v) => n + (v as number), 0) : null;

export function groupBillOfMaterial(line: CommandLine): BomGroup[] {
  const groups = new Map<string, BomGroup>();
  line.items.forEach((item, index) => {
    const parse = item.parse;
    const { key, kind } = groupKey(parse, index);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        kind,
        alias: parse.alias,
        thicknessMm: kind === "sheet" ? sheetThicknessMm(parse) : null,
        gradeLabel: parse.calc?.result.gradeLabel ?? parse.gradeLabel ?? null,
        members: [],
        pieces: 0,
        totalKg: null,
        totalAmount: null,
        totalLengthM: null,
      };
      groups.set(key, group);
    }
    group.members.push({ index, parse, cut: bomCut(parse) });
  });

  for (const group of groups.values()) {
    const parses = group.members.map((m) => m.parse);
    group.pieces = parses.reduce((n, p) => n + (p.valid ? p.realQty : 0), 0);
    group.totalKg = sumOrNull(parses.map((p) => p.totalKg));
    group.totalAmount = sumOrNull(parses.map((p) => p.totalAmount));
    group.totalLengthM =
      group.kind === "section" ? sumOrNull(parses.map((p) => (p.lengthM != null ? p.lengthM * p.realQty : null))) : null;
  }
  return [...groups.values()];
}
