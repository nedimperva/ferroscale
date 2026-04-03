"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { fingerprint } from "@/lib/calculator/fingerprint";
import {
  createSavedPart,
  isActiveSyncEntity,
  loadSavedEntries,
  markEntityDeleted,
  persistSavedEntries,
} from "@/lib/sync/collections";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SavedEntry {
  id: string;
  timestamp: string;
  name: string;
  notes?: string;
  tags?: string[];
  useCount: number;
  lastUsedAt?: string;
  updatedAt: string;
  deletedAt?: string;
  parts: TemplatePart[];
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
}

export interface TemplatePart {
  id: string;
  name: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile: NormalizedProfileSnapshot;
}

export interface TemplatePartDraft {
  name: string;
  input: CalculationInput;
  result: CalculationResult;
}

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
    tags?: string[],
    parts?: TemplatePartDraft[],
  ) => void;
  removeSaved: (id: string) => void;
  removeSavedMany: (ids: string[]) => void;
  duplicateSaved: (id: string) => void;
  duplicateSavedMany: (ids: string[]) => void;
  addPartToSaved: (
    id: string,
    input: CalculationInput,
    result: CalculationResult,
    partName?: string,
  ) => boolean;
  appendPartsToSaved: (id: string, parts: TemplatePartDraft[]) => boolean;
  removePartFromSaved: (id: string, partId: string) => boolean;
  reorderPartInSaved: (id: string, partId: string, direction: -1 | 1) => boolean;
  updateSaved: (id: string, patch: { name?: string; notes?: string; tags?: string[] }) => void;
  markSavedUsed: (id: string) => void;
  isSaved: (result: CalculationResult) => boolean;
  getSavedCount: (result: CalculationResult) => number;
  getSavedEntry: (result: CalculationResult) => SavedEntry | undefined;
}

export function useSaved(): UseSavedReturn {
  const [allSaved, setAllSaved] = useState<SavedEntry[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    setAllSaved(loadSavedEntries()); // eslint-disable-line react-hooks/set-state-in-effect
    hydrated.current = true;
  }, []);

  const setSavedWithPersist: React.Dispatch<React.SetStateAction<SavedEntry[]>> = useCallback(
    (action) => {
      setAllSaved((previous) => {
        const next = typeof action === "function"
          ? (action as (prev: SavedEntry[]) => SavedEntry[])(previous)
          : action;
        if (hydrated.current) persistSavedEntries(next);
        return next;
      });
    },
    [],
  );

  const saved = useMemo(
    () => allSaved.filter((entry) => isActiveSyncEntity(entry)),
    [allSaved],
  );

  const saveCalculation = useCallback(
    (
      input: CalculationInput,
      result: CalculationResult,
      name: string,
      notes?: string,
      tags?: string[],
      parts?: TemplatePartDraft[],
    ) => {
      const timestamp = new Date().toISOString();
      const normalizedParts = (parts ?? [])
        .map((part) => createSavedPart(part.name, part.input, part.result))
        .filter((part) => Boolean(part.input) && Boolean(part.result));

      const defaultPart = createSavedPart(result.profileLabel, input, result);
      const finalParts = normalizedParts.length > 0 ? normalizedParts : [defaultPart];

      const entry: SavedEntry = {
        id: crypto.randomUUID(),
        timestamp,
        name: name.trim() || result.profileLabel,
        notes: notes?.trim() || undefined,
        tags: tags?.map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
        useCount: 0,
        updatedAt: timestamp,
        parts: finalParts,
        input: finalParts[0].input,
        result: finalParts[0].result,
        normalizedProfile: finalParts[0].normalizedProfile,
      };
      setSavedWithPersist((previous) => [entry, ...previous]);
    },
    [setSavedWithPersist],
  );

  const removeSaved = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    setSavedWithPersist((previous) =>
      previous.map((entry) => (
        entry.id === id && !entry.deletedAt ? markEntityDeleted(entry, deletedAt) : entry
      )),
    );
  }, [setSavedWithPersist]);

  const removeSavedMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const deletedAt = new Date().toISOString();
      const idSet = new Set(ids);
      setSavedWithPersist((previous) =>
        previous.map((entry) => (
          idSet.has(entry.id) && !entry.deletedAt ? markEntityDeleted(entry, deletedAt) : entry
        )),
      );
    },
    [setSavedWithPersist],
  );

  const duplicateSaved = useCallback(
    (id: string) => {
      setSavedWithPersist((previous) => {
        const source = previous.find((entry) => entry.id === id && !entry.deletedAt);
        if (!source) return previous;
        const timestamp = new Date().toISOString();
        const copy: SavedEntry = {
          ...source,
          id: crypto.randomUUID(),
          timestamp,
          updatedAt: timestamp,
          deletedAt: undefined,
          name: `${source.name} (Copy)`,
          useCount: 0,
          lastUsedAt: undefined,
          parts: source.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
        };
        return [copy, ...previous];
      });
    },
    [setSavedWithPersist],
  );

  const duplicateSavedMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setSavedWithPersist((previous) => {
        const byId = new Map(previous.filter((entry) => !entry.deletedAt).map((entry) => [entry.id, entry]));
        const copies = ids
          .map((id) => byId.get(id))
          .filter((entry): entry is SavedEntry => Boolean(entry))
          .map((source) => {
            const timestamp = new Date().toISOString();
            return {
              ...source,
              id: crypto.randomUUID(),
              timestamp,
              updatedAt: timestamp,
              deletedAt: undefined,
              name: `${source.name} (Copy)`,
              useCount: 0,
              lastUsedAt: undefined,
              parts: source.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
            };
          });
        if (copies.length === 0) return previous;
        return [...copies, ...previous];
      });
    },
    [setSavedWithPersist],
  );

  const updateSaved = useCallback(
    (id: string, patch: { name?: string; notes?: string; tags?: string[] }) => {
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) =>
          entry.id === id && !entry.deletedAt
            ? {
                ...entry,
                ...(patch.name !== undefined ? { name: patch.name.trim() || entry.name } : {}),
                ...(patch.notes !== undefined ? { notes: patch.notes.trim() || undefined } : {}),
                ...(patch.tags !== undefined
                  ? {
                      tags: patch.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
                    }
                  : {}),
                updatedAt,
              }
            : entry,
        ),
      );
    },
    [setSavedWithPersist],
  );

  const addPartToSaved = useCallback(
    (
      id: string,
      input: CalculationInput,
      result: CalculationResult,
      partName?: string,
    ) => {
      let added = false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          const nextPart = createSavedPart(partName ?? result.profileLabel, input, result);
          added = true;
          return {
            ...entry,
            updatedAt,
            parts: [...entry.parts, nextPart],
          };
        }),
      );
      return added;
    },
    [setSavedWithPersist],
  );

  const appendPartsToSaved = useCallback(
    (id: string, parts: TemplatePartDraft[]) => {
      if (parts.length === 0) return false;
      let appended = false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          const normalizedParts = parts.map((part) => createSavedPart(part.name, part.input, part.result));
          appended = normalizedParts.length > 0;
          return appended
            ? { ...entry, updatedAt, parts: [...entry.parts, ...normalizedParts] }
            : entry;
        }),
      );
      return appended;
    },
    [setSavedWithPersist],
  );

  const removePartFromSaved = useCallback(
    (id: string, partId: string) => {
      let removed = false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          if (entry.parts.length <= 1) return entry;
          const nextParts = entry.parts.filter((part) => part.id !== partId);
          if (nextParts.length === entry.parts.length) return entry;
          removed = true;
          return {
            ...entry,
            updatedAt,
            parts: nextParts,
            input: nextParts[0].input,
            result: nextParts[0].result,
            normalizedProfile: nextParts[0].normalizedProfile,
          };
        }),
      );
      return removed;
    },
    [setSavedWithPersist],
  );

  const reorderPartInSaved = useCallback(
    (id: string, partId: string, direction: -1 | 1) => {
      let changed = false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          const currentIndex = entry.parts.findIndex((part) => part.id === partId);
          if (currentIndex < 0) return entry;
          const nextIndex = currentIndex + direction;
          if (nextIndex < 0 || nextIndex >= entry.parts.length) return entry;

          const nextParts = [...entry.parts];
          const [moved] = nextParts.splice(currentIndex, 1);
          nextParts.splice(nextIndex, 0, moved);
          changed = true;
          return {
            ...entry,
            updatedAt,
            parts: nextParts,
            input: nextParts[0].input,
            result: nextParts[0].result,
            normalizedProfile: nextParts[0].normalizedProfile,
          };
        }),
      );
      return changed;
    },
    [setSavedWithPersist],
  );

  const markSavedUsed = useCallback(
    (id: string) => {
      const usedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) =>
          entry.id === id && !entry.deletedAt
            ? { ...entry, useCount: entry.useCount + 1, lastUsedAt: usedAt, updatedAt: usedAt }
            : entry,
        ),
      );
    },
    [setSavedWithPersist],
  );

  const isSaved = useCallback(
    (result: CalculationResult) => {
      const fp = fingerprint(result);
      return saved.some((entry) => fingerprint(entry.result) === fp);
    },
    [saved],
  );

  const getSavedCount = useCallback(
    (result: CalculationResult) => {
      const fp = fingerprint(result);
      return saved.filter((entry) => fingerprint(entry.result) === fp).length;
    },
    [saved],
  );

  const getSavedEntry = useCallback(
    (result: CalculationResult) => {
      const fp = fingerprint(result);
      return saved.find((entry) => fingerprint(entry.result) === fp);
    },
    [saved],
  );

  return {
    saved,
    saveCalculation,
    removeSaved,
    removeSavedMany,
    duplicateSaved,
    duplicateSavedMany,
    addPartToSaved,
    appendPartsToSaved,
    removePartFromSaved,
    reorderPartInSaved,
    updateSaved,
    markSavedUsed,
    isSaved,
    getSavedCount,
    getSavedEntry,
  };
}
