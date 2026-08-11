import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * The Saved library: the card, the save toggle, undo, filtering, and the
 * promise that a saved calculation is always priced at today's rate.
 */

/** Type a query into the wide-desktop command line and wait for a live result. */
async function typeQuery(page: Page, query: string) {
  // Click first: it both waits for hydration and puts the caret in the line,
  // so the ⌘K that follows is guaranteed to reach the shell's handler.
  await page.getByLabel("FerroScale Command query").click();
  await page.keyboard.press("ControlOrMeta+k");
  // Wait for the line to actually clear before typing — otherwise the first
  // keystrokes race the clear and the demo query is what gets saved.
  await expect(page.getByText("WAITING")).toBeVisible();
  await page.getByLabel("FerroScale Command query").pressSequentially(query, { delay: 5 });
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
}

/** The result panel's Save toggle — `aria-pressed` tells it apart from the
 *  "Saved" workspace tab, which shares its name. */
const saveButton = (page: Page) =>
  page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]"));

/** The workspace tab, whose accessible name folds in the count ("Saved2"). */
const savedTab = (page: Page, count?: number) =>
  page.getByRole("button", { name: new RegExp(`^Saved\\s*${count ?? ""}$`) });

/** Saved cards — the dev overlay also has an "Open …" button, so match the
 *  card's own label ending. */
const savedCards = (page: Page) => page.getByRole("button", { name: /in the calculator$/ });

test.describe("Saved library", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
  });

  test("save is a toggle: the button reports the real state both ways", async ({ page }) => {
    await typeQuery(page, "ipe200 4m x3 ");
    await expect(saveButton(page)).toHaveAccessibleName("Save");

    await saveButton(page).click();
    await expect(saveButton(page)).toHaveAccessibleName("Saved");
    await expect(saveButton(page)).toHaveAttribute("aria-pressed", "true");

    // Pressing again removes it — it used to no-op and still say "Saved".
    await saveButton(page).click();
    await expect(saveButton(page)).toHaveAccessibleName("Save");
    await expect(page.getByText("Removed from saved")).toBeVisible();
  });

  test("a deleted entry comes back with Undo", async ({ page }) => {
    await typeQuery(page, "hea120 6m x2 ");
    await saveButton(page).click();
    await expect(savedTab(page, 1)).toBeVisible();

    await saveButton(page).click();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(saveButton(page)).toHaveAccessibleName("Saved");
  });

  test("the card shows the spec, the live totals and the rate it used", async ({ page }) => {
    await typeQuery(page, "shs40x40x3 4m x10 ");
    await saveButton(page).click();

    await savedTab(page, 1).click();
    const card = page.getByRole("button", { name: /^Open SHS 40×40×3/ });
    await expect(card).toBeVisible();
    // Spec line under the title, and the rate stated in the footer.
    await expect(card).toContainText("4 m × 10");
    await expect(page.getByText("@ €1.2/kg").first()).toBeVisible();
  });

  test("an entry saved at another rate is repriced, and says what it cost", async ({ page }) => {
    await typeQuery(page, "hea120 6m x2 @5/kg ");
    await saveButton(page).click();

    await savedTab(page, 1).click();
    // Repriced at today's 1.20/kg (286.44), with the saved total called out.
    await expect(page.getByText("€ 286.44").first()).toBeVisible();
    await expect(page.getByText(/was € 1,193.51/)).toBeVisible();
  });

  test("search and sort narrow the library", async ({ page }) => {
    for (const query of ["hea120 6m x2 ", "shs40x40x3 4m x10 ", "rnd20 3m x4 "]) {
      await typeQuery(page, query);
      await saveButton(page).click();
    }
    await savedTab(page, 3).click();
    await expect(savedCards(page)).toHaveCount(3);

    await page.getByPlaceholder("Search name, tag, profile…").fill("shs");
    await expect(savedCards(page)).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Open SHS 40×40×3/ })).toBeVisible();

    await page.getByPlaceholder("Search name, tag, profile…").fill("nothing here");
    await expect(page.getByText("No matches")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(savedCards(page)).toHaveCount(3);
  });

  test("renaming keeps the spec visible and makes the entry findable by name", async ({ page }) => {
    await typeQuery(page, "hea120 6m x2 ");
    await saveButton(page).click();
    await savedTab(page, 1).click();

    await page.getByRole("button", { name: "Rename, notes and tags" }).click();
    await page.getByLabel(/Name/).fill("Gate post");
    await page.getByRole("button", { name: "Save changes" }).click();

    const card = page.getByRole("button", { name: /^Open Gate post/ });
    await expect(card).toBeVisible();
    // The name overrides the title, the spec stays on the line below it.
    await expect(card).toContainText("HEA 120");
    await page.getByPlaceholder("Search name, tag, profile…").fill("gate");
    await expect(savedCards(page)).toHaveCount(1);
  });

  test("the empty state points at the shortcut that fills it", async ({ page }) => {
    await savedTab(page).click();
    await expect(page.getByText("Nothing saved yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /New calculation/ })).toBeVisible();
  });
});

test.describe("Share links", () => {
  test("carry the sender's pricing and announce that they changed it", async ({ page }) => {
    // A link built with a 5.00/kg rate must price the same for the recipient.
    await page.goto("/en?q=hea120+6m+x2&r=5&ru=kg&rb=weight&c=EUR");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.getByText("Pricing from the link applied")).toBeVisible();
    await expect(page.getByText("€ 1,193.51").first()).toBeVisible();
  });
});
