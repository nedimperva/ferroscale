"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import {
  exportProjectCsv,
  PROJECT_CATEGORIES,
  type Project,
} from "@/hooks/useProjects";
import {
  ALL_PROJECTS,
  calculatePipelineAggregates,
  collectProjectClients,
  countProjects,
  filterSortProjects,
  getDueDateUrgency,
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

function PipelineStatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent";
}) {
  return (
    <div
      className="rounded-[12px] p-2.5 min-w-0"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      <div className="fs-track-label text-[9px] font-bold text-muted uppercase truncate">
        {label}
      </div>
      <div
        className="font-mono font-bold mt-0.5 truncate text-[14.5px]"
        style={{
          color: tone === "accent" ? "var(--accent-text)" : "var(--foreground)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

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
      className="flex items-center gap-2 w-full rounded-button text-left cursor-pointer"
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
  selected,
  onToggleSelect,
}: {
  project: Project;
  marginPercent: number;
  actions: ProjectActions;
  onOpen: () => void;
  compact?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const t = useTranslations("command");
  const summary = projectSummary(project, marginPercent);
  const sym = summary.currencySymbol;
  const weightText = summary.isEmpty
    ? "—"
    : `${fsWeight(summary.totalWeightKg)} ${fsWeightUnit()}`;
  const valueText = summary.isEmpty ? "—" : `${sym} ${fsMoney(summary.quotedTotal)}`;

  const urgency = getDueDateUrgency(project.dueDate);

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
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-extrabold text-[14px] text-foreground truncate">
          {project.name}
        </span>
        {project.category && (
          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--surface-inset)] text-muted border border-[var(--border-faint)]">
            {t(`projects.categories.${project.category}`)}
          </span>
        )}
      </div>
      <span className="block font-mono text-[11px] text-muted-faint mt-0.5 truncate">
        {summary.isEmpty
          ? t("projects.emptyRow")
          : t("projects.updatedAgo", { ago: formatRelativeTime(project.updatedAt, t) })}
      </span>
    </button>
  );

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-panel p-3"
        style={{
          border: `1px solid ${selected ? "var(--accent)" : "var(--border-faint)"}`,
          background: selected ? "var(--accent-surface)" : "var(--surface)",
        }}
      >
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="accent-[var(--accent)] mr-1 cursor-pointer"
            aria-label={`Select ${project.name}`}
          />
        )}
        <div className="flex-1 min-w-0">{title}</div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {urgency.status === "overdue" && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500 border border-red-500/30">
                🔴 {t("projects.urgency.overdue", { days: Math.abs(urgency.daysDiff) })}
              </span>
            )}
            {urgency.status === "today" && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                🟠 {t("projects.urgency.today")}
              </span>
            )}
            {urgency.status === "soon" && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                🟡 {t("projects.urgency.soon", { days: urgency.daysDiff })}
              </span>
            )}
            <span className="font-mono text-xs font-bold text-foreground">{valueText}</span>
          </div>
          <span className="font-mono text-[11px] text-muted">{weightText}</span>
        </div>
        {menu}
      </div>
    );
  }

  return (
    <div
      role="row"
      className="flex items-center gap-3 border-t border-[var(--border-faint)] transition-colors hover:bg-[var(--surface-raised)]"
      style={{
        padding: "10px 16px",
        background: selected ? "var(--accent-surface)" : undefined,
      }}
    >
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="accent-[var(--accent)] cursor-pointer"
          aria-label={`Select ${project.name}`}
        />
      )}
      <div role="cell" className="flex-1 min-w-0">
        {title}
      </div>
      <div role="cell" style={{ width: 140 }} className="flex flex-col min-w-0">
        <span className="text-[12.5px] text-foreground truncate">{project.client || "—"}</span>
        {urgency.status === "overdue" && (
          <span className="text-[10px] font-bold text-red-500">
            🔴 {t("projects.urgency.overdue", { days: Math.abs(urgency.daysDiff) })}
          </span>
        )}
        {urgency.status === "today" && (
          <span className="text-[10px] font-bold text-amber-500">
            🟠 {t("projects.urgency.today")}
          </span>
        )}
        {urgency.status === "soon" && (
          <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
            🟡 {t("projects.urgency.soon", { days: urgency.daysDiff })}
          </span>
        )}
        {urgency.status === "normal" && (
          <span className="text-[10.5px] font-mono text-muted">{project.dueDate}</span>
        )}
      </div>
      <div role="cell" style={{ width: 44 }} className="text-right font-mono text-[12.5px] text-foreground">
        {summary.isEmpty ? "—" : summary.itemCount}
      </div>
      <div role="cell" style={{ width: 104 }} className="text-right font-mono text-[12.5px] text-foreground">
        {weightText}
      </div>
      <div role="cell" style={{ width: 116 }} className="text-right font-mono text-[12.5px] font-bold text-foreground">
        {valueText}
      </div>
      <div role="cell" style={{ width: 30 }} className="flex justify-end">
        {menu}
      </div>
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
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<ProjectSort>("updated");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const counts = useMemo(() => countProjects(projects), [projects]);
  const clients = useMemo(() => collectProjectClients(projects), [projects]);
  const pipeline = useMemo(() => calculatePipelineAggregates(projects, marginPercent), [projects, marginPercent]);
  
  const visible = useMemo(
    () => filterSortProjects(projects, { search, bucket, category, sort }),
    [projects, search, bucket, category, sort],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((p) => p.id)));
    }
  };

  const handleBatchArchive = () => {
    if (actions.onBatchArchive && selectedIds.size > 0) {
      actions.onBatchArchive(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBatchDelete = () => {
    if (actions.onBatchDelete && selectedIds.size > 0) {
      actions.onBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBatchExport = () => {
    const selectedProjects = projects.filter((p) => selectedIds.has(p.id));
    for (const p of selectedProjects) {
      exportProjectCsv(p);
    }
  };

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
      className="inline-flex items-center gap-2 rounded-button font-bold text-[12.5px] cursor-pointer whitespace-nowrap"
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
        className="flex-1 h-10 rounded-button border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
      />
      <button
        type="button"
        onClick={submitNew}
        disabled={!newName.trim()}
        className="h-10 px-4 rounded-button bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("common.create")}
      </button>
    </div>
  );

  const batchBar = selectedIds.size > 0 && (
    <div
      className="flex items-center justify-between gap-3 p-2.5 rounded-xl mb-3 flex-wrap"
      style={{
        background: "var(--accent-surface)",
        border: "1px solid var(--accent-border)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-xs text-[var(--accent-text)]">
          {t("projects.batch.selected", { count: selectedIds.size })}
        </span>
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="text-xs text-muted hover:text-foreground cursor-pointer underline"
        >
          {t("projects.batch.clear")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBatchArchive}
          className="h-7 px-2.5 rounded-md text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground cursor-pointer"
        >
          {t("projects.batch.archive")}
        </button>
        <button
          type="button"
          onClick={handleBatchExport}
          className="h-7 px-2.5 rounded-md text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground cursor-pointer"
        >
          {t("projects.batch.exportCsv")}
        </button>
        <button
          type="button"
          onClick={handleBatchDelete}
          className="h-7 px-2.5 rounded-md text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 cursor-pointer"
        >
          {t("projects.batch.delete")}
        </button>
      </div>
    </div>
  );

  const categoryFilterStrip = (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 no-scrollbar">
      {["all", ...PROJECT_CATEGORIES].map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setCategory(cat)}
          className="h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
          style={{
            background: category === cat ? "var(--accent-surface)" : "var(--surface)",
            border: category === cat ? "1px solid var(--accent-border)" : "1px solid var(--border-faint)",
            color: category === cat ? "var(--accent-text)" : "var(--muted)",
          }}
        >
          {t(`projects.categories.${cat}`)}
        </button>
      ))}
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
        role="table"
        aria-label={t("nav.projects")}
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
            style={{ padding: "10px 16px", background: "var(--surface-raised)" }}
          >
            <input
              type="checkbox"
              checked={visible.length > 0 && selectedIds.size === visible.length}
              onChange={toggleSelectAll}
              className="accent-[var(--accent)] cursor-pointer"
              aria-label="Select all"
            />
            <span role="columnheader" className="flex-1 min-w-0">{t("projects.columns.project")}</span>
            <span role="columnheader" style={{ width: 140 }}>{t("projects.columns.client")}</span>
            <span role="columnheader" style={{ width: 44 }} className="text-right">
              {t("projects.columns.items")}
            </span>
            <span role="columnheader" style={{ width: 104 }} className="text-right">
              {t("projects.columns.weight")}
            </span>
            <span role="columnheader" style={{ width: 116 }} className="text-right">
              {t("projects.columns.value")}
            </span>
            <span role="columnheader" style={{ width: 30 }} aria-label={t("common.more")} />
          </div>
        )}
        {visible.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            marginPercent={marginPercent}
            actions={actions}
            compact={compact}
            selected={selectedIds.has(project.id)}
            onToggleSelect={() => toggleSelect(project.id)}
            onOpen={() => onOpenProject(project.id)}
          />
        ))}
      </div>
    );

  const sortSelect = (
    <label
      className="flex items-center gap-1.5 rounded-button px-2.5 flex-shrink-0"
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
        {batchBar}
        {categoryFilterStrip}
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
            {/* Pipeline KPI Summary Strip */}
            {bucket.kind !== "archived" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3.5">
                <PipelineStatTile
                  label={t("projects.pipeline.active")}
                  value={`${pipeline.activeCount} jobs`}
                />
                <PipelineStatTile
                  label={t("projects.pipeline.steel")}
                  value={
                    pipeline.totalWeightKg >= 1000
                      ? `${(pipeline.totalWeightKg / 1000).toFixed(2)} t`
                      : `${fsWeight(pipeline.totalWeightKg)} kg`
                  }
                  tone="accent"
                />
                <PipelineStatTile
                  label={t("projects.pipeline.value")}
                  value={`€ ${fsMoney(pipeline.totalQuotedValue)}`}
                  tone="accent"
                />
                <PipelineStatTile
                  label={t("projects.pipeline.clients")}
                  value={`${pipeline.clientCount} clients`}
                />
              </div>
            )}

            {createRow}
            {batchBar}
            {categoryFilterStrip}
            {table}
          </div>
        </div>
      </div>
    </div>
  );
}
