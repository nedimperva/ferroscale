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
  unknown: "bg-[var(--amber-surface)] text-[var(--amber-text)]",
};
