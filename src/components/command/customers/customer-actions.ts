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
  /**
   * Open the New project dialog for this customer. `onCreated` is the
   * surface's own next step — each one opens the new job where it lives.
   */
  onNewProject: (customerId: string, onCreated?: (project: Project) => void) => void;
}
