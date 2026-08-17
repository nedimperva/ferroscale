import { computeAggregates, isArchivedProject, type Project } from "@/hooks/useProjects";

/**
 * Search, client-filter and sort for the Projects surface. Pure and UI-free,
 * so the wide workspace and the mobile library sheet sift the same list the
 * same way — and so the behaviour can be tested without a DOM.
 */

export const PROJECT_SORTS = ["updated", "name", "weight", "value", "due"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

/**
 * The left rail is a single-select bucket, not a stack of filters: "Archived"
 * is a place you go, not a checkbox you add to a client. `all` means every
 * active project; a client id means that client's active projects.
 */
export type ProjectBucket =
  | { kind: "all" }
  | { kind: "archived" }
  | { kind: "unassigned" }
  | { kind: "client"; client: string };

export const ALL_PROJECTS: ProjectBucket = { kind: "all" };

export interface ProjectQuery {
  search?: string;
  bucket?: ProjectBucket;
  sort?: ProjectSort;
}

export interface ProjectClientBucket {
  /** "" for the unassigned bucket. */
  client: string;
  count: number;
}

function haystack(project: Project): string {
  return [
    project.name,
    project.client ?? "",
    project.description ?? "",
    ...project.calculations.map(
      (calc) => calc.templateName ?? calc.normalizedProfile?.shortLabel ?? calc.result.profileLabel,
    ),
  ]
    .join(" ")
    .toLowerCase();
}

function timeOf(value: string | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

export function matchesBucket(project: Project, bucket: ProjectBucket): boolean {
  const archived = isArchivedProject(project);
  switch (bucket.kind) {
    case "archived":
      return archived;
    case "all":
      return !archived;
    case "unassigned":
      return !archived && !project.client?.trim();
    case "client":
      return !archived && project.client?.trim() === bucket.client;
  }
}

export function sameBucket(a: ProjectBucket, b: ProjectBucket): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "client" && b.kind === "client") return a.client === b.client;
  return true;
}

/**
 * Every client in use among active projects, most projects first then
 * alphabetical — the order the rail lists them in. Archived projects are
 * deliberately excluded: a client whose only job shipped is not a live filter.
 */
export function collectProjectClients(projects: Project[]): ProjectClientBucket[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (isArchivedProject(project)) continue;
    const client = project.client?.trim();
    if (!client) continue;
    counts.set(client, (counts.get(client) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([client, count]) => ({ client, count }));
}

export interface ProjectCounts {
  active: number;
  archived: number;
  unassigned: number;
}

export function countProjects(projects: Project[]): ProjectCounts {
  let active = 0;
  let archived = 0;
  let unassigned = 0;
  for (const project of projects) {
    if (isArchivedProject(project)) {
      archived += 1;
      continue;
    }
    active += 1;
    if (!project.client?.trim()) unassigned += 1;
  }
  return { active, archived, unassigned };
}

const COMPARE: Record<ProjectSort, (a: Project, b: Project) => number> = {
  updated: (a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name),
  weight: (a, b) => computeAggregates(b).totalWeightKg - computeAggregates(a).totalWeightKg,
  value: (a, b) => computeAggregates(b).totalCost - computeAggregates(a).totalCost,
  // Projects without a due date sort last rather than first — an undated job
  // is not the most urgent one.
  due: (a, b) => (timeOf(a.dueDate) || Infinity) - (timeOf(b.dueDate) || Infinity),
};

export function filterSortProjects(projects: Project[], query: ProjectQuery = {}): Project[] {
  const bucket = query.bucket ?? ALL_PROJECTS;
  const search = query.search?.trim().toLowerCase() ?? "";
  const filtered = projects.filter((project) => {
    if (!matchesBucket(project, bucket)) return false;
    if (search && !haystack(project).includes(search)) return false;
    return true;
  });
  return filtered.sort(COMPARE[query.sort ?? "updated"]);
}
