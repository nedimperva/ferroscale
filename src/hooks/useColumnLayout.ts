"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createJsonStore } from "@/lib/external-stores";
import type { ColumnConfig, ColumnLayoutState, ColumnPanelId } from "@/lib/column-layout";
import { DEFAULT_COLUMN_LAYOUT, MAX_COLUMNS, generateColumnId } from "@/lib/column-layout";

const columnLayoutStore = createJsonStore<ColumnLayoutState>(
  "ferroscale-column-layout",
  DEFAULT_COLUMN_LAYOUT,
);

export function useColumnLayout() {
  const state = useSyncExternalStore(
    columnLayoutStore.subscribe,
    columnLayoutStore.getSnapshot,
    columnLayoutStore.getServerSnapshot,
  );

  const toggleEnabled = useCallback(() => {
    const current = columnLayoutStore.getSnapshot();
    columnLayoutStore.set({ ...current, enabled: !current.enabled });
  }, []);

  const addColumn = useCallback((panelId: ColumnPanelId) => {
    const current = columnLayoutStore.getSnapshot();
    if (current.columns.length >= MAX_COLUMNS) return;
    const newCol: ColumnConfig = { id: generateColumnId(), panelId };
    columnLayoutStore.set({ ...current, columns: [...current.columns, newCol] });
  }, []);

  const removeColumn = useCallback((id: string) => {
    const current = columnLayoutStore.getSnapshot();
    if (current.columns.length <= 1) return;
    columnLayoutStore.set({ ...current, columns: current.columns.filter((c) => c.id !== id) });
  }, []);

  const setPanelForColumn = useCallback((id: string, panelId: ColumnPanelId) => {
    const current = columnLayoutStore.getSnapshot();
    columnLayoutStore.set({
      ...current,
      columns: current.columns.map((c) => (c.id === id ? { ...c, panelId } : c)),
    });
  }, []);

  const moveColumn = useCallback((id: string, direction: "left" | "right") => {
    const current = columnLayoutStore.getSnapshot();
    const idx = current.columns.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.columns.length) return;
    const cols = [...current.columns];
    [cols[idx], cols[targetIdx]] = [cols[targetIdx], cols[idx]];
    columnLayoutStore.set({ ...current, columns: cols });
  }, []);

  const setColumnWidths = useCallback((widths: Record<string, number>) => {
    const current = columnLayoutStore.getSnapshot();
    columnLayoutStore.set({
      ...current,
      columns: current.columns.map((c) =>
        widths[c.id] !== undefined ? { ...c, widthPercent: widths[c.id] } : c,
      ),
    });
  }, []);

  const resetLayout = useCallback(() => {
    columnLayoutStore.set({ ...DEFAULT_COLUMN_LAYOUT, enabled: true });
  }, []);

  const hasPanel = useCallback(
    (panelId: ColumnPanelId) => state.columns.some((c) => c.panelId === panelId),
    [state.columns],
  );

  return useMemo(
    () => ({
      enabled: state.enabled,
      columns: state.columns,
      toggleEnabled,
      addColumn,
      removeColumn,
      setPanelForColumn,
      moveColumn,
      setColumnWidths,
      resetLayout,
      hasPanel,
    }),
    [state.enabled, state.columns, toggleEnabled, addColumn, removeColumn, setPanelForColumn, moveColumn, setColumnWidths, resetLayout, hasPanel],
  );
}
