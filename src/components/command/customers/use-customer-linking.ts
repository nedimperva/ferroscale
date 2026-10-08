"use client";

import { useEffect } from "react";
import type { UseCustomersReturn } from "@/hooks/useCustomers";
import type { UseProjectsReturn } from "@/hooks/useProjects";
import { reconcileCustomerLinks } from "@/lib/customers/link";

/**
 * Keep every project that names a client attached to a customer record.
 *
 * Runs whenever either list changes: on first load (the migration from
 * free-text clients), after a client is typed into a project, and after a
 * sync pull brings a project from a device that predates customers. It is
 * idempotent — once every named project has a link it finds nothing to do —
 * so the effect settles after one round.
 */
export function useCustomerLinking(
  projectsApi: Pick<UseProjectsReturn, "projects" | "linkProjectCustomers">,
  customersApi: Pick<UseCustomersReturn, "customers" | "upsertCustomers">,
): void {
  const { projects, linkProjectCustomers } = projectsApi;
  const { customers, upsertCustomers } = customersApi;

  useEffect(() => {
    const { created, links } = reconcileCustomerLinks(projects, customers);
    // Customers first: a link must never point at a row that is not there yet.
    if (created.length > 0) upsertCustomers(created);
    if (Object.keys(links).length > 0) linkProjectCustomers(links);
  }, [projects, customers, upsertCustomers, linkProjectCustomers]);
}
