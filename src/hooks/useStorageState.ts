"use client";

import { useEffect, useRef, useState } from "react";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";

/**
 * Manages an array state that auto-hydrates from localStorage on mount
 * and persists changes back, with a hydration guard to avoid writing back
 * the initial empty state.
 */
export function useStorageArray<T>(key: string): [T[], React.Dispatch<React.SetStateAction<T[]>>, boolean] {
  const [items, setItems] = useState<T[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = loadArrayFromStorage<T>(key);
    if (stored.length > 0) setItems(stored);
    hydrated.current = true;
  }, [key]);

  useEffect(() => {
    if (hydrated.current) persistToStorage(key, items);
  }, [key, items]);

  return [items, setItems, hydrated.current];
}
