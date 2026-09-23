// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { BreakdownLedger } from "./breakdown-ledger";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

const settings: CommandParserSettings = {
  pricing: {
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 1.2,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
  },
  defaultGradeId: "steel-s235jr",
  defaultLengthUnit: "m",
};

function renderLedger(
  query: string,
  opts: { metric?: "weight" | "price"; variant?: "sheet" | "rail"; picked?: number; onPick?: (i: number) => void } = {},
) {
  const line = cmdParseLine(query, settings);
  const picked = opts.picked ?? line.activeIndex;
  const p = line.items[picked].parse;
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BreakdownLedger
        p={p}
        line={line}
        picked={picked}
        onPick={opts.onPick ?? vi.fn()}
        metric={opts.metric ?? "weight"}
        variant={opts.variant ?? "sheet"}
        query={query}
        setQuery={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("BreakdownLedger", () => {
  it("opens on the hero's metric, and the other ledger is a tab away", () => {
    renderLedger("hea120 6m x2", { metric: "weight" });
    const weight = screen.getByRole("tab", { name: /^Weight/ });
    const cost = screen.getByRole("tab", { name: /^Cost/ });
    expect(weight.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("Total weight");
    fireEvent.click(cost);
    expect(cost.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toContain("Total cost");
  });

  it("opens on cost when the hero shows the price", () => {
    renderLedger("hea120 6m x2", { metric: "price" });
    expect(screen.getByRole("tab", { name: /^Cost/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps the source folded away until asked for", () => {
    renderLedger("hea120 6m x2");
    const details = screen.getByText("How it’s calculated").closest("details")!;
    expect(details.open).toBe(false);
    expect(within(details).getByText("Formula")).toBeDefined();
  });

  it("lists an assembly's parts with a ruled total, and a part opens its own ledger", () => {
    const onPick = vi.fn();
    renderLedger("hea120 6m x2 + ipe200 4m", { onPick });
    const parts = screen.getByRole("list", { name: "Assembly parts" });
    expect(within(parts).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("2 parts · 3 pieces").length).toBeGreaterThan(0);

    fireEvent.click(within(parts).getByRole("button", { name: /Part 1: HEA 120/ }));
    expect(onPick).toHaveBeenCalledWith(0);
    // The part view has a way back; the list is gone.
    expect(screen.getByRole("button", { name: "Assembly" })).toBeDefined();
    expect(screen.queryByRole("list", { name: "Assembly parts" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Assembly" }));
    expect(screen.getByRole("list", { name: "Assembly parts" })).toBeDefined();
  });

  it("gives the desk rail a scope switch instead of a back button", () => {
    renderLedger("hea120 6m x2 + ipe200 4m", { variant: "rail", picked: 1 });
    const scope = screen.getByRole("group", { name: "Breakdown scope" });
    const [whole, part] = within(scope).getAllByRole("button");
    expect(whole.getAttribute("aria-pressed")).toBe("true");
    expect(part.textContent).toContain("Part 2 · IPE 200");
    fireEvent.click(part);
    expect(screen.queryByRole("list", { name: "Assembly parts" })).toBeNull();
    expect(screen.getByText(/of the weight/)).toBeDefined();
  });

  it("folds a standard section's catalogue properties, with the source", () => {
    const { container } = renderLedger("ipe200 6m s235", { variant: "rail" });
    const fold = container.querySelector("[data-section-properties]")!;
    expect(fold).not.toBeNull();
    expect(within(fold as HTMLElement).getByText("Section properties")).toBeDefined();
    // Iy and iy are different quantities: both labels survive, case intact.
    expect(fold.querySelector('[data-row="secIy"]')!.textContent).toContain("1,943 cm⁴");
    expect(fold.querySelector('[data-row="secIyRadius"]')!.textContent).toContain("iy");
    expect(fold.querySelector('[data-row="secSource"]')!.textContent).toContain("ArcelorMittal 2024-1");
  });

  it("has no section-properties fold for a manual section", () => {
    const { container } = renderLedger("shs40x40x3 6m", { variant: "rail" });
    expect(container.querySelector("[data-section-properties]")).toBeNull();
  });
});
