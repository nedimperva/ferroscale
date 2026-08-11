/**
 * The `>` palette: one input for the whole app.
 *
 * Typing `>` turns the command line into an action list — go somewhere, run
 * something, or open a saved entry or project by name. Every action already
 * exists as a function on one of the surfaces; this only gives them a name and
 * a place to be found, so a user who can type doesn't have to hunt for a
 * button. The matching and the item model are pure so both surfaces rank
 * identically and neither has to be mounted to test it.
 */

export type PaletteKind = "action" | "saved" | "project";

/** Where a palette action sends you, in each surface's own terms. */
export type PaletteTarget = "calc" | "saved" | "projects" | "compare" | "settings";

export interface PaletteItem {
  id: string;
  label: string;
  sub?: string;
  kind: PaletteKind;
  /** Extra words this item should match on, beyond its label. */
  keywords?: string;
  /** False when the action needs a finished calculation and there isn't one. */
  disabled?: boolean;
  run: () => void;
}

export interface PaletteHandlers {
  navigate: (target: PaletteTarget) => void;
  onNew: () => void;
  onSave: () => void;
  onCompare: () => void;
  onCopySummary: () => void;
  onShareLink: () => void;
  onOpenHelp: () => void;
  onToggleTheme: () => void;
  /** True when the line holds a finished calculation. */
  hasResult: boolean;
}

type PaletteT = (key: string, values?: Record<string, string | number>) => string;

export const PALETTE_PREFIX = ">";

/** A line that opens with `>` is an action, not a calculation. */
export function isPaletteQuery(query: string): boolean {
  return query.trimStart().startsWith(PALETTE_PREFIX);
}

/** What the user typed after the `>`. */
export function paletteTerm(query: string): string {
  const trimmed = query.trimStart();
  if (!trimmed.startsWith(PALETTE_PREFIX)) return "";
  return trimmed.slice(PALETTE_PREFIX.length).trim();
}

export function buildPaletteActions(t: PaletteT, h: PaletteHandlers): PaletteItem[] {
  const action = (
    id: string,
    run: () => void,
    options: { keywords?: string; needsResult?: boolean } = {},
  ): PaletteItem => ({
    id,
    label: t(`palette.action.${id}`),
    kind: "action",
    keywords: options.keywords,
    disabled: options.needsResult ? !h.hasResult : false,
    run,
  });

  return [
    action("newCalc", h.onNew, { keywords: "clear reset" }),
    action("save", h.onSave, { keywords: "bookmark", needsResult: true }),
    action("compare", h.onCompare, { needsResult: true }),
    action("copySummary", h.onCopySummary, { keywords: "clipboard", needsResult: true }),
    action("shareLink", h.onShareLink, { keywords: "url", needsResult: true }),
    action("goSaved", () => h.navigate("saved"), { keywords: "library" }),
    action("goProjects", () => h.navigate("projects"), { keywords: "jobs quotes" }),
    action("goCompare", () => h.navigate("compare")),
    action("goSettings", () => h.navigate("settings"), { keywords: "preferences rate vat" }),
    action("help", h.onOpenHelp, { keywords: "shortcuts grammar reference" }),
    action("toggleTheme", h.onToggleTheme, { keywords: "dark light" }),
  ];
}

/**
 * Score a candidate against the term. Higher is better; 0 means no match.
 * A prefix beats a word start beats a plain substring, so typing "sa" puts
 * "Save" above "Go to saved" above a saved entry called "Balustrade".
 */
function score(item: PaletteItem, term: string): number {
  if (!term) return 1;
  const hay = `${item.label} ${item.keywords ?? ""} ${item.sub ?? ""}`.toLowerCase();
  const label = item.label.toLowerCase();
  if (label.startsWith(term)) return 4;
  if (new RegExp(`\\b${escapeRegExp(term)}`).test(label)) return 3;
  if (label.includes(term)) return 2;
  if (hay.includes(term)) return 1;
  return 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const PALETTE_LIMIT = 8;

/**
 * Rank and cut. Every term word must match somewhere, so "sav bal" narrows
 * rather than widens; ties keep the caller's order, which is what puts actions
 * above the user's own entries when neither is a better match.
 */
export function filterPalette(
  items: PaletteItem[],
  term: string,
  limit: number = PALETTE_LIMIT,
): PaletteItem[] {
  const needle = term.trim().toLowerCase();
  const parts = needle ? needle.split(/\s+/) : [];

  const scored = items
    .map((item, index) => ({
      item,
      index,
      score: parts.length === 0 ? 1 : Math.min(...parts.map((part) => score(item, part))),
    }))
    .filter((row) => row.score > 0);

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map((row) => row.item);
}
