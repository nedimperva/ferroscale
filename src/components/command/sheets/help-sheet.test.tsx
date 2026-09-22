// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

import messages from "../../../../messages/en.json";
import { CommandHelpSheet } from "./help-sheet";

afterEach(() => {
  cleanup();
});

function renderHelpSheet(props: {
  onClose?: () => void;
  onTryExample?: (q: string) => void;
} = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CommandHelpSheet
        onClose={props.onClose ?? vi.fn()}
        onTryExample={props.onTryExample ?? vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("CommandHelpSheet", () => {
  it("renders category filter tabs and all shortcut sections on initial load", () => {
    renderHelpSheet();

    // Dialog title
    expect(screen.getByRole("dialog", { name: "Command reference" })).toBeDefined();

    // Category filter tabs
    expect(screen.getByRole("tab", { name: /All/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Tabs & Items/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Command line/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Workspace/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Grammar/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Profiles/ })).toBeDefined();

    // Categorized sections visible on 'All'
    expect(screen.getByText("Multi-item line & tabs")).toBeDefined();
    expect(screen.getByText("Command line & suggestions")).toBeDefined();
    expect(screen.getByText("Workspace & session")).toBeDefined();
    expect(screen.getAllByText("Grammar").length).toBeGreaterThanOrEqual(2); // tab + section header
    expect(screen.getAllByText("Profiles").length).toBeGreaterThanOrEqual(2); // tab + section header

    // Key shortcuts visible
    expect(screen.getByText("Switch to previous / next item tab (or ⌥← / ⌥→)")).toBeDefined();
    expect(screen.getByText("Jump directly to item tab 1–9")).toBeDefined();
    expect(screen.getByText("Accept the inline completion")).toBeDefined();
    expect(screen.getByText("New calculation")).toBeDefined();
  });

  it("filters to Tabs & Items category when clicking the tabs filter", () => {
    renderHelpSheet();

    const tabsTab = screen.getByRole("tab", { name: /Tabs & Items/ });
    fireEvent.click(tabsTab);

    // Multi-item section remains visible
    expect(screen.getByText("Multi-item line & tabs")).toBeDefined();
    expect(screen.getByText("Switch to previous / next item tab (or ⌥← / ⌥→)")).toBeDefined();

    // Other categories are filtered out
    expect(screen.queryByText("Command line & suggestions")).toBeNull();
    expect(screen.queryByText("Workspace & session")).toBeNull();
    expect(screen.queryByText("Order doesn't matter, and spaces are optional — hea120 6m x2 and x2 6m hea 120 read the same.")).toBeNull();
  });

  it("searches and filters shortcuts by text", () => {
    renderHelpSheet();

    const searchInput = screen.getByPlaceholderText("Filter shortcuts, grammar, profiles…");
    fireEvent.change(searchInput, { target: { value: "save" } });

    // Matching shortcut is visible
    expect(screen.getByText("Save (press again to unsave)")).toBeDefined();

    // Unrelated shortcuts are filtered out
    expect(screen.queryByText("Jump directly to item tab 1–9")).toBeNull();
  });

  it("clears search filter when clicking clear button", () => {
    renderHelpSheet();

    const searchInput = screen.getByPlaceholderText("Filter shortcuts, grammar, profiles…");
    fireEvent.change(searchInput, { target: { value: "compare" } });
    expect(screen.getByText("Add to compare")).toBeDefined();

    const clearButton = screen.getByRole("button", { name: /clear/i });
    fireEvent.click(clearButton);

    // All categories restored
    expect(screen.getByText("Multi-item line & tabs")).toBeDefined();
    expect(screen.getByText("Command line & suggestions")).toBeDefined();
  });

  it("calls onTryExample when example card is clicked", () => {
    const onTryExample = vi.fn();
    renderHelpSheet({ onTryExample });

    const exampleCard = screen.getByRole("button", { name: /hea120 6m x2 s355/ });
    fireEvent.click(exampleCard);

    expect(onTryExample).toHaveBeenCalledWith("hea120 6m x2 s355 @2.50/kg + ipe200 4m");
  });
});
