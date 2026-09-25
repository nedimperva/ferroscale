"use client";

import type React from "react";
import { useTranslations } from "next-intl";
import { cmdAppendLineItem, fsKgm, fsLength, fsMoney, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { haptic } from "@/lib/haptics";
import { applyIssueSuggestion, formatAvailability, formatStockSources, formatCommandIssue } from "../command-copy";
import { AvailabilityBadge, InlineIssue, PricingBadge, StockBadge, TargetBadge } from "../command-atoms";
import { SaveControl } from "../save-control";
import { DeskIcon } from "../desktop/desk-atoms";
import type { MassBand } from "../mass-band";
import type { TargetNote } from "../target-note";
import { Chev, MetricStrip, PhoneIconBtn } from "./phone-atoms";

// The phone's headline figure. Mono at a regular weight, like the workspace's
// — same rule everywhere: numbers are mono, and at this size they carry
// without extra weight.
const HERO_FONT_WEIGHT = 400;

/**
 * The answer: mode switch, the figure, the line under it, the per-piece strip
 * and the action row. Only rendered once there is a line to answer.
 */
export function PhoneHero({
  p,
  line,
  query,
  setQuery,
  mode,
  onSetMode,
  sym,
  heroVal,
  band,
  rateIsUserSupplied,
  targetNote,
  onOpenResult,
  projectName,
  saved,
  onPrimarySave,
  onOpenDestinations,
  onCompare,
  onShare,
}: {
  p: CommandParseResult;
  line: CommandLine;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  mode: "weight" | "price";
  onSetMode: (mode: "weight" | "price") => void;
  sym: string;
  /** The count-up figure, already formatted ("—" while there is none). */
  heroVal: string;
  band: MassBand | null;
  rateIsUserSupplied: boolean;
  targetNote: TargetNote | null;
  onOpenResult: () => void;
  projectName: string | null;
  saved: boolean;
  onPrimarySave: () => void;
  onOpenDestinations: () => void;
  onCompare: () => void;
  onShare: () => void;
}) {
  const t = useTranslations("command");
  const isW = mode === "weight";
  return (
    <div className="px-[18px] pt-1.5 flex-shrink-0">
      {/* The mode switch rides in the hero's label row rather than taking
          a full-width row of its own — the fold's single biggest saving. */}
      <div className="flex items-center justify-between mb-0.5">
        {/* Names the metric rather than the mode — the highlighted pill
            already says which mode is on. */}
        <span className="fs-track-label text-[10px] font-bold uppercase text-muted">
          {isW ? t("preview.totalWeight") : t("preview.totalCost")}
        </span>
        <div className="flex gap-1">
          {(["weight", "price"] as const).map((m) => {
            const active = mode === m;
            const isWeight = m === "weight";
            return (
              <button
                key={m}
                type="button"
                onClick={() => onSetMode(m)}
                aria-pressed={active}
                className="fs-track-label rounded-none text-[11px] font-bold"
                style={{
                  // 5px of vertical padding puts the control at 25px, over
                  // the 24px floor in WCAG 2.5.8. It measured 23px.
                  padding: "5px 12px",
                  border: active
                    ? `1px solid ${isWeight ? "var(--accent-border)" : "var(--blue-border)"}`
                    : "1px solid var(--border-faint)",
                  background: active
                    ? isWeight
                      ? "var(--accent-surface)"
                      : "var(--blue-surface)"
                    : "transparent",
                  color: active
                    ? isWeight
                      ? "var(--accent-text)"
                      : "var(--blue-text)"
                    : "var(--muted)",
                }}
              >
                {/* Same words as the desktop toggle — the concept is
                    one, so the label is one (KG/€ read as units). */}
                {(isWeight ? t("settings.weight") : t("settings.price")).toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!p.valid}
        onClick={() => p.valid && onOpenResult()}
        aria-haspopup="dialog"
        aria-label={p.valid ? t("aria.openBreakdown") : undefined}
        className="block w-full text-left p-0 m-0 bg-transparent border-0"
        style={{ cursor: p.valid ? "pointer" : "default" }}
      >
        <div className="flex items-baseline gap-2">
          {!isW && p.totalAmount != null && (
            <span
              className="font-mono text-[30px] leading-none"
              style={{
                color: "var(--muted)",
                fontWeight: HERO_FONT_WEIGHT,
              }}
            >
              {sym}
            </span>
          )}
          <span
            className="font-mono leading-[0.88] tracking-[-2.8px] fs-display-num"
            style={{
              fontSize: 56,
              fontWeight: HERO_FONT_WEIGHT,
              color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
            }}
          >
            {heroVal}
          </span>
          {isW && p.totalKg != null && (
            <span
              className="font-mono text-[20px]"
              // The hero unit is 20-22px at a normal weight, which WCAG
              // does not count as large text, so it needs the 4.5:1 token
              // rather than the 4.33:1 signal colour.
              style={{ color: "var(--accent-text)" }}
            >
              {fsWeightUnit()}
            </span>
          )}
          {band && (
            <span
              className="fs-track-wide font-mono text-[11px] text-muted self-end pb-2 ml-1"
              >
              {band.percentLabel}
            </span>
          )}
          {p.valid && (
            <span className="ml-auto self-center text-muted-faint">
              <Chev />
            </span>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2.5 mt-2.5 min-h-[18px]">
        {line.multi ? (
          <span className="font-mono text-[12px] text-muted">
            {t("result.assembly", { count: line.items.length })}
          </span>
        ) : p.valid && p.kgm != null ? (
          <span className="font-mono text-[12px] text-muted flex items-center gap-1.5 flex-wrap">
            <span>
              <span className="text-foreground-secondary">
                {fsKgm(p.kgm)}
              </span>{" "}
              kg/m ×{" "}
              <span className="text-foreground-secondary">{fsLength(p.lengthM ?? 0)}</span>{" "}
              m × <span className="text-foreground-secondary">{p.realQty}</span>
              {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
              {/* The assumption travels with the figure — see the
                  workspace hero for why. */}
              {!rateIsUserSupplied
                ? ` · @ ${fsMoney(p.pricing.unitPrice)}/${p.pricing.priceUnit} ${t("result.defaultRate")}`
                : ""}
            </span>
            {p.issues.length > 0 && (
              <InlineIssue
                text={formatCommandIssue(t, p.issues[0])}
                suggestionLabel={
                  p.issues[0].suggestion
                    ? t("issues.didYouMean", { suggestion: p.issues[0].suggestion })
                    : null
                }
                onApply={() =>
                  setQuery(
                    applyIssueSuggestion(query, p.issues[0].token, p.issues[0].suggestion!),
                  )
                }
              />
            )}
            {p.availability && (
              <AvailabilityBadge>
                {formatAvailability(t, p.availability, p.gradeLabel).badge}
              </AvailabilityBadge>
            )}
            {p.stock && (
              <StockBadge title={t("stock.detail", { sources: formatStockSources(t, p.stock.sources) })}>
                {t("stock.badge")}
              </StockBadge>
            )}
            {targetNote && (
              <TargetBadge>
                {t(
                  `target.${targetNote.solvedFor === "qty" ? "solvedQty" : "solvedLength"}`,
                  { target: targetNote.target },
                )}
                {targetNote.over ? ` · ${t("target.over", { over: targetNote.over })}` : ""}
              </TargetBadge>
            )}
            {!isW && p.pricing.wastePercent > 0 && (
              <PricingBadge>{t("pricingBadge.waste", { percent: p.pricing.wastePercent })}</PricingBadge>
            )}
            {!isW && p.pricing.includeVat && (
              <PricingBadge>{t("pricingBadge.vat", { percent: p.pricing.vatPercent })}</PricingBadge>
            )}
          </span>
        ) : p.issues.length > 0 ? (
          <span
            className="fs-drop font-mono text-[12px] flex items-center gap-2 flex-wrap"
            style={{ color: "var(--amber-text)" }}
            role="status"
          >
            <span>{formatCommandIssue(t, p.issues[0])}</span>
            {p.issues[0].suggestion && (
              <button
                type="button"
                onClick={() => {
                  setQuery(
                    applyIssueSuggestion(
                      query,
                      p.issues[0].token,
                      p.issues[0].suggestion!,
                    ),
                  );
                  // no-op on phone: the keypad owns the caret
                }}
                className="rounded-none font-bold"
                style={{
                  padding: "2px 9px",
                  background: "var(--accent-surface)",
                  color: "var(--accent-text)",
                  border: "1px solid var(--accent-border)",
                }}
              >
                {t("issues.didYouMean", { suggestion: p.issues[0].suggestion })}
              </button>
            )}
          </span>
        ) : (
          <span className="font-mono text-[12px] text-muted-faint">
            {p.alias
              ? p.hasSize
                ? t("hint.addLength")
                : t("hint.addSize")
              : t("hint.startProfile")}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5"
            style={{
              background: p.valid ? "var(--accent)" : "var(--muted-faint)",
            }}
          />
          <span
            className="font-mono text-[10px] uppercase"
            style={{
              letterSpacing: 1.6,
              color: p.valid ? "var(--accent-text)" : "var(--muted-faint)",
            }}
          >
            {p.valid ? t("status.live") : t("status.waiting")}
          </span>
        </span>
      </div>

      <MetricStrip
        p={p}
        isWeight={isW}
        sym={sym}
        onOpen={() => p.valid && onOpenResult()}
      />

      {/* The save control takes the row; the other three are icons.
          All four used to share the width equally, which left the one
          control that has something to say — "Add to Gate job", or even
          just "Save" — with about 60px to say it in, and it came out as
          a bookmark and the letter S. Compare and Share have glyphs that
          carry them; the primary action is the one that needs words. */}
      <div className="flex gap-1.5 mt-2">
        <div className="flex-1 min-w-0">
          <SaveControl
            compact
            projectName={projectName}
            saved={saved}
            disabled={!p.calc}
            onPrimary={onPrimarySave}
            onOpenPicker={onOpenDestinations}
          />
        </div>
        <PhoneIconBtn onClick={onCompare} label={t("nav.compare")}>
          <DeskIcon name="compare" size={16} />
        </PhoneIconBtn>
        <PhoneIconBtn onClick={onShare} label={t("common.share")}>
          <DeskIcon name="link" size={16} stroke="currentColor" />
        </PhoneIconBtn>
        {/* The fold doesn't draw this, but without it the phone can only
            view a multi-item line, never start one. */}
        <PhoneIconBtn
          onClick={() => {
            haptic("tap");
            setQuery((q) => cmdAppendLineItem(q));
          }}
          disabled={!p.valid}
          label={t("suggest.addItem")}
          dashed
        >
          <span className="text-[17px] font-bold leading-none">+</span>
        </PhoneIconBtn>
      </div>
    </div>
  );
}
