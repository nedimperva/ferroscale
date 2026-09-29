import { findAliasByPrefix, getProfileById } from "@ferroscale/metal-core";
import type { ShapeType } from "./faq-view";

/** The numbers a sandbox shape was calculated from, in mm and metres. */
export interface FaqCommandValues {
  grade?: string;
  lengthM: number;
  thicknessMm?: number;
  widthMm?: number;
  heightMm?: number;
  lengthMm?: number;
  diameterMm?: number;
  sideMm?: number;
  legAMm?: number;
  legBMm?: number;
  /** "HEA 120", "UPN 160", "T 60x60x7" — the catalogue label. */
  size?: string;
}

/**
 * The calculator line that reproduces a sandbox calculation — what "Open in
 * app" loads. Every form here is one the parser reads (faq-command.test.ts
 * checks each shape), because this is where the FAQ used to invent its own:
 * `tub100x50x4`, `hex24`, `sht5 2000x1000` all failed on arrival. Null for a
 * shape the calculator does not have.
 */
export function faqCommand(shape: ShapeType, v: FaqCommandValues): string | null {
  const g = v.grade ? ` ${v.grade}` : "";
  const len = `${v.lengthM}m`;
  const box = (w: number, h: number, t: number) => `${w === h ? "shs" : "rhs"}${w}x${h}x${t}`;
  const catalogue = (label: string) => label.toLowerCase().replace(/\s+/g, "");
  // The FAQ's pickers carry sizes the calculator's catalogue does not (T 70 to
  // T 100): it can still show its own worked figures, but a link to a size the
  // calculator lacks would open on an error.
  const inCatalogue = (label: string) => {
    const token = catalogue(label);
    const alias = findAliasByPrefix(token);
    const profile = alias?.profileId ? getProfileById(alias.profileId) : null;
    if (!alias || !profile || profile.mode !== "standard") return false;
    const size = token.slice(alias.alias.length);
    const id = alias.fam === "tee" ? `${alias.alias}${teeSizeId(size)}` : token;
    return profile.sizes.some((sz) => sz.id === id);
  };
  switch (shape) {
    case "sheet":
      return `sht${v.widthMm}x${Math.round(v.lengthMm ?? 0)}x${v.thicknessMm}${g}`;
    case "chequered":
      // The calculator weighs chequered plate from its pattern height; 2 mm is
      // the usual one on the thicknesses this panel offers.
      return `chq${v.widthMm}x${Math.round(v.lengthMm ?? 0)}x${v.thicknessMm}x2${g}`;
    case "roundBar":
      return `rnd${v.diameterMm} ${len}${g}`;
    case "roundTube":
      return `chs${v.diameterMm}x${v.thicknessMm} ${len}${g}`;
    case "rectTube":
      return `${box(v.widthMm ?? 0, v.heightMm ?? 0, v.thicknessMm ?? 0)} ${len}${g}`;
    case "flatBar":
      return `flt${v.widthMm}x${v.thicknessMm} ${len}${g}`;
    case "squareBar":
      return `sq${v.sideMm} ${len}${g}`;
    case "angle":
      return v.legAMm === v.legBMm
        ? `l${v.legAMm}x${v.thicknessMm} ${len}${g}`
        : `l${v.legAMm}x${v.legBMm}x${v.thicknessMm} ${len}${g}`;
    case "beam":
    case "channel":
    case "tee":
      return inCatalogue(v.size ?? "") ? `${catalogue(v.size ?? "")} ${len}${g}` : null;
    case "paint":
      // Coating area has no calculator of its own; the tube it is measured on does.
      return `${box(v.widthMm ?? 0, v.heightMm ?? 0, 4)} ${len}`;
    case "galv":
      return inCatalogue(v.size ?? "") ? `${catalogue(v.size ?? "")} ${len} x4` : null;
    case "hexBar":
      return null;
  }
}

/** EN 10055 tees are keyed by one leg: the catalogue's "60x60x7" is `60x7`. */
function teeSizeId(size: string): string {
  const [a, b, t] = size.split("x");
  return t !== undefined && a === b ? `${a}x${t}` : size;
}
