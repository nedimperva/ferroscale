import type {
  CommandTokenKind,
  CurrencyCode,
  LengthUnit,
  PriceBasis,
  PriceUnit,
} from "@ferroscale/metal-core";

export const CURRENCIES: CurrencyCode[] = ["EUR", "USD", "GBP", "PLN", "BAM"];
export const UNIT_OPTIONS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

/** Mirrors the legacy reducer's SET_PRICE_BASIS unit mapping. */
export const BASIS_UNIT: Record<PriceBasis, PriceUnit> = {
  weight: "kg",
  length: "m",
  piece: "piece",
};

/** Token-chip color classes, shared by the shell and desktop query lines. */
export const KIND_BG: Record<CommandTokenKind, string> = {
  profile: "bg-[var(--accent-surface)] text-[var(--accent-text)]",
  len: "bg-[var(--blue-surface)] text-[var(--blue-text)]",
  qty: "bg-[var(--green-surface)] text-[var(--green-text)]",
  grade: "bg-[var(--surface-inset)] text-foreground-secondary",
  price: "bg-[var(--blue-surface)] text-[var(--blue-text)]",
  target: "bg-[var(--purple-surface)] text-[var(--purple-text)]",
  unknown: "bg-[var(--amber-surface)] text-[var(--amber-text)]",
};

/** Default sample query loaded when user tries demo calculation. */
export const DEMO_QUERY = "hea120 6m x2 s235 ";

/**
 * The line the empty screen takes apart, one labelled word at a time. It is
 * the whole grammar in one go — which is why it carries a rate, where the
 * demo query does not. `label` keys into `command.anatomy.*`.
 */
export const EXAMPLE_LINE: { token: string; label: string }[] = [
  { token: "hea120", label: "profile" },
  { token: "6m", label: "length" },
  { token: "x2", label: "pieces" },
  { token: "s355", label: "grade" },
  { token: "@2.50/kg", label: "price" },
];

/** What tapping the example loads — committed, so it lands fully chipped. */
export const EXAMPLE_QUERY = `${EXAMPLE_LINE.map((part) => part.token).join(" ")} `;

/**
 * Lines the empty command bar cycles through as its placeholder. Each shows
 * something the first one can't — another family, a count said in words, a
 * piece with no length, an inline rate — so a visitor who only reads the
 * placeholder still learns the bar reads more than beams. Every one must parse
 * (command-constants.test.ts), or the hint teaches a line that fails.
 */
export const PLACEHOLDER_EXAMPLES = [
  "hea120 6m x2 s235",
  "shs 40x40x3 6m x10",
  "angle 50x50x5 6m 2 pcs",
  "plate 1500x3000x10",
  "rnd20 1m @3/kg",
];

/**
 * Lines the app loads by itself. They are not the user's own work, so they
 * neither enter the history nor claim the URL until the user edits them.
 */
export function isSampleQuery(query: string): boolean {
  return query === DEMO_QUERY || query === EXAMPLE_QUERY;
}

