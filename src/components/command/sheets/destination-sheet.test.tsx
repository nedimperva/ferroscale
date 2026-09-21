// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import messages from "../../../../messages/en.json";
import { DestinationSheet, type DestinationSubject } from "./destination-sheet";

const LINE: DestinationSubject = {
  kind: "line",
  label: "hea120 6m x2",
  meta: "208.78 kg",
  glyph: ">_",
  defaultName: "HEA 120",
};

function project(id: string, name: string, updatedAt: string): Project {
  return {
    id,
    name,
    createdAt: updatedAt,
    updatedAt,
    calculations: [],
  } as Project;
}

function entry(id: string, name: string, updatedAt: string, parts = 1): SavedEntry {
  return {
    id,
    name,
    timestamp: updatedAt,
    updatedAt,
    useCount: 0,
    parts: Array.from({ length: parts }, (_, i) => ({ id: `${id}-${i}` })),
    normalizedProfile: { shortLabel: "HEA 120" },
  } as unknown as SavedEntry;
}

function setup(overrides: Partial<Parameters<typeof DestinationSheet>[0]> = {}) {
  const handlers = {
    onSaveNew: vi.fn(),
    onAppendTo: vi.fn(),
    onAddToProject: vi.fn(),
    onCreateProject: vi.fn((name: string) => project("new", name, "2026-03-01T00:00:00.000Z")),
    onClose: vi.fn(),
  };
  const user = userEvent.setup({ delay: null });
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DestinationSheet
        subject={LINE}
        entries={[
          entry("e1", "Railing bay", "2026-02-01T00:00:00.000Z", 3),
          entry("e2", "Post plate", "2026-01-01T00:00:00.000Z"),
        ]}
        projects={[
          project("p1", "Gate job", "2026-02-10T00:00:00.000Z"),
          project("p2", "Fence run", "2026-02-20T00:00:00.000Z"),
        ]}
        {...handlers}
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
  return { user, ...handlers };
}

function rows() {
  return screen.getAllByRole("button").filter((el) => el.dataset.row !== undefined);
}

/** The name each row shows, in the order the list draws them. */
function rowNames() {
  return rows().map((el) => el.querySelector("span span")?.textContent ?? "");
}

describe("DestinationSheet", () => {
  // The suite runs without vitest globals, so auto-cleanup is not registered
  // and two renders would otherwise share one document.
  afterEach(cleanup);

  beforeEach(() => {
    if (!("randomUUID" in crypto)) {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: () => `test-${Math.random().toString(16).slice(2)}`,
      });
    }
  });

  it("lists every destination in one flat list, projects first, newest first", () => {
    setup();
    expect(rowNames()).toEqual(["Fence run", "Gate job", "Railing bay", "Post plate"]);
  });

  it("adds to a project in a single press", async () => {
    const { user, onAddToProject } = setup();
    await user.click(screen.getByText("Gate job"));
    expect(onAddToProject).toHaveBeenCalledWith("p1", 1);
  });

  it("appends to a library entry in a single press", async () => {
    const { user, onAppendTo } = setup();
    await user.click(screen.getByText("Railing bay"));
    expect(onAppendTo).toHaveBeenCalledWith("e1", 1);
  });

  it("filters projects and library together", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Search projects and library…"), "ga");
    expect(rows()).toHaveLength(1);
    expect(rowNames()).toEqual(["Gate job"]);
  });

  it("drives the list from the search field with the arrow keys", async () => {
    const { user, onAddToProject } = setup();
    const search = screen.getByLabelText("Search projects and library…");
    await user.click(search);
    // Starts on the first row; one step down is the second project.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onAddToProject).toHaveBeenCalledWith("p1", 1);
  });

  it("does not run off the end of a list the search has shortened", async () => {
    const { user, onAddToProject, onAppendTo } = setup();
    const search = screen.getByLabelText("Search projects and library…");
    await user.click(search);
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    await user.type(search, "ga");
    await user.keyboard("{Enter}");
    expect(onAddToProject).toHaveBeenCalledWith("p1", 1);
    expect(onAppendTo).not.toHaveBeenCalled();
  });

  it("names a new project before creating it, then files into it", async () => {
    const { user, onCreateProject, onAddToProject } = setup();
    await user.click(screen.getByText("New project"));
    await user.type(screen.getByLabelText("New project"), "Balcony{Enter}");
    expect(onCreateProject).toHaveBeenCalledWith("Balcony");
    expect(onAddToProject).toHaveBeenCalledWith("new", 1);
  });

  it("saves to the library under the line's own name without retyping it", async () => {
    const { user, onSaveNew } = setup();
    await user.click(screen.getByText("Save to library"));
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSaveNew).toHaveBeenCalledWith("HEA 120", false);
  });

  it("saves a multi-cut line as one assembly", async () => {
    const { user, onSaveNew } = setup({ subject: { ...LINE, multi: true } });
    await user.click(screen.getByText("Save to library as one assembly"));
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSaveNew).toHaveBeenCalledWith("HEA 120", true);
  });

  it("offers no count for a live line, whose quantities are already on it", () => {
    setup();
    expect(screen.queryByLabelText("How many")).toBeNull();
  });

  it("takes several of a saved entry to one destination", async () => {
    const entrySubject: DestinationSubject = {
      kind: "entry",
      label: "Railing bay",
      meta: "",
      glyph: "RB",
      defaultName: "Railing bay",
      scalable: true,
    };
    const { user, onAddToProject } = setup({ subject: entrySubject });
    await user.click(screen.getByRole("button", { name: "×10" }));
    await user.click(screen.getByText("Gate job"));
    // Twelve railing bays is one press on the count and one on the job, not
    // twelve trips through the picker.
    expect(onAddToProject).toHaveBeenCalledWith("p1", 10);
  });

  it("carries the count into a library entry too", async () => {
    const entrySubject: DestinationSubject = {
      kind: "entry",
      label: "Post plate",
      meta: "",
      glyph: "PP",
      defaultName: "Post plate",
      scalable: true,
    };
    const { user, onAppendTo } = setup({ subject: entrySubject });
    await user.click(screen.getByRole("button", { name: "One more" }));
    await user.click(screen.getByRole("button", { name: "One more" }));
    await user.click(screen.getByText("Railing bay"));
    expect(onAppendTo).toHaveBeenCalledWith("e1", 3);
  });

  it("will not go below one", async () => {
    const entrySubject: DestinationSubject = {
      kind: "entry",
      label: "Post plate",
      meta: "",
      glyph: "PP",
      defaultName: "Post plate",
      scalable: true,
    };
    const { user, onAddToProject } = setup({ subject: entrySubject });
    await user.click(screen.getByRole("button", { name: "One fewer" }));
    await user.click(screen.getByRole("button", { name: "One fewer" }));
    await user.click(screen.getByText("Gate job"));
    expect(onAddToProject).toHaveBeenCalledWith("p1", 1);
  });

  it("offers no library-create row for an entry that is already in the library", () => {
    setup({ subject: { kind: "entry", label: "Railing bay", meta: "", glyph: "RB", defaultName: "Railing bay" } });
    expect(screen.queryByText("Save to library")).toBeNull();
    expect(screen.queryByText("New project")).not.toBeNull();
  });
});
