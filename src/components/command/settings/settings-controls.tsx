"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CHOICE_SELECT_THRESHOLD,
  type SettingsChoiceField,
  type SettingsChoiceOption,
  type SettingsField,
  type SettingsNumberField,
  type SettingsToggleNumberField,
} from "../settings-model";

/**
 * The controls a settings row can hold, in one place so the desktop pane and
 * the phone sheet stay the same app. Only sizing differs between them, which
 * is what `compact` is for; nothing here knows which surface it is on.
 */

export function SettingsSeg({
  value,
  options,
  onChange,
  compact,
  ariaLabel,
}: {
  value: string;
  options: SettingsChoiceOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-[11px]"
      style={{ background: "var(--surface-inset)", padding: 3, gap: 2 }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-[9px] border-0 cursor-pointer font-bold whitespace-nowrap ${
              option.mono ? "font-mono" : ""
            }`}
            style={{
              padding: compact ? "6px 11px" : "7px 14px",
              fontSize: compact ? 12.5 : 13,
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--foreground)" : "var(--muted)",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
            }}
          >
            {active ? (option.deskLabel ?? option.label) : option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsChips({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: SettingsChoiceOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-[7px] flex-wrap justify-end">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-[11px] cursor-pointer font-bold text-[13px] ${option.mono ? "font-mono" : ""}`}
            style={{
              padding: "7px 13px",
              border: `1px solid ${active ? "var(--accent-border)" : "var(--border-faint)"}`,
              background: active ? "var(--accent-surface)" : "var(--surface-raised)",
              color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A two-step picker for choices that arrive pre-grouped (the grades: five
 * options across three families). Showing all of them as one flat row asks the
 * reader to know that 6060 is aluminium; the family select says so.
 */
export function SettingsGroupedChoice({ field }: { field: SettingsChoiceField }) {
  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const option of field.options) {
      const group = option.sub ?? "";
      if (!seen.includes(group)) seen.push(group);
    }
    return seen;
  }, [field.options]);

  const currentGroup = field.options.find((o) => o.value === field.value)?.sub ?? groups[0] ?? "";
  const [group, setGroup] = useState(currentGroup);
  // Selecting a grade from another family (or a sync landing) moves the select
  // with it, so the two controls never disagree about what is selected.
  const activeGroup = groups.includes(currentGroup) ? currentGroup : group;
  const visible = field.options.filter((o) => (o.sub ?? "") === activeGroup);

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <select
        aria-label={field.label}
        value={activeGroup}
        onChange={(e) => setGroup(e.target.value)}
        className="h-9 rounded-[11px] border border-border-faint bg-[var(--surface-raised)] px-2.5 text-[12.5px] font-bold text-foreground cursor-pointer"
      >
        {groups.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <SettingsChips value={field.value} options={visible} onChange={field.onSelect} />
    </div>
  );
}

export function SettingsSwitch({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className="relative rounded-full cursor-pointer flex-shrink-0"
      style={{
        width: 48,
        height: 28,
        border: `1px solid ${on ? "var(--accent-border)" : "var(--border-faint)"}`,
        background: on ? "var(--accent)" : "var(--surface-inset)",
        transition: "background 120ms ease",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          width: 22,
          height: 22,
          top: 2,
          left: on ? 23 : 2,
          background: on ? "var(--accent-contrast)" : "var(--surface)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}

export function SettingsNumberBox({
  field,
  compact,
}: {
  field: SettingsNumberField | SettingsToggleNumberField;
  compact?: boolean;
}) {
  const attached = field.kind === "number" ? field.attachedChoice : undefined;
  const suffix = attached
    ? (attached.options.find((o) => o.value === attached.value)?.label ?? field.suffix)
    : field.suffix;
  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <div
        className="flex items-center gap-2 rounded-[13px]"
        style={{
          padding: compact ? "7px 11px" : "9px 13px",
          border: "1px solid var(--border-faint)",
          background: "var(--surface-raised)",
        }}
      >
        {field.kind === "number" && field.prefix && (
          <span className="font-bold text-[15px]" style={{ color: "var(--blue-strong)" }}>
            {field.prefix}
          </span>
        )}
        <input
          aria-label={field.label}
          type="number"
          step={field.step}
          min={field.min}
          max={field.max}
          value={field.value}
          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
          className="border-0 bg-transparent outline-none font-mono font-bold text-foreground text-right"
          style={{ width: compact ? 58 : 72, fontSize: compact ? 15 : 16.5 }}
        />
        {!attached && <span className="text-[12.5px] text-muted font-semibold">{suffix}</span>}
      </div>
      {attached && (
        <SettingsSeg
          compact
          ariaLabel={field.label}
          value={attached.value}
          options={attached.options}
          onChange={attached.onSelect}
        />
      )}
    </div>
  );
}

/** The slider that rides beside a bounded percentage (waste). */
export function SettingsSlider({ field }: { field: SettingsNumberField }) {
  return (
    <input
      type="range"
      aria-label={field.label}
      min={field.min}
      max={Math.min(field.max ?? 100, 25)}
      step={field.step}
      value={field.value}
      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
      className="fs-range"
      style={{ width: 160 }}
    />
  );
}

/**
 * One field's control, chosen from the field's own shape: grouped choices get
 * the two-step picker, short choices a segmented control, long ones chips.
 */
export function SettingsFieldControl({
  field,
  compact,
}: {
  field: SettingsField;
  compact?: boolean;
}) {
  const t = useTranslations("command");

  if (field.kind === "choice") {
    if (field.options.length > 2 && field.options.every((o) => o.sub)) {
      return <SettingsGroupedChoice field={field} />;
    }
    if (field.options.length > CHOICE_SELECT_THRESHOLD) {
      return (
        <SettingsChips
          ariaLabel={field.label}
          value={field.value}
          options={field.options}
          onChange={field.onSelect}
        />
      );
    }
    return (
      <SettingsSeg
        compact={compact}
        ariaLabel={field.label}
        value={field.value}
        options={field.options}
        onChange={field.onSelect}
      />
    );
  }

  if (field.kind === "number") {
    return (
      <div className="flex items-center gap-3 flex-wrap justify-end">
        {field.slider && !compact && <SettingsSlider field={field} />}
        <SettingsNumberBox field={field} compact={compact} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      {field.on && <SettingsNumberBox field={field} compact={compact} />}
      <SettingsSwitch
        on={field.on}
        onChange={field.onToggle}
        ariaLabel={`${field.label} — ${field.on ? t("common.on") : t("common.off")}`}
      />
    </div>
  );
}
