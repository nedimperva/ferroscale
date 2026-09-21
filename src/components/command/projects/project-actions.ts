import type { CalculationInput } from "@/lib/calculator/types";
import type {
  Project,
  ProjectAdditionalCost,
  ProjectCategory,
  ProjectStatus,
} from "@/hooks/useProjects";
import type { SavedEntry, SavedPart } from "@/hooks/useSaved";
import type { ProjectPaintCoat } from "@/lib/projects/paint";

/**
 * Everything the Projects surfaces can do to a project, in one bag. The list
 * and the detail page both need most of it, and the wide workspace and the
 * library sheet both render both — passing eleven callbacks through four
 * components four times over was the alternative.
 */
export interface ProjectActions {
  /**
   * The library's multi-part entries, for the "insert an assembly" picker.
   * Data rather than a callback, but it rides in the same bag for the same
   * reason: the shell owns the one `useSaved` instance, and a second one
   * mounted down here would hold its own snapshot and silently drift.
   */
  libraryAssemblies?: SavedEntry[];
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
  onQuickAddItem?: (projectId: string, query: string, assembly?: string) => boolean;
  /** Drop a library assembly into the project, scaled. */
  onInsertAssembly?: (
    projectId: string,
    entry: SavedEntry,
    multiplier: number,
    customAssemblyName?: string,
  ) => boolean;
  onScaleSubAssembly?: (
    projectId: string,
    assemblyName: string,
    multiplier: number,
  ) => boolean;
  onCreateFromAssembly?: (
    name: string,
    entry: SavedEntry,
    multiplier?: number,
  ) => Project | void;
  /** Send a project's sub-assembly back to the library as a reusable entry. */
  onSaveAssemblyToLibrary?: (
    name: string,
    parts: SavedPart[],
    description?: string,
    category?: ProjectCategory,
  ) => void;
  onPrintQuote: (project: Project) => void;
}
