"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { fsMoney } from "@ferroscale/metal-core";
import type { Project, ProjectAdditionalCost } from "@/hooks/useProjects";
import { createPaintCoat, type PaintCoatKind, type ProjectPaintCoat } from "@/lib/projects/paint";
import { defaultPaintCoverageStore, defaultPaintPriceStore } from "@/lib/settings-stores";
import type { ProjectActions } from "./project-actions";
import type { projectSummary } from "./project-model";

/**
 * The quote, built up line by line — and the place every number on top of
 * the material is entered. Each line carries its own inputs (markup %,
 * hours × rate, the expense list, the paint coats), so what you type and
 * what it adds sit on the same row and the total under them moves as you
 * type. There is no separate "labor & extras" form to find.
 */

type Summary = ReturnType<typeof projectSummary>;
type CostCategory = NonNullable<ProjectAdditionalCost["category"]>;
const COST_CATEGORIES: CostCategory[] = ["hardware", "transport", "finishing", "other"];

const INPUT =
  "h-11 sm:h-8 rounded-none border border-border bg-[var(--surface)] px-2 font-mono text-[12px] text-foreground fs-display-num outline-none focus:border-[var(--border-strong)]";
const LABEL = "fs-track-label text-[10px] font-bold text-muted uppercase";

/** A number input that holds its own draft and commits on blur or Enter. */
function DraftNumber({
  value,
  placeholder,
  onCommit,
  ariaLabel,
  width,
  step,
  min = 0,
}: {
  value: number | undefined;
  placeholder?: string;
  onCommit: (value: number | undefined) => void;
  ariaLabel: string;
  width: number;
  step?: number;
  min?: number;
}) {
  const shown = value !== undefined ? String(value) : "";
  const [draft, setDraft] = useState(shown);
  const [seededFrom, setSeededFrom] = useState(shown);
  if (seededFrom !== shown) {
    setSeededFrom(shown);
    setDraft(shown);
  }
  const commit = () => {
    const trimmed = draft.trim();
    const next = trimmed === "" ? undefined : Math.max(min, Number(trimmed) || 0);
    if (next !== value) onCommit(next);
    setDraft(next !== undefined ? String(next) : "");
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(shown);
      }}
      className={INPUT}
      style={{ width }}
    />
  );
}

/** One line of the build-up: a label (with its inputs) and what it adds. */
function Line({
  label,
  value,
  children,
  strong,
}: {
  label: ReactNode;
  value: string;
  children?: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-2.5" style={{ borderBottom: "1px solid var(--border-faint)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-[13px] ${strong ? "font-semibold text-foreground" : "text-foreground"}`}>{label}</span>
        <span className="font-mono text-[13px] text-foreground fs-display-num whitespace-nowrap">{value}</span>
      </div>
      {children}
    </div>
  );
}

function ExtrasEditor({
  project,
  actions,
  sym,
}: {
  project: Project;
  actions: ProjectActions;
  sym: string;
}) {
  const t = useTranslations("command");
  const costs = project.additionalCosts ?? [];
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CostCategory>("hardware");

  const save = (next: ProjectAdditionalCost[]) => actions.onUpdateAdditionalCosts?.(project.id, next);
  const add = () => {
    if (!label.trim() || !amount) return;
    save([
      ...costs,
      { id: crypto.randomUUID(), label: label.trim(), amount: Math.max(0, Number(amount) || 0), category },
    ]);
    setLabel("");
    setAmount("");
  };

  return (
    <div className="flex flex-col gap-1.5 pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
      {costs.map((cost) => (
        <div key={cost.id} className="flex items-center gap-2 min-h-[28px]">
          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground-secondary">
            {cost.label}
            {cost.category && (
              <span className={`${LABEL} ml-2`} style={{ fontSize: 9.5 }}>
                {t(`projects.costCategories.${cost.category}`)}
              </span>
            )}
          </span>
          <span className="font-mono text-[12px] text-foreground-secondary fs-display-num">{fsMoney(cost.amount)}</span>
          <button
            type="button"
            onClick={() => save(costs.filter((c) => c.id !== cost.id))}
            aria-label={t("projects.quote.removeExpense", { name: cost.label })}
            className="flex h-11 w-8 sm:h-7 items-center justify-center border-0 bg-transparent text-muted hover:text-[var(--red-text)] cursor-pointer"
          >
            ×
          </button>
        </div>
      ))}
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder={t("projects.extraExpensePlaceholder")}
        aria-label={t("projects.quote.expenseLabel")}
        className={`${INPUT} w-full font-sans`}
      />
      <div className="flex items-center gap-1.5">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CostCategory)}
          aria-label={t("projects.quote.expenseCategory")}
          className={`${INPUT} min-w-0 flex-1 font-sans cursor-pointer`}
          style={{ paddingLeft: 4 }}
        >
          {COST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`projects.costCategories.${c}`)}
            </option>
          ))}
        </select>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={sym}
          aria-label={t("projects.quote.expenseAmount")}
          className={INPUT}
          style={{ width: 80 }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!label.trim() || !amount}
          aria-label={t("projects.quote.addExpense")}
          className="h-11 sm:h-8 w-9 flex-shrink-0 rounded-none border-0 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-default"
          style={{ background: "var(--action)", color: "var(--action-contrast)" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function PaintEditor({
  project,
  actions,
  summary,
}: {
  project: Project;
  actions: ProjectActions;
  summary: Summary;
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
  const patch = (id: string, next: Partial<ProjectPaintCoat>) =>
    setCoats(coats.map((coat) => (coat.id === id ? { ...coat, ...next } : coat)));

  const addBtn = (kind: PaintCoatKind, label: string, disabled?: boolean) => (
    <button
      type="button"
      onClick={() => setCoats([...coats, createPaintCoat(kind, defaults)])}
      disabled={disabled}
      className="h-11 sm:h-7 px-2.5 rounded-none text-[12px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-default"
      style={{ border: "1px dashed var(--border-strong)", background: "transparent", color: "var(--foreground-secondary)" }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2 pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
      <div className="font-mono text-[11px] text-muted fs-display-num">
        <span>{t("projects.paintSurface")}</span> {summary.totalSurfaceAreaM2.toFixed(2)} m²
      </div>
      {coats.map((coat) => {
        const total = summary.paintCoatTotals.find((c) => c.coat.id === coat.id);
        const title =
          coat.kind === "primer"
            ? t("projects.paintPrimer")
            : coat.kind === "finish"
              ? t("projects.paintFinish")
              : coat.name?.trim() || t("projects.paintCustom");
        return (
          <div key={coat.id} className="flex flex-col gap-1.5 pb-2" style={{ borderBottom: "1px dotted var(--border)" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-foreground">{title}</span>
              <span className="flex items-center gap-1">
                {total && (
                  <span className="font-mono text-[11px] text-muted fs-display-num">
                    {total.kg} kg · {fsMoney(total.cost)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCoats(coats.filter((c) => c.id !== coat.id))}
                  aria-label={t("projects.paintRemove", { name: title })}
                  className="flex h-11 w-8 sm:h-6 items-center justify-center border-0 bg-transparent text-muted hover:text-[var(--red-text)] cursor-pointer"
                >
                  ×
                </button>
              </span>
            </div>
            <div className="flex items-end gap-2">
              {(
                [
                  ["layers", t("projects.paintLayers"), coat.layers, 44, 1, (v: number) => ({ layers: Math.max(1, v || 1) })],
                  ["coverage", t("projects.paintCoverage"), coat.coverageM2PerKg, 56, 0.5, (v: number) => ({ coverageM2PerKg: v || 1 })],
                  ["price", t("projects.paintPrice"), coat.pricePerKg, 64, 1, (v: number) => ({ pricePerKg: v || 0 })],
                ] as const
              ).map(([key, label, value, width, step, toPatch]) => (
                <label key={key} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted">{label}</span>
                  <input
                    type="number"
                    min={0}
                    step={step}
                    value={value}
                    aria-label={`${label} · ${title}`}
                    onChange={(e) => patch(coat.id, toPatch(Number(e.target.value)))}
                    className={INPUT}
                    style={{ width }}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-1.5">
        {addBtn("primer", t("projects.paintAddPrimer"), hasKind("primer"))}
        {addBtn("finish", t("projects.paintAddFinish"), hasKind("finish"))}
        {addBtn("custom", t("projects.paintAddCustom"))}
      </div>
    </div>
  );
}

export function ProjectQuote({
  project,
  actions,
  summary,
  globalMarginPercent,
}: {
  project: Project;
  actions: ProjectActions;
  summary: Summary;
  globalMarginPercent: number;
}) {
  const t = useTranslations("command");
  const sym = summary.currencySymbol;
  const marginAmount = summary.materialQuotedTotal - summary.totalCost;
  const perKg = summary.totalWeightKg > 0 ? summary.quotedTotal / summary.totalWeightKg : null;

  return (
    <section aria-label={t("projects.stats.grandTotalQuote")} className="flex flex-col">
      <span className={LABEL}>{t("projects.stats.grandTotalQuote")}</span>
      <span
        className="font-mono fs-display-num truncate"
        style={{ fontSize: 38, lineHeight: 1.15, letterSpacing: -0.9, color: "var(--accent-text)", marginTop: 6 }}
      >
        {sym} {fsMoney(summary.quotedTotal)}
      </span>
      {perKg != null && (
        <span className="font-mono text-[12px] text-muted fs-display-num mt-0.5">
          {t("projects.quote.perKg", { value: `${fsMoney(perKg)} ${sym}` })}
        </span>
      )}

      <div className="mt-4" style={{ borderTop: "1px solid var(--foreground)" }}>
        <Line label={t("projects.breakdown.material")} value={fsMoney(summary.totalCost)} />

        <Line
          label={
            <span className="flex items-center gap-2">
              {t("projects.markupMargin")}
              <DraftNumber
                value={project.marginPercent}
                placeholder={String(globalMarginPercent)}
                onCommit={(m) => m !== undefined && actions.onUpdateMeta(project.id, { marginPercent: m })}
                ariaLabel={t("projects.quote.marginAria")}
                width={56}
                step={1}
              />
              <span className="font-mono text-[12px] text-muted">%</span>
            </span>
          }
          value={`+${fsMoney(marginAmount)}`}
        />

        <Line label={t("projects.breakdown.labor")} value={fsMoney(summary.laborCost)}>
          <span className="flex items-center gap-1.5 pl-3">
            <DraftNumber
              value={project.laborHours}
              placeholder="0"
              onCommit={(h) => actions.onUpdateLabor?.(project.id, { laborHours: h ?? 0 })}
              ariaLabel={t("projects.laborHours")}
              width={60}
              step={0.5}
            />
            <span className="font-mono text-[12px] text-muted">{t("projects.quote.hours")} ×</span>
            <DraftNumber
              value={project.laborRatePerHour}
              placeholder="0"
              onCommit={(r) => actions.onUpdateLabor?.(project.id, { laborRatePerHour: r ?? 0 })}
              ariaLabel={t("projects.hourlyRate")}
              width={68}
              step={1}
            />
            <span className="font-mono text-[12px] text-muted">{t("projects.quote.perHour", { sym })}</span>
          </span>
        </Line>

        <Line label={t("projects.breakdown.extras")} value={fsMoney(summary.additionalCostsTotal)}>
          <ExtrasEditor project={project} actions={actions} sym={sym} />
        </Line>

        <Line label={t("projects.breakdown.paint")} value={fsMoney(summary.paintingCost)}>
          <PaintEditor project={project} actions={actions} summary={summary} />
        </Line>

        <div
          className="flex items-baseline justify-between gap-3 py-3"
          style={{ borderBottom: "3px double var(--foreground)" }}
        >
          <span className="text-[13px] font-semibold">{t("quote.total")}</span>
          <span className="font-mono text-[14px] font-semibold fs-display-num">
            {sym} {fsMoney(summary.quotedTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}
