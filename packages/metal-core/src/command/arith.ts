import { toMillimeters } from "../calculator/units";
import type { LengthUnit } from "../calculator/types";

/**
 * Arithmetic inside a single token: `6m-50mm` (a bar cut short), `3*1850mm+100mm`
 * (three bays plus overlap), `6m/2-3mm` (halved less saw kerf), `x2+3` or `x2*4`.
 *
 * A cut list rarely arrives as round numbers — it arrives as "the six-metre
 * stock less the fifty-millimetre joint" — and doing that math in your head
 * before typing is exactly the friction the bar exists to remove.
 */

const LENGTH_UNITS = "mm|cm|m|in|ft";
const FACTOR_PART = `\\d+(?:\\.\\d+)?(?:${LENGTH_UNITS})?`;
const MULT_TERM_PART = `${FACTOR_PART}(?:[*/]${FACTOR_PART})*`;
/**
 * Either two or more additive terms (`6m-50mm`, `3*1850mm+100mm`), or a single
 * multiplicative/divisive term (`3*1850mm`, `6m/2`).
 */
const LENGTH_EXPR_RE = new RegExp(
  `^(?:${MULT_TERM_PART}(?:[+-]${MULT_TERM_PART})+)|^(?:${FACTOR_PART}(?:[*/]${FACTOR_PART})+)$`,
  "i",
);
const ADD_TERM_SPLIT_RE = /([+-])/;
const MULT_OP_SPLIT_RE = /([*/])/;
const SINGLE_FACTOR_RE = new RegExp(`^(\\d+(?:\\.\\d+)?)(${LENGTH_UNITS})?$`, "i");

/** Two or more quantity terms joined by +, - or *, e.g. `x2+3`, `x2*4`, `x3*2+1`. */
const QTY_EXPR_RE = /^[x×*](\d+(?:[+\-*]\d+)+)$/i;

export interface LengthExpression {
  /** The evaluated total, in millimetres. Always > 0. */
  mm: number;
  /**
   * The unit the answer is reported in — the first term's, because that is the
   * one the user was thinking in ("six metres, less a bit" is still metres).
   */
  unit: LengthUnit;
  /** True when the first term named its unit rather than relying on the default. */
  explicit: boolean;
}

function evalLengthMultTerm(
  termStr: string,
  fallbackUnit: LengthUnit,
): { mm: number; unit: LengthUnit; explicit: boolean } | null {
  const parts = termStr.split(MULT_OP_SPLIT_RE);
  const factors: { value: number; unit?: LengthUnit }[] = [];
  const ops: ("*" | "/")[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      ops.push(parts[i] as "*" | "/");
      continue;
    }
    const m = parts[i].match(SINGLE_FACTOR_RE);
    if (!m) return null;
    const value = parseFloat(m[1]);
    if (!Number.isFinite(value)) return null;
    const unit = m[2]?.toLowerCase() as LengthUnit | undefined;
    factors.push({ value, unit });
  }

  if (factors.length === 0) return null;

  // At most one factor in a product/quotient carries the length dimension; the
  // rest are dimensionless scalars (e.g. `3*1850mm`, `6m/2`).
  const unitFactorIndices = factors
    .map((f, idx) => (f.unit ? idx : -1))
    .filter((idx) => idx >= 0);
  if (unitFactorIndices.length > 1) return null;
  // A unit in a denominator (`2/6m`) is reciprocal length, not a length.
  if (unitFactorIndices.length === 1 && unitFactorIndices[0] > 0 && ops[unitFactorIndices[0] - 1] === "/") {
    return null;
  }

  const lengthIdx = unitFactorIndices.length === 1 ? unitFactorIndices[0] : 0;
  const explicit = unitFactorIndices.length === 1;
  const unit = factors[lengthIdx].unit ?? fallbackUnit;

  let acc = lengthIdx === 0 ? toMillimeters(factors[0].value, unit) : factors[0].value;
  for (let i = 0; i < ops.length; i++) {
    const f = factors[i + 1];
    const val = i + 1 === lengthIdx ? toMillimeters(f.value, unit) : f.value;
    if (ops[i] === "*") {
      acc *= val;
    } else {
      if (val === 0) return null;
      acc /= val;
    }
  }

  return { mm: acc, unit, explicit };
}

/**
 * Evaluate a length expression. Terms without a unit inherit the first term's,
 * so `6m-50-50` means three metre-terms and `6m-50mm` means what it says —
 * a bare number is never silently promoted to the default unit mid-expression.
 */
export function parseLengthExpression(
  token: string,
  defaultUnit: LengthUnit,
): LengthExpression | null {
  if (!LENGTH_EXPR_RE.test(token)) return null;

  const parts = token.split(ADD_TERM_SPLIT_RE);
  const first = evalLengthMultTerm(parts[0], defaultUnit);
  if (!first) return null;

  const { unit, explicit } = first;
  let total = first.mm;

  for (let i = 1; i < parts.length; i += 2) {
    const sign = parts[i];
    const term = evalLengthMultTerm(parts[i + 1] ?? "", unit);
    if (!term) return null;
    total += sign === "-" ? -term.mm : term.mm;
  }

  // A cut that removes more than the stock is not a length — the caller reports
  // it as an unusable token rather than silently clamping to something wrong.
  if (!Number.isFinite(total) || total <= 0) return null;
  return { mm: total, unit, explicit };
}

/** Evaluate a quantity expression; null when it doesn't total at least one piece. */
export function parseQtyExpression(token: string): number | null {
  const match = token.match(QTY_EXPR_RE);
  if (!match) return null;

  const addParts = match[1].split(ADD_TERM_SPLIT_RE);
  const evalProduct = (s: string): number =>
    s
      .split("*")
      .map((n) => parseInt(n, 10))
      .reduce((a, b) => a * b, 1);

  let total = evalProduct(addParts[0]);
  for (let i = 1; i < addParts.length; i += 2) {
    const sign = addParts[i];
    const val = evalProduct(addParts[i + 1] ?? "0");
    total += sign === "-" ? -val : val;
  }
  if (!Number.isInteger(total) || total < 1) return null;
  return total;
}

/** True when the token is arithmetic of either kind — used by token classing. */
export function isArithmeticToken(token: string): boolean {
  return LENGTH_EXPR_RE.test(token) || QTY_EXPR_RE.test(token);
}
