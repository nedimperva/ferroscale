import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBackupFile,
  restoreBackupFile,
  validateBackupFile,
  type FerroscaleBackupFile,
} from "./backup-file";
import { loadProjects, persistProjects, persistSavedEntries } from "@/lib/sync/collections";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";

const mockStorage = new Map<string, string>();

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("backup-file", () => {
  it("builds a valid backup file containing local state", () => {
    const mockSaved: SavedEntry = {
      id: "save-1",
      name: "HEA 120 Column",
      timestamp: "2026-08-01T10:00:00.000Z",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      input: {
        profileCategory: "structural",
        profileId: "beam_hea_en",
        materialGradeId: "steel-s235jr",
        dimensions: { height: 114, width: 120 },
        length: 6,
        lengthUnit: "m",
        quantity: 2,
        priceBasis: "weight",
        priceUnit: "kg",
        unitPrice: 1.5,
        currency: "EUR",
        wastePercent: 0,
        includeVat: false,
        vatPercent: 0,
      },
      result: {
        profileId: "beam_hea_en",
        profileLabel: "HEA 120",
        gradeLabel: "S235JR",
        densityKgPerM3: 7850,
        areaMm2: 2530,
        lengthMm: 6000,
        quantity: 2,
        unitWeightKg: 119.16,
        totalWeightKg: 238.33,
        totalWeightLb: 525.43,
        unitPriceAmount: 1.5,
        subtotalAmount: 357.5,
        wasteAmount: 0,
        subtotalWithWasteAmount: 357.5,
        vatAmount: 0,
        grandTotalAmount: 357.5,
        currency: "EUR",
        priceBasis: "weight",
        priceUnit: "kg",
        formulaLabel: "EN 10025",
        datasetVersion: "1.0",
        referenceLabels: ["EN 10025-2"],
        dimensions: { height: 114, width: 120 },
      },
    };

    persistSavedEntries([mockSaved]);

    const backup = buildBackupFile("3.22.0");
    expect(backup.schemaVersion).toBe(1);
    expect(backup.appVersion).toBe("3.22.0");
    expect(backup.data.saved.length).toBe(1);
    expect(backup.data.saved[0].name).toBe("HEA 120 Column");
  });

  it("validates and parses valid backup files", () => {
    const raw: FerroscaleBackupFile = {
      schemaVersion: 1,
      exportedAt: "2026-08-10T12:00:00.000Z",
      appVersion: "3.22.0",
      data: {
        saved: [],
        projects: [],
        presets: [],
        compare: { updatedAt: "2026-08-10T12:00:00.000Z", items: [] },
        quickHistory: { updatedAt: "2026-08-10T12:00:00.000Z", items: ["hea120 6m"] },
        priceBook: { updatedAt: "2026-08-10T12:00:00.000Z", items: [] },
        settings: { weightAsMain: true },
      },
    };

    const validated = validateBackupFile(raw);
    expect(validated.schemaVersion).toBe(1);
    expect(validated.data.quickHistory.items).toEqual(["hea120 6m"]);
    expect(validated.data.settings.weightAsMain).toBe(true);
  });

  it("rejects invalid backup schema", () => {
    expect(() => validateBackupFile(null)).toThrow();
    expect(() => validateBackupFile({ schemaVersion: 99 })).toThrow();
    expect(() => validateBackupFile({ schemaVersion: 1, data: "invalid" })).toThrow();
  });

  it("restores backup in replace and merge modes", () => {
    const initialProject: Project = {
      id: "p1",
      name: "Old Project",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      calculations: [],
    };
    persistProjects([initialProject]);

    const backupProject: Project = {
      id: "p2",
      name: "Restored Project",
      createdAt: "2026-08-05T10:00:00.000Z",
      updatedAt: "2026-08-05T10:00:00.000Z",
      calculations: [],
    };

    const backupFile: FerroscaleBackupFile = {
      schemaVersion: 1,
      exportedAt: "2026-08-05T12:00:00.000Z",
      appVersion: "3.22.0",
      data: {
        saved: [],
        projects: [backupProject],
        presets: [],
        compare: { updatedAt: "2026-08-05T12:00:00.000Z", items: [] },
        quickHistory: { updatedAt: "2026-08-05T12:00:00.000Z", items: [] },
        priceBook: { updatedAt: "2026-08-05T12:00:00.000Z", items: [] },
        settings: {},
      },
    };

    // 1. Merge mode: should have both p1 and p2
    restoreBackupFile(backupFile, "merge");
    const merged = loadProjects();
    expect(merged.length).toBe(2);
    expect(merged.some((p) => p.id === "p1")).toBe(true);
    expect(merged.some((p) => p.id === "p2")).toBe(true);

    // 2. Replace mode: should have only p2
    restoreBackupFile(backupFile, "replace");
    const replaced = loadProjects();
    expect(replaced.length).toBe(1);
    expect(replaced[0].id).toBe("p2");
  });
});
