"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CompareItem {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
}

const COMPARE_KEY = "advanced-calc-compare-v2";
const COMPARE_LIMIT_KEY = "advanced-calc-compare-limit-v1";
const DEFAULT_COMPARE_LIMIT = 3;

function clampCompareLimit(value: number): number {
  return Math.min(8, Math.max(3, Math.round(value)));
}

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
  compareLimit: number;
  setCompareLimit: (value: number) => void;
  maxCompare: number;
  isMobileCapped: boolean;
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
  const [compareLimit, setCompareLimitState] = useState(DEFAULT_COMPARE_LIMIT);
  const [isDesktop, setIsDesktop] = useState(false);
  const compareLimitRef = useRef(compareLimit);
  const maxCompare = isDesktop ? compareLimit : Math.min(compareLimit, 3);

  useEffect(() => {
    compareLimitRef.current = compareLimit;
  }, [compareLimit]);

  /* Hydrate from localStorage on mount (empty [] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    const stored = loadItems();
    const storedLimitRaw = localStorage.getItem(COMPARE_LIMIT_KEY);
    const storedLimit = storedLimitRaw ? Number(storedLimitRaw) : DEFAULT_COMPARE_LIMIT;
    const nextLimit = Number.isFinite(storedLimit)
      ? clampCompareLimit(storedLimit)
      : DEFAULT_COMPARE_LIMIT;

    setCompareLimitState(nextLimit); // eslint-disable-line react-hooks/set-state-in-effect

    const media = window.matchMedia("(min-width: 1024px)");
    const syncDesktop = () => {
      const desktop = media.matches;
      setIsDesktop(desktop);
      const effectiveLimit = desktop ? compareLimitRef.current : Math.min(compareLimitRef.current, 3);
      setItems((prev) => (prev.length > effectiveLimit ? prev.slice(0, effectiveLimit) : prev));
    };
    syncDesktop();
    media.addEventListener("change", syncDesktop);

    const effectiveLimit = media.matches ? nextLimit : Math.min(nextLimit, 3);
    if (stored.length > 0) setItems(stored.slice(0, effectiveLimit));

    hydrated.current = true;

    return () => media.removeEventListener("change", syncDesktop);
  }, []);

  /* Persist on change (skip the initial hydration write-back) */
  useEffect(() => {
    if (hydrated.current) persistItems(items);
  }, [items]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(COMPARE_LIMIT_KEY, String(compareLimit));
  }, [compareLimit]);

  const setCompareLimit = useCallback((value: number) => {
    const nextLimit = clampCompareLimit(value);
    setCompareLimitState(nextLimit);
    const effectiveLimit = isDesktop ? nextLimit : Math.min(nextLimit, 3);
    setItems((prev) => (prev.length > effectiveLimit ? prev.slice(0, effectiveLimit) : prev));
  }, [isDesktop]);

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
        if (prev.length >= maxCompare) return prev;
        const fp = fingerprint(result);
        if (prev.some((item) => fingerprint(item.result) === fp)) return prev;

        const entry: CompareItem = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          input,
          result,
          normalizedProfile: normalizeProfileSnapshot(input),
        };
        const next = [...prev, entry];
        /* Auto-open the drawer when we reach 2+ items */
        if (next.length >= 2) setIsOpen(true);
        return next;
      });
    },
    [maxCompare],
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
    canAdd: items.length < maxCompare,
    compareLimit,
    setCompareLimit,
    maxCompare,
    isMobileCapped: compareLimit > maxCompare,
    open,
    close,
    toggle,
    addItem,
    removeItem,
    clearAll,
    isDuplicate,
  };
}
