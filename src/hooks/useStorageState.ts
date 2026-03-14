"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";

/**
 * Manages an array state that auto-hydrates from localStorage on mount
 * and persists changes back, with a hydration guard to avoid writing back
 * the initial empty state.
 */
export function useStorageArray<T>(key: string): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [items, setItems] = useState<T[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = loadArrayFromStorage<T>(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only localStorage hydration
    if (stored.length > 0) setItems(stored);
    hydrated.current = true;
  }, [key]);

  const setItemsWithPersist: React.Dispatch<React.SetStateAction<T[]>> = useCallback(
    (action) => {
      setItems((prev) => {
        const next = typeof action === "function" ? (action as (prev: T[]) => T[])(prev) : action;
        if (hydrated.current) persistToStorage(key, next);
        return next;
      });
    },
    [key],
  );

  return [items, setItemsWithPersist];
}
