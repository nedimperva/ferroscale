"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, cmdParse, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { computeCompareDeltas } from "@/lib/command/compare";
import { collectSavedTags, filterSortSaved } from "@/lib/saved/query";
import type { CalculationInput, CurrencyCode, LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import type { Project } from "@/hooks/useProjects";
import { CommandGlyph } from "../command-glyph";
import { familyForInput, formatWeightPriceSubtitle } from "../command-copy";
import { EmptyState } from "../empty-state";
import { buildSavedCardModel } from "../saved/saved-model";
import { SavedCard } from "../saved/saved-card";
import { SavedToolbar, type SavedToolbarState } from "../saved/saved-toolbar";
import { SheetShell } from "./sheet-shell";

/* ──────────────────────────────────────────────────────────────
 *  Library sheet: Saved · Compare · Projects
 * ────────────────────────────────────────────────────────────── */

type LibraryTab = "session" | "saved" | "compare" | "projects";

interface CommandLibrarySheetProps {
  settings: CommandParserSettings;
  defaultUnit: LengthUnit;
  /** Which metric leads on saved cards — follows the app-wide result mode. */
  mode: "weight" | "price";
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  onClose: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onLoadSaved: (entry: SavedEntry) => void;
  onRemoveSaved: (entry: SavedEntry) => void;
  onAddCompareSaved: (entry: SavedEntry) => void;
  onDuplicateSaved: (entry: SavedEntry) => void;
  onTogglePinSaved: (entry: SavedEntry) => void;
  onEditSaved: (entry: SavedEntry) => void;
  onAddPartSaved?: (entry: SavedEntry) => void;
  onRemovePartSaved: (entry: SavedEntry, partId: string) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onCreateProject: (name: string) => void;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
  /** The session tape, newest first — the phone's only view of it. */
  sessionTape: string[];
  onLoadQuery: (query: string) => void;
  onRemoveTapeEntry: (query: string) => void;
  onSaveSessionAsProject: () => void;
  /** Open on a named tab (the `>` palette navigates here); null picks one. */
  initialTab?: LibraryTab | null;
}

export function CommandLibrarySheet(props: CommandLibrarySheetProps) {
  const t = useTranslations("command");
  return (
    <SheetShell title={t("sheets.library")} onClose={props.onClose}>
      <CommandLibraryWorkspace {...props} />
    </SheetShell>
  );
}

type CommandLibraryWorkspaceProps = Omit<CommandLibrarySheetProps, "onClose">;

/** The tabbed Library body — used inside the mobile/medium sheet AND as the
 *  always-visible right pane on wide-desktop. */
export function CommandLibraryWorkspace({
  settings,
  defaultUnit,
  mode,
  saved,
  compareItems,
  projects,
  onLoadInput,
  onLoadSaved,
  onRemoveSaved,
  onAddCompareSaved,
  onDuplicateSaved,
  onTogglePinSaved,
  onEditSaved,
  onAddPartSaved,
  onRemovePartSaved,
  onRemoveCompare,
  onClearCompare,
  onCreateProject,
  onRemoveProjectCalc,
  sessionTape,
  onLoadQuery,
  onRemoveTapeEntry,
  onSaveSessionAsProject,
  initialTab,
}: CommandLibraryWorkspaceProps) {
  const t = useTranslations("command");
  // Asked for a tab (palette navigation), else the first non-empty section.
  const openOn: LibraryTab =
    initialTab ??
    (saved.length > 0
      ? "saved"
      : compareItems.length > 0
        ? "compare"
        : projects.length > 0
          ? "projects"
          : "saved");
  const [tab, setTab] = useState<LibraryTab>(openOn);

  return (
    <>
      <div
        className="flex gap-1 mb-3 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
        role="tablist"
      >
        <LibraryTabPill
          active={tab === "session"}
          count={sessionTape.length}
          onClick={() => setTab("session")}
          icon={<TabIconSession />}
        >
          {t("desktop.session")}
        </LibraryTabPill>
        <LibraryTabPill
          active={tab === "saved"}
          count={saved.length}
          onClick={() => setTab("saved")}
          icon={<TabIconSaved />}
        >
          {t("nav.saved")}
        </LibraryTabPill>
        <LibraryTabPill
          active={tab === "compare"}
          count={compareItems.length}
          onClick={() => setTab("compare")}
          icon={<TabIconCompare />}
        >
          {t("nav.compare")}
        </LibraryTabPill>
        <LibraryTabPill
          active={tab === "projects"}
          count={projects.length}
          onClick={() => setTab("projects")}
          icon={<TabIconProjects />}
        >
          {t("nav.projects")}
        </LibraryTabPill>
      </div>

      {tab === "session" && (
        <SessionTabContent
          tape={sessionTape}
          settings={settings}
          mode={mode}
          onLoad={onLoadQuery}
          onRemove={onRemoveTapeEntry}
          onSaveAsProject={onSaveSessionAsProject}
        />
      )}
      {tab === "saved" && (
        <SavedTabContent
          saved={saved}
          settings={settings}
          defaultUnit={defaultUnit}
          mode={mode}
          onLoad={onLoadSaved}
          onRemove={onRemoveSaved}
          onAddCompare={onAddCompareSaved}
          onDuplicate={onDuplicateSaved}
          onTogglePin={onTogglePinSaved}
          onEdit={onEditSaved}
          onAddPart={onAddPartSaved}
          onRemovePart={onRemovePartSaved}
        />
      )}
      {tab === "compare" && (
        <CompareTabContent
          items={compareItems}
          defaultUnit={defaultUnit}
          defaultGradeId={settings.defaultGradeId}
          onLoad={(item) => onLoadInput(item.input)}
          onRemove={onRemoveCompare}
          onClearAll={onClearCompare}
        />
      )}
      {tab === "projects" && (
        <ProjectsTabContent
          projects={projects}
          defaultUnit={defaultUnit}
          defaultGradeId={settings.defaultGradeId}
          onCreate={onCreateProject}
          onLoadCalc={(calc) => onLoadInput(calc.input)}
          onRemoveCalc={onRemoveProjectCalc}
        />
      )}
    </>
  );
}

function TabIconSession() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function TabIconSaved() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function TabIconCompare() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
    </svg>
  );
}

function TabIconProjects() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function LibraryTabPill({
  active,
  count,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      // Sized to its own label, in a row that scrolls. Four equal shares of
      // 390px meant tuning the font down until "PROJECTS" fitted — which would
      // have broken the moment a locale used a longer word (bs: "POREĐENJE").
      className={`flex-shrink-0 h-9 rounded-lg px-3 text-[10.5px] font-bold uppercase tracking-[0.5px] flex items-center justify-center gap-1.5 ${
        active
          ? "bg-[var(--surface)] text-foreground border border-[var(--border-strong)]"
          : "bg-[var(--surface-raised)] text-muted border border-border-faint"
      }`}
    >
      <span className="flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="whitespace-nowrap">{children}</span>
      {count > 0 && (
        <span className="opacity-70 font-mono text-[10px]">{count}</span>
      )}
    </button>
  );
}

/* ─────────────────── Shared row primitive ─────────────────── */

export function LibraryRow({
  glyph,
  title,
  subtitle,
  onClick,
  onRemove,
  trailing,
  indent,
}: {
  glyph: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  trailing?: React.ReactNode;
  indent?: boolean;
}) {
  const t = useTranslations("command");
  const interactive = !!onClick;
  return (
    <div
      className={`flex items-center gap-3 ${
        indent ? "pl-6 pr-3" : "px-3"
      } py-2.5`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={`flex-1 min-w-0 flex items-center gap-3 text-left bg-transparent border-0 p-0 ${
          interactive ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div
          className={`${
            indent ? "w-7 h-7" : "w-9 h-9"
          } rounded-lg bg-[var(--surface-inset)] flex items-center justify-center text-foreground flex-shrink-0`}
        >
          {glyph}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${indent ? "text-[13px]" : "text-[14.5px]"} font-bold text-foreground truncate`}>
            {title}
          </div>
          <div className="font-mono text-[11px] text-muted mt-0.5 truncate">
            {subtitle}
          </div>
        </div>
      </button>
      {trailing}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("common.remove")}
          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-faint hover:text-foreground hover:bg-[var(--surface)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function RowsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden divide-y divide-border-faint">
      {children}
    </div>
  );
}

/* ─────────────────── Saved tab ─────────────────── */

function SavedTabContent({
  saved,
  settings,
  defaultUnit,
  mode,
  onLoad,
  onRemove,
  onAddCompare,
  onDuplicate,
  onTogglePin,
  onEdit,
  onAddPart,
  onRemovePart,
}: {
  saved: SavedEntry[];
  settings: CommandParserSettings;
  defaultUnit: LengthUnit;
  mode: "weight" | "price";
  onLoad: (entry: SavedEntry) => void;
  onRemove: (entry: SavedEntry) => void;
  onAddCompare: (entry: SavedEntry) => void;
  onDuplicate: (entry: SavedEntry) => void;
  onTogglePin: (entry: SavedEntry) => void;
  onEdit: (entry: SavedEntry) => void;
  onAddPart?: (entry: SavedEntry) => void;
  onRemovePart: (entry: SavedEntry, partId: string) => void;
}) {
  const t = useTranslations("command");
  const [query, setQuery] = useState<SavedToolbarState>({
    search: "",
    sort: "recent",
    tags: [],
  });

  const tags = useMemo(() => collectSavedTags(saved), [saved]);
  const models = useMemo(
    () =>
      filterSortSaved(saved, query).map((entry) =>
        buildSavedCardModel(entry, settings, defaultUnit),
      ),
    [saved, query, settings, defaultUnit],
  );

  if (saved.length === 0) {
    return (
      <EmptyState
        compact
        icon={<TabIconSaved />}
        title={t("saved.emptyTitle")}
        body={t("saved.emptyBodyMobile")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* The filter row earns its space once there's enough to sift through. */}
      {(saved.length > 3 || tags.length > 0) && (
        <SavedToolbar
          compact
          state={query}
          onChange={(patch) => setQuery((current) => ({ ...current, ...patch }))}
          availableTags={tags}
        />
      )}
      {models.length === 0 ? (
        <EmptyState compact title={t("saved.noMatchTitle")} body={t("saved.noMatchBody")} />
      ) : (
        models.map((model) => (
          <SavedCard
            key={model.entry.id}
            model={model}
            mode={mode}
            actions={{
              onOpen: () => onLoad(model.entry),
              onCompare: () => onAddCompare(model.entry),
              onDuplicate: () => onDuplicate(model.entry),
              onTogglePin: () => onTogglePin(model.entry),
              onEdit: () => onEdit(model.entry),
              onAddPart: onAddPart ? () => onAddPart(model.entry) : undefined,
              onRemovePart: (partId: string) => onRemovePart(model.entry, partId),
              onRemove: () => onRemove(model.entry),
            }}
          />
        ))
      )}
    </div>
  );
}

/* ─────────────────── Compare tab ─────────────────── */

function CompareTabContent({
  items,
  defaultUnit,
  defaultGradeId,
  onLoad,
  onRemove,
  onClearAll,
}: {
  items: CompareItem[];
  defaultUnit: LengthUnit;
  defaultGradeId: string;
  onLoad: (item: CompareItem) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("command");
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={<TabIconCompare />}
        title={t("compare.emptyTitle")}
        body={t("library.emptyCompare")}
      />
    );
  }
  const deltas = computeCompareDeltas(items);
  const deltaById = new Map(deltas.map((d) => [d.id, d]));
  return (
    <>
      <RowsCard>
        {items.map((item) => {
          const fam = familyForInput(item.input);
          const subtitle = formatWeightPriceSubtitle(item.result);
          const grade = item.result.gradeLabel;
          const delta = deltaById.get(item.id);
          const isMax = delta?.label === "—";
          return (
            <LibraryRow
              key={item.id}
              glyph={fam ? <CommandGlyph fam={fam} size={19} /> : null}
              title={
                item.normalizedProfile?.shortLabel ?? item.result.profileLabel
              }
              subtitle={
                <>
                  {subtitle}
                  {grade ? ` · ${grade}` : ""}
                </>
              }
              onClick={() => onLoad(item)}
              onRemove={() => onRemove(item.id)}
              trailing={
                delta && (
                  <span
                    className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                      isMax
                        ? "bg-[var(--accent-surface)] text-[var(--accent-text)]"
                        : "bg-[var(--blue-surface)] text-[var(--blue-text)]"
                    }`}
                  >
                    {delta.label}
                  </span>
                )
              }
            />
          );
        })}
      </RowsCard>
      <button
        type="button"
        onClick={onClearAll}
        className="mt-3 w-full h-10 rounded-xl border border-border-faint bg-transparent text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground hover:bg-[var(--surface-raised)]"
      >
        {t("common.clearAll")}
      </button>
      <span className="hidden" aria-hidden="true">
        {defaultUnit}/{defaultGradeId}
      </span>
    </>
  );
}

/* ─────────────────── Projects tab ─────────────────── */

export function FolderGlyph({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function ProjectsTabContent({
  projects,
  defaultUnit,
  defaultGradeId,
  onCreate,
  onLoadCalc,
  onRemoveCalc,
}: {
  projects: Project[];
  defaultUnit: LengthUnit;
  defaultGradeId: string;
  onCreate: (name: string) => void;
  onLoadCalc: (calc: Project["calculations"][number]) => void;
  onRemoveCalc: (projectId: string, calcId: string) => void;
}) {
  const t = useTranslations("command");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName("");
  };

  return (
    <>
      <div className="flex gap-2 mb-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("library.newProjectName")}
          className="flex-1 h-10 rounded-xl border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!newName.trim()}
          className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("common.new")}
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          compact
          icon={<TabIconProjects />}
          title={t("projects.emptyTitle")}
          body={t("library.emptyProjects")}
        />
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const calcs = project.calculations;
            const totalWeight = calcs.reduce(
              (sum, c) => sum + (c.result.totalWeightKg ?? 0),
              0,
            );
            const totalCost = calcs.reduce(
              (sum, c) => sum + (c.result.grandTotalAmount ?? 0),
              0,
            );
            const currency =
              calcs[0]?.result.currency ?? ("EUR" as CurrencyCode);
            const sym = CURRENCY_SYMBOLS[currency] ?? "€";
            const isOpen = expanded === project.id;
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden"
              >
                <LibraryRow
                  glyph={
                    <span style={{ color: "var(--accent)" }}>
                      <FolderGlyph />
                    </span>
                  }
                  title={project.name}
                  subtitle={
                    calcs.length === 0
                      ? t("library.emptyProject")
                      : `${t("library.calcCount", { count: calcs.length })} · ${fsWeight(totalWeight)} ${fsWeightUnit()} · ${sym} ${fsMoney(totalCost)}`
                  }
                  onClick={() =>
                    setExpanded(isOpen ? null : project.id)
                  }
                  trailing={
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-muted-faint transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  }
                />
                {isOpen && (
                  <div className="border-t border-border-faint bg-[var(--surface-inset)]/40">
                    {calcs.length === 0 ? (
                      <div className="text-xs text-muted py-4 text-center">
                        {t("library.noCalculationsYet")}
                      </div>
                    ) : (
                      <div className="divide-y divide-border-faint">
                        {calcs.map((calc) => {
                          const fam = familyForInput(calc.input);
                          return (
                            <LibraryRow
                              key={calc.id}
                              indent
                              glyph={
                                fam ? (
                                  <CommandGlyph fam={fam} size={15} />
                                ) : null
                              }
                              title={
                                calc.normalizedProfile?.shortLabel ??
                                calc.result.profileLabel
                              }
                              subtitle={formatWeightPriceSubtitle(calc.result)}
                              onClick={() => onLoadCalc(calc)}
                              onRemove={() =>
                                onRemoveCalc(project.id, calc.id)
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <span className="hidden" aria-hidden="true">
        {defaultUnit}/{defaultGradeId}
      </span>
    </>
  );
}

/* ─────────────────── Helpers ─────────────────── */


/**
 * The session tape on the phone. The desktop has had a rail for this since
 * 3.10.0; the phone could only add to the session, never look at it — which
 * made the running total on the ribbon a number with nothing behind it.
 */
function SessionTabContent({
  tape,
  settings,
  mode,
  onLoad,
  onRemove,
  onSaveAsProject,
}: {
  tape: string[];
  settings: CommandParserSettings;
  mode: "weight" | "price";
  onLoad: (query: string) => void;
  onRemove: (query: string) => void;
  onSaveAsProject: () => void;
}) {
  const t = useTranslations("command");
  const sym = CURRENCY_SYMBOLS[settings.pricing.currency] ?? "€";
  const rows = tape
    .map((query) => ({ query, parsed: cmdParse(query, settings) }))
    .filter((row) => row.parsed.valid);
  const totalKg = rows.reduce((sum, r) => sum + (r.parsed.totalKg ?? 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + (r.parsed.totalAmount ?? 0), 0);

  if (rows.length === 0) {
    return (
      <div
        className="rounded-2xl text-center text-[13px] text-muted"
        style={{ padding: "26px 14px", border: "1px dashed var(--border-strong)", lineHeight: 1.5 }}
      >
        {t("desktop.sessionEmpty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div
          key={row.query}
          className="flex items-center gap-2.5 rounded-[13px] border border-border-faint bg-[var(--surface)]"
          style={{ padding: "12px 13px" }}
        >
          <button
            type="button"
            onClick={() => onLoad(row.query)}
            className="flex-1 min-w-0 text-left bg-transparent border-0 p-0"
          >
            <div className="font-mono text-[13px] font-bold truncate">{row.query}</div>
            <div className="font-mono text-[11.5px] text-muted mt-0.5">
              {row.parsed.totalKg != null ? `${fsWeight(row.parsed.totalKg)} ${fsWeightUnit()}` : "—"}
              {row.parsed.totalAmount != null ? ` · ${sym}${fsMoney(row.parsed.totalAmount)}` : ""}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onRemove(row.query)}
            aria-label={t("common.remove")}
            className="flex items-center justify-center rounded-[9px] border border-border-faint text-muted text-[14px] leading-none"
            style={{ width: 30, height: 30, background: "var(--surface-raised)" }}
          >
            ×
          </button>
        </div>
      ))}

      <div
        className="flex items-center gap-2.5 rounded-[13px]"
        style={{ padding: "12px 13px", background: "var(--surface-inset)" }}
      >
        <span className="fs-track-wide text-[11px] font-bold uppercase text-muted">
          {t("library.total")}
        </span>
        <span className="ml-auto font-mono text-[14px] font-bold">
          {mode === "weight"
            ? `${fsWeight(totalKg)} ${fsWeightUnit()}`
            : `${sym}${fsMoney(totalAmount)}`}
        </span>
      </div>

      <button
        type="button"
        onClick={onSaveAsProject}
        className="rounded-[11px] text-[12.5px] font-bold"
        style={{
          height: 40,
          border: "1px solid var(--accent-border)",
          background: "var(--accent-surface)",
          color: "var(--accent-text)",
        }}
      >
        {t("desktop.saveAsProject")}
      </button>
    </div>
  );
}
