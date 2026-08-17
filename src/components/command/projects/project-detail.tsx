"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { PROJECT_STATUSES, type Project, type ProjectStatus } from "@/hooks/useProjects";
import {
  createPaintCoat,
  type PaintCoatKind,
  type ProjectPaintCoat,
} from "@/lib/projects/paint";
import {
  defaultPaintCoverageStore,
  defaultPaintPriceStore,
} from "@/lib/settings-stores";
import { CommandGlyph } from "../command-glyph";
import { familyForInput } from "../command-copy";
import { RowMenu } from "../row-menu";
import { DeskIcon } from "../desktop/desk-atoms";
import {
  formatActivity,
  formatRelativeTime,
  formatShortDate,
  projectItemRows,
  projectSummary,
  toDateInputValue,
} from "./project-model";
import type { ProjectActions } from "./project-actions";

/**
 * The project detail page (2d) — the screen the app did not have. A project
 * used to be a card with a list of profile names on it; everything you might
 * want to do to a job (rename it, say whose it is, mark it quoted, change a
 * piece count, print it, archive it) had to happen somewhere else or not at
 * all.
 *
 * One component serves both surfaces. `compact` narrows it to a single column
 * for the library sheet; nothing else differs, so the numbers a phone shows
 * are the numbers the desktop shows.
 */

function StatTile({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  tone?: "accent" | "blue";
  emphasis?: boolean;
}) {
  return (
    <div
      className="rounded-[15px] min-w-0"
      style={{
        padding: "11px 14px",
        border: `1px solid ${emphasis ? "var(--accent-border)" : "var(--border-faint)"}`,
        background: emphasis ? "var(--accent-surface)" : "var(--surface)",
      }}
    >
      <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase truncate">
        {label}
      </div>
      <div
        className="font-mono font-bold mt-1 truncate"
        style={{
          fontSize: 17,
          color:
            tone === "accent"
              ? "var(--accent-text)"
              : tone === "blue"
                ? "var(--blue-strong)"
                : "var(--foreground)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  name,
  onChange,
}: {
  status: ProjectStatus;
  name: string;
  onChange: (status: ProjectStatus) => void;
}) {
  const t = useTranslations("command");
  const tone =
    status === "quoted"
      ? { bg: "var(--blue-surface)", border: "var(--blue-border)", text: "var(--blue-text)" }
      : status === "archived"
        ? { bg: "var(--surface-inset)", border: "var(--border-faint)", text: "var(--muted)" }
        : { bg: "var(--surface-inset)", border: "var(--border-faint)", text: "var(--foreground-secondary)" };
  return (
    <select
      value={status}
      aria-label={t("projects.statusAria", { name })}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
      className="fs-track-label rounded-full font-bold text-[10px] uppercase cursor-pointer"
      style={{
        padding: "4px 9px",
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.text,
      }}
    >
      {PROJECT_STATUSES.map((value) => (
        <option key={value} value={value}>
          {t(`projects.status.${value}`)}
        </option>
      ))}
    </select>
  );
}

/** Click-to-edit title. Enter commits, Escape restores what was there. */
function EditableTitle({
  name,
  onRename,
  compact,
}: {
  name: string;
  onRename: (name: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== name) onRename(draft);
  };

  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(name);
            setEditing(false);
          }
        }}
        autoFocus
        aria-label={t("common.rename")}
        className="font-extrabold text-foreground bg-transparent border-0 outline-none min-w-0 w-full"
        style={{ fontSize: compact ? 18 : 24, letterSpacing: -0.5 }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      title={t("common.rename")}
      className="font-extrabold text-foreground text-left bg-transparent border-0 p-0 cursor-text min-w-0 truncate"
      style={{ fontSize: compact ? 18 : 24, letterSpacing: -0.5 }}
    >
      {name}
    </button>
  );
}

function DetailsForm({
  project,
  actions,
  onDone,
}: {
  project: Project;
  actions: ProjectActions;
  onDone: () => void;
}) {
  const t = useTranslations("command");
  const [client, setClient] = useState(project.client ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(project.dueDate));

  const commit = () => {
    actions.onUpdateMeta(project.id, { client, dueDate });
    onDone();
  };

  return (
    <div
      className="flex items-end gap-3 flex-wrap rounded-[15px] mt-3"
      style={{
        padding: "12px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      <label className="flex flex-col gap-1 min-w-0" style={{ flex: "1 1 200px" }}>
        <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
          {t("projects.clientLabel")}
        </span>
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder={t("projects.clientPlaceholder")}
          className="h-9 rounded-[11px] border border-border-faint bg-[var(--surface)] px-3 text-[13px] text-foreground placeholder:text-muted-faint"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
          {t("projects.dueLabel")}
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-9 rounded-[11px] border border-border-faint bg-[var(--surface)] px-3 font-mono text-[13px] text-foreground"
        />
      </label>
      <button
        type="button"
        onClick={commit}
        className="h-9 px-4 rounded-[11px] font-bold text-[13px] cursor-pointer"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none" }}
      >
        {t("common.done")}
      </button>
    </div>
  );
}

function QuantityCell({
  row,
  projectId,
  actions,
}: {
  row: ReturnType<typeof projectItemRows>[number];
  projectId: string;
  actions: ProjectActions;
}) {
  const t = useTranslations("command");
  const [draft, setDraft] = useState(String(row.quantity));
  // Adjusting state during render (rather than in an effect) is how React
  // wants a controlled draft re-seeded when the value behind it moves — a
  // sync from another device, or an edit made in the other surface.
  const [seededFrom, setSeededFrom] = useState(row.quantity);
  if (seededFrom !== row.quantity) {
    setSeededFrom(row.quantity);
    setDraft(String(row.quantity));
  }

  if (row.isTemplate) {
    return <span className="font-mono text-[12.5px] text-foreground-secondary">{row.quantity}</span>;
  }

  const commit = () => {
    const next = Math.max(1, Math.floor(Number(draft) || 0));
    if (next !== row.quantity) actions.onSetItemQuantity(projectId, row.id, next);
    setDraft(String(next));
  };

  return (
    <input
      type="number"
      min={1}
      step={1}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(String(row.quantity));
      }}
      aria-label={t("projects.qtyAria", { name: row.specLabel })}
      className="h-8 w-[58px] rounded-[9px] border bg-[var(--surface)] px-2 text-center font-mono text-[12.5px] font-bold text-foreground"
      style={{ borderColor: draft !== String(row.quantity) ? "var(--accent-border)" : "var(--border-faint)" }}
    />
  );
}

function ItemNote({
  row,
  projectId,
  actions,
}: {
  row: ReturnType<typeof projectItemRows>[number];
  projectId: string;
  actions: ProjectActions;
}) {
  const t = useTranslations("command");
  const [draft, setDraft] = useState(row.note ?? "");
  const [seededFrom, setSeededFrom] = useState(row.note ?? "");
  if (seededFrom !== (row.note ?? "")) {
    setSeededFrom(row.note ?? "");
    setDraft(row.note ?? "");
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() !== (row.note ?? "")) {
          actions.onSetItemNote(projectId, row.id, draft);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(row.note ?? "");
      }}
      placeholder={t("projects.itemNotePlaceholder")}
      aria-label={t("projects.itemNoteAria", { name: row.specLabel })}
      className="w-full min-w-0 border-0 bg-transparent p-0 text-[12px] text-foreground-secondary placeholder:text-muted-faint outline-none"
    />
  );
}

function coatTitle(
  coat: ProjectPaintCoat,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (coat.kind === "primer") return t("projects.paintPrimer");
  if (coat.kind === "finish") return t("projects.paintFinish");
  return coat.name?.trim() || t("projects.paintCustom");
}

function PaintNumber({
  label,
  ariaLabel,
  value,
  suffix,
  prefix,
  min,
  step,
  onCommit,
}: {
  label: string;
  ariaLabel?: string;
  value: number;
  suffix?: string;
  prefix?: string;
  min?: number;
  step?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [seed, setSeed] = useState(value);
  if (seed !== value) {
    setSeed(value);
    setDraft(String(value));
  }
  const commit = () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < (min ?? 0)) {
      setDraft(String(value));
      return;
    }
    onCommit(next);
  };
  return (
    <label className="flex flex-col gap-1 min-w-0" style={{ flex: "1 1 72px" }}>
      <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">{label}</span>
      <span className="flex items-center gap-1 h-9 rounded-[11px] border border-border-faint bg-[var(--surface)] px-2.5">
        {prefix && <span className="font-mono text-[11px] text-muted flex-shrink-0">{prefix}</span>}
        <input
          type="number"
          min={min ?? 0}
          step={step ?? "any"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label={ariaLabel ?? label}
          className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] text-foreground outline-none"
        />
        {suffix && <span className="font-mono text-[11px] text-muted flex-shrink-0">{suffix}</span>}
      </span>
    </label>
  );
}

function PaintingForm({
  project,
  actions,
  surfaceM2,
  coatTotals,
  paintKg,
  paintCost,
  currencySymbol,
}: {
  project: Project;
  actions: ProjectActions;
  surfaceM2: number;
  coatTotals: ReturnType<typeof projectSummary>["paintCoatTotals"];
  paintKg: number;
  paintCost: number;
  currencySymbol: string;
}) {
  const t = useTranslations("command");
  const defaultPrice = useSyncExternalStore(
    defaultPaintPriceStore.subscribe,
    defaultPaintPriceStore.getSnapshot,
    defaultPaintPriceStore.getServerSnapshot,
  );
  const defaultCoverage = useSyncExternalStore(
    defaultPaintCoverageStore.subscribe,
    defaultPaintCoverageStore.getSnapshot,
    defaultPaintCoverageStore.getServerSnapshot,
  );
  const coats = project.paintCoats ?? [];
  const defaults = { pricePerKg: defaultPrice, coverageM2PerKg: defaultCoverage };
  const hasKind = (kind: PaintCoatKind) => coats.some((coat) => coat.kind === kind);

  const setCoats = (next: ProjectPaintCoat[]) => actions.onSetPaintCoats(project.id, next);
  const add = (kind: PaintCoatKind) => setCoats([...coats, createPaintCoat(kind, defaults)]);
  const patch = (id: string, next: Partial<ProjectPaintCoat>) =>
    setCoats(coats.map((coat) => (coat.id === id ? { ...coat, ...next } : coat)));
  const remove = (id: string) => setCoats(coats.filter((coat) => coat.id !== id));

  const addBtn = (kind: PaintCoatKind, label: string, disabled?: boolean) => (
    <button
      type="button"
      onClick={() => add(kind)}
      disabled={disabled}
      className="h-8 px-3 rounded-[10px] font-bold text-[12px] cursor-pointer disabled:opacity-40 disabled:cursor-default"
      style={{
        border: "1px dashed var(--border-strong)",
        background: "transparent",
        color: "var(--foreground-secondary)",
      }}
    >
      {label}
    </button>
  );

  return (
    <section
      className="rounded-[18px]"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        padding: "13px 15px",
      }}
    >
      <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase mb-1">
        {t("projects.paintingLabel")}
      </div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-[12.5px] text-muted">{t("projects.paintSurface")}</span>
        <span className="font-mono text-[13px] font-bold text-foreground">
          {surfaceM2.toFixed(2)} m²
        </span>
      </div>
      <p className="text-[12px] text-muted mb-2.5 leading-snug">
        {surfaceM2 > 0 ? t("projects.paintingHint") : t("projects.paintNoSurface")}
      </p>

      <div className="flex flex-col gap-2">
        {coats.map((coat) => {
          const total = coatTotals.find((row) => row.coat.id === coat.id);
          const title = coatTitle(coat, t);
          return (
            <div
              key={coat.id}
              className="rounded-[14px] flex flex-col gap-2"
              style={{
                padding: "10px 11px",
                border: "1px solid var(--border-faint)",
                background: "var(--surface-raised)",
              }}
            >
              <div className="flex items-center gap-2">
                {coat.kind === "custom" ? (
                  <input
                    value={coat.name ?? ""}
                    onChange={(e) => patch(coat.id, { name: e.target.value })}
                    placeholder={t("projects.paintCustom")}
                    aria-label={t("projects.paintCustom")}
                    className="min-w-0 flex-1 border-0 bg-transparent font-bold text-[13px] text-foreground outline-none"
                  />
                ) : (
                  <span className="flex-1 font-bold text-[13px] text-foreground">{title}</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(coat.id)}
                  aria-label={t("projects.paintRemove", { name: title })}
                  className="border-0 bg-transparent p-0 cursor-pointer text-[12px] font-bold text-muted"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <PaintNumber
                  label={t("projects.paintLayers")}
                  ariaLabel={`${t("projects.paintLayers")} · ${title}`}
                  value={coat.layers}
                  min={1}
                  step="1"
                  onCommit={(layers) => patch(coat.id, { layers: Math.max(1, Math.floor(layers)) })}
                />
                <PaintNumber
                  label={t("projects.paintCoverage")}
                  ariaLabel={`${t("projects.paintCoverage")} · ${title}`}
                  value={coat.coverageM2PerKg}
                  suffix={t("projects.paintCoverageUnit")}
                  onCommit={(coverageM2PerKg) => patch(coat.id, { coverageM2PerKg })}
                />
                <PaintNumber
                  label={t("projects.paintPrice")}
                  ariaLabel={`${t("projects.paintPrice")} · ${title}`}
                  value={coat.pricePerKg}
                  prefix={currencySymbol}
                  suffix={t("projects.paintPriceUnit")}
                  onCommit={(pricePerKg) => patch(coat.id, { pricePerKg })}
                />
              </div>
              {total && (
                <div className="font-mono text-[11.5px] text-muted">
                  {total.kg} kg · {currencySymbol} {fsMoney(total.cost)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mt-2.5">
        {addBtn("primer", t("projects.paintAddPrimer"), hasKind("primer"))}
        {addBtn("finish", t("projects.paintAddFinish"), hasKind("finish"))}
        {addBtn("custom", t("projects.paintAddCustom"))}
      </div>

      {coats.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--border-faint)" }}>
          <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
            {t("projects.paintTotal")}
          </span>
          <span className="font-mono text-[13px] font-bold text-foreground">
            {paintKg} kg · {currencySymbol} {fsMoney(paintCost)}
          </span>
        </div>
      )}
    </section>
  );
}

export function ProjectDetail({
  project,
  actions,
  marginPercent,
  onBack,
  compact,
}: {
  project: Project;
  actions: ProjectActions;
  marginPercent: number;
  onBack: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const [editingDetails, setEditingDetails] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [notes, setNotes] = useState(project.description ?? "");
  // A pull from another device rewrites the project underneath the textarea.
  // Re-seeding during render keeps the draft while the user types and adopts
  // the stored text whenever the project itself changes.
  const [notesSeed, setNotesSeed] = useState(`${project.id}:${project.description ?? ""}`);
  const nextNotesSeed = `${project.id}:${project.description ?? ""}`;
  if (notesSeed !== nextNotesSeed) {
    setNotesSeed(nextNotesSeed);
    setNotes(project.description ?? "");
  }

  const summary = projectSummary(project, marginPercent);
  const rows = projectItemRows(project);
  const sym = summary.currencySymbol;
  const activity = project.activity ?? [];

  const subtitleParts = [
    project.client?.trim() || t("projects.unassigned"),
    project.dueDate ? t("projects.dueOn", { date: formatShortDate(project.dueDate) }) : null,
    t("projects.createdOn", { date: formatShortDate(project.createdAt) }),
  ].filter(Boolean) as string[];

  const menuItems = [
    {
      id: "details",
      label: t("projects.editDetails"),
      onSelect: () => setEditingDetails((v) => !v),
    },
    {
      id: "duplicate",
      label: t("projects.duplicate"),
      onSelect: () => actions.onDuplicate(project.id),
    },
    {
      id: "archive",
      label: summary.status === "archived" ? t("common.unarchive") : t("common.archive"),
      onSelect: () =>
        actions.onUpdateMeta(project.id, {
          status: summary.status === "archived" ? "draft" : "archived",
        }),
    },
    {
      id: "delete",
      label: t("common.delete"),
      danger: true,
      onSelect: () => actions.onDelete(project.id),
    },
  ];

  const itemsTable = (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        boxShadow: "var(--panel-shadow-soft)",
      }}
    >
      {!compact && (
        <div
          className="flex items-center gap-3 fs-track-label text-[9.5px] font-bold text-muted uppercase"
          style={{ padding: "10px 14px", background: "var(--surface-raised)" }}
        >
          <span style={{ width: 24 }} aria-hidden="true" />
          <span className="flex-1 min-w-0">{t("projects.itemColumns.item")}</span>
          <span style={{ width: 70 }}>{t("projects.itemColumns.grade")}</span>
          <span style={{ width: 82 }} className="text-right">
            {t("projects.itemColumns.length")}
          </span>
          <span style={{ width: 62 }} className="text-center">
            {t("projects.itemColumns.qty")}
          </span>
          <span style={{ width: 96 }} className="text-right">
            {t("projects.columns.weight")}
          </span>
          <span style={{ width: 96 }} className="text-right">
            {t("projects.itemColumns.cost")}
          </span>
          <span style={{ width: 30 }} aria-hidden="true" />
        </div>
      )}

      {rows.length === 0 ? (
        <div className="font-mono text-[12px] text-muted-faint" style={{ padding: "18px 16px" }}>
          {t("projects.emptyRow")}
        </div>
      ) : (
        rows.map((row) => {
          const fam = familyForInput(row.calc.input);
          const glyph = (
            <span className="flex flex-shrink-0 text-muted" style={{ width: 24 }} aria-hidden="true">
              {fam && <CommandGlyph fam={fam} size={17} />}
            </span>
          );
          const name = (
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => actions.onOpenItem(row.calc.input)}
                title={t("projects.openInBar")}
                className="min-w-0 border-0 bg-transparent p-0 text-left cursor-pointer font-bold text-[13.5px] text-foreground truncate"
              >
                {row.specLabel}
              </button>
              <ItemNote row={row} projectId={project.id} actions={actions} />
            </div>
          );
          const menu = (
            <RowMenu
              ariaLabel={row.specLabel}
              items={[
                {
                  id: "open",
                  label: t("projects.openInBar"),
                  onSelect: () => actions.onOpenItem(row.calc.input),
                },
                {
                  id: "remove",
                  label: t("projects.removeFromProject"),
                  danger: true,
                  onSelect: () => actions.onRemoveItem(project.id, row.id),
                },
              ]}
            />
          );

          // The phone drops the columns and stacks the figures under the name;
          // six columns in 390px is a table that wraps into confetti.
          if (compact) {
            return (
              <div
                key={row.id}
                className="flex flex-col gap-1.5 border-t border-border-faint first:border-t-0"
                style={{ padding: "10px 12px" }}
              >
                <div className="flex items-center gap-2">
                  {glyph}
                  {name}
                  <QuantityCell row={row} projectId={project.id} actions={actions} />
                  {menu}
                </div>
                <div
                  className="flex items-center gap-2.5 font-mono text-[11.5px] flex-wrap"
                  style={{ paddingLeft: 24 }}
                >
                  <span className="text-muted-faint">{row.gradeLabel}</span>
                  <span className="text-foreground-secondary">{row.lengthLabel}</span>
                  <span className="font-bold" style={{ color: "var(--accent-text)" }}>
                    {fsWeight(row.weightKg)} {fsWeightUnit()}
                  </span>
                  <span className="font-semibold" style={{ color: "var(--blue-text)" }}>
                    {sym} {fsMoney(row.amount)}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={row.id}
              className="flex items-center gap-3 border-t border-border-faint first:border-t-0"
              style={{ padding: "9px 14px" }}
            >
              {glyph}
              {name}
              <span className="font-mono text-[12px] text-muted-faint" style={{ width: 70 }}>
                {row.gradeLabel}
              </span>
              <span
                className="font-mono text-[12px] text-foreground-secondary text-right"
                style={{ width: 82 }}
              >
                {row.lengthLabel}
              </span>
              <span className="flex justify-center" style={{ width: 62 }}>
                <QuantityCell row={row} projectId={project.id} actions={actions} />
              </span>
              <span
                className="font-mono text-[12.5px] font-bold text-right"
                style={{ width: 96, color: "var(--accent-text)" }}
              >
                {fsWeight(row.weightKg)} {fsWeightUnit()}
              </span>
              <span
                className="font-mono text-[12.5px] font-semibold text-right"
                style={{ width: 96, color: "var(--blue-text)" }}
              >
                {sym} {fsMoney(row.amount)}
              </span>
              {menu}
            </div>
          );
        })
      )}

      {rows.length > 0 && (
        <div
          className="flex items-center gap-3 border-t border-border-faint"
          style={{ padding: "10px 14px", background: "var(--surface-raised)" }}
        >
          <span className="font-mono text-[13px] text-muted" style={{ width: 24 }}>
            Σ
          </span>
          <span className="fs-track-label flex-1 min-w-0 text-[10px] font-bold text-muted uppercase truncate">
            {t("projects.totalRow", { count: summary.itemCount })}
          </span>
          <span
            className="font-mono text-[13px] font-bold text-right flex-shrink-0"
            style={{ color: "var(--accent-text)" }}
          >
            {fsWeight(summary.totalWeightKg)} {fsWeightUnit()}
          </span>
          <span
            className="font-mono text-[13px] font-bold text-right flex-shrink-0"
            style={{ color: "var(--blue-strong)" }}
          >
            {sym} {fsMoney(summary.totalCost)}
          </span>
          {!compact && <span style={{ width: 30 }} aria-hidden="true" />}
        </div>
      )}
    </div>
  );

  const rail = (
    <div className="flex flex-col gap-3 min-w-0">
      <section
        className="rounded-[18px]"
        style={{
          border: "1px solid var(--border-faint)",
          background: "var(--surface)",
          padding: "13px 15px",
        }}
      >
        <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase mb-2">
          {t("projects.notesLabel")}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => actions.onUpdateNotes(project.id, notes)}
          placeholder={t("projects.notesPlaceholder")}
          rows={compact ? 3 : 4}
          aria-label={t("projects.notesLabel")}
          className="w-full resize-y rounded-[11px] border border-border-faint bg-[var(--surface-raised)] px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-faint outline-none"
        />
      </section>

      <PaintingForm
        project={project}
        actions={actions}
        surfaceM2={summary.totalSurfaceAreaM2}
        coatTotals={summary.paintCoatTotals}
        paintKg={summary.paintKgNeeded}
        paintCost={summary.paintingCost}
        currencySymbol={sym}
      />

      <section
        className="rounded-[18px]"
        style={{
          border: "1px solid var(--border-faint)",
          background: "var(--surface)",
          padding: "13px 15px",
        }}
      >
        <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase mb-2">
          {t("projects.activityLabel")}
        </div>
        {activity.length === 0 ? (
          <p className="text-[12.5px] text-muted-faint">{t("projects.activity.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.slice(0, 12).map((entry, index) => (
              <li key={entry.id} className="flex gap-2.5 items-baseline">
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: 5,
                    height: 5,
                    background: index === 0 ? "var(--accent)" : "var(--border)",
                  }}
                  aria-hidden="true"
                />
                <span className="text-[12.5px] text-foreground-secondary leading-snug">
                  {formatActivity(entry, t)}
                  <span className="text-muted-faint"> · {formatRelativeTime(entry.at, t)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <div
        className="flex-shrink-0"
        style={{
          padding: compact ? "0 0 14px" : "16px 32px 16px",
          borderBottom: compact ? "none" : "1px solid var(--border-faint)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer font-mono text-[11.5px] text-muted hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t("projects.backToProjects")}
          {project.client?.trim() && <span className="text-muted-faint">› {project.client}</span>}
        </button>

        <div className="flex items-center gap-3 flex-wrap mt-1.5">
          <div className="flex items-center gap-2.5 min-w-0" style={{ flex: "1 1 240px" }}>
            <EditableTitle
              name={project.name}
              onRename={(name) => actions.onRename(project.id, name)}
              compact={compact}
            />
            <StatusBadge
              status={summary.status}
              name={project.name}
              onChange={(status) => actions.onUpdateMeta(project.id, { status })}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => actions.onPrintQuote(project)}
              disabled={summary.isEmpty}
              title={t("quote.print")}
              className="inline-flex items-center gap-2 rounded-[11px] font-bold text-[12.5px]"
              style={{
                padding: "8px 13px",
                border: "1px solid var(--border-faint)",
                background: "var(--surface)",
                color: "var(--foreground)",
                cursor: summary.isEmpty ? "default" : "pointer",
                opacity: summary.isEmpty ? 0.45 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9V3h12v6" />
                <path d="M6 18H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2" />
                <path d="M6 14h12v7H6z" />
              </svg>
              {t("quote.short")}
            </button>
            <button
              type="button"
              onClick={() => actions.onAddItem(project.id)}
              className="inline-flex items-center gap-2 rounded-[11px] font-bold text-[12.5px] cursor-pointer"
              style={{
                padding: "8px 13px",
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              <DeskIcon name="plus" stroke="var(--accent-contrast)" />
              {t("projects.addItem")}
            </button>
            <RowMenu items={menuItems} ariaLabel={project.name} />
          </div>
        </div>

        <div className="font-mono text-[11.5px] text-muted mt-1">
          {subtitleParts.join(" · ")}
        </div>

        {editingDetails && (
          <DetailsForm
            project={project}
            actions={actions}
            onDone={() => setEditingDetails(false)}
          />
        )}
      </div>

      <div
        className={compact ? "flex flex-col gap-3 pt-3" : "flex-1 overflow-y-auto"}
        style={compact ? undefined : { padding: "20px 32px 32px" }}
      >
        <div
          className={compact ? "flex flex-col gap-3" : "grid gap-4 items-start"}
          style={
            compact
              ? undefined
              : { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 340px)" }
          }
        >
          <div className="flex flex-col gap-3 min-w-0">
            <div
              className="grid gap-2.5"
              style={{
                gridTemplateColumns: compact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fit, minmax(140px, 1fr))",
              }}
            >
              <StatTile label={t("projects.stats.items")} value={String(summary.itemCount)} />
              <StatTile
                label={t("projects.stats.weight")}
                tone="accent"
                value={`${fsWeight(summary.totalWeightKg)} ${fsWeightUnit()}`}
              />
              <StatTile
                label={t("projects.stats.materialCost")}
                value={`${sym} ${fsMoney(summary.totalCost)}`}
              />
              <StatTile
                emphasis
                tone="accent"
                label={t("projects.stats.quoted", { margin: marginPercent })}
                value={`${sym} ${fsMoney(summary.hasPainting ? summary.quotedWithPaint : summary.quotedTotal)}`}
              />
              {summary.hasPainting && (
                <StatTile
                  label={t("projects.stats.paint")}
                  value={`${summary.paintKgNeeded} kg · ${sym} ${fsMoney(summary.paintingCost)}`}
                />
              )}
            </div>
            {itemsTable}
          </div>
          {compact ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowMore((on) => !on)}
                aria-expanded={showMore}
                className="self-start rounded-[10px] px-3 h-8 text-[12px] font-bold cursor-pointer"
                style={{
                  border: "1px solid var(--border-faint)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                }}
              >
                {showMore ? t("projects.hideDetails") : t("projects.moreDetails")}
              </button>
              {showMore && rail}
            </div>
          ) : (
            rail
          )}
        </div>
      </div>
    </div>
  );
}
