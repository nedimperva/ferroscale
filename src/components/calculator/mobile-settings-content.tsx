"use client";

import { memo, useState } from "react";
import { useTranslations } from "next-intl";
import { SettingsDefaultsCard } from "./settings-defaults-card";
import { MobileMaterialSheet } from "./mobile-material-sheet";
import { OptionsSheet } from "./options-sheet";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { CalculationInput, CurrencyCode, LengthUnit } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { CalcAction } from "@/hooks/useCalculator";
import type { MetalFamilyId } from "@/lib/datasets/types";
import type { Theme } from "@/hooks/useTheme";
import type { TextSize } from "@/hooks/useTextSize";
import { getMaterialGradeById } from "@/lib/datasets/materials";
import { ferroscaleOnboardedStore } from "@/components/ferroscale-app-shell";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  input: CalculationInput;
  dispatch: React.Dispatch<CalcAction>;
  activeFamily: MetalFamilyId;
  defaultUnit: LengthUnit;
  unitOptions: LengthUnit[];
  onDefaultUnitChange: (unit: LengthUnit) => void;
  textSize: TextSize;
  onTextSizeChange: (size: TextSize) => void;
  theme: Theme;
  resolvedTheme: "light" | "dark";
  onThemeChange: (theme: Theme) => void;
  showInlinePrice: boolean;
  onToggleInlinePrice: () => void;
  weightAsMain: boolean;
  onToggleWeightAsMain: () => void;
  onResetAll: () => void;
  onOpenChangelog: () => void;
}

const CURRENCY_OPTIONS: CurrencyCode[] = ["EUR", "USD", "GBP", "PLN", "BAM"];
const WASTE_OPTIONS = [0, 5, 10, 15, 20];

export const MobileSettingsContent = memo(function MobileSettingsContent({
  input,
  dispatch,
  activeFamily,
  defaultUnit,
  unitOptions,
  onDefaultUnitChange,
  textSize,
  onTextSizeChange,
  theme,
  resolvedTheme,
  onThemeChange,
  showInlinePrice,
  onToggleInlinePrice,
  weightAsMain,
  onToggleWeightAsMain,
  onResetAll,
  onOpenChangelog,
}: Props) {
  const t = useTranslations();
  const [openSheet, setOpenSheet] = useState<
    | null
    | "material"
    | "unit"
    | "currency"
    | "waste"
    | "theme"
    | "textSize"
  >(null);

  const grade = getMaterialGradeById(input.materialGradeId);
  const gradeLabel = grade?.label ?? input.materialGradeId;
  const familyLabel = grade ? t(`dataset.families.${grade.familyId}`) : "";

  const themeLabel =
    theme === "system"
      ? t("mobileSettings.themeSystem")
      : theme === "dark"
        ? t("mobileSettings.themeDark")
        : t("mobileSettings.themeLight");

  const textSizeLabel =
    textSize === "small"
      ? t("mobileSettings.textSmall")
      : textSize === "large"
        ? t("mobileSettings.textLarge")
        : t("mobileSettings.textRegular");

  return (
    <div className="flex flex-1 flex-col pb-6">
      <div className="px-3 pt-3 md:px-4 md:pt-4">
        <SettingsDefaultsCard input={input} defaultUnit={defaultUnit} />
      </div>

      <div className="px-3 pt-3 md:px-4">
        <LanguageSwitcher className="w-full justify-between" />
      </div>

      {/* Display section */}
      <SectionLabel>{t("mobileSettings.sectionDisplay")}</SectionLabel>
      <SectionCard>
        <Row
          icon={<IconSun />}
          title={t("mobileSettings.appearance")}
          detail={themeLabel}
          onPress={() => setOpenSheet("theme")}
        />
        <Row
          icon={<IconText />}
          title={t("mobileSettings.textSize")}
          detail={textSizeLabel}
          onPress={() => setOpenSheet("textSize")}
        />
        <Row
          icon={<IconPrice />}
          title={t("mobileSettings.priceInline")}
          toggle
          on={showInlinePrice}
          onPress={onToggleInlinePrice}
          last
        />
      </SectionCard>

      {/* Defaults section */}
      <SectionLabel>{t("mobileSettings.sectionDefaults")}</SectionLabel>
      <SectionCard>
        <Row
          icon={<IconMaterial />}
          title={t("mobileCalc.material")}
          detail={familyLabel ? `${familyLabel} · ${gradeLabel}` : gradeLabel}
          onPress={() => setOpenSheet("material")}
        />
        <Row
          icon={<IconRuler />}
          title={t("mobileSettings.lengthUnit")}
          detail={defaultUnit}
          onPress={() => setOpenSheet("unit")}
        />
        <Row
          icon={<IconCurrency />}
          title={t("mobileSettings.currency")}
          detail={`${CURRENCY_SYMBOLS[input.currency] ?? input.currency} ${input.currency}`}
          onPress={() => setOpenSheet("currency")}
        />
        <Row
          icon={<IconWaste />}
          title={t("mobileSettings.waste")}
          detail={`${input.wastePercent}%`}
          onPress={() => setOpenSheet("waste")}
          last
        />
      </SectionCard>

      {/* Power section */}
      <SectionLabel>{t("mobileSettings.sectionPower")}</SectionLabel>
      <SectionCard>
        <Row
          icon={<IconWeight />}
          title={t("mobileSettings.weightAsMain")}
          toggle
          on={weightAsMain}
          onPress={onToggleWeightAsMain}
        />
        <Row
          icon={<IconBell />}
          title={t("mobileSettings.whatsNew")}
          onPress={() => {
            triggerHaptic("light");
            onOpenChangelog();
          }}
          last
        />
      </SectionCard>

      {/* Footer actions */}
      <div className="mt-6 flex flex-col gap-2 px-3 md:px-4">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            ferroscaleOnboardedStore.set(false);
          }}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground-secondary active:bg-accent-surface active:text-accent-text"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {t("onboarding.replay")}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            onResetAll();
          }}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface text-sm font-semibold text-foreground-secondary active:bg-surface-raised"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {t("settingsDrawer.reset")}
        </button>
      </div>

      <p className="mt-4 text-center text-2xs text-muted">
        {t("mobileSettings.versionTag")}
      </p>

      {/* Pickers */}
      <MobileMaterialSheet
        open={openSheet === "material"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        input={input}
        dispatch={dispatch}
        activeFamily={activeFamily}
      />

      <OptionsSheet<LengthUnit>
        open={openSheet === "unit"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        title={t("mobileSettings.lengthUnit")}
        options={unitOptions.map((u) => ({ id: u, label: u.toUpperCase() }))}
        value={defaultUnit}
        onSelect={onDefaultUnitChange}
      />

      <OptionsSheet<CurrencyCode>
        open={openSheet === "currency"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        title={t("mobileSettings.currency")}
        options={CURRENCY_OPTIONS.map((c) => ({
          id: c,
          label: `${CURRENCY_SYMBOLS[c] ?? c}  ${c}`,
        }))}
        value={input.currency}
        onSelect={(c) => dispatch({ type: "SET_CURRENCY", currency: c })}
      />

      <OptionsSheet<string>
        open={openSheet === "waste"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        title={t("mobileSettings.waste")}
        options={WASTE_OPTIONS.map((w) => ({
          id: String(w),
          label: `${w}%`,
        }))}
        value={String(input.wastePercent)}
        onSelect={(s) => dispatch({ type: "SET_WASTE", value: Number(s) })}
      />

      <OptionsSheet<Theme>
        open={openSheet === "theme"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        title={t("mobileSettings.appearance")}
        options={[
          { id: "light", label: t("mobileSettings.themeLight") },
          { id: "dark", label: t("mobileSettings.themeDark") },
          {
            id: "system",
            label: t("mobileSettings.themeSystem"),
            detail: resolvedTheme === "dark" ? "dark" : "light",
          },
        ]}
        value={theme}
        onSelect={onThemeChange}
      />

      <OptionsSheet<TextSize>
        open={openSheet === "textSize"}
        onOpenChange={(o) => !o && setOpenSheet(null)}
        title={t("mobileSettings.textSize")}
        options={[
          { id: "small", label: t("mobileSettings.textSmall") },
          { id: "medium", label: t("mobileSettings.textRegular") },
          { id: "large", label: t("mobileSettings.textLarge") },
        ]}
        value={textSize}
        onSelect={onTextSizeChange}
      />
    </div>
  );
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-1.5 pt-5 text-2xs font-bold uppercase tracking-[0.16em] text-muted">
      {children}
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-3 overflow-hidden rounded-2xl border border-border bg-surface md:mx-4">
      {children}
    </div>
  );
}

interface RowProps {
  icon: React.ReactNode;
  title: string;
  detail?: string;
  toggle?: boolean;
  on?: boolean;
  last?: boolean;
  onPress: () => void;
}

function Row({ icon, title, detail, toggle, on, last, onPress }: RowProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors active:bg-surface-raised ${
        !last ? "border-b border-border-faint" : ""
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-accent-text">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {title}
      </span>
      {toggle ? (
        <span
          className={`relative inline-block h-5 w-9 rounded-full transition-colors ${
            on ? "bg-accent" : "bg-border-strong"
          }`}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left]"
            style={{ left: on ? "calc(100% - 1.125rem)" : "0.125rem" }}
          />
        </span>
      ) : (
        <>
          {detail && (
            <span className="truncate text-xs text-muted">{detail}</span>
          )}
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <path d="M1 1l5 5-5 5" />
          </svg>
        </>
      )}
    </button>
  );
}

/* ── Inline icons ── */

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </svg>
  );
}
function IconText() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  );
}
function IconPrice() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 4h10v2H7zm0 4h10v2H7zm0 4h7v2H7z" />
    </svg>
  );
}
function IconMaterial() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
function IconRuler() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M4 12h16M4 6h16M4 18h16" />
    </svg>
  );
}
function IconCurrency() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function IconWaste() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l3-9 6 18 3-9h6" />
    </svg>
  );
}
function IconWeight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9M9 21V11h6v10" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}
