"use client";

import { useTranslations } from "next-intl";
import { SAVED_SORTS, type SavedSort } from "@/lib/saved/query";

export type SavedDensity = "grid" | "table";

export interface SavedToolbarState {
  search: string;
  sort: SavedSort;
  tags: string[];
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function DensityIcon({ kind }: { kind: SavedDensity }) {
  return kind === "grid" ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/**
 * Search + sort + tag filter (+ density and selection on the desktop surface).
 * Shared by the desktop Saved view and the mobile library sheet so the two
 * behave identically; `density` and `selection` are simply omitted on mobile.
 */
export function SavedToolbar({
  state,
  onChange,
  availableTags,
  density,
  onSetDensity,
  selecting,
  onToggleSelecting,
  compact,
}: {
  state: SavedToolbarState;
  onChange: (patch: Partial<SavedToolbarState>) => void;
  availableTags: string[];
  density?: SavedDensity;
  onSetDensity?: (density: SavedDensity) => void;
  selecting?: boolean;
  onToggleSelecting?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const controlStyle: React.CSSProperties = {
    height: compact ? 34 : 36,
    border: "1px solid var(--border-faint)",
    background: "var(--surface)",
    color: "var(--foreground)",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label
          className="flex items-center gap-2 rounded-button px-3 flex-1"
          style={{ ...controlStyle, minWidth: 160 }}
        >
          <span className="flex text-muted" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={state.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder={t("saved.searchPlaceholder")}
            aria-label={t("saved.searchPlaceholder")}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-faint"
          />
        </label>

        <label className="flex items-center gap-1.5 rounded-button px-2.5" style={controlStyle}>
          <span className="text-[10px] font-bold text-muted uppercase" style={{ letterSpacing: 0.8 }}>
            {t("saved.sortLabel")}
          </span>
          <select
            value={state.sort}
            onChange={(e) => onChange({ sort: e.target.value as SavedSort })}
            aria-label={t("saved.sortLabel")}
            className="bg-transparent outline-none text-[12.5px] font-semibold text-foreground cursor-pointer"
          >
            {SAVED_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`saved.sort.${sort}`)}
              </option>
            ))}
          </select>
        </label>

        {density && onSetDensity && (
          <div className="flex gap-0.5 rounded-button" style={{ ...controlStyle, padding: 3 }}>
            {(["grid", "table"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onSetDensity(kind)}
                aria-pressed={density === kind}
                title={t(`saved.view.${kind}`)}
                aria-label={t(`saved.view.${kind}`)}
                className="flex items-center justify-center rounded-lg cursor-pointer"
                style={{
                  width: 30,
                  background: density === kind ? "var(--surface-inset)" : "transparent",
                  color: density === kind ? "var(--foreground)" : "var(--muted)",
                }}
              >
                <DensityIcon kind={kind} />
              </button>
            ))}
          </div>
        )}

        {onToggleSelecting && (
          <button
            type="button"
            onClick={onToggleSelecting}
            aria-pressed={selecting}
            className="rounded-button px-3 text-[12px] font-bold cursor-pointer whitespace-nowrap"
            style={{
              ...controlStyle,
              background: selecting ? "var(--accent-surface)" : "var(--surface)",
              color: selecting ? "var(--accent-text)" : "var(--muted)",
              borderColor: selecting ? "var(--accent-border)" : "var(--border-faint)",
            }}
          >
            {selecting ? t("common.done") : t("saved.select")}
          </button>
        )}
      </div>

      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {availableTags.map((tag) => {
            const on = state.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  onChange({
                    tags: on ? state.tags.filter((x) => x !== tag) : [...state.tags, tag],
                  })
                }
                aria-pressed={on}
                className="font-mono text-[11px] font-bold rounded-full cursor-pointer"
                style={{
                  padding: "3px 10px",
                  border: `1px solid ${on ? "var(--accent-border)" : "var(--border-faint)"}`,
                  background: on ? "var(--accent-surface)" : "var(--surface)",
                  color: on ? "var(--accent-text)" : "var(--muted)",
                }}
              >
                {tag}
              </button>
            );
          })}
          {state.tags.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ tags: [] })}
              className="text-[11px] font-bold text-muted cursor-pointer bg-transparent border-0 px-1"
            >
              {t("saved.clearTags")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Bulk action bar shown while entries are selected. */
export function SavedBulkBar({
  count,
  onCompare,
  onDelete,
  onClear,
}: {
  count: number;
  onCompare: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("command");
  const btn =
    "rounded-[10px] px-3 h-8 text-[12px] font-bold cursor-pointer whitespace-nowrap";
  return (
    <div
      className="flex items-center gap-2 flex-wrap rounded-button"
      style={{
        padding: "8px 12px",
        background: "var(--accent-surface)",
        border: "1px solid var(--accent-border)",
      }}
    >
      <span className="text-[12px] font-bold" style={{ color: "var(--accent-text)" }}>
        {t("saved.selectedCount", { count })}
      </span>
      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onCompare}
          className={btn}
          style={{ border: "1px solid var(--border-faint)", background: "var(--surface)", color: "var(--foreground)" }}
        >
          {t("common.compare")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={btn}
          style={{ border: "1px solid var(--red-border)", background: "var(--red-surface)", color: "var(--red-text)" }}
        >
          {t("common.delete")}
        </button>
        <button
          type="button"
          onClick={onClear}
          className={`${btn} bg-transparent`}
          style={{ border: "1px solid transparent", color: "var(--muted)" }}
        >
          {t("common.cancel")}
        </button>
      </span>
    </div>
  );
}
