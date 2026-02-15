"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HistoryEntry {
  id: string;
  timestamp: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
  starred: boolean;
}

const HISTORY_KEY = "advanced-calc-history-v2";
const STARRED_KEY = "advanced-calc-starred-v2";
const HISTORY_LIMIT_KEY = "advanced-calc-history-limit-v1";
const DEFAULT_HISTORY_LIMIT = 10;

function clampHistoryLimit(value: number): number {
  return Math.min(100, Math.max(10, Math.round(value)));
}

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
  historyLimit: number;
  setHistoryLimit: (value: number) => void;
  addToHistory: (input: CalculationInput, result: CalculationResult) => void;
  toggleStar: (id: string) => void;
  removeStarred: (id: string) => void;
  clearHistory: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [starred, setStarred] = useState<HistoryEntry[]>([]);
  const [historyLimit, setHistoryLimitState] = useState(DEFAULT_HISTORY_LIMIT);

  /* Track last-added fingerprint to deduplicate rapid-fire auto-saves */
  const lastFingerprintRef = useRef<string>("");

  /* Hydrate from localStorage on mount (empty [] during SSR to avoid hydration mismatch) */
  const hydrated = useRef(false);
  useEffect(() => {
    const storedHistory = loadEntries(HISTORY_KEY);
    const storedStarred = loadEntries(STARRED_KEY);
    const storedLimitRaw = localStorage.getItem(HISTORY_LIMIT_KEY);
    const storedLimit = storedLimitRaw ? Number(storedLimitRaw) : DEFAULT_HISTORY_LIMIT;
    const nextLimit = Number.isFinite(storedLimit)
      ? clampHistoryLimit(storedLimit)
      : DEFAULT_HISTORY_LIMIT;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only localStorage hydration
    setHistoryLimitState(nextLimit);
    if (storedHistory.length > 0) setHistory(storedHistory.slice(0, nextLimit));
    if (storedStarred.length > 0) setStarred(storedStarred);
    hydrated.current = true;
  }, []);

  /* Persist on change (skip the initial hydration write-back) */
  useEffect(() => {
    if (hydrated.current) persistEntries(HISTORY_KEY, history.slice(0, historyLimit));
  }, [history, historyLimit]);

  useEffect(() => {
    if (hydrated.current) persistEntries(STARRED_KEY, starred);
  }, [starred]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(HISTORY_LIMIT_KEY, String(historyLimit));
  }, [historyLimit]);

  const setHistoryLimit = useCallback((value: number) => {
    const clamped = clampHistoryLimit(value);
    setHistoryLimitState(clamped);
    setHistory((prev) => prev.slice(0, clamped));
  }, []);

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
        normalizedProfile: normalizeProfileSnapshot(input),
        starred: false,
      };
      setHistory((prev) => [entry, ...prev].slice(0, historyLimit));
    },
    [historyLimit],
  );

  const toggleStar = useCallback((id: string) => {
    const sourceEntry = history.find((entry) => entry.id === id);

    setStarred((prev) => {
      if (prev.some((entry) => entry.id === id)) {
        return prev.filter((entry) => entry.id !== id);
      }
      if (!sourceEntry) return prev;
      return [{ ...sourceEntry, starred: true }, ...prev];
    });
  }, [history]);

  const removeStarred = useCallback((id: string) => {
    setStarred((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  return {
    history,
    starred,
    historyLimit,
    setHistoryLimit,
    addToHistory,
    toggleStar,
    removeStarred,
    clearHistory,
  };
}
