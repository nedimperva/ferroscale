import type { CalculationInput } from "@/lib/calculator/types";
import type { Project, ProjectStatus } from "@/hooks/useProjects";
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
    patch: { client?: string; status?: ProjectStatus; dueDate?: string },
  ) => void;
  onUpdateNotes: (id: string, notes: string) => void;
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
  onPrintQuote: (project: Project) => void;
}
