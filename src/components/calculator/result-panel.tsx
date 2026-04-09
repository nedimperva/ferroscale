"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { CalculationResult, UnitValue } from "@/lib/calculator/types";
import type { NormalizedProfileSnapshot } from "@/lib/profiles/normalize";
import { ResultContent, type ResultLayoutMode } from "./result-content";
import { EmptyState } from "@/components/ui/empty-state";

interface ResultPanelProps {
  result: CalculationResult | null;
  /** Piece length as entered (for chips); falls back to mm from result when absent. */
  pieceLength?: UnitValue | null;
  isPending: boolean;
  isSaved: boolean;
  onOpenSaveDialog: () => void;
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
  layout?: ResultLayoutMode;
}

export const ResultPanel = memo(function ResultPanel({
  result,
  pieceLength = null,
  isPending,
  isSaved,
  onOpenSaveDialog,
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
  layout = "standalone",
}: ResultPanelProps) {
  const t = useTranslations("result");
  const sectionClassName =
    layout === "standalone"
      ? `overflow-hidden rounded-xl border bg-surface transition-opacity duration-200 ${
          isPending ? "border-border opacity-60" : "border-border"
        }`
      : `h-full bg-surface transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`;

  if (!result) {
    return (
      <section
        data-result-layout={layout}
        className={
          layout === "standalone"
            ? "rounded-xl border border-border bg-surface p-5"
            : "h-full bg-surface p-5"
        }
      >
        <h2 className="text-sm font-semibold text-muted-faint">{t("title")}</h2>
        <div className="mt-4">
          <EmptyState
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
              </svg>
            }
            title={t("empty")}
          />
        </div>
      </section>
    );
  }

  return (
    <section data-result-layout={layout} className={sectionClassName}>
      <ResultContent
        result={result}
        pieceLength={pieceLength}
        includeVat={includeVat}
        wastePercent={wastePercent}
        vatPercent={vatPercent}
        isSaved={isSaved}
        onOpenSaveDialog={onOpenSaveDialog}
        onCompare={onCompare}
        canCompare={canCompare}
        isInCompare={isInCompare}
        compareCount={compareCount}
        maxCompare={maxCompare}
        onAddToProject={onAddToProject}
        hasProjects={hasProjects}
        normalizedProfile={normalizedProfile}
        weightAsMain={weightAsMain}
        layout={layout}
      />
    </section>
  );
});
