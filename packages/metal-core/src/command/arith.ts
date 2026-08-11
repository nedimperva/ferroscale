import { toMillimeters } from "../calculator/units";
import type { LengthUnit } from "../calculator/types";

/**
 * Arithmetic inside a single token: `6m-50mm` (a bar cut short), `x2+3` (three
 * more than the two already counted).
 *
 * A cut list rarely arrives as round numbers — it arrives as "the six-metre
 * stock less the fifty-millimetre joint" — and doing that subtraction in your
 * head before typing is exactly the friction the bar exists to remove. Only
 * `+` and `-` are supported, evaluated left to right: this is a shorthand for
 * a measurement, not an expression language, and precedence rules the user has
 * to think about would defeat the point.
 */

const LENGTH_UNITS = "mm|cm|m|in|ft";
/** Two or more length terms joined by + or -, e.g. `6m-50mm-50mm`. */
const LENGTH_EXPR_RE = new RegExp(
  `^(\\d+(?:\\.\\d+)?)(${LENGTH_UNITS})?((?:[+-]\\d+(?:\\.\\d+)?(?:${LENGTH_UNITS})?)+)$`,
  "i",
);
const LENGTH_TERM_RE = new RegExp(`([+-])(\\d+(?:\\.\\d+)?)(${LENGTH_UNITS})?`, "gi");

/** Two or more quantity terms, e.g. `x2+3`. */
const QTY_EXPR_RE = /^[x×*](\d+)((?:[+-]\d+)+)$/i;
const QTY_TERM_RE = /([+-])(\d+)/g;

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

/**
 * Evaluate a length expression. Terms without a unit inherit the first term's,
 * so `6m-50-50` means three metre-terms and `6m-50mm` means what it says —
 * a bare number is never silently promoted to the default unit mid-expression.
 */
export function parseLengthExpression(
  token: string,
  defaultUnit: LengthUnit,
): LengthExpression | null {
  const match = token.match(LENGTH_EXPR_RE);
  if (!match) return null;

  const explicit = !!match[2];
  const unit = (match[2]?.toLowerCase() as LengthUnit | undefined) ?? defaultUnit;
  let total = toMillimeters(parseFloat(match[1]), unit);

  LENGTH_TERM_RE.lastIndex = 0;
  let term: RegExpExecArray | null;
  while ((term = LENGTH_TERM_RE.exec(match[3])) !== null) {
    const termUnit = (term[3]?.toLowerCase() as LengthUnit | undefined) ?? unit;
    const value = toMillimeters(parseFloat(term[2]), termUnit);
    total += term[1] === "-" ? -value : value;
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

  let total = parseInt(match[1], 10);
  QTY_TERM_RE.lastIndex = 0;
  let term: RegExpExecArray | null;
  while ((term = QTY_TERM_RE.exec(match[2])) !== null) {
    const value = parseInt(term[2], 10);
    total += term[1] === "-" ? -value : value;
  }
  if (!Number.isInteger(total) || total < 1) return null;
  return total;
}

/** True when the token is arithmetic of either kind — used by token classing. */
export function isArithmeticToken(token: string): boolean {
  return LENGTH_EXPR_RE.test(token) || QTY_EXPR_RE.test(token);
}
