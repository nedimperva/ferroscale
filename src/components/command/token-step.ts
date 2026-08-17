/**
 * Step a command-line token up or down without retyping it.
 *
 * Length, quantity and rate are numbers with a suffix. Profile aliases and
 * grades are not — those stay a tap-to-edit. Arithmetic (`6m-50mm`) is left
 * alone; there is no honest single increment for an expression.
 */

const QTY_RE = /^x(\d+(?:\.\d+)?)$/i;
const LEN_RE = /^(\d+(?:\.\d+)?)(mm|cm|m|in|ft)$/i;
const BARE_RE = /^(\d+(?:\.\d+)?)$/;
const PRICE_RE = /^(@?)(\d+(?:\.\d+)?)(\/(?:kg|m|pc))?$/i;

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

/** True when a long-press on this chip should open the stepper. */
export function canStepToken(token: string): boolean {
  return stepToken(token, 1) != null;
}

/** Next token one increment up (`1`) or down (`-1`). Null if this token is not numeric. */
export function stepToken(token: string, direction: 1 | -1): string | null {
  const raw = token.trim();
  if (!raw) return null;
  // `6m-50mm` / `x2+3` — not a single number.
  if (/[+\-]/.test(raw.slice(1))) return null;

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

  const bare = raw.match(BARE_RE);
  if (bare) {
    const next = Math.max(1, Number(bare[1]) + direction);
    return formatNumber(next);
  }

  return null;
}
