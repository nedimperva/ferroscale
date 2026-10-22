"use client";

/**
 * The record of what a merge threw away.
 *
 * Every merge in the sync layer picks a winner: the newer edit of a project
 * survives, the newer list of compare rows survives, the newer price book
 * survives. That is the right call — but it was invisible, and in the
 * wholesale cases the loser's data simply disappeared. A user who edited a
 * project on the phone and on the laptop never learned that one of the two
 * edits was dropped.
 *
 * So a merge that drops local data writes a conflict record. The losing side
 * is *kept*, which turns "keep mine" from a recollection into an operation.
 *
 * The log is device-local: it describes what happened on this device, and
 * there is nothing useful about the same merge on another screen.
 */

import { loadFromStorage, persistToStorage } from "@/lib/storage";

const CONFLICT_KEY = "ferroscale-conflicts-v1";
const MAX_CONFLICTS = 40;

export type SyncConflictKind = "entity" | "list" | "settings" | "priceBook" | "corrections";

export interface SyncConflict {
  id: string;
  at: number;
  kind: SyncConflictKind;
  /** Which thing conflicted: "project", "part", "customer", "compare"… */
  entity: string;
  /** The label to show — a project name, a grade, "Compare". */
  label: string;
  /** What this device had. */
  local: unknown;
  /** What the other device had. */
  remote: unknown;
  /** Which side the merge kept. */
  winner: "local" | "remote";
  /** True once the user has dealt with it. */
  resolved: boolean;
}

function isConflict(raw: unknown): raw is SyncConflict {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as Partial<SyncConflict>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.entity === "string" &&
    typeof candidate.label === "string" &&
    (candidate.winner === "local" || candidate.winner === "remote")
  );
}

export function normalizeConflicts(raw: unknown): SyncConflict[] {
  if (!Array.isArray(raw)) return [];
  const out: SyncConflict[] = [];
  for (const item of raw) {
    if (!isConflict(item)) continue;
    out.push({
      id: item.id,
      at: Number(item.at) || 0,
      kind: item.kind ?? "entity",
      entity: item.entity,
      label: item.label,
      local: item.local ?? null,
      remote: item.remote ?? null,
      winner: item.winner,
      resolved: Boolean(item.resolved),
    });
  }
  return out;
}

export function loadConflicts(): SyncConflict[] {
  return normalizeConflicts(loadFromStorage<unknown>(CONFLICT_KEY, []));
}

function persist(conflicts: SyncConflict[]): void {
  persistToStorage(CONFLICT_KEY, conflicts);
}

/**
 * Write down a merge that dropped something. Returns the conflict, so the
 * caller can point the user at it straight away.
 */
export function recordConflict(conflict: {
  kind: SyncConflictKind;
  entity: string;
  label: string;
  local: unknown;
  remote: unknown;
  winner: "local" | "remote";
}): SyncConflict {
  const entry: SyncConflict = {
    id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    kind: conflict.kind,
    entity: conflict.entity,
    label: conflict.label,
    local: conflict.local,
    remote: conflict.remote,
    winner: conflict.winner,
    resolved: false,
  };
  persist([entry, ...loadConflicts()].slice(0, MAX_CONFLICTS));
  return entry;
}

/** Mark a conflict as dealt with. */
export function resolveConflict(id: string): void {
  persist(loadConflicts().map((entry) => (entry.id === id ? { ...entry, resolved: true } : entry)));
}

/** Remove one conflict from the log. */
export function dismissConflict(id: string): void {
  persist(loadConflicts().filter((entry) => entry.id !== id));
}

/** Empty the log. */
export function clearConflicts(): void {
  persist([]);
}

/** The conflicts the user has not looked at yet. */
export function unresolvedConflicts(): SyncConflict[] {
  return loadConflicts().filter((entry) => !entry.resolved);
}
