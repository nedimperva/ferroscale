"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { LengthUnit } from "@/lib/calculator/types";
import {
  buildSettingsFields,
  CHOICE_SELECT_THRESHOLD,
  type SettingsField,
} from "../settings-model";
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

const NUMBER_INPUT_CLASS =
  "h-9 w-20 rounded-lg border border-border-faint bg-[var(--surface)] px-2.5 text-right font-mono text-sm text-foreground";

/** Renders one model field with the sheet's control language (pills/select/input). */
function SheetField({ field }: { field: SettingsField }) {
  const t = useTranslations("command");
  if (field.kind === "choice") {
    return (
      <SettingsRow label={field.label}>
        {field.options.length > CHOICE_SELECT_THRESHOLD ? (
          <select
            aria-label={field.label}
            value={field.value}
            onChange={(e) => field.onSelect(e.target.value)}
            className="h-9 rounded-lg border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground"
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.sub ? `${o.sub} · ${o.label}` : o.label}
              </option>
            ))}
          </select>
        ) : (
          field.options.map((o) => (
            <SettingsPill
              key={o.value}
              active={field.value === o.value}
              onClick={() => field.onSelect(o.value)}
            >
              {o.label}
            </SettingsPill>
          ))
        )}
      </SettingsRow>
    );
  }
  if (field.kind === "number") {
    return (
      <SettingsRow label={field.label}>
        <input
          aria-label={field.label}
          type="number"
          step={field.step}
          min={field.min}
          max={field.max}
          value={field.value}
          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
          className={NUMBER_INPUT_CLASS}
        />
      </SettingsRow>
    );
  }
  return (
    <SettingsRow label={field.label}>
      <SettingsPill active={field.on} onClick={() => field.onToggle(!field.on)}>
        {field.on ? t("common.on") : t("common.off")}
      </SettingsPill>
      {field.on && (
        <input
          aria-label={field.label}
          type="number"
          step={field.step}
          min={field.min}
          max={field.max}
          value={field.value}
          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
          className={NUMBER_INPUT_CLASS}
        />
      )}
    </SettingsRow>
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
  dark: boolean;
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
  dark,
}: CommandSettingsSheetProps) {
  const t = useTranslations("command");
  const { locale, setLocale } = useCommandLocaleSwitch();
  const fields = buildSettingsFields({
    t,
    shared,
    onUpdateShared,
    weightAsMain,
    onSetWeightAsMain,
    defaultUnit,
    onSetDefaultUnit,
    locale,
    setLocale,
    dark,
    onToggleTheme,
  });
  return (
    <SheetShell title={t("sheets.settings")} onClose={onClose}>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
        {fields.map((field) => (
          <SheetField key={field.id} field={field} />
        ))}
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