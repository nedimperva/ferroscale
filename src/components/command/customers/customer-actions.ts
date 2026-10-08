import type { Customer, CustomerDraft, CustomerPatch } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";

/**
 * Everything the Customers surface can do, in one bag — the same arrangement
 * as ProjectActions, for the same reason: the list and the detail are each
 * rendered on the wide workspace and inside the phone sheet.
 */
export interface CustomerActions {
  onCreate: (draft: CustomerDraft) => Customer;
  /** A rename also rewrites the client name stored on the customer's jobs. */
  onUpdate: (id: string, patch: CustomerPatch) => void;
  onSetArchived: (id: string, archived: boolean) => void;
  /** Only offered for a customer without jobs. Deletes with an undo toast. */
  onDelete: (id: string) => void;
  /** Start a job for this customer; returns it so the surface can open it. */
  onNewProject: (customerId: string) => Project | void;
}
