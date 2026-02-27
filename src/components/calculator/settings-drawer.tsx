"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { CalculationInput, ValidationIssue } from "@/lib/calculator/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { MetalFamilyId } from "@/lib/datasets/types";
import { MaterialSection } from "./material-section";
import { PricingSection } from "./pricing-section";
import { PrecisionSection } from "./precision-section";
import { WorkspaceSection } from "./workspace-section";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AnimatedDrawer } from "@/components/ui/animated-drawer";
import { BottomSheet } from "@/components/ui/bottom-sheet";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  activeFamily: MetalFamilyId;
  issues: ValidationIssue[];
  onResetAll: () => void;
  historyLimit: number;
  onHistoryLimitChange: (value: number) => void;
  compareLimit: number;
  onCompareLimitChange: (value: number) => void;
  maxCompare: number;
  isCompareMobileCapped: boolean;
  showInlineMaterial: boolean;
  onToggleInlineMaterial: () => void;
  showInlinePrice: boolean;
  onToggleInlinePrice: () => void;
}

export const SettingsDrawer = memo(function SettingsDrawer({
  open,
  onClose,
  input,
  dispatch,
  activeFamily,
  issues,
  onResetAll,
  historyLimit,
  onHistoryLimitChange,
  compareLimit,
  onCompareLimitChange,
  maxCompare,
  isCompareMobileCapped,
  showInlineMaterial,
  onToggleInlineMaterial,
  showInlinePrice,
  onToggleInlinePrice,
}: SettingsDrawerProps) {
  const t = useTranslations("settingsDrawer");
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  const content = (
    <>
      {/* Drawer header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
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
          {t("title")}
        </h2>
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label={t("close")}
          >
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scroll-native safe-area-bottom">
        <div className="p-4">
          <div className="mb-3 flex justify-end">
            <LanguageSwitcher className="w-full justify-between" />
          </div>
          <MaterialSection
            input={input}
            dispatch={dispatch}
            activeFamily={activeFamily}
            issues={issues}
          />
        </div>
        <div className="h-px bg-border" />
        <div className="p-4">
          <PricingSection input={input} dispatch={dispatch} issues={issues} />
        </div>
        <div className="h-px bg-border" />
        <div className="p-4">
          <PrecisionSection input={input} dispatch={dispatch} />
        </div>
        <div className="h-px bg-border" />
        <div className="p-4">
          <WorkspaceSection
            historyLimit={historyLimit}
            onHistoryLimitChange={onHistoryLimitChange}
            compareLimit={compareLimit}
            onCompareLimitChange={onCompareLimitChange}
            maxCompare={maxCompare}
            isCompareMobileCapped={isCompareMobileCapped}
            showInlineMaterial={showInlineMaterial}
            onToggleInlineMaterial={onToggleInlineMaterial}
            showInlinePrice={showInlinePrice}
            onToggleInlinePrice={onToggleInlinePrice}
          />
        </div>
      </div>

      {/* Footer with reset */}
      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-inset"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          {t("reset")}
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()} title={t("title")}>
        {content}
      </BottomSheet>
    );
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} widthClass="w-[380px]" ariaLabel={t("ariaLabel")}>
      {content}
    </AnimatedDrawer>
  );
});
