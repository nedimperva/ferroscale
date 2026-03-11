"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SavedEntry {
  id: string;
  timestamp: string;
  name: string;
  notes?: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
}

const SAVED_KEY = "ferroscale-saved-v1";

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseSavedReturn {
  saved: SavedEntry[];
  saveCalculation: (
    input: CalculationInput,
    result: CalculationResult,
    name: string,
    notes?: string,
  ) => void;
  removeSaved: (id: string) => void;
  updateSaved: (id: string, patch: { name?: string; notes?: string }) => void;
  isSaved: (result: CalculationResult) => boolean;
  getSavedEntry: (result: CalculationResult) => SavedEntry | undefined;
}

function makeFingerprint(result: CalculationResult): string {
  return `${result.profileLabel}|${result.grandTotalAmount}|${result.gradeLabel}|${result.totalWeightKg}`;
}

export function useSaved(): UseSavedReturn {
  const [saved, setSaved] = useState<SavedEntry[]>([]);

  /* Hydrate from localStorage on mount */
  const hydrated = useRef(false);
  useEffect(() => {
    const stored = loadArrayFromStorage<SavedEntry>(SAVED_KEY);
    if (stored.length > 0) setSaved(stored);
    hydrated.current = true;
  }, []);

  /* Persist on change */
  useEffect(() => {
    if (hydrated.current) persistToStorage(SAVED_KEY, saved);
  }, [saved]);

  const saveCalculation = useCallback(
    (
      input: CalculationInput,
      result: CalculationResult,
      name: string,
      notes?: string,
    ) => {
      const entry: SavedEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        name: name.trim() || result.profileLabel,
        notes: notes?.trim() || undefined,
        input,
        result,
        normalizedProfile: normalizeProfileSnapshot(input),
      };
      setSaved((prev) => [entry, ...prev]);
    },
    [],
  );

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateSaved = useCallback(
    (id: string, patch: { name?: string; notes?: string }) => {
      setSaved((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                ...(patch.name !== undefined ? { name: patch.name.trim() || e.name } : {}),
                ...(patch.notes !== undefined
                  ? { notes: patch.notes.trim() || undefined }
                  : {}),
              }
            : e,
        ),
      );
    },
    [],
  );

  const isSaved = useCallback(
    (result: CalculationResult) => {
      const fp = makeFingerprint(result);
      return saved.some((e) => makeFingerprint(e.result) === fp);
    },
    [saved],
  );

  const getSavedEntry = useCallback(
    (result: CalculationResult) => {
      const fp = makeFingerprint(result);
      return saved.find((e) => makeFingerprint(e.result) === fp);
    },
    [saved],
  );

  return { saved, saveCalculation, removeSaved, updateSaved, isSaved, getSavedEntry };
}
