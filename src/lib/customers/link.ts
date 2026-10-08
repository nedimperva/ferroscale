import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";

/**
 * How a project's customer is found from its free-text client.
 *
 * Before customers were records, `Project.client` was all there was. Every
 * project that names a client and has no `customerId` is linked here: to the
 * active customer with the same name, else to a new one. The new customer's id
 * comes from the name, not from a random UUID — two synced devices running
 * this on the same projects independently must create the *same* customer,
 * or every client would appear twice once both had pushed.
 *
 * Linking never bumps a project's `updatedAt`. The id is derived, so every
 * device reaches the same link on its own; stamping it would make this
 * housekeeping win merges against a real edit made elsewhere.
 */

/** Case-, space- and accent-form-insensitive key for a customer name. */
export function customerNameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

/** 32-bit FNV-1a, hex. Stable across devices and runtimes. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Deterministic id for the customer a client name migrates into. */
export function customerIdForName(name: string): string {
  return `cust-${fnv1a(customerNameKey(name))}`;
}

export interface CustomerReconciliation {
  /**
   * Customers to upsert by id. One whose id matches a deleted customer brings
   * it back: a live project still names it.
   */
  created: Customer[];
  /** projectId → customerId for projects that gained a link. */
  links: Record<string, string>;
}

export function reconcileCustomerLinks(
  projects: Project[],
  customers: Customer[],
  now: string = new Date().toISOString(),
): CustomerReconciliation {
  const byKey = new Map<string, Customer>();
  for (const customer of customers) {
    if (customer.deletedAt) continue;
    const key = customerNameKey(customer.name);
    // The first active match wins; customers are newest-first, but any
    // deterministic choice keeps devices agreeing.
    if (key && !byKey.has(key)) byKey.set(key, customer);
  }
  const created: Customer[] = [];
  const links: Record<string, string> = {};

  for (const project of projects) {
    if (project.deletedAt || project.customerId) continue;
    const client = project.client?.trim();
    if (!client) continue;
    const key = customerNameKey(client);
    let customer = byKey.get(key);
    if (!customer) {
      customer = { id: customerIdForName(client), name: client, createdAt: now, updatedAt: now };
      created.push(customer);
      byKey.set(key, customer);
    }
    links[project.id] = customer.id;
  }

  return { created, links };
}
