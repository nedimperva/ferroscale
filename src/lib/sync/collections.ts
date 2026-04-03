"use client";

import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import type { CompareItem } from "@/hooks/useCompare";
import type { DimensionPreset } from "@/hooks/usePresets";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry, TemplatePart } from "@/hooks/useSaved";
import { SYNC_COLLECTION_UPDATED_AT_KEYS, SYNC_STORAGE_KEYS } from "./keys";
import { notifySyncedCollectionDirty } from "./registry";
import type { SyncEntityCollectionKey, SyncListCollectionKey, SyncEntityRecord } from "./types";

interface PersistOptions {
  markDirty?: boolean;
  updatedAt?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readListUpdatedAt(key: SyncListCollectionKey): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  const raw = localStorage.getItem(SYNC_COLLECTION_UPDATED_AT_KEYS[key]);
  return raw?.trim() || new Date(0).toISOString();
}

function writeListUpdatedAt(key: SyncListCollectionKey, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYNC_COLLECTION_UPDATED_AT_KEYS[key], value);
  } catch {
    // noop
  }
}

function maybeNotify(collectionKey: SyncEntityCollectionKey | SyncListCollectionKey, shouldMarkDirty = true): void {
  if (!shouldMarkDirty) return;
  queueMicrotask(() => {
    notifySyncedCollectionDirty(collectionKey);
  });
}

function normalizeTemplatePart(raw: unknown): TemplatePart | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<TemplatePart>;
  if (!candidate.input || !candidate.result) return null;
  return {
    id: candidate.id ?? crypto.randomUUID(),
    name: candidate.name?.trim() || candidate.result.profileLabel,
    input: candidate.input,
    result: candidate.result,
    normalizedProfile: candidate.normalizedProfile ?? normalizeProfileSnapshot(candidate.input),
  };
}

function normalizeSavedEntry(raw: unknown): SavedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SavedEntry>;
  if (!candidate.id || !candidate.timestamp || !candidate.name || !candidate.input || !candidate.result) {
    return null;
  }

  const normalizedParts = Array.isArray(candidate.parts)
    ? candidate.parts
        .map((part) => normalizeTemplatePart(part))
        .filter((part): part is TemplatePart => Boolean(part))
    : [];

  const fallbackPart: TemplatePart = {
    id: crypto.randomUUID(),
    name: candidate.result.profileLabel,
    input: candidate.input,
    result: candidate.result,
    normalizedProfile: candidate.normalizedProfile ?? normalizeProfileSnapshot(candidate.input),
  };

  const parts = normalizedParts.length > 0 ? normalizedParts : [fallbackPart];
  return {
    id: candidate.id,
    timestamp: candidate.timestamp,
    name: candidate.name,
    notes: candidate.notes?.trim() || undefined,
    tags: Array.isArray(candidate.tags)
      ? candidate.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
      : undefined,
    useCount: Math.max(0, Number(candidate.useCount ?? 0) || 0),
    lastUsedAt: candidate.lastUsedAt,
    updatedAt: candidate.updatedAt ?? candidate.lastUsedAt ?? candidate.timestamp,
    deletedAt: candidate.deletedAt,
    parts,
    input: parts[0].input,
    result: parts[0].result,
    normalizedProfile: parts[0].normalizedProfile,
  };
}

function normalizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<Project>;
  if (!candidate.id || !candidate.name || !candidate.createdAt || !candidate.updatedAt || !Array.isArray(candidate.calculations)) {
    return null;
  }
  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description?.trim() || undefined,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    deletedAt: candidate.deletedAt,
    calculations: candidate.calculations,
    paintingPricePerKg: candidate.paintingPricePerKg,
    paintingCoverageM2PerKg: candidate.paintingCoverageM2PerKg,
    paintingCoats: candidate.paintingCoats,
  };
}

function normalizePreset(raw: unknown): DimensionPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<DimensionPreset>;
  if (!candidate.id || !candidate.profileId || !candidate.label || !candidate.createdAt) {
    return null;
  }
  return {
    id: candidate.id,
    profileId: candidate.profileId,
    label: candidate.label,
    manualDimensionsMm: candidate.manualDimensionsMm ?? {},
    selectedSizeId: candidate.selectedSizeId,
    lengthValue: candidate.lengthValue,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt ?? new Date(candidate.createdAt).toISOString(),
    deletedAt: candidate.deletedAt,
  };
}

function normalizeCompareItem(raw: unknown): CompareItem | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<CompareItem>;
  if (!candidate.id || !candidate.timestamp || !candidate.input || !candidate.result) return null;
  return {
    id: candidate.id,
    timestamp: candidate.timestamp,
    input: candidate.input,
    result: candidate.result,
    normalizedProfile: candidate.normalizedProfile ?? normalizeProfileSnapshot(candidate.input),
  };
}

export function normalizeSavedEntries(entries: unknown[]): SavedEntry[] {
  return entries
    .map((entry) => normalizeSavedEntry(entry))
    .filter((entry): entry is SavedEntry => Boolean(entry));
}

export function normalizeProjects(entries: unknown[]): Project[] {
  return entries
    .map((entry) => normalizeProject(entry))
    .filter((entry): entry is Project => Boolean(entry));
}

export function normalizePresets(entries: unknown[]): DimensionPreset[] {
  return entries
    .map((entry) => normalizePreset(entry))
    .filter((entry): entry is DimensionPreset => Boolean(entry));
}

export function normalizeCompareItems(entries: unknown[]): CompareItem[] {
  return entries
    .map((entry) => normalizeCompareItem(entry))
    .filter((entry): entry is CompareItem => Boolean(entry));
}

export function isActiveSyncEntity<T extends SyncEntityRecord>(entity: T): boolean {
  return !entity.deletedAt;
}

export function loadSavedEntries(): SavedEntry[] {
  const next = normalizeSavedEntries(loadArrayFromStorage<unknown>(SYNC_STORAGE_KEYS.saved));
  if (next.length > 0) return next;
  return normalizeSavedEntries(loadArrayFromStorage<unknown>(SYNC_STORAGE_KEYS.savedLegacy));
}

export function persistSavedEntries(entries: SavedEntry[], options?: PersistOptions): void {
  persistToStorage(SYNC_STORAGE_KEYS.saved, entries);
  maybeNotify("saved", options?.markDirty ?? true);
}

export function loadProjects(): Project[] {
  return normalizeProjects(loadArrayFromStorage<unknown>(SYNC_STORAGE_KEYS.projects));
}

export function persistProjects(entries: Project[], options?: PersistOptions): void {
  persistToStorage(SYNC_STORAGE_KEYS.projects, entries);
  maybeNotify("projects", options?.markDirty ?? true);
}

export function loadPresets(): DimensionPreset[] {
  return normalizePresets(loadArrayFromStorage<unknown>(SYNC_STORAGE_KEYS.presets));
}

export function persistPresets(entries: DimensionPreset[], options?: PersistOptions): void {
  persistToStorage(SYNC_STORAGE_KEYS.presets, entries);
  maybeNotify("presets", options?.markDirty ?? true);
}

export function loadCompareItems(): CompareItem[] {
  return normalizeCompareItems(loadArrayFromStorage<unknown>(SYNC_STORAGE_KEYS.compare));
}

export function getCompareUpdatedAt(): string {
  const stored = readListUpdatedAt("compare");
  if (stored !== new Date(0).toISOString()) return stored;
  const items = loadCompareItems();
  const derived = items.reduce((latest, item) => (item.timestamp > latest ? item.timestamp : latest), stored);
  return derived;
}

export function persistCompareItems(items: CompareItem[], options?: PersistOptions): void {
  const updatedAt = options?.updatedAt ?? nowIso();
  persistToStorage(SYNC_STORAGE_KEYS.compare, items);
  writeListUpdatedAt("compare", updatedAt);
  maybeNotify("compare", options?.markDirty ?? true);
}

export function loadQuickHistory(): string[] {
  return loadArrayFromStorage<string>(SYNC_STORAGE_KEYS.quickHistory).filter((entry) => typeof entry === "string" && entry.trim().length > 0);
}

export function getQuickHistoryUpdatedAt(): string {
  const stored = readListUpdatedAt("quickHistory");
  if (stored !== new Date(0).toISOString()) return stored;
  if (loadQuickHistory().length === 0) return stored;

  // Initialize a stable timestamp once for existing legacy history entries.
  const initialized = nowIso();
  writeListUpdatedAt("quickHistory", initialized);
  return initialized;
}

export function persistQuickHistory(items: string[], options?: PersistOptions): void {
  const updatedAt = options?.updatedAt ?? nowIso();
  persistToStorage(SYNC_STORAGE_KEYS.quickHistory, items);
  writeListUpdatedAt("quickHistory", updatedAt);
  maybeNotify("quickHistory", options?.markDirty ?? true);
}

export function stampEntityUpdate<T extends SyncEntityRecord>(entity: Omit<T, "updatedAt"> & Partial<Pick<T, "updatedAt">>, updatedAt = nowIso()): T {
  return {
    ...entity,
    updatedAt,
  } as T;
}

export function markEntityDeleted<T extends SyncEntityRecord>(entity: T, deletedAt = nowIso()): T {
  return {
    ...entity,
    updatedAt: deletedAt,
    deletedAt,
  };
}

export function createSavedPart(
  name: string,
  input: CalculationInput,
  result: CalculationResult,
): TemplatePart {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || result.profileLabel,
    input,
    result,
    normalizedProfile: normalizeProfileSnapshot(input),
  };
}
