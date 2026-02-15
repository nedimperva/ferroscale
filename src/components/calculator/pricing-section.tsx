import { memo } from "react";
import type {
  CalculationInput,
  PriceBasis,
  PriceUnit,
  ValidationIssue,
} from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { NumericInput } from "./numeric-input";

const CURRENCIES: CalculationInput["currency"][] = ["EUR", "USD", "GBP", "PLN", "BAM"];
const WEIGHT_UNITS: PriceUnit[] = ["kg", "lb"];
const LENGTH_PRICE_UNITS: PriceUnit[] = ["m", "ft"];

interface PricingSectionProps {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  issues: ValidationIssue[];
}

export const PricingSection = memo(function PricingSection({
  input,
  dispatch,
  issues,
}: PricingSectionProps) {
  const hasIssue = (field: string) => issues.some((i) => i.field === field);

  const priceUnitsForBasis: PriceUnit[] =
    input.priceBasis === "weight"
      ? WEIGHT_UNITS
      : input.priceBasis === "length"
        ? LENGTH_PRICE_UNITS
        : ["piece"];

  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {/* tag icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
        Pricing
      </h3>

      {/* Live preview */}
      <div className="rounded-lg bg-accent-surface px-3 py-2 text-xs text-foreground-secondary">
        <span className="font-medium text-accent">{input.unitPrice} {CURRENCY_SYMBOLS[input.currency]}/{input.priceUnit}</span>
        {input.wastePercent > 0 && (
          <><span className="mx-1.5 text-muted-faint">·</span><span>+{input.wastePercent}% waste</span></>
        )}
        {input.includeVat && (
          <><span className="mx-1.5 text-muted-faint">·</span><span>+{input.vatPercent}% VAT</span></>
        )}
        {(input.wastePercent > 0 || input.includeVat) && (
          <>
            <span className="mx-1.5 text-muted-faint">→</span>
            <span className="font-medium">
              ×{((1 + input.wastePercent / 100) * (input.includeVat ? 1 + input.vatPercent / 100 : 1)).toFixed(3)}
            </span>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label htmlFor="price-basis" className="text-xs font-medium text-foreground-secondary">
            Basis
          </label>
          <select
            id="price-basis"
            value={input.priceBasis}
            onChange={(e) =>
              dispatch({ type: "SET_PRICE_BASIS", priceBasis: e.target.value as PriceBasis })
            }
            className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm"
          >
            <option value="weight">Weight</option>
            <option value="length">Length</option>
            <option value="piece">Piece</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="unit-price" className="text-xs font-medium text-foreground-secondary">
            Unit price
          </label>
          <div className="flex min-w-0">
            <NumericInput
              id="unit-price"
              inputMode="decimal"
              autoComplete="off"
              value={input.unitPrice}
              onValueChange={(value) => dispatch({ type: "SET_UNIT_PRICE", value })}
              className={`h-9 min-w-0 flex-1 rounded-l-md border bg-surface px-2 text-sm ${
                hasIssue("unitPrice") ? "border-red-400" : "border-border-strong"
              }`}
              aria-invalid={hasIssue("unitPrice")}
            />
            <select
              id="price-unit"
              value={input.priceUnit}
              onChange={(e) =>
                dispatch({ type: "SET_PRICE_UNIT", priceUnit: e.target.value as PriceUnit })
              }
              className={`h-9 shrink-0 rounded-r-md border-y border-r bg-surface-raised px-1.5 text-xs ${
                hasIssue("priceUnit") ? "border-red-400" : "border-border-strong"
              }`}
              aria-label="Price unit"
            >
              {priceUnitsForBasis.map((u) => (
                <option key={u} value={u}>
                  /{u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-1">
          <label htmlFor="currency" className="text-xs font-medium text-foreground-secondary">
            Currency
          </label>
          <select
            id="currency"
            value={input.currency}
            onChange={(e) =>
              dispatch({
                type: "SET_CURRENCY",
                currency: e.target.value as CalculationInput["currency"],
              })
            }
            className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_SYMBOLS[c]} {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="waste" className="text-xs font-medium text-foreground-secondary">
            Waste %
          </label>
          <NumericInput
            id="waste"
            inputMode="decimal"
            autoComplete="off"
            value={input.wastePercent}
            onValueChange={(value) => dispatch({ type: "SET_WASTE", value })}
            className={`h-9 min-w-0 rounded-md border bg-surface px-2 text-sm ${
                hasIssue("wastePercent") ? "border-red-400" : "border-border-strong"
            }`}
            aria-invalid={hasIssue("wastePercent")}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 text-xs font-medium">
          <input
            type="checkbox"
            checked={input.includeVat}
            onChange={(e) =>
              dispatch({ type: "SET_VAT_TOGGLE", value: e.target.checked })
            }
          />
          VAT
        </label>
        {input.includeVat && (
          <NumericInput
            id="vat-percent"
            aria-label="VAT percent"
            inputMode="decimal"
            autoComplete="off"
            value={input.vatPercent}
            onValueChange={(value) => dispatch({ type: "SET_VAT_PERCENT", value })}
            className={`h-8 w-16 rounded-md border bg-surface px-2 text-center text-sm ${
              hasIssue("vatPercent") ? "border-red-400" : "border-border-strong"
            }`}
            aria-invalid={hasIssue("vatPercent")}
          />
        )}
      </div>
    </section>
  );
});
