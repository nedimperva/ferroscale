import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParseResult } from "@ferroscale/metal-core";

type CommandT = (key: string, values?: Record<string, string | number>) => string;

/**
 * The line a target query earns: what was asked for, and — because pieces come
 * whole — how far the answer overshoots it. Shared by every surface that shows
 * the equation line so the wording can't drift between phone and desktop.
 */
export interface TargetNote {
  /** "500 kg" / "€ 250" — the target as typed, formatted. */
  target: string;
  /** "+7.4 kg" when the solution overshoots; null when it lands on the number. */
  over: string | null;
  /** Which unknown the parser filled in — drives the label. */
  solvedFor: "qty" | "length";
}

/**
 * Anything under a tenth of a percent is rounding, not overshoot: a solved
 * length lands on a whole millimetre and would otherwise always read as "off".
 */
const OVERSHOOT_EPSILON = 0.001;

export function commandTargetNote(p: CommandParseResult): TargetNote | null {
  const target = p.target;
  if (!target) return null;

  const achieved = target.kind === "weight" ? target.achievedKg : target.achievedAmount;
  const sym = CURRENCY_SYMBOLS[p.pricing.currency] ?? "";
  const format = (value: number) =>
    target.kind === "weight"
      ? `${fsWeight(value)} ${fsWeightUnit()}`
      : `${sym} ${fsMoney(value)}`;

  const excess = achieved == null ? 0 : achieved - target.value;
  const meaningful = excess > target.value * OVERSHOOT_EPSILON;

  return {
    target: format(target.value),
    over: meaningful ? `+${format(excess)}` : null,
    solvedFor: target.solvedFor,
  };
}

/** The whole note as one string — for copy/export, where markup isn't an option. */
export function formatTargetNote(note: TargetNote, t: CommandT): string {
  const head = t(`target.${note.solvedFor === "qty" ? "solvedQty" : "solvedLength"}`, {
    target: note.target,
  });
  return note.over ? `${head} · ${t("target.over", { over: note.over })}` : head;
}
