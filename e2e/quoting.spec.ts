import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * The quoting layer: per-grade rates, margin on top of cost, and turning a
 * session into a project.
 */

async function typeQuery(page: Page, query: string) {
  await page.getByLabel("FerroScale Command query").click();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByText("WAITING")).toBeVisible();
  await page.getByLabel("FerroScale Command query").pressSequentially(query, { delay: 5 });
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
}

const openSettings = (page: Page) => page.getByRole("button", { name: "Settings" }).click();
/** The breakdown's Rate row — what the line was actually priced at. */
const rateRow = (page: Page) =>
  page.locator("div", { has: page.getByText("Rate", { exact: true }) }).last().locator("span").last();
const gotoCalculator = (page: Page) => page.getByRole("button", { name: "Calculator" }).click();

test.describe("Price book", () => {
  test("a grade priced in the book overrides the default rate", async ({ page }) => {
    await page.goto("/en");

    // Baseline: stainless is priced with the single default rate — the bug.
    await typeQuery(page, "rnd20 6m x2 304 ");
    await expect(rateRow(page)).toHaveText("€ 1.20/kg");

    await openSettings(page);
    await page.getByRole("button", { name: "+ Price a grade" }).click();
    await page.getByLabel("Grade to add to the price book").selectOption("stainless-304");
    await page.getByLabel("Rate for 304").fill("5");

    await gotoCalculator(page);
    await typeQuery(page, "rnd20 6m x2 304 ");
    await expect(rateRow(page)).toHaveText("€ 5.00/kg");

    // Steel keeps the default rate — the book is per grade, not global.
    await typeQuery(page, "rnd20 6m x2 s235 ");
    await expect(rateRow(page)).toHaveText("€ 1.20/kg");
  });

  test("an inline rate still beats the book", async ({ page }) => {
    await page.goto("/en");
    await openSettings(page);
    await page.getByRole("button", { name: "+ Price a grade" }).click();
    await page.getByLabel("Grade to add to the price book").selectOption("stainless-304");
    await page.getByLabel("Rate for 304").fill("5");

    await gotoCalculator(page);
    await typeQuery(page, "rnd20 6m x2 304 @1/kg ");
    // The line's own rate wins over the book's €5.
    await expect(rateRow(page)).toHaveText("€ 1.00/kg");
  });
});

test.describe("Margin", () => {
  test("adds a sell price to the breakdown without touching cost", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("Total cost", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Sell price/)).toHaveCount(0);

    await openSettings(page);
    await page.getByLabel("MARGIN ON COST").fill("20");
    await gotoCalculator(page);

    await expect(page.getByText("Sell price (+20%)")).toBeVisible();
    // Demo query costs € 286.44 → € 343.73 at 20%.
    await expect(page.getByText("€ 343.73")).toBeVisible();
    await expect(page.getByText("€ 286.44").first()).toBeVisible();
  });
});

test.describe("Session", () => {
  test("becomes a project in one action", async ({ page }) => {
    await page.goto("/en");
    for (const query of ["hea120 6m x2 ", "shs40x40x3 4m x10 "]) {
      await typeQuery(page, query);
      await page.keyboard.press("Enter");
    }

    await page.getByRole("button", { name: "SAVE AS PROJECT" }).click();
    await expect(page.getByText(/lines saved to Session/)).toBeVisible();

    await page.getByRole("button", { name: /^Projects\s*1$/ }).click();
    await expect(page.getByText(/^Session /)).toBeVisible();
    // Every logged line came across, in one gesture.
    await expect(page.getByText(/^[2-9] items$/)).toBeVisible();
  });
});
