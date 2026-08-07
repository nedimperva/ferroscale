import { SHEET_LIKE_FAMILIES } from "@ferroscale/metal-core";
import type {
  CommandFamily,
  CommandParseResult,
  CommandUsageSource,
} from "@ferroscale/metal-core";
import { loadFromStorage, persistToStorage } from "@/lib/storage";
import { SYNC_STORAGE_KEYS } from "@/lib/sync/keys";
import { notifySyncedCollectionDirty } from "@/lib/sync/registry";

/**
 * Learns what the user actually types so suggestions rank their real habits
 * first. Values are bucketed per profile family (SHS sizes never surface for
 * HEA) and scored by frequency × recency with a 14-day half-life, so a size
 * used daily beats one used once yesterday, but stale habits fade out.
 *
 * Habits sync, and they sync as a *grow-only counter per device*: this device
 * only ever writes its own tally, every other device's arrives as a separate
 * peer record, and suggestions read the sum. Merging a shared total would
 * double-count on every pull — five uses here plus the five we just pulled
 * back would read as ten — which is why the split exists.
 */

const USAGE_KEY = SYNC_STORAGE_KEYS.usage;
const USAGE_PEERS_KEY = "ferroscale-usage-peers-v1";
const MAX_RECENT_QUERIES = 20;
const MAX_BUCKET_VALUES = 24;
const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000;

export interface UsageValue {
  /** Times used. */
  n: number;
  /** Last used, epoch ms. */
  t: number;
}

export interface UsageStats {
  /** Settled valid queries, newest first, deduped. */
  queries: { q: string; n: number; t: number }[];
  /** "size:shs" → { "40x40x3": {n, t} } and likewise len:/qty:/grade:. */
  buckets: Record<string, Record<string, UsageValue>>;
}

/** One other device's tally, as pulled. Keyed by that device's sync id. */
type UsagePeers = Record<string, { updatedAt: string; stats: UsageStats }>;

function isUsageStats(raw: unknown): raw is UsageStats {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as Partial<UsageStats>;
  return (
    Array.isArray(candidate.queries) &&
    typeof candidate.buckets === "object" &&
    candidate.buckets !== null
  );
}

function loadStats(): UsageStats {
  // Always return a fresh object — callers mutate the result before persisting.
  const raw = loadFromStorage<UsageStats | null>(USAGE_KEY, null);
  if (!isUsageStats(raw)) return { queries: [], buckets: {} };
  return raw;
}

/* ── the version store: one counter every reader can subscribe to ─────────── */

let usageVersion = 0;
let versionListeners: Array<() => void> = [];

function bumpUsageVersion(): void {
  usageVersion += 1;
  for (const listener of versionListeners) listener();
}

/**
 * Subscribable version counter. Recording a query bumps it, and so does a pull
 * that brought another device's habits in — so the suggestion source rebuilds
 * for both without the shell knowing which happened.
 */
export const usageStatsVersionStore = {
  subscribe(callback: () => void) {
    versionListeners = [...versionListeners, callback];
    return () => {
      versionListeners = versionListeners.filter((listener) => listener !== callback);
    };
  },
  getSnapshot: () => usageVersion,
  /** Nothing is learned on the server; habits live in the browser. */
  getServerSnapshot: () => 0,
};

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
  bumpUsageVersion();
  notifySyncedCollectionDirty("usage");
}

/* ── sync surface ─────────────────────────────────────────────────────────── */

/** This device's own tally — the only thing it ever pushes. */
export function loadOwnUsageStats(): UsageStats {
  return loadStats();
}

/**
 * When this device last learned anything. Derived from the tally itself rather
 * than stored separately: every entry already carries the moment it was made,
 * so there is no second clock to keep honest.
 */
export function getUsageUpdatedAt(): string {
  const stats = loadStats();
  let latest = 0;
  for (const entry of stats.queries) latest = Math.max(latest, entry.t ?? 0);
  for (const bucket of Object.values(stats.buckets)) {
    for (const value of Object.values(bucket)) latest = Math.max(latest, value.t ?? 0);
  }
  return new Date(latest).toISOString();
}

function loadPeers(): UsagePeers {
  const raw = loadFromStorage<UsagePeers | null>(USAGE_PEERS_KEY, null);
  if (!raw || typeof raw !== "object") return {};
  const out: UsagePeers = {};
  for (const [deviceId, entry] of Object.entries(raw)) {
    if (!deviceId || !entry || typeof entry !== "object") continue;
    if (!isUsageStats(entry.stats)) continue;
    out[deviceId] = { updatedAt: entry.updatedAt || new Date(0).toISOString(), stats: entry.stats };
  }
  return out;
}

/**
 * Store another device's tally, newest wins per device. Returns false when the
 * incoming record is not newer than what we already hold, so the caller can
 * skip the write and the version bump.
 */
export function mergeRemoteUsageStats(
  deviceId: string,
  updatedAt: string,
  stats: unknown,
): boolean {
  if (!deviceId || !isUsageStats(stats)) return false;
  const peers = loadPeers();
  if ((peers[deviceId]?.updatedAt ?? "") >= updatedAt) return false;
  peers[deviceId] = { updatedAt, stats };
  persistToStorage(USAGE_PEERS_KEY, peers);
  bumpUsageVersion();
  return true;
}

/** Sum the counts, keep the latest touch — the merge a grow-only counter wants. */
function mergeStats(into: UsageStats, from: UsageStats): void {
  for (const entry of from.queries) {
    if (!entry?.q) continue;
    const existing = into.queries.find((candidate) => candidate.q === entry.q);
    if (existing) {
      existing.n += entry.n ?? 0;
      existing.t = Math.max(existing.t, entry.t ?? 0);
    } else {
      into.queries.push({ q: entry.q, n: entry.n ?? 0, t: entry.t ?? 0 });
    }
  }
  for (const [bucket, values] of Object.entries(from.buckets)) {
    const target = (into.buckets[bucket] ??= {});
    for (const [value, usage] of Object.entries(values)) {
      const existing = target[value];
      if (existing) {
        existing.n += usage.n ?? 0;
        existing.t = Math.max(existing.t, usage.t ?? 0);
      } else {
        target[value] = { n: usage.n ?? 0, t: usage.t ?? 0 };
      }
    }
  }
}

/**
 * This device's habits plus every peer's. Untouched when nothing has synced —
 * a single-device user gets exactly the ordering they had before.
 */
function loadMergedStats(): UsageStats {
  const own = loadStats();
  const peers = Object.values(loadPeers());
  if (peers.length === 0) return own;

  const merged: UsageStats = {
    queries: own.queries.map((entry) => ({ ...entry })),
    buckets: Object.fromEntries(
      Object.entries(own.buckets).map(([bucket, values]) => [
        bucket,
        Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { ...value }])),
      ]),
    ),
  };
  for (const peer of peers) mergeStats(merged, peer.stats);

  // Recency order across devices can only come from the timestamps; within one
  // device this is the order the move-to-front already produced.
  merged.queries.sort((a, b) => b.t - a.t);
  merged.queries = merged.queries.slice(0, MAX_RECENT_QUERIES);
  return merged;
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
  const stats = loadMergedStats();
  const now = Date.now();
  return {
    recentQueries: () => stats.queries.map((e) => e.q),
    topSizes: (fam: CommandFamily) => topOf(stats, `size:${fam}`, now),
    topLengths: (fam: CommandFamily) => topOf(stats, `len:${fam}`, now),
    topQuantities: (fam: CommandFamily) => topOf(stats, `qty:${fam}`, now),
    topGradeIds: (fam: CommandFamily) => topOf(stats, `grade:${fam}`, now),
  };
}

/** Test hooks. */
export const USAGE_STORAGE_KEY = USAGE_KEY;
export const USAGE_PEERS_STORAGE_KEY = USAGE_PEERS_KEY;
