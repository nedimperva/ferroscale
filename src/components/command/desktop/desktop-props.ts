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
  onCopy: () => void;
  onCopyValue: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onSuggest: (item: CommandSuggestionItem) => void;
  onCompareCurrent: () => void;
  onAddCompare: (input: CalculationInput, result: CalculationResult) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onAddToProject: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onRemoveSaved: (id: string) => void;
  onCreateProject: (name: string) => Project;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
}
