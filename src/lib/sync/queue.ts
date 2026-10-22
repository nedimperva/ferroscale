"use client";

/**
 * The queue of work waiting to go up to Drive.
 *
 * The records themselves are derived — `getPendingSyncRecords` diffs what is
 * on this device against the record index — so this module holds only the
 * bookkeeping a diff cannot tell: when the last attempt was, how many have
 * failed in a row, and when the next one is due.
 *
 * The point is that a failed push is a *state*, not a lost cause. Before,
 * a push that failed after the local write simply waited for the next edit
 * to try again, and the user never learned their other device was behind.
 * Now the queue survives a closed tab, backs off instead of hammering, and
 * can be seen.
 */

import { useSyncExternalStore } from "react";
import type { SyncErrorKind } from "./types";

const QUEUE_KEY = "ferroscale-sync-queue-v1";

/** The first retry waits half a minute; the last waits a quarter of an hour. */
const BASE_RETRY_MS = 30_000;
const MAX_RETRY_MS = 15 * 60_000;

export interface SyncQueueState {
  /** When the last attempt was made, epoch ms. 0 when never. */
  lastAttemptAt: number;
  /** Consecutive failed attempts. */
  attempts: number;
  /** The kind of the last failure. */
  lastErrorKind: SyncErrorKind | null;
  /** When the next attempt is due, epoch ms. 0 when it is due now. */
  nextAttemptAt: number;
}

const EMPTY_QUEUE: SyncQueueState = {
  lastAttemptAt: 0,
  attempts: 0,
  lastErrorKind: null,
  nextAttemptAt: 0,
};

let state: SyncQueueState = EMPTY_QUEUE;
let listeners: Array<() => void> = [];
let hydrated = false;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

function readStored(): SyncQueueState {
  if (typeof window === "undefined") return EMPTY_QUEUE;
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return EMPTY_QUEUE;
    const parsed = JSON.parse(raw) as Partial<SyncQueueState>;
    return {
      lastAttemptAt: Number(parsed.lastAttemptAt) || 0,
      attempts: Number(parsed.attempts) || 0,
      lastErrorKind: parsed.lastErrorKind ?? null,
      nextAttemptAt: Number(parsed.nextAttemptAt) || 0,
    };
  } catch {
    return EMPTY_QUEUE;
  }
}

function writeStored(next: SyncQueueState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  } catch {
    // noop
  }
}

export function getQueueState(): SyncQueueState {
  if (!hydrated) {
    state = readStored();
    hydrated = true;
  }
  return state;
}

export function writeQueueState(next: SyncQueueState): void {
  state = next;
  hydrated = true;
  writeStored(next);
  emit();
}

/** How long to wait before the next attempt, given how many have failed. */
export function queueRetryDelay(attempts: number): number {
  if (attempts <= 0) return 0;
  const delay = BASE_RETRY_MS * 2 ** (attempts - 1);
  return Math.min(delay, MAX_RETRY_MS);
}

/**
 * Record an attempt. A success clears the failures; a failure moves the next
 * attempt back by the backoff.
 */
export function noteQueueAttempt(success: boolean, errorKind?: SyncErrorKind | null): void {
  const now = Date.now();
  if (success) {
    writeQueueState({ lastAttemptAt: now, attempts: 0, lastErrorKind: null, nextAttemptAt: 0 });
    return;
  }
  const attempts = getQueueState().attempts + 1;
  writeQueueState({
    lastAttemptAt: now,
    attempts,
    lastErrorKind: errorKind ?? "transient",
    nextAttemptAt: now + queueRetryDelay(attempts),
  });
}

/** True when the queue is due another attempt. */
export function queueIsDue(now = Date.now()): boolean {
  const current = getQueueState();
  return current.nextAttemptAt === 0 || current.nextAttemptAt <= now;
}

/** Forget the queue — used when sync is disconnected or the remote copy reset. */
export function clearQueueState(): void {
  writeQueueState(EMPTY_QUEUE);
}

export function useSyncQueue(): SyncQueueState {
  return useSyncExternalStore(subscribe, getQueueState, getQueueState);
}
