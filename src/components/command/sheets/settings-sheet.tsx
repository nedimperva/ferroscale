"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useTheme } from "@/hooks/useTheme";
import {
  hapticsStore,
  marginPercentStore,
  massTolerancePercentStore,
  defaultPaintPriceStore,
  defaultPaintCoverageStore,
  type SharedCalcSettings,
} from "@/lib/settings-stores";
import type { LengthUnit } from "@/lib/calculator/types";
import {
  buildSettingsFields,
  settingsFieldMatches,
  settingsFieldValueLabel,
  type SettingsField,
  type SettingsGroupId,
} from "../settings-model";
import { SettingsFieldControl, SettingsSeg, SettingsSwitch } from "../settings/settings-controls";
import { SearchField } from "../search-field";
import { EmptyState } from "../empty-state";
import { SheetShell } from "./sheet-shell";
import { SyncSection } from "./sync-section";
import { InstallAppSection } from "../install-section";
import { PriceBookSection } from "../price-book-section";
import { usePriceBook } from "@/hooks/usePriceBook";

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

/**
 * The phone's Settings surface (2b): the same groups as the desktop pane, one
 * card each, with the value on the right of every row. Rows edit in place —
 * tapping one opens its control underneath rather than pushing a screen, so
 * changing two numbers is two taps instead of four plus two backs.
 *
 * Rows whose control is already small and self-explanatory (a two- or
 * three-way switch) skip the collapse and render inline: hiding a segmented
 * control behind a tap would be ceremony, not economy.
 */

/** Sheet groups merge units into appearance — 2b's "Units & app". */
const SHEET_GROUPS: Array<{ id: string; labelKey: string; groups: SettingsGroupId[] }> = [
  { id: "pricing", labelKey: "settings.groups.pricing", groups: ["pricing"] },
  { id: "calculation", labelKey: "settings.groups.calculation", groups: ["calculation"] },
  { id: "unitsApp", labelKey: "settings.sheetGroupUnitsApp", groups: ["units", "appearance"] },
];

function isInlineField(field: SettingsField): boolean {
  if (field.kind === "toggleNumber") return true;
  return field.kind === "choice" && field.options.length <= 3 && !field.options.some((o) => o.sub);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`text-muted-faint transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SheetFieldRow({
  field,
  open,
  onToggleOpen,
}: {
  field: SettingsField;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const t = useTranslations("command");

  if (isInlineField(field)) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-foreground">{field.label}</div>
          {field.description && (
            <div className="text-[11.5px] text-muted mt-0.5 leading-snug">{field.description}</div>
          )}
        </div>
        <div className="flex-shrink-0">
          {field.kind === "toggleNumber" ? (
            <div className="flex items-center gap-2">
              {field.on && (
                <input
                  aria-label={field.label}
                  type="number"
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  className="h-9 w-16 rounded-lg border border-border-faint bg-[var(--surface)] px-2.5 text-right font-mono text-sm text-foreground"
                />
              )}
              <SettingsSwitch
                on={field.on}
                onChange={field.onToggle}
                ariaLabel={`${field.label} — ${field.on ? t("common.on") : t("common.off")}`}
              />
            </div>
          ) : field.kind === "choice" ? (
            <SettingsSeg
              compact
              ariaLabel={field.label}
              value={field.value}
              options={field.options}
              onChange={field.onSelect}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className="flex items-center justify-between gap-3 w-full px-4 py-3 text-left cursor-pointer"
      >
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-foreground">{field.label}</div>
          {field.description && (
            <div className="text-[11.5px] text-muted mt-0.5 leading-snug">{field.description}</div>
          )}
        </div>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-mono text-[13px] font-bold text-foreground-secondary">
            {settingsFieldValueLabel(field)}
          </span>
          <Chevron open={open} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3.5 -mt-0.5 flex justify-end">
          <SettingsFieldControl field={field} compact />
        </div>
      )}
    </div>
  );
}

function SheetCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden divide-y divide-border-faint">
      {children}
    </div>
  );
}

function SheetSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fs-track-label text-[10px] font-bold text-muted uppercase mb-1.5 mt-4 px-1 first:mt-0">
      {children}
    </div>
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
}

export function CommandSettingsSheet({
  shared,
  onUpdateShared,
  weightAsMain,
  onSetWeightAsMain,
  defaultUnit,
  onSetDefaultUnit,
  onClose,
}: CommandSettingsSheetProps) {
  const t = useTranslations("command");
  const { locale, setLocale } = useCommandLocaleSwitch();
  const { theme, setTheme } = useTheme();
  const priceBook = usePriceBook();
  const [openField, setOpenField] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [showExtras, setShowExtras] = useState(false);

  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
  const massTolerancePercent = useSyncExternalStore(
    massTolerancePercentStore.subscribe,
    massTolerancePercentStore.getSnapshot,
    massTolerancePercentStore.getServerSnapshot,
  );
  const defaultPaintPrice = useSyncExternalStore(
    defaultPaintPriceStore.subscribe,
    defaultPaintPriceStore.getSnapshot,
    defaultPaintPriceStore.getServerSnapshot,
  );
  const defaultPaintCoverage = useSyncExternalStore(
    defaultPaintCoverageStore.subscribe,
    defaultPaintCoverageStore.getSnapshot,
    defaultPaintCoverageStore.getServerSnapshot,
  );
  const haptics = useSyncExternalStore(
    hapticsStore.subscribe,
    hapticsStore.getSnapshot,
    hapticsStore.getServerSnapshot,
  );

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
    theme,
    onSetTheme: setTheme,
    haptics,
    onSetHaptics: hapticsStore.set,
    marginPercent,
    onSetMarginPercent: marginPercentStore.set,
    massTolerancePercent,
    onSetMassTolerancePercent: massTolerancePercentStore.set,
    defaultPaintPrice,
    onSetDefaultPaintPrice: defaultPaintPriceStore.set,
    defaultPaintCoverage,
    onSetDefaultPaintCoverage: defaultPaintCoverageStore.set,
  });

  const filtering = search.trim().length > 0;
  const visible = useMemo(
    () => (filtering ? fields.filter((field) => settingsFieldMatches(field, search)) : fields),
    [fields, search, filtering],
  );

  const row = (field: SettingsField) => (
    <SheetFieldRow
      key={field.id}
      field={field}
      open={openField === field.id}
      onToggleOpen={() => setOpenField((current) => (current === field.id ? null : field.id))}
    />
  );

  return (
    <SheetShell
      fullScreen
      title={t("sheets.settings")}
      onClose={onClose}
      headerAction={
        <button
          type="button"
          onClick={() => {
            setSearching((on) => !on);
            setSearch("");
          }}
          aria-label={t("settings.searchAria")}
          aria-pressed={searching}
          className="flex items-center justify-center rounded-[10px] cursor-pointer flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--border-faint)",
            background: searching ? "var(--accent-surface)" : "var(--surface-raised)",
            color: searching ? "var(--accent-text)" : "var(--muted)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
      }
    >
      {searching && (
        <div className="mb-3">
          <SearchField
            autoFocus
            compact
            value={search}
            onChange={setSearch}
            placeholder={t("settings.searchPlaceholder")}
            ariaLabel={t("settings.searchAria")}
          />
        </div>
      )}

      {filtering ? (
        visible.length === 0 ? (
          <EmptyState compact title={t("settings.noMatchTitle")} body={t("settings.noMatchBody")} />
        ) : (
          <SheetCard>{visible.map(row)}</SheetCard>
        )
      ) : (
        SHEET_GROUPS.map((section) => {
          const sectionFields = fields.filter((field) => section.groups.includes(field.group));
          if (sectionFields.length === 0) return null;
          return (
            <div key={section.id}>
              <SheetSectionLabel>{t(section.labelKey)}</SheetSectionLabel>
              <SheetCard>{sectionFields.map(row)}</SheetCard>
            </div>
          );
        })
      )}

      {!filtering && (
        <>
          <SheetSectionLabel>{t("settings.groups.priceBook")}</SheetSectionLabel>
          <SheetCard>
            <button
              type="button"
              onClick={() => setShowExtras((on) => !on)}
              aria-expanded={showExtras}
              className="flex items-center justify-between gap-3 w-full px-4 py-3 text-left cursor-pointer"
            >
              <span className="text-[14px] font-bold text-foreground">
                {t("settings.groups.priceBook")} · {t("settings.groups.sync")}
              </span>
              <Chevron open={showExtras} />
            </button>
            {showExtras && (
              <div className="px-4 py-3">
                <PriceBookSection compact shared={shared} priceBook={priceBook} />
                <InstallAppSection />
                <SyncSection />
              </div>
            )}
          </SheetCard>

          <p className="text-[11px] text-muted mt-3 px-1">{t("settings.applyAcrossCommand")}</p>
          <p className="text-[11px] text-muted mt-1 px-1">
            {t("settings.inlinePriceHint", { example: `@${shared.unitPrice}/${shared.priceUnit}` })}
          </p>
          <CommandDocsSection />
        </>
      )}
    </SheetShell>
  );
}
