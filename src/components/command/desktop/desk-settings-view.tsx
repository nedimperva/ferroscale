"use client";

import { useTranslations } from "next-intl";
import { CommandDocsSection, useCommandLocaleSwitch } from "../sheets/settings-sheet";
import { SyncSection } from "../sheets/sync-section";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { LengthUnit } from "@/lib/calculator/types";
import {
  buildSettingsFields,
  CHOICE_SELECT_THRESHOLD,
  type SettingsField,
  type SettingsNumberField,
  type SettingsToggleNumberField,
} from "../settings-model";
import { DeskTopbar } from "./desk-sidebar";

function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { v: string; label: string; mono?: boolean }[];
  onChange: (v: string) => void;
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

function NumberBox({
  field,
  prefix,
}: {
  field: SettingsNumberField | SettingsToggleNumberField;
  prefix?: string;
}) {
  return (
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
        aria-label={field.deskLabel}
        type="number"
        step={field.step}
        min={field.min}
        max={field.max}
        value={field.value}
        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 w-full border-0 bg-transparent outline-none font-mono text-[17px] font-bold text-foreground"
      />
      <span className="text-[13px] text-muted font-semibold">{field.suffix}</span>
    </div>
  );
}

/** Renders one model field with the desktop control language (Seg/grid/box). */
function DeskField({ field }: { field: SettingsField }) {
  const t = useTranslations("command");
  if (field.kind === "choice") {
    return (
      <Field label={field.deskLabel}>
        {field.options.length > CHOICE_SELECT_THRESHOLD ? (
          <div className="flex gap-[7px] flex-wrap">
            {field.options.map((o) => {
              const active = field.value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => field.onSelect(o.value)}
                  className={`rounded-[11px] cursor-pointer font-bold text-[13px] ${o.mono ? "font-mono" : ""}`}
                  style={{
                    padding: "8px 14px",
                    border: `1px solid ${active ? "var(--accent-border)" : "var(--border-faint)"}`,
                    background: active ? "var(--accent-surface)" : "var(--surface-raised)",
                    color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
                  }}
                >
                  {o.label}
                  {o.sub && (
                    <span className="font-sans text-[10px] text-muted ml-1.5">{o.sub}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <Seg
            value={field.value}
            onChange={field.onSelect}
            options={field.options.map((o) => ({
              v: o.value,
              label: o.deskLabel ?? o.label,
              mono: o.mono,
            }))}
          />
        )}
      </Field>
    );
  }
  if (field.kind === "number") {
    return (
      <Field label={field.deskLabel}>
        <NumberBox field={field} prefix={field.prefix} />
      </Field>
    );
  }
  return (
    <Field label={field.deskLabel}>
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <Seg
            value={field.on ? "on" : "off"}
            onChange={(v) => field.onToggle(v === "on")}
            options={[
              { v: "off", label: t("common.off") },
              { v: "on", label: t("common.on") },
            ]}
          />
        </div>
        {field.on && (
          <div className="flex-1">
            <NumberBox field={field} />
          </div>
        )}
      </div>
    </Field>
  );
}

export function DeskSettingsView({
  dark,
  shared,
  onUpdateShared,
  weightAsMain,
  onSetWeightAsMain,
  defaultUnit,
  onSetDefaultUnit,
  onToggleTheme,
}: {
  dark: boolean;
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
            {fields.map((field) => (
              <DeskField key={field.id} field={field} />
            ))}
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
