import { memo } from "react";
import type {
  CalculationInput,
  PriceBasis,
  PriceUnit,
  ValidationIssue,
} from "@/lib/calculator/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { parseNumber } from "@/hooks/useCalculator";

const CURRENCIES: CalculationInput["currency"][] = ["EUR", "USD", "GBP", "PLN"];
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
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {/* tag icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
        Pricing
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <label htmlFor="price-basis" className="text-xs font-medium text-slate-700">
            Basis
          </label>
          <select
            id="price-basis"
            value={input.priceBasis}
            onChange={(e) =>
              dispatch({ type: "SET_PRICE_BASIS", priceBasis: e.target.value as PriceBasis })
            }
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="weight">Weight</option>
            <option value="length">Length</option>
            <option value="piece">Piece</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="unit-price" className="text-xs font-medium text-slate-700">
            Unit price
          </label>
          <div className="flex">
            <input
              id="unit-price"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              step="any"
              min={0}
              value={input.unitPrice}
              onChange={(e) =>
                dispatch({ type: "SET_UNIT_PRICE", value: parseNumber(e.target.value) })
              }
              className={`h-9 w-full rounded-l-md border bg-white px-2 text-sm ${
                hasIssue("unitPrice") ? "border-red-400" : "border-slate-300"
              }`}
            />
            <select
              id="price-unit"
              value={input.priceUnit}
              onChange={(e) =>
                dispatch({ type: "SET_PRICE_UNIT", priceUnit: e.target.value as PriceUnit })
              }
              className={`h-9 rounded-r-md border-y border-r bg-slate-50 px-1 text-xs ${
                hasIssue("priceUnit") ? "border-red-400" : "border-slate-300"
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
          <label htmlFor="currency" className="text-xs font-medium text-slate-700">
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
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="waste" className="text-xs font-medium text-slate-700">
            Waste %
          </label>
          <input
            id="waste"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            min={0}
            max={100}
            step="any"
            value={input.wastePercent}
            onChange={(e) =>
              dispatch({ type: "SET_WASTE", value: parseNumber(e.target.value) })
            }
            className={`h-9 rounded-md border bg-white px-2 text-sm ${
              hasIssue("wastePercent") ? "border-red-400" : "border-slate-300"
            }`}
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
          <input
            aria-label="VAT percent"
            type="number"
            inputMode="decimal"
            autoComplete="off"
            min={0}
            max={35}
            step="any"
            value={input.vatPercent}
            onChange={(e) =>
              dispatch({ type: "SET_VAT_PERCENT", value: parseNumber(e.target.value) })
            }
            className={`h-8 w-16 rounded-md border bg-white px-2 text-center text-sm ${
              hasIssue("vatPercent") ? "border-red-400" : "border-slate-300"
            }`}
          />
        )}
      </div>
    </section>
  );
});
