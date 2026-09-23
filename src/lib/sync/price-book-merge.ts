/**
 * Per-grade merge for the price book.
 *
 * The book used to sync as one blob, newer wins: edit steel on the phone and
 * stainless on the laptop before they met and one edit vanished. Each rate
 * now carries its own `updatedAt`, a removed rate leaves a stamped tombstone
 * (without one, the device that still has it would bring it back), and two
 * books merge grade by grade.
 */

import type { PriceBookEntry } from "@/hooks/usePriceBook";

const EPOCH = new Date(0).toISOString();

/** gradeId → when it was removed. */
export type PriceBookRemovals = Record<string, string>;

export interface PriceBookState {
  items: PriceBookEntry[];
  removed: PriceBookRemovals;
}

type Version =
  | { kind: "live"; at: string; entry: PriceBookEntry }
  | { kind: "removed"; at: string };

function versionsOf(state: PriceBookState): Map<string, Version> {
  const out = new Map<string, Version>();
  for (const [gradeId, at] of Object.entries(state.removed)) {
    out.set(gradeId, { kind: "removed", at: at || EPOCH });
  }
  for (const entry of state.items) {
    const at = entry.updatedAt || EPOCH;
    const removed = out.get(entry.gradeId);
    // A rate set again after it was removed is live; a stale one is not.
    if (!removed || at > removed.at) out.set(entry.gradeId, { kind: "live", at, entry });
  }
  return out;
}

/**
 * Newer wins per grade. Ties must resolve the same way on every device, or
 * two of them would each keep their own copy and push it at the other on
 * every sync forever — so: removal beats a live rate, then the larger rate.
 */
function pick(left: Version, right: Version): Version {
  if (left.at !== right.at) return left.at > right.at ? left : right;
  if (left.kind !== right.kind) return left.kind === "removed" ? left : right;
  if (left.kind === "live" && right.kind === "live") {
    return left.entry.unitPrice >= right.entry.unitPrice ? left : right;
  }
  return left;
}

export function mergePriceBooks(local: PriceBookState, remote: PriceBookState): PriceBookState {
  const localVersions = versionsOf(local);
  const remoteVersions = versionsOf(remote);
  const merged = new Map<string, Version>(localVersions);
  for (const [gradeId, version] of remoteVersions) {
    const mine = merged.get(gradeId);
    merged.set(gradeId, mine ? pick(mine, version) : version);
  }

  // Keep the local order for rates this device already lists; new ones go last.
  const order = [...local.items.map((entry) => entry.gradeId), ...remote.items.map((entry) => entry.gradeId)];
  const items: PriceBookEntry[] = [];
  const seen = new Set<string>();
  for (const gradeId of order) {
    if (seen.has(gradeId)) continue;
    seen.add(gradeId);
    const version = merged.get(gradeId);
    if (version?.kind === "live") items.push(version.entry);
  }

  const removed: PriceBookRemovals = {};
  for (const [gradeId, version] of merged) {
    if (version.kind === "removed") removed[gradeId] = version.at;
  }
  return { items, removed };
}

/** Same content regardless of list order — what the sync hash is taken over. */
export function canonicalPriceBook(state: PriceBookState): PriceBookState {
  const items = [...state.items].sort((a, b) => a.gradeId.localeCompare(b.gradeId));
  const removed = Object.fromEntries(
    Object.entries(state.removed).sort(([a], [b]) => a.localeCompare(b)),
  );
  return { items, removed };
}

export function samePriceBook(left: PriceBookState, right: PriceBookState): boolean {
  return JSON.stringify(canonicalPriceBook(left)) === JSON.stringify(canonicalPriceBook(right));
}

/**
 * Stamp a user's edit: a rate that is new or changed gets `now`, an unchanged
 * one keeps its stamp, a rate that disappeared becomes a tombstone, and a
 * grade set again drops its tombstone.
 */
export function stampPriceBookEdit(
  previous: PriceBookState,
  next: PriceBookEntry[],
  now: string,
): PriceBookState {
  const before = new Map(previous.items.map((entry) => [entry.gradeId, entry]));
  const removed: PriceBookRemovals = { ...previous.removed };
  const items = next.map((entry) => {
    const prior = before.get(entry.gradeId);
    delete removed[entry.gradeId];
    if (prior && prior.unitPrice === entry.unitPrice) {
      return { gradeId: entry.gradeId, unitPrice: entry.unitPrice, updatedAt: prior.updatedAt ?? entry.updatedAt };
    }
    return { gradeId: entry.gradeId, unitPrice: entry.unitPrice, updatedAt: now };
  });
  const kept = new Set(next.map((entry) => entry.gradeId));
  for (const entry of previous.items) {
    if (!kept.has(entry.gradeId)) removed[entry.gradeId] = now;
  }
  return { items, removed };
}
