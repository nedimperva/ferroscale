"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, cmdParse, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { computeCompareDeltas } from "@/lib/command/compare";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import type { Project } from "@/hooks/useProjects";
import { CommandGlyph } from "../command-glyph";
import { familyForInput, formatWeightPriceSubtitle } from "../command-copy";
import { EmptyState } from "../empty-state";
import { SheetShell } from "./sheet-shell";
import { PartsView } from "../parts/parts-view";
import { ProjectList } from "../projects/project-list";
import { ProjectDetail } from "../projects/project-detail";
import { ProjectQuote } from "../project-quote";
import { useQuotePrinting } from "../projects/use-quote-printing";
import type { ProjectActions } from "../projects/project-actions";
import { marginPercentStore } from "@/lib/settings-stores";

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
  onAddSavedToProject: (entry: SavedEntry) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  projectActions: ProjectActions;
  /** The session tape, newest first — the phone's only view of it. */
  sessionTape: string[];
  onLoadQuery: (query: string) => void;
  onRemoveTapeEntry: (query: string) => void;
  onSaveSessionAsProject: () => void;
  onClearHistory: () => void;
  /** Open on a named tab (the `>` palette navigates here); null picks one. */
  initialTab?: LibraryTab | null;
}

export function CommandLibrarySheet(props: CommandLibrarySheetProps) {
  const t = useTranslations("command");
  return (
    <SheetShell fullScreen title={t("sheets.library")} onClose={props.onClose}>
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
  onAddSavedToProject,
  onRemoveCompare,
  onClearCompare,
  projectActions,
  sessionTape,
  onLoadQuery,
  onRemoveTapeEntry,
  onSaveSessionAsProject,
  onClearHistory,
  initialTab,
}: CommandLibraryWorkspaceProps) {
  const t = useTranslations("command");
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
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
      <div className="flex gap-1 mb-3" role="tablist">
        <LibraryTabPill
          active={tab === "session"}
          count={sessionTape.length}
          onClick={() => setTab("session")}
          icon={<TabIconSession />}
          label={t("desktop.session")}
        />
        <LibraryTabPill
          active={tab === "saved"}
          count={saved.length}
          onClick={() => setTab("saved")}
          icon={<TabIconSaved />}
          label={t("nav.parts")}
        />
        <LibraryTabPill
          active={tab === "compare"}
          count={compareItems.length}
          onClick={() => setTab("compare")}
          icon={<TabIconCompare />}
          label={t("nav.compare")}
        />
        <LibraryTabPill
          active={tab === "projects"}
          count={projects.length}
          onClick={() => setTab("projects")}
          icon={<TabIconProjects />}
          label={t("nav.projects")}
        />
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
        <PartsView
          compact
          saved={saved}
          history={sessionTape}
          settings={settings}
          defaultUnit={defaultUnit}
          mode={mode}
          actions={{
            onPick: onLoadSaved,
            onAddCompare: onAddCompareSaved,
            onRemove: onRemoveSaved,
            onDuplicate: onDuplicateSaved,
            onTogglePin: onTogglePinSaved,
            onEdit: onEditSaved,
            onAddPart: onAddPartSaved,
            onRemovePart: onRemovePartSaved,
            onAddToProject: onAddSavedToProject,
            onLoadQuery,
            onRemoveHistoryEntry: onRemoveTapeEntry,
            onClearHistory: onClearHistory,
          }}
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
          actions={projectActions}
          marginPercent={marginPercent}
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
  label,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  icon: React.ReactNode;
  /** Shown only while this tab is open; otherwise it is the accessible name. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      // Only the open tab spends width on its name; the rest are their icon
      // and their count. Four labelled tabs never fitted 390px, and sizing the
      // font down to make them fit would break on a longer locale
      // (bs: "POREĐENJE" > "COMPARE"). This way the row is the same width in
      // every language.
      title={label}
      aria-label={active ? undefined : `${label}${count > 0 ? ` (${count})` : ""}`}
      className={`h-9 rounded-lg flex items-center justify-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.5px] transition-[flex] ${
        active
          ? "flex-1 px-3 bg-[var(--surface)] text-foreground border border-[var(--border-strong)]"
          : "flex-shrink-0 px-3 bg-[var(--surface-raised)] text-muted border border-border-faint"
      }`}
    >
      <span className="flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      {active && <span className="whitespace-nowrap">{label}</span>}
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

/**
 * Projects on the phone: the same list (2c) and the same detail page (2d) the
 * wide workspace shows, drilled into inside the sheet rather than pushed onto
 * a stack — the sheet is one surface and the tabs above it stay put.
 */
function ProjectsTabContent({
  projects,
  actions,
  marginPercent,
}: {
  projects: Project[];
  actions: ProjectActions;
  marginPercent: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { printing, printQuote } = useQuotePrinting(actions.onPrintQuote);
  const open = openId ? (projects.find((project) => project.id === openId) ?? null) : null;

  const sheetActions: ProjectActions = {
    ...actions,
    onPrintQuote: printQuote,
    onDelete: (id) => {
      actions.onDelete(id);
      setOpenId((current) => (current === id ? null : current));
    },
  };

  return (
    <>
      {open ? (
        <ProjectDetail
          compact
          project={open}
          actions={sheetActions}
          marginPercent={marginPercent}
          onBack={() => setOpenId(null)}
        />
      ) : (
        <ProjectList
          compact
          projects={projects}
          marginPercent={marginPercent}
          actions={sheetActions}
          onOpenProject={setOpenId}
        />
      )}
      {printing &&
        createPortal(
          <div className="fs-print">
            <ProjectQuote project={printing} marginPercent={marginPercent} />
          </div>,
          document.body,
        )}
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
