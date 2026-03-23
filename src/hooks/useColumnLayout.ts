"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { createJsonStore } from "@/lib/external-stores";
import type { ColumnConfig, ColumnLayoutState, ColumnPanelId } from "@/lib/column-layout";
import {
  DEFAULT_COLUMN_LAYOUT,
  MAX_COLUMNS,
  areColumnLayoutStatesEqual,
  generateColumnId,
  getAvailableColumnPanelIds,
  normalizeColumnLayoutState,
  rebalanceColumnWidths,
} from "@/lib/column-layout";

const columnLayoutStore = createJsonStore<ColumnLayoutState>(
  "ferroscale-column-layout",
  DEFAULT_COLUMN_LAYOUT,
);

function getCurrentState(): ColumnLayoutState {
  return normalizeColumnLayoutState(columnLayoutStore.getSnapshot());
}

function setNormalizedState(nextState: ColumnLayoutState) {
  columnLayoutStore.set(normalizeColumnLayoutState(nextState));
}

export function useColumnLayout() {
  const rawState = useSyncExternalStore(
    columnLayoutStore.subscribe,
    columnLayoutStore.getSnapshot,
    columnLayoutStore.getServerSnapshot,
  );

  const state = useMemo(() => normalizeColumnLayoutState(rawState), [rawState]);

  useEffect(() => {
    if (!areColumnLayoutStatesEqual(rawState, state)) {
      columnLayoutStore.set(state);
    }
  }, [rawState, state]);

  const toggleEnabled = useCallback(() => {
    const current = getCurrentState();
    setNormalizedState({ ...current, enabled: !current.enabled });
  }, []);

  const addColumn = useCallback((panelId: ColumnPanelId) => {
    const current = getCurrentState();
    if (current.columns.length >= MAX_COLUMNS) return;
    if (current.columns.some((column) => column.panelId === panelId)) return;

    const newColumn: ColumnConfig = { id: generateColumnId(), panelId };
    setNormalizedState({
      ...current,
      columns: rebalanceColumnWidths([...current.columns, newColumn]),
    });
  }, []);

  const removeColumn = useCallback((id: string) => {
    const current = getCurrentState();
    if (current.columns.length <= 1) return;

    setNormalizedState({
      ...current,
      columns: rebalanceColumnWidths(current.columns.filter((column) => column.id !== id)),
    });
  }, []);

  const setPanelForColumn = useCallback((id: string, panelId: ColumnPanelId) => {
    const current = getCurrentState();
    const alreadyUsedElsewhere = current.columns.some(
      (column) => column.id !== id && column.panelId === panelId,
    );
    if (alreadyUsedElsewhere) return;

    setNormalizedState({
      ...current,
      columns: current.columns.map((column) =>
        column.id === id ? { ...column, panelId } : column,
      ),
    });
  }, []);

  const moveColumn = useCallback((id: string, direction: "left" | "right") => {
    const current = getCurrentState();
    const index = current.columns.findIndex((column) => column.id === id);
    if (index === -1) return;

    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.columns.length) return;

    const columns = [...current.columns];
    [columns[index], columns[targetIndex]] = [columns[targetIndex], columns[index]];

    setNormalizedState({ ...current, columns });
  }, []);

  const setColumnWidths = useCallback((widths: Record<string, number>) => {
    const current = getCurrentState();
    setNormalizedState({
      ...current,
      columns: current.columns.map((column) =>
        widths[column.id] !== undefined
          ? { ...column, widthPercent: widths[column.id] }
          : column,
      ),
    });
  }, []);

  const resetLayout = useCallback(() => {
    setNormalizedState({ ...DEFAULT_COLUMN_LAYOUT, enabled: true });
  }, []);

  const hasPanel = useCallback(
    (panelId: ColumnPanelId) => state.columns.some((column) => column.panelId === panelId),
    [state.columns],
  );

  const getAvailablePanels = useCallback(
    (currentColumnId?: string) => getAvailableColumnPanelIds(state.columns, currentColumnId),
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
      getAvailablePanels,
    }),
    [
      state.enabled,
      state.columns,
      toggleEnabled,
      addColumn,
      removeColumn,
      setPanelForColumn,
      moveColumn,
      setColumnWidths,
      resetLayout,
      hasPanel,
      getAvailablePanels,
    ],
  );
}
