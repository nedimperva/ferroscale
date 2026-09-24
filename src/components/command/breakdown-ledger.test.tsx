// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { cmdParseLine } from "@ferroscale/metal-core";
import type { CommandParserSettings } from "@ferroscale/metal-core";
import { BreakdownLedger } from "./breakdown-ledger";
import { showSectionPropertiesStore } from "@/lib/settings-stores";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  showSectionPropertiesStore.set(false);
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

  it("shows one piece beside all of them inside the sheet's tabs", () => {
    const { container } = renderLedger("hea120 6m x2", { variant: "sheet" });
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("1 piece")).toBeDefined();
    expect(within(panel).getByText("× 2 pieces")).toBeDefined();
    // The per-piece and piece-count rows are gone: the two columns say both.
    expect(container.querySelector('[data-row="perPieceWeight"]')).toBeNull();
    expect(container.querySelector('[data-row="pieces"]')).toBeNull();
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

  it("lays both ledgers open on the desk rail, one piece beside all of them", () => {
    const { container } = renderLedger("hea120 6m x2", { variant: "rail" });
    expect(screen.queryByRole("tab")).toBeNull();
    const weight = screen.getByRole("region", { name: "Weight" });
    const cost = screen.getByRole("region", { name: "Cost" });
    expect(within(weight).getByText("1 piece")).toBeDefined();
    expect(within(weight).getByText("× 2 pieces")).toBeDefined();
    // Each total row carries the piece and the whole; the whole is twice the piece.
    const [each, all] = Array.from(container.querySelectorAll('[data-row="totalWeight"] > span > span:last-child'))
      .map((el) => Number(el.textContent!.replace(/[^0-9.]/g, "")));
    expect(all).toBeCloseTo(each * 2, 1);
    expect(within(cost).getByText("Total cost")).toBeDefined();
    // Mass per metre is the same for one piece as for all: one figure, no pair.
    expect(container.querySelectorAll('[data-row="massPerMetre"] > span')).toHaveLength(2);
  });

  it("drops the per-piece column for a single piece", () => {
    renderLedger("hea120 6m", { variant: "rail" });
    expect(screen.queryByText("1 piece")).toBeNull();
    expect(screen.getByRole("region", { name: "Weight" }).textContent).toContain("Total weight");
  });

  it("gives an assembly on the rail weight and cost for every part, and one total for both", () => {
    const { container } = renderLedger("hea120 6m x2 + ipe200 4m", { variant: "rail" });
    const parts = screen.getByRole("list", { name: "Assembly parts" });
    const first = within(parts).getByRole("button", { name: /Part 1: HEA 120/ });
    expect(first.textContent).toMatch(/kg/);
    expect(first.textContent).toMatch(/€/);
    expect(container.querySelector('[data-row="totalWeight"]')!.textContent).toMatch(/kg$/);
    expect(container.querySelector('[data-row="totalCost"]')!.textContent).toMatch(/^€/);
    // No waste, VAT or margin: a build-up would only repeat the total.
    expect(screen.queryByRole("region", { name: "Cost build-up" })).toBeNull();
  });

  it("steps through parts from the rail's scope switch", () => {
    const onPick = vi.fn();
    renderLedger("hea120 6m x2 + ipe200 4m", { variant: "rail", picked: 0, onPick });
    fireEvent.click(screen.getByRole("button", { name: /Part 1: HEA 120/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next part: IPE 200" }));
    expect(onPick).toHaveBeenLastCalledWith(1);
  });

  it("leaves section properties out unless the setting is on", () => {
    const { container } = renderLedger("ipe200 6m s235", { variant: "rail" });
    expect(container.querySelector("[data-section-properties]")).toBeNull();
  });

  it("folds a standard section's catalogue properties, with the source, when asked", () => {
    showSectionPropertiesStore.set(true);
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
    showSectionPropertiesStore.set(true);
    const { container } = renderLedger("shs40x40x3 6m", { variant: "rail" });
    expect(container.querySelector("[data-section-properties]")).toBeNull();
  });
});
