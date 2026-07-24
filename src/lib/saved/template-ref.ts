import { inputToQuery } from "@ferroscale/metal-core";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CommandPricing } from "@ferroscale/metal-core";
import type { LengthUnit } from "@/lib/calculator/types";

/**
 * Template recall from the command bar: typing `#gate` (optionally `#gate x3`)
 * expands to the canonical query of the saved entry the user named "gate",
 * so the library becomes a first-class citizen of the input line without any
 * new UI. Expansion reuses `inputToQuery` — exactly the same reconstruction
 * the click-to-load path uses — so a `#ref` can recall anything the library
 * can already load, and nothing more.
 */

/** A saved entry, reduced to what recall needs (keeps this lib storage-agnostic). */
export interface TemplateSource {
  name: string;
  input: CalculationInput;
  /** ISO timestamp; the freshest match wins an ambiguous prefix. */
  updatedAt?: string;
}

export interface TemplateExpandOptions {
  defaultUnit: LengthUnit;
  defaultGradeId?: string;
  defaultPricing?: CommandPricing;
}

/** Lowercase alphanumeric slug: "Gate frame #2" → "gate-frame-2". */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Whole-query template reference: `#slug` or `#slug x3`. */
const TEMPLATE_REF_RE = /^#([a-z0-9][a-z0-9_-]*)(?:\s+[x×*](\d+))?$/i;

export interface ParsedTemplateRef {
  slug: string;
  multiplier: number | null;
}

/** Parse a bare template reference from a whole query, or null when it isn't one. */
export function parseTemplateRef(query: string): ParsedTemplateRef | null {
  const m = query.trim().match(TEMPLATE_REF_RE);
  if (!m) return null;
  const multiplier = m[2] ? parseInt(m[2], 10) : null;
  if (multiplier != null && (!Number.isFinite(multiplier) || multiplier < 1)) return null;
  return { slug: slugifyName(m[1]), multiplier };
}

/** Resolve a slug to a saved entry: exact name-slug wins, else the freshest
 *  entry whose slug starts with it. Returns undefined when nothing matches. */
export function findTemplateSource<T extends TemplateSource>(
  slug: string,
  sources: readonly T[],
): T | undefined {
  if (!slug) return undefined;
  let exact: T | undefined;
  let prefix: T | undefined;
  for (const source of sources) {
    const s = slugifyName(source.name);
    if (s === slug) {
      if (!exact || fresher(source, exact)) exact = source;
      continue;
    }
    if (s.startsWith(slug)) {
      if (!prefix || fresher(source, prefix)) prefix = source;
    }
  }
  return exact ?? prefix;
}

function fresher(a: TemplateSource, b: TemplateSource): boolean {
  return (a.updatedAt ?? "") > (b.updatedAt ?? "");
}

/** Rebuild a query with its quantity forced to `multiplier` (dropping any
 *  existing qty token); a null/1 multiplier leaves the base query untouched. */
function applyMultiplier(base: string, multiplier: number | null): string {
  if (multiplier == null) return base;
  const tokens = base.split(/\s+/).filter((tk) => tk && !/^[x×*]\d+$/i.test(tk));
  if (multiplier > 1) tokens.push(`x${multiplier}`);
  return tokens.join(" ");
}

export interface TemplateExpansion {
  /** The canonical query the reference expands to. */
  query: string;
  /** The matched entry's display name (for the confirmation toast). */
  name: string;
}

/**
 * Expand a whole-query template reference. Returns null when the query is not a
 * template reference, no entry matches, or the matched entry can't be expressed
 * as a query (same limitation as click-to-load).
 */
export function expandTemplateReference(
  query: string,
  sources: readonly TemplateSource[],
  opts: TemplateExpandOptions,
): TemplateExpansion | null {
  const ref = parseTemplateRef(query);
  if (!ref) return null;
  const source = findTemplateSource(ref.slug, sources);
  if (!source) return null;
  const base = inputToQuery(source.input, opts.defaultUnit, {
    defaultGradeId: opts.defaultGradeId,
    defaultPricing: opts.defaultPricing,
  });
  if (!base) return null;
  return { query: applyMultiplier(base, ref.multiplier), name: source.name };
}
