"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeCollectionsReplaced } from "@/lib/sync/external-changes";
import { loadQuickHistory, persistQuickHistory } from "@/lib/sync/collections";
import { loadFromStorage, persistToStorage } from "@/lib/storage";
import {
  MAX_HISTORY,
  pruneTimes,
  pushHistoryEntry,
  stampMissingTimes,
  type HistoryCounts,
  type HistoryState,
  type HistoryTimes,
} from "@/lib/command/history";

/**
 * When each line was logged. Kept on this device only: the synced list stays
 * a plain `string[]`, so older app versions on other devices read it as
 * before. A line that arrives without a time is stamped when first seen here.
 */
const TIMES_KEY = "ferroscale-quick-history-times-v1";
/** How many times each line was logged — device-only, like the times. */
const COUNTS_KEY = "ferroscale-quick-history-counts-v1";

export interface UseQuickHistoryReturn {
  history: string[];
  /** `{ query: epochMs }` for every line in `history`. */
  times: HistoryTimes;
  /** `{ query: timesLogged }`; a line missing from it was logged once. */
  counts: HistoryCounts;
  push: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

function hydrate(): HistoryState {
  const items = loadQuickHistory().slice(0, MAX_HISTORY);
  const times = stampMissingTimes(loadFromStorage<HistoryTimes>(TIMES_KEY, {}), items, Date.now());
  const counts = pruneTimes(loadFromStorage<HistoryCounts>(COUNTS_KEY, {}), items);
  persistToStorage(TIMES_KEY, times);
  return { items, times, counts };
}

/**
 * Persisted command-query history (localStorage, included in Drive sync).
 * Newest first, capped at 200. Lines are only logged by an explicit action
 * (↵, save, clear), never per keystroke, and `pushHistoryEntry` folds a line
 * that just finishes the previous one into it. Backs the session tape, the
 * day-grouped history and the recency-based suggestions.
 */
export function useQuickHistory(): UseQuickHistoryReturn {
  const [state, setState] = useState<HistoryState>({ items: [], times: {}, counts: {} });

  /* Hydrate on mount ([] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(hydrate());
    hydrated.current = true;
    // A restored backup or a Drive pull rewrites storage behind this hook.
    return subscribeCollectionsReplaced(() => setState(hydrate()));
  }, []);

  const update = useCallback(
    (action: (prev: HistoryState) => HistoryState) => {
      setState((prev) => {
        const next = action(prev);
        if (hydrated.current && next !== prev) {
          if (next.items !== prev.items) persistQuickHistory(next.items);
          persistToStorage(TIMES_KEY, next.times);
          persistToStorage(COUNTS_KEY, next.counts);
        }
        return next;
      });
    },
    [],
  );

  const push = useCallback(
    (query: string) => update((prev) => pushHistoryEntry(prev, query, Date.now())),
    [update],
  );

  const remove = useCallback(
    (query: string) => {
      update((prev) => {
        const items = prev.items.filter((x) => x !== query);
        return { items, times: pruneTimes(prev.times, items), counts: pruneTimes(prev.counts, items) };
      });
    },
    [update],
  );

  const clear = useCallback(() => {
    update(() => ({ items: [], times: {}, counts: {} }));
  }, [update]);

  return { history: state.items, times: state.times, counts: state.counts, push, remove, clear };
}
