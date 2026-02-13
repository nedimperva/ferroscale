import { memo } from "react";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { parseNumber } from "@/hooks/useCalculator";

interface PrecisionSectionProps {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
}

export const PrecisionSection = memo(function PrecisionSection({
  input,
  dispatch,
}: PrecisionSectionProps) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-semibold text-slate-900">Precision</h3>
      <div className="grid gap-3 grid-cols-3">
        <div className="grid gap-1.5">
          <label htmlFor="round-weight" className="text-xs font-medium text-slate-700">
            Weight
          </label>
          <input
            id="round-weight"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={0}
            max={6}
            step={1}
            value={input.rounding.weightDecimals}
            onChange={(e) =>
              dispatch({ type: "SET_ROUNDING_WEIGHT", value: parseNumber(e.target.value) })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="round-price" className="text-xs font-medium text-slate-700">
            Price
          </label>
          <input
            id="round-price"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={0}
            max={6}
            step={1}
            value={input.rounding.priceDecimals}
            onChange={(e) =>
              dispatch({ type: "SET_ROUNDING_PRICE", value: parseNumber(e.target.value) })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="round-dimension" className="text-xs font-medium text-slate-700">
            Dimension
          </label>
          <input
            id="round-dimension"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            min={0}
            max={6}
            step={1}
            value={input.rounding.dimensionDecimals}
            onChange={(e) =>
              dispatch({
                type: "SET_ROUNDING_DIMENSION",
                value: parseNumber(e.target.value),
              })
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
    </section>
  );
});
