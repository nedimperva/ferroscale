"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isActiveSyncEntity,
  loadCustomers,
  markEntityDeleted,
  persistCustomers,
} from "@/lib/sync/collections";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/**
 * Who a job is for. Projects point at one by `customerId` and keep the name in
 * `client` as well, so a quote prints and a CSV exports without a lookup.
 */
export interface Customer {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  notes?: string;
  /** Default margin for this customer's new quotes. Absent → the shop default. */
  marginPercent?: number;
  /** Archived customers keep their jobs but drop out of new-project search. */
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type CustomerPatch = Partial<
  Pick<Customer, "name" | "contact" | "phone" | "email" | "notes" | "marginPercent">
>;

export interface CustomerDraft extends CustomerPatch {
  name: string;
}

export const MAX_CUSTOMERS = 500;

export function isArchivedCustomer(customer: Customer): boolean {
  return Boolean(customer.archivedAt);
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export interface UseCustomersReturn {
  /** Every live customer, archived ones included. */
  customers: Customer[];
  createCustomer: (draft: CustomerDraft) => Customer;
  updateCustomer: (id: string, patch: CustomerPatch) => void;
  setCustomerArchived: (id: string, archived: boolean) => void;
  /** Callers check the customer has no jobs — the store does not know about projects. */
  deleteCustomer: (id: string) => void;
  /**
   * Add customers made by the client-name migration, and bring back
   * tombstones a live project still names. Rows are upserted by id.
   */
  upsertCustomers: (rows: Customer[]) => void;
}

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanPatch(patch: CustomerPatch): CustomerPatch {
  const out: CustomerPatch = {};
  if (patch.name !== undefined) out.name = patch.name.trim();
  if (patch.contact !== undefined) out.contact = cleanText(patch.contact);
  if (patch.phone !== undefined) out.phone = cleanText(patch.phone);
  if (patch.email !== undefined) out.email = cleanText(patch.email);
  if (patch.notes !== undefined) out.notes = cleanText(patch.notes);
  if (patch.marginPercent !== undefined) {
    const m = Number(patch.marginPercent);
    out.marginPercent = Number.isFinite(m) ? Math.max(0, Math.min(500, m)) : undefined;
  }
  return out;
}

export function useCustomers(): UseCustomersReturn {
  const [allCustomers, setAllCustomers] = useState<Customer[]>(() => {
    if (typeof window !== "undefined") return loadCustomers();
    return [];
  });
  // Same reasoning as useProjects: the ref is the authoritative list so a
  // create can be read back by the caller before React re-renders.
  const customersRef = useRef<Customer[]>(allCustomers);

  const setCustomers = useCallback((updater: (prev: Customer[]) => Customer[]) => {
    const next = updater(customersRef.current);
    if (next === customersRef.current) return;
    customersRef.current = next;
    persistCustomers(next);
    setAllCustomers(next);
  }, []);

  useEffect(() => {
    customersRef.current = allCustomers;
  }, [allCustomers]);

  const customers = allCustomers.filter((customer) => isActiveSyncEntity(customer));

  const createCustomer = useCallback(
    (draft: CustomerDraft): Customer => {
      const now = new Date().toISOString();
      const customer: Customer = {
        ...cleanPatch(draft),
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        createdAt: now,
        updatedAt: now,
      };
      setCustomers((prev) => {
        if (prev.filter((c) => !c.deletedAt).length >= MAX_CUSTOMERS) return prev;
        return [customer, ...prev];
      });
      return customer;
    },
    [setCustomers],
  );

  const updateCustomer = useCallback(
    (id: string, patch: CustomerPatch) => {
      const clean = cleanPatch(patch);
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.deletedAt) return c;
          // An emptied name keeps the old one: a customer always has a name.
          const next = { ...c, ...clean, name: clean.name || c.name };
          return { ...next, updatedAt: new Date().toISOString() };
        }),
      );
    },
    [setCustomers],
  );

  const setCustomerArchived = useCallback(
    (id: string, archived: boolean) => {
      const now = new Date().toISOString();
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.deletedAt) return c;
          if (Boolean(c.archivedAt) === archived) return c;
          return { ...c, archivedAt: archived ? now : undefined, updatedAt: now };
        }),
      );
    },
    [setCustomers],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setCustomers((prev) =>
        prev.map((c) => (c.id === id && !c.deletedAt ? markEntityDeleted(c, now) : c)),
      );
    },
    [setCustomers],
  );

  const upsertCustomers = useCallback(
    (rows: Customer[]) => {
      if (rows.length === 0) return;
      setCustomers((prev) => {
        const incoming = new Map(rows.map((row) => [row.id, row]));
        const next = prev.map((c) => incoming.get(c.id) ?? c);
        const known = new Set(prev.map((c) => c.id));
        const added = rows.filter((row) => !known.has(row.id));
        return [...added, ...next];
      });
    },
    [setCustomers],
  );

  return {
    customers,
    createCustomer,
    updateCustomer,
    setCustomerArchived,
    deleteCustomer,
    upsertCustomers,
  };
}
