"use client";

import { useState } from "react";
import { CommandGlyph } from "./command-glyph";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@/lib/command/format";
import { COMMAND_GRADES } from "@/lib/command/aliases";
import { cmdParse } from "@/lib/command/parser";
import type { CommandParseResult, CommandSettings } from "@/lib/command/types";

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
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 border-b border-border-faint last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">
        {label}
      </span>
      <span
        className={`text-sm font-semibold text-foreground tabular-nums ${
          mono ? "font-mono" : ""
        }`}
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
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
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
      className={`px-3 h-8 rounded-lg text-xs font-semibold border ${
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
  sym: string;
  onClose: () => void;
  onSave: () => void;
  onCopy: () => void;
  onNew: () => void;
}

export function CommandResultSheet({
  p,
  sym,
  onClose,
  onSave,
  onCopy,
  onNew,
}: CommandResultSheetProps) {
  if (!p.valid || p.totalKg == null || p.perPieceKg == null || p.kgm == null) {
    return null;
  }
  const totalKg = p.totalKg;
  const perPieceKg = p.perPieceKg;
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
        <SheetRow label="Per piece" value={`${fsWeight(perPieceKg)} ${fsWeightUnit(perPieceKg)}`} mono />
        <SheetRow label="Total weight" value={`${fsWeight(totalKg)} ${fsWeightUnit(totalKg)}`} mono />
        <SheetRow label="Density" value={`${p.density} kg/m³`} mono />
        <SheetRow label="Rate" value={`${sym} ${p.rate.toFixed(2)}/kg`} mono />
        <SheetRow label="Total cost" value={`${sym} ${fsMoney(p.totalEur ?? 0)}`} mono />
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={onNew}
          className="flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground"
        >
          New
        </button>
      </div>
    </SheetShell>
  );
}

interface CommandSettingsSheetProps {
  settings: CommandSettings;
  setSettings: (s: CommandSettings) => void;
  onClose: () => void;
  onToggleTheme: () => void;
  themeLabel: string;
}

export function CommandSettingsSheet({
  settings,
  setSettings,
  onClose,
  onToggleTheme,
  themeLabel,
}: CommandSettingsSheetProps) {
  return (
    <SheetShell title="Settings" onClose={onClose}>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
        <SettingsRow label="Currency">
          {(["EUR", "USD", "GBP"] as const).map((c) => (
            <SettingsPill
              key={c}
              active={settings.currency === c}
              onClick={() => setSettings({ ...settings, currency: c })}
            >
              {c}
            </SettingsPill>
          ))}
        </SettingsRow>
        <SettingsRow label="€ / kg">
          <input
            type="number"
            step={0.01}
            min={0}
            value={settings.rate}
            onChange={(e) =>
              setSettings({ ...settings, rate: parseFloat(e.target.value) || 0 })
            }
            className="h-9 w-24 rounded-lg border border-border-faint bg-[var(--surface)] px-3 text-right font-mono text-sm text-foreground"
          />
        </SettingsRow>
        <SettingsRow label="Default grade">
          <select
            value={settings.defaultGradeId}
            onChange={(e) =>
              setSettings({ ...settings, defaultGradeId: e.target.value })
            }
            className="h-9 rounded-lg border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground"
          >
            {COMMAND_GRADES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group} · {g.label}
              </option>
            ))}
          </select>
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
    </SheetShell>
  );
}

interface CommandSavedSheetProps {
  settings: CommandSettings;
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
