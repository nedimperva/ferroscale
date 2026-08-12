import { COMMAND_GRADES, CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import { BASIS_UNIT, CURRENCIES, UNIT_OPTIONS } from "./command-constants";
import { routing, type AppLocale } from "@/i18n/routing";
import type { Theme } from "@/hooks/useTheme";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { LengthUnit, PriceBasis } from "@/lib/calculator/types";

/**
 * The single source of truth for the Settings surface. Both renderers — the
 * mobile/medium bottom sheet and the wide-desktop settings view — consume the
 * field list this module builds, so adding a setting is one entry here and
 * zero JSX edits. The renderers own only presentation (grouped rows with
 * inline editors on the sheet, a group rail with panes on the desktop).
 *
 * Every field carries the group it belongs to and a one-line description of
 * what it actually does. A settings screen that only lists names makes the
 * reader guess; the description is what turns the list into something you can
 * skim — and it is what the search box searches.
 */

type CommandT = (key: string, values?: Record<string, string | number>) => string;

/**
 * The rail on the desktop settings screen, top to bottom. The first four hold
 * model fields; the last three are panels that own their own UI (the price
 * book table, the sync/install flows, the command reference).
 */
export const SETTINGS_GROUPS = [
  "pricing",
  "calculation",
  "units",
  "appearance",
  "priceBook",
  "sync",
  "help",
] as const;

export type SettingsGroupId = (typeof SETTINGS_GROUPS)[number];

/** The groups that hold `SettingsField`s (the rest render their own panels). */
export const SETTINGS_FIELD_GROUPS: readonly SettingsGroupId[] = [
  "pricing",
  "calculation",
  "units",
  "appearance",
];

export interface SettingsChoiceOption {
  value: string;
  /** Compact label (pills, segmented controls, options without decoration). */
  label: string;
  /** Wider label when there is room (e.g. currency "€ EUR"). */
  deskLabel?: string;
  /** Secondary text (e.g. grade group) for controls that can show it. */
  sub?: string;
  mono?: boolean;
}

interface SettingsFieldBase {
  id: string;
  group: SettingsGroupId;
  /** Row label — sentence case, the same on every surface. */
  label: string;
  /** One line on what the setting does; shown under the label. */
  description?: string;
  /** Extra search terms that are not in the label or description. */
  searchTerms?: string;
}

export interface SettingsChoiceField extends SettingsFieldBase {
  kind: "choice";
  value: string;
  options: SettingsChoiceOption[];
  onSelect: (value: string) => void;
}

export interface SettingsNumberField extends SettingsFieldBase {
  kind: "number";
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  prefix?: string;
  step: number;
  min: number;
  max?: number;
  /**
   * A choice that belongs *to the number* rather than beside it — the rate's
   * per-kg/per-m/per-piece basis. Splitting it into its own row asked the
   * reader to connect two rows to understand one price.
   */
  attachedChoice?: {
    value: string;
    options: SettingsChoiceOption[];
    onSelect: (value: string) => void;
  };
  /** Render a slider alongside the box — only for bounded, tweakable values. */
  slider?: boolean;
}

/** A toggle with a number input that appears while the toggle is on (VAT). */
export interface SettingsToggleNumberField extends SettingsFieldBase {
  kind: "toggleNumber";
  on: boolean;
  onToggle: (on: boolean) => void;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  step: number;
  min: number;
  max?: number;
}

export type SettingsField =
  | SettingsChoiceField
  | SettingsNumberField
  | SettingsToggleNumberField;

/** The value a collapsed row shows on its right-hand side. */
export function settingsFieldValueLabel(field: SettingsField): string {
  if (field.kind === "choice") {
    const option = field.options.find((o) => o.value === field.value);
    return option?.label ?? field.value;
  }
  if (field.kind === "number") {
    const unit = field.attachedChoice
      ? (field.attachedChoice.options.find((o) => o.value === field.attachedChoice?.value)?.label ??
        field.suffix)
      : field.suffix;
    return `${field.prefix ? `${field.prefix} ` : ""}${field.value} ${unit}`.trim();
  }
  return field.on ? `${field.value} ${field.suffix}` : "";
}

/** Free-text match over everything a reader can see on the row. */
export function settingsFieldMatches(field: SettingsField, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const parts = [field.label, field.description ?? "", field.searchTerms ?? ""];
  if (field.kind === "choice") {
    for (const option of field.options) parts.push(option.label, option.deskLabel ?? "", option.sub ?? "");
  }
  if (field.kind === "number" && field.attachedChoice) {
    for (const option of field.attachedChoice.options) parts.push(option.label);
  }
  return parts.join(" ").toLowerCase().includes(needle);
}

export interface SettingsModelArgs {
  t: CommandT;
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  theme: Theme;
  onSetTheme: (theme: Theme) => void;
  haptics: boolean;
  onSetHaptics: (value: boolean) => void;
  marginPercent: number;
  onSetMarginPercent: (value: number) => void;
  massTolerancePercent: number;
  onSetMassTolerancePercent: (value: number) => void;
}

export function buildSettingsFields({
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
  onSetTheme,
  haptics,
  onSetHaptics,
  marginPercent,
  onSetMarginPercent,
  massTolerancePercent,
  onSetMassTolerancePercent,
}: SettingsModelArgs): SettingsField[] {
  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  return [
    {
      kind: "number",
      id: "unitPrice",
      group: "pricing",
      label: t("settings.defaultRate"),
      description: t("settings.defaultRateHint", { example: `@${shared.unitPrice}/${shared.priceUnit}` }),
      searchTerms: t("settings.priceBasis"),
      value: shared.unitPrice,
      onChange: (v) => onUpdateShared({ unitPrice: v }),
      suffix: `/${shared.priceUnit}`,
      prefix: sym,
      step: 0.01,
      min: 0,
      attachedChoice: {
        value: shared.priceBasis,
        options: [
          { value: "weight", label: "/kg" },
          { value: "length", label: "/m" },
          { value: "piece", label: "/pc" },
        ],
        onSelect: (v) => {
          const basis = v as PriceBasis;
          onUpdateShared({ priceBasis: basis, priceUnit: BASIS_UNIT[basis] });
        },
      },
    },
    {
      kind: "choice",
      id: "currency",
      group: "pricing",
      label: t("settings.currency"),
      value: shared.currency,
      options: CURRENCIES.map((c) => ({
        value: c,
        label: c,
        deskLabel: `${CURRENCY_SYMBOLS[c] ?? ""} ${c}`.trim(),
      })),
      onSelect: (v) => onUpdateShared({ currency: v as SharedCalcSettings["currency"] }),
    },
    {
      kind: "number",
      id: "wastePercent",
      group: "pricing",
      label: t("settings.wasteAllowance"),
      description: t("settings.wasteAllowanceHint"),
      value: shared.wastePercent,
      onChange: (v) => onUpdateShared({ wastePercent: v }),
      suffix: "%",
      step: 1,
      min: 0,
      max: 100,
      slider: true,
    },
    {
      kind: "number",
      id: "marginPercent",
      group: "pricing",
      label: t("settings.margin"),
      description: t("settings.marginHint"),
      value: marginPercent,
      onChange: onSetMarginPercent,
      suffix: "%",
      step: 1,
      min: 0,
      max: 500,
    },
    {
      kind: "toggleNumber",
      id: "vat",
      group: "pricing",
      label: t("settings.vat"),
      description: shared.includeVat ? t("settings.vatOnHint") : t("settings.vatOffHint"),
      on: shared.includeVat,
      onToggle: (on) => onUpdateShared({ includeVat: on }),
      value: shared.vatPercent,
      onChange: (v) => onUpdateShared({ vatPercent: v }),
      suffix: "%",
      step: 1,
      min: 0,
      max: 100,
    },
    {
      kind: "choice",
      id: "mainResult",
      group: "calculation",
      label: t("settings.headlineNumber"),
      description: t("settings.headlineNumberHint"),
      searchTerms: t("settings.mainResult"),
      value: weightAsMain ? "weight" : "price",
      options: [
        { value: "weight", label: t("settings.weight") },
        { value: "price", label: t("settings.price") },
      ],
      onSelect: (v) => onSetWeightAsMain(v === "weight"),
    },
    {
      kind: "choice",
      id: "defaultGrade",
      group: "calculation",
      label: t("settings.defaultGrade"),
      description: t("settings.defaultGradeHint"),
      value: shared.defaultGradeId,
      options: COMMAND_GRADES.map((g) => ({
        value: g.id,
        label: g.label,
        sub: g.group,
        mono: true,
      })),
      onSelect: (v) => onUpdateShared({ defaultGradeId: v }),
    },
    {
      kind: "number",
      id: "massTolerancePercent",
      group: "calculation",
      label: t("settings.massTolerance"),
      description: t("settings.massToleranceHint"),
      value: massTolerancePercent,
      onChange: onSetMassTolerancePercent,
      suffix: "%",
      step: 0.5,
      min: 0,
      max: 20,
    },
    {
      kind: "choice",
      id: "defaultUnit",
      group: "units",
      label: t("settings.lengthUnitFallback"),
      description: t("settings.lengthUnitFallbackHint"),
      searchTerms: t("settings.defaultUnit"),
      value: defaultUnit,
      options: UNIT_OPTIONS.map((u) => ({ value: u, label: u, mono: true })),
      onSelect: (v) => onSetDefaultUnit(v as LengthUnit),
    },
    {
      kind: "choice",
      id: "theme",
      group: "appearance",
      label: t("settings.theme"),
      description: t("settings.themeHint"),
      value: theme,
      options: [
        { value: "light", label: t("settings.light") },
        { value: "dark", label: t("settings.dark") },
        { value: "system", label: t("settings.auto") },
      ],
      onSelect: (v) => onSetTheme(v as Theme),
    },
    {
      kind: "choice",
      id: "language",
      group: "appearance",
      label: t("settings.language"),
      value: locale,
      options: routing.locales.map((l) => ({
        value: l,
        label: t(`settings.locales.${l}`),
      })),
      onSelect: (v) => setLocale(v as AppLocale),
    },
    {
      kind: "choice",
      id: "haptics",
      group: "appearance",
      label: t("settings.haptics"),
      description: t("settings.hapticsHint"),
      value: haptics ? "on" : "off",
      options: [
        { value: "on", label: t("common.on") },
        { value: "off", label: t("common.off") },
      ],
      onSelect: (v) => onSetHaptics(v === "on"),
    },
  ];
}

/** Renders choices with more options than this as a select rather than pills. */
export const CHOICE_SELECT_THRESHOLD = 6;
