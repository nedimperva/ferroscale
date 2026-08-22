"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, cmdParse, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import type { LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import { collectSavedTags, filterSortSaved, type SavedSort } from "@/lib/saved/query";
import { buildSavedCardModel, type SavedCardModel } from "../saved/saved-model";
import { PinIcon, SavedCard, SavedThumb, type SavedCardActions } from "../saved/saved-card";
import {
  SavedBulkBar,
  SavedToolbar,
  type SavedDensity,
  type SavedToolbarState,
} from "../saved/saved-toolbar";
import { EmptyState } from "../empty-state";
import { RowMenu } from "../row-menu";
import { DeskIcon, Kbd } from "../desktop/desk-atoms";

/**
 * Parts (2e) — what "Saved" becomes once it has a job.
 *
 * Saved was a pile of past results sorted by when you happened to press Save.
 * The things people actually re-run are specs (a section at a grade) and
 * assemblies (a gate frame, a railing bay), and the useful question about one
 * is "how often do I reach for this", not "when did I bookmark it". So the
 * surface splits along that line — Parts, Assemblies, History — leads with the
 * pinned few, and leads every row with a Use button.
 *
 * Nothing about the data changed: `pinned`, `useCount`, `lastUsedAt` and
 * multi-part entries were all already there and mostly unsurfaced.
 */

export type PartsTab = "parts" | "assemblies" | "history";

export interface PartsActions {
  onPick: (entry: SavedEntry) => void;
  onAddCompare: (entry: SavedEntry) => void;
  onRemove: (entry: SavedEntry) => void;
  onRemoveMany?: (entries: SavedEntry[]) => void;
  onDuplicate: (entry: SavedEntry) => void;
  onTogglePin: (entry: SavedEntry) => void;
  onEdit: (entry: SavedEntry) => void;
  onAddPart?: (entry: SavedEntry) => void;
  onRemovePart: (entry: SavedEntry, partId: string) => void;
  /** Put this part (or the whole assembly) into a project. */
  onAddToProject: (entry: SavedEntry) => void;
  onLoadQuery: (query: string) => void;
  onRemoveHistoryEntry: (query: string) => void;
  onClearHistory: () => void;
  onNew?: () => void;
}

/** An entry with more than one part is an assembly; the rest are parts. */
function isAssembly(entry: SavedEntry): boolean {
  return entry.parts.length > 1;
}

function TabPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[9px] cursor-pointer whitespace-nowrap"
      style={{
        padding: "7px 14px",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted)",
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
      }}
    >
      {label}
      {count != null && <span className="font-mono text-[11px] text-muted">{count}</span>}
    </button>
  );
}

function PinnedCard({
  model,
  onUse,
  onUnpin,
}: {
  model: SavedCardModel;
  onUse: () => void;
  onUnpin: () => void;
}) {
  const t = useTranslations("command");
  const { entry } = model;
  return (
    <div
      className="flex flex-col gap-2 rounded-[15px] min-w-0"
      style={{
        padding: "12px 14px",
        border: "1px solid var(--accent-border)",
        background: "var(--surface)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onUnpin}
          aria-label={t("saved.unpin")}
          title={t("saved.unpin")}
          className="flex flex-shrink-0 border-0 bg-transparent p-0 cursor-pointer"
          style={{ color: "var(--accent)" }}
        >
          <PinIcon filled />
        </button>
        <span className="flex-1 min-w-0 font-extrabold text-[15px] text-foreground truncate">
          {entry.name.trim() || model.specLabel}
        </span>
      </div>
      <div className="font-mono text-[11.5px] text-muted truncate">
        {[model.parsed?.gradeLabel ?? entry.result.gradeLabel, model.kgm != null ? `${model.kgm.toFixed(2)} kg/m` : null]
          .filter(Boolean)
          .join(" · ")}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11.5px] text-muted-faint flex-1 min-w-0 truncate">
          {t("saved.usedCount", { count: entry.useCount })}
        </span>
        <button
          type="button"
          onClick={onUse}
          className="rounded-[9px] font-bold text-[12px] cursor-pointer flex-shrink-0"
          style={{
            padding: "5px 13px",
            border: "1px solid var(--accent-border)",
            background: "var(--accent-surface)",
            color: "var(--accent-text)",
          }}
        >
          {t("parts.use")}
        </button>
      </div>
    </div>
  );
}

function PartsRow({
  model,
  actions,
  compact,
}: {
  model: SavedCardModel;
  actions: PartsActions;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const { entry } = model;
  const assembly = isAssembly(entry);

  const useButton = (
    <button
      type="button"
      onClick={() => actions.onPick(entry)}
      aria-label={t("parts.useAria", { name: entry.name })}
      className="rounded-[9px] font-bold text-[12px] cursor-pointer flex-shrink-0"
      style={{
        padding: "6px 13px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
        color: "var(--foreground)",
      }}
    >
      {t("parts.use")}
    </button>
  );

  const menu = (
    <RowMenu
      ariaLabel={entry.name}
      items={[
        {
          id: "pin",
          label: entry.pinned ? t("saved.unpin") : t("saved.pin"),
          onSelect: () => actions.onTogglePin(entry),
        },
        {
          id: "project",
          label: t("common.addProjectLong"),
          onSelect: () => actions.onAddToProject(entry),
        },
        { id: "compare", label: t("saved.addToCompare"), onSelect: () => actions.onAddCompare(entry) },
        { id: "edit", label: t("saved.edit"), onSelect: () => actions.onEdit(entry) },
        { id: "duplicate", label: t("saved.duplicate"), onSelect: () => actions.onDuplicate(entry) },
        ...(actions.onAddPart
          ? [{ id: "addPart", label: t("saved.addPart"), onSelect: () => actions.onAddPart?.(entry) }]
          : []),
        {
          id: "remove",
          label: t("common.delete"),
          danger: true,
          onSelect: () => actions.onRemove(entry),
        },
      ]}
    />
  );

  const name = (
    <button
      type="button"
      role="cell"
      onClick={() => actions.onPick(entry)}
      aria-label={t("saved.openAria", { name: entry.name })}
      className="flex flex-1 min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left cursor-pointer"
    >
      <SavedThumb model={model} size={28} />
      {entry.pinned && (
        <span className="flex flex-shrink-0" style={{ color: "var(--accent)" }}>
          <PinIcon filled />
        </span>
      )}
      <span className="min-w-0 truncate font-bold text-[13.5px] text-foreground">
        {entry.name.trim() || model.specLabel}
      </span>
      {assembly && (
        <span
          className="font-mono text-[10px] font-bold rounded-full flex-shrink-0 whitespace-nowrap"
          style={{
            padding: "2px 8px",
            background: "var(--accent-surface)",
            color: "var(--accent-text)",
          }}
        >
          {t("parts.assemblyBadge", { count: entry.parts.length })}
        </span>
      )}
      {/* The row shows no money, so without this a re-priced entry would look
          identical to one whose rate never moved — the exact confusion the
          card view was built to end. */}
      {model.repriced && (
        <span
          title={t("saved.repricedHint")}
          className="font-mono text-[10.5px] flex-shrink-0 whitespace-nowrap"
          style={{ color: "var(--muted-faint)" }}
        >
          {t("saved.repriced", {
            amount: `${model.currencySymbol} ${fsMoney(model.storedAmount)}`,
          })}
        </span>
      )}
    </button>
  );

  // Per-metre is a property of a section cut to a length. An assembly has no
  // single section, and a plate has no length, so both report total mass
  // instead — with the unit spelled out, since the column header no longer
  // describes them.
  // An assembly's "spec" is the sections it is made of, not the first part's
  // command line — that read as if the whole thing were one RHS.
  const specText = assembly
    ? model.parts.map((part) => part.specLabel.split(" ")[0]).join(" + ")
    : model.query || model.specLabel;

  const perMetre = !assembly && model.kgm != null && (model.parsed?.lengthM ?? 0) > 0;
  const kgmText = perMetre
    ? model.kgm!.toFixed(2)
    : model.totalKg != null
      ? `${fsWeight(model.totalKg)} ${fsWeightUnit()}`
      : "—";

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 border-t border-border-faint first:border-t-0"
        style={{ padding: "10px 8px 10px 12px" }}
      >
        <button
          type="button"
          onClick={() => actions.onPick(entry)}
          className="flex min-w-0 flex-1 flex-col gap-0.5 border-0 bg-transparent p-0 text-left cursor-pointer"
        >
          <span className="flex min-w-0 items-center gap-2">
            <SavedThumb model={model} size={24} />
            <span className="min-w-0 truncate font-bold text-[13.5px] text-foreground">
              {entry.name.trim() || model.specLabel}
            </span>
          </span>
          <span className="font-mono text-[11.5px] text-muted truncate">
            {specText}
            <span className="font-bold" style={{ color: "var(--accent-text)" }}>
              {" · "}
              {kgmText}
            </span>
          </span>
        </button>
        {useButton}
        {menu}
      </div>
    );
  }

  return (
    <div
      role="row"
      className="flex items-center gap-3 border-t border-border-faint first:border-t-0"
      style={{ padding: "9px 14px" }}
    >
      {/* role=cell on the button itself keeps the layout; screen readers get
          the column structure without an extra wrapper per row. */}
      {name}
      <span
        role="cell"
        className="font-mono text-[12px] text-muted-faint truncate"
        style={{ width: 190 }}
      >
        {specText}
      </span>
      <span
        role="cell"
        className="font-mono text-[12.5px] font-bold text-right flex-shrink-0"
        style={{ width: 96, color: "var(--accent-text)" }}
      >
        {kgmText}
      </span>
      <span
        role="cell"
        className="font-mono text-[12px] text-muted text-right flex-shrink-0"
        style={{ width: 56 }}
      >
        {t("parts.usedTimes", { count: entry.useCount })}
      </span>
      <div role="cell" className="flex items-center gap-2 flex-shrink-0">
        {useButton}
        {menu}
      </div>
    </div>
  );
}

function HistoryTab({
  history,
  settings,
  actions,
  compact,
}: {
  history: string[];
  settings: CommandParserSettings;
  actions: PartsActions;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const sym = CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€";
  const rows = useMemo(
    () =>
      history
        .map((query) => ({ query, parsed: cmdParse(query, settings) }))
        .filter((row) => row.parsed.valid),
    [history, settings],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        compact={compact}
        title={t("parts.emptyHistoryTitle")}
        body={t("parts.emptyHistoryBody")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[12.5px] text-muted flex-1 min-w-0">
          {t("parts.historySubtitle")}
        </span>
        <button
          type="button"
          onClick={actions.onClearHistory}
          className="rounded-[10px] px-3 h-8 text-[12px] font-bold cursor-pointer flex-shrink-0"
          style={{
            border: "1px solid var(--border-faint)",
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          {t("parts.clearHistory")}
        </button>
      </div>
      <div
        className="rounded-panel-lg overflow-hidden"
        style={{
          border: "1px solid var(--border-faint)",
          background: "var(--surface)",
          boxShadow: "var(--panel-shadow-soft)",
        }}
      >
        {rows.map((row) => (
          <div
            key={row.query}
            className="flex items-center gap-3 border-t border-border-faint first:border-t-0"
            style={{ padding: "9px 14px" }}
          >
            <button
              type="button"
              onClick={() => actions.onLoadQuery(row.query)}
              className="flex-1 min-w-0 border-0 bg-transparent p-0 text-left cursor-pointer font-mono text-[13px] font-bold text-foreground truncate"
            >
              {row.query}
            </button>
            <span
              className="font-mono text-[12px] font-bold text-right flex-shrink-0"
              style={{ color: "var(--accent-text)" }}
            >
              {row.parsed.totalKg != null
                ? `${fsWeight(row.parsed.totalKg)} ${fsWeightUnit()}`
                : "—"}
            </span>
            {!compact && (
              <span
                className="font-mono text-[12px] text-right flex-shrink-0"
                style={{ width: 96, color: "var(--blue-text)" }}
              >
                {row.parsed.totalAmount != null ? `${sym} ${fsMoney(row.parsed.totalAmount)}` : "—"}
              </span>
            )}
            <button
              type="button"
              onClick={() => actions.onRemoveHistoryEntry(row.query)}
              aria-label={t("parts.removeFromHistory", { query: row.query })}
              className="flex items-center justify-center rounded-[9px] cursor-pointer flex-shrink-0 text-muted text-[15px] leading-none"
              style={{
                width: 28,
                height: 28,
                border: "1px solid var(--border-faint)",
                background: "var(--surface-raised)",
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartsView({
  saved,
  history,
  settings,
  defaultUnit,
  mode,
  actions,
  compact,
  initialTab,
}: {
  saved: SavedEntry[];
  history: string[];
  settings: CommandParserSettings;
  defaultUnit: LengthUnit;
  mode: "weight" | "price";
  actions: PartsActions;
  compact?: boolean;
  /** Force a tab; by default the surface opens on the first non-empty one. */
  initialTab?: PartsTab;
}) {
  const t = useTranslations("command");
  // Saving one assembly and landing on an empty Parts tab would read as "your
  // save did not work", so the opening tab follows what is actually there.
  const [tab, setTab] = useState<PartsTab>(
    () =>
      initialTab ??
      (saved.some((entry) => entry.parts.length <= 1)
        ? "parts"
        : saved.length > 0
          ? "assemblies"
          : "parts"),
  );
  const [query, setQuery] = useState<SavedToolbarState>({
    search: "",
    sort: "used" as SavedSort,
    tags: [],
  });
  // 2e's list is a table; the card grid stays a click away because it is the
  // only place an assembly's parts and a re-priced total are visible.
  const [density, setDensity] = useState<SavedDensity>("table");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const parts = useMemo(() => saved.filter((entry) => !isAssembly(entry)), [saved]);
  const assemblies = useMemo(() => saved.filter(isAssembly), [saved]);
  const scope = tab === "assemblies" ? assemblies : parts;

  const tags = useMemo(() => collectSavedTags(scope), [scope]);
  const visible = useMemo(() => filterSortSaved(scope, query), [scope, query]);
  const models = useMemo(
    () => visible.map((entry) => buildSavedCardModel(entry, settings, defaultUnit)),
    [visible, settings, defaultUnit],
  );
  const pinnedModels = useMemo(
    () => models.filter((model) => model.entry.pinned).slice(0, 4),
    [models],
  );

  const selectedEntries = useMemo(
    () => saved.filter((entry) => selected.includes(entry.id)),
    [saved, selected],
  );

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const cardActions = (entry: SavedEntry): SavedCardActions => ({
    onOpen: () => actions.onPick(entry),
    onCompare: () => actions.onAddCompare(entry),
    onAddToProject: () => actions.onAddToProject(entry),
    onDuplicate: () => actions.onDuplicate(entry),
    onTogglePin: () => actions.onTogglePin(entry),
    onEdit: () => actions.onEdit(entry),
    onAddPart: actions.onAddPart ? () => actions.onAddPart?.(entry) : undefined,
    onRemovePart: (partId: string) => actions.onRemovePart(entry, partId),
    onRemove: () => actions.onRemove(entry),
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

  const tabs = (
    <div
      role="tablist"
      aria-label={t("nav.parts")}
      className="flex gap-0.5 flex-shrink-0"
      style={{ background: "var(--surface-inset)", borderRadius: 11, padding: 3 }}
    >
      <TabPill
        active={tab === "parts"}
        label={t("parts.tabs.parts")}
        count={parts.length}
        onClick={() => setTab("parts")}
      />
      <TabPill
        active={tab === "assemblies"}
        label={t("parts.tabs.assemblies")}
        count={assemblies.length}
        onClick={() => setTab("assemblies")}
      />
      <TabPill
        active={tab === "history"}
        label={t("parts.tabs.history")}
        onClick={() => setTab("history")}
      />
    </div>
  );

  const emptyScope = scope.length === 0;
  const filtering = query.search.trim() !== "" || query.tags.length > 0;

  // Folding a second line into a part turns it into an assembly, which moves
  // it to the other tab. Saying where it went beats leaving a blank screen —
  // and beats moving the user there without asking.
  const siblingTab: PartsTab = tab === "assemblies" ? "parts" : "assemblies";
  const siblingCount = tab === "assemblies" ? parts.length : assemblies.length;
  const siblingLabel = t(`parts.tabs.${siblingTab}`);

  const list = emptyScope ? (
    <EmptyState
      compact={compact}
      icon={<DeskIcon name="saved" />}
      title={tab === "assemblies" ? t("parts.emptyAssembliesTitle") : t("parts.emptyPartsTitle")}
      body={
        siblingCount > 0
          ? tab === "assemblies"
            ? t("parts.emptyAssembliesHasParts")
            : t("parts.emptyPartsAllAssemblies")
          : tab === "assemblies"
            ? t("parts.emptyAssembliesBody")
            : t("parts.emptyPartsBody")
      }
      action={
        siblingCount > 0 ? (
          <button
            type="button"
            onClick={() => setTab(siblingTab)}
            className="inline-flex items-center gap-2 rounded-button font-bold text-[13px] cursor-pointer"
            style={{
              padding: "9px 15px",
              border: "1px solid var(--accent-border)",
              background: "var(--accent-surface)",
              color: "var(--accent-text)",
            }}
          >
            {t("parts.showOther", { label: siblingLabel })}
            <span className="font-mono text-[11px]">{siblingCount}</span>
          </button>
        ) : (
          actions.onNew && (
            <button
              type="button"
              onClick={actions.onNew}
              className="inline-flex items-center gap-2 rounded-button font-bold text-[13px] cursor-pointer"
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
          )
        )
      }
    />
  ) : (
    <div className="flex flex-col gap-3">
      <SavedToolbar
        compact={compact}
        state={query}
        onChange={(patch) => setQuery((current) => ({ ...current, ...patch }))}
        availableTags={tags}
        density={compact ? undefined : density}
        onSetDensity={compact ? undefined : setDensity}
        selecting={compact ? undefined : selecting}
        onToggleSelecting={
          compact || !actions.onRemoveMany
            ? undefined
            : () => (selecting ? stopSelecting() : setSelecting(true))
        }
      />

      {selecting && selected.length > 0 && actions.onRemoveMany && (
        <SavedBulkBar
          count={selected.length}
          onCompare={() => {
            for (const entry of selectedEntries) actions.onAddCompare(entry);
            stopSelecting();
          }}
          onDelete={() => {
            actions.onRemoveMany?.(selectedEntries);
            stopSelecting();
          }}
          onClear={stopSelecting}
        />
      )}

      {tab === "parts" && !filtering && (
        <section>
          <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase mb-2 px-1">
            {t("parts.pinnedLabel")}
          </div>
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: compact
                ? "repeat(auto-fill, minmax(150px, 1fr))"
                : "repeat(auto-fill, minmax(215px, 1fr))",
            }}
          >
            {pinnedModels.map((model) => (
              <PinnedCard
                key={model.entry.id}
                model={model}
                onUse={() => actions.onPick(model.entry)}
                onUnpin={() => actions.onTogglePin(model.entry)}
              />
            ))}
            <div
              className="flex items-center justify-center rounded-[15px] text-center text-[12px] text-muted-faint"
              style={{ padding: "16px 14px", border: "1px dashed var(--border-strong)", minHeight: 92 }}
            >
              {t("parts.pinPlaceholder")}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase mb-2 px-1">
          {tab === "assemblies" ? t("parts.allAssemblies") : t("parts.allParts")}
        </div>
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
        ) : density === "grid" && !compact ? (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
              alignItems: "start",
            }}
          >
            {models.map((model) => (
              <SavedCard
                key={model.entry.id}
                model={model}
                mode={mode}
                actions={cardActions(model.entry)}
              />
            ))}
          </div>
        ) : (
          <div
            role="table"
            aria-label={tab === "assemblies" ? t("parts.tabs.assemblies") : t("parts.tabs.parts")}
            className="rounded-panel-lg overflow-hidden"
            style={{
              border: "1px solid var(--border-faint)",
              background: "var(--surface)",
              boxShadow: "var(--panel-shadow-soft)",
            }}
          >
            {!compact && (
              <div
                role="row"
                className="flex items-center gap-3 fs-track-label text-[9.5px] font-bold text-muted uppercase"
                style={{ padding: "10px 14px", background: "var(--surface-raised)" }}
              >
                <span role="columnheader" className="flex-1 min-w-0">{t("parts.columns.name")}</span>
                <span role="columnheader" style={{ width: 190 }}>{t("parts.columns.spec")}</span>
                <span role="columnheader" style={{ width: 96 }} className="text-right">
                  {tab === "assemblies" ? t("parts.columns.total") : t("parts.columns.kgm")}
                </span>
                <span role="columnheader" style={{ width: 56 }} className="text-right">
                  {t("parts.columns.used")}
                </span>
                <span role="columnheader" style={{ width: 108 }} aria-label={t("common.more")} />
              </div>
            )}
            {models.map((model) => (
              <PartsRow
                key={model.entry.id}
                model={model}
                actions={actions}
                compact={compact}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const body =
    tab === "history" ? (
      <HistoryTab history={history} settings={settings} actions={actions} compact={compact} />
    ) : (
      list
    );

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        {tabs}
        {body}
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <div
        className="flex items-start gap-4 flex-wrap flex-shrink-0"
        style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border-faint)" }}
      >
        <div className="min-w-0" style={{ maxWidth: 620 }}>
          <div className="font-extrabold text-xl text-foreground" style={{ letterSpacing: -0.4 }}>
            {t("nav.parts")}
          </div>
          <div className="text-[12.5px] text-muted mt-1 leading-snug">{t("parts.subtitle")}</div>
        </div>
        <div className="ml-auto">{tabs}</div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ padding: "20px 32px 32px" }}>
        <div className="min-w-0">{body}</div>
      </div>
    </div>
  );
}
