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

// Medium viewport (640–1023) — the centered command card where the bottom
// sheets (Settings, Library, Result) render.
test.describe("Sheet dialogs (medium viewport)", () => {
  test.use({ viewport: { width: 800, height: 900 } });

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
