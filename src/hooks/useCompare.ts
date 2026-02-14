"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CompareItem {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
}

const COMPARE_KEY = "advanced-calc-compare-v1";
const MAX_COMPARE = 3;

/* ------------------------------------------------------------------ */
/*  Local-storage helpers                                             */
/* ------------------------------------------------------------------ */

function loadItems(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistItems(items: CompareItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
}

/* ------------------------------------------------------------------ */
/*  Fingerprint – prevent adding the exact same calculation twice      */
/* ------------------------------------------------------------------ */

function fingerprint(result: CalculationResult): string {
  return `${result.profileLabel}|${result.gradeLabel}|${result.grandTotalAmount}|${result.totalWeightKg}`;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseCompareReturn {
  items: CompareItem[];
  isOpen: boolean;
  canAdd: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (input: CalculationInput, result: CalculationResult) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
  isDuplicate: (result: CalculationResult) => boolean;
}

export function useCompare(): UseCompareReturn {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  /* Hydrate from localStorage on mount (empty [] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    const stored = loadItems();
    if (stored.length > 0) setItems(stored); // eslint-disable-line react-hooks/set-state-in-effect
    hydrated.current = true;
  }, []);

  /* Persist on change (skip the initial hydration write-back) */
  useEffect(() => {
    if (hydrated.current) persistItems(items);
  }, [items]);

  const isDuplicate = useCallback(
    (result: CalculationResult): boolean => {
      const fp = fingerprint(result);
      return items.some((item) => fingerprint(item.result) === fp);
    },
    [items],
  );

  const addItem = useCallback(
    (input: CalculationInput, result: CalculationResult) => {
      setItems((prev) => {
        if (prev.length >= MAX_COMPARE) return prev;
        const fp = fingerprint(result);
        if (prev.some((item) => fingerprint(item.result) === fp)) return prev;

        const entry: CompareItem = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          input,
          result,
        };
        const next = [...prev, entry];
        /* Auto-open the drawer when we reach 2+ items */
        if (next.length >= 2) setIsOpen(true);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) setIsOpen(false);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(COMPARE_KEY);
    }
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    items,
    isOpen,
    canAdd: items.length < MAX_COMPARE,
    open,
    close,
    toggle,
    addItem,
    removeItem,
    clearAll,
    isDuplicate,
  };
}
