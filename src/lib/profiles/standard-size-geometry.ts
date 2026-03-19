import type { ProfileId } from "@/lib/datasets/types";

export interface ParsedStandardGeometry {
  /** Nominal depth from designation (IPE 200 → 200), mm */
  depthMm?: number;
  /** Tee stem / leg size (equal-leg tees), mm */
  legMm?: number;
  secondLegMm?: number;
  thicknessMm?: number;
}

/**
 * Derive nominal dimensions from standard size labels for drawing annotations.
 * Depth for beams/channels follows EN naming (number ≈ profile height in mm).
 */
export function parseStandardSizeGeometry(
  profileId: ProfileId,
  label: string,
): ParsedStandardGeometry {
  const s = label.replace(/\u00d7/g, "x").replace(/\u00D7/g, "x").trim();

  if (profileId === "tee_en") {
    const tee = s.match(/^T\s+(\d+)\s*x\s*(\d+)\s*x\s*([\d.]+)\s*$/i);
    if (tee) {
      const a = Number(tee[1]);
      const b = Number(tee[2]);
      const t = Number(tee[3]);
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(t)) {
        return { legMm: a, secondLegMm: b, thicknessMm: t };
      }
    }
    return {};
  }

  if (
    profileId.startsWith("beam_") ||
    profileId === "channel_upn_en" ||
    profileId === "channel_upe_en"
  ) {
    const m = s.match(/(\d+)\s*$/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 30 && n <= 900) {
        return { depthMm: n };
      }
    }
  }

  return {};
}

/** Vertical dimension line placement (48×48 schematic space) for I/H sections */
export function beamSectionDimGuide(profileId: ProfileId): { y1: number; y2: number; vx: number } {
  switch (profileId) {
    case "beam_hem_en":
      return { y1: 8, y2: 40, vx: 45.5 };
    case "beam_heb_en":
      return { y1: 8.5, y2: 39.5, vx: 44.5 };
    case "beam_hea_en":
      return { y1: 8.5, y2: 39.5, vx: 43.5 };
    default:
      return { y1: 9, y2: 39, vx: 41.5 };
  }
}

/** Horizontal span for flange width dimension (matches schematic outline) */
export function beamFlangeWidthGuide(profileId: ProfileId): { x1: number; x2: number } {
  switch (profileId) {
    case "beam_hem_en":
      return { x1: 5, x2: 43 };
    case "beam_heb_en":
      return { x1: 5.5, x2: 42.5 };
    case "beam_hea_en":
      return { x1: 6.5, x2: 41.5 };
    default:
      return { x1: 9, x2: 39 };
  }
}
