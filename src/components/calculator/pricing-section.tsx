import { memo } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pricing");
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></svg>
        {t("title")}
      </h3>

      {/* Live preview */}
      <div className="rounded-lg bg-accent-surface px-3 py-2 text-xs text-foreground-secondary">
        <span className="font-medium text-accent">{input.unitPrice} {CURRENCY_SYMBOLS[input.currency]}/{input.priceUnit}</span>
        {input.wastePercent > 0 && (
          <><span className="mx-1.5 text-muted-faint">·</span><span>{t("wastePreview", { value: input.wastePercent })}</span></>
        )}
        {input.includeVat && (
          <><span className="mx-1.5 text-muted-faint">·</span><span>{t("vatPreview", { value: input.vatPercent })}</span></>
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
            {t("basis")}
          </label>
          <select
            id="price-basis"
            value={input.priceBasis}
            onChange={(e) =>
              dispatch({ type: "SET_PRICE_BASIS", priceBasis: e.target.value as PriceBasis })
            }
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
          >
            <option value="weight">{t("basisWeight")}</option>
            <option value="length">{t("basisLength")}</option>
            <option value="piece">{t("basisPiece")}</option>
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="unit-price" className="text-xs font-medium text-foreground-secondary">
            {t("unitPrice")}
          </label>
          <div className="flex min-w-0">
            <NumericInput
              id="unit-price"
              inputMode="decimal"
              autoComplete="off"
              value={input.unitPrice}
              onValueChange={(value) => dispatch({ type: "SET_UNIT_PRICE", value })}
              className={`h-10 min-w-0 flex-1 rounded-l-md border bg-surface px-2 text-sm transition-colors focus:border-blue-500 ${hasIssue("unitPrice") ? "border-red-400" : "border-border-strong"
                }`}
              aria-invalid={hasIssue("unitPrice")}
            />
            <select
              id="price-unit"
              value={input.priceUnit}
              onChange={(e) =>
                dispatch({ type: "SET_PRICE_UNIT", priceUnit: e.target.value as PriceUnit })
              }
              className={`h-10 shrink-0 rounded-r-md border border-l-0 bg-surface px-1.5 text-xs transition-colors focus:border-blue-500 ${hasIssue("priceUnit") ? "border-red-400" : "border-border-strong"
                }`}
              aria-label={t("priceUnitAria")}
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
            {t("currency")}
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
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
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
            {t("waste")}
          </label>
          <NumericInput
            id="waste"
            inputMode="decimal"
            autoComplete="off"
            value={input.wastePercent}
            onValueChange={(value) => dispatch({ type: "SET_WASTE", value })}
            className={`h-10 min-w-0 rounded-md border bg-surface px-2 text-sm transition-colors focus:border-blue-500 ${hasIssue("wastePercent") ? "border-red-400" : "border-border-strong"
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
          {t("vat")}
        </label>
        {input.includeVat && (
          <NumericInput
            id="vat-percent"
            aria-label={t("vatPercentAria")}
            inputMode="decimal"
            autoComplete="off"
            value={input.vatPercent}
            onValueChange={(value) => dispatch({ type: "SET_VAT_PERCENT", value })}
            className={`h-10 w-16 rounded-md border bg-surface px-2 text-center text-sm transition-colors focus:border-blue-500 ${hasIssue("vatPercent") ? "border-red-400" : "border-border-strong"
              }`}
            aria-invalid={hasIssue("vatPercent")}
          />
        )}
      </div>
    </section>
  );
});
