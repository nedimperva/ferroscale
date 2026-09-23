import { beforeEach, describe, expect, it, vi } from "vitest";
import { applySyncedSettings, buildSettingsPayload, getSettingsUpdatedAt } from "./settings-sync";
import { SETTINGS_EPOCH } from "./settings-dirty";
import { SYNC_SETTINGS_UPDATED_AT_KEY } from "./keys";
import { registerSyncDirtyHandler } from "./registry";
import {
  defaultUnitStore,
  marginPercentStore,
  sharedCalcSettingsStore,
} from "@/lib/settings-stores";

describe("settings sync", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    };
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", { localStorage: localStorageMock });
    registerSyncDirtyHandler(null);
  });

  it("reads a stock device as oldest so it adopts what Drive holds", () => {
    expect(getSettingsUpdatedAt()).toBe(SETTINGS_EPOCH);
  });

  it("stamps a device the user already tuned before settings sync existed", () => {
    localStorage.setItem("ferroscale-margin-percent", "15");
    const stamped = getSettingsUpdatedAt();
    expect(stamped).not.toBe(SETTINGS_EPOCH);
    expect(localStorage.getItem(SYNC_SETTINGS_UPDATED_AT_KEY)).toBe(stamped);
  });

  it("stamps and reports a change made through a store", async () => {
    const dirty = vi.fn();
    registerSyncDirtyHandler(dirty);
    marginPercentStore.set(12);
    await Promise.resolve();
    expect(dirty).toHaveBeenCalledWith("settings");
    expect(getSettingsUpdatedAt()).not.toBe(SETTINGS_EPOCH);
  });

  it("applies newer remote settings without echoing them back as an edit", async () => {
    const dirty = vi.fn();
    registerSyncDirtyHandler(dirty);

    const applied = applySyncedSettings({
      updatedAt: "2026-09-01T00:00:00.000Z",
      values: {
        shared: { ...sharedCalcSettingsStore.getSnapshot(), unitPrice: 2.75, vatPercent: 17 },
        marginPercent: 20,
        defaultUnit: "m",
      },
    });
    await Promise.resolve();

    expect(applied).toBe(true);
    expect(dirty).not.toHaveBeenCalled();
    expect(marginPercentStore.getSnapshot()).toBe(20);
    expect(defaultUnitStore.getSnapshot()).toBe("m");
    expect(sharedCalcSettingsStore.getSnapshot().unitPrice).toBe(2.75);
    expect(sharedCalcSettingsStore.getSnapshot().vatPercent).toBe(17);
    expect(buildSettingsPayload().updatedAt).toBe("2026-09-01T00:00:00.000Z");
  });

  it("keeps local settings that are newer than the remote copy", () => {
    marginPercentStore.set(8);
    const applied = applySyncedSettings({
      updatedAt: "2020-01-01T00:00:00.000Z",
      values: { marginPercent: 40 },
    });
    expect(applied).toBe(false);
    expect(marginPercentStore.getSnapshot()).toBe(8);
  });

  it("skips malformed remote fields instead of writing them", () => {
    applySyncedSettings({
      updatedAt: "2026-09-01T00:00:00.000Z",
      values: {
        shared: { unitPrice: "lots", includeVat: true, bogus: 1 },
        marginPercent: Number.NaN,
        defaultUnit: "furlong",
      },
    });
    expect(marginPercentStore.getSnapshot()).toBe(0);
    expect(defaultUnitStore.getSnapshot()).toBe("mm");
    const shared = sharedCalcSettingsStore.getSnapshot();
    expect(typeof shared.unitPrice).toBe("number");
    expect(shared.includeVat).toBe(true);
    expect("bogus" in shared).toBe(false);
  });
});
