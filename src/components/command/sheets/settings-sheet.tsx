"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { COMMAND_GRADES, CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import { BASIS_UNIT, CURRENCIES, UNIT_OPTIONS } from "../command-constants";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { LengthUnit, PriceBasis } from "@/lib/calculator/types";
import { SheetShell } from "./sheet-shell";
import { SyncSection } from "./sync-section";

function SettingsRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border-faint last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap">
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">{children}</div>
    </div>
  );
}

function SettingsPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 h-8 rounded-lg text-xs font-semibold border ${
        active
          ? "bg-[var(--accent-surface)] border-[var(--accent-border)] text-[var(--accent-text)]"
          : "bg-[var(--surface)] border-border-faint text-foreground-secondary"
      }`}
    >
      {children}
    </button>
  );
}

export function useCommandLocaleSwitch() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const setLocale = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === locale) return;
      router.replace(pathname, { locale: nextLocale });
    },
    [locale, pathname, router],
  );

  return { locale, setLocale };
}

interface CommandDocSection {
  title: string;
  body: string;
  tips: Record<string, string>;
}

export function CommandDocsSection({ className = "mt-4" }: { className?: string }) {
  const t = useTranslations("command");
  const sections = Object.values(
    t.raw("docs.sections") as Record<string, CommandDocSection>,
  );

  return (
    <section className={className}>
      <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase mb-2 px-1">
        {t("docs.label")}
      </div>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden">
        <div className="px-4 py-3 border-b border-border-faint">
          <h3 className="text-sm font-extrabold text-foreground">{t("docs.title")}</h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">{t("docs.subtitle")}</p>
        </div>
        <div className="divide-y divide-border-faint">
          {sections.map((section) => (
            <article key={section.title} className="px-4 py-3.5">
              <h4 className="text-[13px] font-bold text-foreground">{section.title}</h4>
              <p className="text-xs text-foreground-secondary leading-relaxed mt-1">
                {section.body}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {Object.values(section.tips).map((tip) => (
                  <li key={tip} className="flex gap-2 text-[11.5px] leading-relaxed text-muted">
                    <span className="mt-[7px] h-1 w-1 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

interface CommandSettingsSheetProps {
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
  onClose: () => void;
  onToggleTheme: () => void;
  themeLabel: string;
}

export function CommandSettingsSheet({
  shared,
  onUpdateShared,
  weightAsMain,
  onSetWeightAsMain,
  defaultUnit,
  onSetDefaultUnit,
  onClose,
  onToggleTheme,
  themeLabel,
}: CommandSettingsSheetProps) {
  const t = useTranslations("command");
  const { locale, setLocale } = useCommandLocaleSwitch();
  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const numberInput =
    "h-9 w-20 rounded-lg border border-border-faint bg-[var(--surface)] px-2.5 text-right font-mono text-sm text-foreground";
  return (
    <SheetShell title={t("sheets.settings")} onClose={onClose}>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
        <SettingsRow label={t("settings.mainResult")}>
          <SettingsPill active={weightAsMain} onClick={() => onSetWeightAsMain(true)}>
            {t("settings.weight")}
          </SettingsPill>
          <SettingsPill active={!weightAsMain} onClick={() => onSetWeightAsMain(false)}>
            {t("settings.price")}
          </SettingsPill>
        </SettingsRow>
        <SettingsRow label={t("settings.currency")}>
          {CURRENCIES.map((c) => (
            <SettingsPill
              key={c}
              active={shared.currency === c}
              onClick={() => onUpdateShared({ currency: c })}
            >
              {c}
            </SettingsPill>
          ))}
        </SettingsRow>
        <SettingsRow label={t("settings.priceBasis")}>
          {(Object.keys(BASIS_UNIT) as PriceBasis[]).map((basis) => (
            <SettingsPill
              key={basis}
              active={shared.priceBasis === basis}
              onClick={() =>
                onUpdateShared({ priceBasis: basis, priceUnit: BASIS_UNIT[basis] })
              }
            >
              {basis === "weight" ? t("settings.weight") : basis === "length" ? t("settings.length") : t("settings.piece")}
            </SettingsPill>
          ))}
        </SettingsRow>
        <SettingsRow label={`${sym} / ${shared.priceUnit}`}>
          <input
            type="number"
            step={0.01}
            min={0}
            value={shared.unitPrice}
            onChange={(e) =>
              onUpdateShared({ unitPrice: parseFloat(e.target.value) || 0 })
            }
            className={numberInput}
          />
        </SettingsRow>
        <SettingsRow label={t("settings.wastePercent")}>
          <input
            type="number"
            step={1}
            min={0}
            max={100}
            value={shared.wastePercent}
            onChange={(e) =>
              onUpdateShared({ wastePercent: parseFloat(e.target.value) || 0 })
            }
            className={numberInput}
          />
        </SettingsRow>
        <SettingsRow label={t("settings.vat")}>
          <SettingsPill
            active={shared.includeVat}
            onClick={() => onUpdateShared({ includeVat: !shared.includeVat })}
          >
            {shared.includeVat ? t("common.on") : t("common.off")}
          </SettingsPill>
          {shared.includeVat && (
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              value={shared.vatPercent}
              onChange={(e) =>
                onUpdateShared({ vatPercent: parseFloat(e.target.value) || 0 })
              }
              className={numberInput}
            />
          )}
        </SettingsRow>
        <SettingsRow label={t("settings.defaultGrade")}>
          <select
            value={shared.defaultGradeId}
            onChange={(e) => onUpdateShared({ defaultGradeId: e.target.value })}
            className="h-9 rounded-lg border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground"
          >
            {COMMAND_GRADES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group} · {g.label}
              </option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow label={t("settings.defaultUnit")}>
          {UNIT_OPTIONS.map((u) => (
            <SettingsPill
              key={u}
              active={defaultUnit === u}
              onClick={() => onSetDefaultUnit(u)}
            >
              {u}
            </SettingsPill>
          ))}
        </SettingsRow>
        <SettingsRow label={t("settings.language")}>
          {routing.locales.map((localeOption) => (
            <SettingsPill
              key={localeOption}
              active={locale === localeOption}
              onClick={() => setLocale(localeOption)}
            >
              {t(`settings.locales.${localeOption}`)}
            </SettingsPill>
          ))}
        </SettingsRow>
        <SettingsRow label={t("settings.theme")}>
          <button
            type="button"
            onClick={onToggleTheme}
            className="h-9 px-3 rounded-lg border border-border-faint bg-[var(--surface)] text-sm font-semibold text-foreground"
          >
            {themeLabel}
          </button>
        </SettingsRow>
      </div>
      <p className="text-[11px] text-muted mt-3 px-1">
        {t("settings.applyAcrossCommand")}
      </p>
      <p className="text-[11px] text-muted mt-1 px-1">
        {t("settings.inlinePriceHint", { example: `@${shared.unitPrice}/${shared.priceUnit}` })}
      </p>
      <CommandDocsSection />
      <SyncSection />
    </SheetShell>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Sync section — Google Drive, in Command's voice
 * ────────────────────────────────────────────────────────────── */