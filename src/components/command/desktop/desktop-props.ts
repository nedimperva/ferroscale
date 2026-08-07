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
import type { Project } from "@/hooks/useProjects";

export type DeskView = "calc" | "saved" | "projects" | "compare" | "settings";

export interface CommandDesktopProps {
  /** Below 1024: one column, no side rail, tighter chrome. */
  compact: boolean;
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
  /** Turn everything on the tape into a project, in one action. */
  onSaveSessionAsProject: () => void;
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  onSave: () => void;
  /** Log the current line onto the session tape without bookmarking it. */
  onLogSession: () => void;
  /** Copy a clean, paste-ready text summary of the current result. */
  onCopySummary: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onSuggest: (item: CommandSuggestionItem) => void;
  onCompareCurrent: () => void;
  onAddCompare: (input: CalculationInput, result: CalculationResult) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onAddToProject: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onCreateProject: (name: string) => Project;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
  /** True when the line in the bar is already bookmarked (Save is a toggle). */
  currentSaved: boolean;
  /** Open the grammar + shortcuts cheat sheet (the `?` key). */
  onOpenHelp: () => void;
  onLoadSaved: (entry: SavedEntry) => void;
  onRemoveSaved: (entry: SavedEntry) => void;
  onRemoveSavedMany: (entries: SavedEntry[]) => void;
  onAddCompareSaved: (entry: SavedEntry) => void;
  onDuplicateSaved: (entry: SavedEntry) => void;
  onTogglePinSaved: (entry: SavedEntry) => void;
  onEditSaved: (entry: SavedEntry) => void;
  /** Undefined while the bar has no complete calculation to fold in. */
  onAddPartSaved?: (entry: SavedEntry) => void;
  onRemovePartSaved: (entry: SavedEntry, partId: string) => void;
}
