import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDefaultInput } from "@/hooks/useCalculator";
import { INPUT_STORAGE_KEY, loadPersistedInput } from "@/lib/calculator/input-storage";
import {
  DEFAULT_SHARED_SETTINGS,
  sharedCalcSettingsStore,
  updateSharedCalcSettings,
} from "./settings-stores";

const mockStorage = new Map<string, string>();

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  });
  vi.stubGlobal("window", {
    localStorage: globalThis.localStorage,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sharedCalcSettingsStore", () => {
  it("returns defaults when nothing is persisted", () => {
    expect(sharedCalcSettingsStore.getSnapshot()).toEqual(DEFAULT_SHARED_SETTINGS);
  });

  it("getServerSnapshot returns defaults", () => {
    expect(sharedCalcSettingsStore.getServerSnapshot()).toBe(DEFAULT_SHARED_SETTINGS);
  });

  it("update persists with the {v:1} envelope and notifies", () => {
    const listener = vi.fn();
    const unsub = sharedCalcSettingsStore.subscribe(listener);

    updateSharedCalcSettings({ unitPrice: 2.5, currency: "PLN" });

    expect(listener).toHaveBeenCalledTimes(1);
    const raw = JSON.parse(mockStorage.get(INPUT_STORAGE_KEY)!);
    expect(raw.v).toBe(1);
    expect(raw.input.unitPrice).toBe(2.5);
    expect(raw.input.currency).toBe("PLN");

    const snap = sharedCalcSettingsStore.getSnapshot();
    expect(snap.unitPrice).toBe(2.5);
    expect(snap.currency).toBe("PLN");
    unsub();
  });

  it("read-modify-write preserves geometry fields", () => {
    const base = getDefaultInput();
    const customized = {
      ...base,
      profileId: "pipe" as const,
      quantity: 7,
      length: { value: 4321, unit: "mm" as const },
    };
    mockStorage.set(INPUT_STORAGE_KEY, JSON.stringify({ v: 1, input: customized }));

    updateSharedCalcSettings({ wastePercent: 12, defaultGradeId: "stainless-316l" });

    const after = loadPersistedInput()!;
    expect(after.profileId).toBe("pipe");
    expect(after.quantity).toBe(7);
    expect(after.length).toEqual({ value: 4321, unit: "mm" });
    expect(after.wastePercent).toBe(12);
    expect(after.materialGradeId).toBe("stainless-316l");
  });

  it("snapshot is referentially stable across reads of the same raw value", () => {
    updateSharedCalcSettings({ unitPrice: 3 });
    const a = sharedCalcSettingsStore.getSnapshot();
    const b = sharedCalcSettingsStore.getSnapshot();
    expect(a).toBe(b);
  });

  it("defaultGradeId maps to materialGradeId", () => {
    updateSharedCalcSettings({ defaultGradeId: "al-7075" });
    expect(loadPersistedInput()!.materialGradeId).toBe("al-7075");
    expect(sharedCalcSettingsStore.getSnapshot().defaultGradeId).toBe("al-7075");
  });
});
