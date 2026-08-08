import { test, expect } from "@playwright/test";

// Desktop Chrome (1280px) renders the wide two-pane command workspace.
test.describe("Command bar", () => {
  test("loads with the demo query and a live result", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.getByText("hea120", { exact: true })).toBeVisible();
    await expect(page.getByText(/kg\/m ×/).first()).toBeVisible();
  });

  test("typing a query produces a result", async ({ page }) => {
    await page.goto("/en");
    const input = page.getByLabel("FerroScale Command query");
    await input.click();
    // ⌘K / Ctrl+K starts a new calculation (clears the demo query).
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByText("WAITING")).toBeVisible();
    await input.pressSequentially("ipe200 4m ");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.getByText("ipe200", { exact: true })).toBeVisible();
  });

  test("a shared ?q= link hydrates the command line", async ({ page }) => {
    await page.goto("/en?q=ipe200+4m+x3");
    await expect(page.getByText("ipe200", { exact: true })).toBeVisible();
    await expect(page.getByText("x3", { exact: true })).toBeVisible();
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  });

  test("a target query solves for pieces and shows the overshoot", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+%3D500kg");
    await expect(page.getByText("=500kg", { exact: true })).toBeVisible();
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.getByText(/pieces for 500 kg/)).toBeVisible();
    // Whole bars overshoot: the badge says by how much.
    await expect(page.getByText(/over/).first()).toBeVisible();
  });

  test("a + joins two items, sums them, and lists both", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2+%2B+ipe200+4m+x3");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // Both items are chipped, either side of the separator.
    await expect(page.getByText("hea120", { exact: true })).toBeVisible();
    await expect(page.getByText("ipe200", { exact: true })).toBeVisible();

    // The item list replaces the single-item equation line...
    const items = page.getByRole("list", { name: "Line items" });
    await expect(items.getByRole("listitem")).toHaveCount(2);

    // ...and the hero is the sum of the two, not either one alone.
    const hero = page.locator(".fs-display-num").first();
    await expect(hero).not.toHaveText("—");
    const total = Number((await hero.innerText()).replace(/[^0-9.]/g, ""));
    expect(total).toBeGreaterThan(300);
  });

  test("editing one item leaves the other alone", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2+%2B+ipe200+4m+x3");
    // Removing the second item's quantity must not touch the first item's.
    await page.getByRole("button", { name: "Remove x3" }).click();
    await expect(page.getByText("x2", { exact: true })).toBeVisible();
    await expect(page.getByText("x3", { exact: true })).toHaveCount(0);
    await expect(page.getByText("hea120", { exact: true })).toBeVisible();
    await expect(page.getByText("ipe200", { exact: true })).toBeVisible();
  });

  test("> opens the command palette and runs what you pick", async ({ page }) => {
    await page.goto("/en");
    const input = page.getByLabel("FerroScale Command query");
    await input.click();
    await page.keyboard.press("ControlOrMeta+k");
    await input.pressSequentially(">");

    const palette = page.getByRole("listbox", { name: "Command palette" });
    await expect(palette).toBeVisible();

    // Typing narrows it, arrows move the selection, Enter runs it.
    await input.pressSequentially("settings");
    await expect(palette.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(page.getByText("pricing · units · appearance")).toBeVisible();
  });

  test("a command line is not reported as a broken calculation", async ({ page }) => {
    await page.goto("/en");
    const input = page.getByLabel("FerroScale Command query");
    await input.click();
    await page.keyboard.press("ControlOrMeta+k");
    await input.pressSequentially(">zzz");
    await expect(page.getByText("No matching command")).toBeVisible();
    await expect(page.getByText(/Didn't understand/)).toHaveCount(0);
  });

  test("pasting a cut list turns each row into an item", async ({ page }) => {
    await page.goto("/en");
    const input = page.getByLabel("FerroScale Command query");
    await input.click();
    await page.keyboard.press("ControlOrMeta+k");

    // Paste two rows the way a spreadsheet hands them over.
    await input.evaluate((el: HTMLInputElement) => {
      const data = new DataTransfer();
      data.setData("text", "hea120 6m x2\nipe200 4m x3");
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    });

    await expect(page.getByRole("list", { name: "Line items" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  });

  test("pasting adds to the line instead of wiping what was typed", async ({ page }) => {
    await page.goto("/en");
    const input = page.getByLabel("FerroScale Command query");
    await input.click();
    await page.keyboard.press("ControlOrMeta+k");
    await input.pressSequentially("hea120 6m x2 ");

    await input.evaluate((el: HTMLInputElement) => {
      const data = new DataTransfer();
      data.setData("text", "ipe200 4m x3\nrnd20 3m");
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
    });

    // Three items: the one that was typed, plus the two pasted.
    await expect(page.getByRole("list", { name: "Line items" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByText("hea120", { exact: true })).toBeVisible();
  });

  test("the breakdown says which item it describes on a multi-item line", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2+%2B+ipe200+4m+x3");
    // The hero totals the line while the breakdown describes one calculation,
    // so the breakdown has to name it or the two read as contradicting.
    await expect(page.getByText("Breakdown · item 2 of 2")).toBeVisible();

    await page.goto("/en?q=hea120+6m+x2");
    await expect(page.getByText(/Breakdown · item/)).toHaveCount(0);
  });

  test("arithmetic in a token prices the cut length", async ({ page }) => {
    await page.goto("/en?q=hea120+6m-50mm+x2");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.getByText("6m-50mm", { exact: true })).toBeVisible();
    // 5.95 m, not 6 — the equation line shows the length actually used.
    await expect(page.getByText(/5\.95/).first()).toBeVisible();
  });

  test("an unrecognized token shows a parse issue", async ({ page }) => {
    await page.goto("/en");
    const input = page.getByLabel("FerroScale Command query");
    await input.click();
    await page.keyboard.press("ControlOrMeta+k");
    await input.pressSequentially("zzz ");
    await expect(page.getByText('Didn\'t understand "zzz"')).toBeVisible();
  });

  test("an unknown standard size shows a parse issue", async ({ page }) => {
    await page.goto("/en?q=hea999+6m");
    await expect(page.getByText('No HEA size "999"')).toBeVisible();
    await expect(page.getByText("WAITING")).toBeVisible();
  });
});

// Phone (<640) — the one surface that still uses bottom sheets for Settings,
// Library and Result. Everything wider gets the workspace.
test.describe("Phone fold (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the whole screen fits without scrolling", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    );
    expect(fits).toBe(true);
  });

  test("the fold carries hero, session ribbon, query line and keypad at once", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.getByText("Breakdown", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("SESSION", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Command palette" })).toBeVisible();
  });

  test("the suggestion strip stays one row, whatever the stage offers", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // Wrapping to a second row made the strip's height depend on the chip
    // count, and the overflow was clipped by the query line beneath it.
    const strip = page.locator("[data-suggestion-strip]");
    const box = await strip.boundingBox();
    expect(box!.height).toBeLessThan(80);
  });

  test("a long line never pushes the input or the keys off screen", async ({ page }) => {
    // Uncapped, this line's chips wrapped to four rows and shoved the keypad's
    // bottom row — the ↵ and the unit keys — below the fold.
    const long = "hea120 6m x2 s355 @2.50/kg + ipe200 4m x3 s235 + rnd20 3m x5";
    for (const height of [844, 700, 667]) {
      await page.setViewportSize({ width: 390, height });
      await page.goto(`/en?q=${encodeURIComponent(long)}`);
      await expect(page.getByText("LIVE", { exact: true })).toBeVisible();

      const enter = await page.getByRole("button", { name: "↵" }).boundingBox();
      expect(enter, `↵ missing at ${height}`).not.toBeNull();
      // Fully inside the viewport, with room for a home indicator.
      expect(enter!.y + enter!.height, `↵ clipped at ${height}`).toBeLessThanOrEqual(height);

      const line = page.locator("[data-query-line]");
      const box = await line.boundingBox();
      expect(box!.height, `query line unbounded at ${height}`).toBeLessThanOrEqual(96);
      expect(box!.y + box!.height, `query line clipped at ${height}`).toBeLessThan(height);
    }
  });

  test("the palette key is the phone's way into commands", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Command palette" }).click();
    await expect(page.getByRole("listbox", { name: "Command palette" })).toBeVisible();
  });
});

test.describe("Sheet dialogs (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the settings sheet is a modal dialog: named, focused, Escape closes", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Settings" }).click();

    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    // Focus lands inside the dialog (focus trap's focus-first).
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Focus returns to the opener.
    await expect(page.getByRole("button", { name: "Settings" })).toBeFocused();
  });

  test("Tab cycles inside the dialog without escaping it", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Library" }).click();
    const dialog = page.getByRole("dialog", { name: "Library" });
    await expect(dialog).toBeVisible();

    // Shift+Tab from the first focusable wraps to the last; repeated Tab
    // never leaves the dialog.
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
    }
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  });

  test("the backdrop click still closes the sheet", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Close sheet" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("Formula QA page", () => {
  test("renders the benchmark table with all checks passing", async ({ page }) => {
    await page.goto("/en/qa");
    await expect(page.getByRole("heading", { name: "Formula QA" })).toBeVisible();
    await expect(page.getByText(/All \d+ checks pass/)).toBeVisible();
    await expect(page.getByText("HEA 200")).toBeVisible();
    await expect(page.getByText("FAIL", { exact: true })).toHaveCount(0);
  });
});

// Phone viewport (<640) — fullscreen app with the on-screen keypad.
test.describe("Keypad rate key (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("tap inserts the default price token", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /€\/kg/ }).click();
    await expect(page.getByText(/^1\.2\/kg$/).first()).toBeVisible();
  });

  test("hold opens the unit picker and inserts the chosen unit", async ({ page }) => {
    await page.goto("/en");
    const rateKey = page.getByRole("button", { name: /€\/kg/ });
    const box = await rateKey.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    const menu = page.getByRole("menu", { name: "Price unit" });
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "/m" }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByText(/^1\.2\/m$/).first()).toBeVisible();
  });
});

test.describe("Keypad length key (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("tap inserts mm as the default length unit", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "5", exact: true }).click();
    await page.getByRole("button", { name: /^mm ▾$/ }).click();
    await expect(page.getByText("5mm", { exact: true }).first()).toBeVisible();
  });

  test("hold opens the length picker and inserts the chosen unit", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "5", exact: true }).click();
    const lengthKey = page.getByRole("button", { name: /^mm ▾$/ });
    const box = await lengthKey.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();

    const menu = page.getByRole("menu", { name: "Length unit" });
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "cm", exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByText("5cm", { exact: true }).first()).toBeVisible();
  });
});
