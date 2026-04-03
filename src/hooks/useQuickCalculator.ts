"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calculateQuickFromQuery } from "@ferroscale/metal-core";
import type { QuickWeightResult, QuickParseIssue } from "@ferroscale/metal-core";
import { loadQuickHistory, persistQuickHistory } from "@/lib/sync/collections";

const MAX_QUICK_HISTORY = 20;

export interface QuickLineResult {
  line: string;
  result?: QuickWeightResult;
  issues?: QuickParseIssue[];
}

export interface UseQuickCalculatorReturn {
  query: string;
  setQuery: (q: string) => void;
  lineResults: QuickLineResult[];
  totalWeightKg: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  recentQueries: string[];
  clearHistory: () => void;
}

export function useQuickCalculator(): UseQuickCalculatorReturn {
  const [query, setQuery] = useState("");
  const [lineResults, setLineResults] = useState<QuickLineResult[]>([]);
  const [totalWeightKg, setTotalWeightKg] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate recent queries from localStorage
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from storage
    setRecentQueries(loadQuickHistory());
  }, []);

  // Debounced calculation on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced calculation result
      setLineResults([]);
      setTotalWeightKg(0);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const lines = query.split("\n").filter((l) => l.trim());
      const results: QuickLineResult[] = [];
      let total = 0;

      for (const line of lines) {
        const response = calculateQuickFromQuery(line.trim());
        if (response.ok) {
          results.push({ line, result: response.result });
          total += response.result.totalWeightKg;
        } else {
          results.push({ line, issues: response.issues });
        }
      }

      setLineResults(results);
      setTotalWeightKg(Math.round(total * 1000) / 1000);
    }, 100);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const saveToHistory = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentQueries((prev) => {
      const deduped = prev.filter((item) => item !== trimmed);
      const next = [trimmed, ...deduped].slice(0, MAX_QUICK_HISTORY);
      persistQuickHistory(next);
      return next;
    });
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    if (query.trim() && lineResults.some((lr) => lr.result)) {
      saveToHistory(query.trim());
    }
    setIsOpen(false);
    setQuery("");
    setLineResults([]);
    setTotalWeightKg(0);
  }, [query, lineResults, saveToHistory]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const clearHistory = useCallback(() => {
    setRecentQueries([]);
    persistQuickHistory([]);
  }, []);

  return {
    query,
    setQuery,
    lineResults,
    totalWeightKg,
    isOpen,
    open,
    close,
    toggle,
    recentQueries,
    clearHistory,
  };
}
