"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { SwipeActionItem } from "@/components/ui/swipe-action-item";
import {
  formatStaticNumber,
  getWorkspacePanelSpacing,
  type WorkspacePanelLayout,
} from "@/components/ui/result-style";
import { triggerHaptic } from "@/lib/haptics";

function categoryStyle(category: string): { iconBg: string; badge: string } {
  switch (category) {
    case "tubes":
      return {
        iconBg: "bg-blue-surface text-blue-text",
        badge: "bg-blue-surface text-blue-text border border-blue-border",
      };
    case "plates_sheets":
      return {
        iconBg: "bg-amber-surface text-amber-text",
        badge: "bg-amber-surface text-amber-text border border-amber-border",
      };
    case "structural":
      return {
        iconBg: "bg-green-surface text-green-text",
        badge: "bg-green-surface text-green-text border border-green-border",
      };
    default:
      return {
        iconBg: "bg-purple-surface text-purple-text",
        badge: "bg-purple-surface text-purple-text border border-purple-border",
      };
  }
}

interface TemplatesPanelProps {
  saved: SavedEntry[];
  projectOptions: Array<{ id: string; name: string }>;
  onLoad: (entry: SavedEntry) => void;
  onRemove: (id: string) => void;
  onRemoveMany: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  onDuplicateMany: (ids: string[]) => void;
  onAddToProject: (entry: SavedEntry, overrides: { quantityMultiplier: number; projectId?: string }) => void;
  onRemovePart: (entry: SavedEntry, partId: string) => void;
  onReorderPart: (entry: SavedEntry, partId: string, direction: -1 | 1) => void;
  onUpdate: (id: string, patch: { name?: string; notes?: string; tags?: string[] }) => void;
  layout?: WorkspacePanelLayout;
}

export const TemplatesPanel = memo(function TemplatesPanel({
  saved,
  projectOptions,
  onLoad,
  onRemove,
  onRemoveMany,
  onDuplicate,
  onDuplicateMany,
  onAddToProject,
  onRemovePart,
  onReorderPart,
  onUpdate,
  layout = "drawer",
}: TemplatesPanelProps) {
  const t = useTranslations("saved");
  const labelSelectMode = t("selectMode");
  const labelCancelSelection = t("cancelSelection");
  const labelSelectAllShown = t("selectAllShown");
  const labelClearSelection = t("clearSelection");
  const labelBulkDuplicate = t("bulkDuplicate");
  const labelBulkDelete = t("bulkDelete");
  const labelNoMatches = t("noMatches");
  const spacing = getWorkspacePanelSpacing(layout);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "used" | "popular">("recent");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredSaved = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = saved.filter((entry) => {
      if (!normalizedQuery) return true;
      const haystack = [
        entry.name,
        entry.notes,
        entry.normalizedProfile.shortLabel,
        entry.result.gradeLabel,
        ...(entry.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const sorted = [...next];
    if (sortBy === "popular") {
      sorted.sort((a, b) => {
        if (b.useCount !== a.useCount) return b.useCount - a.useCount;
        return (Date.parse(b.lastUsedAt ?? b.timestamp) || 0) - (Date.parse(a.lastUsedAt ?? a.timestamp) || 0);
      });
    } else if (sortBy === "used") {
      sorted.sort(
        (a, b) => (Date.parse(b.lastUsedAt ?? b.timestamp) || 0) - (Date.parse(a.lastUsedAt ?? a.timestamp) || 0),
      );
    } else {
      sorted.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
    }

    return sorted;
  }, [query, saved, sortBy]);

  const validSelectedIds = useMemo(() => {
    if (selectedIds.size === 0) return new Set<string>();
    const available = new Set(saved.map((entry) => entry.id));
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (available.has(id)) next.add(id);
    }
    return next;
  }, [saved, selectedIds]);

  const selectedCount = validSelectedIds.size;
  const allVisibleSelected = filteredSaved.length > 0 && filteredSaved.every((entry) => validSelectedIds.has(entry.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const entry of filteredSaved) next.delete(entry.id);
      } else {
        for (const entry of filteredSaved) next.add(entry.id);
      }
      return next;
    });
  };

  const selectedIdList = Array.from(validSelectedIds);

  const handleBulkDuplicate = () => {
    if (selectedIdList.length === 0) return;
    onDuplicateMany(selectedIdList);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkDelete = () => {
    if (selectedIdList.length === 0) return;
    onRemoveMany(selectedIdList);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  if (saved.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-2 px-4 py-4 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset text-muted-faint">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5"
          >
            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </span>
        <p className="text-sm font-medium text-foreground-secondary">{t("emptyTitle")}</p>
        <p className="text-xs text-muted-faint">{t("emptySubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 rounded-xl border border-border bg-surface-raised/50 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectionMode) {
                setSelectionMode(false);
                setSelectedIds(new Set());
              } else {
                setSelectionMode(true);
              }
            }}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground-secondary transition-colors hover:bg-surface"
          >
            {selectionMode ? labelCancelSelection : labelSelectMode}
          </button>

          {selectionMode && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface"
              >
                {allVisibleSelected ? labelClearSelection : labelSelectAllShown}
              </button>
              {layout !== "mobile" && (
                <>
                  <button
                    type="button"
                    disabled={selectedCount === 0}
                    onClick={handleBulkDuplicate}
                    className="rounded-lg border border-blue-border bg-blue-surface px-2 py-1 text-xs font-semibold text-blue-text transition-colors hover:bg-blue-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {labelBulkDuplicate}
                  </button>
                  <button
                    type="button"
                    disabled={selectedCount === 0}
                    onClick={handleBulkDelete}
                    className="rounded-lg border border-red-border bg-red-surface px-2 py-1 text-xs font-semibold text-red-interactive transition-colors hover:bg-red-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {labelBulkDelete}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-faint focus:border-blue-border"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "recent" | "used" | "popular")}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-blue-border sm:w-45"
          >
            <option value="recent">{t("sort.recent")}</option>
            <option value="used">{t("sort.lastUsed")}</option>
            <option value="popular">{t("sort.mostUsed")}</option>
          </select>
        </div>

        <p className="text-xs text-muted-faint">
          {selectionMode
            ? t("selectedCount", { count: selectedCount })
            : t("summary", { total: saved.length, shown: filteredSaved.length })}
        </p>
      </div>

      {filteredSaved.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {labelNoMatches}
        </div>
      ) : (
        <ul className={`grid ${spacing.listGap} ${selectionMode && layout === "mobile" ? "pb-20" : ""}`}>
          {filteredSaved.map((entry) => (
            <SwipeActionItem
              key={entry.id}
              onSwipeLeft={() => {
                if (selectionMode) return;
                triggerHaptic("light");
                onRemove(entry.id);
              }}
              leftLabel={t("remove")}
            >
              <TemplateItem
                entry={entry}
                onLoad={onLoad}
                onRemove={() => onRemove(entry.id)}
                onDuplicate={() => onDuplicate(entry.id)}
                onAddToProject={(overrides) => onAddToProject(entry, overrides)}
                onRemovePart={(partId) => onRemovePart(entry, partId)}
                onReorderPart={(partId, direction) => onReorderPart(entry, partId, direction)}
                projectOptions={projectOptions}
                onUpdate={(patch) => onUpdate(entry.id, patch)}
                selectionMode={selectionMode}
                selected={validSelectedIds.has(entry.id)}
                onToggleSelect={() => toggleSelected(entry.id)}
                layout={layout}
              />
            </SwipeActionItem>
          ))}
        </ul>
      )}

      {selectionMode && layout === "mobile" && (
        <div className="sticky bottom-0 z-10 rounded-xl border border-border bg-surface/95 p-2 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleBulkDuplicate}
              className="rounded-lg border border-blue-border bg-blue-surface px-3 py-2 text-xs font-semibold text-blue-text transition-colors hover:bg-blue-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labelBulkDuplicate}
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleBulkDelete}
              className="rounded-lg border border-red-border bg-red-surface px-3 py-2 text-xs font-semibold text-red-interactive transition-colors hover:bg-red-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labelBulkDelete}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

interface TemplateItemProps {
  entry: SavedEntry;
  projectOptions: Array<{ id: string; name: string }>;
  onLoad: (entry: SavedEntry) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onAddToProject: (overrides: { quantityMultiplier: number; projectId?: string }) => void;
  onRemovePart: (partId: string) => void;
  onReorderPart: (partId: string, direction: -1 | 1) => void;
  onUpdate: (patch: { name?: string; notes?: string; tags?: string[] }) => void;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  layout: WorkspacePanelLayout;
}


const TemplateItem = memo(function TemplateItem({
  entry,
  projectOptions,
  onLoad,
  onRemove,
  onDuplicate,
  onAddToProject,
  onRemovePart,
  onReorderPart,
  onUpdate,
  selectionMode,
  selected,
  onToggleSelect,
  layout,
}: TemplateItemProps) {
  const locale = useLocale();
  const tBase = useTranslations();
  const tSaved = useTranslations("saved");
  const tResult = useTranslations("result");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(entry.name);
  const [editNotes, setEditNotes] = useState(entry.notes ?? "");
  const [editTags, setEditTags] = useState((entry.tags ?? []).join(", "));
  const [partQuantityMultiplier, setPartQuantityMultiplier] = useState(1);
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);

  const gradeLabel = resolveGradeLabel(entry.result.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[entry.result.currency];
  const styles = categoryStyle(entry.normalizedProfile.iconKey);
  const profileSummary = gradeLabel
    ? `${entry.normalizedProfile.shortLabel} · ${gradeLabel}`
    : entry.normalizedProfile.shortLabel;

  function parseTagInput(value: string): string[] {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  function handleSaveEdit() {
    const name = editName.trim();
    if (name) {
      onUpdate({
        name,
        notes: editNotes.trim() || undefined,
        tags: parseTagInput(editTags),
      });
    }
    setEditing(false);
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className={layout === "drawer" ? "px-3 py-2.5" : "px-3 py-2"}>
        {/* Header row: icon + name + actions */}
        <div className="flex items-center gap-2.5">
          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelect}
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${selected ? "border-accent bg-accent text-white" : "border-border bg-surface text-transparent hover:bg-surface-raised"}`}
              aria-label={tSaved("selectRow")}
              aria-pressed={selected}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.312a1 1 0 0 1-1.42-.003L3.29 9.228a1 1 0 1 1 1.42-1.406l4.039 4.08 6.54-6.606a1 1 0 0 1 1.415-.006Z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
            <ProfileIcon category={entry.normalizedProfile.iconKey} className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
            <p className="truncate text-xs text-muted">{profileSummary}</p>
          </div>

          {!selectionMode && (
            <button
              type="button"
              onClick={() => onLoad(entry)}
              className="shrink-0 rounded-lg border border-blue-border bg-blue-surface px-2.5 py-1.5 text-2xs font-semibold text-blue-text transition-colors hover:bg-blue-surface/80"
            >
              {tSaved("useTemplate")}
            </button>
          )}
        </div>

        {/* Key metrics - compact inline row */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="font-semibold text-foreground tabular-nums">
            {formatStaticNumber(entry.result.totalWeightKg)} <span className="font-medium text-muted">kg</span>
          </span>
          <span className="text-border-strong">·</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatStaticNumber(entry.result.grandTotalAmount)} <span className="font-medium text-muted">{currency}</span>
          </span>
          <span className="text-border-strong">·</span>
          <span className="text-muted">
            {entry.parts.length} {entry.parts.length === 1 ? "part" : "parts"}
          </span>
          {entry.useCount > 0 && (
            <>
              <span className="text-border-strong">·</span>
              <span className="text-muted-faint">{entry.useCount}x used</span>
            </>
          )}
        </div>

        {/* Tags */}
        {(entry.tags?.length ?? 0) > 0 && !editing && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(entry.tags ?? []).map((tag) => (
              <span key={tag} className={`rounded-md px-1.5 py-0.5 text-2xs font-medium ${styles.badge}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {entry.notes && !editing && (
          <p className="mt-1.5 text-xs italic text-muted-faint line-clamp-2">{entry.notes}</p>
        )}

        {/* Action row */}
        {!editing && !selectionMode && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-border-faint pt-2">
            {/* Add to project - compact inline */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={partQuantityMultiplier}
                onChange={(event) => setPartQuantityMultiplier(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                className="w-12 rounded-md border border-border bg-surface px-1.5 py-1 text-center text-xs tabular-nums text-foreground outline-none focus:border-blue-border"
                title={tSaved("quantityMultiplier")}
              />
              <span className="text-2xs text-muted-faint">x</span>
              <select
                value={targetProjectId}
                onChange={(event) => setTargetProjectId(event.target.value)}
                className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-foreground outline-none focus:border-blue-border"
                title={tSaved("targetProject")}
              >
                <option value="">{tSaved("autoProject")}</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onAddToProject({
                  quantityMultiplier: partQuantityMultiplier,
                  projectId: targetProjectId || undefined,
                })}
                className="shrink-0 rounded-md border border-purple-border bg-purple-surface px-2 py-1 text-2xs font-semibold text-purple-text transition-colors hover:bg-purple-surface/80"
              >
                {tSaved("addToProject")}
              </button>
            </div>

            {/* Secondary actions */}
            <div className="flex shrink-0 items-center gap-0.5">
              <IconButton title={tSaved("duplicate")} onClick={onDuplicate}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </IconButton>
              <IconButton
                title={tSaved("edit")}
                onClick={() => {
                  setEditName(entry.name);
                  setEditNotes(entry.notes ?? "");
                  setEditTags((entry.tags ?? []).join(", "));
                  setEditing((value) => !value);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              </IconButton>
              {entry.parts.length > 1 && (
                <IconButton
                  title={tSaved("templateBuilder")}
                  onClick={() => setShowDetails((v) => !v)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${showDetails ? "rotate-90" : ""}`}>
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </IconButton>
              )}
              <IconButton
                title={tSaved("remove")}
                tone="danger"
                onClick={() => {
                  triggerHaptic("light");
                  onRemove();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                </svg>
              </IconButton>
            </div>
          </div>
        )}

        {/* Expandable parts list */}
        {!editing && showDetails && entry.parts.length > 1 && (
          <div className="mt-2 grid gap-1">
            {entry.parts.map((part, index) => (
              <div key={part.id} className="flex items-center gap-2 rounded-lg border border-border-faint bg-surface-raised px-2 py-1.5">
                <span className="text-2xs font-medium text-muted-faint">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xs font-semibold text-foreground">{part.name}</p>
                  <p className="text-2xs text-muted-faint">{part.normalizedProfile.shortLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-2xs text-muted tabular-nums">
                  <span>{formatStaticNumber(part.result.totalWeightKg)} kg</span>
                  <span>{formatStaticNumber(part.result.grandTotalAmount)} {CURRENCY_SYMBOLS[part.result.currency]}</span>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton title={tSaved("moveUp")} onClick={() => onReorderPart(part.id, -1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M9.47 4.22a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 1 1-1.06 1.06L10 5.81 6.03 9.78a.75.75 0 0 1-1.06-1.06l4.5-4.5Z" clipRule="evenodd" /></svg>
                  </IconButton>
                  <IconButton title={tSaved("moveDown")} onClick={() => onReorderPart(part.id, 1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M10.53 15.78a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L10 14.19l3.97-3.97a.75.75 0 1 1 1.06 1.06l-4.5 4.5Z" clipRule="evenodd" /></svg>
                  </IconButton>
                  <IconButton title={tSaved("removePart")} tone="danger" onClick={() => onRemovePart(part.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5z" clipRule="evenodd" /></svg>
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="mt-2 grid gap-2">
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-lg border border-blue-border bg-surface px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-blue-strong"
              maxLength={80}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveEdit();
                if (event.key === "Escape") setEditing(false);
              }}
            />
            <textarea
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
              rows={2}
              placeholder={tSaved("notesPlaceholder")}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-faint outline-none focus:border-blue-border"
              maxLength={200}
            />
            <input
              type="text"
              value={editTags}
              onChange={(event) => setEditTags(event.target.value)}
              placeholder={tSaved("tagsPlaceholder")}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-faint outline-none focus:border-blue-border"
              maxLength={140}
            />
            <div className="flex gap-3">
              <button type="button" onClick={handleSaveEdit} className="text-xs font-medium text-blue-strong">
                {tSaved("editSave")}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs font-medium text-muted">
                {tSaved("editCancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
});

function IconButton({
  children,
  title,
  tone = "default",
  onClick,
}: {
  children: ReactNode;
  title: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "danger"
          ? "rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
          : "rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
      }
      title={title}
    >
      {children}
    </button>
  );
}
