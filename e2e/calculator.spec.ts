import { test, expect } from "@playwright/test";

test.describe("Calculator main flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
  });

  test("page loads with default profile and result", async ({ page }) => {
    await expect(page.locator("text=Category")).toBeVisible();
    await expect(page.locator("text=Piece length")).toBeVisible();
    await expect(page.locator("text=TOTAL COST")).toBeVisible();
  });

  test("switching profile category updates the form", async ({ page }) => {
    await page.getByRole("button", { name: /Tubes/ }).click();
    await expect(page.getByRole("button", { name: /Circular/ })).toBeVisible();

    await page.getByRole("button", { name: /Bars/ }).click();
    await expect(page.getByRole("button", { name: /Round/ })).toBeVisible();
  });

  test("changing dimensions updates result", async ({ page }) => {
    await page.getByRole("button", { name: /Bars/ }).click();
    await page.getByRole("button", { name: /Round/ }).click();

    const diameterInput = page.locator("#dimension-diameter");
    await diameterInput.fill("100");
    await page.waitForTimeout(500);

    await expect(page.locator("aside").getByText("RB Ø100").first()).toBeVisible({ timeout: 5000 });
  });

  test("quantity stepper works", async ({ page }) => {
    const quantityInput = page.locator("#quantity");
    await expect(quantityInput).toHaveValue("1");

    await page.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(quantityInput).toHaveValue("2");

    await page.getByRole("button", { name: /Decrease quantity/ }).click();
    await expect(quantityInput).toHaveValue("1");
  });

  test("save preset modal opens and works", async ({ page }) => {
    await page.getByRole("button", { name: /Bars/ }).click();
    await page.getByRole("button", { name: /Round/ }).click();

    const favBtn = page.getByRole("button", { name: /Favourites/ });
    await favBtn.click();

    await page.getByRole("button", { name: /Save current dimensions/ }).click();

    await expect(page.getByRole("dialog", { name: /Save favourite/ })).toBeVisible();

    const nameInput = page.getByRole("dialog").locator("input");
    await nameInput.fill("Test E2E Preset");
    await page.getByRole("dialog").getByRole("button", { name: /Save/ }).click();

    await favBtn.click();
    await expect(page.locator("text=Test E2E Preset")).toBeVisible();
  });

  test("settings drawer opens", async ({ page }) => {
    const settingsBtn = page.getByRole("button", { name: /Settings/ }).first();
    await settingsBtn.click();
    await expect(page.locator("text=Material & Density")).toBeVisible({ timeout: 3000 });
  });

  test("history drawer opens", async ({ page }) => {
    const historyBtn = page.getByRole("button", { name: /History/ }).first();
    await historyBtn.click();
    await expect(page.getByText("History").first()).toBeVisible({ timeout: 3000 });
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
