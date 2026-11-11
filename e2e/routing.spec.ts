import { test, expect } from "@playwright/test";

/**
 * The locale redirect is done by `src/proxy.ts` alone. For a long time the
 * proxy sat at the repo root, where a `src/app` project never runs it, and
 * stand-in pages at `/`, `/faq` and `/contact` hid that — every other path
 * without a locale was a 404. These hit the server without following the
 * redirect, so they fail the moment the proxy stops running.
 */
test.describe("Locale redirect", () => {
  for (const [path, target] of [
    ["/", "/en"],
    ["/?q=hea120+6m", "/en?q=hea120+6m"],
    ["/saved", "/en/saved"],
    ["/faq", "/en/faq"],
  ] as const) {
    test(`${path} goes to ${target}`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()["location"]).toBe(target);
    });
  }

  test("a saved language choice wins over the default", async ({ request }) => {
    const res = await request.get("/projects", {
      maxRedirects: 0,
      headers: { cookie: "NEXT_LOCALE=bs" },
    });
    expect(res.headers()["location"]).toBe("/bs/projects");
  });
});
