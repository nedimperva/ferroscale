"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { Project, ProjectStatus } from "@/hooks/useProjects";
import { isClosedProject } from "@/hooks/useProjects";
import { getDueDateUrgency, type ProjectAttention } from "@/lib/projects/query";
import { RowMenu } from "../row-menu";
import { EmptyState } from "../empty-state";
import { formatRelativeTime, projectMix, projectSummary, type ProjectSummary } from "./project-model";
import type { ProjectActions } from "./project-actions";
import { ClientLink } from "../customers/client-link";

/**
 * The three ways the wide workspace can lay the same list out: cards (what a
 * job is made of), a board (where it stands) and a list with a quote peek
 * (what it adds up to). All three read one `ProjectSummary` per project and
 * share one menu, so a number means the same thing in each.
 */

/** The columns of an active board, left to right: a job's life in order. */
export const BOARD_STATUSES: ProjectStatus[] = ["draft", "quoted", "progress", "hold", "done"];

export const STATUS_DOT: Record<ProjectStatus, string> = {
  draft: "var(--border)",
  quoted: "var(--border-strong)",
  progress: "var(--accent)",
  hold: "var(--accent-text)",
  done: "var(--green-text, var(--foreground))",
  archived: "var(--foreground-secondary)",
};

const MIX_COLORS = ["var(--foreground)", "var(--foreground-secondary)", "var(--border-strong)", "var(--border)"];

type CommandT = ReturnType<typeof useTranslations>;

function money(s: ProjectSummary, n: number): string {
  return `${s.currencySymbol} ${fsMoney(n)}`;
}

function weightText(s: ProjectSummary): string {
  return s.isEmpty ? "—" : `${fsWeight(s.totalWeightKg)} ${fsWeightUnit()}`;
}

/** Due label and the one colour it earns: red when late, terracotta when close. */
function dueDisplay(t: CommandT, project: Project) {
  const urgency = getDueDateUrgency(project.dueDate);
  const closed = isClosedProject(project);
  if (closed || urgency.status === "none") {
    return { text: project.dueDate && !closed ? project.dueDate : "—", color: "var(--muted)", flag: false };
  }
  if (urgency.status === "overdue") {
    return { text: t("projects.urgency.overdue", { days: Math.abs(urgency.daysDiff) }), color: "var(--red-text)", flag: true };
  }
  if (urgency.status === "today") {
    return { text: t("projects.urgency.today"), color: "var(--accent-text)", flag: true };
  }
  if (urgency.status === "soon") {
    return { text: t("projects.urgency.soon", { days: urgency.daysDiff }), color: "var(--accent-text)", flag: true };
  }
  return { text: project.dueDate ?? "—", color: "var(--muted)", flag: false };
}

export function ProjectMenu({
  project,
  summary,
  actions,
  onOpen,
  moveTo,
}: {
  project: Project;
  summary: ProjectSummary;
  actions: ProjectActions;
  onOpen: () => void;
  /** Board only: the keyboard route for what dragging does. */
  moveTo?: ProjectStatus[];
}) {
  const t = useTranslations("command");
  return (
    <RowMenu
      ariaLabel={project.name}
      items={[
        { id: "open", label: t("common.open"), onSelect: onOpen },
        ...(moveTo ?? []).map((status) => ({
          id: `move-${status}`,
          label: t("projects.board.moveTo", { status: t(`projects.status.${status}`) }),
          onSelect: () => actions.onUpdateMeta(project.id, { status }),
        })),
        {
          id: "quote",
          label: t("quote.short"),
          disabled: summary.isEmpty,
          onSelect: () => actions.onPrintQuote(project),
        },
        { id: "duplicate", label: t("projects.duplicate"), onSelect: () => actions.onDuplicate(project.id) },
        {
          id: "archive",
          label: summary.status === "archived" ? t("common.unarchive") : t("common.archive"),
          onSelect: () =>
            actions.onUpdateMeta(project.id, {
              status: summary.status === "archived" ? "draft" : "archived",
            }),
        },
        { id: "delete", label: t("common.delete"), danger: true, onSelect: () => actions.onDelete(project.id) },
      ]}
    />
  );
}

function MixBar({ project, height, showLabels }: { project: Project; height: number; showLabels?: boolean }) {
  const t = useTranslations("command");
  const mix = useMemo(() => projectMix(project, t("projects.mixOther")), [project, t]);
  if (mix.length === 0) {
    return <div style={{ height, background: "var(--surface-inset)" }} aria-hidden />;
  }
  return (
    <>
      <div className="flex" style={{ height, gap: 1 }} aria-hidden>
        {mix.map((m, i) => (
          <div key={m.label} style={{ height, width: `${m.pct}%`, background: MIX_COLORS[i] }} />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap font-mono text-[10px] text-muted" style={{ gap: 10, marginTop: 5 }}>
          {mix.map((m) => (
            <span key={m.label}>
              {m.label} {m.pct}%
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9px] text-muted uppercase" style={{ letterSpacing: 1.4 }}>
        {label}
      </div>
      <div className="font-mono text-[12px] truncate" style={{ color: color ?? "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: ProjectStatus }) {
  const t = useTranslations("command");
  return (
    <span
      className="font-mono text-[10px] uppercase"
      style={{
        letterSpacing: 1,
        border: "1px solid var(--border-faint)",
        background: "var(--surface-inset)",
        padding: "1px 6px",
      }}
    >
      {t(`projects.status.${status}`)}
    </span>
  );
}

function marginColor(s: ProjectSummary): string {
  return !s.isEmpty && s.marginPercent <= 0 ? "var(--red-text)" : "var(--foreground)";
}

const selectBox = "accent-[var(--accent)] cursor-pointer";

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */

function ProjectCard({
  project,
  marginPercent,
  actions,
  onOpen,
  selected,
  onToggleSelect,
}: {
  project: Project;
  marginPercent: number;
  actions: ProjectActions;
  onOpen: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const t = useTranslations("command");
  const s = projectSummary(project, marginPercent);
  const due = dueDisplay(t, project);
  return (
    <div
      className="flex flex-col"
      style={{
        background: selected ? "var(--accent-surface)" : "var(--surface)",
        border: "1px solid var(--border-faint)",
        borderTop: due.flag ? "2px solid var(--accent)" : "1px solid var(--border)",
        padding: "16px 16px 12px",
      }}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className={`${selectBox} mt-1.5`}
          aria-label={`Select ${project.name}`}
        />
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("projects.openAria", { name: project.name })}
          className="flex-1 min-w-0 border-0 bg-transparent p-0 text-left cursor-pointer"
        >
          <span className="flex items-baseline justify-between gap-2.5">
            <span className="fs-title text-[21px] leading-[1.15] truncate">{project.name}</span>
            <span className="font-mono text-[17px] font-medium whitespace-nowrap" style={{ color: "var(--accent)" }}>
              {s.isEmpty ? "—" : money(s, s.quotedTotal)}
            </span>
          </span>
          <span className="flex items-center gap-2 mt-1 text-[12px] text-foreground-secondary">
            <span className="truncate">{project.client || "—"}</span>
            <StatusTag status={s.status} />
          </span>
        </button>
        <ProjectMenu project={project} summary={s} actions={actions} onOpen={onOpen} />
      </div>

      <div style={{ marginTop: 12 }}>
        <MixBar project={project} height={12} showLabels />
      </div>

      <div
        className="grid grid-cols-4"
        style={{ gap: 6, borderTop: "1px solid var(--border-faint)", marginTop: 12, paddingTop: 9 }}
      >
        <Stat label={t("projects.stats.weight")} value={weightText(s)} />
        <Stat
          label={t("projects.stats.margin")}
          value={s.isEmpty ? "—" : `${s.marginPercent}%`}
          color={marginColor(s)}
        />
        <Stat label={t("projects.stats.items")} value={s.isEmpty ? "—" : String(s.itemCount)} />
        <Stat label={t("projects.stats.due")} value={due.text} color={due.color} />
      </div>

      <div className="font-mono text-[11px] text-muted-faint" style={{ marginTop: 10 }}>
        {s.isEmpty
          ? t("projects.emptyRow")
          : t("projects.updatedAgo", { ago: formatRelativeTime(project.updatedAt, t) })}
      </div>
    </div>
  );
}

export function ProjectCards(props: {
  projects: Project[];
  marginPercent: number;
  actions: ProjectActions;
  onOpenProject: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, padding: "8px 0 4px" }}
    >
      {props.projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          marginPercent={props.marginPercent}
          actions={props.actions}
          onOpen={() => props.onOpenProject(project.id)}
          selected={props.selectedIds.has(project.id)}
          onToggleSelect={() => props.onToggleSelect(project.id)}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board                                                              */
/* ------------------------------------------------------------------ */

function BoardCard({
  project,
  marginPercent,
  actions,
  onOpen,
}: {
  project: Project;
  marginPercent: number;
  actions: ProjectActions;
  onOpen: () => void;
}) {
  const t = useTranslations("command");
  const s = projectSummary(project, marginPercent);
  const due = dueDisplay(t, project);
  const moveTo = BOARD_STATUSES.filter((status) => status !== s.status);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-faint)",
        borderTop: due.flag ? "2px solid var(--accent)" : "1px solid var(--border)",
        padding: "11px 12px 10px",
        cursor: "grab",
      }}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("projects.openAria", { name: project.name })}
          className="flex-1 min-w-0 border-0 bg-transparent p-0 text-left cursor-pointer"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="fs-title text-[16px] leading-[1.15] truncate">{project.name}</span>
            <span className="font-mono text-[13px] font-medium whitespace-nowrap" style={{ color: "var(--accent)" }}>
              {s.isEmpty ? "—" : money(s, s.quotedTotal)}
            </span>
          </span>
          <span className="block text-[12px] text-foreground-secondary truncate" style={{ margin: "2px 0 10px" }}>
            {project.client || "—"}
          </span>
        </button>
        <ProjectMenu project={project} summary={s} actions={actions} onOpen={onOpen} moveTo={moveTo} />
      </div>
      <MixBar project={project} height={8} />
      <div
        className="grid grid-cols-2"
        style={{ gap: 6, borderTop: "1px solid var(--border-faint)", marginTop: 10, paddingTop: 8 }}
      >
        <Stat label={t("projects.stats.weight")} value={weightText(s)} />
        <Stat label={t("projects.stats.margin")} value={s.isEmpty ? "—" : `${s.marginPercent}%`} color={marginColor(s)} />
        <Stat label={t("projects.stats.items")} value={s.isEmpty ? "—" : String(s.itemCount)} />
        <Stat label={t("projects.stats.due")} value={due.text} color={due.color} />
      </div>
    </div>
  );
}

export function ProjectBoard({
  projects,
  statuses,
  marginPercent,
  actions,
  onOpenProject,
}: {
  projects: Project[];
  statuses: ProjectStatus[];
  marginPercent: number;
  actions: ProjectActions;
  onOpenProject: (id: string) => void;
}) {
  const t = useTranslations("command");
  const [over, setOver] = useState<ProjectStatus | null>(null);
  const columns = useMemo(
    () =>
      statuses.map((status) => {
        const cards = projects.filter((p) => projectSummary(p, marginPercent).status === status);
        const total = cards.reduce((sum, p) => sum + projectSummary(p, marginPercent).quotedTotal, 0);
        const symbol = cards[0] ? projectSummary(cards[0], marginPercent).currencySymbol : "€";
        return { status, cards, total, symbol };
      }),
    [projects, statuses, marginPercent],
  );

  return (
    <div
      className="flex overflow-x-auto"
      style={{ borderTop: "1px solid var(--border-faint)", marginTop: 8, minHeight: 360 }}
    >
      {columns.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => {
            e.preventDefault();
            if (over !== col.status) setOver(col.status);
          }}
          onDragLeave={() => setOver((cur) => (cur === col.status ? null : cur))}
          onDrop={(e) => {
            e.preventDefault();
            setOver(null);
            const id = e.dataTransfer.getData("text/plain");
            if (id) actions.onUpdateMeta(id, { status: col.status });
          }}
          className="flex flex-col"
          style={{
            flex: "1 0 230px",
            minWidth: 230,
            borderRight: "1px solid var(--border-faint)",
            padding: "4px 12px 12px",
            gap: 10,
            background: over === col.status ? "var(--accent-surface)" : "transparent",
          }}
        >
          <div
            className="flex items-baseline justify-between"
            style={{ borderBottom: "1px solid var(--foreground)", padding: "10px 0 8px" }}
          >
            <span
              className="flex items-center gap-[7px] font-mono text-[10px] font-medium uppercase"
              style={{ letterSpacing: 1.6 }}
            >
              <span aria-hidden style={{ width: 7, height: 7, background: STATUS_DOT[col.status] }} />
              {t(`projects.status.${col.status}`)} · {col.cards.length}
            </span>
            <span className="font-mono text-[12px] text-muted">
              {col.cards.length ? `${col.symbol} ${fsMoney(col.total)}` : "—"}
            </span>
          </div>
          {col.cards.map((project) => (
            <BoardCard
              key={project.id}
              project={project}
              marginPercent={marginPercent}
              actions={actions}
              onOpen={() => onOpenProject(project.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  List + quote peek                                                  */
/* ------------------------------------------------------------------ */

export function AttentionStrip({ attention }: { attention: ProjectAttention }) {
  const t = useTranslations("command");
  const cells: Array<{ n: number; label: string; color: string }> = [
    { n: attention.overdue, label: t("projects.attention.overdue"), color: "var(--red-text)" },
    { n: attention.dueSoon, label: t("projects.attention.dueSoon"), color: "var(--accent-text)" },
    { n: attention.noMargin, label: t("projects.attention.noMargin"), color: "var(--red-text)" },
    { n: attention.emptyDrafts, label: t("projects.attention.emptyDrafts"), color: "var(--foreground)" },
  ];
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4"
      style={{ border: "1px solid var(--border-faint)", background: "var(--surface)", marginTop: 8 }}
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          className="flex items-baseline gap-2.5"
          style={{ padding: "10px 16px", borderLeft: i === 0 ? undefined : "1px solid var(--border-faint)" }}
        >
          <span
            className="font-mono text-[20px] font-medium"
            style={{ color: c.n > 0 ? c.color : "var(--muted-faint)" }}
          >
            {c.n}
          </span>
          <span className="text-[12px] text-foreground-secondary leading-[1.3]">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function PeekLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between text-[13px]"
      style={{ padding: "8px 0", borderBottom: "1px solid var(--border-faint)" }}
    >
      <span className="text-foreground-secondary">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function QuotePeek({
  project,
  marginPercent,
  actions,
  onOpen,
}: {
  project: Project;
  marginPercent: number;
  actions: ProjectActions;
  onOpen: () => void;
}) {
  const t = useTranslations("command");
  const s = projectSummary(project, marginPercent);
  const button: CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--foreground)",
    cursor: "pointer",
  };
  return (
    <aside
      aria-label={t("projects.peek.title")}
      style={{ flex: "1 1 320px", padding: "18px 22px", background: "var(--surface)" }}
    >
      <div className="font-mono text-[10px] text-muted uppercase" style={{ letterSpacing: 1.6 }}>
        {t("projects.peek.title")}
      </div>
      <div className="fs-title text-[26px]" style={{ margin: "4px 0 2px" }}>
        {project.name}
      </div>
      <div className="text-[12px] text-foreground-secondary">
        <ClientLink project={project} onOpenCustomer={actions.onOpenCustomer} /> ·{" "}
        {t("projects.peek.items", { count: s.itemCount })} · {weightText(s)}
      </div>
      <div style={{ marginTop: 14 }}>
        <MixBar project={project} height={8} />
      </div>
      <div style={{ marginTop: 14, borderTop: "1px solid var(--foreground)" }}>
        {!s.isEmpty && <PeekLine label={t("projects.peek.material")} value={money(s, s.materialQuotedTotal)} />}
        {s.hasLabor && (
          <PeekLine label={t("projects.peek.labour", { hours: s.laborHours })} value={money(s, s.laborCost)} />
        )}
        {s.hasAdditionalCosts && (
          <PeekLine label={t("projects.peek.extras")} value={money(s, s.additionalCostsTotal)} />
        )}
        {s.hasPainting && <PeekLine label={t("projects.peek.paint")} value={money(s, s.paintingCost)} />}
        <div className="flex justify-between items-baseline text-[13px] font-extrabold" style={{ padding: "10px 0" }}>
          <span>{t("projects.peek.total")}</span>
          <span className="font-mono text-[20px] font-medium" style={{ color: "var(--accent)" }}>
            {s.isEmpty ? "—" : money(s, s.quotedTotal)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap" style={{ gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={onOpen}
          style={{ ...button, background: "var(--action)", color: "var(--action-contrast)", border: "none" }}
        >
          {t("common.open")}
        </button>
        <button
          type="button"
          disabled={s.isEmpty}
          onClick={() => actions.onPrintQuote(project)}
          style={{ ...button, opacity: s.isEmpty ? 0.4 : 1 }}
        >
          {t("projects.peek.print")}
        </button>
        <button type="button" onClick={() => actions.onDuplicate(project.id)} style={button}>
          {t("projects.duplicate")}
        </button>
      </div>
    </aside>
  );
}

export function ProjectPeekList({
  projects,
  marginPercent,
  actions,
  onOpenProject,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: {
  projects: Project[];
  marginPercent: number;
  actions: ProjectActions;
  onOpenProject: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}) {
  const t = useTranslations("command");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = projects.find((p) => p.id === pickedId) ?? projects[0];
  if (!picked) return <EmptyState compact title={t("projects.noMatchTitle")} body={t("projects.noMatchBody")} />;

  return (
    <div
      className="flex flex-wrap"
      style={{ border: "1px solid var(--border-faint)", borderTop: 0, minHeight: 360, marginBottom: 4 }}
    >
      <div
        role="table"
        aria-label={t("nav.projects")}
        style={{ flex: "1 1 440px", minWidth: 0, padding: "0 16px", borderRight: "1px solid var(--border-faint)" }}
      >
        <div
          role="row"
          className="flex items-center gap-3 font-mono text-[10px] text-muted uppercase"
          style={{ letterSpacing: 1.4, padding: "10px 8px", borderBottom: "1px solid var(--border-faint)" }}
        >
          <input
            type="checkbox"
            checked={selectedIds.size === projects.length}
            onChange={onToggleSelectAll}
            className={selectBox}
            aria-label="Select all"
          />
          <span role="columnheader" className="flex-1">{t("projects.columns.project")}</span>
          <span role="columnheader" style={{ width: 90 }} className="text-right">{t("projects.columns.value")}</span>
          <span role="columnheader" style={{ width: 96 }} className="text-right">{t("projects.stats.due")}</span>
        </div>
        {projects.map((project) => {
          const s = projectSummary(project, marginPercent);
          const due = dueDisplay(t, project);
          const active = project.id === picked.id;
          return (
            <div
              key={project.id}
              role="row"
              className="flex items-center gap-3"
              style={{
                padding: "0 8px",
                borderBottom: "1px solid var(--border-faint)",
                borderLeft: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                background: active ? "var(--accent-surface)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(project.id)}
                onChange={() => onToggleSelect(project.id)}
                className={selectBox}
                aria-label={`Select ${project.name}`}
              />
              <button
                type="button"
                onClick={() => setPickedId(project.id)}
                onDoubleClick={() => onOpenProject(project.id)}
                aria-pressed={active}
                className="flex flex-1 min-w-0 items-center gap-3 border-0 bg-transparent text-left cursor-pointer"
                style={{ padding: "10px 0", color: "var(--foreground)" }}
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-extrabold text-[14px] truncate">{project.name}</span>
                  <span className="block text-[12px] text-foreground-secondary truncate">
                    {project.client || "—"} · {t(`projects.status.${s.status}`)}
                  </span>
                </span>
                <span className="font-mono text-[13px] font-medium text-right" style={{ width: 90 }}>
                  {s.isEmpty ? "—" : money(s, s.quotedTotal)}
                </span>
                <span className="font-mono text-[11px] text-right" style={{ width: 96, color: due.color }}>
                  {due.text}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <QuotePeek
        project={picked}
        marginPercent={marginPercent}
        actions={actions}
        onOpen={() => onOpenProject(picked.id)}
      />
    </div>
  );
}
