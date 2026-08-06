"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import { ProfileDrawing } from "../profile-drawing";
import { buildBreakdownRows } from "../breakdown-rows";
import { DeskIcon } from "../desktop/desk-atoms";
import type { SavedCardModel } from "./saved-model";

export interface SavedCardActions {
  onOpen: () => void;
  onCompare: () => void;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Present only in selection mode. */
  selected?: boolean;
  onToggleSelect?: () => void;
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
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

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
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
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform var(--motion-fast) ease" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CardAction({
  label,
  onClick,
  active,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="flex items-center justify-center rounded-[9px] cursor-pointer"
      style={{
        width: 28,
        height: 28,
        border: "1px solid var(--border-faint)",
        background: active ? "var(--accent-surface)" : "var(--surface-raised)",
        color: active
          ? "var(--accent-text)"
          : danger
            ? "var(--red-text)"
            : "var(--foreground-secondary)",
      }}
    >
      {children}
    </button>
  );
}

/** The thumbnail: the real cross-section when we can draw one, else the glyph. */
function SavedThumb({ model, size = 46 }: { model: SavedCardModel; size?: number }) {
  return (
    <span
      className="flex items-center justify-center flex-shrink-0 rounded-[12px] overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "var(--surface-inset)",
        color: "var(--accent)",
        padding: 5,
      }}
    >
      {model.parsed ? (
        <ProfileDrawing p={model.parsed} variant="thumb" className="w-full" />
      ) : model.fam ? (
        <CommandGlyph fam={model.fam} size={Math.round(size * 0.5)} />
      ) : null}
    </span>
  );
}

/**
 * One saved calculation. The spec is the identity (name is an optional
 * override on top of it), one metric dominates per the app-wide weight/price
 * mode, and the rate that produced the money is stated rather than implied.
 */
export function SavedCard({
  model,
  mode,
  actions,
}: {
  model: SavedCardModel;
  mode: "weight" | "price";
  actions: SavedCardActions;
}) {
  const t = useTranslations("command");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const { entry, currencySymbol: sym } = model;
  const isWeight = mode === "weight";
  const named = entry.name.trim() !== model.specLabel;
  const selecting = actions.onToggleSelect != null;

  const weightText =
    model.totalKg != null ? `${fsWeight(model.totalKg)} ${fsWeightUnit()}` : "—";
  const priceText =
    model.totalAmount != null ? `${sym} ${fsMoney(model.totalAmount)}` : "—";
  const savedOn = new Date(entry.timestamp).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  const breakdown = model.parsed ? buildBreakdownRows(model.parsed, t) : null;

  return (
    <div
      className="group flex flex-col rounded-2xl transition-shadow"
      style={{
        border: `1px solid ${actions.selected ? "var(--accent-border)" : "var(--border-faint)"}`,
        background: "var(--surface)",
        boxShadow: "var(--panel-shadow-soft)",
      }}
    >
      <div className="flex items-start gap-2" style={{ padding: "12px 12px 0 14px" }}>
        {selecting && (
          <input
            type="checkbox"
            checked={!!actions.selected}
            onChange={actions.onToggleSelect}
            aria-label={t("saved.selectAria", { name: entry.name })}
            className="mt-1.5 flex-shrink-0 cursor-pointer"
            style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
          />
        )}
        {/* One primary target for the whole identity block — open the entry. */}
        <button
          type="button"
          onClick={actions.onOpen}
          className="flex flex-1 min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left cursor-pointer rounded-lg"
          aria-label={t("saved.openAria", { name: entry.name })}
        >
          <SavedThumb model={model} />
          <span className="flex flex-col min-w-0 flex-1">
            <span className="flex items-center gap-1.5 min-w-0">
              {entry.pinned && (
                <span className="flex flex-shrink-0" style={{ color: "var(--accent)" }}>
                  <PinIcon filled />
                </span>
              )}
              <span className="block font-extrabold text-[15px] text-foreground truncate" style={{ letterSpacing: -0.2 }}>
                {named ? entry.name : model.specLabel}
              </span>
            </span>
            <span className="block font-mono text-[11.5px] text-muted mt-0.5 truncate">
              {named ? `${model.specLabel} · ${model.detailLine}` : model.detailLine}
            </span>
          </span>
        </button>
      </div>

      {/* Metrics — the mode picks which one dominates. */}
      <div className="flex items-end gap-4" style={{ padding: "10px 14px 12px" }}>
        <div className="min-w-0">
          <div className="text-[9.5px] font-bold text-muted uppercase" style={{ letterSpacing: 0.8 }}>
            {isWeight ? t("result.totalWeight") : t("result.totalCost")}
          </div>
          <div
            className="font-mono font-extrabold whitespace-nowrap"
            style={{
              fontSize: 22,
              letterSpacing: -0.6,
              color: isWeight ? "var(--accent-text)" : "var(--blue-text)",
            }}
          >
            {isWeight ? weightText : priceText}
          </div>
        </div>
        <div className="min-w-0 ml-auto text-right">
          <div className="font-mono text-[12.5px] font-bold text-foreground-secondary whitespace-nowrap">
            {isWeight ? priceText : weightText}
          </div>
          <div className="font-mono text-[10.5px] text-muted whitespace-nowrap mt-0.5">
            {model.kgm != null ? `${model.kgm.toFixed(2)} kg/m` : null}
            {model.kgm != null && model.perPieceKg != null ? " · " : null}
            {model.perPieceKg != null
              ? `${fsWeight(model.perPieceKg)} ${fsWeightUnit()}/${t("result.pcs")}`
              : null}
          </div>
        </div>
      </div>

      {/* Provenance + actions. The rate is stated so the money is never a
          mystery; a stored total that today's rate moved is called out. */}
      <div
        className="flex items-center gap-2"
        style={{ padding: "8px 12px 9px 14px", borderTop: "1px solid var(--border-faint)" }}
      >
        {/* Only the provenance text wraps — the actions stay on one line. */}
        <span className="flex flex-1 min-w-0 items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10.5px] text-muted-faint truncate">
            {`@ ${sym}${model.rate}/${model.rateUnit}`}
            {" · "}
            {savedOn}
            {entry.useCount > 0 ? ` · ${t("saved.usedCount", { count: entry.useCount })}` : ""}
          </span>
          {model.repriced && (
            <span
              className="font-mono text-[10px] font-bold rounded-full whitespace-nowrap"
              style={{
                padding: "2px 7px",
                background: "var(--amber-surface)",
                color: "var(--amber-text)",
              }}
              title={t("saved.repricedHint")}
            >
              {t("saved.repriced", { amount: `${sym} ${fsMoney(model.storedAmount)}` })}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <CardAction
            label={entry.pinned ? t("saved.unpin") : t("saved.pin")}
            active={entry.pinned}
            onClick={actions.onTogglePin}
          >
            <PinIcon filled={!!entry.pinned} />
          </CardAction>
          <CardAction label={t("saved.addToCompare")} onClick={actions.onCompare}>
            <DeskIcon name="compare" />
          </CardAction>
          <CardAction label={t("saved.duplicate")} onClick={actions.onDuplicate}>
            <CopyIcon />
          </CardAction>
          <CardAction label={t("saved.edit")} onClick={actions.onEdit}>
            <PencilIcon />
          </CardAction>
          <CardAction label={t("common.delete")} danger onClick={actions.onRemove}>
            <DeskIcon name="trash" />
          </CardAction>
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={t("saved.details")}
          title={t("saved.details")}
          className="flex items-center justify-center rounded-[9px] cursor-pointer text-muted flex-shrink-0"
          style={{ width: 28, height: 28, border: "1px solid var(--border-faint)", background: "var(--surface-raised)" }}
        >
          <ChevronIcon open={expanded} />
        </button>
      </div>

      {expanded && (
        <div
          style={{
            padding: "10px 14px 13px",
            borderTop: "1px solid var(--border-faint)",
            background: "var(--surface-raised)",
          }}
        >
          {entry.notes && (
            <p className="text-[12px] text-foreground-secondary mb-2" style={{ lineHeight: 1.5 }}>
              {entry.notes}
            </p>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] font-bold rounded-full"
                  style={{ padding: "2px 8px", background: "var(--surface-inset)", color: "var(--muted)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {breakdown ? (
            <div className="grid gap-x-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {[...breakdown.geometry, ...breakdown.pricing].map((row) => (
                <div key={row.id} className="flex items-baseline justify-between gap-2" style={{ padding: "3px 0" }}>
                  <span className="text-[11px] text-muted truncate">{row.label}</span>
                  <span className="font-mono text-[11.5px] font-semibold text-foreground whitespace-nowrap">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-muted-faint">{t("saved.noBreakdown")}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact row for the table density — same data, one line per entry. */
export function SavedTableRow({
  model,
  actions,
}: {
  model: SavedCardModel;
  actions: SavedCardActions;
}) {
  const t = useTranslations("command");
  const { entry, currencySymbol: sym } = model;
  const selecting = actions.onToggleSelect != null;
  const cell = "font-mono text-[12px] text-foreground-secondary whitespace-nowrap";

  return (
    <div
      className="group flex items-center gap-3 border-t border-border-faint first:border-t-0"
      style={{ padding: "8px 12px" }}
    >
      {selecting && (
        <input
          type="checkbox"
          checked={!!actions.selected}
          onChange={actions.onToggleSelect}
          aria-label={t("saved.selectAria", { name: entry.name })}
          className="flex-shrink-0 cursor-pointer"
          style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
        />
      )}
      <button
        type="button"
        onClick={actions.onOpen}
        aria-label={t("saved.openAria", { name: entry.name })}
        className="flex flex-1 min-w-0 items-center gap-2.5 border-0 bg-transparent p-0 text-left cursor-pointer"
      >
        <SavedThumb model={model} size={28} />
        {entry.pinned && (
          <span className="flex flex-shrink-0" style={{ color: "var(--accent)" }}>
            <PinIcon filled />
          </span>
        )}
        <span className="flex-1 min-w-0 truncate font-bold text-[13px] text-foreground">
          {entry.name.trim() !== model.specLabel ? entry.name : model.specLabel}
        </span>
        <span className={`${cell} hidden sm:block flex-shrink-0`} style={{ width: 150 }}>
          {model.detailLine}
        </span>
        <span
          className="font-mono text-[12.5px] font-bold text-right flex-shrink-0"
          style={{ width: 92, color: "var(--accent-text)" }}
        >
          {model.totalKg != null ? `${fsWeight(model.totalKg)} ${fsWeightUnit()}` : "—"}
        </span>
        <span
          className="font-mono text-[12.5px] font-semibold text-right flex-shrink-0"
          style={{ width: 92, color: "var(--blue-text)" }}
        >
          {model.totalAmount != null ? `${sym} ${fsMoney(model.totalAmount)}` : "—"}
        </span>
      </button>
      <span className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <CardAction
          label={entry.pinned ? t("saved.unpin") : t("saved.pin")}
          active={entry.pinned}
          onClick={actions.onTogglePin}
        >
          <PinIcon filled={!!entry.pinned} />
        </CardAction>
        <CardAction label={t("saved.addToCompare")} onClick={actions.onCompare}>
          <DeskIcon name="compare" />
        </CardAction>
        <CardAction label={t("saved.edit")} onClick={actions.onEdit}>
          <PencilIcon />
        </CardAction>
        <CardAction label={t("common.delete")} danger onClick={actions.onRemove}>
          <DeskIcon name="trash" />
        </CardAction>
      </span>
    </div>
  );
}
