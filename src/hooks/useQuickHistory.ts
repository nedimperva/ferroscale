"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadQuickHistory, persistQuickHistory } from "@/lib/sync/collections";

const MAX_QUICK_HISTORY = 50;

export interface UseQuickHistoryReturn {
  history: string[];
  push: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

/**
 * Persisted command-query history (localStorage, included in Drive sync).
 * Newest first, exact-string dedupe, capped at 50. Backs the session tape
 * and the recency-based suggestions.
 */
export function useQuickHistory(): UseQuickHistoryReturn {
  const [history, setHistory] = useState<string[]>([]);

  /* Hydrate on mount ([] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadQuickHistory().slice(0, MAX_QUICK_HISTORY));
    hydrated.current = true;
  }, []);

  const update = useCallback((action: (prev: string[]) => string[]) => {
    setHistory((prev) => {
      const next = action(prev);
      if (hydrated.current) persistQuickHistory(next);
      return next;
    });
  }, []);

  const push = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      update((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, MAX_QUICK_HISTORY));
    },
    [update],
  );

  const remove = useCallback(
    (query: string) => {
      update((prev) => prev.filter((x) => x !== query));
    },
    [update],
  );

  const clear = useCallback(() => {
    update(() => []);
  }, [update]);

  return { history, push, remove, clear };
}
