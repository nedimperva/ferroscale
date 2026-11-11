import {
  getCompareUpdatedAt,
  getPriceBookUpdatedAt,
  getQuickHistoryUpdatedAt,
  loadCompareItems,
  loadCustomers,
  loadPriceBook,
  loadProjects,
  loadQuickHistory,
  loadSavedEntries,
  markEntityDeleted,
  normalizeCustomer,
  normalizeProject,
  normalizeSavedEntry,
  persistCompareItems,
  persistCustomers,
  persistPriceBook,
  persistProjects,
  persistQuickHistory,
  persistSavedEntries,
} from "@/lib/sync/collections";
import {
  mergeEntityPayload,
  mergeListPayload,
} from "@/lib/sync/snapshot";
import type { SyncEntityRecord } from "@/lib/sync/types";
import type { PriceBookEntry } from "@/hooks/usePriceBook";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem as SyncCompareItem } from "@/hooks/useCompare";
import type { Project } from "@/hooks/useProjects";
import type { Customer } from "@/hooks/useCustomers";
import {
  defaultPaintCoverageStore,
  defaultPaintPriceStore,
  defaultUnitStore,
  hapticsStore,
  marginPercentStore,
  massTolerancePercentStore,
  sharedCalcSettingsStore,
  showSectionPropertiesStore,
  weightAsMainStore,
  type SharedCalcSettings,
} from "@/lib/settings-stores";
import type { LengthUnit } from "@/lib/calculator/types";
import { notifyCollectionsReplaced } from "@/lib/sync/external-changes";
import { downloadBlob } from "@/lib/csv-utils";
import { APP_VERSION } from "@/lib/changelog";

export interface FerroscaleBackupData {
  saved: SavedEntry[];
  projects: Project[];
  /** Absent in backups written before customers existed. */
  customers?: Customer[];
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
    showSectionProperties?: boolean;
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

export function buildBackupFile(appVersion: string = APP_VERSION): FerroscaleBackupFile {
  const exportedAt = new Date().toISOString();

  return {
    schemaVersion: 1,
    exportedAt,
    appVersion,
    data: {
      saved: loadSavedEntries(),
      projects: loadProjects(),
      customers: loadCustomers(),
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
        showSectionProperties: showSectionPropertiesStore.getSnapshot(),
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
  // An older backup has no customers: leave them out rather than as [], so a
  // replace restore keeps this device's customers instead of wiping them.
  const customers = Array.isArray(d.customers)
    ? (d.customers.map(normalizeCustomer).filter(Boolean) as Customer[])
    : undefined;
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
      customers,
      compare,
      quickHistory,
      priceBook,
      settings: d.settings ?? {},
    },
  };
}

/** The backup's entities, restamped, plus a tombstone for each local one it lacks. */
function replaceEntities<T extends SyncEntityRecord>(local: T[], incoming: T[], now: string): T[] {
  const keep = new Set(incoming.map((entity) => entity.id));
  const restored = incoming.map((entity) =>
    entity.deletedAt ? entity : { ...entity, updatedAt: now },
  );
  const removed = local
    .filter((entity) => !keep.has(entity.id) && !entity.deletedAt)
    .map((entity) => markEntityDeleted(entity, now));
  return [...restored, ...removed];
}

const LENGTH_UNITS: readonly LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

export interface RestoreSummary {
  savedCount: number;
  projectsCount: number;
  priceBookCount: number;
}

export function restoreBackupFile(
  backup: FerroscaleBackupFile,
  mode: "merge" | "replace",
): RestoreSummary {
  const d = backup.data;

  if (mode === "replace") {
    // Replace has to win over Drive too, not only over this device: what the
    // backup holds is stamped now (an older stamp loses the next sync merge),
    // and what it lacks is tombstoned rather than dropped, so the delete
    // reaches the other devices instead of being pulled straight back.
    const now = new Date().toISOString();
    persistSavedEntries(replaceEntities(loadSavedEntries(), d.saved, now), { markDirty: true });
    persistProjects(replaceEntities(loadProjects(), d.projects, now), { markDirty: true });
    if (d.customers) {
      persistCustomers(replaceEntities(loadCustomers(), d.customers, now), { markDirty: true });
    }
    persistCompareItems(d.compare.items, { markDirty: true, updatedAt: now });
    persistQuickHistory(d.quickHistory.items, { markDirty: true, updatedAt: now });
    persistPriceBook(d.priceBook.items, { markDirty: true, updatedAt: now });
  } else {
    // Merge mode
    const mergedSaved = mergeEntityPayload({ items: loadSavedEntries() }, { items: d.saved });
    const mergedProjects = mergeEntityPayload({ items: loadProjects() }, { items: d.projects });
    const mergedCustomers = mergeEntityPayload({ items: loadCustomers() }, { items: d.customers ?? [] });
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
    persistCustomers(mergedCustomers.items, { markDirty: true });
    persistCompareItems(mergedCompare.items, { markDirty: true, updatedAt: mergedCompare.updatedAt });
    persistQuickHistory(mergedHistory.items, { markDirty: true, updatedAt: mergedHistory.updatedAt });
    persistPriceBook(mergedPriceBook.items, { markDirty: true, updatedAt: mergedPriceBook.updatedAt });
  }

  // Restore settings if present
  const s = d.settings;
  if (s) {
    if (typeof s.weightAsMain === "boolean") weightAsMainStore.set(s.weightAsMain);
    if (typeof s.showSectionProperties === "boolean") {
      showSectionPropertiesStore.set(s.showSectionProperties);
    }
    if (typeof s.haptics === "boolean") hapticsStore.set(s.haptics);
    if (typeof s.marginPercent === "number") marginPercentStore.set(s.marginPercent);
    if (typeof s.massTolerancePercent === "number") massTolerancePercentStore.set(s.massTolerancePercent);
    if (LENGTH_UNITS.includes(s.defaultUnit as LengthUnit)) defaultUnitStore.set(s.defaultUnit as LengthUnit);
    if (typeof s.defaultPaintPrice === "number") defaultPaintPriceStore.set(s.defaultPaintPrice);
    if (typeof s.defaultPaintCoverage === "number") defaultPaintCoverageStore.set(s.defaultPaintCoverage);
    if (s.sharedCalcSettings) sharedCalcSettingsStore.update(s.sharedCalcSettings);
  }

  // The hooks own their lists in React state; tell them storage changed.
  notifyCollectionsReplaced();

  return {
    savedCount: d.saved.length,
    projectsCount: d.projects.length,
    priceBookCount: d.priceBook.items.length,
  };
}
