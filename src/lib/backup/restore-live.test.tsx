// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useCustomers } from "@/hooks/useCustomers";
import { usePriceBook } from "@/hooks/usePriceBook";
import { useProjects } from "@/hooks/useProjects";
import { useQuickHistory } from "@/hooks/useQuickHistory";
import { useSaved } from "@/hooks/useSaved";
import { restoreBackupFile, validateBackupFile } from "./backup-file";

const now = new Date().toISOString();

function backup() {
  return validateBackupFile({
    schemaVersion: 1,
    exportedAt: now,
    appVersion: "test",
    data: {
      saved: [],
      projects: [{ id: "p1", name: "Restored job", createdAt: now, updatedAt: now, calculations: [] }],
      customers: [{ id: "c1", name: "Restored Co", createdAt: now, updatedAt: now }],
      compare: { updatedAt: now, items: [] },
      quickHistory: { updatedAt: now, items: ["hea120 6m"] },
      priceBook: { updatedAt: now, items: [{ gradeId: "s235", unitPrice: 2.5, updatedAt: now }] },
      settings: {},
    },
  });
}

describe("restoring a backup while the app is open", () => {
  beforeEach(() => localStorage.clear());

  it.each(["replace", "merge"] as const)("shows restored data without a reload (%s)", (mode) => {
    const projects = renderHook(() => useProjects());
    const customers = renderHook(() => useCustomers());
    const history = renderHook(() => useQuickHistory());
    const saved = renderHook(() => useSaved());
    const prices = renderHook(() => usePriceBook());
    expect(projects.result.current.projects).toHaveLength(0);

    act(() => {
      restoreBackupFile(backup(), mode);
    });

    expect(projects.result.current.projects.map((p) => p.name)).toEqual(["Restored job"]);
    expect(customers.result.current.customers.map((c) => c.name)).toEqual(["Restored Co"]);
    expect(history.result.current.history).toEqual(["hea120 6m"]);
    expect(saved.result.current.saved).toEqual([]);
    expect(prices.result.current.rates).toEqual({ s235: 2.5 });
  });
});
