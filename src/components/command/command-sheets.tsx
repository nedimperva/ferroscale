"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useSync } from "@/hooks/useSync";
import { CommandGlyph } from "./command-glyph";
import { formatCommandParseName } from "./command-copy";
import { BASIS_UNIT, CURRENCIES, UNIT_OPTIONS } from "./command-constants";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { COMMAND_GRADES, findAliasByProfileId } from "@ferroscale/metal-core";
import { computeCompareDeltas } from "@/lib/command/compare";
import type {
  CommandFamily,
  CommandParseResult,
  CommandParserSettings,
} from "@ferroscale/metal-core";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type {
  CalculationInput,
  CalculationResult,
  CurrencyCode,
  LengthUnit,
  PriceBasis,
} from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import type { Project } from "@/hooks/useProjects";


interface SheetShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SheetShell({ title, onClose, children }: SheetShellProps) {
  const t = useTranslations("command");
  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label={t("aria.closeSheet")}
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
            {t("common.close")}
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

interface CommandResultSheetProps {
  p: CommandParseResult;
  onClose: () => void;
  onSave: () => void;
  onCopy: () => void;
  onCopyValue: () => void;
  onShareLink: () => void;
  onNew: () => void;
  onCompare: () => void;
  onAddToProject: () => void;
}

/** Inline result body — used by the mobile result sheet AND by the wide-desktop
 *  layout where there is no sheet at all. */
export function CommandResultBreakdown({
  p,
  onSave,
  onCopy,
  onCopyValue,
  onShareLink,
  onNew,
  onCompare,
  onAddToProject,
  columns = 1,
}: Omit<CommandResultSheetProps, "onClose"> & { columns?: 1 | 2 }) {
  const t = useTranslations("command");
  if (!p.calc || p.kgm == null) {
    return null;
  }
  const r = p.calc.result;
  const sym = CURRENCY_SYMBOLS[r.currency] ?? "€";
  const secondaryBtn =
    "flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground";

  const geometryRows = (
    <>
      <SheetRow label={t("result.massPerMetre")} value={`${p.kgm.toFixed(2)} kg/m`} mono />
      <SheetRow label={t("result.length")} value={`${p.lengthM} m`} mono />
      <SheetRow label={t("result.pieces")} value={`× ${p.realQty}`} mono />
      <SheetRow
        label={t("result.perPiece")}
        value={`${fsWeight(r.unitWeightKg)} ${fsWeightUnit(r.unitWeightKg)}`}
        mono
      />
      <SheetRow
        label={t("result.totalWeight")}
        value={`${fsWeight(r.totalWeightKg)} ${fsWeightUnit(r.totalWeightKg)}`}
        mono
      />
      <SheetRow label={t("result.density")} value={`${r.densityKgPerM3} kg/m³`} mono />
    </>
  );

  const pricingRows = (
    <>
      <SheetRow
        label={t("result.rate")}
        value={`${sym} ${fsMoney(p.calc.input.unitPrice)}/${r.priceUnit}`}
        mono
      />
      <SheetRow
        label={t("result.perPiecePrice")}
        value={`${sym} ${fsMoney(r.unitPriceAmount)}`}
        mono
      />
      <SheetRow label={t("result.subtotal")} value={`${sym} ${fsMoney(r.subtotalAmount)}`} mono />
      {p.pricing.wastePercent > 0 && (
        <SheetRow
          label={t("result.waste", { percent: p.pricing.wastePercent })}
          value={`${sym} ${fsMoney(r.wasteAmount)}`}
          mono
        />
      )}
      {p.pricing.includeVat && (
        <SheetRow
          label={t("result.vat", { percent: p.pricing.vatPercent })}
          value={`${sym} ${fsMoney(r.vatAmount)}`}
          mono
        />
      )}
      <SheetRow label={t("result.totalCost")} value={`${sym} ${fsMoney(r.grandTotalAmount)}`} mono strong />
    </>
  );

  return (
    <>
      <div className="flex items-baseline gap-2 mb-3">
        {p.alias && (
          <span className="text-accent">
            <CommandGlyph fam={p.alias.fam} size={22} />
          </span>
        )}
        <span className="text-lg font-bold text-foreground">{formatCommandParseName(t, p)}</span>
        {p.gradeLabel && (
          <span className="text-xs font-semibold text-muted">· {p.gradeLabel}</span>
        )}
      </div>
      {columns === 2 ? (
        <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] grid grid-cols-2 divide-x divide-border-faint">
          <div className="px-4">
            <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase pt-3 pb-1">
              {t("result.geometry")}
            </div>
            {geometryRows}
          </div>
          <div className="px-4">
            <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase pt-3 pb-1">
              {t("result.pricing")}
            </div>
            {pricingRows}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] px-4">
          {geometryRows}
          {pricingRows}
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm"
        >
          {t("common.save")}
        </button>
        <button type="button" onClick={onCopy} className={secondaryBtn}>
          {t("common.copy")}
        </button>
        <button type="button" onClick={onNew} className={secondaryBtn}>
          {t("common.new")}
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCopyValue} className={secondaryBtn}>
          {t("common.copyValue")}
        </button>
        <button type="button" onClick={onShareLink} className={secondaryBtn}>
          {t("common.shareLink")}
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCompare} className={secondaryBtn}>
          {t("common.compare")}
        </button>
        <button type="button" onClick={onAddToProject} className={secondaryBtn}>
          {t("common.addProject")}
        </button>
      </div>
    </>
  );
}

export function CommandResultSheet({
  onClose,
  ...rest
}: CommandResultSheetProps) {
  const t = useTranslations("command");
  if (!rest.p.calc || rest.p.kgm == null) {
    return null;
  }
  return (
    <SheetShell title={t("sheets.resultBreakdown")} onClose={onClose}>
      <CommandResultBreakdown {...rest} />
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

export function SyncSection() {
  const t = useTranslations("command");
  const {
    status,
    connectProvider,
    disconnectProvider,
    syncNow,
  } = useSync();
  const [busy, setBusy] = useState<null | "connect" | "sync" | "disconnect">(null);
  const [error, setError] = useState<string | null>(null);

  const tryConnect = async () => {
    const passphrase = window.prompt(
      t("sync.passphrasePrompt"),
    );
    if (!passphrase) return;
    setBusy("connect");
    setError(null);
    try {
      await connectProvider(passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.couldNotConnect"));
    } finally {
      setBusy(null);
    }
  };

  const trySync = async () => {
    setBusy("sync");
    setError(null);
    try {
      await syncNow();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.syncFailed"));
    } finally {
      setBusy(null);
    }
  };

  const tryDisconnect = async () => {
    if (!window.confirm(t("sync.disconnectConfirm"))) return;
    setBusy("disconnect");
    setError(null);
    try {
      await disconnectProvider();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.couldNotDisconnect"));
    } finally {
      setBusy(null);
    }
  };

  const action =
    "h-9 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50";
  const primary = `${action} bg-[var(--accent)] text-white dark:text-[#161109]`;
  const secondary = `${action} border border-border-faint bg-[var(--surface)] text-foreground`;

  return (
    <div className="mt-4">
      <div className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase mb-2 px-1">
        {t("sync.title")}
      </div>
      <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] p-4">
        {status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--green-text)" }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-foreground truncate">
                {status.connectedEmail ?? "Google Drive"}
              </span>
            </div>
            <div className="font-mono text-[11px] text-muted">
              {status.lastPullAt
                ? t("sync.lastSync", { date: new Date(status.lastPullAt).toLocaleString() })
                : t("sync.noSyncYet")}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={trySync}
                disabled={busy != null}
                className={primary}
              >
                {busy === "sync" ? t("sync.syncing") : t("sync.syncNow")}
              </button>
              <button
                type="button"
                onClick={tryDisconnect}
                disabled={busy != null}
                className={secondary}
              >
                {t("sync.disconnect")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-foreground-secondary">
              {t("sync.description")}
            </p>
            <button
              type="button"
              onClick={tryConnect}
              disabled={busy != null}
              className={primary}
            >
              {busy === "connect" ? t("sync.connecting") : t("sync.connectGoogleDrive")}
            </button>
          </div>
        )}
        {error && (
          <p
            className="text-[11px] mt-3 px-1"
            style={{ color: "var(--red-text)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Library sheet: Saved · Compare · Projects
 * ────────────────────────────────────────────────────────────── */

type LibraryTab = "saved" | "compare" | "projects";

interface CommandLibrarySheetProps {
  settings: CommandParserSettings;
  defaultUnit: LengthUnit;
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  onClose: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onRemoveSaved: (id: string) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onCreateProject: (name: string) => void;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
}

export function CommandLibrarySheet(props: CommandLibrarySheetProps) {
  const t = useTranslations("command");
  return (
    <SheetShell title={t("sheets.library")} onClose={props.onClose}>
      <CommandLibraryWorkspace {...props} />
    </SheetShell>
  );
}

type CommandLibraryWorkspaceProps = Omit<CommandLibrarySheetProps, "onClose">;

/** The tabbed Library body — used inside the mobile/medium sheet AND as the
 *  always-visible right pane on wide-desktop. */
export function CommandLibraryWorkspace({
  settings,
  defaultUnit,
  saved,
  compareItems,
  projects,
  onLoadInput,
  onRemoveSaved,
  onRemoveCompare,
  onClearCompare,
  onCreateProject,
  onRemoveProjectCalc,
}: CommandLibraryWorkspaceProps) {
  const t = useTranslations("command");
  // Initial tab — pick the first non-empty section, else Saved.
  const initialTab: LibraryTab =
    saved.length > 0
      ? "saved"
      : compareItems.length > 0
        ? "compare"
        : projects.length > 0
          ? "projects"
          : "saved";
  const [tab, setTab] = useState<LibraryTab>(initialTab);

  return (
    <>
      <div className="flex gap-1 mb-3" role="tablist">
        <LibraryTabPill
          active={tab === "saved"}
          count={saved.length}
          onClick={() => setTab("saved")}
          icon={<TabIconSaved />}
        >
          {t("nav.saved")}
        </LibraryTabPill>
        <LibraryTabPill
          active={tab === "compare"}
          count={compareItems.length}
          onClick={() => setTab("compare")}
          icon={<TabIconCompare />}
        >
          {t("nav.compare")}
        </LibraryTabPill>
        <LibraryTabPill
          active={tab === "projects"}
          count={projects.length}
          onClick={() => setTab("projects")}
          icon={<TabIconProjects />}
        >
          {t("nav.projects")}
        </LibraryTabPill>
      </div>

      {tab === "saved" && (
        <SavedTabContent
          saved={saved}
          defaultUnit={defaultUnit}
          defaultGradeId={settings.defaultGradeId}
          onLoad={(entry) => onLoadInput(entry.input)}
          onRemove={onRemoveSaved}
        />
      )}
      {tab === "compare" && (
        <CompareTabContent
          items={compareItems}
          defaultUnit={defaultUnit}
          defaultGradeId={settings.defaultGradeId}
          onLoad={(item) => onLoadInput(item.input)}
          onRemove={onRemoveCompare}
          onClearAll={onClearCompare}
        />
      )}
      {tab === "projects" && (
        <ProjectsTabContent
          projects={projects}
          defaultUnit={defaultUnit}
          defaultGradeId={settings.defaultGradeId}
          onCreate={onCreateProject}
          onLoadCalc={(calc) => onLoadInput(calc.input)}
          onRemoveCalc={onRemoveProjectCalc}
        />
      )}
    </>
  );
}

function TabIconSaved() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function TabIconCompare() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
    </svg>
  );
}

function TabIconProjects() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function LibraryTabPill({
  active,
  count,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 h-9 rounded-lg text-[11px] font-bold uppercase tracking-[1px] flex items-center justify-center gap-1.5 ${
        active
          ? "bg-[var(--accent-surface)] text-[var(--accent-text)] border border-[var(--accent-border)]"
          : "bg-[var(--surface-raised)] text-muted border border-border-faint"
      }`}
    >
      <span className="flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      {children}
      {count > 0 && (
        <span className="opacity-70 font-mono text-[10px]">{count}</span>
      )}
    </button>
  );
}

/* ─────────────────── Shared row primitive ─────────────────── */

function LibraryRow({
  glyph,
  title,
  subtitle,
  onClick,
  onRemove,
  trailing,
  indent,
}: {
  glyph: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
  trailing?: React.ReactNode;
  indent?: boolean;
}) {
  const t = useTranslations("command");
  const interactive = !!onClick;
  return (
    <div
      className={`flex items-center gap-3 ${
        indent ? "pl-6 pr-3" : "px-3"
      } py-2.5`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={`flex-1 min-w-0 flex items-center gap-3 text-left bg-transparent border-0 p-0 ${
          interactive ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div
          className={`${
            indent ? "w-7 h-7" : "w-9 h-9"
          } rounded-lg bg-[var(--surface-inset)] flex items-center justify-center text-foreground flex-shrink-0`}
        >
          {glyph}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`${indent ? "text-[13px]" : "text-[14.5px]"} font-bold text-foreground truncate`}>
            {title}
          </div>
          <div className="font-mono text-[11px] text-muted mt-0.5 truncate">
            {subtitle}
          </div>
        </div>
      </button>
      {trailing}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("common.remove")}
          className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-faint hover:text-foreground hover:bg-[var(--surface)]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-muted text-center py-12 px-6 leading-relaxed">
      {children}
    </div>
  );
}

function RowsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden divide-y divide-border-faint">
      {children}
    </div>
  );
}

/* ─────────────────── Saved tab ─────────────────── */

function SavedTabContent({
  saved,
  defaultUnit,
  defaultGradeId,
  onLoad,
  onRemove,
}: {
  saved: SavedEntry[];
  defaultUnit: LengthUnit;
  defaultGradeId: string;
  onLoad: (entry: SavedEntry) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("command");
  if (saved.length === 0) {
    return <EmptyState>{t("library.emptySaved")}</EmptyState>;
  }
  return (
    <RowsCard>
      {saved.map((entry) => {
        const fam = familyForInput(entry.input);
        const subtitle = formatWeightPriceSubtitle(entry.result);
        const grade = entry.result.gradeLabel;
        return (
          <LibraryRow
            key={entry.id}
            glyph={fam ? <CommandGlyph fam={fam} size={19} /> : null}
            title={entry.name}
            subtitle={
              <>
                {subtitle}
                {grade ? ` · ${grade}` : ""}
              </>
            }
            onClick={() => onLoad(entry)}
            onRemove={() => onRemove(entry.id)}
          />
        );
      })}
      {/* keep defaultUnit/defaultGradeId in the dependency loop for future use */}
      <span className="hidden" aria-hidden="true">
        {defaultUnit}/{defaultGradeId}
      </span>
    </RowsCard>
  );
}

/* ─────────────────── Compare tab ─────────────────── */

function CompareTabContent({
  items,
  defaultUnit,
  defaultGradeId,
  onLoad,
  onRemove,
  onClearAll,
}: {
  items: CompareItem[];
  defaultUnit: LengthUnit;
  defaultGradeId: string;
  onLoad: (item: CompareItem) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("command");
  if (items.length === 0) {
    return (
      <EmptyState>
        {t("library.emptyCompare")}
      </EmptyState>
    );
  }
  const deltas = computeCompareDeltas(items);
  const deltaById = new Map(deltas.map((d) => [d.id, d]));
  return (
    <>
      <RowsCard>
        {items.map((item) => {
          const fam = familyForInput(item.input);
          const subtitle = formatWeightPriceSubtitle(item.result);
          const grade = item.result.gradeLabel;
          const delta = deltaById.get(item.id);
          const isMax = delta?.label === "—";
          return (
            <LibraryRow
              key={item.id}
              glyph={fam ? <CommandGlyph fam={fam} size={19} /> : null}
              title={
                item.normalizedProfile?.shortLabel ?? item.result.profileLabel
              }
              subtitle={
                <>
                  {subtitle}
                  {grade ? ` · ${grade}` : ""}
                </>
              }
              onClick={() => onLoad(item)}
              onRemove={() => onRemove(item.id)}
              trailing={
                delta && (
                  <span
                    className={`font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded ${
                      isMax
                        ? "bg-[var(--accent-surface)] text-[var(--accent-text)]"
                        : "bg-[var(--blue-surface)] text-[var(--blue-text)]"
                    }`}
                  >
                    {delta.label}
                  </span>
                )
              }
            />
          );
        })}
      </RowsCard>
      <button
        type="button"
        onClick={onClearAll}
        className="mt-3 w-full h-10 rounded-xl border border-border-faint bg-transparent text-xs font-bold uppercase tracking-wider text-muted hover:text-foreground hover:bg-[var(--surface-raised)]"
      >
        {t("common.clearAll")}
      </button>
      <span className="hidden" aria-hidden="true">
        {defaultUnit}/{defaultGradeId}
      </span>
    </>
  );
}

/* ─────────────────── Projects tab ─────────────────── */

function FolderGlyph({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function ProjectsTabContent({
  projects,
  defaultUnit,
  defaultGradeId,
  onCreate,
  onLoadCalc,
  onRemoveCalc,
}: {
  projects: Project[];
  defaultUnit: LengthUnit;
  defaultGradeId: string;
  onCreate: (name: string) => void;
  onLoadCalc: (calc: Project["calculations"][number]) => void;
  onRemoveCalc: (projectId: string, calcId: string) => void;
}) {
  const t = useTranslations("command");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewName("");
  };

  return (
    <>
      <div className="flex gap-2 mb-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("library.newProjectName")}
          className="flex-1 h-10 rounded-xl border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!newName.trim()}
          className="h-10 px-4 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("common.new")}
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState>
          {t("library.emptyProjects")}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const calcs = project.calculations;
            const totalWeight = calcs.reduce(
              (sum, c) => sum + (c.result.totalWeightKg ?? 0),
              0,
            );
            const totalCost = calcs.reduce(
              (sum, c) => sum + (c.result.grandTotalAmount ?? 0),
              0,
            );
            const currency =
              calcs[0]?.result.currency ?? ("EUR" as CurrencyCode);
            const sym = CURRENCY_SYMBOLS[currency] ?? "€";
            const isOpen = expanded === project.id;
            return (
              <div
                key={project.id}
                className="rounded-2xl border border-border-faint bg-[var(--surface-raised)] overflow-hidden"
              >
                <LibraryRow
                  glyph={
                    <span style={{ color: "var(--accent)" }}>
                      <FolderGlyph />
                    </span>
                  }
                  title={project.name}
                  subtitle={
                    calcs.length === 0
                      ? t("library.emptyProject")
                      : `${t("library.calcCount", { count: calcs.length })} · ${fsWeight(totalWeight)} ${fsWeightUnit(totalWeight)} · ${sym} ${fsMoney(totalCost)}`
                  }
                  onClick={() =>
                    setExpanded(isOpen ? null : project.id)
                  }
                  trailing={
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-muted-faint transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  }
                />
                {isOpen && (
                  <div className="border-t border-border-faint bg-[var(--surface-inset)]/40">
                    {calcs.length === 0 ? (
                      <div className="text-xs text-muted py-4 text-center">
                        {t("library.noCalculationsYet")}
                      </div>
                    ) : (
                      <div className="divide-y divide-border-faint">
                        {calcs.map((calc) => {
                          const fam = familyForInput(calc.input);
                          return (
                            <LibraryRow
                              key={calc.id}
                              indent
                              glyph={
                                fam ? (
                                  <CommandGlyph fam={fam} size={15} />
                                ) : null
                              }
                              title={
                                calc.normalizedProfile?.shortLabel ??
                                calc.result.profileLabel
                              }
                              subtitle={formatWeightPriceSubtitle(calc.result)}
                              onClick={() => onLoadCalc(calc)}
                              onRemove={() =>
                                onRemoveCalc(project.id, calc.id)
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <span className="hidden" aria-hidden="true">
        {defaultUnit}/{defaultGradeId}
      </span>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
 *  Project picker sheet — replaces SaveToProjectModal
 * ────────────────────────────────────────────────────────────── */

interface CommandProjectPickerSheetProps {
  projects: Project[];
  onClose: () => void;
  onCreateProject: (name: string) => Project;
  onPickProject: (project: Project) => void;
}

export function CommandProjectPickerSheet({
  projects,
  onClose,
  onCreateProject,
  onPickProject,
}: CommandProjectPickerSheetProps) {
  const t = useTranslations("command");
  const [newName, setNewName] = useState("");

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project = onCreateProject(trimmed);
    setNewName("");
    onPickProject(project);
  };

  return (
    <SheetShell title={t("sheets.addToProject")} onClose={onClose}>
      <div className="flex gap-2 mb-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={t("library.newProjectName")}
          className="flex-1 h-10 rounded-xl border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!newName.trim()}
          className="h-10 px-4 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("common.create")}
        </button>
      </div>
      {projects.length === 0 ? (
        <EmptyState>{t("library.noProjectsCreateAbove")}</EmptyState>
      ) : (
        <RowsCard>
          {projects.map((project) => {
            const calcs = project.calculations;
            return (
              <LibraryRow
                key={project.id}
                glyph={
                  <span style={{ color: "var(--accent)" }}>
                    <FolderGlyph />
                  </span>
                }
                title={project.name}
                subtitle={
                  calcs.length === 0
                    ? t("library.emptyProject")
                    : t("library.calcCount", { count: calcs.length })
                }
                onClick={() => onPickProject(project)}
              />
            );
          })}
        </RowsCard>
      )}
    </SheetShell>
  );
}

/* ─────────────────── Helpers ─────────────────── */

function familyForInput(input: CalculationInput): CommandFamily | undefined {
  return findAliasByProfileId(input.profileId)?.fam;
}

function formatWeightPriceSubtitle(result: CalculationResult): string {
  const sym = CURRENCY_SYMBOLS[result.currency] ?? "€";
  return `${fsWeight(result.totalWeightKg)} ${fsWeightUnit(result.totalWeightKg)} · ${sym} ${fsMoney(result.grandTotalAmount)}`;
}

export { CURRENCY_SYMBOLS };
