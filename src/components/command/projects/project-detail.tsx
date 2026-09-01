"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  type Project,
  type ProjectAdditionalCost,
  type ProjectCategory,
  type ProjectStatus,
} from "@/hooks/useProjects";
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
import { ProjectCutting } from "./project-cutting";
import {
  formatActivity,
  formatRelativeTime,
  formatShortDate,
  projectItemRows,
  projectSummary,
  toDateInputValue,
} from "./project-model";
import type { ProjectActions } from "./project-actions";

function StatTile({
  label,
  value,
  tone,
  emphasis,
  sub,
}: {
  label: string;
  value: string;
  tone?: "accent" | "blue" | "green";
  emphasis?: boolean;
  sub?: string;
}) {
  return (
    <div
      className="rounded-[14px] min-w-0"
      style={{
        padding: "10px 14px",
        border: `1px solid ${emphasis ? "var(--accent-border)" : "var(--border-faint)"}`,
        background: emphasis ? "var(--accent-surface)" : "var(--surface)",
      }}
    >
      <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase truncate">
        {label}
      </div>
      <div
        className="font-mono font-bold mt-0.5 truncate"
        style={{
          fontSize: 16,
          color:
            tone === "accent"
              ? "var(--accent-text)"
              : tone === "blue"
                ? "var(--blue-strong)"
                : tone === "green"
                  ? "var(--green-strong, #10b981)"
                  : "var(--foreground)",
        }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted mt-0.5 truncate">{sub}</div>}
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
      className="fs-track-label rounded-full font-semibold text-[10px] cursor-pointer"
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
      className="flex items-end gap-3 flex-wrap rounded-[15px] mt-3"
      style={{
        padding: "12px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      <label className="flex flex-col gap-1 min-w-0" style={{ flex: "1 1 180px" }}>
        <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
          {t("projects.clientLabel")}
        </span>
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder={t("projects.clientPlaceholder")}
          className="h-9 rounded-button border border-border-faint bg-[var(--surface)] px-3 text-[13px] text-foreground placeholder:text-muted-faint"
        />
      </label>

      <label className="flex flex-col gap-1 min-w-0" style={{ flex: "1 1 160px" }}>
        <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
          {t("projects.categoryLabel")}
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-button border border-border-faint bg-[var(--surface)] px-2.5 text-[13px] text-foreground font-semibold cursor-pointer"
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
        <span className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
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
          className="h-9 rounded-button border border-border-faint bg-[var(--surface)] px-2.5 text-[13px] font-mono text-foreground"
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
          className="h-9 rounded-button border border-border-faint bg-[var(--surface)] px-3 font-mono text-[13px] text-foreground"
        />
      </label>

      <button
        type="button"
        onClick={commit}
        className="h-9 px-4 rounded-button font-bold text-[13px] cursor-pointer ml-auto"
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
      className="w-full min-w-0 border-0 bg-transparent p-0 text-[11.5px] text-foreground-secondary placeholder:text-muted-faint outline-none"
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
    <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-faint)] mb-3 flex-wrap sm:flex-nowrap">
      <span className="text-[10.5px] font-bold text-muted uppercase tracking-wider pl-1 whitespace-nowrap">
        + {t("projects.quickAdd")}:
      </span>
      {existingAssemblies.length > 0 && (
        <select
          value={targetAssembly}
          onChange={(e) => onTargetAssemblyChange(e.target.value)}
          aria-label={t("projects.targetAssembly")}
          className="h-8 rounded-lg border border-[var(--border-faint)] bg-[var(--surface-raised)] px-2 text-xs font-semibold text-foreground cursor-pointer flex-shrink-0"
        >
          <option value="">🏷️ {t("projects.generalSection")}</option>
          {existingAssemblies.map((asm) => (
            <option key={asm} value={asm}>
              🏷️ {asm}
            </option>
          ))}
        </select>
      )}
      <input
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
        className="flex-1 h-8 min-w-[200px] rounded-lg border border-[var(--border-faint)] bg-[var(--surface-inset)] px-2.5 text-xs font-mono text-foreground placeholder:text-muted-faint outline-none"
        style={{ borderColor: error ? "var(--red-strong, #ef4444)" : undefined }}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!query.trim()}
        className="h-8 px-3 rounded-lg text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] disabled:opacity-40 cursor-pointer flex items-center gap-1 flex-shrink-0"
      >
        <DeskIcon name="plus" stroke="var(--accent-contrast)" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border-faint)] bg-[var(--surface)] p-4 shadow-xl space-y-3"
        role="dialog"
        aria-modal="true"
        aria-label={t("projects.assemblyPickerTitle")}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">
            {t("projects.assemblyPickerTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

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
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1"
                  style={{
                    background: currentAssembly === asm ? "var(--accent-surface)" : "var(--surface-raised)",
                    borderColor: currentAssembly === asm ? "var(--accent-border)" : "var(--border-faint)",
                    color: currentAssembly === asm ? "var(--accent-text)" : "var(--foreground)",
                  }}
                >
                  <span>🏷️</span>
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
                if (e.key === "Escape") onClose();
              }}
              autoFocus
              placeholder="e.g. Stringers, Handrail, Base Frame"
              className="flex-1 h-8 rounded-lg border border-[var(--border-faint)] bg-[var(--surface-inset)] px-2.5 text-xs text-foreground placeholder:text-muted-faint outline-none"
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!customName.trim()}
              className="h-8 px-3 rounded-lg text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] disabled:opacity-40 cursor-pointer"
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
              className="w-full h-8 rounded-lg text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 cursor-pointer"
            >
              {t("projects.clearAssembly")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LaborAndExtrasForm({
  project,
  actions,
  currencySymbol,
}: {
  project: Project;
  actions: ProjectActions;
  currencySymbol: string;
}) {
  const t = useTranslations("command");
  const [laborHours, setLaborHours] = useState<string>(
    project.laborHours !== undefined ? String(project.laborHours) : "",
  );
  const [laborRate, setLaborRate] = useState<string>(
    project.laborRatePerHour !== undefined ? String(project.laborRatePerHour) : "45",
  );
  const [costs, setCosts] = useState<ProjectAdditionalCost[]>(project.additionalCosts ?? []);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<"hardware" | "transport" | "finishing" | "other">("hardware");

  const saveLabor = (hrs?: string, rate?: string) => {
    const h = hrs !== undefined ? hrs : laborHours;
    const r = rate !== undefined ? rate : laborRate;
    actions.onUpdateLabor?.(project.id, {
      laborHours: h ? Math.max(0, Number(h) || 0) : undefined,
      laborRatePerHour: r ? Math.max(0, Number(r) || 0) : undefined,
    });
  };

  const addCost = () => {
    if (!newLabel.trim() || !newAmount) return;
    const item: ProjectAdditionalCost = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      amount: Math.max(0, Number(newAmount) || 0),
      category: newCategory,
    };
    const next = [...costs, item];
    setCosts(next);
    actions.onUpdateAdditionalCosts?.(project.id, next);
    setNewLabel("");
    setNewAmount("");
  };

  const removeCost = (id: string) => {
    const next = costs.filter((c) => c.id !== id);
    setCosts(next);
    actions.onUpdateAdditionalCosts?.(project.id, next);
  };

  const laborTotal = (Number(laborHours) || 0) * (Number(laborRate) || 0);
  const extrasTotal = costs.reduce((s, c) => s + c.amount, 0);

  return (
    <section
      className="rounded-panel-lg"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        padding: "13px 15px",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
          {t("projects.laborAndExtras")}
        </div>
        <div className="font-mono text-xs font-bold text-foreground">
          {currencySymbol} {fsMoney(laborTotal + extrasTotal)}
        </div>
      </div>

      {/* Labor inputs */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">{t("projects.laborHours")}:</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={laborHours}
            onChange={(e) => {
              setLaborHours(e.target.value);
              saveLabor(e.target.value, undefined);
            }}
            placeholder="0"
            className="h-8 rounded-lg border border-[var(--border-faint)] bg-[var(--surface-raised)] px-2 text-xs font-mono text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">{t("projects.hourlyRate")} ({currencySymbol}/h):</span>
          <input
            type="number"
            min={0}
            step={5}
            value={laborRate}
            onChange={(e) => {
              setLaborRate(e.target.value);
              saveLabor(undefined, e.target.value);
            }}
            placeholder="45"
            className="h-8 rounded-lg border border-[var(--border-faint)] bg-[var(--surface-raised)] px-2 text-xs font-mono text-foreground"
          />
        </label>
      </div>

      {/* Additional Costs List */}
      {costs.length > 0 && (
        <div className="space-y-1.5 mb-2.5">
          {costs.map((cost) => (
            <div
              key={cost.id}
              className="flex items-center justify-between text-xs font-mono p-1.5 rounded-md bg-[var(--surface-raised)]"
            >
              <span className="text-foreground truncate max-w-[140px]">{cost.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold">{currencySymbol} {fsMoney(cost.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeCost(cost.id)}
                  className="text-muted hover:text-red-500 cursor-pointer text-xs px-1"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Extra Cost Form */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
          aria-label="Expense category"
          className="h-7 rounded-md border border-[var(--border-faint)] bg-[var(--surface-raised)] px-1 text-[11px] text-foreground font-semibold cursor-pointer"
        >
          <option value="hardware">Hardware</option>
          <option value="transport">Transport</option>
          <option value="finishing">Finishing</option>
          <option value="other">Other</option>
        </select>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={t("projects.extraExpensePlaceholder")}
          className="flex-1 min-w-[120px] h-7 rounded-md border border-[var(--border-faint)] bg-[var(--surface-raised)] px-2 text-[11px] text-foreground placeholder:text-muted-faint"
        />
        <input
          type="number"
          min={0}
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="€"
          className="w-14 h-7 rounded-md border border-[var(--border-faint)] bg-[var(--surface-raised)] px-1.5 text-[11px] font-mono text-foreground"
        />
        <button
          type="button"
          onClick={addCost}
          disabled={!newLabel.trim() || !newAmount}
          className="h-7 px-2.5 rounded-md bg-[var(--accent)] text-[var(--accent-contrast)] text-[11px] font-bold disabled:opacity-40 cursor-pointer"
        >
          +
        </button>
      </div>
    </section>
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
      className="rounded-panel-lg"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        padding: "13px 15px",
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="fs-track-label text-[9.5px] font-bold text-muted uppercase">
          {t("projects.paintingLabel")}
        </div>
        <div className="font-mono text-[11.5px] text-muted">
          <span className="text-muted-faint">{t("projects.paintSurface")}: </span>
          <span className="font-bold text-foreground">{surfaceM2.toFixed(2)} m²</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {coats.map((coat) => {
          const total = coatTotals.find((c) => c.coat.id === coat.id);
          const title =
            coat.kind === "primer"
              ? t("projects.paintPrimer")
              : coat.kind === "finish"
                ? t("projects.paintFinish")
                : coat.name?.trim() || t("projects.paintCustom");
          return (
            <div
              key={coat.id}
              className="flex flex-col gap-2 rounded-[12px] p-2.5"
              style={{
                border: "1px solid var(--border-faint)",
                background: "var(--surface-raised)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[12.5px] text-foreground">{title}</span>
                <button
                  type="button"
                  onClick={() => remove(coat.id)}
                  className="text-muted hover:text-red-500 cursor-pointer text-xs"
                >
                  ×
                </button>
              </div>
              <div className="flex items-end gap-2 flex-wrap text-xs">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-muted">{t("projects.paintLayers")}</span>
                  <input
                    type="number"
                    min={1}
                    value={coat.layers}
                    aria-label={`${t("projects.paintLayers")} · ${title}`}
                    onChange={(e) => patch(coat.id, { layers: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-12 h-7 rounded border border-[var(--border-faint)] bg-[var(--surface)] px-1 font-mono text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-muted">{t("projects.paintCoverage")}</span>
                  <input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={coat.coverageM2PerKg}
                    aria-label={`${t("projects.paintCoverage")} · ${title}`}
                    onChange={(e) => patch(coat.id, { coverageM2PerKg: Number(e.target.value) || 1 })}
                    className="w-14 h-7 rounded border border-[var(--border-faint)] bg-[var(--surface)] px-1 font-mono text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-muted">{t("projects.paintPrice")}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={coat.pricePerKg}
                    aria-label={`${t("projects.paintPrice")} · ${title}`}
                    onChange={(e) => patch(coat.id, { pricePerKg: Number(e.target.value) || 0 })}
                    className="w-16 h-7 rounded border border-[var(--border-faint)] bg-[var(--surface)] px-1 font-mono text-foreground"
                  />
                </label>
              </div>
              {total && (
                <div className="font-mono text-[11px] text-muted">
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
  const [detailTab, setDetailTab] = useState<"items" | "cutting">("items");
  const [showMore, setShowMore] = useState(false);
  const [notes, setNotes] = useState(project.description ?? "");
  const [pickingAssemblyRow, setPickingAssemblyRow] = useState<(ReturnType<typeof projectItemRows>[number]) | null>(null);
  const [quickAddAssembly, setQuickAddAssembly] = useState<string>("");

  const summary = projectSummary(project, marginPercent);
  const rows = projectItemRows(project);
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
        {fam && <CommandGlyph fam={fam} size={17} />}
      </span>
    );

    const name = (
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => actions.onOpenItem(row.calc.input)}
            title={t("projects.openInBar")}
            className="min-w-0 border-0 bg-transparent p-0 text-left cursor-pointer font-bold text-[13.5px] text-foreground truncate"
          >
            {row.specLabel}
          </button>
          {row.assembly ? (
            <button
              type="button"
              onClick={() => setPickingAssemblyRow(row)}
              className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--surface-inset)] text-muted hover:text-foreground border border-[var(--border-faint)] cursor-pointer"
              title={t("projects.assemblyPickerTitle")}
            >
              🏷️ {row.assembly}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPickingAssemblyRow(row)}
              className="opacity-0 group-hover:opacity-100 hover:opacity-100 px-1 py-0.2 rounded text-[9.5px] text-muted-faint hover:text-foreground cursor-pointer transition-opacity"
              title={t("projects.setAssembly")}
            >
              + Tag
            </button>
          )}
        </div>
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
      ) : hasMultipleAssemblies ? (
        assemblyGroups.map(([asmName, asmRows]) => {
          const asmWeight = asmRows.reduce((s, r) => s + r.weightKg, 0);
          const asmCost = asmRows.reduce((s, r) => s + r.amount, 0);
          return (
            <div key={`asm-${asmName || "main"}`} className="border-t first:border-t-0 border-[var(--border-faint)]">
              <div
                className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-inset)] font-mono text-[11px] font-bold text-muted flex-wrap gap-2"
              >
                <div className="flex items-center gap-2">
                  <span>🏷️ {asmName || t("projects.generalSection")} ({asmRows.length} items)</span>
                  {asmName && (
                    <button
                      type="button"
                      onClick={() => setQuickAddAssembly(asmName)}
                      className="px-2 py-0.5 rounded text-[9.5px] font-sans font-bold bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border-faint)] text-foreground cursor-pointer"
                      title={t("projects.addToThisAssembly", { name: asmName })}
                    >
                      + {t("common.add")}
                    </button>
                  )}
                </div>
                <span>
                  {fsWeight(asmWeight)} {fsWeightUnit()} · {sym} {fsMoney(asmCost)}
                </span>
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

  const rail = (
    <div className="flex flex-col gap-3">
      {/* Notes / Description */}
      <section
        className="rounded-panel-lg"
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
          className="w-full resize-y rounded-button border border-border-faint bg-[var(--surface-raised)] px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-faint outline-none"
        />
      </section>

      {/* Labor and Extras Form */}
      <LaborAndExtrasForm
        project={project}
        actions={actions}
        currencySymbol={sym}
      />

      {/* Surface Area & Painting Form */}
      <PaintingForm
        project={project}
        actions={actions}
        surfaceM2={summary.totalSurfaceAreaM2}
        coatTotals={summary.paintCoatTotals}
        paintKg={summary.paintKgNeeded}
        paintCost={summary.paintingCost}
        currencySymbol={sym}
      />

      {/* Activity Log */}
      <section
        className="rounded-panel-lg"
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
      {/* Header */}
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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]">
                +{summary.marginPercent}% {t("projects.markupMargin")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => actions.onPrintQuote(project)}
              disabled={summary.isEmpty}
              title={t("quote.print")}
              className="inline-flex items-center gap-2 rounded-button font-bold text-[12.5px]"
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
              className="inline-flex items-center gap-2 rounded-button font-bold text-[12.5px] cursor-pointer"
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
            marginPercent={marginPercent}
            onDone={() => setEditingDetails(false)}
          />
        )}
      </div>

      <div
        className={compact ? "flex flex-col gap-3 pt-3" : "flex-1 overflow-y-auto"}
        style={compact ? undefined : { padding: "20px 32px 32px" }}
      >
        {/* Navigation Tabs: Items vs Cut Plan */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-inset)] border border-[var(--border-faint)] self-start mb-3">
          <button
            type="button"
            onClick={() => setDetailTab("items")}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            style={{
              background: detailTab === "items" ? "var(--surface)" : "transparent",
              color: detailTab === "items" ? "var(--foreground)" : "var(--muted)",
              boxShadow: detailTab === "items" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t("projects.tabs.items")}
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("cutting")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            style={{
              background: detailTab === "cutting" ? "var(--surface)" : "transparent",
              color: detailTab === "cutting" ? "var(--foreground)" : "var(--muted)",
              boxShadow: detailTab === "cutting" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <span>{t("projects.tabs.cutting")}</span>
          </button>
        </div>

        {detailTab === "items" ? (
          <div
            className={compact ? "flex flex-col gap-3" : "grid gap-4 items-start"}
            style={
              compact
                ? undefined
                : { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 340px)" }
            }
          >
            <div className="flex flex-col gap-3 min-w-0">
              {/* Stat Tiles */}
              <div
                className="grid gap-2.5"
                style={{
                  gridTemplateColumns: compact
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(auto-fit, minmax(130px, 1fr))",
                }}
              >
                <StatTile label={t("projects.stats.items")} value={t("projects.itemCount", { count: summary.itemCount })} />
                <StatTile
                  label={t("projects.stats.weight")}
                  tone="accent"
                  value={`${fsWeight(summary.totalWeightKg)} ${fsWeightUnit()}`}
                />
                <StatTile
                  label={t("projects.stats.materialCost")}
                  value={`${sym} ${fsMoney(summary.materialQuotedTotal)}`}
                  sub={summary.marginPercent > 0 ? `+${summary.marginPercent}% markup` : undefined}
                />
                <StatTile
                  emphasis
                  tone="accent"
                  label={t("projects.stats.grandTotalQuote")}
                  value={`${sym} ${fsMoney(summary.quotedTotal)}`}
                  sub={
                    summary.hasLabor || summary.hasAdditionalCosts || summary.hasPainting
                      ? "Inc. labor & extras"
                      : undefined
                  }
                />
                {summary.hasLabor && (
                  <StatTile
                    label={t("projects.laborHours")}
                    value={`${summary.laborHours}h · ${sym} ${fsMoney(summary.laborCost)}`}
                  />
                )}
                {summary.hasPainting && (
                  <StatTile
                    label={t("projects.stats.paint")}
                    value={`${summary.paintKgNeeded} kg · ${sym} ${fsMoney(summary.paintingCost)}`}
                  />
                )}
              </div>

              {/* Fast Inline Quick Command Bar with Assembly Targeting */}
              <QuickAddCommandBar
                projectId={project.id}
                actions={actions}
                existingAssemblies={existingAssemblies}
                targetAssembly={quickAddAssembly}
                onTargetAssemblyChange={setQuickAddAssembly}
              />

              {/* Items Table */}
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
        ) : (
          <div className="w-full min-w-0">
            <ProjectCutting project={project} compact={compact} />
          </div>
        )}
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
    </div>
  );
}
