import { describe, it, expect } from "vitest";
import type { Project, ProjectStatus } from "@/hooks/useProjects";
import {
  ALL_PROJECTS,
  collectProjectClients,
  countProjects,
  filterSortProjects,
  matchesBucket,
  sameBucket,
} from "./query";

type ProjectSeed = {
  id: string;
  name: string;
  updatedAt: string;
  client?: string;
  status?: ProjectStatus;
  dueDate?: string;
  items?: Array<{ label: string; kg: number; amount: number }>;
};

function project(seed: ProjectSeed): Project {
  return {
    id: seed.id,
    name: seed.name,
    client: seed.client,
    status: seed.status,
    dueDate: seed.dueDate,
    createdAt: seed.updatedAt,
    updatedAt: seed.updatedAt,
    calculations: (seed.items ?? []).map((item, index) => ({
      id: `${seed.id}-${index}`,
      timestamp: seed.updatedAt,
      input: {} as Project["calculations"][number]["input"],
      result: {
        totalWeightKg: item.kg,
        grandTotalAmount: item.amount,
        currency: "EUR",
        profileLabel: item.label,
      } as Project["calculations"][number]["result"],
      normalizedProfile: {
        shortLabel: item.label,
      } as Project["calculations"][number]["normalizedProfile"],
    })),
  };
}

const PROJECTS: Project[] = [
  project({
    id: "hala",
    name: "Hala Vogošća",
    client: "Bosna Gradnja",
    updatedAt: "2026-08-10T10:00:00.000Z",
    dueDate: "2026-08-22",
    items: [{ label: "HEA 120", kg: 240, amount: 600 }],
  }),
  project({
    id: "ograda",
    name: "Ograda Ilidža",
    client: "Privatni",
    updatedAt: "2026-08-09T10:00:00.000Z",
  }),
  project({
    id: "stepeniste",
    name: "Stepenište Otoka",
    client: "Bosna Gradnja",
    updatedAt: "2026-08-11T10:00:00.000Z",
    dueDate: "2026-08-15",
    items: [{ label: "SHS 40×40×3", kg: 1187, amount: 2967.5 }],
  }),
  project({ id: "session", name: "Session — 4 Aug", updatedAt: "2026-08-04T10:00:00.000Z" }),
  project({
    id: "old",
    name: "Krov Hrasnica",
    client: "Bosna Gradnja",
    status: "archived",
    updatedAt: "2026-07-01T10:00:00.000Z",
  }),
];

const ids = (list: Project[]) => list.map((p) => p.id);

describe("filterSortProjects", () => {
  it("hides archived projects from every non-archived bucket", () => {
    expect(ids(filterSortProjects(PROJECTS))).not.toContain("old");
    expect(ids(filterSortProjects(PROJECTS, { bucket: { kind: "archived" } }))).toEqual(["old"]);
  });

  it("filters by client and by the unassigned bucket", () => {
    expect(
      ids(filterSortProjects(PROJECTS, { bucket: { kind: "client", client: "Bosna Gradnja" } })),
    ).toEqual(["stepeniste", "hala"]);
    expect(ids(filterSortProjects(PROJECTS, { bucket: { kind: "unassigned" } }))).toEqual([
      "session",
    ]);
  });

  it("searches name, client and item labels", () => {
    expect(ids(filterSortProjects(PROJECTS, { search: "ilidža" }))).toEqual(["ograda"]);
    expect(ids(filterSortProjects(PROJECTS, { search: "privatni" }))).toEqual(["ograda"]);
    expect(ids(filterSortProjects(PROJECTS, { search: "hea 120" }))).toEqual(["hala"]);
  });

  it("sorts by updated, name, weight and value", () => {
    expect(ids(filterSortProjects(PROJECTS, { sort: "updated" }))).toEqual([
      "stepeniste",
      "hala",
      "ograda",
      "session",
    ]);
    expect(ids(filterSortProjects(PROJECTS, { sort: "weight" }))[0]).toBe("stepeniste");
    expect(ids(filterSortProjects(PROJECTS, { sort: "value" }))[0]).toBe("stepeniste");
    expect(ids(filterSortProjects(PROJECTS, { sort: "name" }))[0]).toBe("hala");
  });

  it("sorts undated projects last when sorting by due date", () => {
    const sorted = ids(filterSortProjects(PROJECTS, { sort: "due" }));
    expect(sorted.slice(0, 2)).toEqual(["stepeniste", "hala"]);
    expect(sorted.slice(2).sort()).toEqual(["ograda", "session"]);
  });

  it("does not mutate the input array", () => {
    const input = [...PROJECTS];
    filterSortProjects(input, { sort: "name" });
    expect(ids(input)).toEqual(ids(PROJECTS));
  });
});

describe("collectProjectClients", () => {
  it("ranks clients by active project count, then alphabetically", () => {
    expect(collectProjectClients(PROJECTS)).toEqual([
      { client: "Bosna Gradnja", count: 2 },
      { client: "Privatni", count: 1 },
    ]);
  });

  it("ignores archived projects", () => {
    const archivedOnly = [project({ id: "x", name: "X", client: "Ghost", status: "archived", updatedAt: "2026-01-01T00:00:00.000Z" })];
    expect(collectProjectClients(archivedOnly)).toEqual([]);
  });
});

describe("countProjects", () => {
  it("splits active, archived and unassigned", () => {
    expect(countProjects(PROJECTS)).toEqual({ active: 4, archived: 1, unassigned: 1 });
  });
});

describe("bucket helpers", () => {
  it("matches a project against a bucket", () => {
    expect(matchesBucket(PROJECTS[0], ALL_PROJECTS)).toBe(true);
    expect(matchesBucket(PROJECTS[4], ALL_PROJECTS)).toBe(false);
    expect(matchesBucket(PROJECTS[4], { kind: "archived" })).toBe(true);
  });

  it("compares buckets including the client they name", () => {
    expect(sameBucket(ALL_PROJECTS, { kind: "all" })).toBe(true);
    expect(sameBucket({ kind: "client", client: "A" }, { kind: "client", client: "B" })).toBe(false);
    expect(sameBucket({ kind: "client", client: "A" }, { kind: "client", client: "A" })).toBe(true);
  });
});
