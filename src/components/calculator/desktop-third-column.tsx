"use client";

import { memo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CalculationInput } from "@/lib/calculator/types";
import type { DesktopThirdTab } from "@/lib/external-stores";
import { desktopThirdTabStore } from "@/lib/external-stores";
import { HistoryPanel } from "./history-panel";
import { ReferenceList } from "./reference-list";
import { triggerHaptic } from "@/lib/haptics";

interface DesktopThirdColumnProps {
  tab: DesktopThirdTab;
  saved: SavedEntry[];
  onLoad: (input: CalculationInput) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { name?: string; notes?: string }) => void;
  referenceLabels: string[];
}

export const DesktopThirdColumn = memo(function DesktopThirdColumn({
  tab,
  saved,
  onLoad,
  onRemove,
  onUpdate,
  referenceLabels,
}: DesktopThirdColumnProps) {
  const t = useTranslations("workspace");
  const tSaved = useTranslations("saved");
  const tRef = useTranslations();

  const setTab = useCallback((next: DesktopThirdTab) => {
    triggerHaptic("light");
    desktopThirdTabStore.set(next);
  }, []);

  return (
    <section className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex shrink-0 gap-1 border-b border-border-faint p-1.5">
        <button
          type="button"
          onClick={() => setTab("saved")}
          className={`flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
            tab === "saved"
              ? "bg-accent-surface text-accent"
              : "text-muted hover:bg-surface-inset hover:text-foreground-secondary"
          }`}
        >
          {tSaved("title")}
        </button>
        <button
          type="button"
          onClick={() => setTab("references")}
          className={`flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
            tab === "references"
              ? "bg-accent-surface text-accent"
              : "text-muted hover:bg-surface-inset hover:text-foreground-secondary"
          }`}
        >
          {tRef("references.title")}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-native p-3">
        {tab === "saved" ? (
          <HistoryPanel saved={saved} onLoad={onLoad} onRemove={onRemove} onUpdate={onUpdate} />
        ) : referenceLabels.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-faint">{t("thirdColumnReferencesEmpty")}</p>
        ) : (
          <ReferenceList labels={referenceLabels} className="text-xs text-muted" />
        )}
      </div>
    </section>
  );
});
