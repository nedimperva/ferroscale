"use client";

/**
 * What the app has learned from the user's own corrections.
 *
 * The typing habits in usage-stats.ts learn what the user *types*; this
 * learns what the user *changed*. A spelling the parser does not know is
 * noticed the moment it is typed, and the moment the line comes out right
 * the difference between the two is the correction — "hae120" was really
 * "hea120", and the next time it is typed the right answer can be offered
 * before the user has finished spelling it.
 *
 * The table is a fact about the user, not about a device, so it syncs: two
 * devices that both learned the same correction must agree on it.
 */

import { useSyncExternalStore } from "react";
import {
  getCorrectionsUpdatedAt,
  loadCorrectionState,
  loadCorrections,
  persistCorrections,
} from "@/lib/sync/collections";
import { subscribeCollectionsReplaced } from "@/lib/sync/external-changes";
import { correctionKey, type CorrectionEntry } from "@/lib/sync/corrections-merge";

export type { CorrectionEntry, CorrectionRemovals, CorrectionState } from "@/lib/sync/corrections-merge";

/** An app that learns everything eventually offers something absurd. */
const MAX_CORRECTIONS = 60;

/* ── the version store: one counter every reader can subscribe to ────────── */

let version = 0;
let versionListeners: Array<() => void> = [];

function bumpVersion(): void {
  version += 1;
  for (const listener of versionListeners) listener();
}

/* ── the snapshot: a new array only when the table really changed ───────── */

let snapshot: CorrectionEntry[] = [];
let snapshotVersion = -1;

function currentCorrections(): CorrectionEntry[] {
  if (snapshotVersion !== version) {
    snapshot = loadCorrections();
    snapshotVersion = version;
  }
  return snapshot;
}

/** A pull brought corrections in; every reader re-reads them. */
export function notifyCorrectionsReplaced(): void {
  bumpVersion();
}

// A pull or a restore rewrites storage behind every open hook.
subscribeCollectionsReplaced(notifyCorrectionsReplaced);

/**
 * The corrections table changed. A pull that brought another device's
 * corrections in bumps it too, so the list and the suggestion bar both pick
 * them up without a reload.
 */
export const correctionsVersionStore = {
  subscribe(callback: () => void) {
    versionListeners = [...versionListeners, callback];
    return () => {
      versionListeners = versionListeners.filter((listener) => listener !== callback);
    };
  },
  getSnapshot: () => version,
  getServerSnapshot: () => 0,
};

/** The corrections, as a snapshot the UI can subscribe to. */
export function getCorrectionsSnapshot(): CorrectionEntry[] {
  return currentCorrections();
}

export function useCorrections(): CorrectionEntry[] {
  return useSyncExternalStore(
    correctionsVersionStore.subscribe,
    getCorrectionsSnapshot,
    getCorrectionsSnapshot,
  );
}

/**
 * Remember a correction. The count rises, the time moves, and the table is
 * capped — the oldest entries fall off the end.
 */
export function recordCorrection(from: string, to: string): boolean {
  const typed = from.trim();
  const fixed = to.trim();
  if (!typed || !fixed) return false;
  if (typed.toLowerCase() === fixed.toLowerCase()) return false;
  if (typed.length > 64 || fixed.length > 64) return false;

  const key = correctionKey(typed);
  const items = currentCorrections();
  const existing = items.find((entry) => correctionKey(entry.from) === key);
  const now = Date.now();
  const next = existing
    ? items.map((entry) =>
        correctionKey(entry.from) === key
          ? { ...entry, to: fixed, n: entry.n + 1, t: now }
          : entry,
      )
    : [...items, { from: typed, to: fixed, n: 1, t: now }];
  persistCorrections(next.slice(-MAX_CORRECTIONS));
  bumpVersion();
  return true;
}

/** Forget one correction — here, and through the tombstone, on every device. */
export function forgetCorrection(from: string): boolean {
  const key = correctionKey(from);
  const state = loadCorrectionState();
  if (!state.items.some((entry) => correctionKey(entry.from) === key)) return false;
  persistCorrections(state.items.filter((entry) => correctionKey(entry.from) !== key));
  bumpVersion();
  return true;
}

/** Forget everything the app has learned. */
export function forgetAllCorrections(): void {
  persistCorrections([]);
  bumpVersion();
}

/**
 * The lookup the suggestion bar asks: what did the user change this word
 * into, and how often.
 */
export function lookupCorrections(from: string): Array<{ to: string; n: number }> {
  const key = correctionKey(from);
  if (!key) return [];
  const entry = currentCorrections().find((item) => correctionKey(item.from) === key);
  if (!entry) return [];
  return [{ to: entry.to, n: entry.n }];
}

export { getCorrectionsUpdatedAt };
export { loadCorrections } from "@/lib/sync/collections";
