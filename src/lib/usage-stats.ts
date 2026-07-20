import { SHEET_LIKE_FAMILIES } from "@ferroscale/metal-core";
import type {
  CommandFamily,
  CommandParseResult,
  CommandUsageSource,
} from "@ferroscale/metal-core";
import { loadFromStorage, persistToStorage } from "@/lib/storage";

/**
 * Learns what the user actually types so suggestions rank their real habits
 * first. Values are bucketed per profile family (SHS sizes never surface for
 * HEA) and scored by frequency × recency with a 14-day half-life, so a size
 * used daily beats one used once yesterday, but stale habits fade out.
 * Local-only (not synced): typing habits are per device.
 */

const USAGE_KEY = "ferroscale-usage-v1";
const MAX_RECENT_QUERIES = 20;
const MAX_BUCKET_VALUES = 24;
const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

interface UsageValue {
  /** Times used. */
  n: number;
  /** Last used, epoch ms. */
  t: number;
}

interface UsageStats {
  /** Settled valid queries, newest first, deduped. */
  queries: { q: string; n: number; t: number }[];
  /** "size:shs" → { "40x40x3": {n, t} } and likewise len:/qty:/grade:. */
  buckets: Record<string, Record<string, UsageValue>>;
}

function loadStats(): UsageStats {
  // Always return a fresh object — callers mutate the result before persisting.
  const raw = loadFromStorage<UsageStats | null>(USAGE_KEY, null);
  if (!raw || !Array.isArray(raw.queries) || typeof raw.buckets !== "object" || raw.buckets === null) {
    return { queries: [], buckets: {} };
  }
  return raw;
}

/** True when one token list is a prefix of the other (equal lists included) —
 *  i.e. the two queries lie on the same refinement chain. */
function prefixRelated(a: string[], b: string[]): boolean {
  const min = Math.min(a.length, b.length);
  for (let i = 0; i < min; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function score(value: UsageValue, now: number): number {
  return value.n * Math.pow(0.5, Math.max(0, now - value.t) / HALF_LIFE_MS);
}

function bump(stats: UsageStats, bucket: string, value: string, now: number): void {
  const map = (stats.buckets[bucket] ??= {});
  const entry = map[value];
  if (entry) {
    entry.n += 1;
    entry.t = now;
  } else {
    map[value] = { n: 1, t: now };
  }
  const keys = Object.keys(map);
  if (keys.length > MAX_BUCKET_VALUES) {
    const worst = keys.reduce((a, b) => (score(map[a], now) <= score(map[b], now) ? a : b));
    delete map[worst];
  }
}

/**
 * Record one settled, valid command query. Called by the shell after the user
 * stops typing on a live result — saving is not required for the app to learn.
 */
export function recordCommandUsage(p: CommandParseResult, query: string): void {
  if (!p.valid || !p.alias) return;
  const q = query.trim();
  if (!q) return;
  const now = Date.now();
  const stats = loadStats();

  // Move-to-front keeps recency order deterministic (timestamps can tie
  // within a millisecond).
  // Collapse refinement chains: while a user builds one calculation, each idle
  // pause records a settled state (`…304`, then `…304 @6`). Those are the same
  // job at different stages, so a new query drops every stored entry that it
  // extends — or that extends it — keeping only the latest, most complete form.
  // The dropped entries' weight (`n`) carries onto the survivor so a genuinely
  // frequent query never loses its ranking to this pruning.
  const qToks = q.split(/\s+/);
  let carriedN = 0;
  const kept = stats.queries.filter((e) => {
    if (prefixRelated(qToks, e.q.split(/\s+/))) {
      carriedN = Math.max(carriedN, e.n);
      return false;
    }
    return true;
  });
  stats.queries = [{ q, n: carriedN + 1, t: now }, ...kept].slice(
    0,
    MAX_RECENT_QUERIES,
  );

  const fam = p.alias.fam;
  if (p.hasSize && p.size) {
    bump(stats, `size:${fam}`, p.size, now);
  }
  // Sheet-like families bake length into the size token — no separate length habit.
  if (p.lengthRaw != null && !SHEET_LIKE_FAMILIES.has(fam)) {
    const token = p.lengthExplicit ? `${p.lengthRaw}${p.lengthUnit}` : `${p.lengthRaw}`;
    bump(stats, `len:${fam}`, token, now);
  }
  if (p.qty != null && p.qty >= 1) {
    bump(stats, `qty:${fam}`, `x${p.qty}`, now);
  }
  // Only grades the user explicitly typed — the shared default isn't a habit.
  if (p.gradeId) {
    bump(stats, `grade:${fam}`, p.gradeId, now);
  }

  persistToStorage(USAGE_KEY, stats);
}

function topOf(stats: UsageStats, bucket: string, now: number): string[] {
  const map = stats.buckets[bucket];
  if (!map) return [];
  return Object.keys(map).sort((a, b) => score(map[b], now) - score(map[a], now));
}

/**
 * Snapshot the persisted stats into a CommandUsageSource for cmdSuggest.
 * Cheap to call; reads storage once and closes over the result — rebuild it
 * (e.g. on a version counter) after recording to pick up fresh habits.
 */
export function buildUsageSource(): CommandUsageSource {
  const stats = loadStats();
  const now = Date.now();
  return {
    recentQueries: () => stats.queries.map((e) => e.q),
    topSizes: (fam: CommandFamily) => topOf(stats, `size:${fam}`, now),
    topLengths: (fam: CommandFamily) => topOf(stats, `len:${fam}`, now),
    topQuantities: (fam: CommandFamily) => topOf(stats, `qty:${fam}`, now),
    topGradeIds: (fam: CommandFamily) => topOf(stats, `grade:${fam}`, now),
  };
}

/** Test hook. */
export const USAGE_STORAGE_KEY = USAGE_KEY;
