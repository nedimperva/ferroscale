"use client";

import { useState } from "react";
import { CommandGlyph } from "./command-glyph";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@/lib/command/format";
import { COMMAND_GRADES } from "@/lib/command/aliases";
import { cmdParse } from "@/lib/command/parser";
import type {
  CommandParseResult,
  CommandParserSettings,
} from "@/lib/command/types";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { CurrencyCode, LengthUnit, PriceBasis, PriceUnit } from "@/lib/calculator/types";

const CURRENCIES: CurrencyCode[] = ["EUR", "USD", "GBP", "PLN", "BAM"];
const UNIT_OPTIONS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];

/** Mirrors the legacy reducer's SET_PRICE_BASIS unit mapping. */
const BASIS_UNIT: Record<PriceBasis, PriceUnit> = {
  weight: "kg",
  length: "m",
  piece: "piece",
};

interface SheetShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SheetShell({ title, onClose, children }: SheetShellProps) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="flex-1 bg-[var(--overlay)]"
      />
      <div
        className="bg-[var(--surface)] border-t border-border-faint rounded-t-3xl px-5 pt-3 pb-6 flex flex-col"
        style={{ maxHeight: "82%" }}
      >
        <div className="flex flex-col items-center mb-2">
          <span className="w-9 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto -mx-1 px-1">{children}</div>
      </div>
    </div>
  );
}

function SheetRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-border-faint last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">
        {label}
      </span>
      <span
        className={`text-sm text-foreground tabular-nums ${
          mono ? "font-mono" : ""
        } ${strong ? "font-bold" : "font-semibold"}`}
      >
        {value}
      </span>
    </div>
  );
}

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

interface CommandResultSheetProps {
  p: CommandParseResult;
  onClose: () => void;
  onSave: () => void;
  onCopy: () => void;
  onNew: () => void;
  onCompare: () => void;
  onAddToProject: () => void;
}

export function CommandResultSheet({
  p,
  onClose,
  onSave,
  onCopy,
  onNew,
  onCompare,
  onAddToProject,
}: CommandResultSheetProps) {
  if (!p.calc || p.kgm == null) {
    return null;
  }
  const r = p.calc.result;
  const sym = CURRENCY_SYMBOLS[r.currency] ?? "€";
  const secondaryBtn =
    "flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground";
  return (
    <SheetShell title="Result breakdown" onClose={onClose}>
      <div className="flex items-baseline gap-2 mb-3">
        {p.alias && (
          <span className="text-accent">
            <CommandGlyph fam={p.alias.fam} size={22} />
          </span>
        )}
        <span className="text-lg font-bold text-foreground">{p.name}</span>
        {p.gradeLabel && (
          <span className="text-xs font-semibold text-muted">· {p.gradeLabel}</span>
        )}
      </div>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
        <SheetRow label="Mass per metre" value={`${p.kgm.toFixed(2)} kg/m`} mono />
        <SheetRow label="Length" value={`${p.lengthM} m`} mono />
        <SheetRow label="Pieces" value={`× ${p.realQty}`} mono />
        <SheetRow
          label="Per piece"
          value={`${fsWeight(r.unitWeightKg)} ${fsWeightUnit(r.unitWeightKg)}`}
          mono
        />
        <SheetRow
          label="Total weight"
          value={`${fsWeight(r.totalWeightKg)} ${fsWeightUnit(r.totalWeightKg)}`}
          mono
        />
        <SheetRow label="Density" value={`${r.densityKgPerM3} kg/m³`} mono />
        <SheetRow label="Rate" value={`${sym} ${fsMoney(r.unitPriceAmount)}/${r.priceUnit}`} mono />
        <SheetRow label="Subtotal" value={`${sym} ${fsMoney(r.subtotalAmount)}`} mono />
        {p.pricing.wastePercent > 0 && (
          <SheetRow
            label={`Waste +${p.pricing.wastePercent}%`}
            value={`${sym} ${fsMoney(r.wasteAmount)}`}
            mono
          />
        )}
        {p.pricing.includeVat && (
          <SheetRow
            label={`VAT ${p.pricing.vatPercent}%`}
            value={`${sym} ${fsMoney(r.vatAmount)}`}
            mono
          />
        )}
        <SheetRow label="Total cost" value={`${sym} ${fsMoney(r.grandTotalAmount)}`} mono strong />
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm"
        >
          Save
        </button>
        <button type="button" onClick={onCopy} className={secondaryBtn}>
          Copy
        </button>
        <button type="button" onClick={onNew} className={secondaryBtn}>
          New
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCompare} className={secondaryBtn}>
          Compare
        </button>
        <button type="button" onClick={onAddToProject} className={secondaryBtn}>
          + Project
        </button>
      </div>
    </SheetShell>
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
  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  const numberInput =
    "h-9 w-20 rounded-lg border border-border-faint bg-[var(--surface)] px-2.5 text-right font-mono text-sm text-foreground";
  return (
    <SheetShell title="Settings" onClose={onClose}>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
        <SettingsRow label="Main result">
          <SettingsPill active={weightAsMain} onClick={() => onSetWeightAsMain(true)}>
            Weight
          </SettingsPill>
          <SettingsPill active={!weightAsMain} onClick={() => onSetWeightAsMain(false)}>
            Price
          </SettingsPill>
        </SettingsRow>
        <SettingsRow label="Currency">
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
        <SettingsRow label="Price basis">
          {(Object.keys(BASIS_UNIT) as PriceBasis[]).map((basis) => (
            <SettingsPill
              key={basis}
              active={shared.priceBasis === basis}
              onClick={() =>
                onUpdateShared({ priceBasis: basis, priceUnit: BASIS_UNIT[basis] })
              }
            >
              {basis === "weight" ? "Weight" : basis === "length" ? "Length" : "Piece"}
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
        <SettingsRow label="Waste %">
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
        <SettingsRow label="VAT">
          <SettingsPill
            active={shared.includeVat}
            onClick={() => onUpdateShared({ includeVat: !shared.includeVat })}
          >
            {shared.includeVat ? "On" : "Off"}
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
        <SettingsRow label="Default grade">
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
        <SettingsRow label="Default unit">
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
        <SettingsRow label="Theme">
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
        Pricing, grade, and unit settings are shared with the full app — changes
        here apply everywhere.
      </p>
    </SheetShell>
  );
}

interface CommandSavedSheetProps {
  settings: CommandParserSettings;
  saved: string[];
  recents: string[];
  onClose: () => void;
  onPick: (query: string) => void;
}

export function CommandSavedSheet({
  settings,
  saved,
  recents,
  onClose,
  onPick,
}: CommandSavedSheetProps) {
  const [tab, setTab] = useState<"saved" | "recent">(
    saved.length > 0 ? "saved" : "recent",
  );
  const list = tab === "saved" ? saved : recents;
  return (
    <SheetShell title="Saved & recent" onClose={onClose}>
      <div className="flex gap-1.5 mb-3">
        {(["saved", "recent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-lg text-xs font-semibold uppercase tracking-wide ${
              tab === t
                ? "bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]"
                : "bg-[var(--surface-raised)] text-muted border border-border-faint"
            }`}
          >
            {t} {tab === t && `· ${(t === "saved" ? saved : recents).length}`}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-muted text-center py-12">
          {tab === "saved" ? "No saved calculations yet." : "No recent calculations."}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden">
          {list.map((q, i) => {
            const rp = cmdParse(q, settings);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onPick(q)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                  i > 0 ? "border-t border-border-faint" : ""
                } hover:bg-[var(--surface)]`}
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--surface)] flex items-center justify-center text-foreground flex-shrink-0">
                  {rp.alias && <CommandGlyph fam={rp.alias.fam} size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">
                    {rp.name || q}
                  </div>
                  <div className="font-mono text-[11px] text-muted mt-0.5">
                    {rp.valid && rp.totalKg != null
                      ? `${fsWeight(rp.totalKg)} ${fsWeightUnit(rp.totalKg)} · ×${rp.realQty}${
                          rp.gradeLabel ? " · " + rp.gradeLabel : ""
                        }`
                      : q}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SheetShell>
  );
}

export { CURRENCY_SYMBOLS };
