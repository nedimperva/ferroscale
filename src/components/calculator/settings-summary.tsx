import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { getMaterialGradeById } from "@/lib/datasets/materials";

interface SettingsSummaryProps {
  input: CalculationInput;
  onOpen: () => void;
}

type TagTone = "neutral" | "accent" | "green" | "amber";

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
  const wasteTag = input.wastePercent > 0 ? `${input.wastePercent}%` : null;
  const vatTag = input.includeVat ? `${input.vatPercent}%` : null;

  const { weightDecimals: w, priceDecimals: p, dimensionDecimals: d } = input.rounding;
  const isDefaultRounding = w === 2 && p === 2 && d === 2;
  const fmtExample = (dec: number, sample: number) => sample.toFixed(dec);
  const roundTags = isDefaultRounding
    ? []
    : [
        { prefix: t("weight"), label: `${fmtExample(w, 12.3)} kg`, tone: "neutral" as TagTone, muted: true },
        { prefix: t("price"), label: `${fmtExample(p, 49.9)} €`, tone: "neutral" as TagTone, muted: true },
        { prefix: t("dimension"), label: `${fmtExample(d, 5.7)} mm`, tone: "neutral" as TagTone, muted: true },
      ];

  const tags: { prefix?: string; label: string; tone: TagTone; muted?: boolean }[] = [
    { prefix: t("grade"), label: gradeLabel, tone: "neutral" },
    ...(density ? [{ prefix: t("density"), label: density, tone: "neutral" as TagTone }] : []),
    { prefix: t("price"), label: priceTag, tone: "accent" },
    ...(wasteTag ? [{ prefix: t("waste"), label: wasteTag, tone: "amber" as TagTone }] : []),
    ...(vatTag ? [{ prefix: t("vat"), label: vatTag, tone: "green" as TagTone }] : []),
    ...roundTags,
  ];

  const toneClass = (tone: TagTone, muted?: boolean) => {
    if (muted) return "border-border-faint bg-surface-inset text-muted-faint";
    switch (tone) {
      case "accent":
        return "border-accent-border bg-accent-surface text-accent-text";
      case "green":
        return "border-green-border bg-green-surface text-green-text";
      case "amber":
        return "border-amber-border bg-amber-surface text-amber-text";
      case "neutral":
      default:
        return "border-border-faint bg-surface-inset text-foreground-secondary";
    }
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-2.5 rounded-2xl border border-border-faint bg-surface px-2.5 py-2 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:border-accent-border hover:bg-accent-surface/40 md:px-3 md:py-2.5"
    >
      {/* Gear icon chip */}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-muted-faint transition-colors group-hover:text-foreground-secondary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={`${tag.prefix ?? ""}-${tag.label}`}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-medium leading-tight md:text-xs ${toneClass(tag.tone, tag.muted)}`}
          >
            {tag.prefix && (
              <span className="text-muted-faint">{tag.prefix}</span>
            )}
            <span className="font-semibold">{tag.label}</span>
          </span>
        ))}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center rounded-lg border border-accent-border bg-accent-surface px-2.5 py-1.5 text-xs font-semibold text-accent-text transition-colors group-hover:bg-accent group-hover:text-white">
        {t("edit")}
      </span>
    </button>
  );
});
