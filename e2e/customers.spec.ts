import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Customers: the records every typed client became, their own tab, and the
 * New project dialog that starts a job for one.
 */

const STAMP = "2026-01-01T00:00:00.000Z";

async function seedProjects(page: Page) {
  await page.addInitScript((stamp) => {
    if (localStorage.getItem("e2e-seeded")) return;
    localStorage.setItem("e2e-seeded", "1");
    localStorage.setItem(
      "ferroscale-projects-v2",
      JSON.stringify([
        { id: "p1", name: "Gate frame", client: "Hadžić d.o.o.", createdAt: stamp, updatedAt: stamp, calculations: [] },
        { id: "p2", name: "Fence panels", client: "hadžić d.o.o. ", status: "done", createdAt: stamp, updatedAt: stamp, calculations: [] },
      ]),
    );
  }, STAMP);
}

async function ready(page: Page) {
  await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
}

test.describe("Customers", () => {
  test("typed clients become one customer, with their jobs", async ({ page }) => {
    await seedProjects(page);
    await page.goto("/en/customers");
    await ready(page);
    // Two spellings of one client are one customer.
    await expect(page.getByRole("listitem")).toHaveCount(1);
    await page.getByText("Hadžić d.o.o.").first().click();
    await expect(page.getByText("2 jobs").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete customer" })).toBeDisabled();

    // A job opens on the Projects tab.
    await page.getByRole("button", { name: "Open Gate frame" }).click();
    await expect(page.getByRole("button", { name: "Show customer Hadžić d.o.o." })).toBeVisible();
  });

  test("a new job for a customer starts in the dialog with them filled in", async ({ page }) => {
    await seedProjects(page);
    await page.goto("/en/customers");
    await ready(page);
    await page.getByText("Hadžić d.o.o.").first().click();
    await page.getByRole("button", { name: "New project" }).last().click();

    const dialog = page.getByRole("dialog", { name: "New project" });
    await dialog.getByRole("button", { name: /^Blank/ }).click();
    await expect(dialog.getByText("Hadžić d.o.o.").first()).toBeVisible();
    await dialog.getByPlaceholder("Project name").fill("Canopy brackets");
    await dialog.getByRole("button", { name: "Create project" }).click();

    // It opens straight away, linked to the customer it was started from.
    await expect(page.getByText("Canopy brackets").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Show customer Hadžić d.o.o." })).toBeVisible();
  });

  test("a bar list imports into a new project", async ({ page }) => {
    await page.goto("/en/projects");
    await ready(page);
    await page.getByRole("button", { name: "New project" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New project" });
    await dialog.getByRole("button", { name: /^Import list/ }).click();
    await dialog.getByLabel("Bar list").fill("SHS 40x40x3, 2400, 12\nflat 100x8, 600, 4\nnot a bar");
    await expect(dialog.getByText("2 bars recognised · 1 line not read")).toBeVisible();
    await dialog.getByLabel("Customer").fill("Delić Trans");
    await dialog.getByRole("button", { name: "+ Add “Delić Trans” as new customer" }).click();
    await dialog.getByPlaceholder("Project name").fill("Canopy");
    await dialog.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByText(/^2 items$/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Show customer Delić Trans" })).toBeVisible();
  });
});

test.describe("Customers on the phone (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("/customers opens the Customers side of the library's Projects tab", async ({ page }) => {
    await seedProjects(page);
    await page.goto("/en/customers");
    await ready(page);
    await expect(page.getByRole("button", { name: "Customers", pressed: true })).toBeVisible();
    await page.getByText("Hadžić d.o.o.").first().click();
    await expect(page.getByText("All customers")).toBeVisible();
  });
});
