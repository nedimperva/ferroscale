import { getStockSizes } from "@ferroscale/metal-core";
import type { DimensionKey, ProfileId } from "./types";

export interface StandardSize {
  profileId: ProfileId;
  label: string;
  dimensions: Partial<Record<DimensionKey, number>>;
}

/* ------------------------------------------------------------------ */
/*  Helper functions for generating standard sizes                     */
/* ------------------------------------------------------------------ */

function rb(d: number): StandardSize {
  return { profileId: "round_bar", label: `Ø${d}`, dimensions: { diameter: d } };
}

function sb(s: number): StandardSize {
  return {
    profileId: "square_bar",
    label: `${s}×${s}`,
    dimensions: { side: s },
  };
}

function fb(w: number, t: number): StandardSize {
  return {
    profileId: "flat_bar",
    label: `${w}×${t}`,
    dimensions: { width: w, thickness: t },
  };
}

function ang(legA: number, legB: number, t: number): StandardSize {
  return {
    profileId: "angle",
    label: `L ${legA}×${legB}×${t}`,
    dimensions: { legA, legB, thickness: t },
  };
}

function shs(side: number, wallThickness: number): StandardSize {
  return {
    profileId: "square_hollow",
    label: `SHS ${side}×${side}×${wallThickness}`,
    dimensions: { side, wallThickness },
  };
}

function rhs(width: number, height: number, wallThickness: number): StandardSize {
  return {
    profileId: "rectangular_tube",
    label: `RHS ${width}×${height}×${wallThickness}`,
    dimensions: { width, height, wallThickness },
  };
}

function pipe(outerDiameter: number, wallThickness: number): StandardSize {
  return {
    profileId: "pipe",
    label: `CHS ${outerDiameter}×${wallThickness}`,
    dimensions: { outerDiameter, wallThickness },
  };
}

function plate(thickness: number): StandardSize {
  return {
    profileId: "plate",
    label: `t=${thickness}mm (w=1500)`,
    dimensions: { width: 1500, thickness },
  };
}

function sheet(thickness: number): StandardSize {
  return {
    profileId: "sheet",
    label: `t=${thickness}mm (w=1250)`,
    dimensions: { width: 1250, thickness },
  };
}

function chequered(thickness: number, patternHeight: number): StandardSize {
  return {
    profileId: "chequered_plate",
    label: `t=${thickness}+${patternHeight}mm (w=1500)`,
    dimensions: { width: 1500, thickness, patternHeight },
  };
}

function expanded(thickness: number): StandardSize {
  return {
    profileId: "expanded_metal",
    label: `eff. t=${thickness}mm (w=1250)`,
    dimensions: { width: 1250, thickness },
  };
}

function corrugated(thickness: number): StandardSize {
  return {
    profileId: "corrugated_sheet",
    label: `t=${thickness}mm (w=1000)`,
    dimensions: { width: 1000, thickness },
  };
}

/* ------------------------------------------------------------------ */
/*  Standard sizes dataset                                            */
/* ------------------------------------------------------------------ */

/**
 * Bars, tubes, angles and panel gauges come from metal-core's sourced stock
 * lists — the same ones the command line checks a typed size against — so a
 * "nearby size" is always one the note would call standard.
 */
function stock<T extends number[]>(profileId: ProfileId, pick: (dims: Partial<Record<DimensionKey, number>>) => T | null): T[] {
  return getStockSizes(profileId).flatMap((size) => {
    const values = pick(size.dims);
    return values ? [values] : [];
  });
}

const all = (...values: Array<number | undefined>) =>
  values.every((v): v is number => v != null) ? (values as number[]) : null;

/** The profile's own thickness range: sheet up to 6 mm, plate from 6 mm up. */
function gauges(profileId: "sheet" | "plate"): number[] {
  return stock(profileId, (d) => all(d.thickness))
    .map(([t]) => t)
    .filter((t) => (profileId === "sheet" ? t <= 6 : t > 6));
}

export const STANDARD_SIZES: StandardSize[] = [
  ...stock("round_bar", (d) => all(d.diameter)).map(([d]) => rb(d)),
  ...stock("square_bar", (d) => all(d.side)).map(([a]) => sb(a)),
  ...stock("flat_bar", (d) => all(d.width, d.thickness)).map(([w, t]) => fb(w, t)),
  ...stock("angle", (d) => all(d.legA, d.legB, d.thickness)).map(([a, b, t]) => ang(a, b, t)),
  ...stock("square_hollow", (d) => all(d.side, d.wallThickness)).map(([a, t]) => shs(a, t)),
  ...stock("rectangular_tube", (d) => all(d.width, d.height, d.wallThickness)).map(([w, h, t]) => rhs(w, h, t)),
  ...stock("pipe", (d) => all(d.outerDiameter, d.wallThickness)).map(([od, t]) => pipe(od, t)),
  ...gauges("plate").map(plate),
  ...gauges("sheet").map(sheet),

  /* ---- Chequered plate (base thickness + pattern, width=1500) ---- */
  ...[
    [3, 1.5], [4, 1.5], [4, 2], [5, 2], [6, 2], [8, 2], [10, 2.5],
  ].map(([t, p]) => chequered(t, p)),

  /* ---- Expanded metal (effective thickness, width=1250) ---- */
  ...[1.5, 2, 2.5, 3, 4, 5, 6].map(expanded),

  /* ---- Corrugated sheet (base thickness, cover width=1000) ---- */
  ...[0.4, 0.5, 0.6, 0.7, 0.8, 1, 1.2].map(corrugated),
];

export function getStandardSizesForProfile(
  profileId: ProfileId
): StandardSize[] {
  return STANDARD_SIZES.filter((s) => s.profileId === profileId);
}
