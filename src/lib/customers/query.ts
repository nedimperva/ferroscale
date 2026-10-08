import type { Customer } from "@/hooks/useCustomers";
import {
  computeAggregates,
  isClosedProject,
  type Project,
} from "@/hooks/useProjects";
import type { CurrencyCode } from "@/lib/calculator/types";
import { getDueDateUrgency, projectQuotedValue } from "@/lib/projects/query";
import { customerNameKey } from "./link";

/**
 * The figures on the Customers surface. Pure and UI-free, like the projects
 * query: nothing here is stored — a customer's lifetime and open value are
 * whatever their jobs add up to right now.
 */

export interface CustomerStats {
  /** Every live job for this customer, newest first. */
  jobs: Project[];
  /** Jobs not yet completed or archived. */
  openJobs: Project[];
  overdueCount: number;
  lifetimeValue: number;
  openValue: number;
  /** The currency of the newest job; mixed-currency customers are rare enough. */
  currency: CurrencyCode;
}

function timeOf(value: string | undefined): number {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? 0 : ms;
}

export function customerJobs(customerId: string, projects: Project[]): Project[] {
  return projects
    .filter((project) => !project.deletedAt && project.customerId === customerId)
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt));
}

export function customerStats(
  customerId: string,
  projects: Project[],
  globalMarginPercent: number = 0,
): CustomerStats {
  const jobs = customerJobs(customerId, projects);
  const openJobs = jobs.filter((project) => !isClosedProject(project));
  let lifetimeValue = 0;
  let openValue = 0;
  let overdueCount = 0;
  for (const job of jobs) {
    const value = projectQuotedValue(job, globalMarginPercent);
    lifetimeValue += value;
    if (!isClosedProject(job)) {
      openValue += value;
      if (getDueDateUrgency(job.dueDate).status === "overdue") overdueCount += 1;
    }
  }
  return {
    jobs,
    openJobs,
    overdueCount,
    lifetimeValue: Math.round(lifetimeValue * 100) / 100,
    openValue: Math.round(openValue * 100) / 100,
    currency: jobs[0] ? computeAggregates(jobs[0]).currency : "EUR",
  };
}

export interface CustomerQuery {
  search?: string;
  /** true lists only archived customers, false only active ones. */
  archived?: boolean;
}

function haystack(customer: Customer): string {
  return [customer.name, customer.contact, customer.phone, customer.email]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en");
}

/** Active or archived customers matching the search, by name. */
export function filterCustomers(customers: Customer[], query: CustomerQuery = {}): Customer[] {
  const needle = query.search?.trim().toLocaleLowerCase("en") ?? "";
  const archived = query.archived ?? false;
  return customers
    .filter((customer) => !customer.deletedAt)
    .filter((customer) => Boolean(customer.archivedAt) === archived)
    .filter((customer) => !needle || haystack(customer).includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** The active customer with this name, if any — how a typed client finds its record. */
export function findCustomerByName(customers: Customer[], name: string): Customer | undefined {
  const key = customerNameKey(name);
  if (!key) return undefined;
  return customers.find((c) => !c.deletedAt && customerNameKey(c.name) === key);
}
