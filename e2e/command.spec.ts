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

  test("a nearby size under the breakdown rewrites just the section", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Use HEB 120 instead" }).click();
    await expect(page.getByText("heb120", { exact: true })).toBeVisible();
    await expect(page.getByText("x2", { exact: true })).toBeVisible();
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
    // Finished items collapse to one chip; the last item stays spelled out.
    await expect(page.getByRole("button", { name: /Item 1, HEA 120/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit ipe200" })).toBeVisible();

    // The item list replaces the single-item equation line...
    const items = page.getByRole("list", { name: "Assembly parts" });
    await expect(items.getByRole("listitem")).toHaveCount(2);

    // ...and the hero is the sum of the two, not either one alone.
    const hero = page.locator(".fs-display-num").first();
    await expect(hero).not.toHaveText("—");
    const total = Number((await hero.innerText()).replace(/[^0-9.]/g, ""));
    expect(total).toBeGreaterThan(300);
  });

  test("editing one item leaves the other alone", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2+%2B+ipe200+4m+x3");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // Removing the second item's quantity must not touch the first item's.
    await page.getByRole("button", { name: "Remove x3" }).click();
    await expect(page.getByRole("button", { name: "Edit x3" })).toHaveCount(0);
    // Second item stays on the line even if its tokens are the caret now.
    await expect(page.getByRole("list", { name: "Assembly parts" }).getByRole("listitem")).toHaveCount(2);
    // First item is a grey chip when the last item is open; after some edits
    // it is already spelled out. Either way its quantity must still be there.
    const collapsed = page.getByRole("button", { name: /Item 1, HEA 120/ });
    const x2 = page.getByRole("button", { name: "Edit x2" });
    await expect(collapsed.or(x2)).toBeVisible();
    if (await collapsed.isVisible()) await collapsed.click();
    await expect(x2).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit hea120" })).toBeVisible();
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

    await expect(page.getByRole("list", { name: "Assembly parts" }).getByRole("listitem")).toHaveCount(2);
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
    await expect(page.getByRole("list", { name: "Assembly parts" }).getByRole("listitem")).toHaveCount(3);
    await expect(page.getByRole("button", { name: /Item 1, HEA 120/ })).toBeVisible();
  });

  test("the breakdown says which item it describes on a multi-item line", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2+%2B+ipe200+4m+x3");
    // The hero totals the line; the assembly list in the breakdown picks a part.
    // The same heading also sits under the hero number — don't require a unique match.
    await expect(page.getByText("Assembly · 2 parts").first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Assembly parts" })).toBeVisible();

    await page.goto("/en?q=hea120+6m+x2");
    await expect(page.getByText(/Assembly · \d+ parts/)).toHaveCount(0);
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
    await expect(page.getByRole("button", { name: "Edit length, quantity or rate" })).toBeVisible();
  });

  test("the keypad sits flush on the bottom edge, with no band of screen under it", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // The shell used to size its column with `100dvh` inside a `fixed inset-0`
    // parent; where the two disagree the keys float above a strip of screen
    // background instead of resting on the edge.
    const keypad = page.locator("[data-keypad]");
    const box = await keypad.boundingBox();
    const viewportHeight = page.viewportSize()!.height;
    expect(Math.abs(box!.y + box!.height - viewportHeight)).toBeLessThanOrEqual(1);
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

  test("the suggestion chips clear the query line's focus ring", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    // The query line draws a 3px ring outside its border box. At the old
    // 6px gap the chips sat on that glow and the two read as one collided
    // control, so the clearance is measured against the ring, not the box.
    const RING = 3;
    const chip = page.locator("[data-suggestion-strip] button").first();
    const line = page.locator("[data-query-line]");
    const chipBox = await chip.boundingBox();
    const lineBox = await line.boundingBox();
    expect(lineBox!.y - RING - (chipBox!.y + chipBox!.height)).toBeGreaterThanOrEqual(8);
  });

  test("a multi-item line collapses to one row, and opens the item you tap", async ({ page }) => {
    const line =
      "heb120 12m x1 s235 + shs50x50x3 6m x2 s235 + ipe200 12m x1 s235 + rhs80x40x3 6m x1 s235";
    await page.goto(`/en?q=${encodeURIComponent(line)}`);
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();

    // Four items' worth of chips used to overflow a capped, wrapping box and
    // render as sliced half-rows. Only the item the caret is in is spelled
    // out; the rest are one chip each, and the row never grows.
    const queryLine = page.locator("[data-query-line]");
    expect((await queryLine.boundingBox())!.height).toBeLessThanOrEqual(52);
    await expect(queryLine.getByRole("button", { name: /^Item [123], / })).toHaveCount(3);
    await expect(queryLine.getByRole("button", { name: "Edit rhs80x40x3" })).toBeVisible();

    // Tapping a collapsed item opens it and folds the others away.
    await queryLine.getByRole("button", { name: /^Item 1, / }).click();
    await expect(queryLine.getByRole("button", { name: "Edit heb120" })).toBeVisible();
    await expect(queryLine.getByRole("button", { name: /^Item 4, / })).toBeVisible();
    expect((await queryLine.boundingBox())!.height).toBeLessThanOrEqual(52);
  });

  test("adding items never moves the controls under the hero", async ({ page }) => {
    const items = [
      "heb120 12m x1 s235",
      "shs50x50x3 6m x2 s235",
      "ipe200 12m x1 s235",
      "rhs80x40x3 6m x1 s235",
      "rnd20 6m x4 s235",
      "flt50x5 6m x2 s235",
      "upn100 6m x3 s235",
      "chs48.3x3.2 6m x2 s235",
    ];
    const actionsTop = async (count: number) => {
      await page.goto(`/en?q=${encodeURIComponent(items.slice(0, count).join(" + "))}`);
      await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
      // Multi-item lines used to grow a per-item list under the hero. That is
      // now a one-line "Assembly · N parts" so the actions stay put. Wait for
      // it before measuring, or the first paint still has the single-item row.
      await expect(page.getByText(`Assembly · ${count} parts`)).toBeVisible();
      // `Save` is an action under the hero, on the same screen.
      const save = page.getByRole("button", { name: "Save", exact: true });
      return (await save.boundingBox())!.y;
    };

    // The per-item list grew ~21px a row, so a fifth calculation slid the
    // buttons you had just been using down the screen. Past three rows it
    // scrolls inside a fixed box instead.
    const atThree = await actionsTop(3);
    expect(await actionsTop(5)).toBe(atThree);
    expect(await actionsTop(8)).toBe(atThree);
  });

  test("a long line never pushes the input or the keys off screen", async ({ page }) => {
    // Uncapped, this line's chips wrapped to four rows and shoved the keypad's
    // bottom row — the ↵ and the unit keys — below the fold.
    const long = "hea120 6m x2 s355 @2.50/kg + ipe200 4m x3 s235 + rnd20 3m x5";
    for (const height of [844, 700, 667]) {
      await page.setViewportSize({ width: 390, height });
      await page.goto(`/en?q=${encodeURIComponent(long)}`);
      await expect(page.getByText("LIVE", { exact: true })).toBeVisible();

      const bar = page.locator("[data-keypad]");
      await expect(bar).toHaveAttribute("data-keypad", "actions");
      const boxBar = await bar.boundingBox();
      expect(boxBar, `action bar missing at ${height}`).not.toBeNull();
      expect(boxBar!.y + boxBar!.height, `action bar clipped at ${height}`).toBeLessThanOrEqual(
        height,
      );

      await page.getByRole("button", { name: "Edit length, quantity or rate" }).click();
      const enter = await page.getByRole("button", { name: "↵" }).boundingBox();
      expect(enter, `↵ missing at ${height}`).not.toBeNull();
      expect(enter!.y + enter!.height, `↵ clipped at ${height}`).toBeLessThanOrEqual(height);

      const line = page.locator("[data-query-line]");
      const box = await line.boundingBox();
      expect(box!.height, `query line unbounded at ${height}`).toBeLessThanOrEqual(96);
      expect(box!.y + box!.height, `query line clipped at ${height}`).toBeLessThan(height);
    }
  });

  test("filling the session doesn't move anything", async ({ page }) => {
    const ribbon = () => page.getByText("SESSION", { exact: true }).locator("..");
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    const empty = await ribbon().boundingBox();

    // The row grew from 48px to 72px once it had numbers in it: "Open ›" wrapped
    // to a second line, and everything below shifted down with it.
    await page.addInitScript(() => {
      localStorage.setItem(
        "ferroscale-quick-history",
        JSON.stringify(["ipe200 4m x3", "rnd20 3m x5", "shs40x40x3 6m x8", "hea120 6m x2"]),
      );
    });
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    const full = await ribbon().boundingBox();

    expect(full!.height).toBe(empty!.height);
    expect(full!.y).toBe(empty!.y);
  });

  test("every library tab label is readable, not clipped", async ({ page }) => {
    await page.goto("/en");
    await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Parts" }).click();
    const clipped = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="tab"] span:not([aria-hidden])'))
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent),
    );
    // Four tabs sharing 390px clipped PROJECTS. Sizing to content and letting
    // the row scroll is the only version that survives a longer locale.
    expect(clipped).toEqual([]);
  });
});

test.describe("Sheet dialogs (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the settings sheet is a modal dialog: named, focused, Escape closes", async ({ page }) => {
    await page.goto("/en");
    await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
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
    await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
    await page.getByRole("button", { name: "Parts" }).click();
    const dialog = page.getByRole("dialog", { name: "Parts" });
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
    await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("settings and library fill the phone screen", async ({ page }) => {
    await page.goto("/en");
    await page.waitForFunction(() => document.documentElement.classList.contains("app-ready"));
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    const box = await dialog.boundingBox();
    expect(box!.height).toBeGreaterThan(700);
    await page.getByRole("button", { name: "Back", exact: true }).click();

    await page.getByRole("button", { name: "Parts" }).click();
    const library = page.getByRole("dialog", { name: "Parts" });
    expect((await library.boundingBox())!.height).toBeGreaterThan(700);
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
    await page.goto("/en?q=hea120");
    await page.getByRole("button", { name: /€\/kg/ }).click();
    await expect(page.getByText(/^1\.2\/kg$/).first()).toBeVisible();
  });

  test("hold opens the unit picker and inserts the chosen unit", async ({ page }) => {
    await page.goto("/en?q=hea120");
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
    await page.goto("/en?q=hea120");
    await page.getByRole("button", { name: "5", exact: true }).click();
    await page.getByRole("button", { name: /^mm ▾$/ }).click();
    await expect(page.getByText("5mm", { exact: true }).first()).toBeVisible();
  });

  test("hold opens the length picker and inserts the chosen unit", async ({ page }) => {
    await page.goto("/en?q=hea120");
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

test.describe("Stage-aware keypad (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("a live line shows New / Tweak / Share, not the letter pad", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "actions");
    await expect(page.getByRole("button", { name: "New", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "q", exact: true })).toHaveCount(0);
  });

  test("Tweak opens the number pad; Done puts the bar back", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Edit length, quantity or rate" }).click();
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "numpad");
    await expect(page.getByRole("button", { name: "ABC" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "actions");
  });

  test("New clears the line and brings the letter pad back", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "New", exact: true }).click();
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "letters");
    await expect(page.getByRole("button", { name: "q", exact: true })).toBeVisible();
    await expect(page.getByText("WAITING")).toBeVisible();
  });

  test("a size-ready query opens on the number pad", async ({ page }) => {
    await page.goto("/en?q=hea120");
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "numpad");
    await expect(page.getByRole("button", { name: "5", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "q", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "space", exact: true })).toBeVisible();
  });

  test("a finished size and the next length stay two tokens", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "New", exact: true }).click();
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "letters");
    for (const key of ["h", "e", "a"]) {
      await page.getByRole("button", { name: key, exact: true }).click();
    }
    await expect(page.locator("[data-keypad]")).toHaveAttribute("data-keypad", "numpad");
    for (const key of ["1", "2", "0", "6"]) {
      await page.getByRole("button", { name: key, exact: true }).click();
    }
    const line = page.locator("[data-query-line]");
    await expect(line.getByRole("button", { name: "Edit hea120" })).toBeVisible();
    await expect(line.getByText("6", { exact: true })).toBeVisible();
  });

  test("holding a length chip opens a stepper", async ({ page }) => {
    await page.goto("/en?q=hea120+6m+x2");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    const chip = page.getByRole("button", { name: "Edit 6m" });
    const box = await chip.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();
    await expect(page.getByRole("group", { name: "Adjust 6m" })).toBeVisible();
    await page.getByRole("button", { name: "Increase 6m" }).click();
    await expect(page.getByRole("button", { name: "Edit 7m" })).toBeVisible();
  });
});

test.describe("Assembly breakdown (phone viewport)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("lists every part and switches the drawing to the one you tap", async ({ page }) => {
    await page.goto(`/en?q=${encodeURIComponent("hea120 6m x2 + ipe200 4m x3")}`);
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Breakdown/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /Assembly/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("list", { name: "Assembly parts" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /HEA 120/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /IPE 200/ })).toBeVisible();
    await dialog.getByRole("button", { name: /IPE 200/ }).click();
    await expect(dialog.getByRole("button", { name: /IPE 200/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
