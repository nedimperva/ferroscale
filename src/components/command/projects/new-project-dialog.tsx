"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney } from "@ferroscale/metal-core";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { Customer } from "@/hooks/useCustomers";
import type { Project, ProjectCalculation } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import { customerJobs, filterCustomers, findCustomerByName } from "@/lib/customers/query";
import { barListQueries } from "@/lib/projects/import-list";
import { projectQuotedValue } from "@/lib/projects/query";
import { SheetShell } from "../sheets/sheet-shell";
import { SectionLabel } from "../desktop/desk-atoms";
import { MixBar } from "./project-views";
import {
  DUE_PRESETS,
  dueDateFromToday,
  suggestProjectName,
  type DuePreset,
  type NewProjectRequest,
  type NewProjectStartKind,
} from "./new-project";

type Parsed = { input: CalculationInput; result: CalculationResult };

const TILE_BARS: Record<NewProjectStartKind, number[]> = {
  blank: [6],
  assembly: [22, 14, 18, 10],
  copy: [16, 16],
  import: [6, 6, 6, 6],
};
const BAR_COLORS = ["var(--foreground)", "var(--foreground-secondary)", "var(--border-strong)", "var(--border)"];
const START_KINDS: NewProjectStartKind[] = ["blank", "assembly", "copy", "import"];

function chipStyle(on: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    border: `1px solid ${on ? "var(--foreground)" : "var(--border)"}`,
    background: on ? "var(--foreground)" : "var(--surface)",
    color: on ? "var(--background)" : "var(--foreground)",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

/**
 * Stand-in rows for the preview. Only the result is read (weight, price,
 * label), so the profile snapshot is left out rather than computed per key.
 */
function asCalcs(items: Parsed[]): ProjectCalculation[] {
  return items.map(
    (item, i) => ({ id: String(i), timestamp: "", input: item.input, result: item.result }) as ProjectCalculation,
  );
}

/**
 * New project, in two steps: what it starts from, then its name, customer and
 * due date — with a live preview of what is about to be made beside both.
 * Everything else a project has (labour, paint, notes) is edited on the
 * project itself, so creating one never asks for it.
 */
export function NewProjectDialog({
  projects,
  customers,
  assemblies,
  marginPercent,
  currencySymbol,
  initialCustomerId,
  parseQuery,
  onCreateCustomer,
  onCreate,
  onClose,
}: {
  projects: Project[];
  customers: Customer[];
  /** The library's assemblies — what "From assembly" can scale. */
  assemblies: SavedEntry[];
  /** The shop margin, for a customer without their own. */
  marginPercent: number;
  currencySymbol: string;
  initialCustomerId?: string;
  /** A command-line query to a calculation, or null when it does not read. */
  parseQuery: (query: string) => Parsed | null;
  onCreateCustomer: (name: string) => Customer;
  onCreate: (request: NewProjectRequest) => void;
  onClose: () => void;
}) {
  const t = useTranslations("command");
  const [step, setStep] = useState<1 | 2>(1);
  const [start, setStart] = useState<NewProjectStartKind | null>(null);
  const [typedName, setTypedName] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId ?? null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [due, setDue] = useState<DuePreset>(14);
  const [assemblyId, setAssemblyId] = useState<string | null>(assemblies[0]?.id ?? null);
  const [multiplier, setMultiplier] = useState(1);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [list, setList] = useState("");
  // A customer added from this dialog exists before the parent's list catches
  // up on the next render; keep it here so the card can show it at once.
  const [added, setAdded] = useState<Customer | null>(null);

  const customer =
    (customerId && (customers.find((c) => c.id === customerId) ?? (added?.id === customerId ? added : null))) ||
    null;
  const assembly = assemblies.find((a) => a.id === assemblyId) ?? null;
  const copySource = projects.find((p) => p.id === copyId) ?? null;
  const margin = customer?.marginPercent ?? marginPercent;

  const imported = useMemo(() => {
    const queries = barListQueries(list);
    const items = queries.map(parseQuery).filter((item): item is Parsed => Boolean(item));
    return { items, unread: queries.length - items.length };
  }, [list, parseQuery]);

  const subject =
    start === "assembly" ? assembly?.name : start === "copy" ? copySource?.name : undefined;
  const autoName = suggestProjectName(start, subject, customer?.name);
  const name = typedName ?? autoName;

  // What the preview prices: a stand-in project built from the chosen start.
  const draft = useMemo<Project>(() => {
    const base: Project = {
      id: "draft",
      name,
      createdAt: "",
      updatedAt: "",
      calculations: [],
      marginPercent: margin,
    };
    if (start === "assembly" && assembly) {
      const scaled = assembly.parts.map((part) => ({
        input: part.input,
        result: {
          ...part.result,
          totalWeightKg: part.result.totalWeightKg * multiplier,
          grandTotalAmount: part.result.grandTotalAmount * multiplier,
        },
      }));
      return {
        ...base,
        calculations: asCalcs(scaled),
        laborHours: assembly.laborHours ? assembly.laborHours * multiplier : undefined,
        laborRatePerHour: 45,
        additionalCosts: assembly.additionalCosts?.map((c) => ({ ...c, amount: c.amount * multiplier })),
      };
    }
    if (start === "copy" && copySource) {
      return { ...copySource, marginPercent: customer?.marginPercent ?? copySource.marginPercent ?? marginPercent };
    }
    if (start === "import") return { ...base, calculations: asCalcs(imported.items) };
    return base;
  }, [start, assembly, multiplier, copySource, imported.items, name, margin, customer, marginPercent]);

  const itemCount = draft.calculations.length;
  const quoted = projectQuotedValue(draft, marginPercent);

  const blocker =
    step === 1
      ? t("newProject.footPick")
      : start === "assembly" && !assembly
        ? t("newProject.footAssembly")
        : start === "copy" && !copySource
          ? t("newProject.footCopy")
          : start === "import" && imported.items.length === 0
            ? t("newProject.footImport")
            : !name.trim()
              ? t("newProject.footName")
              : null;

  const create = () => {
    if (blocker || !start) return;
    const dueDate = due === null ? undefined : dueDateFromToday(due);
    const base = { name: name.trim(), customerId: customer?.id, dueDate };
    if (start === "assembly" && assembly) onCreate({ ...base, start: { kind: "assembly", entry: assembly, multiplier } });
    else if (start === "copy" && copySource) onCreate({ ...base, start: { kind: "copy", projectId: copySource.id } });
    else if (start === "import") onCreate({ ...base, start: { kind: "import", items: imported.items } });
    else onCreate({ ...base, start: { kind: "blank" } });
  };

  const pickStart = (kind: NewProjectStartKind) => {
    setStart(kind);
    setStep(2);
  };

  const pickCopy = (project: Project) => {
    setCopyId(project.id);
    // Copying a job for the same customer is the common case; a different
    // customer is one Change away.
    if (!customerId && project.customerId) setCustomerId(project.customerId);
  };

  /* ───────── customer field ───────── */

  const q = customerQuery.trim();
  const matches = filterCustomers(customers, { search: q }).slice(0, 4);
  const exact = q ? findCustomerByName(customers, q) : undefined;
  const addCustomer = () => {
    const created = onCreateCustomer(q);
    setAdded(created);
    setCustomerId(created.id);
    setCustomerQuery("");
  };

  const customerField = customer ? (
    <div
      className="flex items-center justify-between"
      style={{ border: "1px solid var(--foreground)", background: "var(--surface)", padding: "9px 12px" }}
    >
      <div className="min-w-0">
        <div className="font-extrabold text-[14px] truncate">{customer.name}</div>
        <div className="font-mono text-[11px] text-muted" style={{ marginTop: 2 }}>
          {customer.marginPercent !== undefined
            ? t("newProject.customerMargin", { margin: customer.marginPercent })
            : t("newProject.customerShopMargin", { margin: marginPercent })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setCustomerId(null)}
        className="text-[12px] underline cursor-pointer"
        style={{ border: 0, background: "transparent", color: "var(--accent-text)" }}
      >
        {t("newProject.change")}
      </button>
    </div>
  ) : (
    <div>
      <input
        value={customerQuery}
        onChange={(e) => setCustomerQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (exact) setCustomerId(exact.id);
          else if (q) addCustomer();
        }}
        placeholder={t("newProject.customerSearch")}
        aria-label={t("newProject.customer")}
        className="w-full text-[14px] placeholder:text-muted-faint"
        style={{ height: 38, border: "1px solid var(--foreground)", background: "var(--surface)", padding: "0 12px" }}
      />
      {(matches.length > 0 || (q && !exact)) && (
        <ul role="list" style={{ border: "1px solid var(--border)", borderTop: 0, background: "var(--surface)" }}>
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setCustomerId(c.id);
                  setCustomerQuery("");
                }}
                className="flex justify-between w-full text-left text-[13px] cursor-pointer hover:bg-[var(--surface-inset)]"
                style={{ padding: "9px 12px", border: 0, borderBottom: "1px solid var(--border-faint)", background: "transparent", color: "var(--foreground)" }}
              >
                <span className="truncate">{c.name}</span>
                <span className="font-mono text-[11px] text-muted whitespace-nowrap">
                  {t("customers.jobsCount", { count: customerJobs(c.id, projects).length })}
                  {c.marginPercent !== undefined ? ` · ${c.marginPercent}%` : ""}
                </span>
              </button>
            </li>
          ))}
          {q && !exact && (
            <li>
              <button
                type="button"
                onClick={addCustomer}
                className="block w-full text-left text-[13px] cursor-pointer hover:bg-[var(--surface-inset)]"
                style={{ padding: "9px 12px", border: 0, background: "transparent", color: "var(--accent-text)" }}
              >
                {t("newProject.customerAdd", { name: q })}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );

  /* ───────── step bodies ───────── */

  const tiles = (
    <>
      <div className="text-[13px] text-foreground-secondary" style={{ marginBottom: 14 }}>
        {t("newProject.startPrompt")}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
        {START_KINDS.map((kind) => {
          const on = start === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => pickStart(kind)}
              aria-pressed={on}
              className="flex flex-col text-left cursor-pointer"
              style={{
                height: 128,
                padding: 14,
                border: `1px solid ${on ? "var(--accent)" : "var(--border-faint)"}`,
                background: on ? "var(--accent-surface)" : "var(--surface)",
                color: "var(--foreground)",
              }}
            >
              <span className="flex items-end" style={{ gap: 2, height: 22 }} aria-hidden="true">
                {TILE_BARS[kind].map((h, i) => (
                  <span key={i} style={{ width: 8, height: h, background: BAR_COLORS[i % 4] }} />
                ))}
              </span>
              <span className="fs-title text-[19px]" style={{ marginTop: "auto" }}>
                {t(`newProject.tiles.${kind}.name`)}
              </span>
              <span className="text-[12px] text-foreground-secondary" style={{ marginTop: 2 }}>
                {t(`newProject.tiles.${kind}.body`)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const stepperButton = (label: string, glyph: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center cursor-pointer"
      style={{ width: 28, height: 28, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)" }}
    >
      {glyph}
    </button>
  );

  const startSection =
    start === "assembly" ? (
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{t("newProject.assemblyLabel")}</SectionLabel>
        {assemblies.length === 0 ? (
          <div className="text-[13px]" style={{ marginTop: 6, padding: "12px 14px", border: "1px solid var(--border-faint)" }}>
            <div className="font-extrabold">{t("assembly.emptyTitle")}</div>
            <div className="text-foreground-secondary" style={{ marginTop: 2 }}>
              {t("assembly.emptyBody")}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap" style={{ gap: 6, margin: "6px 0 10px", maxHeight: 112, overflowY: "auto" }}>
              {assemblies.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={entry.id === assemblyId}
                  onClick={() => setAssemblyId(entry.id)}
                  className="text-[13px]"
                  style={chipStyle(entry.id === assemblyId)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
            <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <span className="text-[13px] text-foreground-secondary" style={{ marginRight: 6 }}>
                {t("newProject.multiplier")}
              </span>
              {stepperButton(t("newProject.multDown"), "−", () => setMultiplier((m) => Math.max(1, m - 1)))}
              <span className="font-mono font-medium text-[14px] text-center" style={{ width: 40 }} aria-live="polite">
                ×{multiplier}
              </span>
              {stepperButton(t("newProject.multUp"), "+", () => setMultiplier((m) => Math.min(999, m + 1)))}
              {assembly && (
                <span className="text-[12px] text-muted" style={{ marginLeft: 8 }}>
                  {assembly.notes?.trim() || t("newProject.partsNote", { count: assembly.parts.length })}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    ) : start === "copy" ? (
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{t("newProject.copyLabel")}</SectionLabel>
        {projects.length === 0 ? (
          <div className="text-[13px] text-muted" style={{ padding: "8px 0" }}>
            {t("newProject.noJobs")}
          </div>
        ) : (
          <ul role="list" style={{ marginTop: 4, borderTop: "1px solid var(--foreground)", maxHeight: 220, overflowY: "auto" }}>
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  aria-pressed={project.id === copyId}
                  onClick={() => pickCopy(project)}
                  className="flex justify-between items-baseline w-full text-left cursor-pointer"
                  style={{
                    padding: "9px 6px",
                    border: 0,
                    borderBottom: "1px solid var(--border-faint)",
                    background: project.id === copyId ? "var(--accent-surface)" : "transparent",
                    color: "var(--foreground)",
                    gap: 12,
                  }}
                >
                  <span className="min-w-0 truncate">
                    <span className="font-extrabold text-[13px]">{project.name}</span>
                    {project.client && <span className="text-[12px] text-foreground-secondary"> · {project.client}</span>}
                  </span>
                  <span className="font-mono text-[12px] whitespace-nowrap">
                    {currencySymbol} {fsMoney(projectQuotedValue(project, marginPercent))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : start === "import" ? (
      <div style={{ marginBottom: 20 }}>
        <label>
          <SectionLabel className="block mb-1.5">{t("newProject.importLabel")}</SectionLabel>
          <textarea
            value={list}
            onChange={(e) => setList(e.target.value)}
            rows={5}
            placeholder={t("newProject.importPlaceholder")}
            className="w-full font-mono text-[13px] placeholder:text-muted-faint"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: "8px 10px", marginBottom: 6 }}
          />
        </label>
        <div className="text-[12px] text-muted" aria-live="polite">
          {imported.items.length === 0 && imported.unread === 0
            ? t("newProject.importHint")
            : [
                imported.items.length > 0 ? t("newProject.importRecognised", { count: imported.items.length }) : null,
                imported.unread > 0 ? t("newProject.importUnread", { count: imported.unread }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </div>
      </div>
    ) : null;

  const dueLabel = (preset: DuePreset) =>
    preset === 7
      ? t("newProject.dueWeek")
      : preset === 14
        ? t("newProject.due2Weeks")
        : preset === 30
          ? t("newProject.dueMonth")
          : preset === 60
            ? t("newProject.due2Months")
            : t("newProject.dueNone");

  const details = (
    <>
      {startSection}
      <label className="block" style={{ marginBottom: 20 }}>
        <SectionLabel>{t("newProject.name")}</SectionLabel>
        <input
          value={name}
          onChange={(e) => setTypedName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder={t("newProject.namePlaceholder")}
          className="block w-full fs-title placeholder:text-muted-faint"
          style={{ border: 0, borderBottom: "1px solid var(--foreground)", background: "transparent", fontSize: 22, padding: "6px 0" }}
        />
      </label>
      <div style={{ marginBottom: 20 }}>
        <SectionLabel className="block mb-1.5">{t("newProject.customer")}</SectionLabel>
        {customerField}
      </div>
      <div>
        <SectionLabel className="block mb-1.5">{t("newProject.due")}</SectionLabel>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {DUE_PRESETS.map((preset) => (
            <button
              key={String(preset)}
              type="button"
              aria-pressed={due === preset}
              onClick={() => setDue(preset)}
              className="text-[13px]"
              style={chipStyle(due === preset)}
            >
              {dueLabel(preset)}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  /* ───────── preview ───────── */

  const previewRows = [
    { label: t("newProject.rows.quoted"), value: quoted > 0 ? `${currencySymbol} ${fsMoney(quoted)}` : "—" },
    { label: t("newProject.rows.start"), value: start ? t(`newProject.startNames.${start}`) : "—" },
    { label: t("newProject.rows.items"), value: String(itemCount) },
    { label: t("newProject.rows.margin"), value: `${draft.marginPercent ?? margin}%` },
    { label: t("newProject.rows.due"), value: due === null ? "—" : t("newProject.dueIn", { days: due }) },
  ];

  const preview = (
    <aside
      aria-label={t("newProject.preview")}
      className="flex flex-col flex-shrink-0 w-full sm:w-[270px] border-t sm:border-t-0 sm:border-l border-border-faint"
      style={{ background: "var(--surface-raised)", padding: "22px 20px" }}
    >
      <SectionLabel>{t("newProject.preview")}</SectionLabel>
      <div className="fs-title text-[21px]" style={{ marginTop: 6, lineHeight: 1.2 }}>
        {name.trim() || t("newProject.untitled")}
      </div>
      <div className="text-[12px] text-foreground-secondary" style={{ marginTop: 2 }}>
        {customer?.name ?? t("newProject.noCustomer")}
      </div>
      <div style={{ marginTop: 14 }}>
        <MixBar project={draft} height={10} />
      </div>
      <dl style={{ marginTop: 12, borderTop: "1px solid var(--border-faint)" }}>
        {previewRows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between text-[12px]"
            style={{ padding: "6px 0", borderBottom: "1px solid var(--border-faint)" }}
          >
            <dt className="text-foreground-secondary">{row.label}</dt>
            <dd className="font-mono">{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );

  const steps = (
    <ol className="hidden sm:flex items-center" style={{ gap: 10 }} aria-label={t("newProject.title")}>
      {[t("newProject.stepStart"), t("newProject.stepDetails")].map((label, i) => {
        const on = step === i + 1;
        return (
          <li
            key={label}
            aria-current={on ? "step" : undefined}
            className="flex items-center font-mono text-[10px] uppercase"
            style={{ gap: 6, letterSpacing: 1.4, color: on ? "var(--foreground)" : "var(--border-strong)" }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 18,
                height: 18,
                border: "1px solid currentColor",
                background: on ? "var(--foreground)" : "transparent",
                color: on ? "var(--background)" : "var(--border-strong)",
              }}
            >
              {i + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );

  const footer = (
    <div className="flex items-center" style={{ gap: 10 }}>
      {step === 2 && (
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-[13px] cursor-pointer"
          style={{ padding: "8px 14px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
        >
          {t("newProject.back")}
        </button>
      )}
      <span className="flex-1 text-[12px] text-muted">
        {blocker ?? (customer?.marginPercent !== undefined ? t("newProject.footCustomer") : t("newProject.footShop"))}
      </span>
      {step === 2 && (
        <button
          type="button"
          onClick={create}
          disabled={Boolean(blocker)}
          className="text-[13px] cursor-pointer disabled:cursor-not-allowed"
          style={{
            padding: "8px 18px",
            border: 0,
            background: "var(--action)",
            color: "var(--action-contrast)",
            opacity: blocker ? 0.4 : 1,
          }}
        >
          {t("newProject.create")}
        </button>
      )}
    </div>
  );

  return (
    <SheetShell title={t("newProject.title")} onClose={onClose} size="wide" bare headerAction={steps} footer={footer}>
      <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-y-auto sm:overflow-hidden">
        <div className="flex-1 min-w-0 sm:overflow-y-auto" style={{ padding: "22px 24px" }}>
          {step === 1 ? tiles : details}
        </div>
        {preview}
      </div>
    </SheetShell>
  );
}
