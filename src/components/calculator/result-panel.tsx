"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationResult } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ResultContent } from "./result-content";

interface ResultPanelProps {
  result: CalculationResult | null;
  isPending: boolean;
  onStar: () => void;
  isStarred: boolean;
  includeVat: boolean;
  wastePercent: number;
  vatPercent: number;
  onCompare?: () => void;
  canCompare?: boolean;
  isInCompare?: boolean;
  compareCount?: number;
  maxCompare?: number;
  onAddToProject?: () => void;
  hasProjects?: boolean;
  normalizedProfile?: NormalizedProfileSnapshot | null;
  weightAsMain?: boolean;
}

export const ResultPanel = memo(function ResultPanel({
  result,
  isPending,
  onStar,
  isStarred,
  includeVat,
  wastePercent,
  vatPercent,
  onCompare,
  canCompare = false,
  isInCompare = false,
  compareCount = 0,
  maxCompare = 3,
  onAddToProject,
  hasProjects = false,
  normalizedProfile = null,
  weightAsMain = false,
}: ResultPanelProps) {
  const t = useTranslations("result");

  if (!result) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-muted-faint">{t("title")}</h2>
        <div className="mt-6 flex flex-col items-center gap-2 py-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-border">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
          </svg>
          <p className="text-sm text-muted-faint">
            {t("empty")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border bg-surface transition-opacity duration-200 ${
        isPending ? "border-border opacity-60" : "border-border"
      }`}
    >
      <ResultContent
        result={result}
        includeVat={includeVat}
        wastePercent={wastePercent}
        vatPercent={vatPercent}
        isStarred={isStarred}
        onStar={onStar}
        onCompare={onCompare}
        canCompare={canCompare}
        isInCompare={isInCompare}
        compareCount={compareCount}
        maxCompare={maxCompare}
        onAddToProject={onAddToProject}
        hasProjects={hasProjects}
        normalizedProfile={normalizedProfile}
        weightAsMain={weightAsMain}
      />
    </section>
  );
});
