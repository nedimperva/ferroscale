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
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="price-basis" className="text-xs font-medium text-slate-700">
            Price basis
          </label>
          <select
            id="price-basis"
            value={input.priceBasis}
            onChange={(e) =>
              dispatch({ type: "SET_PRICE_BASIS", priceBasis: e.target.value as PriceBasis })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="weight">Weight</option>
            <option value="length">Length</option>
            <option value="piece">Piece</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="price-unit" className="text-xs font-medium text-slate-700">
            Price unit
          </label>
          <select
            id="price-unit"
            value={input.priceUnit}
            onChange={(e) =>
              dispatch({ type: "SET_PRICE_UNIT", priceUnit: e.target.value as PriceUnit })
            }
            className={`rounded-md border bg-white px-3 py-2 text-sm ${
              hasIssue("priceUnit") ? "border-red-400" : "border-slate-300"
            }`}
          >
            {priceUnitsForBasis.map((u) => (
              <option key={u} value={u}>
                per {u}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="unit-price" className="text-xs font-medium text-slate-700">
            Unit price
          </label>
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
            className={`rounded-md border bg-white px-3 py-2 text-sm ${
              hasIssue("unitPrice") ? "border-red-400" : "border-slate-300"
            }`}
          />
        </div>
        <div className="grid gap-1.5">
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
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="waste" className="text-xs font-medium text-slate-700">
            Waste / scrap %
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
            className={`rounded-md border bg-white px-3 py-2 text-sm ${
              hasIssue("wastePercent") ? "border-red-400" : "border-slate-300"
            }`}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="inline-flex items-center gap-2 pt-5 text-xs font-medium">
            <input
              type="checkbox"
              checked={input.includeVat}
              onChange={(e) =>
                dispatch({ type: "SET_VAT_TOGGLE", value: e.target.checked })
              }
            />
            Include VAT
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
              className={`rounded-md border bg-white px-3 py-2 text-sm ${
                hasIssue("vatPercent") ? "border-red-400" : "border-slate-300"
              }`}
            />
          )}
        </div>
      </div>
    </section>
  );
});
