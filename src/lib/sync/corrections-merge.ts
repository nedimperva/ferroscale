/**
 * Per-key merge for the corrections the app has learned.
 *
 * A correction is a fact about the user — "hae120 means hea120" — so two
 * devices that both learned it have to agree on it. The count is the larger
 * of the two, never the sum: merging a shared total would double-count on
 * every pull, which is exactly the mistake the typing habits made before
 * they were split into one record per device.
 *
 * A forgotten correction leaves a stamped tombstone, so a device that still
 * holds it cannot bring it back on the next pull.
 */

export interface CorrectionEntry {
  /** The text the user typed. */
  from: string;
  /** What they changed it to. */
  to: string;
  /** How many times the correction was seen. */
  n: number;
  /** When it was last seen, epoch ms. */
  t: number;
}

/** from → when it was forgotten, epoch ms. */
export type CorrectionRemovals = Record<string, number>;

export interface CorrectionState {
  items: CorrectionEntry[];
  removed: CorrectionRemovals;
}

export const EMPTY_CORRECTION_STATE: CorrectionState = { items: [], removed: {} };

/** The key a correction is filed under: the typed text, normalized. */
export function correctionKey(from: string): string {
  return from.trim().toLowerCase();
}

/**
 * The live version of one correction, or the tombstone that killed it.
 * A tombstone wins when it is the newer of the two — a correction made after
 * the user forgot it is a correction made again.
 */
function liveVersion(
  entry: CorrectionEntry | undefined,
  removedAt: number | undefined,
): { kind: "live"; entry: CorrectionEntry } | { kind: "removed"; at: number } | null {
  if (entry && removedAt != null) {
    return entry.t > removedAt ? { kind: "live", entry } : { kind: "removed", at: removedAt };
  }
  if (entry) return { kind: "live", entry };
  if (removedAt != null) return { kind: "removed", at: removedAt };
  return null;
}

/**
 * Merge one correction. The count is the larger of the two — a grow-only
 * counter that two devices both raised must not become the sum, or every
 * pull would inflate it. The destination text comes from whichever side saw
 * the correction more recently.
 */
function pickCorrection(
  left: CorrectionEntry,
  right: CorrectionEntry,
): CorrectionEntry {
  const newer = left.t !== right.t ? (left.t > right.t ? left : right) : left.to >= right.to ? left : right;
  return {
    from: newer.from,
    to: newer.to,
    n: Math.max(left.n, right.n),
    t: Math.max(left.t, right.t),
  };
}

export function mergeCorrections(
  local: CorrectionState,
  remote: CorrectionState,
): CorrectionState {
  const localItems = new Map(local.items.map((entry) => [correctionKey(entry.from), entry]));
  const remoteItems = new Map(remote.items.map((entry) => [correctionKey(entry.from), entry]));

  const keys = new Set([...localItems.keys(), ...remoteItems.keys()]);
  const items: CorrectionEntry[] = [];
  const removed: CorrectionRemovals = { ...local.removed };

  for (const key of keys) {
    const mine = localItems.get(key);
    const theirs = remoteItems.get(key);
    const localVersion = liveVersion(mine, local.removed[key]);
    const remoteVersion = liveVersion(theirs, remote.removed[key]);

    const localLive = localVersion?.kind === "live" ? localVersion.entry : null;
    const remoteLive = remoteVersion?.kind === "live" ? remoteVersion.entry : null;

    if (localLive && remoteLive) {
      items.push(pickCorrection(localLive, remoteLive));
      continue;
    }
    const live = localLive ?? remoteLive;
    const dead = localVersion?.kind === "removed" ? localVersion.at : remoteVersion?.kind === "removed" ? remoteVersion.at : null;
    if (live && dead == null) {
      items.push(live);
      continue;
    }
    if (live && dead != null && live.t > dead) {
      items.push(live);
      continue;
    }
    if (dead != null) removed[key] = Math.max(dead, local.removed[key] ?? 0);
  }

  return { items, removed };
}

/**
 * Same content regardless of list order or key order — what the sync hash is
 * taken over. Two devices holding the same corrections must hash the same, and
 * an entry rebuilt by a merge may carry its fields in a different order.
 */
export function canonicalCorrections(state: CorrectionState): CorrectionState {
  return {
    items: [...state.items]
      .sort((a, b) => correctionKey(a.from).localeCompare(correctionKey(b.from)))
      .map((entry) => ({ from: entry.from, to: entry.to, n: entry.n, t: entry.t })),
    removed: Object.fromEntries(
      Object.entries(state.removed).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

export function sameCorrections(left: CorrectionState, right: CorrectionState): boolean {
  return (
    JSON.stringify(canonicalCorrections(left)) === JSON.stringify(canonicalCorrections(right))
  );
}

/**
 * Stamp a user's edit: a correction seen again gets a new count and a new
 * time, an unchanged one keeps its stamp, a correction that disappeared
 * becomes a tombstone, and a correction made again drops its tombstone.
 */
export function stampCorrectionEdit(
  previous: CorrectionState,
  next: CorrectionEntry[],
  now: number,
): CorrectionState {
  const before = new Map(previous.items.map((entry) => [correctionKey(entry.from), entry]));
  const removed: CorrectionRemovals = { ...previous.removed };
  const items = next.map((entry) => {
    const prior = before.get(correctionKey(entry.from));
    delete removed[correctionKey(entry.from)];
    if (prior && prior.to === entry.to) {
      return { ...prior, n: Math.max(prior.n, entry.n), t: Math.max(prior.t, entry.t) };
    }
    return { ...entry, t: now };
  });
  const kept = new Set(next.map((entry) => correctionKey(entry.from)));
  for (const entry of previous.items) {
    const key = correctionKey(entry.from);
    if (!kept.has(key)) removed[key] = now;
  }
  return { items, removed };
}
