"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { ProjectAdditionalCost, ProjectCategory } from "@/hooks/useProjects";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { savedFingerprint } from "@/lib/calculator/fingerprint";
import { getBuiltinLibraryEntries } from "@/lib/saved/builtins";
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
  /** Pinned entries sort ahead of everything else, in every sort mode. */
  pinned?: boolean;
  useCount: number;
  lastUsedAt?: string;
  updatedAt: string;
  /** Set when the entry was deliberately made an assembly; see isAssemblyEntry. */
  isAssembly?: boolean;
  /**
   * What a project inherits when this entry is inserted into one. These three
   * came from the separate template collection: a template was a multi-part
   * entry that also knew its trade, how long it takes to make and what
   * hardware it eats. Keeping them here is what let that collection go.
   */
  category?: ProjectCategory;
  laborHours?: number;
  additionalCosts?: ProjectAdditionalCost[];
  /**
   * One of the standards that ship with the app. Built-ins are merged in on
   * read rather than stored, so only a tombstone for one is ever persisted.
   */
  isBuiltin?: boolean;
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

/**
 * Is this entry an assembly?
 *
 * Part count used to be the whole answer, which made a one-part assembly
 * impossible to express — you could not start one and grow it, and removing
 * the second-to-last part silently turned an assembly back into a part. The
 * flag records the intent when there is one; everything saved before it, and
 * anything saved without deciding, still reads from the part count.
 */
export function isAssemblyEntry(entry: Pick<SavedEntry, "parts" | "isAssembly">): boolean {
  return entry.isAssembly ?? entry.parts.length > 1;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseSavedReturn {
  /** Everything the library lists: the standards, then the user's entries. */
  saved: SavedEntry[];
  /**
   * The user's own entries. Badges and counts read this — a rail showing 6
   * when you have saved one thing is a lie about your own work.
   */
  ownSaved: SavedEntry[];
  /** Returns the created entry so callers can offer "name it" right after. */
  saveCalculation: (
    input: CalculationInput,
    result: CalculationResult,
    name: string,
    notes?: string,
    tags?: string[],
    parts?: TemplatePartDraft[],
    asAssembly?: boolean,
  ) => SavedEntry;
  removeSaved: (id: string) => void;
  removeSavedMany: (ids: string[]) => void;
  /** Undo a delete: clears the tombstone so sync keeps the entry alive. */
  restoreSaved: (ids: string | string[]) => void;
  toggleSavedPinned: (id: string) => void;
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
  updateSaved: (
    id: string,
    patch: {
      name?: string;
      notes?: string;
      tags?: string[];
      pinned?: boolean;
      category?: SavedEntry["category"];
      laborHours?: number;
      additionalCosts?: SavedEntry["additionalCosts"];
    },
  ) => void;
  markSavedUsed: (id: string) => void;
  /** The standards the user has removed — listed so they can be put back. */
  removedBuiltins: SavedEntry[];
  restoreAllBuiltins: () => void;
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

  const builtins = useMemo(() => getBuiltinLibraryEntries(), []);

  /**
   * Built-ins are merged in on read, never stored. Removing one writes the
   * entry with a tombstone, so the id it carries is what suppresses it here —
   * a later build can change a standard's cuts without resurrecting one the
   * user threw away.
   */
  const removedBuiltinIds = useMemo(
    () => new Set(allSaved.filter((entry) => entry.deletedAt).map((entry) => entry.id)),
    [allSaved],
  );

  const saved = useMemo(
    () => [
      ...builtins.filter((entry) => !removedBuiltinIds.has(entry.id)),
      ...allSaved.filter((entry) => isActiveSyncEntity(entry)),
    ],
    [builtins, allSaved, removedBuiltinIds],
  );

  /**
   * The user's own entries. The three lookups behind the Save toggle read this
   * rather than `saved`: a line that happens to match a standard's first cut
   * is not "already saved", and pressing Save on it must not delete the
   * standard.
   */
  const ownEntries = useMemo(
    () => allSaved.filter((entry) => isActiveSyncEntity(entry)),
    [allSaved],
  );

  const removedBuiltins = useMemo(
    () => builtins.filter((entry) => removedBuiltinIds.has(entry.id)),
    [builtins, removedBuiltinIds],
  );

  const restoreAllBuiltins = useCallback(() => {
    setSavedWithPersist((previous) => previous.filter((entry) => !entry.isBuiltin));
  }, [setSavedWithPersist]);

  const saveCalculation = useCallback(
    (
      input: CalculationInput,
      result: CalculationResult,
      name: string,
      notes?: string,
      tags?: string[],
      parts?: TemplatePartDraft[],
      asAssembly?: boolean,
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
        isAssembly: asAssembly || undefined,
        input: finalParts[0].input,
        result: finalParts[0].result,
        normalizedProfile: finalParts[0].normalizedProfile,
      };
      setSavedWithPersist((previous) => [entry, ...previous]);
      return entry;
    },
    [setSavedWithPersist],
  );

  /**
   * A built-in has no row on disk until it is removed, so the tombstone is the
   * first thing written for it. Everything else is the usual soft delete.
   */
  const tombstoneFor = useCallback(
    (previous: SavedEntry[], id: string, deletedAt: string): SavedEntry[] => {
      if (previous.some((entry) => entry.id === id)) {
        return previous.map((entry) =>
          entry.id === id && !entry.deletedAt ? markEntityDeleted(entry, deletedAt) : entry,
        );
      }
      const builtin = builtins.find((entry) => entry.id === id);
      if (!builtin) return previous;
      return [...previous, markEntityDeleted(builtin, deletedAt)];
    },
    [builtins],
  );

  const removeSaved = useCallback(
    (id: string) => {
      const deletedAt = new Date().toISOString();
      setSavedWithPersist((previous) => tombstoneFor(previous, id, deletedAt));
    },
    [setSavedWithPersist, tombstoneFor],
  );

  const removeSavedMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const deletedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        ids.reduce((acc, id) => tombstoneFor(acc, id, deletedAt), previous),
      );
    },
    [setSavedWithPersist, tombstoneFor],
  );

  const restoreSaved = useCallback(
    (ids: string | string[]) => {
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      if (idSet.size === 0) return;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous
          // A built-in's only reason to be on disk was the tombstone, so
          // putting one back means dropping the row, not clearing a flag.
          .filter((entry) => !(idSet.has(entry.id) && entry.deletedAt && entry.isBuiltin))
          .map((entry) => (
            idSet.has(entry.id) && entry.deletedAt
              // updatedAt must beat the tombstone or a merge would re-delete it.
              ? { ...entry, deletedAt: undefined, updatedAt }
              : entry
          )),
      );
    },
    [setSavedWithPersist],
  );

  const toggleSavedPinned = useCallback(
    (id: string) => {
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => (
          entry.id === id && !entry.deletedAt
            ? { ...entry, pinned: !entry.pinned, updatedAt }
            : entry
        )),
      );
    },
    [setSavedWithPersist],
  );

  const duplicateSaved = useCallback(
    (id: string) => {
      const source = saved.find((entry) => entry.id === id);
      if (!source) return;
      setSavedWithPersist((previous) => {
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
          // A copy of a standard is the user's own entry, editable like any
          // other — that is the whole point of duplicating one.
          isBuiltin: undefined,
          parts: source.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
        };
        return [copy, ...previous];
      });
    },
    [saved, setSavedWithPersist],
  );

  const duplicateSavedMany = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setSavedWithPersist((previous) => {
          const byId = new Map(saved.map((entry) => [entry.id, entry]));
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
              isBuiltin: undefined,
              parts: source.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
            };
          });
        if (copies.length === 0) return previous;
        return [...copies, ...previous];
      });
    },
    [saved, setSavedWithPersist],
  );

  const updateSaved = useCallback(
    (
      id: string,
      patch: {
      name?: string;
      notes?: string;
      tags?: string[];
      pinned?: boolean;
      category?: SavedEntry["category"];
      laborHours?: number;
      additionalCosts?: SavedEntry["additionalCosts"];
    },
    ) => {
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) =>
          entry.id === id && !entry.deletedAt
            ? {
                ...entry,
                ...(patch.name !== undefined ? { name: patch.name.trim() || entry.name } : {}),
                ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
                ...(patch.notes !== undefined ? { notes: patch.notes.trim() || undefined } : {}),
                ...(patch.tags !== undefined
                  ? {
                      tags: patch.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
                    }
                  : {}),
                ...(patch.category !== undefined ? { category: patch.category } : {}),
                ...(patch.laborHours !== undefined
                  ? { laborHours: patch.laborHours > 0 ? patch.laborHours : undefined }
                  : {}),
                ...(patch.additionalCosts !== undefined
                  ? {
                      additionalCosts: patch.additionalCosts?.length
                        ? patch.additionalCosts
                        : undefined,
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

  /**
   * Whether the append applied has to be decided BEFORE dispatching: React
   * defers a state updater to the next render, so a flag assigned inside one
   * is still false when the caller reads it. Callers use this to decide
   * whether to confirm, so it has to be the truth.
   */
  const addPartToSaved = useCallback(
    (
      id: string,
      input: CalculationInput,
      result: CalculationResult,
      partName?: string,
    ) => {
      if (!allSaved.some((entry) => entry.id === id && !entry.deletedAt)) return false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          const nextPart = createSavedPart(partName ?? result.profileLabel, input, result);
          return {
            ...entry,
            updatedAt,
            // Adding a cut to a part is how you say "this is an assembly".
            // Recording the intent keeps it one after a part is removed again.
            isAssembly: true,
            parts: [...entry.parts, nextPart],
          };
        }),
      );
      return true;
    },
    [allSaved, setSavedWithPersist],
  );

  const appendPartsToSaved = useCallback(
    (id: string, parts: TemplatePartDraft[]) => {
      if (parts.length === 0) return false;
      if (!allSaved.some((entry) => entry.id === id && !entry.deletedAt)) return false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          const normalizedParts = parts.map((part) => createSavedPart(part.name, part.input, part.result));
          return {
            ...entry,
            updatedAt,
            isAssembly: true,
            parts: [...entry.parts, ...normalizedParts],
          };
        }),
      );
      return true;
    },
    [allSaved, setSavedWithPersist],
  );

  const removePartFromSaved = useCallback(
    (id: string, partId: string) => {
      const target = allSaved.find((entry) => entry.id === id && !entry.deletedAt);
      // The last part is the entry, so it cannot be removed from it.
      if (!target || target.parts.length <= 1) return false;
      if (!target.parts.some((part) => part.id === partId)) return false;
      const updatedAt = new Date().toISOString();
      setSavedWithPersist((previous) =>
        previous.map((entry) => {
          if (entry.id !== id || entry.deletedAt) return entry;
          if (entry.parts.length <= 1) return entry;
          const nextParts = entry.parts.filter((part) => part.id !== partId);
          if (nextParts.length === entry.parts.length) return entry;
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
      return true;
    },
    [allSaved, setSavedWithPersist],
  );

  const reorderPartInSaved = useCallback(
    (id: string, partId: string, direction: -1 | 1) => {
      const target = allSaved.find((entry) => entry.id === id && !entry.deletedAt);
      if (!target) return false;
      const index = target.parts.findIndex((part) => part.id === partId);
      // Nothing to do at either end of the list.
      if (index < 0) return false;
      if (index + direction < 0 || index + direction >= target.parts.length) return false;
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
      return true;
    },
    [allSaved, setSavedWithPersist],
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
      const fp = savedFingerprint(result);
      return ownEntries.some((entry) => savedFingerprint(entry.result) === fp);
    },
    [ownEntries],
  );

  const getSavedCount = useCallback(
    (result: CalculationResult) => {
      const fp = savedFingerprint(result);
      return ownEntries.filter((entry) => savedFingerprint(entry.result) === fp).length;
    },
    [ownEntries],
  );

  const getSavedEntry = useCallback(
    (result: CalculationResult) => {
      const fp = savedFingerprint(result);
      return ownEntries.find((entry) => savedFingerprint(entry.result) === fp);
    },
    [ownEntries],
  );

  return {
    saved,
    ownSaved: ownEntries,
    saveCalculation,
    removeSaved,
    removeSavedMany,
    restoreSaved,
    toggleSavedPinned,
    duplicateSaved,
    duplicateSavedMany,
    addPartToSaved,
    appendPartsToSaved,
    removePartFromSaved,
    reorderPartInSaved,
    updateSaved,
    markSavedUsed,
    removedBuiltins,
    restoreAllBuiltins,
    isSaved,
    getSavedCount,
    getSavedEntry,
  };
}
