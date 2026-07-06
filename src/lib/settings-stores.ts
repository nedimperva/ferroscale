/**
 * App-wide setting stores for the Command shell. Pricing and the default
 * grade live inside the persisted CalculationInput (ferroscale-input-v1);
 * updates are read-modify-write so geometry fields survive untouched.
 */

import { createBoolStore, createStringStore } from "@/lib/external-stores";
import {
  INPUT_STORAGE_KEY,
  getDefaultInput,
  loadPersistedInput,
  persistInput,
} from "@/lib/calculator/input-storage";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { CommandPricing } from "@ferroscale/metal-core";

export const weightAsMainStore = createBoolStore("ferroscale-weight-as-main", false);
export const defaultUnitStore = createStringStore<LengthUnit>("ferroscale-default-unit", "mm");

export type { CommandPricing };

/** Pricing plus the shared default material grade (= input.materialGradeId). */
export interface SharedCalcSettings extends CommandPricing {
  defaultGradeId: string;
}

function pickShared(input: CalculationInput): SharedCalcSettings {
  return {
    priceBasis: input.priceBasis,
    priceUnit: input.priceUnit,
    unitPrice: input.unitPrice,
    currency: input.currency,
    wastePercent: input.wastePercent,
    includeVat: input.includeVat,
    vatPercent: input.vatPercent,
    defaultGradeId: input.materialGradeId,
  };
}

export const DEFAULT_SHARED_SETTINGS: SharedCalcSettings = pickShared(getDefaultInput());

let _listeners: Array<() => void> = [];
let _cachedRaw: string | null | undefined;
let _cachedValue: SharedCalcSettings = DEFAULT_SHARED_SETTINGS;

function notify() {
  for (const l of _listeners) l();
}

function subscribe(cb: () => void) {
  _listeners = [..._listeners, cb];
  const onStorage = (event: StorageEvent) => {
    if (event.key === INPUT_STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    _listeners = _listeners.filter((l) => l !== cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Raw-string cache keeps the snapshot referentially stable for useSyncExternalStore. */
function getSnapshot(): SharedCalcSettings {
  try {
    const raw = localStorage.getItem(INPUT_STORAGE_KEY);
    if (raw === _cachedRaw) return _cachedValue;
    _cachedRaw = raw;
    const input = loadPersistedInput();
    _cachedValue = input ? pickShared(input) : DEFAULT_SHARED_SETTINGS;
    return _cachedValue;
  } catch {
    return DEFAULT_SHARED_SETTINGS;
  }
}

function getServerSnapshot(): SharedCalcSettings {
  return DEFAULT_SHARED_SETTINGS;
}

/**
 * Read-modify-write the persisted calculator input. Only the shared fields are
 * patched — geometry (profile, dimensions, length, quantity, rounding) is
 * preserved so the legacy calculator's working state survives.
 */
export function updateSharedCalcSettings(patch: Partial<SharedCalcSettings>): void {
  const base = loadPersistedInput() ?? getDefaultInput();
  const { defaultGradeId, ...pricing } = patch;
  persistInput({
    ...base,
    ...pricing,
    ...(defaultGradeId !== undefined ? { materialGradeId: defaultGradeId } : {}),
  });
  _cachedRaw = undefined; // force re-read on next snapshot
  notify();
}

export const sharedCalcSettingsStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  update: updateSharedCalcSettings,
};
