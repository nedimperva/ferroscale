"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { computeCompareDeltas } from "@/lib/command/compare";
import type { CalculationInput, CurrencyCode, LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import type { Project } from "@/hooks/useProjects";
import { CommandGlyph } from "../command-glyph";
import { familyForInput, formatWeightPriceSubtitle } from "../command-copy";
import { SheetShell } from "./sheet-shell";

/* ──────────────────────────────────────────────────────────────
 *  Library sheet: Saved · Compare · Projects
 * ────────────────────────────────────────────────────────────── */

type LibraryTab = "saved" | "compare" | "projects";

interface CommandLibrarySheetProps {
  settings: CommandParserSettings;
  defaultUnit: LengthUnit;
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  onClose: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onRemoveSaved: (id: string) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onCreateProject: (name: string) => void;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
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
  saved,
  compareItems,
  projects,
  onLoadInput,
  onRemoveSaved,
  onRemoveCompare,
  onClearCompare,
  onCreateProject,
  onRemoveProjectCalc,
}: CommandLibraryWorkspaceProps) {
  const t = useTranslations("command");
  // Initial tab — pick the first non-empty section, else Saved.
  const initialTab: LibraryTab =
    saved.length > 0
      ? "saved"
      : compareItems.length > 0
        ? "compare"
        : projects.length > 0
          ? "projects"
          : "saved";
  const [tab, setTab] = useState<LibraryTab>(initialTab);

  return (
    <>
      <div className="flex gap-1 mb-3" role="tablist">
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

      {tab === "saved" && (
        <SavedTabContent
          saved={saved}
          defaultUnit={defaultUnit}
          defaultGradeId={settings.defaultGradeId}
          onLoad={(entry) => onLoadInput(entry.input)}
          onRemove={onRemoveSaved}
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
      className={`flex-1 h-9 rounded-lg text-[11px] font-bold uppercase tracking-[1px] flex items-center justify-center gap-1.5 ${
        active
          ? "bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]"
          : "bg-[var(--surface-raised)] text-muted border border-border-faint"
      }`}
    >
      <span className="flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      {children}
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

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-muted text-center py-12 px-6 leading-relaxed">
      {children}
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
  defaultUnit,
  defaultGradeId,
  onLoad,
  onRemove,
}: {
  saved: SavedEntry[];
  defaultUnit: LengthUnit;
  defaultGradeId: string;
  onLoad: (entry: SavedEntry) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("command");
  if (saved.length === 0) {
    return <EmptyState>{t("library.emptySaved")}</EmptyState>;
  }
  return (
    <RowsCard>
      {saved.map((entry) => {
        const fam = familyForInput(entry.input);
        const subtitle = formatWeightPriceSubtitle(entry.result);
        const grade = entry.result.gradeLabel;
        return (
          <LibraryRow
            key={entry.id}
            glyph={fam ? <CommandGlyph fam={fam} size={19} /> : null}
            title={entry.name}
            subtitle={
              <>
                {subtitle}
                {grade ? ` · ${grade}` : ""}
              </>
            }
            onClick={() => onLoad(entry)}
            onRemove={() => onRemove(entry.id)}
          />
        );
      })}
      {/* keep defaultUnit/defaultGradeId in the dependency loop for future use */}
      <span className="hidden" aria-hidden="true">
        {defaultUnit}/{defaultGradeId}
      </span>
    </RowsCard>
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
      <EmptyState>
        {t("library.emptyCompare")}
      </EmptyState>
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
          className="h-10 px-4 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("common.new")}
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState>
          {t("library.emptyProjects")}
        </EmptyState>
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
                      : `${t("library.calcCount", { count: calcs.length })} · ${fsWeight(totalWeight)} ${fsWeightUnit(totalWeight)} · ${sym} ${fsMoney(totalCost)}`
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

