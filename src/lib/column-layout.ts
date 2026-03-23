export type ColumnPanelId = "calculator" | "result" | "saved" | "projects" | "settings" | "compare";

export interface ColumnConfig {
  id: string;
  panelId: ColumnPanelId;
  /** Flex-basis percentage (0–100). Columns share 100% total. Omit for equal split. */
  widthPercent?: number;
}

export interface ColumnLayoutState {
  enabled: boolean;
  columns: ColumnConfig[];
}

export const MAX_COLUMNS = 4;
export const MIN_COLUMN_WIDTH = 360;

export const COLUMN_PANEL_LABELS: Record<ColumnPanelId, string> = {
  calculator: "sidebar.title",
  result: "columns.result",
  saved: "sidebar.saved",
  projects: "sidebar.projects",
  settings: "sidebar.settings",
  compare: "sidebar.compare",
};

export const ALL_PANEL_IDS: ColumnPanelId[] = ["calculator", "result", "saved", "projects", "settings", "compare"];

let _nextId = 1;
export function generateColumnId(): string {
  return `col-${Date.now()}-${_nextId++}`;
}

export const DEFAULT_COLUMN_LAYOUT: ColumnLayoutState = {
  enabled: false,
  columns: [
    { id: "default-calc", panelId: "calculator" },
    { id: "default-result", panelId: "result" },
    { id: "default-saved", panelId: "saved" },
  ],
};
