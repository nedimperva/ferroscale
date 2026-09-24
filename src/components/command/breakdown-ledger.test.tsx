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
  it("puts the headline's group first", () => {
    renderLedger("hea120 6m x2", { metric: "weight" });
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Weight", "Cost"]);
    cleanup();
    renderLedger("hea120 6m x2", { metric: "price" });
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Cost", "Weight"]);
  });

  it("shows one piece beside all of them, with no tabs", () => {
    const { container } = renderLedger("hea120 6m x2");
    expect(screen.queryByRole("tab")).toBeNull();
    const weight = screen.getByRole("region", { name: "Weight" });
    expect(within(weight).getByText("1 piece")).toBeDefined();
    expect(within(weight).getByText("× 2 pieces")).toBeDefined();
    const [each, all] = Array.from(container.querySelectorAll('[data-row="totalWeight"] > span > span:last-child'))
      .map((el) => Number(el.textContent!.replace(/[^0-9.]/g, "")));
    expect(all).toBeCloseTo(each * 2, 1);
    // Per piece and the piece count are the columns now, not rows.
    expect(container.querySelector('[data-row="perPieceWeight"]')).toBeNull();
    expect(container.querySelector('[data-row="pieces"]')).toBeNull();
  });

  it("drops the per-piece column for a single piece", () => {
    renderLedger("hea120 6m");
    expect(screen.queryByText("1 piece")).toBeNull();
    expect(screen.getByRole("region", { name: "Weight" }).textContent).toContain("Total weight");
  });

  it("says what each figure was multiplied from", () => {
    const { container } = renderLedger("hea120 6m x2");
    expect(container.querySelector('[data-row="massPerMetre"]')!.textContent).toMatch(/cm² × 7,850 kg\/m³/);
    expect(container.querySelector('[data-row="totalWeight"]')!.textContent).toMatch(/kg\/m × 6 m/);
    expect(container.querySelector('[data-row="subtotal"]')!.textContent).toContain("weight × € 1.20/kg");
  });

  it("keeps the source folded away until asked for", () => {
    renderLedger("hea120 6m x2");
    const details = screen.getByText("How it’s calculated").closest("details")!;
    expect(details.open).toBe(false);
    expect(within(details).getByText("Formula")).toBeDefined();
  });

  it("opens an assembly on its bill of material, and a part opens its own sheet", () => {
    const onPick = vi.fn();
    renderLedger("hea120 6m x2 + ipe200 4m", { onPick });
    const parts = screen.getByRole("list", { name: "Assembly parts" });
    expect(within(parts).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("2 parts · 3 pieces").length).toBeGreaterThan(0);
    // No waste, VAT or margin: a build-up would only repeat the total.
    expect(screen.queryByRole("region", { name: "Cost build-up" })).toBeNull();

    fireEvent.click(within(parts).getByRole("button", { name: /Part 1: HEA 120/ }));
    expect(onPick).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("list", { name: "Assembly parts" })).toBeNull();
    expect(screen.getByText(/of the weight/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Assembly" }));
    expect(screen.getByRole("list", { name: "Assembly parts" })).toBeDefined();
  });

  it("tabs straight to a part from the strip, and steps between parts", () => {
    const onPick = vi.fn();
    renderLedger("hea120 6m x2 + ipe200 4m", { onPick, picked: 0 });
    const strip = screen.getByRole("group", { name: "Breakdown scope" });
    fireEvent.click(within(strip).getByRole("button", { name: "2 · IPE 200" }));
    expect(onPick).toHaveBeenLastCalledWith(1);
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
