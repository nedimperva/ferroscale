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
/** Settings is grouped now — the price book is its own pane in the rail. */
async function openPriceBook(page: Page) {
  await openSettings(page);
  await page.getByRole("button", { name: "Price book" }).click();
}
/** The breakdown's Rate row — what the line was actually priced at. */
const rateRow = (page: Page) => page.locator('[data-row="rate"] span').last();
const gotoCalculator = (page: Page) => page.getByRole("button", { name: "Calculator" }).click();

test.describe("Price book", () => {
  test("a grade priced in the book overrides the default rate", async ({ page }) => {
    await page.goto("/en");

    // Baseline: stainless is priced with the single default rate — the bug.
    await typeQuery(page, "rnd20 6m x2 304 ");
    await expect(rateRow(page)).toHaveText("€ 1.20/kg");

    await openPriceBook(page);
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
    await openPriceBook(page);
    await page.getByRole("button", { name: "+ Price a grade" }).click();
    await page.getByLabel("Grade to add to the price book").selectOption("stainless-304");
    await page.getByLabel("Rate for 304").fill("5");

    await gotoCalculator(page);
    await typeQuery(page, "rnd20 6m x2 304 @1/kg ");
    // The line's own rate wins over the book's €5.
    await expect(rateRow(page)).toHaveText("€ 1.00/kg");
  });
});

test.describe("Desktop fold", () => {
  test("the glance row shows four cells that agree with the breakdown", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    // kg/m appears in the glance row and again in the breakdown — same number.
    await expect(page.getByText("19.89 kg/m").first()).toBeVisible();
    await expect(page.getByText("238.7 kg").first()).toBeVisible();
  });

  test("+ another item starts a second item from the desktop action row", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    await page.getByRole("button", { name: "+ another item" }).click();
    // Not typeQuery: that helper presses ⌘K first, which would clear the line
    // the button just extended.
    await page
      .getByLabel("FerroScale Command query")
      .pressSequentially("ipe200 4m x3 ", { delay: 5 });
    await expect(page.getByRole("list", { name: "Assembly parts" }).getByRole("listitem")).toHaveCount(2);
  });
});

test.describe("Session rail", () => {
  test("a wider currency never wraps the unit off its number", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "ferroscale-quick-history",
        JSON.stringify(["hea120 6m x4", "hea120 6m x2"]),
      );
    });
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // KM (BAM) is two characters where € is one; the columns were fixed-width,
    // so the unit dropped to a second line as soon as the value outgrew them.
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "BAM", exact: true }).click();
    await page.getByRole("button", { name: "Calculator" }).click();
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();

    const wrapped = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll("span").forEach((el) => {
        const text = (el.textContent || "").trim();
        if (!/^KM\s|\bkg$/.test(text) || !el.className.includes("font-mono")) return;
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 16;
        if (el.getBoundingClientRect().height > lineHeight * 1.6) bad.push(text);
      });
      return bad;
    });
    expect(wrapped).toEqual([]);
  });
});

test.describe("Mass tolerance", () => {
  test("a band appears under the weight once a tolerance is set", async ({ page }) => {
    await page.goto("/en");
    await openSettings(page);
    await page.getByRole("button", { name: "Calculation" }).click();
    await page.getByLabel("Mass tolerance", { exact: true }).fill("4");

    await gotoCalculator(page);
    await typeQuery(page, "hea120 6m x2 ");
    // The breakdown carries the range on every viewport...
    await expect(page.getByText(/Mass band ±4%/)).toBeVisible();
    await expect(page.getByText("229.15 – 248.25 kg")).toBeVisible();

    // ...and the hero gains the band when weight is the headline metric.
    await page.getByRole("button", { name: "WEIGHT" }).click();
    await expect(page.getByText(/±4% · 229\.15 – 248\.25 kg/)).toBeVisible();
  });

  test("no band at all until one is asked for", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    await expect(page.getByText(/Mass band/)).toHaveCount(0);
  });
});

test.describe("Margin", () => {
  test("adds a sell price to the breakdown without touching cost", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("Total cost", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Sell price/)).toHaveCount(0);

    await openSettings(page);
    await page.getByLabel("Margin", { exact: true }).fill("20");
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
    await page.getByRole("button", { name: /^Open project Session / }).click();
    // Every logged line came across, in one gesture.
    await expect(page.getByText(/^[2-9] items$/)).toBeVisible();
  });
});

test.describe("Assemblies", () => {
  test("a saved entry can hold several parts and sums them", async ({ page }) => {
    await page.goto("/en");

    // Save the first line, then fold a second one into it as a part.
    await typeQuery(page, "hea120 6m x2 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    await typeQuery(page, "shs40x40x3 4m x10 ");
    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    await page.getByRole("button", { name: "HEA 120", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add the current line as a part" }).click();

    // The row is now an assembly: two parts, summed — and it moved tabs, which
    // the emptied Parts tab says out loud rather than showing a blank list.
    await page.getByRole("button", { name: /^Show Assemblies/ }).click();
    await expect(page.getByText("assembly · 2 parts")).toBeVisible();
    await page.getByRole("button", { name: "Card view" }).click();
    await page.getByRole("button", { name: "Show details" }).click();
    // The parts list is open: each part can be taken back out of the assembly.
    await expect(page.getByRole("button", { name: /from this assembly$/ })).toHaveCount(2);
    await expect(page.getByText("SHS 40×40×3").first()).toBeVisible();
    // 238.7 kg + 139.42 kg = 378.12 kg
    await expect(page.getByText("378.12 kg").first()).toBeVisible();
  });

  test("Use restores every part, not just the first", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 + ipe200 4m x3 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    // The surface opens on Assemblies: it is the only tab with anything in it.
    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    await page.getByRole("button", { name: /^Load / }).first().click();

    // Both items come back on the line — restoring only the entry's own input
    // dropped everything after the first part.
    await expect(page.getByRole("list", { name: "Assembly parts" }).getByRole("listitem")).toHaveCount(2);
  });

  test("a saved part goes into a project from its row menu", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    await page.getByRole("button", { name: "HEA 120", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add to project" }).click();

    await page.getByPlaceholder("New project name...").fill("Mezzanine");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await page.getByRole("button", { name: /^Projects\s*1$/ }).click();
    await page.getByRole("button", { name: /^Open project Mezzanine/ }).click();
    await expect(page.getByText("HEA 120").first()).toBeVisible();
    await expect(page.getByText(/^1 item$/)).toBeVisible();
  });

  test("a paint rate and a line note sit on the project", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    await page.getByRole("button", { name: "HEA 120", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add to project" }).click();
    await page.getByPlaceholder("New project name...").fill("Gate");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await page.getByRole("button", { name: /^Projects\s*1$/ }).click();
    await page.getByRole("button", { name: /^Open project Gate/ }).click();

    await page.getByLabel("Note for HEA 120").fill("posts");
    await page.getByRole("button", { name: "+ Finish" }).click();
    await page.getByLabel("Price · Finish").fill("8");
    await page.getByLabel("Price · Finish").blur();
    await expect(page.getByLabel("Note for HEA 120")).toHaveValue("posts");
    await expect(page.getByText(/^Paint$/)).toBeVisible();
    await expect(page.getByText("Surface", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "+ Primer" }).click();
    await expect(page.getByText("Primer", { exact: true })).toBeVisible();
  });
});

test.describe("Printable quote", () => {
  test("prints the project's lines, priced with the margin", async ({ page }) => {
    await page.goto("/en");
    for (const query of ["hea120 6m x2 ", "shs40x40x3 4m x10 "]) {
      await typeQuery(page, query);
      await page.keyboard.press("Enter");
    }
    await page.getByRole("button", { name: "SAVE AS PROJECT" }).click();

    await openSettings(page);
    await page.getByLabel("Margin", { exact: true }).fill("15");

    await page.getByRole("button", { name: /^Projects/ }).click();
    await page.getByRole("button", { name: /^Open project Session / }).click();
    // Stub the print dialog: what matters is the document it would print.
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page.getByRole("button", { name: "Quote", exact: true }).click();

    const quote = page.locator(".fs-print");
    await expect(quote).toContainText("Quote");
    await expect(quote).toContainText("HEA 120");
    await expect(quote).toContainText("SHS 40x40x3");
    // 286.44 + 167.30 = 453.74 cost → 521.80 with 15% margin.
    await expect(quote).toContainText("€ 521.80");

    // Under print media the app is hidden and only the quote remains.
    await page.emulateMedia({ media: "print" });
    await expect(quote).toBeVisible();
    await expect(page.getByRole("button", { name: "Calculator" })).toBeHidden();
  });
});
