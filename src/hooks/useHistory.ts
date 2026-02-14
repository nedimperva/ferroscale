"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HistoryEntry {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
  starred: boolean;
}

const HISTORY_KEY = "advanced-calc-history-v1";
const STARRED_KEY = "advanced-calc-starred-v1";
const MAX_HISTORY = 10;

/* ------------------------------------------------------------------ */
/*  Local-storage helpers                                             */
/* ------------------------------------------------------------------ */

function loadEntries(key: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEntries(key: string, entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(entries));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseHistoryReturn {
  history: HistoryEntry[];
  starred: HistoryEntry[];
  addToHistory: (input: CalculationInput, result: CalculationResult) => void;
  toggleStar: (id: string) => void;
  removeStarred: (id: string) => void;
  clearHistory: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [starred, setStarred] = useState<HistoryEntry[]>([]);

  /* Track last-added fingerprint to deduplicate rapid-fire auto-saves */
  const lastFingerprintRef = useRef<string>("");

  /* Hydrate from localStorage on mount (empty [] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    const storedHistory = loadEntries(HISTORY_KEY);
    const storedStarred = loadEntries(STARRED_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only localStorage hydration
    if (storedHistory.length > 0) setHistory(storedHistory);
    if (storedStarred.length > 0) setStarred(storedStarred);
    hydrated.current = true;
  }, []);

  /* Persist on change (skip the initial hydration write-back) */
  useEffect(() => {
    if (hydrated.current) persistEntries(HISTORY_KEY, history.slice(0, MAX_HISTORY));
  }, [history]);

  useEffect(() => {
    if (hydrated.current) persistEntries(STARRED_KEY, starred);
  }, [starred]);

  const addToHistory = useCallback(
    (input: CalculationInput, result: CalculationResult) => {
      const fingerprint = `${result.profileLabel}|${result.grandTotalAmount}|${result.gradeLabel}`;
      if (fingerprint === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fingerprint;

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        input,
        result,
        starred: false,
      };
      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
    },
    [],
  );

  const toggleStar = useCallback((id: string) => {
    /* Check if it's already in starred — if so, un-star it */
    setStarred((prev) => {
      const existing = prev.find((e) => e.id === id);
      if (existing) {
        return prev.filter((e) => e.id !== id);
      }
      return prev;
    });

    /* Check if it's in history — if so, move a copy to starred */
    setHistory((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        setStarred((prevStarred) => {
          if (prevStarred.some((e) => e.id === id)) return prevStarred;
          return [{ ...entry, starred: true }, ...prevStarred];
        });
      }
      return prev;
    });
  }, []);

  const removeStarred = useCallback((id: string) => {
    setStarred((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  return { history, starred, addToHistory, toggleStar, removeStarred, clearHistory };
}
