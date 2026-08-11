"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { loadPriceBook, persistPriceBook } from "@/lib/sync/collections";

/**
 * The price book: one rate per material grade.
 *
 * Pricing was a single €/kg for every material, so anyone working across
 * steel and stainless — a factor of four apart — was permanently quoting one
 * of them wrong unless they retyped `@` on every line. A grade listed here
 * prices with its own rate; an inline `@rate/unit` still wins over both.
 *
 * Backed by a module-level store rather than component state: the calculator
 * and the settings surface each call this hook, and editing a rate in one has
 * to be visible in the other immediately.
 *
 * The rate is in whatever unit and basis the global pricing settings use, so
 * switching from €/kg to €/m re-reads the same numbers in the new unit rather
 * than silently converting them.
 */

export interface PriceBookEntry {
  gradeId: string;
  unitPrice: number;
}

const EMPTY: PriceBookEntry[] = [];

let listeners: Array<() => void> = [];
let cache: PriceBookEntry[] | null = null;

function snapshot(): PriceBookEntry[] {
  if (cache === null) cache = loadPriceBook();
  return cache;
}

function serverSnapshot(): PriceBookEntry[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  listeners = [...listeners, onChange];
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function write(next: PriceBookEntry[]): void {
  cache = next;
  persistPriceBook(next);
  for (const listener of listeners) listener();
}

/** Drop the cache so the next read comes from storage (sync pulls, tests). */
export function invalidatePriceBookCache(): void {
  cache = null;
  for (const listener of listeners) listener();
}

export interface UsePriceBookReturn {
  entries: PriceBookEntry[];
  /** Lookup shape the parser wants: gradeId → rate. */
  rates: Record<string, number>;
  setRate: (gradeId: string, unitPrice: number) => void;
  clearRate: (gradeId: string) => void;
  clearAll: () => void;
}

export function usePriceBook(): UsePriceBookReturn {
  const entries = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  const setRate = useCallback((gradeId: string, unitPrice: number) => {
    if (!gradeId || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    const current = snapshot();
    const index = current.findIndex((entry) => entry.gradeId === gradeId);
    if (index < 0) {
      write([...current, { gradeId, unitPrice }]);
      return;
    }
    const next = [...current];
    next[index] = { gradeId, unitPrice };
    write(next);
  }, []);

  const clearRate = useCallback((gradeId: string) => {
    write(snapshot().filter((entry) => entry.gradeId !== gradeId));
  }, []);

  const clearAll = useCallback(() => write([]), []);

  const rates = useMemo(
    () => Object.fromEntries(entries.map((entry) => [entry.gradeId, entry.unitPrice])),
    [entries],
  );

  return { entries, rates, setRate, clearRate, clearAll };
}
