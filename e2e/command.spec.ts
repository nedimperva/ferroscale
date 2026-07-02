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
