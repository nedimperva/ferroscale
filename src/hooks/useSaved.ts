"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { fingerprint } from "@/lib/calculator/fingerprint";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";

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

interface LegacySavedEntry {
  id: string;
  timestamp: string;
  name: string;
  notes?: string;
  input: CalculationInput;
  result: CalculationResult;
  normalizedProfile?: NormalizedProfileSnapshot;
  parts?: Array<{
    id?: string;
    name?: string;
    input?: CalculationInput;
    result?: CalculationResult;
    normalizedProfile?: NormalizedProfileSnapshot;
  }>;
}

const SAVED_KEY_V1 = "ferroscale-saved-v1";
const SAVED_KEY_V2 = "ferroscale-saved-v2";

function normalizeEntry(raw: unknown): SavedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SavedEntry & LegacySavedEntry>;
  if (!candidate.id || !candidate.timestamp || !candidate.name || !candidate.input || !candidate.result) {
    return null;
  }

  const legacyParts = Array.isArray(candidate.parts)
    ? candidate.parts
        .map((part) => {
          if (!part?.input || !part?.result) return null;
          return {
            id: part.id ?? crypto.randomUUID(),
            name: part.name?.trim() || part.result.profileLabel,
            input: part.input,
            result: part.result,
            normalizedProfile: part.normalizedProfile ?? normalizeProfileSnapshot(part.input),
          } satisfies TemplatePart;
        })
        .filter((part): part is TemplatePart => Boolean(part))
    : [];

  const fallbackPart: TemplatePart = {
    id: crypto.randomUUID(),
    name: candidate.result.profileLabel,
    input: candidate.input,
    result: candidate.result,
    normalizedProfile: candidate.normalizedProfile ?? normalizeProfileSnapshot(candidate.input),
  };

  const parts = legacyParts.length > 0 ? legacyParts : [fallbackPart];
  const primaryPart = parts[0];

  return {
    id: candidate.id,
    timestamp: candidate.timestamp,
    name: candidate.name,
    notes: candidate.notes?.trim() || undefined,
    tags: Array.isArray(candidate.tags)
      ? candidate.tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
          .slice(0, 8)
      : undefined,
    useCount: Math.max(0, Number(candidate.useCount ?? 0) || 0),
    lastUsedAt: candidate.lastUsedAt,
    parts,
    input: primaryPart.input,
    result: primaryPart.result,
    normalizedProfile: primaryPart.normalizedProfile,
  };
}

function normalizeArray(entries: unknown[]): SavedEntry[] {
  return entries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is SavedEntry => entry !== null);
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
  const [saved, setSaved] = useState<SavedEntry[]>(() => {
    if (typeof window === "undefined") return [];
    const v2Entries = normalizeArray(loadArrayFromStorage<unknown>(SAVED_KEY_V2));
    if (v2Entries.length > 0) return v2Entries;
    return normalizeArray(loadArrayFromStorage<unknown>(SAVED_KEY_V1));
  });
  const hydrated = useRef(false);

  useEffect(() => {
    const v2Entries = normalizeArray(loadArrayFromStorage<unknown>(SAVED_KEY_V2));
    if (v2Entries.length === 0 && saved.length > 0) {
      persistToStorage(SAVED_KEY_V2, saved);
    }
    hydrated.current = true;
  }, [saved]);

  const setSavedWithPersist: React.Dispatch<React.SetStateAction<SavedEntry[]>> = useCallback(
    (action) => {
      setSaved((prev) => {
        const next = typeof action === "function" ? (action as (prev: SavedEntry[]) => SavedEntry[])(prev) : action;
        if (hydrated.current) persistToStorage(SAVED_KEY_V2, next);
        return next;
      });
    },
    [],
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
      const normalizedParts: TemplatePart[] = (parts ?? [])
        .map((part) => ({
          id: crypto.randomUUID(),
          name: part.name.trim() || part.result.profileLabel,
          input: part.input,
          result: part.result,
          normalizedProfile: normalizeProfileSnapshot(part.input),
        }))
        .filter((part) => Boolean(part.input) && Boolean(part.result));

      const defaultPart: TemplatePart = {
        id: crypto.randomUUID(),
        name: result.profileLabel,
        input,
        result,
        normalizedProfile: normalizeProfileSnapshot(input),
      };

      const finalParts = normalizedParts.length > 0 ? normalizedParts : [defaultPart];

      const entry: SavedEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        name: name.trim() || result.profileLabel,
        notes: notes?.trim() || undefined,
        tags: tags
          ?.map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8),
        useCount: 0,
        parts: finalParts,
        input: finalParts[0].input,
        result: finalParts[0].result,
        normalizedProfile: finalParts[0].normalizedProfile,
      };
      setSavedWithPersist((prev) => [entry, ...prev]);
    },
    [setSavedWithPersist],
  );

  const removeSaved = useCallback((id: string) => {
    setSavedWithPersist((prev) => prev.filter((e) => e.id !== id));
  }, [setSavedWithPersist]);

  const removeSavedMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setSavedWithPersist((prev) => prev.filter((entry) => !idSet.has(entry.id)));
    },
    [setSavedWithPersist],
  );

  const duplicateSaved = useCallback(
    (id: string) => {
      setSavedWithPersist((prev) => {
        const source = prev.find((entry) => entry.id === id);
        if (!source) return prev;
        const copy: SavedEntry = {
          ...source,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          name: `${source.name} (Copy)`,
          useCount: 0,
          lastUsedAt: undefined,
          parts: source.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
        };
        return [copy, ...prev];
      });
    },
    [setSavedWithPersist],
  );

  const duplicateSavedMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const byId = new Map<string, SavedEntry>();
      setSavedWithPersist((prev) => {
        for (const entry of prev) byId.set(entry.id, entry);
        const copies = ids
          .map((id) => byId.get(id))
          .filter((entry): entry is SavedEntry => Boolean(entry))
          .map((source) => ({
            ...source,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            name: `${source.name} (Copy)`,
            useCount: 0,
            lastUsedAt: undefined,
            parts: source.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
          }));
        if (copies.length === 0) return prev;
        return [...copies, ...prev];
      });
    },
    [setSavedWithPersist],
  );

  const updateSaved = useCallback(
    (id: string, patch: { name?: string; notes?: string; tags?: string[] }) => {
      setSavedWithPersist((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                ...(patch.name !== undefined ? { name: patch.name.trim() || e.name } : {}),
                ...(patch.notes !== undefined
                  ? { notes: patch.notes.trim() || undefined }
                  : {}),
                ...(patch.tags !== undefined
                  ? {
                      tags: patch.tags
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                        .slice(0, 8),
                    }
                  : {}),
              }
            : e,
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
      setSavedWithPersist((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          const nextPart: TemplatePart = {
            id: crypto.randomUUID(),
            name: partName?.trim() || result.profileLabel,
            input,
            result,
            normalizedProfile: normalizeProfileSnapshot(input),
          };
          added = true;
          return {
            ...entry,
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
      setSavedWithPersist((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          const normalizedParts = parts.map((part) => ({
            id: crypto.randomUUID(),
            name: part.name.trim() || part.result.profileLabel,
            input: part.input,
            result: part.result,
            normalizedProfile: normalizeProfileSnapshot(part.input),
          }));
          appended = normalizedParts.length > 0;
          return appended
            ? { ...entry, parts: [...entry.parts, ...normalizedParts] }
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
      setSavedWithPersist((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          if (entry.parts.length <= 1) return entry;
          const nextParts = entry.parts.filter((part) => part.id !== partId);
          if (nextParts.length === entry.parts.length) return entry;
          removed = true;
          return {
            ...entry,
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
      setSavedWithPersist((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
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
      setSavedWithPersist((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? { ...entry, useCount: entry.useCount + 1, lastUsedAt: usedAt }
            : entry,
        ),
      );
    },
    [setSavedWithPersist],
  );

  const isSaved = useCallback(
    (result: CalculationResult) => {
      const fp = fingerprint(result);
      return saved.some((e) => fingerprint(e.result) === fp);
    },
    [saved],
  );

  const getSavedCount = useCallback(
    (result: CalculationResult) => {
      const fp = fingerprint(result);
      return saved.filter((e) => fingerprint(e.result) === fp).length;
    },
    [saved],
  );

  const getSavedEntry = useCallback(
    (result: CalculationResult) => {
      const fp = fingerprint(result);
      return saved.find((e) => fingerprint(e.result) === fp);
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
