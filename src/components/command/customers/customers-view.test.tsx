// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import type { Customer } from "@/hooks/useCustomers";
import type { Project } from "@/hooks/useProjects";
import messages from "../../../../messages/en.json";
import { CustomersView } from "./customers-view";
import type { CustomerActions } from "./customer-actions";

const STAMP = "2026-01-01T00:00:00.000Z";

function customer(id: string, name: string, extra: Partial<Customer> = {}): Customer {
  return { id, name, createdAt: STAMP, updatedAt: STAMP, ...extra };
}

function job(id: string, name: string, customerId: string, extra: Partial<Project> = {}): Project {
  return { id, name, customerId, client: "x", createdAt: STAMP, updatedAt: STAMP, calculations: [], ...extra };
}

const CUSTOMERS = [
  customer("c1", "Marko Group", { phone: "+387 61", marginPercent: 14 }),
  customer("c2", "Bosna Steel"),
  customer("c3", "Delić Trans", { archivedAt: STAMP }),
];
const PROJECTS = [
  job("p1", "Balustrade", "c1", { status: "progress" }),
  job("p2", "Stair treads", "c1", { status: "done" }),
];

function setup(initialId: string | null = null) {
  const actions: CustomerActions = {
    onCreate: vi.fn((draft) => customer("new", draft.name)),
    onUpdate: vi.fn(),
    onSetArchived: vi.fn(),
    onDelete: vi.fn(),
    onNewProject: vi.fn(),
  };
  const onOpenProject = vi.fn();
  function Host() {
    const [selected, setSelected] = useState<string | null>(initialId);
    return (
      <CustomersView
        customers={CUSTOMERS}
        projects={PROJECTS}
        marginPercent={10}
        actions={actions}
        selectedId={selected}
        onSelect={setSelected}
        onOpenProject={onOpenProject}
      />
    );
  }
  const user = userEvent.setup({ delay: null });
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Host />
    </NextIntlClientProvider>,
  );
  return { user, actions, onOpenProject };
}

describe("CustomersView", () => {
  afterEach(cleanup);

  it("lists active customers by name with their jobs and open count", () => {
    setup();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector("span span")?.textContent)).toEqual(["Bosna Steel", "Marko Group"]);
    expect(within(rows[1]).getByText("2 jobs")).toBeTruthy();
    expect(within(rows[1]).getByText("1 open")).toBeTruthy();
    expect(screen.getByText("Select a customer or add a new one.")).toBeTruthy();
  });

  it("switches to archived customers", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Archived" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Delić Trans")).toBeTruthy();
  });

  it("opens a customer, saves a field on blur and opens a job", async () => {
    const { user, actions, onOpenProject } = setup();
    await user.click(screen.getByText("Marko Group"));
    expect(screen.getByText("14%")).toBeTruthy();

    const phone = screen.getByDisplayValue("+387 61");
    await user.clear(phone);
    await user.type(phone, "+387 61 555");
    expect(actions.onUpdate).not.toHaveBeenCalled();
    await user.tab();
    expect(actions.onUpdate).toHaveBeenCalledWith("c1", { phone: "+387 61 555" });

    await user.click(screen.getByRole("button", { name: "Raise margin" }));
    expect(actions.onUpdate).toHaveBeenCalledWith("c1", { marginPercent: 15 });

    await user.click(screen.getByRole("button", { name: "Open Balustrade" }));
    expect(onOpenProject).toHaveBeenCalledWith("p1");
  });

  it("only lets a customer without jobs be deleted", async () => {
    const { user, actions } = setup("c1");
    const blocked = screen.getByRole("button", { name: "Delete customer" });
    expect((blocked as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Has 2 jobs. Archive instead.")).toBeTruthy();

    await user.click(screen.getByText("Bosna Steel"));
    await user.click(screen.getByRole("button", { name: "Delete customer" }));
    expect(actions.onDelete).toHaveBeenCalledWith("c2");
  });

  it("adds a customer and opens it", async () => {
    const { user, actions } = setup();
    await user.click(screen.getByRole("button", { name: "New customer" }));
    expect(actions.onCreate).toHaveBeenCalledWith({ name: "New customer" });
  });
});
