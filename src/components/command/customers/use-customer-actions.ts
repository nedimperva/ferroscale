"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { UseCustomersReturn } from "@/hooks/useCustomers";
import type { Project, UseProjectsReturn } from "@/hooks/useProjects";
import type { CustomerActions } from "./customer-actions";

interface UseCustomerActionsArgs {
  customersApi: UseCustomersReturn;
  projectsApi: UseProjectsReturn;
  showToast: (msg: string) => void;
  showActionToast: (msg: string, action: { label: string; onAction: () => void }) => void;
  /** Open the New project dialog. */
  onStartNewProject: (opts: { customerId?: string; onCreated?: (project: Project) => void }) => void;
}

export function useCustomerActions({
  customersApi,
  projectsApi,
  showToast,
  showActionToast,
  onStartNewProject,
}: UseCustomerActionsArgs): CustomerActions {
  const t = useTranslations("command");
  const { customers, createCustomer, updateCustomer, setCustomerArchived, deleteCustomer, upsertCustomers } =
    customersApi;
  const { projects, renameCustomerOnProjects } = projectsApi;

  return useMemo<CustomerActions>(
    () => ({
      onCreate: (draft) => {
        const customer = createCustomer(draft);
        showToast(t("customers.toastCreated"));
        return customer;
      },
      onUpdate: (id, patch) => {
        updateCustomer(id, patch);
        const name = patch.name?.trim();
        if (name) renameCustomerOnProjects(id, name);
      },
      onSetArchived: (id, archived) => {
        setCustomerArchived(id, archived);
        showToast(t(archived ? "customers.toastArchived" : "customers.toastRestored"));
      },
      onDelete: (id) => {
        const customer = customers.find((c) => c.id === id);
        if (!customer) return;
        // The surface only offers this without jobs; the check is repeated
        // here so a job synced in meanwhile never ends up pointing at nothing.
        if (projects.some((p) => p.customerId === id)) return;
        deleteCustomer(id);
        showActionToast(t("customers.toastDeleted"), {
          label: t("common.undo"),
          onAction: () => {
            upsertCustomers([{ ...customer, deletedAt: undefined, updatedAt: new Date().toISOString() }]);
            showToast(t("toast.restored"));
          },
        });
      },
      onNewProject: (customerId, onCreated) => onStartNewProject({ customerId, onCreated }),
    }),
    [
      customers,
      projects,
      createCustomer,
      updateCustomer,
      setCustomerArchived,
      deleteCustomer,
      upsertCustomers,
      renameCustomerOnProjects,
      onStartNewProject,
      showToast,
      showActionToast,
      t,
    ],
  );
}
