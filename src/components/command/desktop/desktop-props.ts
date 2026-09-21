import type {
  CommandLine,
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
import type { ProjectActions } from "../projects/project-actions";

export type DeskView = "calc" | "saved" | "projects" | "compare" | "settings";

export interface CommandDesktopProps {
  /** Below 1024: one column, no side rail, tighter chrome. */
  compact: boolean;
  dark: boolean;
  onToggleTheme: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  /** The item under the caret — everything acts on this. */
  p: CommandParseResult;
  /** The whole `+`-joined line; identical to `[p]` when there is one item. */
  line: CommandLine;
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
  /** The full command history — the Parts surface's History tab. */
  history: string[];
  onLoadQuery: (query: string) => void;
  onRemoveTapeEntry: (q: string) => void;
  onClearTape: () => void;
  /** Turn everything on the tape into a project, in one action. */
  onSaveSessionAsProject: () => void;
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  /** Bookmark the line into the library — the ⌘S / Ctrl-S shortcut. */
  onSave: () => void;
  /** The one save control's primary: file into the current job, or bookmark. */
  onPrimarySave: () => void;
  /** Its caret: the full destination picker. */
  onOpenDestinations: () => void;
  /** The job being worked out of, which the primary action names. */
  currentProjectName: string | null;
  /** Log the current line onto the session tape without bookmarking it. */
  onLogSession: () => void;
  /**
   * False while the pricing rate is still the seeded placeholder, which the
   * hero uses to decide whether a currency figure can be the headline.
   */
  rateIsUserSupplied: boolean;
  /** Copy a clean, paste-ready text summary of the current result. */
  onCopySummary: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onSuggest: (item: CommandSuggestionItem) => void;
  onCompareCurrent: () => void;
  onAddCompare: (input: CalculationInput, result: CalculationResult) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onCreateProject: (name: string) => Project;
  /** Everything the Projects surface can do to a project. */
  projectActions: ProjectActions;
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
  onAddPartSaved?: (entry: SavedEntry) => void;
  /** False while the bar has no complete calculation for `onAddPartSaved`. */
  canAddCurrentLine?: boolean;
  /** Append parts to an entry from a typed cut. False when it does not parse. */
  onAddPartsByCommand?: (entry: SavedEntry, command: string) => boolean;
  onRemovePartSaved: (entry: SavedEntry, partId: string) => void;
  /** Open the project picker for a saved part or assembly. */
  onAddSavedToProject: (entry: SavedEntry) => void;
}
