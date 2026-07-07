import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated axe scans of the main surfaces. Critical-impact violations fail;
 * serious ones are logged so they can be triaged without blocking.
 */
async function scan(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  const serious = results.violations.filter((v) => v.impact === "serious");
  if (serious.length > 0) {
    console.log(
      `[axe] ${label} — serious (non-blocking):`,
      serious.map((v) => `${v.id} ×${v.nodes.length}`).join(", "),
    );
  }
  expect(
    critical,
    `${label}: critical a11y violations:\n` +
      critical.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n"),
  ).toEqual([]);
}

test.describe("axe scans", () => {
  test("wide desktop workspace", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
    await scan(page, "wide /en");
  });

  test.describe("medium viewport", () => {
    test.use({ viewport: { width: 800, height: 900 } });

    test("command card", async ({ page }) => {
      await page.goto("/en");
      await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
      await scan(page, "medium /en");
    });

    test("settings sheet open", async ({ page }) => {
      await page.goto("/en");
      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
      await scan(page, "medium /en + settings sheet");
    });
  });
});
