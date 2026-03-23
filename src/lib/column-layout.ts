export type ColumnPanelId = "calculator" | "result" | "saved" | "projects" | "settings" | "compare";

export interface ColumnConfig {
  id: string;
  panelId: ColumnPanelId;
  /** Normalized width share percentage (0-100). Columns always sum to 100. */
  widthPercent?: number;
}

export interface ColumnLayoutState {
  enabled: boolean;
  columns: ColumnConfig[];
}

export const MAX_COLUMNS = 4;
export const MIN_COLUMN_WIDTH = 360;
export const COLUMN_RESIZE_HANDLE_WIDTH = 16;
export const COLUMN_KEYBOARD_STEP_PX = 48;

export const COLUMN_PANEL_LABELS: Record<ColumnPanelId, string> = {
  calculator: "sidebar.title",
  result: "columns.result",
  saved: "sidebar.saved",
  projects: "sidebar.projects",
  settings: "sidebar.settings",
  compare: "sidebar.compare",
};

export const ALL_PANEL_IDS: ColumnPanelId[] = [
  "calculator",
  "result",
  "saved",
  "projects",
  "settings",
  "compare",
];

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

const VALID_PANEL_IDS = new Set<ColumnPanelId>(ALL_PANEL_IDS);

function isColumnPanelId(value: unknown): value is ColumnPanelId {
  return typeof value === "string" && VALID_PANEL_IDS.has(value as ColumnPanelId);
}

function sanitizeWidthPercent(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function roundPercent(value: number): number {
  return Number(value.toFixed(6));
}

export function getEqualWidthPercent(columnCount: number): number {
  if (columnCount <= 0) return 100;
  return 100 / columnCount;
}

function finalizeWidthPercents(widths: number[]): number[] {
  if (widths.length === 0) return [];

  const rounded = widths.map(roundPercent);
  const total = rounded.reduce((sum, width) => sum + width, 0);
  const diff = roundPercent(100 - total);
  rounded[rounded.length - 1] = roundPercent(rounded[rounded.length - 1] + diff);

  return rounded;
}

export function normalizeWidthPercents(widths: Array<number | null | undefined>): number[] {
  if (widths.length === 0) return [];

  const sanitized = widths.map((width) => sanitizeWidthPercent(width ?? undefined));
  const defined = sanitized.filter((width): width is number => width != null);
  const definedTotal = defined.reduce((sum, width) => sum + width, 0);
  const missingCount = sanitized.length - defined.length;

  let completed: number[];

  if (defined.length === 0) {
    completed = Array.from({ length: sanitized.length }, () => getEqualWidthPercent(sanitized.length));
  } else if (missingCount === 0) {
    completed = defined;
  } else if (definedTotal > 0 && definedTotal < 100) {
    const fill = (100 - definedTotal) / missingCount;
    completed = sanitized.map((width) => width ?? fill);
  } else {
    const fill = definedTotal / defined.length;
    completed = sanitized.map((width) => width ?? fill);
  }

  const total = completed.reduce((sum, width) => sum + width, 0);
  if (total <= 0) {
    return finalizeWidthPercents(
      Array.from({ length: widths.length }, () => getEqualWidthPercent(widths.length)),
    );
  }

  return finalizeWidthPercents(completed.map((width) => (width / total) * 100));
}

export function rebalanceColumnWidths(columns: readonly ColumnConfig[]): ColumnConfig[] {
  const widths = normalizeWidthPercents(
    Array.from({ length: columns.length }, () => getEqualWidthPercent(columns.length)),
  );

  return columns.map((column, index) => ({
    ...column,
    widthPercent: widths[index],
  }));
}

export function normalizeColumnConfigs(columns: readonly ColumnConfig[]): ColumnConfig[] {
  const cleaned: ColumnConfig[] = [];
  const seenPanels = new Set<ColumnPanelId>();

  for (const column of columns) {
    if (!isColumnPanelId(column.panelId) || seenPanels.has(column.panelId)) {
      continue;
    }

    seenPanels.add(column.panelId);
    cleaned.push({
      id:
        typeof column.id === "string" && column.id.length > 0
          ? column.id
          : `legacy-col-${cleaned.length + 1}`,
      panelId: column.panelId,
      widthPercent: sanitizeWidthPercent(column.widthPercent) ?? undefined,
    });

    if (cleaned.length >= MAX_COLUMNS) {
      break;
    }
  }

  const sourceColumns = cleaned.length > 0 ? cleaned : DEFAULT_COLUMN_LAYOUT.columns;
  const normalizedWidths = normalizeWidthPercents(
    sourceColumns.map((column) => column.widthPercent),
  );

  return sourceColumns.map((column, index) => ({
    ...column,
    widthPercent: normalizedWidths[index],
  }));
}

export function normalizeColumnLayoutState(
  state: Partial<ColumnLayoutState> | null | undefined,
): ColumnLayoutState {
  return {
    enabled: Boolean(state?.enabled),
    columns: normalizeColumnConfigs(Array.isArray(state?.columns) ? state.columns : []),
  };
}

export function areColumnLayoutStatesEqual(
  left: ColumnLayoutState,
  right: ColumnLayoutState,
): boolean {
  if (left.enabled !== right.enabled || left.columns.length !== right.columns.length) {
    return false;
  }

  return left.columns.every((column, index) => {
    const other = right.columns[index];
    return (
      column.id === other.id
      && column.panelId === other.panelId
      && roundPercent(column.widthPercent ?? 0) === roundPercent(other.widthPercent ?? 0)
    );
  });
}

export function getAvailableColumnPanelIds(
  columns: readonly ColumnConfig[],
  currentColumnId?: string,
): ColumnPanelId[] {
  const selectedElsewhere = new Set<ColumnPanelId>();

  for (const column of columns) {
    if (column.id === currentColumnId) continue;
    selectedElsewhere.add(column.panelId);
  }

  return ALL_PANEL_IDS.filter((panelId) => !selectedElsewhere.has(panelId));
}

export function getMinColumnLayoutWidth(columnCount: number): number {
  if (columnCount <= 0) return 0;

  return (columnCount * MIN_COLUMN_WIDTH)
    + (Math.max(0, columnCount - 1) * COLUMN_RESIZE_HANDLE_WIDTH);
}

export function getMaxColumnsForWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;

  const widthBound = Math.floor(
    (width + COLUMN_RESIZE_HANDLE_WIDTH) / (MIN_COLUMN_WIDTH + COLUMN_RESIZE_HANDLE_WIDTH),
  );

  return Math.max(0, Math.min(widthBound, MAX_COLUMNS, ALL_PANEL_IDS.length));
}

export function canRenderColumnLayout(columnCount: number, width: number): boolean {
  return getMaxColumnsForWidth(width) >= columnCount;
}

export function clampColumnPairPercents({
  leftPx,
  rightPx,
  leftPercent,
  rightPercent,
  nextLeftPx,
  minWidthPx = MIN_COLUMN_WIDTH,
}: {
  leftPx: number;
  rightPx: number;
  leftPercent: number;
  rightPercent: number;
  nextLeftPx: number;
  minWidthPx?: number;
}): { left: number; right: number } {
  const combinedPx = leftPx + rightPx;
  const combinedPercent = leftPercent + rightPercent;

  if (combinedPx <= 0 || combinedPercent <= 0) {
    return { left: leftPercent, right: rightPercent };
  }

  const minPx = Math.min(minWidthPx, combinedPx / 2);
  const clampedLeftPx = Math.max(minPx, Math.min(combinedPx - minPx, nextLeftPx));
  const ratio = clampedLeftPx / combinedPx;

  return {
    left: roundPercent(combinedPercent * ratio),
    right: roundPercent(combinedPercent * (1 - ratio)),
  };
}
