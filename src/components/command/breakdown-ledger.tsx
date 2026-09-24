"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { ProfileDrawing } from "./profile-drawing";
import { formatAvailability, formatCommandParseName } from "./command-copy";
import { buildBreakdownRows, sellPrice, type BreakdownRow, type BreakdownRowId, type BreakdownRows } from "./breakdown-rows";
import { CommandGlyph } from "./command-glyph";
import { applyNearbySpec, NearbySpecs } from "./nearby-specs";
import { Link } from "@/i18n/navigation";
import { haptic } from "@/lib/haptics";
import {
  marginPercentStore,
  massTolerancePercentStore,
  showSectionPropertiesStore,
} from "@/lib/settings-stores";

/**
 * The result breakdown, as two ledgers: Weight and Cost, each a short list of
 * figures ending in a ruled total. The phone sheet and the desk rail render
 * this same component. The sheet puts the two ledgers behind tabs; the wide
 * rail lays both open, each figure for one piece beside all of them, and an
 * assembly's parts carry weight and cost side by side.
 *
 * On a `+`-joined line the ledger's rows are the parts: what each weighs or
 * costs and its share of the whole. A part opens into its own ledger — the
 * same one a single calculation gets. Where the numbers come from (area,
 * density, formula, the standard) is one tap further, under "How it's
 * calculated", for whoever wants to check. A standard section's catalogue
 * properties (Iy, Wel, Wpl…) fold the same way, under "Section properties" —
 * only when that setting is on; it is off by default.
 */

type Tab = "weight" | "cost";

const WEIGHT_ROWS: BreakdownRowId[] = ["massPerMetre", "massPerArea", "length", "perPieceWeight", "pieces"];
const COST_ROWS: BreakdownRowId[] = ["rate", "perPiecePrice", "subtotal", "waste", "vat"];
const SOURCE_ROWS: BreakdownRowId[] = ["density", "sectionArea", "formula", "reference"];

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
  /** The hero's metric: the ledger opens on the same figure. */
  metric: "weight" | "price";
  variant: "sheet" | "rail";
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  const t = useTranslations("command");
  const [tabOverride, setTabOverride] = useState<Tab | null>(null);
  const tab: Tab = tabOverride ?? (metric === "price" ? "cost" : "weight");
  const multi = Boolean(line?.multi);
  const [scope, setScope] = useState<"assembly" | "part">("assembly");
  const showAssembly = multi && scope === "assembly";

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

  const openPart = (index: number) => {
    onPick(index);
    setScope("part");
  };

  return (
    <div className="@container flex flex-col gap-4">
      {multi && line && variant === "rail" && (
        <ScopeSwitch
          scope={scope}
          partLabel={t("ledger.partScope", {
            index: picked + 1,
            name: formatCommandParseName(t, line.items[picked]?.parse ?? p) ?? "",
          })}
          onScope={setScope}
          line={line}
          picked={picked}
          onPick={onPick}
        />
      )}
      {multi && line && variant === "sheet" && scope === "part" && (
        <PartNav line={line} picked={picked} onPick={onPick} onBack={() => setScope("assembly")} />
      )}

      {showAssembly && line ? (
        variant === "rail" ? (
          <RailAssemblyLedger line={line} picked={picked} onOpen={openPart} />
        ) : (
          <AssemblyLedger line={line} picked={picked} tab={tab} onTab={setTabOverride} onOpen={openPart} />
        )
      ) : (
        <PartLedger
          p={p}
          line={line}
          variant={variant}
          tab={tab}
          onTab={setTabOverride}
          marginPercent={marginPercent}
          massTolerancePercent={massTolerancePercent}
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

function ScopeSwitch({
  scope,
  partLabel,
  onScope,
  line,
  picked,
  onPick,
}: {
  scope: "assembly" | "part";
  partLabel: string;
  onScope: (scope: "assembly" | "part") => void;
  line: CommandLine;
  picked: number;
  onPick: (index: number) => void;
}) {
  const t = useTranslations("command");
  const count = line.items.length;
  const name = (i: number) => formatCommandParseName(t, line.items[i].parse) ?? line.items[i].parse.name ?? "";
  // Stepping through parts is only useful while one is open.
  const stepper = scope === "part" && count > 1;
  const step =
    "inline-flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center text-foreground disabled:pointer-events-none disabled:opacity-30";
  const button = (value: "assembly" | "part", label: string, first: boolean) => (
    <button
      type="button"
      aria-pressed={scope === value}
      onClick={() => onScope(value)}
      className="h-10 min-w-0 flex-1 cursor-pointer truncate px-3 text-left text-[13px] text-foreground transition-colors"
      style={{
        borderLeft: first ? undefined : "1px solid var(--border-faint)",
        background: scope === value ? "var(--surface-inset)" : "transparent",
        fontWeight: scope === value ? 700 : 500,
        boxShadow: scope === value ? "inset 0 -2px 0 var(--accent)" : undefined,
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="flex border" style={{ borderColor: "var(--border-faint)" }}>
      <div role="group" aria-label={t("ledger.scope")} className="flex min-w-0 flex-1">
        {button("assembly", t("ledger.wholeAssembly"), true)}
        {button("part", partLabel, false)}
      </div>
      {stepper && (
        <span className="flex flex-shrink-0 items-center" style={{ borderLeft: "1px solid var(--border-faint)" }}>
          <button
            type="button"
            className={step}
            disabled={picked === 0}
            onClick={() => onPick(picked - 1)}
            aria-label={picked > 0 ? t("ledger.previousPart", { name: name(picked - 1) }) : undefined}
          >
            <Chevron dir="left" />
          </button>
          <span className="font-mono text-[12px] text-muted">
            {picked + 1}/{count}
          </span>
          <button
            type="button"
            className={step}
            disabled={picked >= count - 1}
            onClick={() => onPick(picked + 1)}
            aria-label={picked < count - 1 ? t("ledger.nextPart", { name: name(picked + 1) }) : undefined}
          >
            <Chevron dir="right" />
          </button>
        </span>
      )}
    </div>
  );
}

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

function PartNav({
  line,
  picked,
  onPick,
  onBack,
}: {
  line: CommandLine;
  picked: number;
  onPick: (index: number) => void;
  onBack: () => void;
}) {
  const t = useTranslations("command");
  const count = line.items.length;
  const name = (i: number) => formatCommandParseName(t, line.items[i].parse) ?? line.items[i].parse.name ?? "";
  const nav =
    "inline-flex h-11 w-11 items-center justify-center text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer";
  return (
    <div className="-mx-2 -mt-1 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-11 cursor-pointer items-center gap-1.5 px-2 text-[14px] font-semibold text-foreground"
      >
        <Chevron dir="left" />
        {t("ledger.backToAssembly")}
      </button>
      <span className="flex items-center">
        <button
          type="button"
          className={nav}
          disabled={picked === 0}
          onClick={() => onPick(picked - 1)}
          aria-label={picked > 0 ? t("ledger.previousPart", { name: name(picked - 1) }) : undefined}
        >
          <Chevron dir="left" />
        </button>
        <span className="font-mono text-[13px] text-muted">
          {picked + 1} / {count}
        </span>
        <button
          type="button"
          className={nav}
          disabled={picked >= count - 1}
          onClick={() => onPick(picked + 1)}
          aria-label={picked < count - 1 ? t("ledger.nextPart", { name: name(picked + 1) }) : undefined}
        >
          <Chevron dir="right" />
        </button>
      </span>
    </div>
  );
}

function Tabs({
  tab,
  onTab,
  weight,
  cost,
  ids,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  weight: string;
  cost: string;
  ids: { weightTab: string; costTab: string; weightPanel: string; costPanel: string };
}) {
  const t = useTranslations("command");
  const button = (value: Tab, label: string, figure: string, first: boolean) => (
    <button
      type="button"
      role="tab"
      id={value === "weight" ? ids.weightTab : ids.costTab}
      aria-selected={tab === value}
      aria-controls={value === "weight" ? ids.weightPanel : ids.costPanel}
      tabIndex={tab === value ? 0 : -1}
      onClick={() => onTab(value)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const next = value === "weight" ? "cost" : "weight";
          onTab(next);
          document.getElementById(next === "weight" ? ids.weightTab : ids.costTab)?.focus();
        }
      }}
      className="flex h-11 min-w-0 cursor-pointer items-center justify-center gap-2 px-2 text-[14px] transition-colors"
      style={{
        borderLeft: first ? undefined : "1px solid var(--border)",
        background: tab === value ? "var(--foreground)" : "var(--surface)",
        color: tab === value ? "var(--background)" : "var(--foreground)",
        fontWeight: tab === value ? 700 : 600,
      }}
    >
      {label}
      <span className="truncate font-mono text-[13px] font-medium opacity-75">{figure}</span>
    </button>
  );
  return (
    <div role="tablist" aria-label={t("ledger.view")} className="grid grid-cols-2 border" style={{ borderColor: "var(--border)" }}>
      {button("weight", t("ledger.weight"), weight, true)}
      {button("cost", t("ledger.cost"), cost, false)}
    </div>
  );
}

function Row({ row }: { row: BreakdownRow }) {
  return (
    <div
      data-row={row.id}
      className="flex items-baseline justify-between gap-3 py-2.5"
      style={{ borderBottom: "1px solid var(--border-faint)" }}
    >
      <span className="text-[14px] text-foreground-secondary">{row.label}</span>
      <span className="font-mono text-[15px] tabular-nums text-foreground">{row.value}</span>
    </div>
  );
}

function Total({
  id,
  label,
  value,
  accent,
  sub,
}: {
  id: string;
  label: string;
  value: string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div
      data-row={id}
      className="mt-1.5 flex items-baseline justify-between gap-3 pb-2.5 pt-3"
      style={{ borderTop: "1.5px solid var(--foreground)", borderBottom: "3px double var(--foreground)" }}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold text-foreground">{label}</span>
        {sub && <span className="font-mono text-[12px] text-foreground-secondary">{sub}</span>}
      </span>
      <span
        className="font-mono text-[22px] font-bold tabular-nums"
        style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ───────────────────────── the desk rail's two columns ───────────────────────── */

const RULE_FAINT = { borderBottom: "1px solid var(--border-faint)" };

/**
 * One ledger on the wide rail: every figure that scales with quantity shown
 * for one piece beside all of them, so neither is a tap away. Figures that
 * don't scale (mass per metre, the rate) span both columns. A single piece
 * collapses to one column — the two would say the same thing.
 */
function TwinLedger({
  title,
  qty,
  rows,
  twin,
  total,
  accent,
  after,
}: {
  title: string;
  qty: number;
  rows: BreakdownRow[];
  twin: BreakdownRows["twin"];
  total?: BreakdownRow;
  accent?: boolean;
  after?: BreakdownRow;
}) {
  const t = useTranslations("command");
  const single = qty <= 1;
  const each = t("ledger.onePiece");
  const all = t("ledger.allPieces", { count: qty });
  const line = "col-span-full grid grid-cols-subgrid items-baseline";

  const cells = (row: BreakdownRow, big: boolean) => {
    const pair = twin[row.id];
    if (single || !pair) {
      return (
        <span
          className={`${single ? "" : "col-span-2"} text-right font-mono tabular-nums ${big ? "text-[22px] font-bold" : "text-[15px]"}`}
          style={{ color: big && accent ? "var(--accent)" : "var(--foreground)" }}
        >
          {pair?.total ?? row.value}
        </span>
      );
    }
    return (
      <>
        <span className={`text-right font-mono tabular-nums ${big ? "text-[16px] text-foreground-secondary" : "text-[15px] text-foreground"}`}>
          <span className="sr-only">{each}: </span>
          <span>{pair.each}</span>
        </span>
        <span
          className={`text-right font-mono tabular-nums ${big ? "text-[22px] font-bold" : "text-[15px]"}`}
          style={{ color: big && accent ? "var(--accent)" : "var(--foreground)" }}
        >
          <span className="sr-only">{all}: </span>
          <span>{pair.total}</span>
        </span>
      </>
    );
  };

  return (
    <section
      aria-label={title}
      className="grid gap-x-4"
      style={{ gridTemplateColumns: single ? "minmax(0,1fr) auto" : "minmax(0,1fr) auto auto" }}
    >
      <div className={`${line} pb-1.5`} style={{ borderBottom: "1px solid var(--foreground)" }}>
        <span className="fs-title text-[18px] text-foreground">{title}</span>
        {!single && (
          <>
            <span aria-hidden="true" className="self-end text-right font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {each}
            </span>
            <span aria-hidden="true" className="self-end text-right font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
              {all}
            </span>
          </>
        )}
      </div>
      {rows.map((row) => (
        <div key={row.id} data-row={row.id} className={`${line} py-2.5`} style={RULE_FAINT}>
          <span className="text-[14px] text-foreground-secondary">{row.label}</span>
          {cells(row, false)}
        </div>
      ))}
      {total && (
        <div
          data-row={total.id}
          className={`${line} mt-1.5 pb-2.5 pt-3`}
          style={{ borderTop: "1.5px solid var(--foreground)", borderBottom: "3px double var(--foreground)" }}
        >
          <span className="text-[15px] font-bold text-foreground">{total.label}</span>
          {cells(total, true)}
        </div>
      )}
      {after && (
        <div data-row={after.id} className={`${line} mt-2 py-2.5`} style={RULE_FAINT}>
          <span className="text-[14px] text-muted">{after.label}</span>
          {cells(after, false)}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── one calculation ───────────────────────── */

function PartLedger({
  p,
  line,
  variant,
  tab,
  onTab,
  marginPercent,
  massTolerancePercent,
  onNearby,
}: {
  p: CommandParseResult;
  line?: CommandLine;
  variant: "sheet" | "rail";
  tab: Tab;
  onTab: (tab: Tab) => void;
  marginPercent: number;
  massTolerancePercent: number;
  onNearby: Parameters<typeof NearbySpecs>[0]["onPick"];
}) {
  const t = useTranslations("command");
  const uid = useId();
  const showSection = useSyncExternalStore(
    showSectionPropertiesStore.subscribe,
    showSectionPropertiesStore.getSnapshot,
    showSectionPropertiesStore.getServerSnapshot,
  );
  const rows = p.valid ? buildBreakdownRows(p, t, { marginPercent, massTolerancePercent }) : null;
  if (!rows || !p.calc) return null;

  const all = [...rows.geometry, ...rows.pricing];
  const find = (id: BreakdownRowId) => all.find((row) => row.id === id);
  const totalWeight = find("totalWeight");
  const totalCost = find("totalCost");
  const massBand = find("massBand");
  const sell = find("sellPrice");
  const share =
    line?.multi && line.totalKg && p.totalKg != null
      ? Math.round((p.totalKg / line.totalKg) * 100)
      : null;
  const ids = {
    weightTab: `${uid}-wt`,
    costTab: `${uid}-ct`,
    weightPanel: `${uid}-wp`,
    costPanel: `${uid}-cp`,
  };
  const spec = [p.gradeLabel ?? p.calc.result.gradeLabel, partSpec(p)].filter(Boolean).join(" · ");

  if (variant === "rail") {
    const qty = p.calc.result.quantity;
    return (
      <>
        {/* Drawing beside the name while the rail has the room, which lifts
            both ledgers above the fold; stacked on a narrow desk. */}
        <div className="grid items-center gap-4 @[30rem]:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] @[30rem]:gap-5">
          <div
            className="flex items-center justify-center"
            style={{ background: "var(--surface-inset)", padding: "14px 10px" }}
          >
            <ProfileDrawing p={p} className="w-full flex flex-col items-center" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="fs-track-tight break-words text-[22px] font-extrabold leading-tight text-foreground">
              {formatCommandParseName(t, p)}
            </span>
            <span className="font-mono text-[13px] leading-[1.5] text-foreground-secondary">{spec}</span>
            {share != null && (
              <span className="mt-1.5 flex flex-col gap-1.5">
                <span className="font-mono text-[12px] text-foreground-secondary">
                  {t("ledger.share", { percent: share })}
                </span>
                <span aria-hidden="true" className="flex h-1.5" style={{ background: "var(--surface-inset)" }}>
                  <span style={{ width: `${share}%`, background: "var(--accent)" }} />
                </span>
              </span>
            )}
          </div>
        </div>

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

        <TwinLedger
          title={t("ledger.weight")}
          qty={qty}
          rows={pick(rows.geometry, ["massPerMetre", "massPerArea", "length"])}
          twin={rows.twin}
          total={totalWeight}
          accent
          after={massBand}
        />
        <TwinLedger
          title={t("ledger.cost")}
          qty={qty}
          rows={pick(rows.pricing, ["rate", "subtotal", "waste", "vat"])}
          twin={rows.twin}
          total={totalCost}
          after={sell}
        />

        {showSection && rows.section.length > 0 && <SectionProperties rows={rows.section} />}

        <NearbySpecs input={p.calc.input} onPick={onNearby} />

        <HowCalculated rows={pick(rows.geometry, SOURCE_ROWS)} />
      </>
    );
  }

  return (
    <>
      {/* The full drawing, dimensions and all, on the sheet too — the
          thumbnail dropped the callouts, and those are the exact sizes a
          reader checks the section against. */}
      <div
        className="flex items-center justify-center"
        style={{ background: "var(--surface-inset)", padding: "14px 10px" }}
      >
        <ProfileDrawing p={p} className="w-full flex flex-col items-center" />
      </div>
      <div className="-mt-1 flex flex-col gap-0.5">
        <span className="fs-track-tight text-[20px] font-extrabold text-foreground">
          {formatCommandParseName(t, p)}
        </span>
        <span className="font-mono text-[13px] text-foreground-secondary">
          {share != null ? `${spec} · ${t("ledger.share", { percent: share })}` : spec}
        </span>
      </div>

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

      <Tabs
        tab={tab}
        onTab={onTab}
        weight={totalWeight?.value ?? "—"}
        cost={totalCost?.value ?? "—"}
        ids={ids}
      />

      <div role="tabpanel" id={ids.weightPanel} aria-labelledby={ids.weightTab} hidden={tab !== "weight"}>
        {pick(rows.geometry, WEIGHT_ROWS).map((row) => (
          <Row key={row.id} row={row} />
        ))}
        {totalWeight && <Total id="totalWeight" label={totalWeight.label} value={totalWeight.value} accent />}
        {massBand && (
          <div className="pt-2">
            <Row row={massBand} />
          </div>
        )}
      </div>

      <div role="tabpanel" id={ids.costPanel} aria-labelledby={ids.costTab} hidden={tab !== "cost"}>
        {pick(rows.pricing, COST_ROWS).map((row) => (
          <Row key={row.id} row={row} />
        ))}
        {totalCost && <Total id="totalCost" label={totalCost.label} value={totalCost.value} />}
        {sell && (
          <div className="pt-2">
            <Row row={sell} />
          </div>
        )}
      </div>

      {showSection && rows.section.length > 0 && <SectionProperties rows={rows.section} />}

      <NearbySpecs input={p.calc.input} onPick={onNearby} />

      <HowCalculated rows={pick(rows.geometry, SOURCE_ROWS)} />
    </>
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

const SHARE_SHADES = ["var(--accent)", "color-mix(in oklab, var(--accent) 70%, var(--surface))", "color-mix(in oklab, var(--accent) 45%, var(--surface))", "color-mix(in oklab, var(--accent) 28%, var(--surface))"];

function AssemblyLedger({
  line,
  picked,
  tab,
  onTab,
  onOpen,
}: {
  line: CommandLine;
  picked: number;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onOpen: (index: number) => void;
}) {
  const t = useTranslations("command");
  const uid = useId();
  const sym = CURRENCY_SYMBOLS[line.items[0]?.parse.pricing.currency ?? "EUR"] ?? "€";
  const money = (v: number | null | undefined) => (v != null ? `${sym} ${fsMoney(v)}` : "—");
  const pieces = line.items.reduce((n, item) => n + (item.parse.valid ? item.parse.realQty : 0), 0);
  const count = line.items.length;
  const compact = count > 4;
  const sub = t("ledger.partsPieces", { parts: count, pieces });
  const ids = {
    weightTab: `${uid}-wt`,
    costTab: `${uid}-ct`,
    weightPanel: `${uid}-wp`,
    costPanel: `${uid}-cp`,
  };

  const list = (field: Tab) => (
    <ol
      className="m-0 flex list-none flex-col p-0"
      aria-label={field === "weight" ? t("result.assemblyParts") : t("ledger.assemblyCost")}
    >
      {line.items.map((item, index) => {
        const parse = item.parse;
        const active = index === picked;
        const kg = parse.totalKg;
        const share = line.totalKg && kg != null ? Math.round((kg / line.totalKg) * 100) : null;
        const name = formatCommandParseName(t, parse) ?? parse.name ?? t("query.newItem");
        const spec = partSpec(parse);
        return (
          <li key={index}>
            <button
              type="button"
              aria-pressed={active}
              aria-label={t("ledger.openPart", { index: index + 1, name })}
              onClick={() => onOpen(index)}
              className={`grid w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto_16px] items-center gap-2.5 px-1.5 text-left ${
                compact ? "min-h-11" : "min-h-[54px]"
              }`}
              style={{
                borderBottom: "1px solid var(--border-faint)",
                background: active ? "var(--accent-surface)" : "transparent",
              }}
            >
              <span
                className="font-mono text-[12px] font-bold"
                style={{ color: active ? "var(--accent)" : "var(--muted-faint)" }}
              >
                {index + 1}
              </span>
              <span className={`flex min-w-0 ${compact ? "items-baseline gap-2" : "flex-col gap-0.5"}`}>
                <span
                  className={`truncate font-bold ${compact ? "text-[14px]" : "text-[15px]"}`}
                  style={{ color: parse.valid ? "var(--foreground)" : "var(--muted)" }}
                >
                  {name}
                </span>
                <span className="truncate font-mono text-[12px] text-foreground-secondary">
                  {spec}
                  {!compact && share != null ? ` · ${share}%` : ""}
                </span>
              </span>
              <span className={`font-mono tabular-nums text-foreground ${compact ? "text-[14px]" : "text-[15px]"} font-semibold`}>
                {field === "weight" ? weightLabel(kg) : money(parse.totalAmount)}
              </span>
              <span className="text-muted" aria-hidden="true">
                <Chevron dir="right" />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <Tabs
        tab={tab}
        onTab={onTab}
        weight={weightLabel(line.totalKg)}
        cost={money(line.totalAmount)}
        ids={ids}
      />
      <div role="tabpanel" id={ids.weightPanel} aria-labelledby={ids.weightTab} hidden={tab !== "weight"}>
        {line.totalKg ? (
          <div aria-hidden="true" className="mb-2 flex h-2 gap-0.5">
            {line.items.map((item, index) => (
              <span
                key={index}
                style={{
                  flex: `${Math.max((item.parse.totalKg ?? 0) / line.totalKg!, 0.01).toFixed(3)} 1 0%`,
                  background: SHARE_SHADES[Math.min(index, SHARE_SHADES.length - 1)],
                  outline: index === picked ? "2px solid var(--foreground)" : undefined,
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
        ) : null}
        {list("weight")}
        <Total id="totalWeight" label={t("result.totalWeight")} value={weightLabel(line.totalKg)} accent sub={sub} />
      </div>
      <div role="tabpanel" id={ids.costPanel} aria-labelledby={ids.costTab} hidden={tab !== "cost"}>
        {list("cost")}
        <Total id="totalCost" label={t("result.totalCost")} value={money(line.totalAmount)} sub={sub} />
      </div>
    </>
  );
}

/**
 * The assembly on the wide rail: weight and cost side by side for every part,
 * one ruled total for both, and the cost built up from material, waste and
 * VAT — the sheet's two tabs laid open.
 */
function RailAssemblyLedger({
  line,
  picked,
  onOpen,
}: {
  line: CommandLine;
  picked: number;
  onOpen: (index: number) => void;
}) {
  const t = useTranslations("command");
  const marginPercent = useSyncExternalStore(
    marginPercentStore.subscribe,
    marginPercentStore.getSnapshot,
    marginPercentStore.getServerSnapshot,
  );
  const first = line.items.find((item) => item.parse.valid)?.parse ?? line.items[0]?.parse;
  const sym = CURRENCY_SYMBOLS[first?.pricing.currency ?? "EUR"] ?? "€";
  const money = (v: number | null | undefined) => (v != null ? `${sym} ${fsMoney(v)}` : "—");
  const pieces = line.items.reduce((n, item) => n + (item.parse.valid ? item.parse.realQty : 0), 0);
  const count = line.items.length;
  const sub = t("ledger.partsPieces", { parts: count, pieces });
  const cols = "1.25rem 1.5rem minmax(0,1fr) auto auto 1rem";
  const row = "col-span-full grid grid-cols-subgrid items-center";
  const head = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted";

  // The build-up sums what each part's own calculation already carries.
  const results = line.items.flatMap((item) => (item.parse.calc ? [item.parse.calc.result] : []));
  const sum = (key: "subtotalAmount" | "wasteAmount" | "vatAmount") =>
    results.reduce((n, r) => n + r[key], 0);
  const buildUp: { id: string; label: string; value: string; muted?: boolean }[] =
    line.valid && first
      ? [
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
        ]
      : [];

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="fs-track-tight text-[22px] font-extrabold leading-tight text-foreground">{t("ledger.assembly")}</span>
        <span className="font-mono text-[13px] text-foreground-secondary">{sub}</span>
      </div>

      {line.totalKg ? (
        <div aria-hidden="true" className="flex flex-col gap-1.5">
          <div className="flex h-3 gap-0.5">
            {line.items.map((item, index) => (
              <span
                key={index}
                style={{
                  flex: `${Math.max((item.parse.totalKg ?? 0) / line.totalKg!, 0.01).toFixed(3)} 1 0%`,
                  background: SHARE_SHADES[Math.min(index, SHARE_SHADES.length - 1)],
                  outline: index === picked ? "2px solid var(--foreground)" : undefined,
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>
          <div className="flex gap-0.5 font-mono text-[11px] text-foreground-secondary">
            {line.items.map((item, index) => {
              const share = Math.round(((item.parse.totalKg ?? 0) / line.totalKg!) * 100);
              return (
                <span
                  key={index}
                  className="min-w-0 overflow-hidden whitespace-nowrap"
                  style={{ flex: `${Math.max(share, 12)} 1 0%` }}
                >
                  {index + 1} · {share}%
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-x-3.5" style={{ gridTemplateColumns: cols }}>
        <div aria-hidden="true" className={`${row} px-1 pb-1.5`} style={{ borderBottom: "1px solid var(--foreground)" }}>
          <span className={head}>#</span>
          <span />
          <span className={head}>{t("ledger.part")}</span>
          <span className={`${head} text-right`}>{t("ledger.weight")}</span>
          <span className={`${head} text-right`}>{t("ledger.cost")}</span>
          <span />
        </div>
        <ol className={`${row} m-0 list-none p-0`} aria-label={t("result.assemblyParts")}>
          {line.items.map((item, index) => {
            const parse = item.parse;
            const active = index === picked;
            const kg = parse.totalKg;
            const share = line.totalKg && kg != null ? Math.round((kg / line.totalKg) * 100) : null;
            const name = formatCommandParseName(t, parse) ?? parse.name ?? t("query.newItem");
            const perPiece = parse.calc ? ` · ${t("ledger.perPieceShort", { weight: weightLabel(parse.calc.result.unitWeightKg) })}` : "";
            return (
              <li key={index} className={row}>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={t("ledger.openPart", { index: index + 1, name })}
                  onClick={() => onOpen(index)}
                  className={`${row} min-h-[58px] w-full cursor-pointer px-1 text-left`}
                  style={{ ...RULE_FAINT, background: active ? "var(--accent-surface)" : "transparent" }}
                >
                  <span
                    className="font-mono text-[12px] font-bold"
                    style={{ color: active ? "var(--accent)" : "var(--muted-faint)" }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-foreground" aria-hidden="true">
                    {parse.alias ? <CommandGlyph fam={parse.alias.fam} alias={parse.alias.alias} size={20} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className="truncate text-[15px] font-bold"
                      style={{ color: parse.valid ? "var(--foreground)" : "var(--muted)" }}
                    >
                      {name}
                    </span>
                    <span className="truncate font-mono text-[12px] text-foreground-secondary">
                      {partSpec(parse)}
                      {perPiece}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="whitespace-nowrap font-mono text-[15px] font-semibold tabular-nums text-foreground">
                      {weightLabel(kg)}
                    </span>
                    {share != null && (
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="flex h-1 w-9" style={{ background: "var(--surface-inset)" }}>
                          <span
                            style={{ width: `${share}%`, background: SHARE_SHADES[Math.min(index, SHARE_SHADES.length - 1)] }}
                          />
                        </span>
                        <span className="font-mono text-[11px] text-muted">{t("ledger.sharePercent", { percent: share })}</span>
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-right font-mono text-[15px] tabular-nums text-foreground">
                    {money(parse.totalAmount)}
                  </span>
                  <span className="text-muted" aria-hidden="true">
                    <Chevron dir="right" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className={`${row} mt-1.5 items-baseline px-1 pb-2.5 pt-3`}
          style={{ borderTop: "1.5px solid var(--foreground)", borderBottom: "3px double var(--foreground)" }}
        >
          <span />
          <span />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-foreground">{t("ledger.total")}</span>
            <span className="font-mono text-[12px] text-foreground-secondary">{sub}</span>
          </span>
          <span
            data-row="totalWeight"
            className="whitespace-nowrap text-right font-mono text-[20px] font-bold tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            {weightLabel(line.totalKg)}
          </span>
          <span
            data-row="totalCost"
            className="whitespace-nowrap text-right font-mono text-[20px] font-bold tabular-nums text-foreground"
          >
            {money(line.totalAmount)}
          </span>
          <span />
        </div>
      </div>

      {/* A subtotal alone would only repeat the total above it. */}
      {buildUp.length > 1 && (
        <section aria-label={t("ledger.costBuildUp")} className="flex flex-col">
          <div className="pb-1.5" style={{ borderBottom: "1px solid var(--foreground)" }}>
            <span className="fs-title text-[18px] text-foreground">{t("ledger.costBuildUp")}</span>
          </div>
          {buildUp.map((item) => (
            <div
              key={item.id}
              data-row={item.id}
              className="flex items-baseline justify-between gap-3 py-2.5"
              style={RULE_FAINT}
            >
              <span className={`text-[14px] ${item.muted ? "text-muted" : "text-foreground-secondary"}`}>{item.label}</span>
              <span className="font-mono text-[15px] tabular-nums text-foreground">{item.value}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
