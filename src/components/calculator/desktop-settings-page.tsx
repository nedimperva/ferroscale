"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CalculationInput, LengthUnit, ValidationIssue } from "@/lib/calculator/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { Theme } from "@/hooks/useTheme";
import type { TextSize } from "@/hooks/useTextSize";
import type { SyncStatus } from "@/lib/sync/types";
import { MaterialSection } from "./material-section";
import { PricingSection } from "./pricing-section";
import { PrecisionSection } from "./precision-section";
import { WorkspaceSection } from "./workspace-section";
import { SettingsDefaultsCard } from "./settings-defaults-card";
import { SyncSection } from "./sync-section";
import { ferroscaleOnboardedStore } from "@/components/ferroscale-app-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  activeFamily: MetalFamilyId;
  issues: ValidationIssue[];
  onResetAll: () => void;
  onOpenChangelog: () => void;
  compareLimit: number;
  onCompareLimitChange: (value: number) => void;
  maxCompare: number;
  isCompareMobileCapped: boolean;
  showInlineMaterial: boolean;
  onToggleInlineMaterial: () => void;
  showInlinePrice: boolean;
  onToggleInlinePrice: () => void;
  showSettingsPreview: boolean;
  onToggleSettingsPreview: () => void;
  weightAsMain: boolean;
  onToggleWeightAsMain: () => void;
  defaultUnit: LengthUnit;
  onDefaultUnitChange: (value: LengthUnit) => void;
  unitOptions: LengthUnit[];
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  syncStatus: SyncStatus;
  onConnectSync: (passphrase: string) => Promise<unknown>;
  onReconnectSync: () => Promise<unknown>;
  onChangeSyncPassphrase: (passphrase: string) => Promise<unknown>;
  onSyncNow: () => Promise<unknown>;
  onDisconnectSync: () => Promise<unknown>;
  onResetRemoteSync: () => Promise<unknown>;
  onExportSync: () => void;
  onImportSync: (file: File) => Promise<unknown>;
}

type SectionId =
  | "defaults"
  | "material"
  | "pricing"
  | "precision"
  | "workspace"
  | "sync";

interface SectionDef {
  id: SectionId;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

/**
 * Desktop Settings page — full-page 2-pane workshop modeled on
 * DesktopProjectsPage. Left rail lists settings sections (Defaults,
 * Material, Pricing, Precision, Display & Limits, Data & Sync); right
 * pane shows only the selected section's content + a sticky footer
 * with Replay onboarding and Reset all.
 */
export const DesktopSettingsPage = memo(function DesktopSettingsPage({
  input,
  dispatch,
  activeFamily,
  issues,
  onResetAll,
  compareLimit,
  onCompareLimitChange,
  maxCompare,
  isCompareMobileCapped,
  showInlineMaterial,
  onToggleInlineMaterial,
  showInlinePrice,
  onToggleInlinePrice,
  showSettingsPreview,
  onToggleSettingsPreview,
  weightAsMain,
  onToggleWeightAsMain,
  defaultUnit,
  onDefaultUnitChange,
  unitOptions,
  textSize,
  onTextSizeChange,
  syncStatus,
  onConnectSync,
  onReconnectSync,
  onChangeSyncPassphrase,
  onSyncNow,
  onDisconnectSync,
  onResetRemoteSync,
  onExportSync,
  onImportSync,
}: Props) {
  const t = useTranslations("settingsDrawer");
  const tOnboarding = useTranslations("onboarding");
  const tSidebar = useTranslations("sidebar");
  const [active, setActive] = useState<SectionId>("defaults");

  const sections: SectionDef[] = [
    {
      id: "defaults",
      label: t("sectionDefaults"),
      hint: t("defaultsAppliedHint"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
    },
    {
      id: "material",
      label: t("sectionMaterial"),
      hint: "",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V8" />
          <path d="m5 12-2-4 9-6 9 6-2 4" />
          <path d="M5 12v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
        </svg>
      ),
    },
    {
      id: "pricing",
      label: t("sectionPricing"),
      hint: "",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      id: "precision",
      label: t("sectionPrecision"),
      hint: "",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      ),
    },
    {
      id: "workspace",
      label: t("sectionWorkspace"),
      hint: "",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      id: "sync",
      label: t("sectionSync"),
      hint: "",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 11-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M3 12a9 9 0 003 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      ),
    },
  ];

  const activeSection = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="hidden h-[calc(100dvh-env(safe-area-inset-top,0px))] min-h-0 lg:flex">
      {/* Left rail */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-background xl:w-[300px]">
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            {tSidebar("settings")}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {sections.map((section) => {
              const isActive = section.id === active;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActive(section.id);
                  }}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-accent-border bg-accent-surface"
                      : "border-transparent bg-transparent hover:border-border hover:bg-surface"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-accent text-white"
                        : "bg-surface-raised text-foreground-secondary"
                    }`}
                  >
                    {section.icon}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate text-sm font-semibold tracking-tight ${
                        isActive ? "text-accent-text" : "text-foreground"
                      }`}
                    >
                      {section.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border p-2">
          <LanguageSwitcher className="w-full justify-between" />
        </div>
      </aside>

      {/* Detail */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="truncate text-base font-bold tracking-tight text-foreground">
              {activeSection.label}
            </h3>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {active === "defaults" && (
            <div className="-mx-1">
              <SettingsDefaultsCard input={input} defaultUnit={defaultUnit} />
            </div>
          )}

          {active === "material" && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <MaterialSection
                input={input}
                dispatch={dispatch}
                activeFamily={activeFamily}
                issues={issues}
              />
            </div>
          )}

          {active === "pricing" && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <PricingSection input={input} dispatch={dispatch} issues={issues} />
            </div>
          )}

          {active === "precision" && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <PrecisionSection input={input} dispatch={dispatch} />
            </div>
          )}

          {active === "workspace" && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <WorkspaceSection
                compareLimit={compareLimit}
                onCompareLimitChange={onCompareLimitChange}
                maxCompare={maxCompare}
                isCompareMobileCapped={isCompareMobileCapped}
                showInlineMaterial={showInlineMaterial}
                onToggleInlineMaterial={onToggleInlineMaterial}
                showInlinePrice={showInlinePrice}
                onToggleInlinePrice={onToggleInlinePrice}
                showSettingsPreview={showSettingsPreview}
                onToggleSettingsPreview={onToggleSettingsPreview}
                weightAsMain={weightAsMain}
                onToggleWeightAsMain={onToggleWeightAsMain}
                defaultUnit={defaultUnit}
                onDefaultUnitChange={onDefaultUnitChange}
                unitOptions={unitOptions}
                textSize={textSize}
                onTextSizeChange={onTextSizeChange}
              />
            </div>
          )}

          {active === "sync" && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <SyncSection
                status={syncStatus}
                onConnect={onConnectSync}
                onReconnect={onReconnectSync}
                onChangePassphrase={onChangeSyncPassphrase}
                onSyncNow={onSyncNow}
                onDisconnect={onDisconnectSync}
                onResetRemote={onResetRemoteSync}
                onExport={onExportSync}
                onImport={onImportSync}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => ferroscaleOnboardedStore.set(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary hover:bg-surface-raised"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {tOnboarding("replay")}
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground-secondary hover:border-red-border hover:bg-red-surface hover:text-red-interactive"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            {t("reset")}
          </button>
        </div>
      </div>
    </div>
  );
});
