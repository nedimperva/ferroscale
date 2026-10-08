// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import messages from "../../../../messages/en.json";
import { NewProjectDialog } from "./new-project-dialog";
import { dueDateFromToday, suggestProjectName } from "./new-project";

const STAMP = "2026-01-01T00:00:00.000Z";
const CUSTOMERS: Customer[] = [
  { id: "c1", name: "Marko Group", marginPercent: 14, createdAt: STAMP, updatedAt: STAMP },
  { id: "c2", name: "Bosna Steel", createdAt: STAMP, updatedAt: STAMP },
];
const PROJECTS: Project[] = [
  { id: "p1", name: "Gate frame", client: "Bosna Steel", customerId: "c2", createdAt: STAMP, updatedAt: STAMP, calculations: [] },
];
const RAILING = {
  id: "a1",
  name: "Railing",
  parts: [
    {
      id: "pt1",
      name: "post",
      input: { quantity: 2 } as unknown as CalculationInput,
      result: { profileLabel: "SHS", totalWeightKg: 10, grandTotalAmount: 100, currency: "EUR" } as unknown as CalculationResult,
    },
  ],
} as unknown as SavedEntry;

function setup(extra: Partial<Parameters<typeof NewProjectDialog>[0]> = {}) {
  const props = {
    projects: PROJECTS,
    customers: CUSTOMERS,
    assemblies: [RAILING],
    marginPercent: 10,
    currencySymbol: "€",
    parseQuery: vi.fn((q: string) =>
      q.startsWith("bad")
        ? null
        : {
            input: { quantity: 1 } as unknown as CalculationInput,
            result: { profileLabel: q, totalWeightKg: 1, grandTotalAmount: 1, currency: "EUR" } as unknown as CalculationResult,
          },
    ),
    onCreateCustomer: vi.fn((name: string) => ({ id: "new-c", name, createdAt: STAMP, updatedAt: STAMP })),
    onCreate: vi.fn(),
    onClose: vi.fn(),
    ...extra,
  };
  const user = userEvent.setup({ delay: null });
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NewProjectDialog {...props} />
    </NextIntlClientProvider>,
  );
  return { user, ...props };
}

describe("NewProjectDialog", () => {
  afterEach(cleanup);

  it("starts blank: name, an existing customer and a due date", async () => {
    const { user, onCreate } = setup();
    expect(screen.queryByRole("button", { name: "Create project" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Blank/ }));

    await user.type(screen.getByLabelText("Customer"), "mark");
    await user.click(screen.getByRole("button", { name: /^Marko Group/ }));
    // The name follows the customer until it is typed over.
    expect(screen.getByPlaceholderText("Project name")).toHaveProperty("value", "Marko Group");
    expect(screen.getByText("Margin 14%")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "1 week" }));
    await user.clear(screen.getByPlaceholderText("Project name"));
    await user.type(screen.getByPlaceholderText("Project name"), "Balcony railing");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onCreate).toHaveBeenCalledWith({
      name: "Balcony railing",
      customerId: "c1",
      dueDate: dueDateFromToday(7),
      start: { kind: "blank" },
    });
  });

  it("adds a customer that does not exist yet", async () => {
    const { user, onCreateCustomer, onCreate } = setup();
    await user.click(screen.getByRole("button", { name: /^Blank/ }));
    await user.type(screen.getByLabelText("Customer"), "Delić Trans");
    await user.click(screen.getByRole("button", { name: "+ Add “Delić Trans” as new customer" }));
    expect(onCreateCustomer).toHaveBeenCalledWith("Delić Trans");
    await user.click(screen.getByRole("button", { name: "No date" }));
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Delić Trans", customerId: "new-c", dueDate: undefined }),
    );
  });

  it("scales an assembly and names the job after it", async () => {
    const { user, onCreate } = setup({ initialCustomerId: "c2" });
    await user.click(screen.getByRole("button", { name: /^From assembly/ }));
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("button", { name: "More" }));
    // 100 × 3, at the shop's 10% since Bosna Steel has no margin of its own.
    expect(screen.getByText("€ 330.00")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Railing, Bosna Steel",
        customerId: "c2",
        start: { kind: "assembly", entry: RAILING, multiplier: 3 },
      }),
    );
  });

  it("copies a job for the same customer by default", async () => {
    const { user, onCreate } = setup();
    await user.click(screen.getByRole("button", { name: /^Copy a past job/ }));
    expect((screen.getByRole("button", { name: "Create project" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: /^Gate frame/ }));
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Gate frame, Bosna Steel", customerId: "c2", start: { kind: "copy", projectId: "p1" } }),
    );
  });

  it("imports the lines it can read and says how many it could not", async () => {
    const { user, onCreate } = setup();
    await user.click(screen.getByRole("button", { name: /^Import list/ }));
    await user.type(screen.getByLabelText("Bar list"), "SHS 40x40x3, 2400, 12{enter}bad line{enter}hea120 6m x2");
    expect(screen.getByText("2 bars recognised · 1 line not read")).toBeTruthy();
    await user.type(screen.getByPlaceholderText("Project name"), "Mezzanine");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    const request = vi.mocked(onCreate).mock.calls[0][0];
    expect(request.start.kind).toBe("import");
    expect(request.start.items).toHaveLength(2);
  });
});

describe("suggestProjectName", () => {
  it("leads with what it is, then who it is for", () => {
    expect(suggestProjectName("assembly", "Railing", "Kovač")).toBe("Railing, Kovač");
    expect(suggestProjectName("blank", "ignored", "Kovač")).toBe("Kovač");
    expect(suggestProjectName("import", undefined, undefined)).toBe("");
  });
});
