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
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {/* gear icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        Precision
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="round-weight" className="flex items-center gap-1.5 text-xs text-slate-600">
          Wt
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
            className="h-8 w-12 rounded-md border border-slate-300 bg-white text-center text-sm"
          />
        </label>
        <label htmlFor="round-price" className="flex items-center gap-1.5 text-xs text-slate-600">
          Price
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
            className="h-8 w-12 rounded-md border border-slate-300 bg-white text-center text-sm"
          />
        </label>
        <label htmlFor="round-dimension" className="flex items-center gap-1.5 text-xs text-slate-600">
          Dim
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
            className="h-8 w-12 rounded-md border border-slate-300 bg-white text-center text-sm"
          />
        </label>
      </div>
    </section>
  );
});
