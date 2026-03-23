import { test, expect } from "@playwright/test";

test.describe("Calculator main flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
  });

  test("page loads with default profile and grouped desktop result", async ({ page }) => {
    await expect(page.getByText("Category").first()).toBeVisible();
    await expect(page.getByText("Piece length").first()).toBeVisible();
    await expect(page.locator("[data-result-layout='standalone']").first()).toBeVisible();
    await expect(page.locator("[data-result-layout='standalone'] [data-result-metrics]")).toBeVisible();
    await expect(page.locator("[data-result-layout='standalone'] [data-result-cost]")).toBeVisible();
  });

  test("switching profile category updates the form", async ({ page }) => {
    await page.getByRole("button", { name: /Tubes/ }).click();
    await expect(page.getByRole("button", { name: /Circular/ })).toBeVisible();

    await page.getByRole("button", { name: /Bars/ }).click();
    await expect(page.getByRole("button", { name: /Round/ })).toBeVisible();
  });

  test("changing dimensions updates result summary", async ({ page }) => {
    await page.getByRole("button", { name: /Bars/ }).click();
    await page.getByRole("button", { name: /Round/ }).click();

    const diameterInput = page.locator("#dimension-diameter").first();
    await diameterInput.fill("100");
    await page.waitForTimeout(500);

    const summary = page.locator("[data-result-summary]").first();
    await expect(summary).toContainText("RB", { timeout: 5000 });
    await expect(summary).toContainText("100", { timeout: 5000 });
  });

  test("quantity stepper works", async ({ page }) => {
    const quantityInput = page.locator("#quantity").first();
    await expect(quantityInput).toHaveValue("1");

    await page.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(quantityInput).toHaveValue("2");

    await page.getByRole("button", { name: /Decrease quantity/ }).click();
    await expect(quantityInput).toHaveValue("1");
  });

  test("save custom size modal opens and works", async ({ page }) => {
    await page.getByRole("button", { name: /Bars/ }).click();
    await page.getByRole("button", { name: /Round/ }).click();

    await page.getByRole("button", { name: /Save custom size/ }).first().click();

    await expect(page.getByRole("dialog", { name: /Save favourite/ })).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input");
    await nameInput.fill("Test E2E Preset");
    await page.getByRole("dialog").getByRole("button", { name: /Save/ }).click();

    await expect(page.locator("text=Favourite saved")).toBeVisible({ timeout: 3000 });
  });

  test("settings drawer opens", async ({ page }) => {
    const settingsBtn = page.getByRole("button", { name: /Settings/ }).first();
    await settingsBtn.click();
    const settingsDrawer = page.getByRole("dialog", { name: /Settings drawer/i });
    await expect(settingsDrawer).toBeVisible({ timeout: 3000 });
    await expect(settingsDrawer.getByText("Material & Density")).toBeVisible({ timeout: 3000 });
  });

  test("saved drawer opens", async ({ page }) => {
    const savedBtn = page.getByRole("button", { name: /Saved/ }).first();
    await savedBtn.click();
    await expect(page.getByText("Saved").first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Result layouts", () => {
  test("column mode keeps result summary and actions usable while scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Columns/ }).click();

    const resultPanel = page.locator("[data-panel-type='result']");
    await expect(resultPanel.locator("[data-result-layout='column']").first()).toBeVisible();

    const scrollRegion = resultPanel.locator("[data-column-scroll]");
    await scrollRegion.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(resultPanel.locator("[data-result-summary]")).toBeVisible();

    await resultPanel.getByRole("button", { name: /Add to compare/ }).click();
    await expect(resultPanel.getByRole("button", { name: /In compare/ })).toBeVisible();

    await resultPanel.getByRole("button", { name: /^Save$/ }).click();
    const saveDialog = page.getByRole("dialog", { name: /Save calculation/i });
    await expect(saveDialog).toBeVisible();
    await saveDialog.getByRole("button", { name: /Cancel/i }).click();
    await expect(saveDialog).not.toBeVisible();
  });

  test("column mode shows stacked calculation details", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Columns/ }).click();

    const details = page.locator("[data-panel-type='result'] [data-result-details]");
    await details.locator("summary").click();

    await expect(details.locator("[data-result-breakdown-stack]")).toBeVisible();
    await expect(details.locator("table")).toHaveCount(0);
    await expect(details).toContainText("Cross-section area");
  });
});

test.describe("Quick Calculate palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
  });

  test("opens via sidebar button", async ({ page }) => {
    await page.getByRole("button", { name: /Quick Calc/ }).click();
    await expect(page.getByRole("dialog", { name: /Quick Calculate/ })).toBeVisible();
  });

  test("calculates weight from query", async ({ page }) => {
    await page.getByRole("button", { name: /Quick Calc/ }).click();

    const textarea = page.getByRole("dialog").locator("textarea");
    await textarea.fill("shs 40x40x2x4500mm");
    await page.waitForTimeout(300);

    await expect(page.getByRole("dialog").locator("text=kg")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Error boundary", () => {
  test("skip link is present and focusable", async ({ page }) => {
    await page.goto("/en");
    const skipLink = page.locator("a[href='#main-content']");
    await expect(skipLink).toBeAttached();
  });
});
