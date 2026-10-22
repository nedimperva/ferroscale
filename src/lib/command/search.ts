import type { CompareItem } from "@/hooks/useCompare";
import type { Customer } from "@/hooks/useCustomers";
import type { PriceBookEntry } from "@/hooks/usePriceBook";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import { inputToQuery } from "@ferroscale/metal-core";
import { historyKey } from "./history";

/**
 * One search field over everything the user owns: the history lines, the
 * library parts, the projects, the customers, the catalogue sizes and the
 * settings they can jump to.
 *
 * Pure and synchronous on purpose — the caller holds the data and passes it
 * in, so the rules can be tested without a component and the phone sheet and
 * the desk rail read the same way.
 */

export type SearchResultKind = "line" | "part" | "project" | "customer" | "size" | "setting";

export interface SearchResult {
  kind: SearchResultKind;
  /** The primary label shown in the results list. */
  label: string;
  /** A secondary line — a detail under the label. May be empty. */
  detail: string;
  /** The text that goes back into the command bar when this result is chosen. */
  /** Empty for kinds that are not a command (projects, customers, settings). */
  query: string;
  /** Stable identity of the thing found, for keying and for acting on it. */
  id: string;
  /** Milliseconds since the epoch, when the thing has a time. 0 when it does not. */
  at: number;
}

export interface SearchInput {
  lines: string[];
  parts: SavedEntry[];
  projects: Project[];
  customers: Customer[];
  compare?: CompareItem[];
  priceBook?: PriceBookEntry[];
  /** Catalogue sizes to offer, e.g. "HEA 120". */
  sizes?: Array<{ label: string; query: string; detail?: string }>;
  /** Settings the user can jump to, e.g. { label: "VAT rate", id: "settings.vat" }. */
  settings?: Array<{ label: string; id: string; detail?: string }>;
}

export interface SearchResults {
  /** The results, best first. */
  items: SearchResult[];
  /** The query that was searched, trimmed. */
  term: string;
}

/** The order kinds fall back to when nothing else separates two results. */
const KIND_ORDER: readonly SearchResultKind[] = [
  "line",
  "part",
  "project",
  "customer",
  "size",
  "setting",
];

/** How many results the field shows before it stops. */
const DEFAULT_LIMIT = 40;

/** A result and the text it is matched against. */
interface Candidate {
  result: SearchResult;
  haystack: string;
}

function join(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function partCount(count: number): string {
  return `${count} part${count === 1 ? "" : "s"}`;
}

function lineCandidate(line: string): Candidate {
  return {
    result: { kind: "line", label: line, detail: "", query: line, id: line, at: 0 },
    haystack: line,
  };
}

/**
 * The line a compare row came from. A compare row is a stored calculation
 * rather than a command line, so it is rebuilt through the parser's own
 * inverse — the same way the library restores an entry.
 */
function compareQuery(item: CompareItem): string {
  try {
    return inputToQuery(item.input, "m");
  } catch {
    return "";
  }
}

function compareCandidate(item: CompareItem): Candidate {
  const query = compareQuery(item);
  return {
    result: {
      kind: "line",
      label: query,
      detail: "",
      query,
      id: item.id,
      at: Date.parse(item.timestamp) || 0,
    },
    haystack: query,
  };
}

function partCandidate(entry: SavedEntry): Candidate {
  const parts = entry.parts ?? [];
  return {
    result: {
      kind: "part",
      label: entry.name,
      detail: entry.category ?? partCount(parts.length),
      query: "",
      id: entry.id,
      at: Date.parse(entry.updatedAt) || 0,
    },
    haystack: join(entry.name, parts.map((part) => part.name).join(" ")),
  };
}

function projectCandidate(project: Project): Candidate {
  return {
    result: {
      kind: "project",
      label: project.name,
      detail: project.client ?? project.status ?? "",
      query: "",
      id: project.id,
      at: Date.parse(project.updatedAt) || Date.parse(project.createdAt) || 0,
    },
    haystack: join(project.name, project.client, project.category, project.status),
  };
}

function customerCandidate(customer: Customer): Candidate {
  return {
    result: {
      kind: "customer",
      label: customer.name,
      detail: customer.phone ?? customer.contact ?? "",
      query: "",
      id: customer.id,
      at: 0,
    },
    haystack: join(
      customer.name,
      customer.contact,
      customer.phone,
      customer.email,
      customer.notes,
    ),
  };
}

function sizeCandidate(size: { label: string; query: string; detail?: string }): Candidate {
  return {
    result: {
      kind: "size",
      label: size.label,
      detail: size.detail ?? "",
      query: size.query,
      id: size.label,
      at: 0,
    },
    haystack: join(size.label, size.detail),
  };
}

function settingCandidate(setting: { label: string; id: string; detail?: string }): Candidate {
  return {
    result: {
      kind: "setting",
      label: setting.label,
      detail: setting.detail ?? "",
      query: "",
      id: setting.id,
      at: 0,
    },
    haystack: join(setting.label, setting.detail),
  };
}

/**
 * Every word of the term must be in the haystack, in any order and case.
 * Spaces inside a size are ignored, so `40x40` finds `shs 40x40x3` — the same
 * rule the history filter uses.
 */
function matches(words: string[], haystack: string): boolean {
  const key = historyKey(haystack);
  const glued = key.replace(/ /g, "");
  return words.every((word) => key.includes(word) || glued.includes(word));
}

/**
 * Search everything the user owns from one term.
 *
 * The results come back best first: a label that starts with the term beats
 * one that merely holds it, then the newest thing, then the kind, then the
 * label — so the order never moves under the user's finger between two
 * searches that match the same set.
 */
export function searchEverything(
  input: SearchInput,
  term: string,
  limit = DEFAULT_LIMIT,
): SearchResults {
  const trimmed = term.trim();
  if (!trimmed) return { items: [], term: "" };

  const words = historyKey(trimmed).split(" ").filter(Boolean);
  if (words.length === 0) return { items: [], term: trimmed };

  const candidates: Candidate[] = [
    ...input.lines.map(lineCandidate),
    ...(input.compare ?? []).map(compareCandidate),
    ...input.parts.map(partCandidate),
    ...input.projects.map(projectCandidate),
    ...input.customers.map(customerCandidate),
    ...(input.sizes ?? []).map(sizeCandidate),
    ...(input.settings ?? []).map(settingCandidate),
  ];

  const prefix = historyKey(trimmed);
  const matched = candidates
    .filter((candidate) => matches(words, candidate.haystack))
    .sort((left, right) => {
      const startsLeft = historyKey(left.result.label).startsWith(prefix) ? 0 : 1;
      const startsRight = historyKey(right.result.label).startsWith(prefix) ? 0 : 1;
      if (startsLeft !== startsRight) return startsLeft - startsRight;
      if (left.result.at !== right.result.at) return right.result.at - left.result.at;
      const kindLeft = KIND_ORDER.indexOf(left.result.kind);
      const kindRight = KIND_ORDER.indexOf(right.result.kind);
      if (kindLeft !== kindRight) return kindLeft - kindRight;
      return left.result.label.localeCompare(right.result.label);
    });

  return {
    items: matched.slice(0, Math.max(0, limit)).map((candidate) => candidate.result),
    term: trimmed,
  };
}
