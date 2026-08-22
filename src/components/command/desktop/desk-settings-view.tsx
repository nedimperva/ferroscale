"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { APP_VERSION } from "@/lib/changelog";
import { useTheme } from "@/hooks/useTheme";
import { CommandDocsSection, useCommandLocaleSwitch } from "../sheets/settings-sheet";
import { SyncSection } from "../sheets/sync-section";
import { InstallAppSection } from "../install-section";
import { PriceBookSection } from "../price-book-section";
import { usePriceBook } from "@/hooks/usePriceBook";
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
  SETTINGS_GROUPS,
  type SettingsField,
  type SettingsGroupId,
} from "../settings-model";
import { SettingsFieldControl } from "../settings/settings-controls";
import { EmptyState } from "../empty-state";
import { SearchField } from "../search-field";

/** Groups whose pane is a panel of its own rather than a list of fields. */
const PANEL_GROUPS: readonly SettingsGroupId[] = ["priceBook", "sync", "help"];

function GroupRailItem({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className="flex items-center gap-2 w-full rounded-button text-left cursor-pointer"
      style={{
        padding: "9px 13px",
        background: active ? "var(--accent-surface)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
        fontWeight: active ? 700 : 600,
        fontSize: 13.5,
      }}
    >
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {count != null && (
        <span className="font-mono text-[10.5px] text-muted">{count}</span>
      )}
    </button>
  );
}

function SettingsRow({ field }: { field: SettingsField }) {
  return (
    <div
      className="flex items-center gap-6 flex-wrap"
      style={{ padding: "15px 20px", borderBottom: "1px solid var(--border-faint)" }}
    >
      <div className="min-w-0" style={{ flex: "1 1 180px" }}>
        <div className="font-bold text-[14.5px] text-foreground">{field.label}</div>
        {field.description && (
          <div className="text-[12.5px] text-muted mt-0.5 leading-snug">{field.description}</div>
        )}
      </div>
      <div className="flex-shrink-0 ml-auto">
        <SettingsFieldControl field={field} />
      </div>
    </div>
  );
}

function GroupHeading({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2.5 flex-wrap mb-2.5 px-1">
      <span className="fs-track-label text-[10.5px] font-bold text-foreground-secondary uppercase">
        {label}
      </span>
      {hint && <span className="text-[12.5px] text-muted">{hint}</span>}
    </div>
  );
}

function FieldCard({ fields }: { fields: SettingsField[] }) {
  return (
    <div
      className="rounded-panel-lg overflow-hidden"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        boxShadow: "var(--panel-shadow-soft)",
      }}
    >
      {fields.map((field, index) => (
        <div key={field.id} style={index === fields.length - 1 ? { marginBottom: -1 } : undefined}>
          <SettingsRow field={field} />
        </div>
      ))}
    </div>
  );
}

export function DeskSettingsView({
  shared,
  onUpdateShared,
  weightAsMain,
  onSetWeightAsMain,
  defaultUnit,
  onSetDefaultUnit,
}: {
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
}) {
  const t = useTranslations("command");
  const { locale, setLocale } = useCommandLocaleSwitch();
  const { theme, setTheme } = useTheme();
  const priceBook = usePriceBook();
  const [group, setGroup] = useState<SettingsGroupId>("pricing");
  const [search, setSearch] = useState("");

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

  const searching = search.trim().length > 0;
  const matches = useMemo(
    () => (searching ? fields.filter((field) => settingsFieldMatches(field, search)) : []),
    [fields, search, searching],
  );

  const groupLabel = (id: SettingsGroupId) => t(`settings.groups.${id}`);
  const groupHint = (id: SettingsGroupId) => t(`settings.groupHints.${id}`);
  const fieldsIn = (id: SettingsGroupId) => fields.filter((field) => field.group === id);

  /** Panel groups match on their own name — they have no fields to search. */
  const panelMatches = searching
    ? PANEL_GROUPS.filter((id) =>
        `${groupLabel(id)} ${groupHint(id)}`.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : [];

  const renderPanel = (id: SettingsGroupId) => {
    switch (id) {
      case "priceBook":
        return (
          <div
            className="rounded-panel-lg"
            style={{
              border: "1px solid var(--border-faint)",
              background: "var(--surface)",
              boxShadow: "var(--panel-shadow-soft)",
              padding: "18px 20px",
            }}
          >
            <PriceBookSection shared={shared} priceBook={priceBook} />
          </div>
        );
      case "sync":
        return (
          <div className="flex flex-col">
            <SyncSection />
            <InstallAppSection />
          </div>
        );
      case "help":
        return (
          <div className="flex flex-col gap-3">
            <CommandDocsSection className="mt-0" />
            <p className="font-mono text-[11px] text-muted-faint px-1">
              {t("settings.version", { version: APP_VERSION })}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <div
        className="flex items-center gap-4 flex-wrap flex-shrink-0"
        style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border-faint)" }}
      >
        <div className="min-w-0">
          <div className="font-extrabold text-xl text-foreground" style={{ letterSpacing: -0.4 }}>
            {t("nav.settings")}
          </div>
          <div className="font-mono text-[11.5px] text-muted mt-0.5">
            {t("settings.deviceSubtitle")}
          </div>
        </div>
        <div className="ml-auto" style={{ width: 300, maxWidth: "100%" }}>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={t("settings.searchPlaceholder")}
            ariaLabel={t("settings.searchAria")}
          />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <nav
          aria-label={t("settings.groupsLabel")}
          className="flex-shrink-0 overflow-y-auto"
          style={{
            width: 216,
            borderRight: "1px solid var(--border-faint)",
            padding: "18px 12px",
          }}
        >
          <div
            className="fs-track-label text-[9.5px] font-bold text-muted-faint uppercase"
            style={{ padding: "0 13px 8px" }}
          >
            {t("settings.groupsLabel")}
          </div>
          <div className="flex flex-col gap-0.5">
            {SETTINGS_GROUPS.map((id) => (
              <GroupRailItem
                key={id}
                active={!searching && group === id}
                label={groupLabel(id)}
                count={searching ? undefined : fieldsIn(id).length || undefined}
                onClick={() => {
                  setSearch("");
                  setGroup(id);
                }}
              />
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto" style={{ padding: "22px 32px 40px" }}>
          <div className="min-w-0">
            {searching ? (
              matches.length === 0 && panelMatches.length === 0 ? (
                <EmptyState
                  compact
                  title={t("settings.noMatchTitle")}
                  body={t("settings.noMatchBody")}
                />
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Search crosses groups, so matches keep their heading —
                      otherwise "Margin" and "Mass tolerance" arrive as one
                      undifferentiated list. */}
                  {SETTINGS_GROUPS.map((id) => {
                    const groupMatches = matches.filter((field) => field.group === id);
                    if (groupMatches.length === 0) return null;
                    return (
                      <section key={id}>
                        <GroupHeading label={groupLabel(id)} />
                        <FieldCard fields={groupMatches} />
                      </section>
                    );
                  })}
                  {panelMatches.map((id) => (
                    <section key={id}>
                      <GroupHeading label={groupLabel(id)} hint={groupHint(id)} />
                      {renderPanel(id)}
                    </section>
                  ))}
                </div>
              )
            ) : (
              <section>
                <GroupHeading label={groupLabel(group)} hint={groupHint(group)} />
                {PANEL_GROUPS.includes(group) ? (
                  renderPanel(group)
                ) : (
                  <FieldCard fields={fieldsIn(group)} />
                )}
                {group === "pricing" && (
                  <p className="text-[11.5px] text-muted mt-3 px-1">
                    {t("settings.inlinePriceHint", {
                      example: `@${shared.unitPrice}/${shared.priceUnit}`,
                    })}
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
