import {
  getCompareUpdatedAt,
  getPriceBookUpdatedAt,
  getQuickHistoryUpdatedAt,
  loadCompareItems,
  loadPresets,
  loadPriceBook,
  loadProjects,
  loadQuickHistory,
  loadSavedEntries,
  normalizeProject,
  normalizeSavedEntry,
  persistCompareItems,
  persistPresets,
  persistPriceBook,
  persistProjects,
  persistQuickHistory,
  persistSavedEntries,
} from "@/lib/sync/collections";
import {
  mergeEntityPayload,
  mergeListPayload,
} from "@/lib/sync/snapshot";
import type {
  PriceBookEntry,
  SavedEntry,
  SyncCompareItem,
} from "@/lib/sync/types";
import type { Project } from "@/hooks/useProjects";
import type { SizePreset } from "@/lib/saved/size-presets";
import {
  defaultPaintCoverageStore,
  defaultPaintPriceStore,
  defaultUnitStore,
  hapticsStore,
  marginPercentStore,
  massTolerancePercentStore,
  sharedCalcSettingsStore,
  weightAsMainStore,
  type SharedCalcSettings,
} from "@/lib/settings-stores";
import type { LengthUnit } from "@/lib/calculator/types";
import { downloadBlob } from "@/lib/csv-utils";

export interface FerroscaleBackupData {
  saved: SavedEntry[];
  projects: Project[];
  presets: SizePreset[];
  compare: {
    updatedAt: string;
    items: SyncCompareItem[];
  };
  quickHistory: {
    updatedAt: string;
    items: string[];
  };
  priceBook: {
    updatedAt: string;
    items: PriceBookEntry[];
  };
  settings: {
    weightAsMain?: boolean;
    haptics?: boolean;
    marginPercent?: number;
    massTolerancePercent?: number;
    defaultUnit?: LengthUnit;
    defaultPaintPrice?: number;
    defaultPaintCoverage?: number;
    sharedCalcSettings?: Partial<SharedCalcSettings>;
  };
}

export interface FerroscaleBackupFile {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  data: FerroscaleBackupData;
}

export function buildBackupFile(appVersion = "3.22.0"): FerroscaleBackupFile {
  const exportedAt = new Date().toISOString();

  return {
    schemaVersion: 1,
    exportedAt,
    appVersion,
    data: {
      saved: loadSavedEntries(),
      projects: loadProjects(),
      presets: loadPresets(),
      compare: {
        updatedAt: getCompareUpdatedAt(),
        items: loadCompareItems(),
      },
      quickHistory: {
        updatedAt: getQuickHistoryUpdatedAt(),
        items: loadQuickHistory(),
      },
      priceBook: {
        updatedAt: getPriceBookUpdatedAt(),
        items: loadPriceBook(),
      },
      settings: {
        weightAsMain: weightAsMainStore.getSnapshot(),
        haptics: hapticsStore.getSnapshot(),
        marginPercent: marginPercentStore.getSnapshot(),
        massTolerancePercent: massTolerancePercentStore.getSnapshot(),
        defaultUnit: defaultUnitStore.getSnapshot(),
        defaultPaintPrice: defaultPaintPriceStore.getSnapshot(),
        defaultPaintCoverage: defaultPaintCoverageStore.getSnapshot(),
        sharedCalcSettings: sharedCalcSettingsStore.getSnapshot(),
      },
    },
  };
}

export function downloadBackupFile(appVersion?: string): void {
  const backup = buildBackupFile(appVersion);
  const json = JSON.stringify(backup, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `ferroscale-backup-${dateStr}.json`;
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export function validateBackupFile(raw: unknown): FerroscaleBackupFile {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid backup file: root must be an object.");
  }
  const candidate = raw as Partial<FerroscaleBackupFile>;
  if (candidate.schemaVersion !== 1) {
    throw new Error(`Unsupported backup schema version: ${String(candidate.schemaVersion)}`);
  }
  if (!candidate.data || typeof candidate.data !== "object") {
    throw new Error("Invalid backup file: missing data block.");
  }

  const d = candidate.data as Partial<FerroscaleBackupData>;
  const saved = Array.isArray(d.saved) ? d.saved.map(normalizeSavedEntry).filter(Boolean) as SavedEntry[] : [];
  const projects = Array.isArray(d.projects) ? d.projects.map(normalizeProject).filter(Boolean) as Project[] : [];
  const presets = Array.isArray(d.presets) ? d.presets : [];
  const compare = {
    updatedAt: typeof d.compare?.updatedAt === "string" ? d.compare.updatedAt : new Date().toISOString(),
    items: Array.isArray(d.compare?.items) ? d.compare.items : [],
  };
  const quickHistory = {
    updatedAt: typeof d.quickHistory?.updatedAt === "string" ? d.quickHistory.updatedAt : new Date().toISOString(),
    items: Array.isArray(d.quickHistory?.items) ? d.quickHistory.items.filter((item): item is string => typeof item === "string") : [],
  };
  const priceBook = {
    updatedAt: typeof d.priceBook?.updatedAt === "string" ? d.priceBook.updatedAt : new Date().toISOString(),
    items: Array.isArray(d.priceBook?.items) ? d.priceBook.items : [],
  };

  return {
    schemaVersion: 1,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(),
    appVersion: typeof candidate.appVersion === "string" ? candidate.appVersion : "unknown",
    data: {
      saved,
      projects,
      presets,
      compare,
      quickHistory,
      priceBook,
      settings: d.settings ?? {},
    },
  };
}

export interface RestoreSummary {
  savedCount: number;
  projectsCount: number;
  priceBookCount: number;
  presetsCount: number;
}

export function restoreBackupFile(
  backup: FerroscaleBackupFile,
  mode: "merge" | "replace",
): RestoreSummary {
  const d = backup.data;

  if (mode === "replace") {
    persistSavedEntries(d.saved, { markDirty: true });
    persistProjects(d.projects, { markDirty: true });
    persistPresets(d.presets, { markDirty: true });
    persistCompareItems(d.compare.items, { markDirty: true, updatedAt: d.compare.updatedAt });
    persistQuickHistory(d.quickHistory.items, { markDirty: true, updatedAt: d.quickHistory.updatedAt });
    persistPriceBook(d.priceBook.items, { markDirty: true, updatedAt: d.priceBook.updatedAt });
  } else {
    // Merge mode
    const mergedSaved = mergeEntityPayload({ items: loadSavedEntries() }, { items: d.saved });
    const mergedProjects = mergeEntityPayload({ items: loadProjects() }, { items: d.projects });
    const mergedPresets = mergeEntityPayload({ items: loadPresets() }, { items: d.presets });
    const mergedCompare = mergeListPayload(
      { updatedAt: getCompareUpdatedAt(), items: loadCompareItems() },
      d.compare,
    );
    const mergedHistory = mergeListPayload(
      { updatedAt: getQuickHistoryUpdatedAt(), items: loadQuickHistory() },
      d.quickHistory,
    );
    const mergedPriceBook = mergeListPayload(
      { updatedAt: getPriceBookUpdatedAt(), items: loadPriceBook() },
      d.priceBook,
    );

    persistSavedEntries(mergedSaved.items, { markDirty: true });
    persistProjects(mergedProjects.items, { markDirty: true });
    persistPresets(mergedPresets.items, { markDirty: true });
    persistCompareItems(mergedCompare.items, { markDirty: true, updatedAt: mergedCompare.updatedAt });
    persistQuickHistory(mergedHistory.items, { markDirty: true, updatedAt: mergedHistory.updatedAt });
    persistPriceBook(mergedPriceBook.items, { markDirty: true, updatedAt: mergedPriceBook.updatedAt });
  }

  // Restore settings if present
  const s = d.settings;
  if (s) {
    if (typeof s.weightAsMain === "boolean") weightAsMainStore.set(s.weightAsMain);
    if (typeof s.haptics === "boolean") hapticsStore.set(s.haptics);
    if (typeof s.marginPercent === "number") marginPercentStore.set(s.marginPercent);
    if (typeof s.massTolerancePercent === "number") massTolerancePercentStore.set(s.massTolerancePercent);
    if (typeof s.defaultUnit === "string") defaultUnitStore.set(s.defaultUnit);
    if (typeof s.defaultPaintPrice === "number") defaultPaintPriceStore.set(s.defaultPaintPrice);
    if (typeof s.defaultPaintCoverage === "number") defaultPaintCoverageStore.set(s.defaultPaintCoverage);
    if (s.sharedCalcSettings) sharedCalcSettingsStore.update(s.sharedCalcSettings);
  }

  // Trigger storage event so external stores and other tabs react immediately
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("storage"));
  }

  return {
    savedCount: d.saved.length,
    projectsCount: d.projects.length,
    priceBookCount: d.priceBook.items.length,
    presetsCount: d.presets.length,
  };
}
