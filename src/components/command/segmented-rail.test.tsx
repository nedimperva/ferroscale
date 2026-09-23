// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
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
    variant?: "stepper" | "segments";
    onSelectTab?: (i: number) => void;
    onRemoveItem?: (i: number) => void;
    onDuplicateItem?: (i: number) => void;
    onMoveItem?: (from: number, to: number) => void;
    onAddItem?: () => void;
    /** Item weights to stand in for the parse's, which these settings leave null. */
    kg?: number[];
  } = {},
) {
  const parsed = cmdParseLine(query, DUMMY_SETTINGS);
  const line = handlers.kg
    ? {
        ...parsed,
        items: parsed.items.map((item, i) => ({
          ...item,
          parse: { ...item.parse, totalKg: handlers.kg?.[i] ?? null },
        })),
      }
    : parsed;
  const { groups } = lineChips(query);
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SegmentedRail
        line={line}
        groups={groups}
        expandedIndex={expandedIndex}
        variant={handlers.variant ?? "segments"}
        onSelectTab={handlers.onSelectTab ?? vi.fn()}
        onRemoveItem={handlers.onRemoveItem ?? vi.fn()}
        onDuplicateItem={handlers.onDuplicateItem}
        onMoveItem={handlers.onMoveItem}
        onAddItem={handlers.onAddItem ?? vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

const TWO = "hea120 6m x2 + upn140 4m x4";
const THREE = "hea120 6m x2 + ipe200 4m + shs80x4 3m";

describe("SegmentedRail", () => {
  it("renders nothing for single-item queries", () => {
    const { container } = renderRail("hea120 6m x2");
    expect(container.firstChild).toBeNull();
  });

  describe("segments (desk)", () => {
    it("shows every item as a pressable segment, not an ARIA tab", () => {
      renderRail(TWO, 0);
      expect(screen.queryByRole("tablist")).toBeNull();
      const group = screen.getByRole("group", { name: "Line items" });
      const segments = within(group).getAllByRole("button");
      expect(segments).toHaveLength(2);
      expect(segments[0].textContent).toContain("HEA 120");
      expect(segments[0].getAttribute("aria-pressed")).toBe("true");
      expect(segments[1].textContent).toContain("UPN 140");
      expect(segments[1].getAttribute("aria-pressed")).toBe("false");
    });

    it("sizes each segment by its share of the weight", () => {
      renderRail(TWO, 0, { kg: [300, 100] });
      const [a, b] = within(screen.getByRole("group", { name: "Line items" })).getAllByRole("button");
      // jsdom keeps the shorthand as written; its first number is the grow.
      const grow = (el: HTMLElement) => parseFloat(el.style.flex);
      expect(grow(a)).toBeGreaterThan(grow(b));
    });

    it("selects on click and walks with the arrow keys", () => {
      const onSelectTab = vi.fn();
      renderRail(TWO, 0, { onSelectTab });
      const [first, second] = within(screen.getByRole("group", { name: "Line items" })).getAllByRole("button");
      fireEvent.click(second);
      expect(onSelectTab).toHaveBeenCalledWith(1);
      fireEvent.keyDown(first, { key: "ArrowRight" });
      expect(onSelectTab).toHaveBeenLastCalledWith(1);
      fireEvent.keyDown(first, { key: "ArrowLeft" });
      expect(onSelectTab).toHaveBeenLastCalledWith(1);
    });

    it("duplicates and removes the selected item only", () => {
      const onRemoveItem = vi.fn();
      const onDuplicateItem = vi.fn();
      renderRail(TWO, 1, { onRemoveItem, onDuplicateItem });
      expect(screen.getAllByLabelText(/Remove item/)).toHaveLength(1);
      fireEvent.click(screen.getByLabelText("Remove item 2"));
      expect(onRemoveItem).toHaveBeenCalledWith(1);
      fireEvent.click(screen.getByLabelText("Duplicate item 2"));
      expect(onDuplicateItem).toHaveBeenCalledWith(1);
    });

    it("adds an item", () => {
      const onAddItem = vi.fn();
      renderRail(TWO, 0, { onAddItem });
      fireEvent.click(screen.getByRole("button", { name: /Add item/ }));
      expect(onAddItem).toHaveBeenCalled();
    });
  });

  describe("stepper (phone)", () => {
    it("names the neighbours and the place in the line", () => {
      renderRail(THREE, 1, { variant: "stepper" });
      expect(screen.getByRole("button", { name: "Previous item: HEA 120" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Next item: SHS 80×4" })).toBeDefined();
      expect(screen.getByRole("button", { name: /^Item 2 of 3: IPE 200/ })).toBeDefined();
    });

    it("steps to the previous and next item", () => {
      const onSelectTab = vi.fn();
      renderRail(THREE, 1, { variant: "stepper", onSelectTab });
      fireEvent.click(screen.getByRole("button", { name: /^Previous item/ }));
      expect(onSelectTab).toHaveBeenCalledWith(0);
      fireEvent.click(screen.getByRole("button", { name: /^Next item/ }));
      expect(onSelectTab).toHaveBeenLastCalledWith(2);
    });

    it("opens a sheet listing every item, and picking one closes it", () => {
      const onSelectTab = vi.fn();
      renderRail(THREE, 1, { variant: "stepper", onSelectTab });
      fireEvent.click(screen.getByRole("button", { name: /^Item 2 of 3/ }));
      const sheet = screen.getByRole("dialog", { name: "Line items" });
      const options = within(sheet).getAllByRole("button", { name: /^Item \d, / });
      expect(options).toHaveLength(3);
      expect(options[1].getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(options[0]);
      expect(onSelectTab).toHaveBeenCalledWith(0);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("moves, duplicates and removes the current item from the sheet", () => {
      const onMoveItem = vi.fn();
      const onDuplicateItem = vi.fn();
      const onRemoveItem = vi.fn();
      renderRail(THREE, 1, { variant: "stepper", onMoveItem, onDuplicateItem, onRemoveItem });
      fireEvent.click(screen.getByRole("button", { name: /^Item 2 of 3/ }));
      fireEvent.click(screen.getByRole("button", { name: "Earlier" }));
      expect(onMoveItem).toHaveBeenCalledWith(1, 0);
      fireEvent.click(screen.getByRole("button", { name: "Later" }));
      expect(onMoveItem).toHaveBeenLastCalledWith(1, 2);
      fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
      expect(onDuplicateItem).toHaveBeenCalledWith(1);
      fireEvent.click(screen.getByRole("button", { name: /^Item 2 of 3/ }));
      fireEvent.click(screen.getByRole("button", { name: "Remove item 2" }));
      expect(onRemoveItem).toHaveBeenCalledWith(1);
    });

    it("closes the sheet on Escape", () => {
      renderRail(THREE, 1, { variant: "stepper" });
      fireEvent.click(screen.getByRole("button", { name: /^Item 2 of 3/ }));
      expect(screen.getByRole("dialog")).toBeDefined();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
