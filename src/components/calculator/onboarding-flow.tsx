"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MATERIAL_GRADES } from "@/lib/datasets/materials";
import { PROFILE_DEFINITIONS } from "@/lib/datasets/profiles";
import type {
  CurrencyCode,
  LengthUnit,
} from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type {
  MetalFamilyId,
  ProfileCategory,
  ProfileId,
} from "@/lib/datasets/types";
import type { CalcAction } from "@/hooks/useCalculator";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { triggerHaptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  initialGradeId: string;
  initialProfileId: ProfileId;
  initialUnit: LengthUnit;
  initialCurrency: CurrencyCode;
  dispatch: React.Dispatch<CalcAction>;
  onComplete: () => void;
  onSkip: () => void;
}

const STEP_COUNT = 3;

const FAMILY_TONES: Record<MetalFamilyId, string> = {
  steel: "#a08373",
  stainless_steel: "#bcc0c7",
  aluminum: "#aab4be",
};

const CATEGORY_ORDER: ProfileCategory[] = [
  "structural",
  "tubes",
  "plates_sheets",
  "bars",
];

const CURRENCY_OPTIONS: CurrencyCode[] = ["EUR", "USD", "GBP", "BAM"];
const LENGTH_OPTIONS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

/**
 * Featured grades shown in the first step. A handful of common picks
 * across the three families — users can change any defaults later.
 */
const FEATURED_GRADE_IDS = [
  "steel-s235jr",
  "steel-s355jr",
  "stainless-304",
  "stainless-316",
  "al-6060",
  "al-6082",
];

export const OnboardingFlow = memo(function OnboardingFlow({
  open,
  initialGradeId,
  initialProfileId,
  initialUnit,
  initialCurrency,
  dispatch,
  onComplete,
  onSkip,
}: Props) {
  const t = useTranslations();
  const [step, setStep] = useState(0);
  const [gradeId, setGradeId] = useState(initialGradeId);
  const [profileId, setProfileId] = useState<ProfileId>(initialProfileId);
  const [unit, setUnit] = useState<LengthUnit>(initialUnit);
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);

  const featuredGrades = useMemo(
    () =>
      FEATURED_GRADE_IDS.map((id) =>
        MATERIAL_GRADES.find((g) => g.id === id),
      ).filter((x): x is (typeof MATERIAL_GRADES)[number] => !!x),
    [],
  );

  const profileCategory = useMemo(() => {
    const p = PROFILE_DEFINITIONS.find((d) => d.id === profileId);
    return p?.category ?? "structural";
  }, [profileId]);

  const categoryProfiles = useMemo(
    () => PROFILE_DEFINITIONS.filter((p) => p.category === profileCategory),
    [profileCategory],
  );

  const handleNext = useCallback(() => {
    triggerHaptic("light");
    if (step < STEP_COUNT - 1) {
      setStep(step + 1);
      return;
    }
    // Final commit on Done
    dispatch({ type: "SET_GRADE", gradeId });
    dispatch({ type: "SET_PROFILE", profileId });
    dispatch({ type: "SET_LENGTH_UNIT", unit });
    dispatch({ type: "SET_CURRENCY", currency });
    triggerHaptic("success");
    onComplete();
  }, [step, gradeId, profileId, unit, currency, dispatch, onComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      triggerHaptic("light");
      setStep(step - 1);
    }
  }, [step]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex flex-col bg-background"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Cream/orange glow behind the hero region — design's OnboardingA
            radial accent. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-12 h-56"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, var(--color-accent-surface, #f5e7da), transparent 70%)",
          }}
        />

        {/* Top: skip + step dots */}
        <div className="relative flex items-center justify-between px-5 pt-4">
          <div className="flex gap-1">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
              <span
                key={i}
                className={`h-[3px] w-10 rounded-full transition-colors ${
                  i <= step ? "bg-accent" : "bg-border-strong/40"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-muted hover:text-foreground-secondary"
          >
            {t("onboarding.skip")}
          </button>
        </div>

        {/* Step content */}
        <div className="relative flex-1 overflow-y-auto px-5 pt-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col"
            >
              {step === 0 && (
                <>
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                    {t("onboarding.step1Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-snug text-foreground-secondary">
                    {t("onboarding.step1Subtitle")}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {featuredGrades.map((g) => {
                      const isActive = g.id === gradeId;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setGradeId(g.id);
                          }}
                          className={`relative overflow-hidden rounded-2xl border p-3 text-left transition-colors ${
                            isActive
                              ? "border-accent-border bg-accent-surface"
                              : "border-border bg-surface"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="absolute right-[-12px] top-[-12px] h-14 w-14 rounded-full opacity-20"
                            style={{ backgroundColor: FAMILY_TONES[g.familyId] }}
                          />
                          <span className="block text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted">
                            {t(`dataset.families.${g.familyId}`)}
                          </span>
                          <span className="mt-1 block text-base font-bold tracking-tight text-foreground">
                            {g.label}
                          </span>
                          <span className="mt-0.5 block text-2xs tabular-nums text-muted">
                            {g.densityKgPerM3} kg/m³
                          </span>
                          {isActive && (
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                    {t("onboarding.step2Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-snug text-foreground-secondary">
                    {t("onboarding.step2Subtitle")}
                  </p>

                  {/* Category row */}
                  <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {CATEGORY_ORDER.map((cat) => {
                      const isActive = cat === profileCategory;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            const first = PROFILE_DEFINITIONS.find(
                              (p) => p.category === cat,
                            );
                            if (first) setProfileId(first.id);
                          }}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isActive
                              ? "border-accent-border bg-accent-surface text-accent-text"
                              : "border-border bg-surface text-foreground-secondary"
                          }`}
                        >
                          <ProfileIcon category={cat} className="h-3.5 w-3.5" />
                          {t(`dataset.profileCategories.${cat}`)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Profile grid */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {categoryProfiles.map((p) => {
                      const isActive = p.id === profileId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("light");
                            setProfileId(p.id);
                          }}
                          className={`flex flex-col items-start gap-1 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors ${
                            isActive
                              ? "border-accent-border bg-accent-surface text-accent-text"
                              : "border-border bg-surface text-foreground"
                          }`}
                        >
                          <ProfileIcon category={p.category} className="h-4 w-4" />
                          <span className="truncate font-semibold leading-tight">
                            {t(`dataset.profileShort.${p.id}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                    {t("onboarding.step3Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-snug text-foreground-secondary">
                    {t("onboarding.step3Subtitle")}
                  </p>

                  <div className="mt-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                        {t("onboarding.lengthUnit")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {LENGTH_OPTIONS.map((u) => {
                          const isActive = u === unit;
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => {
                                triggerHaptic("light");
                                setUnit(u);
                              }}
                              className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                                isActive
                                  ? "border-accent-border bg-accent-surface text-accent-text"
                                  : "border-border bg-surface text-foreground-secondary"
                              }`}
                            >
                              {u}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                        {t("onboarding.currency")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CURRENCY_OPTIONS.map((c) => {
                          const isActive = c === currency;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                triggerHaptic("light");
                                setCurrency(c);
                              }}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                isActive
                                  ? "border-accent-border bg-accent-surface text-accent-text"
                                  : "border-border bg-surface text-foreground-secondary"
                              }`}
                            >
                              <span className="font-bold">
                                {CURRENCY_SYMBOLS[c] ?? c}
                              </span>
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-5 pb-5 pt-2">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-surface text-sm font-semibold text-foreground-secondary active:bg-surface-raised"
            >
              {t("onboarding.back")}
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className={`flex h-12 ${step === 0 ? "flex-[2]" : "flex-[2]"} items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background active:bg-foreground/90`}
          >
            {step === STEP_COUNT - 1
              ? t("onboarding.finish")
              : t("onboarding.continue")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
