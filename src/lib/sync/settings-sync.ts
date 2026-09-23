/**
 * The shop defaults as one synced record: set your rate, grade and VAT once
 * and every device prices the same way. Newer `updatedAt` wins wholesale —
 * settings are edited one at a time, so a per-field merge would buy nothing.
 */

import {
  DEFAULT_SHARED_SETTINGS,
  defaultPaintCoverageStore,
  defaultPaintPriceStore,
  defaultUnitStore,
  marginPercentStore,
  massTolerancePercentStore,
  sharedCalcSettingsStore,
  showSectionPropertiesStore,
  weightAsMainStore,
  type SharedCalcSettings,
} from "@/lib/settings-stores";
import type { LengthUnit } from "@/lib/calculator/types";
import {
  SETTINGS_EPOCH,
  readSettingsUpdatedAt,
  withSettingsDirtySuppressed,
  writeSettingsUpdatedAt,
} from "./settings-dirty";
import type { SyncSettingsPayload } from "./types";

export interface SyncedSettings {
  shared: SharedCalcSettings;
  weightAsMain: boolean;
  showSectionProperties: boolean;
  marginPercent: number;
  massTolerancePercent: number;
  defaultUnit: LengthUnit;
  defaultPaintPrice: number;
  defaultPaintCoverage: number;
}

const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

export function loadSyncedSettings(): SyncedSettings {
  return {
    shared: sharedCalcSettingsStore.getSnapshot(),
    weightAsMain: weightAsMainStore.getSnapshot(),
    showSectionProperties: showSectionPropertiesStore.getSnapshot(),
    marginPercent: marginPercentStore.getSnapshot(),
    massTolerancePercent: massTolerancePercentStore.getSnapshot(),
    defaultUnit: defaultUnitStore.getSnapshot(),
    defaultPaintPrice: defaultPaintPriceStore.getSnapshot(),
    defaultPaintCoverage: defaultPaintCoverageStore.getSnapshot(),
  };
}

function defaultSyncedSettings(): SyncedSettings {
  return {
    shared: DEFAULT_SHARED_SETTINGS,
    weightAsMain: weightAsMainStore.getServerSnapshot(),
    showSectionProperties: showSectionPropertiesStore.getServerSnapshot(),
    marginPercent: marginPercentStore.getServerSnapshot(),
    massTolerancePercent: massTolerancePercentStore.getServerSnapshot(),
    defaultUnit: defaultUnitStore.getServerSnapshot(),
    defaultPaintPrice: defaultPaintPriceStore.getServerSnapshot(),
    defaultPaintCoverage: defaultPaintCoverageStore.getServerSnapshot(),
  };
}

/**
 * When this device's settings last changed.
 *
 * A device that has never stamped (it predates settings sync) needs a
 * decision: a stock device must read as oldest so it adopts what Drive holds,
 * but one the user already tuned must not be flattened by a fresh install
 * that happens to sync first. So untouched → epoch, customised → now.
 */
export function getSettingsUpdatedAt(): string {
  const stored = readSettingsUpdatedAt();
  if (stored) return stored;
  if (JSON.stringify(loadSyncedSettings()) === JSON.stringify(defaultSyncedSettings())) {
    return SETTINGS_EPOCH;
  }
  const stamped = new Date().toISOString();
  writeSettingsUpdatedAt(stamped);
  return stamped;
}

export function buildSettingsPayload(): SyncSettingsPayload {
  return { updatedAt: getSettingsUpdatedAt(), values: loadSyncedSettings() };
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Only the fields the app knows, each with the type its default has. */
function pickShared(raw: unknown): Partial<SharedCalcSettings> | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SHARED_SETTINGS)) {
    const value = source[key];
    if (typeof value !== typeof fallback) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? (out as Partial<SharedCalcSettings>) : null;
}

/** Remote values are untrusted shape-wise: take what is valid, skip the rest. */
export function applySyncedSettings(payload: SyncSettingsPayload): boolean {
  if (!payload.updatedAt || payload.updatedAt <= getSettingsUpdatedAt()) return false;
  const values = (payload.values ?? {}) as Partial<SyncedSettings>;

  withSettingsDirtySuppressed(() => {
    const shared = pickShared(values.shared);
    if (shared) sharedCalcSettingsStore.update(shared);
    if (typeof values.weightAsMain === "boolean") weightAsMainStore.set(values.weightAsMain);
    if (typeof values.showSectionProperties === "boolean") {
      showSectionPropertiesStore.set(values.showSectionProperties);
    }
    const margin = num(values.marginPercent);
    if (margin !== undefined) marginPercentStore.set(margin);
    const tolerance = num(values.massTolerancePercent);
    if (tolerance !== undefined) massTolerancePercentStore.set(tolerance);
    if (LENGTH_UNITS.includes(values.defaultUnit as LengthUnit)) {
      defaultUnitStore.set(values.defaultUnit as LengthUnit);
    }
    const paintPrice = num(values.defaultPaintPrice);
    if (paintPrice !== undefined) defaultPaintPriceStore.set(paintPrice);
    const paintCoverage = num(values.defaultPaintCoverage);
    if (paintCoverage !== undefined) defaultPaintCoverageStore.set(paintCoverage);
  });

  writeSettingsUpdatedAt(payload.updatedAt);
  return true;
}
