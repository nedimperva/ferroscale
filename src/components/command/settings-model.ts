import { COMMAND_GRADES, CURRENCY_SYMBOLS } from "@ferroscale/metal-core";
import { BASIS_UNIT, CURRENCIES, UNIT_OPTIONS } from "./command-constants";
import { routing, type AppLocale } from "@/i18n/routing";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type { LengthUnit, PriceBasis } from "@/lib/calculator/types";

/**
 * The single source of truth for the Settings surface. Both renderers — the
 * mobile/medium bottom sheet and the wide-desktop settings view — consume the
 * field list this module builds, so adding a setting is one entry here and
 * zero JSX edits. The renderers own only presentation (pills/select vs
 * segmented controls/grids).
 */

type CommandT = (key: string, values?: Record<string, string | number>) => string;

export interface SettingsChoiceOption {
  value: string;
  /** Compact label (sheet pills, options without decoration). */
  label: string;
  /** Desktop label when it differs (e.g. currency "€ EUR"). */
  deskLabel?: string;
  /** Secondary text (e.g. grade group) for controls that can show it. */
  sub?: string;
  mono?: boolean;
}

interface SettingsFieldBase {
  id: string;
  /** Sheet row label. */
  label: string;
  /** Desktop field label (the uppercase variants). */
  deskLabel: string;
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
  dark: boolean;
  onToggleTheme: () => void;
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
  dark,
  onToggleTheme,
}: SettingsModelArgs): SettingsField[] {
  const sym = CURRENCY_SYMBOLS[shared.currency] ?? "€";
  return [
    {
      kind: "choice",
      id: "mainResult",
      label: t("settings.mainResult"),
      deskLabel: t("settings.defaultResultUpper"),
      value: weightAsMain ? "weight" : "price",
      options: [
        { value: "weight", label: t("settings.weight") },
        { value: "price", label: t("settings.price") },
      ],
      onSelect: (v) => onSetWeightAsMain(v === "weight"),
    },
    {
      kind: "choice",
      id: "currency",
      label: t("settings.currency"),
      deskLabel: t("settings.currencyUpper"),
      value: shared.currency,
      options: CURRENCIES.map((c) => ({
        value: c,
        label: c,
        deskLabel: `${CURRENCY_SYMBOLS[c] ?? ""} ${c}`.trim(),
      })),
      onSelect: (v) => onUpdateShared({ currency: v as SharedCalcSettings["currency"] }),
    },
    {
      kind: "choice",
      id: "priceBasis",
      label: t("settings.priceBasis"),
      deskLabel: t("settings.priceBasisUpper"),
      value: shared.priceBasis,
      options: [
        { value: "weight", label: t("settings.weight") },
        { value: "length", label: t("settings.length") },
        { value: "piece", label: t("settings.piece") },
      ],
      onSelect: (v) => {
        const basis = v as PriceBasis;
        onUpdateShared({ priceBasis: basis, priceUnit: BASIS_UNIT[basis] });
      },
    },
    {
      kind: "number",
      id: "unitPrice",
      label: `${sym} / ${shared.priceUnit}`,
      deskLabel: t("settings.unitPricePer", { unit: shared.priceUnit.toUpperCase() }),
      value: shared.unitPrice,
      onChange: (v) => onUpdateShared({ unitPrice: v }),
      suffix: `/${shared.priceUnit}`,
      prefix: sym,
      step: 0.01,
      min: 0,
    },
    {
      kind: "number",
      id: "wastePercent",
      label: t("settings.wastePercent"),
      deskLabel: t("settings.wastePercentUpper"),
      value: shared.wastePercent,
      onChange: (v) => onUpdateShared({ wastePercent: v }),
      suffix: "%",
      step: 1,
      min: 0,
      max: 100,
    },
    {
      kind: "toggleNumber",
      id: "vat",
      label: t("settings.vat"),
      deskLabel: t("settings.vat"),
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
      id: "defaultGrade",
      label: t("settings.defaultGrade"),
      deskLabel: t("settings.defaultGradeUpper"),
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
      kind: "choice",
      id: "defaultUnit",
      label: t("settings.defaultUnit"),
      deskLabel: t("settings.lengthUnitFallback"),
      value: defaultUnit,
      options: UNIT_OPTIONS.map((u) => ({ value: u, label: u, mono: true })),
      onSelect: (v) => onSetDefaultUnit(v as LengthUnit),
    },
    {
      kind: "choice",
      id: "language",
      label: t("settings.language"),
      deskLabel: t("settings.languageUpper"),
      value: locale,
      options: routing.locales.map((l) => ({
        value: l,
        label: t(`settings.locales.${l}`),
      })),
      onSelect: (v) => setLocale(v as AppLocale),
    },
    {
      kind: "choice",
      id: "theme",
      label: t("settings.theme"),
      deskLabel: t("settings.appearance"),
      value: dark ? "dark" : "light",
      options: [
        { value: "light", label: t("settings.light") },
        { value: "dark", label: t("settings.dark") },
      ],
      onSelect: (v) => {
        if ((v === "dark") !== dark) onToggleTheme();
      },
    },
  ];
}

/** Sheet renders choices with more options than this as a native select. */
export const CHOICE_SELECT_THRESHOLD = 6;
