// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { cmdParseLine } from "@ferroscale/metal-core";
import { lineChips } from "./line-edit";
import { SegmentedRail } from "./segmented-rail";

afterEach(() => {
  cleanup();
});

const DUMMY_SETTINGS = {
  pricing: {
    priceBasis: "weight" as const,
    priceUnit: "kg" as const,
    unitPrice: 2.5,
    currency: "EUR" as const,
    wastePercent: 0,
    includeVat: false,
    vatPercent: 20,
  },
  defaultGradeId: "s235",
  defaultLengthUnit: "m" as const,
};

function renderRail(
  query: string,
  expandedIndex = 0,
  handlers: {
    onSelectTab?: (i: number) => void;
    onRemoveItem?: (i: number) => void;
    onDuplicateItem?: (i: number) => void;
    onAddItem?: () => void;
  } = {},
) {
  const line = cmdParseLine(query, DUMMY_SETTINGS);
  const { groups } = lineChips(query);
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SegmentedRail
        line={line}
        groups={groups}
        expandedIndex={expandedIndex}
        onSelectTab={handlers.onSelectTab ?? vi.fn()}
        onRemoveItem={handlers.onRemoveItem ?? vi.fn()}
        onDuplicateItem={handlers.onDuplicateItem}
        onAddItem={handlers.onAddItem ?? vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("SegmentedRail", () => {
  it("renders nothing for single-item queries", () => {
    const { container } = renderRail("hea120 6m x2");
    expect(container.firstChild).toBeNull();
  });

  it("renders tabs with tablist and tab roles for multi-item lines", () => {
    renderRail("hea120 6m x2 + upn140 4m x4", 0);
    expect(screen.getByRole("tablist")).toBeDefined();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toContain("HEA 120");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].textContent).toContain("UPN 140");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
  });

  it("calls onSelectTab when a tab is clicked", () => {
    const onSelectTab = vi.fn();
    renderRail("hea120 6m x2 + upn140 4m x4", 0, { onSelectTab });
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]);
    expect(onSelectTab).toHaveBeenCalledWith(1);
  });

  it("navigates tabs with ArrowRight and ArrowLeft", () => {
    const onSelectTab = vi.fn();
    renderRail("hea120 6m x2 + upn140 4m x4", 0, { onSelectTab });
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(onSelectTab).toHaveBeenCalledWith(1);

    fireEvent.keyDown(tabs[1], { key: "ArrowLeft" });
    expect(onSelectTab).toHaveBeenCalledWith(0);
  });

  it("calls onRemoveItem when close button on a tab is clicked", () => {
    const onRemoveItem = vi.fn();
    renderRail("hea120 6m x2 + upn140 4m x4", 0, { onRemoveItem });
    const removeButtons = screen.getAllByLabelText(/Remove item/);
    fireEvent.click(removeButtons[0]);
    expect(onRemoveItem).toHaveBeenCalledWith(0);
  });

  it("calls onDuplicateItem when duplicate button on a tab is clicked", () => {
    const onDuplicateItem = vi.fn();
    renderRail("hea120 6m x2 + upn140 4m x4", 0, { onDuplicateItem });
    const dupButtons = screen.getAllByLabelText(/Duplicate item/);
    expect(dupButtons).toHaveLength(2);
    fireEvent.click(dupButtons[0]);
    expect(onDuplicateItem).toHaveBeenCalledWith(0);
  });

  it("calls onAddItem when Add button is clicked", () => {
    const onAddItem = vi.fn();
    renderRail("hea120 6m x2 + upn140 4m x4", 0, { onAddItem });
    const addBtn = screen.getByLabelText("Add item");
    fireEvent.click(addBtn);
    expect(onAddItem).toHaveBeenCalled();
  });
});
