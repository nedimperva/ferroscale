"use client";

import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney } from "@ferroscale/metal-core";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import { customerStats } from "@/lib/customers/query";

/**
 * The customer rows: name and lifetime value on one line, jobs and what is
 * still open on the next. The selected row wears the accent rule and tint —
 * the same mark the projects rail uses for "this one".
 */
export function CustomerRows({
  customers,
  projects,
  marginPercent,
  selectedId,
  onSelect,
}: {
  customers: Customer[];
  projects: Project[];
  marginPercent: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("command");
  return (
    <ul role="list">
      {customers.map((customer) => {
        const stats = customerStats(customer.id, projects, marginPercent);
        const selected = customer.id === selectedId;
        const symbol = CURRENCY_SYMBOLS[stats.currency] ?? "€";
        const status =
          stats.overdueCount > 0
            ? { text: t("customers.overdueCount", { count: stats.overdueCount }), color: "var(--red-text)" }
            : stats.openJobs.length > 0
              ? { text: t("customers.openCount", { count: stats.openJobs.length }), color: "var(--accent-text)" }
              : { text: t("customers.noOpen"), color: "var(--muted)" };
        return (
          <li key={customer.id}>
            <button
              type="button"
              onClick={() => onSelect(customer.id)}
              aria-current={selected ? "true" : undefined}
              className="block w-full text-left cursor-pointer transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                padding: "12px 18px 12px 16px",
                border: 0,
                borderBottom: "1px solid var(--border-faint)",
                borderLeft: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
                background: selected ? "var(--accent-surface)" : "transparent",
                color: "var(--foreground)",
                opacity: customer.archivedAt ? 0.6 : 1,
              }}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-extrabold text-[14px] truncate">{customer.name}</span>
                <span className="font-mono font-medium text-[13px] whitespace-nowrap">
                  {stats.jobs.length > 0 ? `${symbol} ${fsMoney(stats.lifetimeValue)}` : "—"}
                </span>
              </span>
              <span className="flex justify-between gap-3 text-[12px] text-foreground-secondary" style={{ marginTop: 2 }}>
                <span>{t("customers.jobsCount", { count: stats.jobs.length })}</span>
                <span style={{ color: status.color }}>{status.text}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Active / Archived — a place you go, like the archived bucket on Projects. */
export function CustomerFilterChips({
  archived,
  onChange,
}: {
  archived: boolean;
  onChange: (archived: boolean) => void;
}) {
  const t = useTranslations("command");
  const chip = (on: boolean) => ({
    padding: "4px 10px",
    border: `1px solid ${on ? "var(--foreground)" : "var(--border)"}`,
    background: on ? "var(--foreground)" : "var(--surface)",
    color: on ? "var(--background)" : "var(--foreground)",
  });
  return (
    <div className="flex gap-1.5" role="group" aria-label={t("customers.filterAria")}>
      <button
        type="button"
        aria-pressed={!archived}
        onClick={() => onChange(false)}
        className="text-[12px] font-semibold cursor-pointer"
        style={chip(!archived)}
      >
        {t("customers.filterActive")}
      </button>
      <button
        type="button"
        aria-pressed={archived}
        onClick={() => onChange(true)}
        className="text-[12px] font-semibold cursor-pointer"
        style={chip(archived)}
      >
        {t("customers.filterArchived")}
      </button>
    </div>
  );
}
