"use client";

import dynamic from "next/dynamic";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cmdParse, fsMoney, fsWeight, fsWeightUnit, type CalculationInput } from "@ferroscale/metal-core";
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  type Project,
  type ProjectCategory,
  type ProjectStatus,
} from "@/hooks/useProjects";
import { defaultUnitStore, sharedCalcSettingsStore } from "@/lib/settings-stores";
import {
  assemblyLabels,
  projectBillOfMaterial,
  type BomCut,
  type BomLine,
} from "@/lib/projects/bill-of-material";
import { CommandGlyph } from "../command-glyph";
import { familyForInput } from "../command-copy";
import { RowMenu } from "../row-menu";
import { DeskIcon } from "../desktop/desk-atoms";
/**
 * The 1D bar and 2D plate optimisers, their cut maps and their settings are
 * the largest leaf in the app and are reachable only from this one tab. The
 * shell has no code splitting at all, so every byte of them was downloaded
 * before anyone could run their first calculation. Loading them when the tab
 * opens costs a frame there and takes them off the first-load path.
 */
const ProjectCutting = dynamic(
  () => import("./project-cutting").then((m) => m.ProjectCutting),
  { ssr: false },
);
/** The material order and supplier RFQ — a tab of its own, not a chip
 *  inside the cut plan, which is where it used to be and where nobody
 *  looking for "what do I buy" would think to look. */
const ProjectProcurement = dynamic(
  () => import("./project-procurement").then((m) => m.ProjectProcurement),
  { ssr: false },
);
import {
  formatActivity,
  formatRelativeTime,
  formatShortDate,
  projectItemRows,
  projectSummary,
  toDateInputValue,
  type ProjectItemRow,
} from "./project-model";
import type { ProjectActions } from "./project-actions";
import { InsertAssemblyModal } from "./insert-assembly-modal";
import { ProjectQuote } from "./project-quote";
import { SheetShell } from "../sheets/sheet-shell";
import { ScaleAssemblyModal } from "./scale-assembly-modal";
import { SaveAssemblyToLibraryModal } from "./save-assembly-modal";
import type { SavedPart } from "@/hooks/useSaved";

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
      className="fs-track-label rounded-none font-bold text-[10px] uppercase cursor-pointer"
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

function CategoryBadge({
  category,
  onChange,
}: {
  category?: ProjectCategory;
  onChange: (cat: ProjectCategory | undefined) => void;
}) {
  const t = useTranslations("command");
  return (
    <select
      value={category ?? ""}
      onChange={(e) => onChange((e.target.value as ProjectCategory) || undefined)}
      aria-label="Project category"
      className="fs-track-label rounded-none font-semibold text-[10px] cursor-pointer"
      style={{
        padding: "4px 9px",
        border: "1px solid var(--border-faint)",
        background: category ? "var(--accent-surface)" : "var(--surface-inset)",
        color: category ? "var(--accent-text)" : "var(--muted)",
      }}
    >
      <option value="">{t("projects.noCategory")}</option>
      {PROJECT_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {t(`projects.categories.${cat}`)}
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
        className="fs-title text-foreground bg-transparent border-0 outline-none min-w-0 w-full"
        style={{ fontSize: compact ? 19 : 24 }}
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
      className="fs-title text-foreground text-left bg-transparent border-0 p-0 cursor-text min-w-0 truncate"
      style={{ fontSize: compact ? 19 : 24 }}
    >
      {name}
    </button>
  );
}

function DetailsForm({
  project,
  actions,
  marginPercent,
  onDone,
}: {
  project: Project;
  actions: ProjectActions;
  marginPercent: number;
  onDone: () => void;
}) {
  const t = useTranslations("command");
  const [client, setClient] = useState(project.client ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(project.dueDate));
  const [category, setCategory] = useState<string>(project.category ?? "");
  const [margin, setMargin] = useState<string>(
    project.marginPercent !== undefined ? String(project.marginPercent) : "",
  );

  const commit = () => {
    actions.onUpdateMeta(project.id, {
      client,
      dueDate,
      category: (category as ProjectCategory) || undefined,
      marginPercent: margin ? Number(margin) : undefined,
    });
    onDone();
  };

  return (
    <div
      className="flex items-end gap-3 flex-wrap rounded-button mt-3"
      style={{
        padding: "12px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      <label className="flex flex-col gap-1 min-w-0" style={{ flex: "1 1 180px" }}>
        <span className="fs-track-label text-[10px] font-bold text-muted uppercase">
          {t("projects.clientLabel")}
        </span>
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder={t("projects.clientPlaceholder")}
          className="h-11 sm:h-9 rounded-button border border-border-faint bg-[var(--surface)] px-3 text-[13px] text-foreground placeholder:text-muted-faint"
        />
      </label>

      <label className="flex flex-col gap-1 min-w-0" style={{ flex: "1 1 160px" }}>
        <span className="fs-track-label text-[10px] font-bold text-muted uppercase">
          {t("projects.categoryLabel")}
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 sm:h-9 rounded-button border border-border-faint bg-[var(--surface)] px-2.5 text-[13px] text-foreground font-semibold cursor-pointer"
        >
          <option value="">{t("projects.noCategory")}</option>
          {PROJECT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(`projects.categories.${cat}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 w-24">
        <span className="fs-track-label text-[10px] font-bold text-muted uppercase">
          {t("projects.markupMargin")} (%)
        </span>
        <input
          type="number"
          min={0}
          max={300}
          step={1}
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          placeholder={String(marginPercent)}
          className="h-11 sm:h-9 rounded-button border border-border-faint bg-[var(--surface)] px-2.5 text-[13px] font-mono text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="fs-track-label text-[10px] font-bold text-muted uppercase">
          {t("projects.dueLabel")}
        </span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-11 sm:h-9 rounded-button border border-border-faint bg-[var(--surface)] px-3 font-mono text-[13px] text-foreground"
        />
      </label>

      <button
        type="button"
        onClick={commit}
        className="h-11 sm:h-9 px-4 rounded-button font-bold text-[13px] cursor-pointer ml-auto"
        style={{ background: "var(--action)", color: "var(--action-contrast)", border: "none" }}
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
  const [seededFrom, setSeededFrom] = useState(row.quantity);
  if (seededFrom !== row.quantity) {
    setSeededFrom(row.quantity);
    setDraft(String(row.quantity));
  }

  if (row.isTemplate) {
    return <span className="font-mono text-[12px] text-foreground-secondary">{row.quantity}</span>;
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
      className="h-11 sm:h-8 w-[58px] rounded-chip border bg-[var(--surface)] px-2 text-center font-mono text-[12px] font-bold text-foreground"
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
      className="min-w-[6rem] flex-1 border-0 bg-transparent p-0 text-[11px] text-foreground-secondary outline-none placeholder:text-transparent group-hover:placeholder:text-muted-faint focus:placeholder:text-muted-faint"
    />
  );
}

function QuickAddCommandBar({
  projectId,
  actions,
  existingAssemblies,
  targetAssembly,
  onTargetAssemblyChange,
}: {
  projectId: string;
  actions: ProjectActions;
  existingAssemblies: string[];
  targetAssembly: string;
  onTargetAssemblyChange: (asm: string) => void;
}) {
  const t = useTranslations("command");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(false);

  const preview = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    try {
      const shared = sharedCalcSettingsStore.getSnapshot();
      return cmdParse(q, {
        pricing: {
          priceBasis: shared.priceBasis,
          priceUnit: shared.priceUnit,
          unitPrice: shared.unitPrice,
          currency: shared.currency,
          wastePercent: shared.wastePercent,
          includeVat: shared.includeVat,
          vatPercent: shared.vatPercent,
        },
        defaultGradeId: shared.defaultGradeId,
        defaultLengthUnit: defaultUnitStore.getSnapshot(),
      });
    } catch {
      return null;
    }
  }, [query]);

  const handleAdd = () => {
    const q = query.trim();
    if (!q) return;
    const ok = actions.onQuickAddItem?.(projectId, q, targetAssembly || undefined);
    if (ok) {
      setQuery("");
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-button bg-[var(--surface)] border border-[var(--border-faint)] mb-3 flex-wrap sm:flex-nowrap">
      <span className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1 whitespace-nowrap">
        + {t("projects.quickAdd")}:
      </span>
      {existingAssemblies.length > 0 && (
        <select
          value={targetAssembly}
          onChange={(e) => onTargetAssemblyChange(e.target.value)}
          aria-label={t("projects.targetAssembly")}
          className="h-11 sm:h-8 rounded-chip border border-[var(--border-faint)] bg-[var(--surface-raised)] px-2 text-xs font-semibold text-foreground cursor-pointer flex-shrink-0"
        >
          <option value="">{t("projects.generalSection")}</option>
          {existingAssemblies.map((asm) => (
            <option key={asm} value={asm}>
              {asm}
            </option>
          ))}
        </select>
      )}
      <input
        id="project-quick-add-input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (error) setError(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        placeholder={t("projects.quickAddPlaceholder")}
        aria-label="Quick add item command"
        className="flex-1 h-11 sm:h-8 min-w-[200px] rounded-chip border border-[var(--border-faint)] bg-[var(--surface-inset)] px-2.5 text-xs font-mono text-foreground placeholder:text-muted-faint outline-none"
        style={{ borderColor: error ? "var(--red-interactive)" : undefined }}
      />
      {preview?.calc && (
        <span className="font-mono text-[11px] font-bold px-2 py-1 rounded-none bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)] whitespace-nowrap">
          {fsWeight(preview.calc.result.totalWeightKg)} {fsWeightUnit()}
        </span>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!query.trim()}
        className="h-11 sm:h-8 px-3 rounded-chip text-xs font-bold bg-[var(--action)] text-[var(--action-contrast)] disabled:opacity-40 cursor-pointer flex items-center gap-1 flex-shrink-0"
      >
        <DeskIcon name="plus" stroke="var(--action-contrast)" />
        <span>{t("common.add")}</span>
      </button>
    </div>
  );
}

function AssemblyPickerModal({
  currentAssembly,
  existingAssemblies,
  onSelect,
  onClose,
}: {
  currentAssembly?: string;
  existingAssemblies: string[];
  onSelect: (assembly?: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const [customName, setCustomName] = useState("");

  const handleCustomSubmit = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onSelect(trimmed);
  };

  return (
    <SheetShell
      title={t("projects.assemblyPickerTitle")}
      onClose={onClose}
      size="compact"
      icon={
        <span className="flex items-center justify-center rounded-chip" style={{ width: 34, height: 34, background: "var(--accent-surface)" }}>
          <DeskIcon name="tag" stroke="var(--accent-text)" />
        </span>
      }
    >
      <div className="space-y-3">
        {/* Existing Assemblies Quick Select Chips */}
        {existingAssemblies.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
              {t("projects.existingAssemblies")}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {existingAssemblies.map((asm) => (
                <button
                  key={asm}
                  type="button"
                  onClick={() => onSelect(asm)}
                  className="px-2.5 py-1 rounded-chip text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1"
                  style={{
                    background: currentAssembly === asm ? "var(--accent-surface)" : "var(--surface-raised)",
                    borderColor: currentAssembly === asm ? "var(--accent-border)" : "var(--border-faint)",
                    color: currentAssembly === asm ? "var(--accent-text)" : "var(--foreground)",
                  }}
                >
                  <DeskIcon name="tag" />
                  <span>{asm}</span>
                  {currentAssembly === asm && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create new assembly */}
        <div className="space-y-1.5 pt-1 border-t border-[var(--border-faint)]">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
            + {t("projects.newAssemblyPlaceholder")}
          </div>
          <div className="flex gap-1.5">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
              }}
              autoFocus
              placeholder="e.g. Stringers, Handrail, Base Frame"
              className="flex-1 h-11 sm:h-8 rounded-chip border border-[var(--border-faint)] bg-[var(--surface-inset)] px-2.5 text-xs text-foreground placeholder:text-muted-faint outline-none"
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!customName.trim()}
              className="h-11 sm:h-8 px-3 rounded-chip text-xs font-bold bg-[var(--action)] text-[var(--action-contrast)] disabled:opacity-40 cursor-pointer"
            >
              {t("common.save")}
            </button>
          </div>
        </div>

        {/* Clear assembly */}
        {currentAssembly && (
          <div className="pt-2 border-t border-[var(--border-faint)]">
            <button
              type="button"
              onClick={() => onSelect(undefined)}
              className="w-full h-11 sm:h-8 rounded-chip text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 cursor-pointer"
            >
              {t("projects.clearAssembly")}
            </button>
          </div>
        )}
      </div>
    </SheetShell>
  );
}

type DetailTab = "bom" | "assemblies" | "cutting" | "order" | "details";

/** # · stock/cut · grade · pcs · qty · kg · cost · menu — one track list for
 *  the header, every stock line, every cut under it and the total, so the
 *  figures stand in columns all the way down. */
const BOM_ROW =
  "grid grid-cols-[28px_minmax(0,1fr)_72px_64px_92px_84px_100px_32px] items-center gap-x-3";

/**
 * What to buy for each stock line ("2 × 6m"), keyed like the bill of
 * material. It runs the bar and plate optimisers, which stay off the
 * first-load path (see `ProjectCutting` above), so the column fills in a
 * frame after the page does.
 */
function useStockToBuy(project: Project): Map<string, string> | null {
  const [state, setState] = useState<{ project: Project; byKey: Map<string, string> } | null>(null);
  useEffect(() => {
    let live = true;
    void import("@/lib/projects/cutting").then(({ computeProjectProcurementSummary }) => {
      if (!live) return;
      const order = computeProjectProcurementSummary(project);
      setState({ project, byKey: new Map(order.items.map((item) => [item.groupKey, item.rawStockUnits])) });
    });
    return () => {
      live = false;
    };
  }, [project]);
  return state?.project === project ? state.byKey : null;
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
  const [detailTab, setDetailTab] = useState<DetailTab>("bom");
  const [notes, setNotes] = useState(project.description ?? "");
  const [pickingAssemblyRow, setPickingAssemblyRow] = useState<(ReturnType<typeof projectItemRows>[number]) | null>(null);
  const [quickAddAssembly, setQuickAddAssembly] = useState<string>("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [scalingAssembly, setScalingAssembly] = useState<{ name: string; count: number } | null>(null);
  const [savingTemplateAsm, setSavingTemplateAsm] = useState<{ name: string; items: SavedPart[] } | null>(null);

  const summary = projectSummary(project, marginPercent);
  const rows = useMemo(() => projectItemRows(project), [project]);
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const bom = useMemo(() => projectBillOfMaterial(project), [project]);
  const asmLabels = useMemo(() => assemblyLabels(bom), [bom]);
  const buyByKey = useStockToBuy(project);
  const sym = summary.currencySymbol;
  const activity = project.activity ?? [];

  const subtitleParts = [
    project.client?.trim() || t("projects.unassigned"),
    project.dueDate ? t("projects.dueOn", { date: formatShortDate(project.dueDate) }) : null,
    t("projects.createdOn", { date: formatShortDate(project.createdAt) }),
  ].filter(Boolean) as string[];

  // All distinct existing sub-assemblies in the project
  const existingAssemblies = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => r.assembly?.trim()).filter(Boolean) as string[]),
    );
  }, [rows]);

  // Group rows by sub-assembly
  const assemblyGroups = useMemo(() => {
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const asm = row.assembly?.trim() || "";
      if (!groups.has(asm)) groups.set(asm, []);
      groups.get(asm)!.push(row);
    }
    return Array.from(groups.entries());
  }, [rows]);

  const hasMultipleAssemblies =
    assemblyGroups.length > 1 || (assemblyGroups.length === 1 && assemblyGroups[0][0] !== "");

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "bom", label: t("projects.tabs.bom") },
    { id: "assemblies", label: t("projects.tabs.assemblies") },
    { id: "cutting", label: t("projects.tabs.cutting") },
    { id: "order", label: t("projects.tabs.order") },
    ...(compact
      ? ([{ id: "details" as const, label: t("projects.tabs.details") }])
      : []),
  ];

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

  const renderItemRow = (row: (typeof rows)[number]) => {
    const fam = familyForInput(row.calc.input);
    const glyph = (
      <span className="flex flex-shrink-0 text-muted" style={{ width: 24 }} aria-hidden="true">
        {fam && <CommandGlyph fam={fam} alias={row.calc.input.profileId} size={17} />}
      </span>
    );

    // Every row here sits under its assembly's heading, so the row doesn't
    // repeat the name; moving it to another assembly is in its menu.
    const name = (
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <button
          type="button"
          onClick={() => actions.onOpenItem(row.calc.input)}
          title={t("projects.openInBar")}
          className="min-w-0 max-w-[60%] flex-shrink-0 truncate border-0 bg-transparent p-0 text-left text-[15px] font-bold text-foreground cursor-pointer"
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
            id: "assembly",
            label: t("projects.setAssembly"),
            onSelect: () => setPickingAssemblyRow(row),
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

    if (compact) {
      return (
        <div
          key={row.id}
          className="group flex flex-col gap-1.5 border-t border-border-faint first:border-t-0"
          style={{ padding: "10px 12px" }}
        >
          <div className="flex items-center gap-2">
            {glyph}
            {name}
            <QuantityCell row={row} projectId={project.id} actions={actions} />
            {menu}
          </div>
          <div
            className="flex items-center gap-2.5 font-mono text-[11px] flex-wrap"
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
        className="group flex items-center gap-3 border-t border-border-faint first:border-t-0 hover:bg-[var(--surface-raised)] transition-colors"
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
        <span className="font-mono text-[12px] font-bold text-foreground text-right" style={{ width: 96 }}>
          {fsWeight(row.weightKg)} {fsWeightUnit()}
        </span>
        <span className="font-mono text-[12px] font-bold text-right" style={{ width: 96, color: "var(--blue-text)" }}>
          {sym} {fsMoney(row.amount)}
        </span>
        <div style={{ width: 30 }} className="flex justify-end">
          {menu}
        </div>
      </div>
    );
  };

  const itemsTable = (
    <div
      className="rounded-panel-lg overflow-hidden"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        boxShadow: "var(--panel-shadow-soft)",
      }}
    >
      {!compact && (
        <div
          className="flex items-center gap-3 fs-track-label text-[10px] font-bold text-muted uppercase"
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
      ) : hasMultipleAssemblies ? (
        assemblyGroups.map(([asmName, asmRows]) => {
          const asmWeight = asmRows.reduce((s, r) => s + r.weightKg, 0);
          const asmCost = asmRows.reduce((s, r) => s + r.amount, 0);
          const saveAsTemplate = () => {
            const parts: SavedPart[] = asmRows.map((r) => ({
              id: crypto.randomUUID(),
              // The row's note is the part's name — one field, not two.
              name: r.calc.note?.trim() || r.calc.result.profileLabel,
              input: r.calc.input,
              result: r.calc.result,
              normalizedProfile: r.calc.normalizedProfile,
            }));
            setSavingTemplateAsm({ name: asmName, items: parts });
          };

          // Add / Scale / Save as three labelled chips forced a horizontal
          // scroller inside a vertical one on the phone. Same three actions,
          // one menu there; inline on the workspace where there is room.
          const groupActions = [
            ...(asmName
              ? [
                  {
                    id: "add",
                    label: t("projects.addToThisAssembly", { name: asmName }),
                    onSelect: () => setQuickAddAssembly(asmName),
                  },
                ]
              : []),
            {
              id: "scale",
              label: t("assembly.scaleTitle"),
              onSelect: () => setScalingAssembly({ name: asmName, count: asmRows.length }),
            },
            ...(asmRows.length > 0
              ? [
                  {
                    id: "save",
                    label: t("assembly.saveHint"),
                    onSelect: saveAsTemplate,
                  },
                ]
              : []),
          ];

          const groupChip = (
            label: string,
            icon: string,
            onClick: () => void,
            title: string,
          ) => (
            <button
              type="button"
              onClick={onClick}
              title={title}
              className="inline-flex items-center gap-1.5 rounded-chip text-[12px] font-semibold bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground cursor-pointer active:scale-95 transition-all"
              style={{ height: 26, padding: "0 9px" }}
            >
              <DeskIcon name={icon} />
              <span>{label}</span>
            </button>
          );

          return (
            <div
              key={`asm-${asmName || "main"}`}
              className="border-t first:border-t-0 border-[var(--border-faint)]"
            >
              <div
                className="group/asm flex items-center gap-2.5 bg-[var(--surface-inset)] border-b border-[var(--border-faint)]"
                style={{ padding: compact ? "9px 12px" : "9px 16px" }}
              >
                <span className="flex-shrink-0 text-foreground-secondary">
                  <DeskIcon name="tag" />
                </span>

                {compact ? (
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] font-bold text-foreground truncate">
                      {asmName || t("projects.generalSection")}{" "}
                      <span className="font-mono font-medium text-muted">{asmRows.length}</span>
                    </span>
                    <span className="font-mono text-[11px] text-foreground-secondary fs-display-num truncate">
                      {fsWeight(asmWeight)} {fsWeightUnit()} · {sym} {fsMoney(asmCost)}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-[13px] font-bold text-foreground">
                      {asmName || t("projects.generalSection")}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {t("projects.itemCount", { count: asmRows.length })}
                    </span>
                    {/* The same three actions sit in this heading's menu, so on every
                        heading at once they were noise; they show where you point. */}
                    <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover/asm:opacity-100 focus-within:opacity-100">
                      {asmName &&
                        groupChip(
                          t("common.add"),
                          "plus",
                          () => setQuickAddAssembly(asmName),
                          t("projects.addToThisAssembly", { name: asmName }),
                        )}
                      {groupChip(
                        t("assembly.scaleButton"),
                        "bolt",
                        () => setScalingAssembly({ name: asmName, count: asmRows.length }),
                        t("assembly.scaleTitle"),
                      )}
                      {asmRows.length > 0 &&
                        groupChip(
                          t("assembly.saveButton"),
                          "bookmark",
                          saveAsTemplate,
                          t("assembly.saveHint"),
                        )}
                    </div>
                    <span className="flex-1" />
                    <span className="font-mono text-[12px] font-semibold text-foreground-secondary fs-display-num">
                      {fsWeight(asmWeight)} {fsWeightUnit()}
                    </span>
                    <span
                      className="font-mono text-[12px] font-bold text-right fs-display-num"
                      style={{ width: 104, color: "var(--blue-text)" }}
                    >
                      {sym} {fsMoney(asmCost)}
                    </span>
                  </>
                )}

                <div className="flex-shrink-0">
                  <RowMenu
                    ariaLabel={asmName || t("projects.generalSection")}
                    items={groupActions}
                  />
                </div>
              </div>
              {asmRows.map(renderItemRow)}
            </div>
          );
        })
      ) : (
        rows.map(renderItemRow)
      )}
    </div>
  );

  const cutMenu = (cut: BomCut, row: ProjectItemRow | undefined, input: CalculationInput) => (
    <RowMenu
      ariaLabel={row?.specLabel ?? cut.cut}
      items={[
        { id: "open", label: t("projects.openInBar"), onSelect: () => actions.onOpenItem(input) },
        ...(row
          ? [{ id: "assembly", label: t("projects.setAssembly"), onSelect: () => setPickingAssemblyRow(row) }]
          : []),
        {
          id: "remove",
          label: t("projects.removeFromProject"),
          danger: true,
          onSelect: () => actions.onRemoveItem(project.id, cut.calc.id),
        },
      ]}
    />
  );

  /** One cut under its stock line: the length (opens it in the bar), the
   *  assembly it belongs to, its note, and the piece count you can edit. A
   *  part of an inserted assembly edits through that assembly, so its count
   *  is read-only here. */
  const renderCut = (cut: BomCut, showAssembly: boolean) => {
    const row = rowById.get(cut.calc.id);
    const isPart = cut.partIndex !== undefined;
    const input = isPart ? cut.calc.templateParts![cut.partIndex!].input : cut.calc.input;
    const editable = row && !isPart ? row : null;

    const label = (
      <span className="flex min-w-0 flex-col gap-0.5 py-1.5 pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <button
            type="button"
            onClick={() => actions.onOpenItem(input)}
            title={t("projects.openInBar")}
            className="border-0 bg-transparent p-0 text-left font-mono text-[12.5px] text-foreground fs-display-num cursor-pointer hover:underline"
          >
            {compact && !editable && <span className="text-foreground-secondary">{cut.pieces} × </span>}
            {cut.cut}
          </button>
          {showAssembly && cut.assembly && (
            <button
              type="button"
              onClick={() => row && setPickingAssemblyRow(row)}
              title={t("projects.assemblyPickerTitle")}
              className="fs-track-label border-0 bg-transparent p-0 text-[10px] font-bold uppercase text-muted hover:text-foreground cursor-pointer"
              style={{ fontSize: 10, lineHeight: "16px" }}
            >
              {cut.assembly}
            </button>
          )}
          {editable && <ItemNote row={editable} projectId={project.id} actions={actions} />}
        </span>
      </span>
    );

    const qty = editable ? (
      <QuantityCell row={editable} projectId={project.id} actions={actions} />
    ) : (
      <span className="font-mono text-[12px] text-foreground-secondary fs-display-num">{cut.pieces}</span>
    );

    if (compact) {
      return (
        <li key={cut.key} className="group flex items-center gap-2">
          <span className="min-w-0 flex-1">{label}</span>
          {editable && qty}
          <span className="w-[56px] text-right font-mono text-[12px] text-foreground-secondary fs-display-num">
            {fsWeight(cut.weightKg)}
          </span>
          {cutMenu(cut, row, input)}
        </li>
      );
    }

    return (
      <li key={cut.key} className={`group ${BOM_ROW} min-h-[40px] hover:bg-[var(--surface-raised)]`}>
        <span />
        {label}
        <span />
        <span className="flex justify-end">{qty}</span>
        <span />
        <span className="text-right font-mono text-[12.5px] text-foreground-secondary fs-display-num">
          {fsWeight(cut.weightKg)}
        </span>
        <span className="text-right font-mono text-[12.5px] text-foreground-secondary fs-display-num">
          {fsMoney(cut.amount)}
        </span>
        <span className="flex justify-end">{cutMenu(cut, row, input)}</span>
      </li>
    );
  };

  const lineQty = (line: BomLine) =>
    line.kind === "2d_plate" ? `${line.areaM2.toFixed(2)} m²` : `${line.lengthM.toFixed(2)} m`;
  const cutCount = bom.reduce((n, line) => n + line.cuts.length, 0);
  const totalPieces = bom.reduce((n, line) => n + line.pieces, 0);
  const NUM = "text-right font-mono text-[13px] font-semibold fs-display-num";

  /** The bill of material: one line per stock bought, its cuts beneath. */
  const bomTable =
    rows.length === 0 ? (
      <div
        className="font-mono text-[12px] text-muted-faint"
        style={{ padding: "18px 0", borderTop: "1px solid var(--foreground)" }}
      >
        {t("projects.emptyRow")}
      </div>
    ) : (
      <section aria-label={t("projects.tabs.bom")} className="flex flex-col">
        {!compact && (
          <div
            aria-hidden="true"
            className={`${BOM_ROW} fs-track-label pb-2 text-[10px] font-bold uppercase text-muted`}
            style={{ borderBottom: "1px solid var(--foreground)" }}
          >
            <span>#</span>
            <span>{t("projects.bom.columns.stock")}</span>
            <span>{t("projects.bom.columns.grade")}</span>
            <span className="text-right">{t("projects.bom.columns.pcs")}</span>
            <span className="text-right">{t("projects.bom.columns.qty")}</span>
            <span className="text-right">{t("projects.bom.columns.weight")}</span>
            <span className="text-right">{t("projects.bom.columns.amount")}</span>
            <span />
          </div>
        )}
        <ol
          className="m-0 list-none p-0"
          style={compact ? { borderTop: "1px solid var(--foreground)" } : undefined}
        >
          {bom.map((line, index) => {
            const buy = buyByKey?.get(line.key);
            const name = (
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[14px] font-semibold text-foreground">{line.name}</span>
                {asmLabels.line.has(line.key) && (
                  <span className="fs-track-label text-[10px] font-bold uppercase text-muted">
                    {asmLabels.line.get(line.key)}
                  </span>
                )}
                {compact && <span className="font-mono text-[11px] text-muted">{line.gradeLabel}</span>}
                {!compact && line.cuts.length > 1 && (
                  <span className="font-mono text-[11px] text-muted-faint">
                    {t("projects.bom.cutCount", { count: line.cuts.length })}
                  </span>
                )}
                {!compact && buy && (
                  <span className="font-mono text-[11px] text-muted">{t("projects.bom.buy", { units: buy })}</span>
                )}
              </span>
            );
            return (
              <li
                key={line.key}
                aria-label={t("projects.bom.lineAria", { name: line.name, count: line.cuts.length })}
                className="py-1.5"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {compact ? (
                  <div className="flex flex-col gap-0.5 pb-1 pt-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      {name}
                      <span className="font-mono text-[13px] font-semibold fs-display-num">{fsMoney(line.amount)}</span>
                    </div>
                    <div className="flex justify-between gap-3 font-mono text-[11px] text-muted fs-display-num">
                      <span>{buy ? t("projects.bom.buy", { units: buy }) : lineQty(line)}</span>
                      <span>
                        {fsWeight(line.weightKg)} {fsWeightUnit()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`${BOM_ROW} min-h-[44px]`}>
                    <span className="font-mono text-[12px] text-muted-faint">{String(index + 1).padStart(2, "0")}</span>
                    {name}
                    <span className="font-mono text-[12px] text-foreground-secondary">{line.gradeLabel}</span>
                    <span className={NUM}>{line.pieces}</span>
                    <span className={NUM}>{lineQty(line)}</span>
                    <span className={NUM}>{fsWeight(line.weightKg)}</span>
                    <span className={NUM}>{fsMoney(line.amount)}</span>
                    <span />
                  </div>
                )}
                <ol className="m-0 flex list-none flex-col p-0">{line.cuts.map((cut) => renderCut(cut, asmLabels.perCut.has(line.key)))}</ol>
              </li>
            );
          })}
        </ol>
        <div
          className={compact ? "flex items-baseline justify-between gap-3 py-3" : `${BOM_ROW} min-h-[52px]`}
          style={{ borderBottom: "3px double var(--foreground)" }}
        >
          {!compact && <span />}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <span className="text-[13px] font-semibold">{t("projects.bom.total")}</span>
            <span className="font-mono text-[11px] text-muted">
              {t("projects.bom.summary", { lines: bom.length, cuts: cutCount })}
            </span>
          </span>
          {!compact && (
            <>
              <span />
              <span className={NUM}>{totalPieces}</span>
              <span />
              <span className={NUM}>{fsWeight(summary.totalWeightKg)}</span>
            </>
          )}
          <span className={NUM}>
            {compact && `${sym} `}
            {fsMoney(summary.totalCost)}
          </span>
          {!compact && <span />}
        </div>
      </section>
    );

  const assemblyWeights = hasMultipleAssemblies
    ? assemblyGroups.map(([name, asmRows]) => ({
        name: name || t("projects.generalSection"),
        kg: asmRows.reduce((n, r) => n + r.weightKg, 0),
      }))
    : [];
  const heaviest = Math.max(1, ...assemblyWeights.map((a) => a.kg));

  const rail = (
    <div className="flex flex-col gap-8">
      <ProjectQuote
        project={project}
        actions={actions}
        summary={summary}
        globalMarginPercent={marginPercent}
      />

      {assemblyWeights.length > 0 && (
        <section aria-label={t("projects.quote.weightByAssembly")} className="flex flex-col">
          <div className="fs-track-label mb-2 text-[10px] font-bold uppercase text-muted">
            {t("projects.quote.weightByAssembly")}
          </div>
          {assemblyWeights.map((asm) => (
            <div
              key={asm.name}
              className="grid items-center gap-2.5"
              style={{ gridTemplateColumns: "minmax(0, 7rem) minmax(0, 1fr) 4.5rem", height: 28 }}
            >
              <span className="truncate text-[12.5px]">{asm.name}</span>
              <span className="block h-1.5" style={{ background: "var(--surface-inset)" }}>
                <span
                  className="block h-1.5"
                  style={{ width: `${(asm.kg / heaviest) * 100}%`, background: "var(--foreground-secondary)" }}
                />
              </span>
              <span className="text-right font-mono text-[12px] fs-display-num">{fsWeight(asm.kg)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col">
        <label
          htmlFor={`project-notes-${project.id}`}
          className="fs-track-label mb-2 text-[10px] font-bold uppercase text-muted"
        >
          {t("projects.notesLabel")}
        </label>
        <textarea
          id={`project-notes-${project.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => actions.onUpdateNotes(project.id, notes)}
          placeholder={t("projects.notesPlaceholder")}
          rows={compact ? 3 : 4}
          className="w-full resize-y rounded-none border border-border bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-faint outline-none"
        />
      </section>

      <section className="flex flex-col">
        <div className="fs-track-label mb-2 text-[10px] font-bold uppercase text-muted">
          {t("projects.activityLabel")}
        </div>
        {activity.length === 0 ? (
          <p className="text-[12px] text-muted-faint">{t("projects.activity.empty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {activity.slice(0, 12).map((entry) => (
              <li
                key={entry.id}
                className="flex items-baseline justify-between gap-3 py-1.5 text-[12px]"
                style={{ borderBottom: "1px solid var(--border-faint)" }}
              >
                <span className="leading-snug text-foreground-secondary">{formatActivity(entry, t)}</span>
                <span className="flex-shrink-0 font-mono text-[11px] text-muted-faint">
                  {formatRelativeTime(entry.at, t)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  const activeTab: DetailTab = !compact && detailTab === "details" ? "bom" : detailTab;
  const withRail = activeTab === "bom" || activeTab === "assemblies";

  const facts = [
    { key: "weight", label: t("projects.stats.weight"), value: `${fsWeight(summary.totalWeightKg)} ${fsWeightUnit()}` },
    { key: "items", label: t("projects.stats.items"), value: t("projects.itemCount", { count: summary.itemCount }) },
    { key: "lines", label: t("projects.stats.stockLines"), value: String(bom.length) },
    { key: "surface", label: t("projects.stats.surface"), value: `${summary.totalSurfaceAreaM2.toFixed(1)} m²` },
  ];

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0"
        style={{
          padding: compact ? "0 0 14px" : "14px 20px 14px",
          borderBottom: compact ? "none" : "1px solid var(--border-faint)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer font-mono text-[11px] text-muted hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t("projects.backToProjects")}
          {project.client?.trim() && <span className="text-muted-faint">› {project.client}</span>}
        </button>

        <div className="flex items-center gap-3 flex-wrap mt-1.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap" style={{ flex: "1 1 240px" }}>
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
            <CategoryBadge
              category={project.category}
              onChange={(cat) => actions.onUpdateMeta(project.id, { category: cat })}
            />
            {summary.marginPercent > 0 && (
              <span className="px-2 py-0.5 rounded-none text-[10px] font-bold font-mono bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]">
                +{summary.marginPercent}% {t("projects.markupMargin")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => actions.onPrintQuote(project)}
              disabled={summary.isEmpty}
              title={t("quote.print")}
              className="inline-flex items-center gap-1.5 rounded-button font-bold text-[12px] sm:text-[12px] active:scale-95 transition-all"
              style={{
                padding: "8px 10px",
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
              <span>{t("quote.short")}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-button font-bold text-[12px] sm:text-[12px] cursor-pointer active:scale-95 transition-all"
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border-faint)",
                background: "var(--surface-raised)",
                color: "var(--foreground)",
              }}
              title={t("assembly.insertTitle")}
            >
              <DeskIcon name="layers" />
              <span>{t("assembly.addButton")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("project-quick-add-input");
                if (input) {
                  input.focus();
                  input.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                  actions.onAddItem(project.id);
                }
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-button font-bold text-[12px] sm:text-[12px] cursor-pointer active:scale-95 transition-all shadow-xs"
              style={{
                padding: "8px 12px",
                border: "none",
                background: "var(--action)",
                color: "var(--action-contrast)",
              }}
            >
              <DeskIcon name="plus" stroke="var(--action-contrast)" />
              <span>{t("projects.addItem")}</span>
            </button>
            <RowMenu items={menuItems} ariaLabel={project.name} />
          </div>
        </div>

        <div className="font-mono text-[11px] text-muted mt-1 truncate">
          {subtitleParts.join(" · ")}
        </div>

        {editingDetails && (
          <DetailsForm
            project={project}
            actions={actions}
            marginPercent={marginPercent}
            onDone={() => setEditingDetails(false)}
          />
        )}
      </div>

      <div
        className={compact ? "flex flex-col gap-3 pt-3" : "flex-1 overflow-y-auto"}
        style={compact ? undefined : { padding: "20px 32px 40px" }}
      >
        <div
          className={compact || !withRail ? "flex flex-col" : "grid items-start gap-x-10"}
          style={compact || !withRail ? undefined : { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)" }}
        >
          <div className="flex min-w-0 flex-col gap-4">
            {compact ? (
              withRail && (
                <div
                  className="flex items-end justify-between gap-3 py-3"
                  style={{ borderTop: "1px solid var(--foreground)", borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="fs-track-label text-[10px] font-bold uppercase text-muted">
                      {t("projects.stats.grandTotalQuote")}
                    </span>
                    <span
                      className="truncate font-mono fs-display-num"
                      style={{ fontSize: 30, letterSpacing: -0.9, lineHeight: 1.15, color: "var(--accent-text)" }}
                    >
                      {sym} {fsMoney(summary.quotedTotal)}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-right font-mono text-[12px] leading-relaxed text-foreground-secondary fs-display-num">
                    <div>
                      {fsWeight(summary.totalWeightKg)} {fsWeightUnit()}
                    </div>
                    <div>{t("projects.itemCount", { count: summary.itemCount })}</div>
                  </div>
                </div>
              )
            ) : (
              <dl
                className="m-0 grid grid-cols-4"
                style={{ borderTop: "1px solid var(--foreground)", borderBottom: "1px solid var(--border)" }}
              >
                {facts.map((fact, index) => (
                  <div
                    key={fact.key}
                    className="flex min-w-0 flex-col gap-1 py-3"
                    style={index > 0 ? { paddingLeft: 16, borderLeft: "1px solid var(--border-faint)" } : undefined}
                  >
                    <dt className="fs-track-label truncate text-[10px] font-bold uppercase text-muted">{fact.label}</dt>
                    <dd className="m-0 truncate font-mono text-[19px] fs-display-num">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Bill of material · By assembly · Cut plan · Order, plus Details
                on the phone, where the quote rail can't sit beside the table. */}
            <div
              role="tablist"
              className="flex max-w-full gap-5 overflow-x-auto"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setDetailTab(tab.id)}
                    className="flex-shrink-0 cursor-pointer whitespace-nowrap border-0 bg-transparent px-0 text-[13px] transition-colors"
                    style={{
                      height: compact ? 44 : 38,
                      color: active ? "var(--foreground)" : "var(--muted)",
                      fontWeight: active ? 600 : 500,
                      boxShadow: active ? "inset 0 -2px 0 var(--foreground)" : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "cutting" ? (
              <div className="w-full min-w-0">
                <ProjectCutting project={project} compact={compact} />
              </div>
            ) : activeTab === "order" ? (
              <div className="w-full min-w-0">
                <ProjectProcurement project={project} compact={compact} />
              </div>
            ) : activeTab === "details" ? (
              rail
            ) : (
              <div className="flex min-w-0 flex-col">
                <QuickAddCommandBar
                  projectId={project.id}
                  actions={actions}
                  existingAssemblies={existingAssemblies}
                  targetAssembly={quickAddAssembly}
                  onTargetAssemblyChange={setQuickAddAssembly}
                />
                {activeTab === "assemblies" ? itemsTable : bomTable}
              </div>
            )}
          </div>

          {!compact && withRail && (
            <aside className="min-w-0" style={{ borderLeft: "1px solid var(--border)", paddingLeft: 24 }}>
              {rail}
            </aside>
          )}
        </div>
      </div>

      {/* Interactive Sub-Assembly Picker Modal */}
      {pickingAssemblyRow && (
        <AssemblyPickerModal
          currentAssembly={pickingAssemblyRow.assembly}
          existingAssemblies={existingAssemblies}
          onSelect={(asm) => {
            actions.onSetItemAssembly?.(project.id, pickingAssemblyRow.id, asm);
            setPickingAssemblyRow(null);
          }}
          onClose={() => setPickingAssemblyRow(null)}
        />
      )}

      {/* Drop a library assembly into this project */}
      {showTemplateModal && (
        <InsertAssemblyModal
          assemblies={actions.libraryAssemblies ?? []}
          onInsert={(entry, mult, asmName) => {
            actions.onInsertAssembly?.(project.id, entry, mult, asmName);
          }}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* In-Place Sub-Assembly Scaling Modal */}
      {scalingAssembly && (
        <ScaleAssemblyModal
          assemblyName={scalingAssembly.name}
          itemCount={scalingAssembly.count}
          onScale={(mult) => {
            actions.onScaleSubAssembly?.(project.id, scalingAssembly.name, mult);
          }}
          onClose={() => setScalingAssembly(null)}
        />
      )}

      {/* Save this sub-assembly back into the library */}
      {savingTemplateAsm && (
        <SaveAssemblyToLibraryModal
          assemblyName={savingTemplateAsm.name}
          items={savingTemplateAsm.items}
          onSave={(name, description, category) => {
            actions.onSaveAssemblyToLibrary?.(name, savingTemplateAsm.items, description, category);
          }}
          onClose={() => setSavingTemplateAsm(null)}
        />
      )}
    </div>
  );
}
