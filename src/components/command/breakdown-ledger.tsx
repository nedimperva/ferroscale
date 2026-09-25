"use client";

import { Fragment, useSyncExternalStore, useState } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsKgm, fsLength, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { ProfileDrawing } from "./profile-drawing";
import { CommandGlyph } from "./command-glyph";
import { formatAvailability, formatCommandAliasName, formatCommandParseName } from "./command-copy";
import { groupBillOfMaterial, type BomGroup, type BomMember } from "./bom-groups";
import {
  buildBreakdownRows,
  sellPrice,
  type BreakdownRow,
  type BreakdownRowId,
  type BreakdownRows,
} from "./breakdown-rows";
import { applyNearbySpec, NearbySpecs } from "./nearby-specs";
import { Link } from "@/i18n/navigation";
import { haptic } from "@/lib/haptics";
import {
  marginPercentStore,
  massTolerancePercentStore,
  showSectionPropertiesStore,
} from "@/lib/settings-stores";

/**
 * The result breakdown as a ledger sheet. One table carries both weight and
 * cost: each figure with the basis it was multiplied from, for one piece and
 * for all of them, the group the headline shows first. On a `+`-joined line
 * a strip of tabs picks the whole assembly — a bill of material — or one
 * part, which opens into the same sheet a single calculation gets.
 *
 * The phone sheet and the desk panel render this same component; the layout
 * follows the width it is given (container queries), not the device, so the
 * desk's drawing column and basis column fold away on a phone.
 *
 * Where the numbers come from (area, density, formula, the standard) is one
 * tap further, under "How it's calculated". A standard section's catalogue
 * properties (Iy, Wel, Wpl…) fold the same way, under "Section properties" —
 * only when that setting is on; it is off by default.
 */

type Group = "weight" | "cost";

// The rows above each ruled total. Per piece and piece count have no rows of
// their own: the ledger's two figure columns say both.
const WEIGHT_ROWS: BreakdownRowId[] = ["massPerMetre", "massPerArea", "length"];
const COST_ROWS: BreakdownRowId[] = ["rate", "subtotal", "waste", "vat"];
const SOURCE_ROWS: BreakdownRowId[] = ["density", "sectionArea", "formula", "reference"];

const SHARE_SHADES = [
  "var(--accent)",
  "color-mix(in oklab, var(--accent) 70%, var(--surface))",
  "color-mix(in oklab, var(--accent) 45%, var(--surface))",
  "color-mix(in oklab, var(--accent) 28%, var(--surface))",
];
const shade = (index: number) => SHARE_SHADES[Math.min(index, SHARE_SHADES.length - 1)];

const CAPTION = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted";
const RULE_FAINT = { borderBottom: "1px solid var(--border-faint)" };
const RULE_INK = { borderBottom: "1px solid var(--foreground)" };
const TOTAL_RULES = { borderTop: "1.5px solid var(--foreground)", borderBottom: "3px double var(--foreground)" };

function pick(rows: BreakdownRow[], ids: BreakdownRowId[]): BreakdownRow[] {
  return ids.flatMap((id) => rows.filter((row) => row.id === id));
}

function weightLabel(kg: number | null | undefined): string {
  return kg != null ? `${fsWeight(kg)} ${fsWeightUnit()}` : "—";
}

function partSpec(parse: CommandParseResult): string {
  return parse.lengthRaw != null ? `${parse.lengthRaw} ${parse.lengthUnit} × ${parse.realQty}` : "";
}

export function BreakdownLedger({
  p,
  line,
  picked,
  onPick,
  metric,
  variant,
  query,
  setQuery,
}: {
  /** The calculation to break down — the picked part on a multi-item line. */
  p: CommandParseResult;
  line?: CommandLine;
  picked: number;
  onPick: (index: number) => void;
  /** The hero's metric: its group heads the ledger. */
  metric: "weight" | "price";
  variant: "sheet" | "rail";
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  const multi = Boolean(line?.multi);
  const [scope, setScope] = useState<"assembly" | "part">("assembly");
  const showAssembly = multi && scope === "assembly";
  const groups = multi && line ? groupBillOfMaterial(line) : [];

  const openPart = (index: number) => {
    onPick(index);
    setScope("part");
  };

  return (
    <div className="@container flex flex-col gap-5">
      {multi && line && (
        <PartStrip
          groups={groups}
          picked={picked}
          scope={scope}
          onAssembly={() => setScope("assembly")}
          onPart={openPart}
        />
      )}

      {showAssembly && line ? (
        <BillOfMaterial line={line} groups={groups} picked={picked} onOpen={openPart} />
      ) : (
        <PartSheet
          p={p}
          line={line}
          picked={picked}
          onPick={onPick}
          metric={metric}
          variant={variant}
          onNearby={(row) => {
            if (!p.calc) return;
            haptic("commit");
            setQuery(applyNearbySpec(query, picked, row, p.calc.input));
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── chrome ───────────────────────── */

/**
 * Whole assembly, then one tab per stock group — the same groups as the bill
 * of material, so every L 45×45×5 on the line sits under one tab. A group of
 * several cuts gets a second row picking the cut. Scrolls when it overflows.
 */
function PartStrip({
  groups,
  picked,
  scope,
  onAssembly,
  onPart,
}: {
  groups: BomGroup[];
  picked: number;
  scope: "assembly" | "part";
  onAssembly: () => void;
  onPart: (index: number) => void;
}) {
  const t = useTranslations("command");
  const active = scope === "part" ? groups.find((g) => g.members.some((m) => m.index === picked)) : undefined;
  const tab = (key: string, label: string, on: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="h-11 flex-shrink-0 cursor-pointer whitespace-nowrap px-3.5 text-[13px] transition-colors"
      style={{
        color: on ? "var(--foreground)" : "var(--foreground-secondary)",
        fontWeight: on ? 700 : 500,
        boxShadow: on ? "inset 0 -2px 0 var(--accent)" : undefined,
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="-mt-1 flex flex-col">
      <div
        role="group"
        aria-label={t("ledger.scope")}
        className="flex overflow-x-auto [scrollbar-width:none]"
        style={RULE_FAINT}
      >
        {tab("assembly", t("ledger.backToAssembly"), scope === "assembly", onAssembly)}
        {groups.map((group) =>
          tab(
            group.key,
            t("ledger.partTab", {
              index: group.members.map((m) => m.index + 1).join(", "),
              name: groupLabel(t, group),
            }),
            group === active,
            // Re-tapping the open group keeps the cut you were on.
            () => onPart(group === active ? picked : group.members[0].index),
          ),
        )}
      </div>
      {active && active.members.length > 1 && (
        <div
          role="group"
          aria-label={t("ledger.group", { name: groupLabel(t, active), count: active.members.length })}
          className="flex gap-1.5 overflow-x-auto pt-2.5 [scrollbar-width:none]"
        >
          {active.members.map((member) => {
            const on = member.index === picked;
            return (
              <button
                key={member.index}
                type="button"
                aria-pressed={on}
                aria-label={t("ledger.openPart", {
                  index: member.index + 1,
                  name: `${groupLabel(t, active)} ${member.cut}`,
                })}
                onClick={() => onPart(member.index)}
                className="inline-flex min-h-9 flex-shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap px-3 font-mono text-[13px]"
                style={{
                  border: `1px solid ${on ? "var(--foreground)" : "var(--border)"}`,
                  background: on ? "var(--surface-inset)" : "transparent",
                  color: on ? "var(--foreground)" : "var(--foreground-secondary)",
                  fontWeight: on ? 700 : 500,
                }}
              >
                <span className="text-[11px] text-muted-faint">{member.index + 1}</span>
                {member.cut} × {member.parse.realQty}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

/** The sheet's heading: a serif title, the spec under it, anything on the right. */
function SheetHeader({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-3" style={RULE_INK}>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="fs-title m-0 break-words text-[22px] leading-[1.05] text-foreground @[40rem]:text-[26px]">{title}</h3>
        <span className="font-mono text-[13px] leading-[1.5] text-foreground-secondary">{sub}</span>
      </div>
      {children}
    </div>
  );
}

/* ───────────────────────── one calculation ───────────────────────── */

function PartSheet({
  p,
  line,
  picked,
  onPick,
  metric,
  variant,
  onNearby,
}: {
  p: CommandParseResult;
  line?: CommandLine;
  picked: number;
  onPick: (index: number) => void;
  metric: "weight" | "price";
  variant: "sheet" | "rail";
  onNearby: Parameters<typeof NearbySpecs>[0]["onPick"];
}) {
  const t = useTranslations("command");
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
  const showSection = useSyncExternalStore(
    showSectionPropertiesStore.subscribe,
    showSectionPropertiesStore.getSnapshot,
    showSectionPropertiesStore.getServerSnapshot,
  );
  const rows = p.valid ? buildBreakdownRows(p, t, { marginPercent, massTolerancePercent }) : null;
  if (!rows || !p.calc) return null;

  const all = [...rows.geometry, ...rows.pricing];
  const find = (id: BreakdownRowId) => all.find((row) => row.id === id);
  const share =
    line?.multi && line.totalKg && p.totalKg != null
      ? Math.round((p.totalKg / line.totalKg) * 100)
      : null;
  const spec = [p.gradeLabel ?? p.calc.result.gradeLabel, partSpec(p), share != null ? t("ledger.share", { percent: share }) : ""]
    .filter(Boolean)
    .join(" · ");
  const count = line?.multi ? line.items.length : 0;
  const partName = (i: number) =>
    line ? (formatCommandParseName(t, line.items[i].parse) ?? line.items[i].parse.name ?? "") : "";

  const weight: LedgerGroup = {
    id: "weight",
    title: t("ledger.weight"),
    rows: pick(rows.geometry, WEIGHT_ROWS),
    total: find("totalWeight"),
    accent: true,
    after: find("massBand"),
  };
  const cost: LedgerGroup = {
    id: "cost",
    title: t("ledger.cost"),
    rows: pick(rows.pricing, COST_ROWS),
    total: find("totalCost"),
    after: find("sellPrice"),
  };
  const step =
    "inline-flex h-9 w-9 cursor-pointer items-center justify-center border text-foreground disabled:pointer-events-none disabled:opacity-30";

  // Wide: the drawing and what describes the section on the left, the ledger
  // on the right, the drawing column scaling with the sheet. Narrow (a phone):
  // one column, the drawing kept small so the ledger starts on screen.
  const WIDE =
    "@[36rem]:grid-cols-[clamp(10rem,30cqw,16.5rem)_minmax(0,1fr)] @[36rem]:grid-rows-[auto_1fr_auto]";
  return (
    <>
      <SheetHeader title={formatCommandParseName(t, p) ?? ""} sub={spec}>
        {count > 1 && (
          <span className="flex flex-shrink-0 gap-1.5">
            <button
              type="button"
              className={step}
              style={{ borderColor: "var(--border)" }}
              disabled={picked === 0}
              onClick={() => onPick(picked - 1)}
              aria-label={picked > 0 ? t("ledger.previousPart", { name: partName(picked - 1) }) : undefined}
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className={step}
              style={{ borderColor: "var(--border)" }}
              disabled={picked >= count - 1}
              onClick={() => onPick(picked + 1)}
              aria-label={picked < count - 1 ? t("ledger.nextPart", { name: partName(picked + 1) }) : undefined}
            >
              <Chevron dir="right" />
            </button>
          </span>
        )}
      </SheetHeader>

      {p.availability && (
        <p
          className="m-0 px-3 py-2 text-[12px] leading-[1.45]"
          style={{
            background: "var(--amber-surface)",
            color: "var(--amber-text)",
            border: "1px solid var(--amber-border)",
          }}
        >
          {formatAvailability(t, p.availability, p.gradeLabel).detail} {t("availability.checkRate")}
        </p>
      )}

      <div className={`grid items-start gap-x-4 gap-y-4 @[48rem]:gap-x-7 @[48rem]:gap-y-5 ${WIDE}`}>
        {/* The full drawing, dimensions and all — those are the exact sizes a
            reader checks the section against. */}
        <div
          className="flex items-center justify-center @[36rem]:col-start-1 @[36rem]:row-start-1"
          style={{ background: "var(--surface-inset)", padding: variant === "rail" ? "12px 8px" : "14px 10px" }}
        >
          <div className="w-full max-w-[15rem] @[36rem]:max-w-none">
            <ProfileDrawing p={p} className="w-full flex flex-col items-center" />
          </div>
        </div>

        <div className="min-w-0 @[36rem]:col-start-2 @[36rem]:row-span-2 @[36rem]:row-start-1">
          <LedgerTable
            groups={metric === "price" ? [cost, weight] : [weight, cost]}
            qty={p.calc.result.quantity}
            twin={rows.twin}
            basis={rows.basis}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 @[36rem]:col-start-1 @[36rem]:row-start-2">
          {showSection && rows.section.length > 0 && <SectionProperties rows={rows.section} />}
          <NearbySpecs input={p.calc.input} onPick={onNearby} />
        </div>

        <div className="min-w-0 @[36rem]:col-start-2 @[36rem]:row-start-3">
          <HowCalculated rows={pick(rows.geometry, SOURCE_ROWS)} />
        </div>
      </div>
    </>
  );
}

interface LedgerGroup {
  id: Group;
  title: string;
  rows: BreakdownRow[];
  total?: BreakdownRow;
  accent?: boolean;
  after?: BreakdownRow;
}

/*
 * The ledger's cells. Narrow, a row is label | 1 piece | all, with the basis
 * on a second line under the label; from 34rem the basis gets its own column.
 * Class strings stay literal so Tailwind sees them.
 */
const ROW = "col-span-full grid grid-cols-subgrid items-baseline";
const C_LABEL = "col-start-1 row-start-1 min-w-0";
const C_BASIS =
  "col-start-1 row-start-2 min-w-0 pt-0.5 font-mono text-[11.5px] text-muted @[34rem]:col-start-2 @[34rem]:row-start-1 @[34rem]:pt-0";
const C_EACH = "col-start-2 row-start-1 text-right @[34rem]:col-start-3";
const C_ALL = "col-start-3 row-start-1 text-right @[34rem]:col-start-4";
const C_SPAN = "col-start-2 col-span-2 row-start-1 text-right @[34rem]:col-start-3";
const C_ONLY = "col-start-2 row-start-1 text-right @[34rem]:col-start-3";
const COLS_TWIN =
  "grid-cols-[minmax(0,1fr)_auto_auto] @[34rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto_auto]";
const COLS_SINGLE = "grid-cols-[minmax(0,1fr)_auto] @[34rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto]";

/**
 * Weight and cost as one table: every figure that scales with quantity shown
 * for one piece beside all of them. Figures that don't scale (mass per metre,
 * the rate) span both columns; a single piece collapses to one column.
 */
function LedgerTable({
  groups,
  qty,
  twin,
  basis,
}: {
  groups: LedgerGroup[];
  qty: number;
  twin: BreakdownRows["twin"];
  basis: BreakdownRows["basis"];
}) {
  const t = useTranslations("command");
  const single = qty <= 1;
  const each = t("ledger.onePiece");
  const all = t("ledger.allPieces", { count: qty });

  const figures = (row: BreakdownRow, big: boolean, accent?: boolean) => {
    const pair = twin[row.id];
    const size = big ? "text-[20px] font-bold @[34rem]:text-[22px]" : "text-[15px]";
    const color = { color: big && accent ? "var(--accent)" : "var(--foreground)" };
    if (single || !pair) {
      return (
        <span className={`${single ? C_ONLY : C_SPAN} whitespace-nowrap font-mono tabular-nums ${size}`} style={color}>
          {pair?.total ?? row.value}
        </span>
      );
    }
    return (
      <>
        <span
          className={`${C_EACH} whitespace-nowrap font-mono tabular-nums ${
            big ? "text-[15px] text-foreground-secondary @[34rem]:text-[16px]" : "text-[15px] text-foreground"
          }`}
        >
          <span className="sr-only">{each}: </span>
          <span>{pair.each}</span>
        </span>
        <span className={`${C_ALL} whitespace-nowrap font-mono tabular-nums ${size}`} style={color}>
          <span className="sr-only">{all}: </span>
          <span>{pair.total}</span>
        </span>
      </>
    );
  };

  const line = (row: BreakdownRow, tone: "plain" | "muted") => (
    <div key={row.id} data-row={row.id} className={`${ROW} py-2.5`} style={RULE_FAINT}>
      <span className={`${C_LABEL} text-[14px] ${tone === "muted" ? "text-muted" : "text-foreground-secondary"}`}>
        {row.label}
      </span>
      {basis[row.id] && <span className={C_BASIS}>{basis[row.id]}</span>}
      {figures(row, false)}
    </div>
  );

  return (
    <div className="@container">
      <div className={`grid gap-x-4 ${single ? COLS_SINGLE : COLS_TWIN}`}>
        {groups.map((group, index) => (
          <section key={group.id} aria-label={group.title} className={`${ROW} items-stretch`}>
            <div className={`${ROW} pb-1.5 ${index === 0 ? "" : "pt-6"}`} style={RULE_INK}>
              <span className={`${C_LABEL} ${CAPTION} font-semibold text-foreground`}>{group.title}</span>
              <span aria-hidden="true" className={`${C_BASIS} ${CAPTION} hidden @[34rem]:block`}>
                {t("ledger.basis")}
              </span>
              {!single && (
                <>
                  <span aria-hidden="true" className={`${C_EACH} ${CAPTION}`}>
                    {each}
                  </span>
                  <span aria-hidden="true" className={`${C_ALL} ${CAPTION} text-foreground`}>
                    {all}
                  </span>
                </>
              )}
            </div>
            {group.rows.map((row) => line(row, "plain"))}
            {group.total && (
              <div data-row={group.total.id} className={`${ROW} mt-1.5 pb-2.5 pt-3`} style={TOTAL_RULES}>
                <span className={`${C_LABEL} text-[15px] font-bold text-foreground`}>{group.total.label}</span>
                {basis[group.total.id] && <span className={C_BASIS}>{basis[group.total.id]}</span>}
                {figures(group.total, true, group.accent)}
              </div>
            )}
            {group.after && line(group.after, "muted")}
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * The catalogue's section properties, folded like the source below it. The
 * labels are symbols — Iy and iy are different quantities — so they keep
 * their case and sit in mono, and the cited table closes the list.
 */
function SectionProperties({ rows }: { rows: BreakdownRow[] }) {
  const t = useTranslations("command");
  const figures = rows.filter((row) => row.id !== "secSource");
  const source = rows.find((row) => row.id === "secSource");
  return (
    <details className="group" data-section-properties="">
      <summary
        className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[13px] text-muted underline underline-offset-[3px] [&::-webkit-details-marker]:hidden"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 4h14M5 20h14M12 4v16" />
        </svg>
        {t("result.sectionProps")}
      </summary>
      <div className="mt-1 flex flex-col">
        {figures.map((row) => (
          <div
            key={row.id}
            data-row={row.id}
            className="flex items-baseline justify-between gap-3 py-2"
            style={{ borderBottom: "1px solid var(--border-faint)" }}
          >
            <span className="font-mono text-[13px] text-muted">{row.label}</span>
            <span className="font-mono text-[14px] tabular-nums text-foreground">{row.value}</span>
          </div>
        ))}
        {source && (
          <p data-row="secSource" className="m-0 mt-2 font-mono text-[12px] leading-[1.5] text-foreground-secondary">
            {source.label}: {source.value}
          </p>
        )}
      </div>
    </details>
  );
}

/** The source, folded away: there for anyone who wants to check the number. */
function HowCalculated({ rows }: { rows: BreakdownRow[] }) {
  const t = useTranslations("command");
  return (
    <details className="group">
      <summary
        className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[13px] text-muted underline underline-offset-[3px] [&::-webkit-details-marker]:hidden"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7.5v.5" />
        </svg>
        {t("ledger.howCalculated")}
      </summary>
      <div className="mt-1 flex flex-col">
        <p className="m-0 mb-1 text-[13px] leading-[1.55] text-foreground-secondary">{t("ledger.howCalculatedLead")}</p>
        {rows.map((row) => (
          <div
            key={row.id}
            data-row={row.id}
            className="flex flex-col gap-0.5 py-2"
            style={{ borderBottom: "1px solid var(--border-faint)" }}
          >
            <span className="text-[13px] text-muted">{row.label}</span>
            <span className="break-words font-mono text-[13px] text-foreground">{row.value}</span>
          </div>
        ))}
        <Link
          href="/faq"
          className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-accent-text underline-offset-2 hover:underline"
        >
          {t("ledger.readMethod")}
        </Link>
      </div>
    </details>
  );
}

/* ───────────────────────── the assembly ───────────────────────── */

/*
 * The bill of material's cells. Wide (from 40rem) it is the full table —
 * glyph, length, pieces, kg/m, kg per piece, weight, share, cost. Narrow, a
 * row is the part with its spec under it and weight over cost on the right.
 * Cells for the other layout are display:none, so they take no grid track;
 * DOM order is the column order of both.
 */
const BOM_COLS =
  "grid-cols-[1.25rem_minmax(0,1fr)_auto_1rem] @[40rem]:grid-cols-[1.25rem_1.5rem_minmax(0,1fr)_auto_auto_auto_auto_auto_3.75rem_auto]";
const BOM_ROW = "col-span-full grid grid-cols-subgrid items-center gap-x-3 @[40rem]:gap-x-5";
const WIDE_ONLY = "hidden @[40rem]:block";
const NARROW_ONLY = "@[40rem]:hidden";

type LedgerT = ReturnType<typeof useTranslations<"command">>;

/** A group's name: the section for bars, the thickness for sheet goods. */
function groupLabel(t: LedgerT, group: BomGroup): string {
  const first = group.members[0].parse;
  if (group.kind === "sheet" && group.alias && group.thicknessMm != null) {
    return t("ledger.sheetGroup", {
      name: formatCommandAliasName(t, group.alias),
      thickness: fsLength(group.thicknessMm),
    });
  }
  return formatCommandParseName(t, first) ?? first.name ?? t("query.newItem");
}

/**
 * The whole assembly: every part with what it weighs and costs, one ruled
 * total for both, then the weight split by part and the cost built up.
 *
 * Parts are grouped the way the stock is bought (see `groupBillOfMaterial`):
 * one profile and size with its cut lengths under it, sheet goods by
 * thickness. A group of one reads as a plain row.
 */
function BillOfMaterial({
  line,
  groups,
  picked,
  onOpen,
}: {
  line: CommandLine;
  groups: BomGroup[];
  picked: number;
  onOpen: (index: number) => void;
}) {
  const t = useTranslations("command");
  const first = line.items.find((item) => item.parse.valid)?.parse ?? line.items[0]?.parse;
  const sym = CURRENCY_SYMBOLS[first?.pricing.currency ?? "EUR"] ?? "€";
  const money = (v: number | null | undefined) => (v != null ? `${sym} ${fsMoney(v)}` : "—");
  const pieces = line.items.reduce((n, item) => n + (item.parse.valid ? item.parse.realQty : 0), 0);
  const count = line.items.length;
  const sub = t("ledger.partsPieces", { parts: count, pieces });
  const num = "whitespace-nowrap text-right font-mono text-[14px] tabular-nums";
  const hasSheet = groups.some((group) => group.kind === "sheet");
  const grades = new Set(groups.map((group) => group.gradeLabel).filter(Boolean));
  const mixedGrades = grades.size > 1;
  const shareOf = (kg: number | null | undefined) =>
    line.totalKg && kg != null ? Math.round((kg / line.totalKg) * 100) : null;

  const shareCell = (share: number | null, groupIndex: number) => (
    <span className={`${WIDE_ONLY}`}>
      {share != null && (
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex h-1.5 w-8" style={{ background: "var(--surface-inset)" }}>
            <span style={{ width: `${share}%`, background: shade(groupIndex) }} />
          </span>
          <span className="font-mono text-[12px] text-foreground-secondary">{share}%</span>
        </span>
      )}
    </span>
  );

  /** One part, clickable into its own sheet. `nested` rows sit under a group header. */
  const partRow = (member: BomMember, group: BomGroup, groupIndex: number, nested: boolean) => {
    const { parse, index, cut } = member;
    const active = index === picked;
    const kg = parse.totalKg;
    const unitKg = parse.calc?.result.unitWeightKg;
    const name = nested ? cut : groupLabel(t, group);
    const ariaName = nested ? `${groupLabel(t, group)} ${cut}` : name;
    const narrowSpec = [
      nested ? `× ${parse.realQty}` : [cut, parse.lengthRaw != null ? `× ${parse.realQty}` : ""].filter(Boolean).join(" "),
      unitKg != null ? t("ledger.perPieceShort", { weight: weightLabel(unitKg) }) : "",
      !nested && mixedGrades ? group.gradeLabel : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <li key={index} className={BOM_ROW}>
        <button
          type="button"
          aria-pressed={active}
          aria-label={t("ledger.openPart", { index: index + 1, name: ariaName })}
          onClick={() => onOpen(index)}
          className={`${BOM_ROW} ${nested ? "min-h-[44px]" : "min-h-[56px]"} w-full cursor-pointer px-1.5 text-left`}
          style={{ ...RULE_FAINT, background: active ? "var(--accent-surface)" : "transparent" }}
        >
          <span
            className="font-mono text-[12px] font-bold"
            style={{ color: active ? "var(--accent)" : "var(--muted-faint)" }}
          >
            {index + 1}
          </span>
          <span className={`${WIDE_ONLY} text-foreground`} aria-hidden="true">
            {!nested && parse.alias ? <CommandGlyph fam={parse.alias.fam} alias={parse.alias.alias} size={20} /> : null}
          </span>
          <span
            className={`flex min-w-0 flex-col gap-0.5 ${nested ? "self-stretch justify-center @[40rem]:col-span-2" : ""}`}
            style={nested ? { borderLeft: "1px solid var(--border)", paddingLeft: 10, marginLeft: 6 } : undefined}
          >
            <span
              className={`break-words ${nested ? "font-mono text-[14px] font-semibold" : "text-[15px] font-bold"}`}
              style={{ color: parse.valid ? "var(--foreground)" : "var(--muted)" }}
            >
              {name}
            </span>
            {!nested && mixedGrades && group.gradeLabel && (
              <span className={`${WIDE_ONLY} truncate font-mono text-[12px] text-foreground-secondary`}>
                {group.gradeLabel}
              </span>
            )}
            <span className={`${NARROW_ONLY} truncate font-mono text-[12px] text-foreground-secondary`}>
              {narrowSpec}
            </span>
          </span>
          {/* A nested row's cut already fills the part and length columns. */}
          {!nested && <span className={`${WIDE_ONLY} ${num}`}>{cut || "—"}</span>}
          <span className={`${WIDE_ONLY} ${num}`}>× {parse.realQty}</span>
          <span className={`${WIDE_ONLY} ${num} text-foreground-secondary`}>
            {nested ? "" : parse.kgm != null && group.kind !== "sheet" ? fsKgm(parse.kgm) : "—"}
          </span>
          <span className={`${WIDE_ONLY} ${num} text-foreground-secondary`}>
            {unitKg != null ? fsWeight(unitKg) : "—"}
          </span>
          <span className={`${WIDE_ONLY} ${num} text-[15px] ${nested ? "text-foreground-secondary" : "font-semibold text-foreground"}`}>
            {weightLabel(kg)}
          </span>
          {shareCell(shareOf(kg), groupIndex)}
          <span className={`${WIDE_ONLY} ${num} text-[15px] ${nested ? "text-foreground-secondary" : "text-foreground"}`}>
            {money(parse.totalAmount)}
          </span>
          <span className={`${NARROW_ONLY} flex flex-col items-end gap-0.5`}>
            <span className={`${num} ${nested ? "text-[14px]" : "text-[15px] font-semibold"} text-foreground`}>
              {weightLabel(kg)}
            </span>
            <span className={`${num} text-[13px] text-foreground-secondary`}>{money(parse.totalAmount)}</span>
          </span>
          <span className={`${NARROW_ONLY} text-muted`} aria-hidden="true">
            <Chevron dir="right" />
          </span>
        </button>
      </li>
    );
  };

  /** A group of several parts: its name and sums, the parts under it. */
  const groupRows = (group: BomGroup, groupIndex: number) => {
    const label = groupLabel(t, group);
    const lead = group.members[0].parse;
    const metres = group.totalLengthM != null ? `${fsLength(group.totalLengthM)} m` : "";
    const narrowSub = [t("ledger.groupPieces", { count: group.pieces }), metres, mixedGrades ? group.gradeLabel : ""]
      .filter(Boolean)
      .join(" · ");
    return (
      <li key={group.key} className={BOM_ROW} aria-label={t("ledger.group", { name: label, count: group.members.length })}>
        <div data-bom-group="" className={`${BOM_ROW} min-h-[48px] px-1.5 pt-2`} style={RULE_FAINT}>
          <span />
          <span className={`${WIDE_ONLY} text-foreground`} aria-hidden="true">
            {lead.alias ? <CommandGlyph fam={lead.alias.fam} alias={lead.alias.alias} size={20} /> : null}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="break-words text-[15px] font-bold text-foreground">{label}</span>
            {mixedGrades && group.gradeLabel && (
              <span className={`${WIDE_ONLY} truncate font-mono text-[12px] text-foreground-secondary`}>
                {group.gradeLabel}
              </span>
            )}
            <span className={`${NARROW_ONLY} truncate font-mono text-[12px] text-foreground-secondary`}>{narrowSub}</span>
          </span>
          <span className={`${WIDE_ONLY} ${num} text-foreground-secondary`}>{metres}</span>
          <span className={`${WIDE_ONLY} ${num} font-semibold`}>{group.pieces}</span>
          <span className={`${WIDE_ONLY} ${num} text-foreground-secondary`}>
            {group.kind === "section" && lead.kgm != null ? fsKgm(lead.kgm) : ""}
          </span>
          <span className={WIDE_ONLY} />
          <span className={`${WIDE_ONLY} ${num} text-[15px] font-semibold text-foreground`}>
            {weightLabel(group.totalKg)}
          </span>
          {shareCell(shareOf(group.totalKg), groupIndex)}
          <span className={`${WIDE_ONLY} ${num} text-[15px] text-foreground`}>{money(group.totalAmount)}</span>
          <span className={`${NARROW_ONLY} flex flex-col items-end gap-0.5`}>
            <span className={`${num} text-[15px] font-semibold text-foreground`}>{weightLabel(group.totalKg)}</span>
            <span className={`${num} text-[13px] text-foreground-secondary`}>{money(group.totalAmount)}</span>
          </span>
          <span className={NARROW_ONLY} />
        </div>
        <ol className={`${BOM_ROW} m-0 list-none p-0`}>
          {group.members.map((member) => partRow(member, group, groupIndex, true))}
        </ol>
      </li>
    );
  };

  return (
    <>
      <SheetHeader title={t("ledger.billOfMaterial")} sub={sub} />

      <div className="@container">
        <div className={`grid ${BOM_COLS}`}>
          <div aria-hidden="true" className={`${BOM_ROW} px-1.5 pb-1.5`} style={RULE_INK}>
            <span className={CAPTION}>#</span>
            <span className={`${CAPTION} ${WIDE_ONLY}`} />
            <span className={CAPTION}>{t("ledger.part")}</span>
            <span className={`${CAPTION} ${WIDE_ONLY} text-right`}>
              {hasSheet ? t("ledger.lengthOrSize") : t("ledger.length")}
            </span>
            <span className={`${CAPTION} ${WIDE_ONLY} text-right`}>{t("ledger.pieces")}</span>
            <span className={`${CAPTION} ${WIDE_ONLY} text-right`}>{t("ledger.kgm")}</span>
            <span className={`${CAPTION} ${WIDE_ONLY} text-right`}>{t("ledger.kgPiece")}</span>
            <span className={`${CAPTION} ${WIDE_ONLY} text-right`}>{t("ledger.weight")}</span>
            <span className={`${CAPTION} ${WIDE_ONLY}`}>{t("ledger.shareColumn")}</span>
            <span className={`${CAPTION} ${WIDE_ONLY} text-right`}>{t("ledger.cost")}</span>
            <span className={`${CAPTION} ${NARROW_ONLY} text-right`}>
              {t("ledger.weight")} / {t("ledger.cost")}
            </span>
            <span className={NARROW_ONLY} />
          </div>

          <ol className={`${BOM_ROW} m-0 list-none p-0`} aria-label={t("result.assemblyParts")}>
            {groups.map((group, groupIndex) =>
              group.members.length > 1
                ? groupRows(group, groupIndex)
                : partRow(group.members[0], group, groupIndex, false),
            )}
          </ol>

          <div className={`${BOM_ROW} mt-1.5 items-baseline px-1.5 pb-2.5 pt-3`} style={TOTAL_RULES}>
            <span />
            <span className={WIDE_ONLY} />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-foreground">{t("ledger.total")}</span>
              <span className="font-mono text-[12px] text-foreground-secondary">{sub}</span>
            </span>
            <span className={WIDE_ONLY} />
            <span className={`${WIDE_ONLY} ${num}`}>{pieces}</span>
            <span className={WIDE_ONLY} />
            <span className={WIDE_ONLY} />
            <span
              data-row="totalWeight"
              className={`${WIDE_ONLY} ${num} text-[22px] font-bold`}
              style={{ color: "var(--accent)" }}
            >
              {weightLabel(line.totalKg)}
            </span>
            <span className={WIDE_ONLY} />
            <span data-row="totalCost" className={`${WIDE_ONLY} ${num} text-[20px] font-bold text-foreground`}>
              {money(line.totalAmount)}
            </span>
            <span className={`${NARROW_ONLY} flex flex-col items-end gap-0.5`}>
              <span className={`${num} text-[20px] font-bold`} style={{ color: "var(--accent)" }}>
                {weightLabel(line.totalKg)}
              </span>
              <span className={`${num} text-[15px] font-bold text-foreground`}>{money(line.totalAmount)}</span>
            </span>
            <span className={NARROW_ONLY} />
          </div>
        </div>

        <div className="mt-7 grid gap-x-10 gap-y-7 @[40rem]:grid-cols-2">
          <WeightByPart line={line} groups={groups} picked={picked} />
          <CostBuildUp line={line} />
        </div>
      </div>
    </>
  );
}

/** Each group's share of the weight, one bar a group. */
function WeightByPart({ line, groups, picked }: { line: CommandLine; groups: BomGroup[]; picked: number }) {
  const t = useTranslations("command");
  if (!line.totalKg) return null;
  const total = line.totalKg;
  return (
    <section aria-label={t("ledger.weightByPart")} className="flex flex-col">
      <div className="pb-1.5" style={RULE_INK}>
        <span className={`${CAPTION} font-semibold text-foreground`}>{t("ledger.weightByPart")}</span>
      </div>
      {groups.map((group, index) => {
        const kg = group.totalKg ?? 0;
        const share = Math.round((kg / total) * 100);
        const numbers = group.members.map((m) => m.index + 1).join(", ");
        const holdsPicked = group.members.some((m) => m.index === picked);
        return (
          <div
            key={group.key}
            className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 py-2"
            style={RULE_FAINT}
          >
            <span
              className="truncate text-[13px]"
              style={{ color: holdsPicked ? "var(--foreground)" : "var(--foreground-secondary)" }}
            >
              {numbers} · {groupLabel(t, group)}
            </span>
            <span aria-hidden="true" className="flex h-2.5" style={{ background: "var(--surface-inset)" }}>
              <span style={{ width: `${share}%`, background: shade(index) }} />
            </span>
            <span className="whitespace-nowrap font-mono text-[13px] tabular-nums text-foreground">
              {share}%
            </span>
          </div>
        );
      })}
    </section>
  );
}

/**
 * The assembly's cost built up from material, waste and VAT (and the sell
 * price, with a margin set), summed from what each part's own calculation
 * already carries. A subtotal alone would only repeat the total, so without
 * waste, VAT or margin there is nothing to show.
 */
function CostBuildUp({ line }: { line: CommandLine }) {
  const t = useTranslations("command");
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
  const first = line.items.find((item) => item.parse.valid)?.parse;
  if (!line.valid || !first) return null;
  const sym = CURRENCY_SYMBOLS[first.pricing.currency] ?? "€";
  const money = (v: number) => `${sym} ${fsMoney(v)}`;
  const results = line.items.flatMap((item) => (item.parse.calc ? [item.parse.calc.result] : []));
  const sum = (key: "subtotalAmount" | "wasteAmount" | "vatAmount") =>
    results.reduce((n, r) => n + r[key], 0);
  const rows: { id: string; label: string; value: string; muted?: boolean }[] = [
    { id: "subtotal", label: t("result.subtotal"), value: money(sum("subtotalAmount")) },
    ...(first.pricing.wastePercent > 0
      ? [{ id: "waste", label: t("result.waste", { percent: first.pricing.wastePercent }), value: money(sum("wasteAmount")) }]
      : []),
    ...(first.pricing.includeVat
      ? [{ id: "vat", label: t("result.vat", { percent: first.pricing.vatPercent }), value: money(sum("vatAmount")) }]
      : []),
    ...(marginPercent > 0 && line.totalAmount != null
      ? [{
          id: "sellPrice",
          label: t("result.sellPrice", { percent: marginPercent }),
          value: money(sellPrice(line.totalAmount, marginPercent)),
          muted: true,
        }]
      : []),
  ];
  if (rows.length < 2) return null;
  return (
    <section aria-label={t("ledger.costBuildUp")} className="flex flex-col">
      <div className="pb-1.5" style={RULE_INK}>
        <span className={`${CAPTION} font-semibold text-foreground`}>{t("ledger.costBuildUp")}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          data-row={row.id}
          className="flex items-baseline justify-between gap-3 py-2"
          style={RULE_FAINT}
        >
          <span className={`text-[13px] ${row.muted ? "text-muted" : "text-foreground-secondary"}`}>{row.label}</span>
          <span className="font-mono text-[14px] tabular-nums text-foreground">{row.value}</span>
        </div>
      ))}
    </section>
  );
}
