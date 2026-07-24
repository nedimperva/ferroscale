import type {
  CommandParseResult,
  CommandParserSettings,
  CommandSuggestion,
  CommandSuggestionItem,
} from "@ferroscale/metal-core";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { CalculationInput, CalculationResult, LengthUnit } from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import type { Project, ProjectStatus } from "@/hooks/useProjects";

export type DeskView = "calc" | "saved" | "projects" | "compare" | "settings";

export interface CommandDesktopProps {
  dark: boolean;
  onToggleTheme: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  p: CommandParseResult;
  sug: CommandSuggestion;
  sym: string;
  mode: "weight" | "price";
  onSetMode: (m: "weight" | "price") => void;
  parserSettings: CommandParserSettings;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  sessionTape: string[];
  onRemoveTapeEntry: (q: string) => void;
  onClearTape: () => void;
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  onSave: () => void;
  /** Log the current line onto the session tape without bookmarking it. */
  onLogSession: () => void;
  /** Expand a `#template` reference in the query; returns true when it did. */
  onExpandTemplate: () => boolean;
  /** Open the private, local activity/insights sheet. */
  onOpenInsights: () => void;
  /** Open the "what's new" changelog sheet. */
  onOpenChangelog: () => void;
  /** Copy a clean, paste-ready text summary of the current result. */
  onCopySummary: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onSuggest: (item: CommandSuggestionItem) => void;
  onCompareCurrent: () => void;
  /** Save the current comparison as a set in the Saved library. */
  onSaveComparison: () => void;
  onAddCompare: (input: CalculationInput, result: CalculationResult) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onAddToProject: () => void;
  onLoadInput: (input: CalculationInput, options?: { stripLength?: boolean }) => void;
  /** Toggle a saved entry's length-parametric flag (null clears it). */
  onSetSavedVariable: (id: string, variable: "length" | null) => void;
  onRemoveSaved: (id: string) => void;
  /** Share a saved entry as a template link (?q= URL). */
  onShareSaved: (input: CalculationInput) => void;
  onCreateProject: (name: string) => Project;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onSetProjectStatus: (id: string, status: ProjectStatus) => void;
}
