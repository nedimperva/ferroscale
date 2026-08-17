"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { Project } from "@/hooks/useProjects";
import {
  ALL_PROJECTS,
  collectProjectClients,
  countProjects,
  filterSortProjects,
  PROJECT_SORTS,
  sameBucket,
  type ProjectBucket,
  type ProjectSort,
} from "@/lib/projects/query";
import { EmptyState } from "../empty-state";
import { RowMenu } from "../row-menu";
import { SearchField } from "../search-field";
import { DeskIcon } from "../desktop/desk-atoms";
import { formatRelativeTime, projectSummary } from "./project-model";
import type { ProjectActions } from "./project-actions";

/**
 * The Projects list (2c): a table with the client each job belongs to, a rail
 * that filters by client, and row actions. What it replaces was a grid of
 * cards that could show a project and add to it, but had no way to rename it,
 * copy it, archive it or delete it.
 */

function BucketRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className="flex items-center gap-2 w-full rounded-[11px] text-left cursor-pointer"
      style={{
        padding: "8px 13px",
        background: active ? "var(--accent-surface)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
        fontWeight: active ? 700 : 600,
        fontSize: 13.5,
      }}
    >
      <span className="flex-1 min-w-0 truncate">{label}</span>
      <span className="font-mono text-[11px] text-muted">{count}</span>
    </button>
  );
}

function ClientChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded-full font-bold text-[11.5px] cursor-pointer whitespace-nowrap"
      style={{
        padding: "5px 11px",
        border: `1px solid ${active ? "var(--accent-border)" : "var(--border-faint)"}`,
        background: active ? "var(--accent-surface)" : "var(--surface)",
        color: active ? "var(--accent-text)" : "var(--muted)",
      }}
    >
      {label}
      <span className="font-mono text-[10px] text-muted-faint">{count}</span>
    </button>
  );
}

function ProjectRow({
  project,
  marginPercent,
  actions,
  onOpen,
  compact,
}: {
  project: Project;
  marginPercent: number;
  actions: ProjectActions;
  onOpen: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const summary = projectSummary(project, marginPercent);
  const sym = summary.currencySymbol;
  const weightText = summary.isEmpty
    ? "—"
    : `${fsWeight(summary.totalWeightKg)} ${fsWeightUnit()}`;
  const valueText = summary.isEmpty ? "—" : `${sym} ${fsMoney(summary.totalCost)}`;

  const menu = (
    <RowMenu
      ariaLabel={project.name}
      items={[
        { id: "open", label: t("common.open"), onSelect: onOpen },
        {
          id: "quote",
          label: t("quote.short"),
          disabled: summary.isEmpty,
          onSelect: () => actions.onPrintQuote(project),
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
      ]}
    />
  );

  const title = (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t("projects.openAria", { name: project.name })}
      className="flex-1 min-w-0 border-0 bg-transparent p-0 text-left cursor-pointer"
    >
      <span className="block font-extrabold text-[14px] text-foreground truncate">
        {project.name}
      </span>
      <span className="block font-mono text-[11px] text-muted-faint mt-0.5 truncate">
        {summary.isEmpty
          ? t("projects.emptyRow")
          : t("projects.updatedAgo", { ago: formatRelativeTime(project.updatedAt, t) })}
      </span>
    </button>
  );

  // On a phone the five columns become two lines: who and when on top, the
  // figures underneath. Wrapping the same row would leave the menu stranded
  // on a line of its own.
  if (compact) {
    return (
      <div
        className="flex flex-col gap-1.5 border-t border-border-faint first:border-t-0"
        style={{ padding: "11px 13px" }}
      >
        <div className="flex items-center gap-2">
          {title}
          {menu}
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[11.5px] flex-wrap">
          {project.client?.trim() && (
            <span className="text-foreground-secondary truncate" style={{ maxWidth: 150 }}>
              {project.client}
            </span>
          )}
          <span className="text-muted">
            {t("projects.itemCount", { count: summary.itemCount })}
          </span>
          <span className="font-bold" style={{ color: "var(--accent-text)" }}>
            {weightText}
          </span>
          <span className="font-semibold" style={{ color: "var(--blue-text)" }}>
            {valueText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 border-t border-border-faint first:border-t-0"
      style={{ padding: "10px 16px" }}
    >
      {title}
      <span className="text-[13px] text-foreground-secondary truncate" style={{ width: 150 }}>
        {project.client?.trim() || "—"}
      </span>
      <span
        className="font-mono text-[12.5px] text-muted text-right flex-shrink-0"
        style={{ width: 44 }}
      >
        {summary.itemCount}
      </span>
      <span
        className="font-mono text-[12.5px] font-bold text-right flex-shrink-0"
        style={{ width: 104, color: "var(--accent-text)" }}
      >
        {weightText}
      </span>
      <span
        className="font-mono text-[12.5px] font-semibold text-right flex-shrink-0"
        style={{ width: 116, color: "var(--blue-text)" }}
      >
        {valueText}
      </span>
      {menu}
    </div>
  );
}

export function ProjectList({
  projects,
  marginPercent,
  actions,
  onOpenProject,
  compact,
}: {
  projects: Project[];
  marginPercent: number;
  actions: ProjectActions;
  onOpenProject: (id: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<ProjectBucket>(ALL_PROJECTS);
  const [sort, setSort] = useState<ProjectSort>("updated");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const counts = useMemo(() => countProjects(projects), [projects]);
  const clients = useMemo(() => collectProjectClients(projects), [projects]);
  const visible = useMemo(
    () => filterSortProjects(projects, { search, bucket, sort }),
    [projects, search, bucket, sort],
  );

  const submitNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    actions.onCreate(trimmed);
    setNewName("");
    setCreating(false);
  };

  const buckets: Array<{ key: string; label: string; count: number; value: ProjectBucket }> = [
    { key: "all", label: t("projects.allProjects"), count: counts.active, value: ALL_PROJECTS },
    ...clients.map((entry) => ({
      key: `client:${entry.client}`,
      label: entry.client,
      count: entry.count,
      value: { kind: "client", client: entry.client } as ProjectBucket,
    })),
    ...(counts.unassigned > 0
      ? [
          {
            key: "unassigned",
            label: t("projects.unassigned"),
            count: counts.unassigned,
            value: { kind: "unassigned" } as ProjectBucket,
          },
        ]
      : []),
  ];

  const newProjectButton = (
    <button
      type="button"
      onClick={() => setCreating((v) => !v)}
      className="inline-flex items-center gap-2 rounded-[11px] font-bold text-[12.5px] cursor-pointer whitespace-nowrap"
      style={{
        padding: "9px 14px",
        border: "none",
        background: "var(--accent)",
        color: "var(--accent-contrast)",
      }}
    >
      <DeskIcon name="plus" stroke="var(--accent-contrast)" />
      {t("library.newProject")}
    </button>
  );

  const createRow = creating && (
    <div className="flex gap-2 mb-3" style={{ maxWidth: 420 }}>
      <input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitNew();
          if (e.key === "Escape") setCreating(false);
        }}
        autoFocus
        placeholder={t("library.newProjectName")}
        aria-label={t("library.newProjectName")}
        className="flex-1 h-10 rounded-xl border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
      />
      <button
        type="button"
        onClick={submitNew}
        disabled={!newName.trim()}
        className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("common.create")}
      </button>
    </div>
  );

  const table =
    visible.length === 0 ? (
      search.trim() ? (
        <EmptyState compact title={t("projects.noMatchTitle")} body={t("projects.noMatchBody")} />
      ) : bucket.kind === "archived" ? (
        <EmptyState
          compact
          title={t("projects.emptyArchivedTitle")}
          body={t("projects.emptyArchivedBody")}
        />
      ) : (
        <EmptyState
          compact={compact}
          icon={<DeskIcon name="projects" />}
          title={t("projects.emptyTitle")}
          body={t("projects.empty")}
          action={newProjectButton}
        />
      )
    ) : (
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
            style={{ padding: "10px 16px", background: "var(--surface-raised)" }}
          >
            <span className="flex-1 min-w-0">{t("projects.columns.project")}</span>
            <span style={{ width: 150 }}>{t("projects.columns.client")}</span>
            <span style={{ width: 44 }} className="text-right">
              {t("projects.columns.items")}
            </span>
            <span style={{ width: 104 }} className="text-right">
              {t("projects.columns.weight")}
            </span>
            <span style={{ width: 116 }} className="text-right">
              {t("projects.columns.value")}
            </span>
            <span style={{ width: 30 }} aria-hidden="true" />
          </div>
        )}
        {visible.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            marginPercent={marginPercent}
            actions={actions}
            compact={compact}
            onOpen={() => onOpenProject(project.id)}
          />
        ))}
      </div>
    );

  const sortSelect = (
    <label
      className="flex items-center gap-1.5 rounded-xl px-2.5 flex-shrink-0"
      style={{
        height: compact ? 34 : 38,
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
        {t("projects.sortLabel")}
      </span>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as ProjectSort)}
        aria-label={t("projects.sortLabel")}
        className="bg-transparent outline-none text-[12.5px] font-semibold text-foreground cursor-pointer"
      >
        {PROJECT_SORTS.map((value) => (
          <option key={value} value={value}>
            {t(`projects.sort.${value}`)}
          </option>
        ))}
      </select>
    </label>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <SearchField
              compact
              value={search}
              onChange={setSearch}
              placeholder={t("projects.searchPlaceholder")}
              ariaLabel={t("projects.searchAria")}
            />
          </div>
          {newProjectButton}
        </div>
        {createRow}
        {(clients.length > 0 || counts.archived > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {buckets.map((entry) => (
              <ClientChip
                key={entry.key}
                label={entry.label}
                count={entry.count}
                active={sameBucket(bucket, entry.value)}
                onClick={() => setBucket(entry.value)}
              />
            ))}
            {counts.archived > 0 && (
              <ClientChip
                label={t("projects.archived")}
                count={counts.archived}
                active={bucket.kind === "archived"}
                onClick={() => setBucket({ kind: "archived" })}
              />
            )}
          </div>
        )}
        {sortSelect}
        {table}
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <div
        className="flex items-center gap-4 flex-wrap flex-shrink-0"
        style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border-faint)" }}
      >
        <div className="min-w-0">
          <div className="font-extrabold text-xl text-foreground" style={{ letterSpacing: -0.4 }}>
            {t("nav.projects")}
          </div>
          <div className="font-mono text-[11.5px] text-muted mt-0.5">
            {t("projects.subtitleCounts", {
              active: counts.active,
              archived: counts.archived,
            })}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div style={{ width: 260 }}>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t("projects.searchPlaceholder")}
              ariaLabel={t("projects.searchAria")}
            />
          </div>
          {sortSelect}
          {newProjectButton}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <nav
          aria-label={t("projects.clientsLabel")}
          className="flex-shrink-0 overflow-y-auto"
          style={{ width: 216, borderRight: "1px solid var(--border-faint)", padding: "18px 12px" }}
        >
          <div
            className="fs-track-label text-[9.5px] font-bold text-muted-faint uppercase"
            style={{ padding: "0 13px 8px" }}
          >
            {t("projects.clientsLabel")}
          </div>
          <div className="flex flex-col gap-0.5">
            {buckets.map((entry) => (
              <BucketRow
                key={entry.key}
                label={entry.label}
                count={entry.count}
                active={sameBucket(bucket, entry.value)}
                onClick={() => setBucket(entry.value)}
              />
            ))}
          </div>
          {counts.archived > 0 && (
            <>
              <div style={{ height: 1, background: "var(--border-faint)", margin: "10px 8px" }} />
              <BucketRow
                label={t("projects.archived")}
                count={counts.archived}
                active={bucket.kind === "archived"}
                onClick={() => setBucket({ kind: "archived" })}
              />
            </>
          )}
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto" style={{ padding: "20px 32px 32px" }}>
          <div className="min-w-0">
            {createRow}
            {table}
          </div>
        </div>
      </div>
    </div>
  );
}
