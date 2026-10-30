import {
  COMMAND_ALIAS_RE,
  COMMAND_GRADES,
  dimsToSizeText,
  findAliasByPrefix,
  findGradeByAlias,
  getProfileById,
  getStockSizes,
  routeAliasByDims,
  SHEET_LIKE_FAMILIES,
} from "@ferroscale/metal-core";

/**
 * Step a command-line token up or down without retyping it.
 *
 * Numeric tokens (length, quantity, rate, line multiplier) step by a sensible
 * increment. Standard and stock-sized profiles step to the adjacent catalogue
 * or stock size; sheets and plates step their thickness gauge; material grades
 * step through their family (e.g. S235 ↔ S355 ↔ S420). Arithmetic expressions
 * (`6m-50mm`) are left alone.
 */

const QTY_RE = /^[x×*](\d+(?:\.\d+)?)$/i;
const LINE_MULT_RE = /^(\*\*|==[x×*]?)(\d+)$/i;
const LEN_RE = /^(\d+(?:\.\d+)?)(mm|cm|m|in|ft)$/i;
const BARE_RE = /^(\d+(?:\.\d+)?)$/;
const PRICE_RE = /^(@?)(\d+(?:\.\d+)?)(\/(?:kg|lb|m|ft|pc|pcs|piece))?$/i;

const PANEL_GAUGE_LADDER = [
  0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100,
];

function formatNumber(value: number, decimals?: number): string {
  const rounded = decimals != null ? Number(value.toFixed(decimals)) : value;
  if (!Number.isFinite(rounded)) return "0";
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function lengthStep(value: number, unit: string): number {
  if (unit === "mm") return value < 100 ? 5 : 10;
  if (unit === "cm") return 1;
  if (unit === "m") return value < 3 ? 0.5 : 1;
  return 1;
}

function stepLadderValue(current: number, ladder: readonly number[], direction: 1 | -1): number {
  const exactIdx = ladder.indexOf(current);
  if (exactIdx >= 0) {
    const nextIdx = Math.min(ladder.length - 1, Math.max(0, exactIdx + direction));
    return ladder[nextIdx];
  }
  if (direction > 0) {
    const higher = ladder.find((v) => v > current);
    return higher ?? current + 1;
  }
  for (let i = ladder.length - 1; i >= 0; i--) {
    if (ladder[i] < current) return ladder[i];
  }
  return Math.max(0.5, current - 1);
}

function stepGradeToken(lower: string, direction: 1 | -1): string | null {
  const grade = findGradeByAlias(lower);
  if (!grade) return null;
  const peers = COMMAND_GRADES.filter((g) => g.group === grade.group);
  const idx = peers.findIndex((g) => g.id === grade.id);
  if (idx < 0 || peers.length <= 1) return null;
  const nextIdx = Math.min(peers.length - 1, Math.max(0, idx + direction));
  return peers[nextIdx].aliases[0];
}

function stepProfileToken(raw: string, direction: 1 | -1): string | null {
  const lower = raw.toLowerCase();
  const aliasMatch = lower.match(new RegExp(`^(${COMMAND_ALIAS_RE})(.+)$`));
  if (!aliasMatch) return null;
  const baseAlias = findAliasByPrefix(lower);
  if (!baseAlias) return null;
  const prefix = raw.slice(0, aliasMatch[1].length);
  const sizePart = aliasMatch[2].replace(/×/g, "x");
  if (!/\d/.test(sizePart)) return null;
  const alias = routeAliasByDims(aliasMatch[1], sizePart) ?? baseAlias;

  // 1. Standard EN catalogue profiles (HEA, HEB, IPE, UPN, Tees, ...).
  if (alias.profileId) {
    const profile = getProfileById(alias.profileId);
    if (!profile || profile.mode !== "standard") return null;
    const sizes = profile.sizes.map((s) =>
      s.id.startsWith(alias.alias) ? s.id.slice(alias.alias.length) : s.id,
    );
    const idx = sizes.indexOf(sizePart);
    if (idx < 0) return null;
    const nextIdx = Math.min(sizes.length - 1, Math.max(0, idx + direction));
    return `${prefix}${sizes[nextIdx]}`;
  }

  const dims = sizePart.split("x").map((s) => Number(s));
  if (dims.some((n) => !Number.isFinite(n) || n <= 0)) return null;

  // 2. Sheets & plates: step the thickness gauge while keeping width × length.
  if (SHEET_LIKE_FAMILIES.has(alias.fam)) {
    if (alias.fam === "chequered" && dims.length === 4) {
      const nextT = Math.max(1, dims[2] + direction);
      return `${prefix}${formatNumber(dims[0])}x${formatNumber(dims[1])}x${formatNumber(nextT)}x${formatNumber(dims[3])}`;
    }
    if (dims.length === 3) {
      const nextT = stepLadderValue(dims[2], PANEL_GAUGE_LADDER, direction);
      return `${prefix}${formatNumber(dims[0])}x${formatNumber(dims[1])}x${formatNumber(nextT)}`;
    }
    return null;
  }

  // 3. Manual bars, tubes, flats, angles: step along stock sizes when on-list,
  //    otherwise nudge the trailing dimension (thickness / diameter).
  if (alias.manualProfileId) {
    const stock = getStockSizes(alias.manualProfileId);
    if (stock.length > 0) {
      const stockTexts = stock
        .map((entry) => dimsToSizeText(alias.fam, entry.dims))
        .filter((t): t is string => t != null);
      const canonical =
        (alias.fam === "shs" || alias.fam === "angle") && dims.length === 2
          ? `${formatNumber(dims[0])}x${formatNumber(dims[0])}x${formatNumber(dims[1])}`
          : dims.map((d) => formatNumber(d)).join("x");
      const idx = stockTexts.indexOf(canonical);
      if (idx >= 0) {
        const nextIdx = Math.min(stockTexts.length - 1, Math.max(0, idx + direction));
        return `${prefix}${stockTexts[nextIdx]}`;
      }
    }
  }

  const nextLast = Math.max(1, Number((dims[dims.length - 1] + direction).toFixed(2)));
  const updated = [...dims.slice(0, -1), nextLast].map((d) => formatNumber(d)).join("x");
  return `${prefix}${updated}`;
}

/** True when a long-press or wheel/arrow on this chip can step it. */
export function canStepToken(token: string): boolean {
  return stepToken(token, 1) != null || stepToken(token, -1) != null;
}

/** Next token one increment up (`1`) or down (`-1`). Null if this token cannot be stepped. */
export function stepToken(token: string, direction: 1 | -1): string | null {
  const raw = token.trim();
  if (!raw) return null;

  const lineMult = raw.match(LINE_MULT_RE);
  if (lineMult) {
    const next = Math.max(1, Math.round(Number(lineMult[2]) + direction));
    return `${lineMult[1]}${next}`;
  }

  // `6m-50mm` / `x2+3` / `3*1850mm` / `6m/2` — not a single number.
  if (/[+\-*]/.test(raw.slice(1))) return null;
  if (raw.includes("/") && !PRICE_RE.test(raw)) return null;

  const qty = raw.match(QTY_RE);
  if (qty) {
    const next = Math.max(1, Math.round(Number(qty[1]) + direction));
    return `x${next}`;
  }

  const len = raw.match(LEN_RE);
  if (len) {
    const value = Number(len[1]);
    const unit = len[2].toLowerCase();
    const step = lengthStep(value, unit);
    const next = Math.max(step, Number((value + direction * step).toFixed(4)));
    return `${formatNumber(next)}${unit}`;
  }

  const price = raw.match(PRICE_RE);
  if (price && (price[1] === "@" || price[3])) {
    const next = Math.max(0, Number((Number(price[2]) + direction * 0.1).toFixed(2)));
    return `${price[1]}${formatNumber(next, 2)}${price[3] ?? ""}`;
  }

  const lower = raw.toLowerCase();
  const gradeStep = stepGradeToken(lower, direction);
  if (gradeStep) return gradeStep;

  const profileStep = stepProfileToken(raw, direction);
  if (profileStep) return profileStep;

  const bare = raw.match(BARE_RE);
  if (bare) {
    const next = Math.max(1, Number(bare[1]) + direction);
    return formatNumber(next);
  }

  return null;
}
