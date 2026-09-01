import type { CalculationInput } from "@/lib/calculator/types";
import type {
  Project,
  ProjectAdditionalCost,
  ProjectCategory,
  ProjectStatus,
} from "@/hooks/useProjects";
import type { ProjectPaintCoat } from "@/lib/projects/paint";

/**
 * Everything the Projects surfaces can do to a project, in one bag. The list
 * and the detail page both need most of it, and the wide workspace and the
 * library sheet both render both — passing eleven callbacks through four
 * components four times over was the alternative.
 */
export interface ProjectActions {
  onCreate: (name: string) => Project | void;
  onRename: (id: string, name: string) => void;
  onUpdateMeta: (
    id: string,
    patch: {
      client?: string;
      status?: ProjectStatus;
      dueDate?: string;
      category?: ProjectCategory;
      marginPercent?: number;
    },
  ) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateLabor?: (
    id: string,
    labor: { laborHours?: number; laborRatePerHour?: number },
  ) => void;
  onUpdateAdditionalCosts?: (id: string, costs: ProjectAdditionalCost[]) => void;
  onSetItemAssembly?: (projectId: string, calcId: string, assembly?: string) => void;
  onBatchArchive?: (ids: string[]) => void;
  onBatchDelete?: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  /** Deletes with an undo toast — the surfaces never confirm inline. */
  onDelete: (id: string) => void;
  onRemoveItem: (projectId: string, calcId: string) => void;
  onSetItemQuantity: (projectId: string, calcId: string, quantity: number) => void;
  onSetItemNote: (projectId: string, calcId: string, note: string) => void;
  onSetPaintCoats: (id: string, coats: ProjectPaintCoat[]) => void;
  /** Load an item back into the command bar. */
  onOpenItem: (input: CalculationInput) => void;
  /**
   * Add whatever the bar currently holds to this project. Returns false when
   * the bar has nothing complete in it — the surface then sends the user to
   * the calculator, which is the only place that state can be fixed.
   */
  onAddItem: (projectId: string) => boolean;
  /** Add a query directly to the project using fast inline command parser. */
  onQuickAddItem?: (projectId: string, query: string) => boolean;
  onPrintQuote: (project: Project) => void;
}
