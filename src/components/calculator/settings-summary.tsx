import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { getMaterialGradeById } from "@/lib/datasets/materials";

interface SettingsSummaryProps {
  input: CalculationInput;
  onOpen: () => void;
}

export const SettingsSummary = memo(function SettingsSummary({
  input,
  onOpen,
}: SettingsSummaryProps) {
  const t = useTranslations("settingsSummary");
  const grade = getMaterialGradeById(input.materialGradeId);
  const gradeLabel = grade?.label ?? input.materialGradeId;
  const density = input.useCustomDensity
    ? `${input.customDensityKgPerM3 ?? "?"} kg/m³`
    : null;

  const priceTag = `${input.unitPrice} ${CURRENCY_SYMBOLS[input.currency]}/${input.priceUnit}`;
  const wasteTag = input.wastePercent > 0 ? `+${input.wastePercent}% waste` : null;
  const vatTag = input.includeVat ? `VAT ${input.vatPercent}%` : null;

  const { weightDecimals: w, priceDecimals: p, dimensionDecimals: d } = input.rounding;
  const isDefaultRounding = w === 2 && p === 2 && d === 2;
  const fmtExample = (dec: number, sample: number) => sample.toFixed(dec);
  const roundTags = isDefaultRounding
    ? []
    : [
        { prefix: t("weight"), label: `${fmtExample(w, 12.3)} kg`, muted: true },
        { prefix: t("price"), label: `${fmtExample(p, 49.9)} €`, muted: true },
        { prefix: t("dimension"), label: `${fmtExample(d, 5.7)} mm`, muted: true },
      ];

  const tags: { prefix?: string; label: string; muted?: boolean }[] = [
    { prefix: t("grade"), label: gradeLabel },
    ...(density ? [{ prefix: t("density"), label: density }] : []),
    { prefix: t("price"), label: priceTag },
    ...(wasteTag ? [{ prefix: t("waste"), label: `${input.wastePercent}%` }] : []),
    ...(vatTag ? [{ prefix: t("vat"), label: `${input.vatPercent}%` }] : []),
    ...roundTags,
  ];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised px-3 py-2.5 text-left shadow-sm transition-colors hover:border-accent/40 hover:bg-accent-surface"
    >
      {/* gear icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0 text-muted-faint transition-colors group-hover:text-foreground-secondary"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="flex min-w-0 flex-1 flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] leading-tight ${
              tag.muted
                ? "bg-surface-inset text-muted-faint"
                : "bg-surface-inset text-foreground-secondary"
            }`}
          >
            {tag.prefix && (
              <span className="text-muted-faint">{tag.prefix}</span>
            )}
            {tag.label}
          </span>
        ))}
      </span>
      <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-faint transition-colors group-hover:text-foreground-secondary">
        {t("edit")}
      </span>
    </button>
  );
});
