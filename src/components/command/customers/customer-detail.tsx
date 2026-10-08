"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney } from "@ferroscale/metal-core";
import type { Customer, CustomerPatch } from "@/hooks/useCustomers";
import { projectStatus, type Project } from "@/hooks/useProjects";
import { customerStats } from "@/lib/customers/query";
import { projectQuotedValue } from "@/lib/projects/query";
import { DeskIcon, SectionLabel } from "../desktop/desk-atoms";
import { STATUS_DOT } from "../projects/project-views";
import type { CustomerActions } from "./customer-actions";

const FIELD_KEYS = ["name", "contact", "phone", "email"] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--foreground)",
};

/**
 * One customer: who they are, what they are worth, the defaults their new
 * quotes start from, and every job they have had. Fields save on blur, not on
 * every keystroke — a rename rewrites the client on each of their jobs, and
 * that should happen once, not once per letter.
 *
 * Keyed by customer id by the caller, so switching customers resets the
 * drafts instead of carrying one customer's half-typed phone to the next.
 */
export function CustomerDetail({
  customer,
  projects,
  marginPercent,
  actions,
  onOpenProject,
  onBack,
  compact = false,
}: {
  customer: Customer;
  projects: Project[];
  marginPercent: number;
  actions: CustomerActions;
  onOpenProject: (projectId: string) => void;
  /** Phone only: back to the list. */
  onBack?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const stats = customerStats(customer.id, projects, marginPercent);
  const symbol = CURRENCY_SYMBOLS[stats.currency] ?? "€";
  const money = (n: number) => (n > 0 ? `${symbol} ${fsMoney(n)}` : "—");
  const archived = Boolean(customer.archivedAt);
  const canDelete = stats.jobs.length === 0;
  const margin = customer.marginPercent ?? marginPercent;

  const [drafts, setDrafts] = useState<Record<FieldKey | "notes", string>>({
    name: customer.name,
    contact: customer.contact ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    notes: customer.notes ?? "",
  });

  const commit = (key: FieldKey | "notes") => {
    const value = drafts[key].trim();
    const current = (key === "name" ? customer.name : customer[key]) ?? "";
    if (value === current) return;
    if (key === "name" && !value) {
      setDrafts((d) => ({ ...d, name: customer.name }));
      return;
    }
    actions.onUpdate(customer.id, { [key]: value } as CustomerPatch);
  };

  const fieldLabel: Record<FieldKey, string> = {
    name: t("customers.fields.name"),
    contact: t("customers.fields.contact"),
    phone: t("customers.fields.phone"),
    email: t("customers.fields.email"),
  };
  const fieldPlaceholder: Record<FieldKey, string> = {
    name: t("customers.fields.namePlaceholder"),
    contact: t("customers.fields.contactPlaceholder"),
    phone: t("customers.fields.phonePlaceholder"),
    email: t("customers.fields.emailPlaceholder"),
  };
  const fieldType: Record<FieldKey, string> = { name: "text", contact: "text", phone: "tel", email: "email" };

  const kpis = [
    { label: t("customers.kpi.lifetime"), value: money(stats.lifetimeValue) },
    { label: t("customers.kpi.jobs"), value: String(stats.jobs.length) },
    { label: t("customers.kpi.open"), value: String(stats.openJobs.length) },
    { label: t("customers.kpi.openValue"), value: money(stats.openValue) },
  ];

  const details = (
    <div>
      <SectionLabel as="h2" className="block mb-1.5">
        {t("customers.details")}
      </SectionLabel>
      {FIELD_KEYS.map((key) => (
        <label key={key} className="block" style={{ marginBottom: 10 }}>
          <span className="block text-[12px] text-foreground-secondary" style={{ marginBottom: 3 }}>
            {fieldLabel[key]}
          </span>
          <input
            type={fieldType[key]}
            value={drafts[key]}
            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
            onBlur={() => commit(key)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder={fieldPlaceholder[key]}
            className="w-full text-[14px] placeholder:text-muted-faint"
            style={{ ...inputStyle, height: compact ? 40 : 32, padding: "0 9px" }}
          />
        </label>
      ))}
      <label className="block">
        <span className="block text-[12px] text-foreground-secondary" style={{ marginBottom: 3 }}>
          {t("customers.fields.notes")}
        </span>
        <textarea
          value={drafts.notes}
          onChange={(e) => setDrafts((d) => ({ ...d, notes: e.target.value }))}
          onBlur={() => commit("notes")}
          rows={3}
          placeholder={t("customers.fields.notesPlaceholder")}
          className="w-full text-[14px] placeholder:text-muted-faint"
          style={{ ...inputStyle, padding: "7px 9px", resize: "vertical" }}
        />
      </label>
    </div>
  );

  const stepper = (label: string, onClick: () => void, glyph: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center cursor-pointer text-[15px]"
      style={{ ...inputStyle, width: 30, height: 30 }}
    >
      {glyph}
    </button>
  );

  const defaults = (
    <div>
      <SectionLabel as="h2" className="block mb-1.5">
        {t("customers.defaults")}
      </SectionLabel>
      <div className="text-[12px] text-foreground-secondary" style={{ marginBottom: 3 }}>
        {t("customers.margin")}
      </div>
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        {stepper(t("customers.marginDown"), () => actions.onUpdate(customer.id, { marginPercent: Math.max(0, margin - 1) }), "−")}
        <span className="font-mono font-medium text-[15px] text-center" style={{ width: 56 }} aria-live="polite">
          {margin}%
        </span>
        {stepper(t("customers.marginUp"), () => actions.onUpdate(customer.id, { marginPercent: margin + 1 }), "+")}
        {customer.marginPercent === undefined ? (
          <span className="text-[12px] text-muted ml-1">{t("customers.marginShopDefault")}</span>
        ) : (
          <button
            type="button"
            onClick={() => actions.onUpdate(customer.id, { marginPercent: null })}
            className="text-[12px] ml-1 cursor-pointer underline"
            style={{ border: 0, background: "transparent", color: "var(--accent-text)", padding: 0 }}
          >
            {t("customers.marginUseShop")}
          </button>
        )}
      </div>
    </div>
  );

  const jobs = (
    <div>
      <SectionLabel as="h2" className="block" >
        {t("customers.jobs")}
      </SectionLabel>
      <div style={{ marginTop: 4 }}>
        {stats.jobs.length === 0 ? (
          <div className="text-[13px] text-muted" style={{ padding: "8px 0" }}>
            {t("customers.noJobs")}
          </div>
        ) : (
          <ul role="list">
            {stats.jobs.map((job) => {
              const status = projectStatus(job);
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => onOpenProject(job.id)}
                    aria-label={t("customers.openJob", { name: job.name })}
                    className="flex items-center w-full text-left cursor-pointer hover:bg-[var(--surface-inset)]"
                    style={{
                      gap: 10,
                      padding: "9px 0",
                      border: 0,
                      borderBottom: "1px solid var(--border-faint)",
                      background: "transparent",
                      color: "var(--foreground)",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 7, height: 7, flex: "none", background: STATUS_DOT[status] }} />
                    <span className="flex-1 min-w-0 font-extrabold text-[13px] truncate">{job.name}</span>
                    <span className="font-mono text-[10px] uppercase text-muted whitespace-nowrap" style={{ letterSpacing: 1.2 }}>
                      {t(`projects.status.${status}`)}
                    </span>
                    <span className="font-mono text-[12px] text-right whitespace-nowrap" style={{ width: 80 }}>
                      {money(projectQuotedValue(job, marginPercent))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div
        className="flex items-center flex-wrap"
        style={{ gap: 12, marginTop: 28, paddingTop: 14, borderTop: "1px solid var(--border-faint)" }}
      >
        <button
          type="button"
          onClick={() => canDelete && actions.onDelete(customer.id)}
          disabled={!canDelete}
          className="text-[12px]"
          style={{
            padding: "7px 12px",
            background: "transparent",
            border: `1px solid ${canDelete ? "var(--red-text)" : "var(--border)"}`,
            color: canDelete ? "var(--red-text)" : "var(--disabled-text)",
            cursor: canDelete ? "pointer" : "not-allowed",
            opacity: canDelete ? 1 : 0.7,
          }}
        >
          {t("customers.delete")}
        </button>
        <span className="text-[12px] text-muted">
          {canDelete ? t("customers.deleteFree") : t("customers.deleteBlocked", { count: stats.jobs.length })}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className={compact ? "flex flex-col" : "flex-1 min-w-0 overflow-y-auto"}
      style={compact ? undefined : { padding: "24px 32px 32px" }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[12px] text-foreground-secondary cursor-pointer self-start"
          style={{ border: 0, background: "transparent", padding: "0 0 10px" }}
        >
          ‹ {t("customers.back")}
        </button>
      )}
      <div className={`flex justify-between gap-4 ${compact ? "flex-col" : "items-start"}`}>
        <div className="min-w-0">
          <div className="fs-title truncate" style={{ fontSize: compact ? 26 : 30, lineHeight: 1.15 }}>
            {customer.name}
          </div>
          <div className="font-mono text-[11px] uppercase text-muted" style={{ marginTop: 2, letterSpacing: 1.2 }}>
            {archived ? t("customers.statusArchived") : t("customers.statusActive")}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!archived && (
            <button
              type="button"
              onClick={() => actions.onNewProject(customer.id)}
              className="inline-flex items-center gap-1.5 text-[13px] cursor-pointer whitespace-nowrap"
              style={{ padding: "8px 14px", border: 0, background: "var(--action)", color: "var(--action-contrast)" }}
            >
              <DeskIcon name="plus" stroke="var(--action-contrast)" />
              {t("customers.newProject")}
            </button>
          )}
          <button
            type="button"
            onClick={() => actions.onSetArchived(customer.id, !archived)}
            className="text-[13px] cursor-pointer whitespace-nowrap"
            style={{ padding: "8px 14px", border: "1px solid var(--border)", background: "transparent", color: "var(--foreground)" }}
          >
            {archived ? t("customers.restore") : t("customers.archive")}
          </button>
        </div>
      </div>

      <div
        className={`grid ${compact ? "grid-cols-2" : "grid-cols-4"}`}
        style={{ borderTop: "1px solid var(--foreground)", borderBottom: "1px solid var(--border-faint)", marginTop: 18 }}
      >
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            style={{
              padding: "10px 14px",
              borderLeft: (compact ? i % 2 : i) > 0 ? "1px solid var(--border-faint)" : "none",
              borderTop: compact && i >= 2 ? "1px solid var(--border-faint)" : "none",
            }}
          >
            <div className="font-mono text-[9px] uppercase text-muted" style={{ letterSpacing: 1.6 }}>
              {kpi.label}
            </div>
            <div className="font-mono font-medium text-[17px]" style={{ marginTop: 3 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {compact ? (
        <div className="flex flex-col" style={{ gap: 24, marginTop: 22 }}>
          {defaults}
          {details}
          {jobs}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 36, marginTop: 22 }}>
          {details}
          <div className="flex flex-col" style={{ gap: 24 }}>
            {defaults}
            {jobs}
          </div>
        </div>
      )}
    </div>
  );
}
