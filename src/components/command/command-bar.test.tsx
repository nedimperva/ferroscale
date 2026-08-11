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

  it("picks the nth suggestion with ⌥N without leaving the input", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "he");

    // The second chip in the profile row (HEB), by position.
    await h.user.keyboard("{Alt>}{2}{/Alt}");
    await waitFor(() => expect(currentQuery(h)).toContain("heb"));
    expect(document.activeElement).toBe(h.input());
  });

  it("offers variations once the line is complete, and applies one in place", async () => {
    const h = await renderCommandShell();
    // The demo query is a finished calculation: hea120 6m x2 s235.
    const double = await screen.findByRole("button", { name: /× 4/ });
    await h.user.click(double);

    await waitFor(() => expect(currentQuery(h)).toContain("x4"));
    // Everything else stayed put — that's what makes it a refinement.
    expect(currentQuery(h)).toContain("hea120");
    expect(currentQuery(h)).toContain("6m");
    expect(currentQuery(h)).toContain("s235");
    expect(currentQuery(h)).not.toContain("x2");
  });

  it("⌘S saves the line and the button reports it", async () => {
    const h = await renderCommandShell();
    h.input().focus();
    await h.user.keyboard("{Meta>}s{/Meta}");
    // The result panel's Save toggle flips (the "Saved" tab shares its name,
    // so match the one that reports pressed state).
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("button", { name: "Saved" })
          .some((el) => el.getAttribute("aria-pressed") === "true"),
      ).toBe(true),
    );
    expect(screen.getByRole("button", { name: "Name it" })).toBeDefined();
  });

  it("? opens the command reference", async () => {
    const h = await renderCommandShell();
    h.input().focus();
    await h.user.keyboard("?");
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Command reference" })).toBeDefined(),
    );
    // Every shortcut the resolver implements is documented there.
    expect(screen.getByText("Accept the inline completion")).toBeDefined();
  });

  it("shows what Enter means right now", async () => {
    const h = await renderCommandShell();
    // Demo query is valid → Enter logs.
    expect(screen.getByText("log")).toBeDefined();

    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "hea");
    await waitFor(() => expect(screen.getByText("insert")).toBeDefined());
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

describe("target queries in the bar", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("solves for pieces and says how far over the target it lands", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "hea120 6m =500kg ");

    await waitFor(() => {
      expect(h.getAllByText(/pieces for 500 kg/).length).toBeGreaterThan(0);
    });
    // The equation line reflects the solved quantity, not the typed one.
    expect(h.getAllByText(/over/).length).toBeGreaterThan(0);
  });

  it("leaves ordinary queries without a target badge", async () => {
    const h = await renderCommandShell();
    expect(h.queryAllByText(/pieces for/)).toHaveLength(0);
  });
});

describe("multi-item lines", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("the refine bar offers a second item, and typing continues into it", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    // The refine chips only appear once every stage is filled — profile, size,
    // length, quantity, grade.
    await h.user.type(h.input(), "hea120 6m x2 s355 ");

    const addItem = await h.findByRole("button", { name: /\+ item/ });
    await h.user.click(addItem);
    // The separator is decoration between chip groups, not a chip of its own,
    // so the proof it landed is that what follows parses as a second item.
    await h.user.type(h.input(), "ipe200 4m ");
    await waitFor(() => {
      expect(h.getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    });
    // Both items are chipped and neither has swallowed the other's tokens.
    expect(h.getByRole("button", { name: "Edit hea120" })).toBeDefined();
    expect(h.getByRole("button", { name: "Edit ipe200" })).toBeDefined();
  });

  it("saves a multi-item line as one assembly, not two entries", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), "hea120 6m x2 + ipe200 4m x3 ");

    await h.user.keyboard("{Control>}s{/Control}");
    // One entry, not one per item — the tab count is the assertion that matters.
    const savedTab = await h.findByRole("button", { name: /^Saved\s*1$/ });
    await h.user.click(savedTab);
    await waitFor(() => {
      expect(h.getAllByText(/Assembly \(2 parts\)/).length).toBeGreaterThan(0);
    });
  });
});

describe("the > palette", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("turns the line into a command list and filters as you type", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), ">");

    const list = await h.findByRole("listbox", { name: "Command palette" });
    expect(h.getAllByRole("option").length).toBeGreaterThan(3);

    await h.user.type(h.input(), "sett");
    await waitFor(() => {
      expect(h.getAllByRole("option")).toHaveLength(1);
    });
    expect(list.textContent).toContain("Go to settings");
  });

  it("does not treat a command line as a broken calculation", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), ">zzz");

    // The parser would call ">zzz" an unknown token; the palette says the
    // honest thing instead.
    expect(h.queryAllByText(/Didn't understand/)).toHaveLength(0);
    expect(h.getByText("No matching command")).toBeDefined();
  });

  it("runs the selected command", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), ">saved");
    await h.user.keyboard("{Enter}");

    // "Go to saved" leaves the calculator entirely — the command line is gone,
    // which is the only way that can happen.
    await waitFor(() => {
      expect(h.queryByLabelText("FerroScale Command query")).toBeNull();
    });
  });

  it("greys out the actions that need a finished calculation", async () => {
    const h = await renderCommandShell();
    await h.user.click(h.input());
    // ⌘K empties the line, so there is no result to save or share.
    await h.user.keyboard("{Control>}k{/Control}");
    await h.user.type(h.input(), ">save");

    const option = h.getAllByRole("option")[0];
    expect(option.querySelector("button")?.hasAttribute("disabled")).toBe(true);
  });
});
