/** Shareable command-query URLs: /en?q=hea120+6m+x2+s235&r=2.5&ru=kg&c=EUR */

import { CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import type { CommandPricing } from "@ferroscale/metal-core";
import type { CurrencyCode, PriceBasis, PriceUnit } from "@/lib/calculator/types";

const SHARE_PARAM = "q";

/**
 * The pricing context a link carries alongside the query. Without it the same
 * link priced the calculation with the *recipient's* settings — the geometry
 * matched, the money didn't, and nothing said so. Structurally the parser's
 * pricing block, so the shell can hand its settings straight over.
 */
export type SharePricing = CommandPricing;

/** Short param names — share links get pasted into chat apps; keep them terse. */
const P = {
  rate: "r",
  rateUnit: "ru",
  rateBasis: "rb",
  currency: "c",
  waste: "w",
  vat: "v",
} as const;

const PRICE_UNITS: PriceUnit[] = ["kg", "lb", "m", "ft", "piece"];
const PRICE_BASES: PriceBasis[] = ["weight", "length", "piece"];

/** Extract a shared query from a location search string; null when absent. */
export function readSharedQuery(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get(SHARE_PARAM);
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Extract the sender's pricing from a share link. Returns only the fields the
 * link actually carried, so a partial (or hand-edited) link still applies what
 * it can. Null when the link carries no pricing at all — i.e. an old link, or
 * one built before this shipped.
 */
export function readSharedPricing(search: string): Partial<SharePricing> | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }

  const pricing: Partial<SharePricing> = {};

  const rate = readNumber(params, P.rate);
  if (rate != null) pricing.unitPrice = rate;

  const rateUnit = params.get(P.rateUnit);
  if (rateUnit && (PRICE_UNITS as string[]).includes(rateUnit)) {
    pricing.priceUnit = rateUnit as PriceUnit;
  }

  const rateBasis = params.get(P.rateBasis);
  if (rateBasis && (PRICE_BASES as string[]).includes(rateBasis)) {
    pricing.priceBasis = rateBasis as PriceBasis;
  }

  const currency = params.get(P.currency);
  if (currency && currency in CURRENCY_SYMBOLS) {
    pricing.currency = currency as CurrencyCode;
  }

  const waste = readNumber(params, P.waste);
  if (waste != null) pricing.wastePercent = waste;

  // VAT rides on one param: absent = off, a number = on at that rate.
  const vat = readNumber(params, P.vat);
  if (vat != null) {
    pricing.includeVat = true;
    pricing.vatPercent = vat;
  } else if (params.has(P.vat)) {
    pricing.includeVat = false;
  }

  return Object.keys(pricing).length > 0 ? pricing : null;
}

interface LocationLike {
  origin: string;
  pathname: string;
}

/**
 * Build a share URL for the given query on the current page (the pathname
 * keeps the locale prefix). An empty query returns the bare page URL.
 *
 * Passing `pricing` appends the rate context so the recipient sees the same
 * money as the sender. The query itself stays the canonical grammar — an
 * inline `@rate/unit` token in the query still wins on the receiving end,
 * exactly as it does when typed.
 */
export function buildShareUrl(
  query: string,
  location: LocationLike,
  pricing?: SharePricing,
): string {
  const base = `${location.origin}${location.pathname}`;
  const trimmed = query.trim();
  if (!trimmed) return base;
  const params = new URLSearchParams();
  params.set(SHARE_PARAM, trimmed);
  if (pricing) {
    params.set(P.rate, String(pricing.unitPrice));
    params.set(P.rateUnit, pricing.priceUnit);
    params.set(P.rateBasis, pricing.priceBasis);
    params.set(P.currency, pricing.currency);
    if (pricing.wastePercent > 0) params.set(P.waste, String(pricing.wastePercent));
    if (pricing.includeVat) params.set(P.vat, String(pricing.vatPercent));
  }
  return `${base}?${params.toString()}`;
}

/** True when applying `incoming` would actually change the local pricing. */
export function sharedPricingDiffers(
  incoming: Partial<SharePricing>,
  current: SharePricing,
): boolean {
  return (Object.keys(incoming) as (keyof SharePricing)[]).some(
    (key) => incoming[key] !== current[key],
  );
}
