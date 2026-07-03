"use client";

import { useTranslations } from "next-intl";
import { COMMAND_GRADES, CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import { BASIS_UNIT, CURRENCIES, UNIT_OPTIONS } from "../command-constants";
import { CommandDocsSection, useCommandLocaleSwitch } from "../sheets/settings-sheet";
import { SyncSection } from "../sheets/sync-section";
import type { AppLocale } from "@/i18n/routing";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { LengthUnit, PriceBasis } from "@/lib/calculator/types";
import { DeskTopbar } from "./desk-sidebar";

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string; mono?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex rounded-[11px]"
      style={{ background: "var(--surface-inset)", padding: 3, gap: 2 }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-[9px] border-0 cursor-pointer font-bold text-[13px] ${
            o.mono ? "font-mono" : ""
          }`}
          style={{
            padding: "8px 0",
            background: value === o.v ? "var(--surface)" : "transparent",
            color: value === o.v ? "var(--foreground)" : "var(--muted)",
            boxShadow: value === o.v ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "13px 0" }}>
      <div className="text-[10px] font-bold text-muted mb-[9px]" style={{ letterSpacing: 1.2 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export function DeskSettingsView({
  dark,
  sym,
  shared,
  onUpdateShared,
  weightAsMain,
  onSetWeightAsMain,
  defaultUnit,
  onSetDefaultUnit,
  onToggleTheme,
}: {
  dark: boolean;
  sym: string;
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
  onToggleTheme: () => void;
}) {
  const t = useTranslations("command");
  const { locale, setLocale } = useCommandLocaleSwitch();
  const numberBox = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    suffix: string,
    prefix?: string,
  ) => (
    <div
      className="flex items-center gap-2.5 rounded-[13px]"
      style={{
        padding: "11px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      {prefix && (
        <span className="font-bold text-base" style={{ color: "var(--blue-strong)" }}>
          {prefix}
        </span>
      )}
      <input
        aria-label={label}
        type="number"
        step={0.01}
        min={0}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 w-full border-0 bg-transparent outline-none font-mono text-[17px] font-bold text-foreground"
      />
      <span className="text-[13px] text-muted font-semibold">{suffix}</span>
    </div>
  );

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
        <div
          className="grid gap-5 items-start"
          style={{
            maxWidth: 1060,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          }}
        >
          <div>
          <div
            className="rounded-[18px]"
            style={{
              border: "1px solid var(--border-faint)",
              background: "var(--surface)",
              boxShadow: "var(--panel-shadow-soft)",
              padding: "10px 22px 16px",
            }}
          >
            <Field label={t("settings.defaultResultUpper")}>
              <Seg
                value={weightAsMain ? "weight" : "price"}
                onChange={(v) => onSetWeightAsMain(v === "weight")}
                options={[
                  { v: "weight", label: t("settings.weight") },
                  { v: "price", label: t("settings.price") },
                ]}
              />
            </Field>
            <Field label={t("settings.currencyUpper")}>
              <Seg
                value={shared.currency}
                onChange={(v) => onUpdateShared({ currency: v })}
                options={CURRENCIES.map((c) => ({
                  v: c,
                  label: `${CURRENCY_SYMBOLS[c] ?? ""} ${c}`.trim(),
                }))}
              />
            </Field>
            <Field label={t("settings.priceBasisUpper")}>
              <Seg
                value={shared.priceBasis}
                onChange={(v) =>
                  onUpdateShared({ priceBasis: v, priceUnit: BASIS_UNIT[v] })
                }
                options={[
                  { v: "weight" as PriceBasis, label: t("settings.weight") },
                  { v: "length" as PriceBasis, label: t("settings.length") },
                  { v: "piece" as PriceBasis, label: t("settings.piece") },
                ]}
              />
            </Field>
            <Field label={t("settings.unitPricePer", { unit: shared.priceUnit.toUpperCase() })}>
              {numberBox(
                t("settings.unitPricePer", { unit: shared.priceUnit.toUpperCase() }),
                shared.unitPrice,
                (v) => onUpdateShared({ unitPrice: v }),
                `/${shared.priceUnit}`,
                sym,
              )}
            </Field>
            <Field label={t("settings.wastePercentUpper")}>
              {numberBox(t("settings.wastePercentUpper"), shared.wastePercent, (v) => onUpdateShared({ wastePercent: v }), "%")}
            </Field>
            <Field label={t("settings.vat")}>
              <div className="flex items-center gap-2.5">
                <div className="flex-1">
                  <Seg
                    value={shared.includeVat ? "on" : "off"}
                    onChange={(v) => onUpdateShared({ includeVat: v === "on" })}
                    options={[
                      { v: "off", label: t("common.off") },
                      { v: "on", label: t("common.on") },
                    ]}
                  />
                </div>
                {shared.includeVat && (
                  <div className="flex-1">
                    {numberBox(
                      t("settings.vat"),
                      shared.vatPercent,
                      (v) => onUpdateShared({ vatPercent: v }),
                      "%",
                    )}
                  </div>
                )}
              </div>
            </Field>
            <Field label={t("settings.defaultGradeUpper")}>
              <div className="flex gap-[7px] flex-wrap">
                {COMMAND_GRADES.map((g) => {
                  const active = shared.defaultGradeId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onUpdateShared({ defaultGradeId: g.id })}
                      className="rounded-[11px] cursor-pointer font-mono font-bold text-[13px]"
                      style={{
                        padding: "8px 14px",
                        border: `1px solid ${active ? "var(--accent-border)" : "var(--border-faint)"}`,
                        background: active ? "var(--accent-surface)" : "var(--surface-raised)",
                        color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
                      }}
                    >
                      {g.label}
                      <span className="font-sans text-[10px] text-muted ml-1.5">{g.group}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t("settings.lengthUnitFallback")}>
              <Seg
                value={defaultUnit}
                onChange={onSetDefaultUnit}
                options={UNIT_OPTIONS.map((u) => ({ v: u, label: u, mono: true }))}
              />
            </Field>
            <Field label={t("settings.languageUpper")}>
              <Seg<AppLocale>
                value={locale}
                onChange={setLocale}
                options={[
                  { v: "en", label: t("settings.locales.en") },
                  { v: "bs", label: t("settings.locales.bs") },
                ]}
              />
            </Field>
            <Field label={t("settings.appearance")}>
              <Seg
                value={dark ? "dark" : "light"}
                onChange={(v) => {
                  if ((v === "dark") !== dark) onToggleTheme();
                }}
                options={[
                  { v: "light", label: t("settings.light") },
                  { v: "dark", label: t("settings.dark") },
                ]}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted mt-3 px-1">
            {t("settings.inlinePriceHint", { example: `@${shared.unitPrice}/${shared.priceUnit}` })}
          </p>
          <SyncSection />
          </div>
          <CommandDocsSection className="mt-0" />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── small pieces ───────────────────────── */
