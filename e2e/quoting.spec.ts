import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * A share link carrying a live result — the app stopped seeding a demo query
 * when clean-slate onboarding landed, so a bare /en has nothing to measure.
 */
const DEMO_LINK = "/en?q=hea120+6m+x2";

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

/**
 * Settings is the first click after goto in several tests. Clicking before
 * React has hydrated lands on an inert button — the shell announces it is
 * interactive with html.app-ready (the boot splash's retire signal), so wait
 * for that, then for the settings view itself.
 */
const openSettings = async (page: Page) => {
  await page.waitForFunction(() =>
    document.documentElement.classList.contains("app-ready"),
  );
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByText("applies to every calculation on this device"),
  ).toBeVisible();
};
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
  test("the rail's ledger agrees with the headline", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    // kg/m in the equation line and in the weight ledger — the same number.
    await expect(page.getByText("19.89 kg/m").first()).toBeVisible();
    await expect(page.getByText("238.7 kg").first()).toBeVisible();
  });

  test("+ item starts a second item from the desktop action row", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    // Starting a second item lives in the overflow beside the save control —
    // the row itself is for the things done to a finished line.
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("button", { name: "+ item" }).click();
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
      // A returning visitor gets their last line back. This test used to get
      // that for free because the service worker's first install reloaded the
      // page, which made every first visit look like a second one.
      localStorage.setItem("ferroscale-onboarded", "1");
    });
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // KM (BAM) is two characters where € is one; the columns were fixed-width,
    // so the unit dropped to a second line as soon as the value outgrew them.
    // LIVE renders in SSR HTML, so it is not proof of hydration — wait for it.
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("app-ready"),
    );
    await page
      .getByRole("button", { name: "Settings" })
      .click();
    await expect(
      page.getByText("applies to every calculation on this device"),
    ).toBeVisible();
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
    await expect(page.getByText("229.15 – 248.25 kg", { exact: true })).toBeVisible();

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
    await page.goto(DEMO_LINK);
    // The ledger sheet carries weight and cost in one table — no tab to pick.
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

  test("is today's lines; your lines show what you use often, then the newest", async ({ page }) => {
    await page.addInitScript(() => {
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "ferroscale-quick-history",
        JSON.stringify(["hea120 6m x2", "upn100 3m x4", "shs40x40x3 4m"]),
      );
      localStorage.setItem(
        "ferroscale-quick-history-times-v1",
        JSON.stringify({
          "hea120 6m x2": Date.now(),
          "upn100 3m x4": tenDaysAgo,
          "shs40x40x3 4m": tenDaysAgo,
        }),
      );
      localStorage.setItem(
        "ferroscale-quick-history-counts-v1",
        JSON.stringify({ "upn100 3m x4": 3 }),
      );
    });
    await page.goto("/en");
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("app-ready"),
    );
    // The running total covers today alone.
    await expect(page.getByText("1 ITEM · RUNNING TOTAL")).toBeVisible();

    await page.getByRole("button", { name: "YOUR LINES" }).click();
    const often = page.getByRole("region", { name: "Often" });
    await expect(often).toContainText("upn100 3m x4");
    await expect(often).toContainText("×3");
    await expect(often).not.toContainText("hea120 6m x2");
    const recent = page.getByRole("region", { name: "Recent" });
    await expect(recent).toContainText("hea120 6m x2");
    await expect(recent).toContainText("shs40x40x3 4m");

    // Everything is one link away, by day and searchable.
    await page.getByRole("button", { name: "Everything, by day →" }).click();
    await expect(page.getByRole("region", { name: "Today" })).toContainText("hea120 6m x2");
    await expect(page.getByRole("region", { name: "Earlier" })).toContainText("shs40x40x3 4m");
    await page.getByLabel("Search history").fill("upn");
    await expect(page.getByRole("button", { name: /^shs40x40x3 4m/ })).toHaveCount(0);

    // A line goes back into the bar.
    await page.getByRole("button", { name: /^upn100 3m x4/ }).click();
    await expect(page.getByRole("dialog", { name: "Your lines" })).toHaveCount(0);
    await expect(page.getByText("127.17", { exact: true })).toBeVisible();
  });

  test("the tape's Clear empties today and keeps earlier days", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "ferroscale-quick-history",
        JSON.stringify(["hea120 6m x2", "upn100 3m x4"]),
      );
      localStorage.setItem(
        "ferroscale-quick-history-times-v1",
        JSON.stringify({
          "hea120 6m x2": Date.now(),
          "upn100 3m x4": Date.now() - 10 * 24 * 60 * 60 * 1000,
        }),
      );
    });
    await page.goto("/en");
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("app-ready"),
    );
    await page.getByRole("button", { name: "CLEAR", exact: true }).last().click();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("ferroscale-quick-history") ?? "[]")),
      )
      .toEqual(["upn100 3m x4"]);
  });

  test.describe("with nothing logged today", () => {
    const seedOldHistory = async (page: Page) => {
      await page.addInitScript(() => {
        localStorage.setItem("ferroscale-quick-history", JSON.stringify(["upn100 3m x4"]));
        localStorage.setItem(
          "ferroscale-quick-history-times-v1",
          JSON.stringify({ "upn100 3m x4": Date.now() - 3 * 24 * 60 * 60 * 1000 }),
        );
      });
    };

    test("the empty tape still leads to your lines", async ({ page }) => {
      await seedOldHistory(page);
      await page.goto("/en");
      await page.waitForFunction(() =>
        document.documentElement.classList.contains("app-ready"),
      );
      await page.getByRole("button", { name: "Your lines →" }).click();
      await expect(page.getByRole("region", { name: "Recent" })).toContainText("upn100 3m x4");
    });

    test.describe("on the phone", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("the session row stays, and opens your lines", async ({ page }) => {
        await seedOldHistory(page);
        await page.goto("/en");
        await page.waitForFunction(() =>
          document.documentElement.classList.contains("app-ready"),
        );
        await page.getByRole("button", { name: "Open the session tape" }).click();
        // The phone has no Recent list: older lines are under Everything, by day.
        await expect(page.getByRole("region", { name: "Recent" })).toHaveCount(0);
        await page.getByRole("button", { name: "Everything, by day →" }).click();
        await expect(page.getByRole("region", { name: "This week" })).toContainText("upn100 3m x4");
      });
    });
  });

  test.describe("on the phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("today's session reads like the tape, and Clear empties only today", async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          "ferroscale-quick-history",
          JSON.stringify(["hea120 6m x2", "upn100 3m x4"]),
        );
        localStorage.setItem(
          "ferroscale-quick-history-times-v1",
          JSON.stringify({
            "hea120 6m x2": Date.now(),
            "upn100 3m x4": Date.now() - 10 * 24 * 60 * 60 * 1000,
          }),
        );
      });
      await page.goto("/en");
      await page.waitForFunction(() =>
        document.documentElement.classList.contains("app-ready"),
      );
      await page.getByRole("button", { name: "Open the session tape" }).click();
      const today = page.getByRole("region", { name: "Today" });
      // The profile, its length × pieces and the weight, apart — as on the desk.
      await expect(today).toContainText("HEA 120");
      await expect(today).toContainText("6 m × 2");
      await expect(today).toContainText("238.7 kg");
      await expect(today).not.toContainText("UPN");

      await today.getByRole("button", { name: "CLEAR", exact: true }).click();
      await expect(today).toContainText("Nothing logged today");
      await page.getByRole("button", { name: "Everything, by day →" }).click();
      await expect(page.getByRole("region", { name: "Earlier" })).toContainText("upn100 3m x4");
    });
  });

  test("a line that finishes the one just logged replaces it", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m ");
    await page.keyboard.press("Enter");
    await page.getByLabel("FerroScale Command query").press("End");
    await page.getByLabel("FerroScale Command query").pressSequentially("x2 ", { delay: 5 });
    await page.keyboard.press("Enter");

    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("ferroscale-quick-history") ?? "[]")),
      )
      .toEqual(["hea120 6m x2"]);
  });
});

test.describe("Copying the answer", () => {
  test("a click on the headline figure copies it as one line", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(DEMO_LINK);
    await page.waitForFunction(() =>
      document.documentElement.classList.contains("app-ready"),
    );
    await page.getByRole("button", { name: /Click to copy the answer/ }).click();
    await expect(page.getByText("Answer copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^HEA 120 · .*6m × 2 pcs = 238\.7 kg · € /);
  });
  test.describe("on the phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("holding the figure copies; a tap still opens the breakdown", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(DEMO_LINK);
      await page.waitForFunction(() =>
        document.documentElement.classList.contains("app-ready"),
      );
      const hero = page.getByRole("button", { name: /Hold to copy the answer/ });
      const box = (await hero.boundingBox())!;
      await page.mouse.move(box.x + 40, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await expect(page.getByText("Answer copied")).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("238.7 kg");
      // The long press did not also open the sheet.
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await hero.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  });
});

test.describe("Assemblies", () => {
  test("the way into the library is offered before the library has anything in it", async ({ page }) => {
    await page.goto("/en/projects");
    // Hiding this until an assembly existed meant the feature vanished for
    // anyone who had not already used it, with nothing left to learn it from.
    await page.getByRole("button", { name: "New project" }).first().click();
    await page.getByRole("button", { name: /^From assembly/ }).click();
    await expect(page.getByText("No assemblies yet").first()).toBeVisible();
    await expect(page.getByText(/Save a line with several cuts/).first()).toBeVisible();
  });

  test("an assembly's labour and hardware are named where they are edited", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea140 3m + plt200x160x12 x2 ");
    await page.getByRole("button", { name: "Save somewhere else" }).click();
    await page.getByText("Save to library as one assembly").click();
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    // Editing is a button on the row, not a menu item behind a label that
    // named none of the fields a project inherits.
    await page.getByRole("button", { name: "Edit HEA 140 +1" }).click();
    await expect(page.getByRole("dialog", { name: "Edit assembly" })).toBeVisible();

    await page.getByLabel("Labour hours").fill("1.5");
    await page.getByRole("button", { name: "Add a cost line" }).click();
    await page.getByPlaceholder("New cost line").fill("8x M16 bolts");
    await page.locator('input[inputmode="decimal"]').last().fill("9.60");
    await page.getByRole("button", { name: "Save changes" }).click();

    // They survive the round trip, which is what a project will read.
    await page.getByRole("button", { name: "Edit HEA 140 +1" }).click();
    await expect(page.getByLabel("Labour hours")).toHaveValue("1.5");
    await expect(page.locator('input[value="8x M16 bolts"]')).toHaveCount(1);
  });

  test("a project can be started from a library assembly, once there is one", async ({ page }) => {
    // Save a two-cut line into the library as one assembly. (The button is
    // there before this too — the test above covers its empty state.)
    await page.goto("/en");
    await typeQuery(page, "hea140 3m + plt200x160x12 x2 ");
    await page.getByRole("button", { name: "Save somewhere else" }).click();
    // Named after the cut that leads it, not whichever one the caret was on.
    await page.getByText("Save to library as one assembly").click();
    await expect(page.getByLabel("Save to library as one assembly")).toHaveValue("HEA 140 +1");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    // Now it is offered as a starting point of the New project dialog.
    await page.goto("/en/projects");
    await page.getByRole("button", { name: "New project" }).first().click();
    await page.getByRole("button", { name: /^From assembly/ }).click();
    await expect(page.getByRole("button", { name: "HEA 140 +1" })).toBeVisible();
    await page.getByPlaceholder("Project name").fill("Warehouse mezzanine");
    await page.getByRole("button", { name: "Create project" }).click();

    // The project is named what was typed, and carries both cuts.
    await expect(page.getByText("Warehouse mezzanine").first()).toBeVisible();
    await expect(page.getByText(/^2 items$/).first()).toBeVisible();
  });

  test("a saved entry can hold several parts and sums them", async ({ page }) => {
    await page.goto("/en");

    // Save the first line, then fold a second one into it as a part.
    await typeQuery(page, "hea120 6m x2 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    await typeQuery(page, "shs40x40x3 4m x10 ");
    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    // The ⋯ trigger answers to "More actions for …": it used to carry the
    // entry's own name, which the row's open button already has.
    await page.getByRole("button", { name: "More actions for HEA 120" }).click();
    await page.getByRole("menuitem", { name: "Add a part" }).click();

    // The row is now an assembly: two parts, summed. Parts and assemblies share
    // one list, so it gains a badge where it sits rather than moving tabs.
    await expect(page.getByText("assembly · 2 parts")).toBeVisible();
    await page.getByRole("button", { name: "Card view" }).click();
    await page.getByRole("button", { name: "Show details" }).click();
    // The parts list is open: each part can be taken back out of the assembly.
    await expect(page.getByRole("button", { name: /from this assembly$/ })).toHaveCount(2);
    await expect(page.getByText("SHS 40×40×3").first()).toBeVisible();
    // 238.7 kg + 132.14 kg (SHS 40×40×3 at 3.30 kg/m, EN 10219-2 corners) = 370.84 kg
    await expect(page.getByText("370.84 kg").first()).toBeVisible();
  });

  test("Use restores every part, not just the first", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 + ipe200 4m x3 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    // Saving no longer forces the rename sheet open — naming belongs to the
    // save step, and the toast offers it. Nothing to dismiss.
    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    await page.getByRole("button", { name: /^Load / }).first().click();

    // Both items come back on the line — restoring only the entry's own input
    // dropped everything after the first part.
    await expect(page.getByRole("list", { name: "Assembly parts" }).getByRole("listitem")).toHaveCount(2);
  });

  test("a saved part goes into a project from its row", async ({ page }) => {
    await page.goto("/en");
    await typeQuery(page, "hea120 6m x2 ");
    await page.getByRole("button", { name: /^Saved?$/ }).and(page.locator("[aria-pressed]")).click();

    await page.getByRole("button", { name: /^Parts\s*1$/ }).click();
    // Adding to a project is a button on the row, not an entry in the ⋯ menu:
    // a touch screen never reveals a hover-only action.
    await page.getByRole("button", { name: "Add HEA 120 to a project" }).click();

    // One flat list of destinations: the row that creates a project names it
    // in place, with no second sheet and no kind to pick first.
    await page.getByRole("button", { name: /^New project/ }).click();
    await page.getByLabel("New project", { exact: true }).fill("Mezzanine");
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
    await page.getByRole("button", { name: "Add HEA 120 to a project" }).click();
    await page.getByRole("button", { name: /^New project/ }).click();
    await page.getByLabel("New project", { exact: true }).fill("Gate");
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
    // 286.44 + 158.56 = 445.00 cost → 511.76 with 15% margin.
    await expect(quote).toContainText("€ 511.76");

    // Under print media the app is hidden and only the quote remains.
    await page.emulateMedia({ media: "print" });
    await expect(quote).toBeVisible();
    await expect(page.getByRole("button", { name: "Calculator" })).toBeHidden();
  });
});
