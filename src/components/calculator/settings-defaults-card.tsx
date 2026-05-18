"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, LengthUnit } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import { getMaterialGradeById } from "@/lib/datasets/materials";

interface Props {
  input: CalculationInput;
  defaultUnit: LengthUnit;
}

/**
 * "Defaults applied" hero card for the Settings screen. Mirrors the
 * numpad-native concept: warm rounded card with a star badge, summary
 * tags for material / unit / currency / waste / VAT, restated as the
 * source of truth.
 */
export const SettingsDefaultsCard = memo(function SettingsDefaultsCard({
  input,
  defaultUnit,
}: Props) {
  const t = useTranslations("settingsDrawer");
  const tg = useTranslations("dataset");
  const grade = getMaterialGradeById(input.materialGradeId);
  const gradeLabel = grade?.label ?? input.materialGradeId;
  const familyLabel = grade ? tg(`families.${grade.familyId}`) : "";

  const currency = CURRENCY_SYMBOLS[input.currency] ?? input.currency;

  const tags: string[] = [
    familyLabel ? `${familyLabel} ${gradeLabel}` : gradeLabel,
    defaultUnit,
    currency,
  ];
  if (input.wastePercent > 0) tags.push(`${input.wastePercent}% waste`);
  if (input.includeVat && input.vatPercent > 0)
    tags.push(`VAT ${input.vatPercent}%`);

  return (
    <div className="mx-3 mt-3 rounded-2xl border border-border bg-surface p-3 shadow-[var(--panel-shadow-soft)] md:mx-4 md:p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent-text">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
          </svg>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold tracking-tight text-foreground">
              {t("defaultsAppliedTitle")}
            </span>
          </div>
          <span className="text-2xs text-muted">{t("defaultsAppliedHint")}</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-accent-surface px-2 py-0.5 text-2xs font-semibold text-accent-text"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
