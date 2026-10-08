"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import { filterCustomers } from "@/lib/customers/query";
import { DeskViewHeader } from "../desktop/desk-rail";
import { DeskIcon } from "../desktop/desk-atoms";
import { SearchField } from "../search-field";
import { EmptyState } from "../empty-state";
import { CustomerFilterChips, CustomerRows } from "./customer-list";
import { CustomerDetail } from "./customer-detail";
import type { CustomerActions } from "./customer-actions";

/**
 * Customers, rendered twice like every list surface: on the wide workspace a
 * 360px list beside the open customer, and inside the phone's library sheet
 * a list that drills into the same detail. Which customer is open belongs to
 * the caller, so Projects can send you straight to one.
 */
export function CustomersView({
  customers,
  projects,
  marginPercent,
  actions,
  selectedId,
  onSelect,
  onOpenProject,
  compact = false,
}: {
  customers: Customer[];
  projects: Project[];
  marginPercent: number;
  actions: CustomerActions;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenProject: (projectId: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations("command");
  const [search, setSearch] = useState("");
  const selected = selectedId ? (customers.find((c) => c.id === selectedId) ?? null) : null;
  // Opening an archived customer from a project lands on the Archived list,
  // so the row that is open is the row that is marked.
  const [archivedFilter, setArchivedFilter] = useState(() => Boolean(selected?.archivedAt));
  const [lastSelectedId, setLastSelectedId] = useState(selectedId);
  if (selectedId !== lastSelectedId) {
    setLastSelectedId(selectedId);
    if (selected && Boolean(selected.archivedAt) !== archivedFilter) setArchivedFilter(Boolean(selected.archivedAt));
  }

  const visible = useMemo(
    () => filterCustomers(customers, { search, archived: archivedFilter }),
    [customers, search, archivedFilter],
  );
  const jobCount = projects.filter((p) => p.customerId).length;

  const addCustomer = () => {
    const customer = actions.onCreate({ name: t("customers.defaultName") });
    setSearch("");
    setArchivedFilter(false);
    onSelect(customer.id);
  };

  const newButton = (
    <button
      type="button"
      onClick={addCustomer}
      className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer whitespace-nowrap flex-shrink-0"
      style={{ height: 28, padding: "0 12px", border: 0, background: "var(--action)", color: "var(--action-contrast)" }}
    >
      <DeskIcon name="plus" stroke="var(--action-contrast)" />
      {t("customers.newCustomer")}
    </button>
  );

  const searchField = (
    <SearchField
      compact={compact}
      value={search}
      onChange={setSearch}
      placeholder={t("customers.searchPlaceholder")}
      ariaLabel={t("customers.searchAria")}
    />
  );

  const emptyList =
    customers.length === 0 ? (
      <EmptyState compact title={t("customers.emptyTitle")} body={t("customers.emptyBody")} action={newButton} />
    ) : (
      <div className="text-[13px] text-muted" style={{ padding: "24px 18px" }}>
        {archivedFilter && !search ? t("customers.emptyArchived") : t("customers.noMatch")}
      </div>
    );

  const rows =
    visible.length === 0 ? (
      emptyList
    ) : (
      <CustomerRows
        customers={visible}
        projects={projects}
        marginPercent={marginPercent}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
      />
    );

  const detail = (customer: Customer, onBack?: () => void) => (
    <CustomerDetail
      key={customer.id}
      customer={customer}
      projects={projects}
      marginPercent={marginPercent}
      actions={actions}
      onOpenProject={onOpenProject}
      onBack={onBack}
      compact={compact}
    />
  );

  if (compact) {
    if (selected) return detail(selected, () => onSelect(null));
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">{searchField}</div>
          {newButton}
        </div>
        <CustomerFilterChips archived={archivedFilter} onChange={setArchivedFilter} />
        <div style={{ borderTop: "1px solid var(--border-faint)" }}>{rows}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskViewHeader
        title={t("customers.title")}
        subtitle={t("customers.subtitle", {
          customers: customers.filter((c) => !c.archivedAt).length,
          jobs: jobCount,
        })}
        actions={
          <>
            <div style={{ width: 220 }}>{searchField}</div>
            {newButton}
          </>
        }
      />
      <div className="flex flex-1 min-h-0">
        <div
          className="flex flex-col flex-shrink-0"
          style={{ width: 360, borderRight: "1px solid var(--border-faint)", background: "var(--surface)" }}
        >
          <div style={{ padding: "12px 18px" }}>
            <CustomerFilterChips archived={archivedFilter} onChange={setArchivedFilter} />
          </div>
          <div className="flex-1 overflow-y-auto" style={{ borderTop: "1px solid var(--border-faint)" }}>
            {rows}
          </div>
        </div>
        {selected ? (
          detail(selected)
        ) : (
          <div className="flex-1 flex items-center justify-center text-[14px] text-muted">
            {t("customers.selectPrompt")}
          </div>
        )}
      </div>
    </div>
  );
}
