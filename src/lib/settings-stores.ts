/**
 * App-wide setting stores for the Command shell. Pricing and the default
 * grade live inside the persisted CalculationInput (ferroscale-input-v1);
 * updates are read-modify-write so geometry fields survive untouched.
 */

import { createBoolStore, createNumberStore, createStringStore } from "@/lib/external-stores";
import {
  INPUT_STORAGE_KEY,
  getDefaultInput,
  loadPersistedInput,
  persistInput,
} from "@/lib/calculator/input-storage";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { CommandPricing } from "@ferroscale/metal-core";

export const weightAsMainStore = createBoolStore("ferroscale-weight-as-main", false);
/** Keypad/action vibration on phones that support it. */
export const hapticsStore = createBoolStore("ferroscale-haptics", true);
/**
 * Margin applied on top of cost to get a sell price. 0 keeps the app a cost
 * calculator; anything above turns a result into an offer.
 */
export const marginPercentStore = createNumberStore(
  "ferroscale-margin-percent",
  0,
  (value) => Math.min(500, Math.max(0, value)),
);
/**
 * Mass tolerance, as ±%. Rolled steel is sold by theoretical mass but delivered
 * within a band, so a buyer working to a budget wants the worst case, not the
 * nominal. 0 (the default) hides the band entirely.
 *
 * This is the user's own figure, not a standard: the EN mass tolerances differ
 * per product standard, and some (EN 10029 plate) derive from a thickness class
 * rather than being one percentage. Wiring a per-family table in here is a data
 * task — see docs/REVIEW_2026-08.md §4.8 — and until it is done with a source
 * in hand the app must not put a standard's name next to a number.
 */
export const massTolerancePercentStore = createNumberStore(
  "ferroscale-mass-tolerance-percent",
  0,
  (value) => Math.min(20, Math.max(0, value)),
);
export const defaultUnitStore = createStringStore<LengthUnit>("ferroscale-default-unit", "mm");
/** Shop default when adding a paint coat on a project. The project can override. */
export const defaultPaintPriceStore = createNumberStore(
  "ferroscale-paint-price",
  8,
  (value) => Math.min(10_000, Math.max(0, value)),
);
export const defaultPaintCoverageStore = createNumberStore(
  "ferroscale-paint-coverage",
  8,
  (value) => Math.min(200, Math.max(0.1, value)),
);

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
