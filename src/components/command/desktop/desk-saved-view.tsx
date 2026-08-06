"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import type { LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import { collectSavedTags, filterSortSaved, type SavedSort } from "@/lib/saved/query";
import { EmptyState } from "../empty-state";
import { buildSavedCardModel } from "../saved/saved-model";
import { SavedCard, SavedTableRow, type SavedCardActions } from "../saved/saved-card";
import {
  SavedBulkBar,
  SavedToolbar,
  type SavedDensity,
  type SavedToolbarState,
} from "../saved/saved-toolbar";
import { DeskTopbar } from "./desk-sidebar";
import { DeskIcon, Kbd } from "./desk-atoms";

export function DeskSavedView({
  saved,
  settings,
  defaultUnit,
  mode,
  onPick,
  onAddCompare,
  onRemove,
  onRemoveMany,
  onDuplicate,
  onTogglePin,
  onEdit,
  onNew,
}: {
  saved: SavedEntry[];
  settings: CommandParserSettings;
  defaultUnit: LengthUnit;
  mode: "weight" | "price";
  onPick: (entry: SavedEntry) => void;
  onAddCompare: (entry: SavedEntry) => void;
  onRemove: (entry: SavedEntry) => void;
  onRemoveMany: (entries: SavedEntry[]) => void;
  onDuplicate: (entry: SavedEntry) => void;
  onTogglePin: (entry: SavedEntry) => void;
  onEdit: (entry: SavedEntry) => void;
  onNew: () => void;
}) {
  const t = useTranslations("command");
  const [query, setQuery] = useState<SavedToolbarState>({
    search: "",
    sort: "recent" as SavedSort,
    tags: [],
  });
  const [density, setDensity] = useState<SavedDensity>("grid");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const tags = useMemo(() => collectSavedTags(saved), [saved]);
  const visible = useMemo(() => filterSortSaved(saved, query), [saved, query]);
  const models = useMemo(
    () => visible.map((entry) => buildSavedCardModel(entry, settings, defaultUnit)),
    [visible, settings, defaultUnit],
  );

  const selectedEntries = useMemo(
    () => saved.filter((entry) => selected.includes(entry.id)),
    [saved, selected],
  );

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const actionsFor = (entry: SavedEntry): SavedCardActions => ({
    onOpen: () => onPick(entry),
    onCompare: () => onAddCompare(entry),
    onDuplicate: () => onDuplicate(entry),
    onTogglePin: () => onTogglePin(entry),
    onEdit: () => onEdit(entry),
    onRemove: () => onRemove(entry),
    selected: selecting ? selected.includes(entry.id) : undefined,
    onToggleSelect: selecting
      ? () =>
          setSelected((current) =>
            current.includes(entry.id)
              ? current.filter((id) => id !== entry.id)
              : [...current, entry.id],
          )
      : undefined,
  });

  const filtering = query.search.trim() !== "" || query.tags.length > 0;

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.saved")}
        subtitle={
          saved.length
            ? t("saved.subtitleCount", { count: saved.length })
            : t("saved.subtitleEmpty")
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ padding: "20px 32px 32px" }}>
        {saved.length === 0 ? (
          <EmptyState
            icon={<DeskIcon name="saved" />}
            title={t("saved.emptyTitle")}
            body={t("saved.emptyBody")}
            action={
              <button
                type="button"
                onClick={onNew}
                className="inline-flex items-center gap-2 rounded-[11px] font-bold text-[13px] cursor-pointer"
                style={{
                  padding: "9px 15px",
                  border: "1px solid var(--border-faint)",
                  background: "var(--surface)",
                  color: "var(--foreground)",
                }}
              >
                <Kbd>⌘K</Kbd>
                {t("common.newCalculation")}
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3" style={{ maxWidth: 1180 }}>
            <SavedToolbar
              state={query}
              onChange={(patch) => setQuery((current) => ({ ...current, ...patch }))}
              availableTags={tags}
              density={density}
              onSetDensity={setDensity}
              selecting={selecting}
              onToggleSelecting={() => (selecting ? stopSelecting() : setSelecting(true))}
            />

            {selecting && selected.length > 0 && (
              <SavedBulkBar
                count={selected.length}
                onCompare={() => {
                  for (const entry of selectedEntries) onAddCompare(entry);
                  stopSelecting();
                }}
                onDelete={() => {
                  onRemoveMany(selectedEntries);
                  stopSelecting();
                }}
                onClear={stopSelecting}
              />
            )}

            {models.length === 0 ? (
              <EmptyState
                compact
                title={t("saved.noMatchTitle")}
                body={t("saved.noMatchBody")}
                action={
                  <button
                    type="button"
                    onClick={() => setQuery({ search: "", sort: query.sort, tags: [] })}
                    className="rounded-[10px] px-3.5 h-9 text-[12.5px] font-bold cursor-pointer"
                    style={{
                      border: "1px solid var(--border-faint)",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                    }}
                  >
                    {t("saved.clearFilters")}
                  </button>
                }
              />
            ) : density === "grid" ? (
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
                  // Expanding one card must not stretch its neighbours.
                  alignItems: "start",
                }}
              >
                {models.map((model) => (
                  <SavedCard
                    key={model.entry.id}
                    model={model}
                    mode={mode}
                    actions={actionsFor(model.entry)}
                  />
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid var(--border-faint)",
                  background: "var(--surface)",
                  boxShadow: "var(--panel-shadow-soft)",
                }}
              >
                {models.map((model) => (
                  <SavedTableRow
                    key={model.entry.id}
                    model={model}
                    actions={actionsFor(model.entry)}
                  />
                ))}
              </div>
            )}

            {filtering && models.length > 0 && (
              <span className="font-mono text-[11px] text-muted-faint">
                {t("saved.matchCount", { count: models.length, total: saved.length })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
