// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { currentQuery, renderCommandShell } from "@/test/render-command";

/**
 * Interaction coverage for the command bar: chip editing, suggestion
 * insertion, ghost acceptance and history recall. These are the paths the
 * keyboard work in the "bar gets faster" sprint rewrites.
 */

describe("command bar", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("starts on the demo query and shows a live result", async () => {
    const h = await renderCommandShell();
    expect(screen.getByText("LIVE")).toBeDefined();
    expect(currentQuery(h)).toContain("hea120");
    expect(currentQuery(h)).toContain("6m");
  });

  it("chips the completed tokens and keeps the trailing partial in the input", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "ipe20");

    expect(h.input().value).toBe("ipe20");
    expect(h.queryAllByRole("button", { name: /^Edit / })).toHaveLength(0);

    await h.user.type(h.input(), "0 ");
    await waitFor(() => {
      expect(h.getByRole("button", { name: "Edit ipe200" })).toBeDefined();
    });
    expect(h.input().value).toBe("");
  });

  it("removes a chip and pulls one back for editing", async () => {
    const h = await renderCommandShell();
    await waitFor(() => expect(h.getByRole("button", { name: "Edit x2" })).toBeDefined());

    await h.user.click(h.getByRole("button", { name: "Remove x2" }));
    await waitFor(() => expect(h.queryByRole("button", { name: "Edit x2" })).toBeNull());
    expect(currentQuery(h)).not.toContain("x2");

    // Editing a chip moves it to the end of the line as the live partial.
    await h.user.click(h.getByRole("button", { name: "Edit 6m" }));
    await waitFor(() => expect(h.input().value).toBe("6m"));
    expect(h.queryByRole("button", { name: "Edit 6m" })).toBeNull();
  });

  it("inserts the suggestion a chip click names", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    // A complete alias resolves immediately (and the bar moves on to sizes),
    // so the profile chips are what a partial like "sh" offers.
    await h.user.type(h.input(), "sh");

    const chip = await screen.findByRole("button", { name: /^SHS$/ });
    await h.user.click(chip);
    await waitFor(() => expect(currentQuery(h)).toContain("shs"));
  });

  it("completes the ghost with Tab", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "he");

    await h.user.keyboard("{Tab}");
    await waitFor(() => expect(currentQuery(h)).toMatch(/^he[ab]/));
    expect(currentQuery(h).length).toBeGreaterThan(2);
  });

  it("Enter logs a valid line to the session tape and ↑ recalls it", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "ipe200 4m x3 ");
    await h.user.keyboard("{Enter}");

    // The tape row carries the logged calculation (the breakdown names it too).
    await waitFor(() => expect(screen.getAllByText("IPE 200").length).toBeGreaterThan(1));

    await h.user.keyboard("{Control>}k{/Control}");
    expect(currentQuery(h)).toBe("");
    await h.user.keyboard("{ArrowUp}");
    await waitFor(() => expect(currentQuery(h)).toContain("ipe200"));
  });

  it("Enter mid-query inserts the first suggestion instead of logging", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "hea");
    await h.user.keyboard("{Enter}");
    await waitFor(() => expect(currentQuery(h)).toContain("hea"));
    // Still no valid result — Enter advanced the query, it didn't log.
    expect(screen.getByText("WAITING")).toBeDefined();
  });

  it("backspace on an empty partial pulls the last chip back", async () => {
    const h = await renderCommandShell();
    await waitFor(() => expect(h.getByRole("button", { name: /^Edit s235$/ })).toBeDefined());
    h.input().focus();
    await h.user.keyboard("{Backspace}");
    await waitFor(() => expect(h.input().value).toBe("s235"));
  });

  it("surfaces a did-you-mean correction for a typo", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "hae120 ");
    const fix = await screen.findByRole("button", { name: /hea120/ });
    await h.user.click(fix);
    await waitFor(() => expect(currentQuery(h)).toContain("hea120"));
  });
});
