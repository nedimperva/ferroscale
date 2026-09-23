"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CommandLine, CommandParseResult } from "@ferroscale/metal-core";
import { ProfileDrawing } from "./profile-drawing";
import { formatAvailability, formatCommandParseName } from "./command-copy";
import { buildBreakdownRows, type BreakdownRow, type BreakdownRowId } from "./breakdown-rows";
import { applyNearbySpec, NearbySpecs } from "./nearby-specs";
import { Link } from "@/i18n/navigation";
import { haptic } from "@/lib/haptics";
import { marginPercentStore, massTolerancePercentStore } from "@/lib/settings-stores";

/**
 * The result breakdown, as two ledgers: Weight and Cost, each a short list of
 * figures ending in a ruled total. The phone sheet and the desk rail render
 * this same component; `variant` only changes the chrome around it.
 *
 * On a `+`-joined line the ledger's rows are the parts: what each weighs or
 * costs and its share of the whole. A part opens into its own ledger — the
 * same one a single calculation gets. Where the numbers come from (area,
 * density, formula, the standard) is one tap further, under "How it's
 * calculated", for whoever wants to check.
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
    <div className="flex flex-col gap-4">
      {multi && line && variant === "rail" && (
        <ScopeSwitch
          scope={scope}
          partLabel={t("ledger.partScope", {
            index: picked + 1,
            name: formatCommandParseName(t, line.items[picked]?.parse ?? p) ?? "",
          })}
          onScope={setScope}
        />
      )}
      {multi && line && variant === "sheet" && scope === "part" && (
        <PartNav line={line} picked={picked} onPick={onPick} onBack={() => setScope("assembly")} />
      )}

      {showAssembly && line ? (
        <AssemblyLedger line={line} picked={picked} tab={tab} onTab={setTabOverride} onOpen={openPart} />
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
}: {
  scope: "assembly" | "part";
  partLabel: string;
  onScope: (scope: "assembly" | "part") => void;
}) {
  const t = useTranslations("command");
  const button = (value: "assembly" | "part", label: string, first: boolean) => (
    <button
      type="button"
      aria-pressed={scope === value}
      onClick={() => onScope(value)}
      className="h-10 min-w-0 cursor-pointer truncate px-2 text-[13px] text-foreground transition-colors"
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
    <div
      role="group"
      aria-label={t("ledger.scope")}
      className="grid grid-cols-2 border"
      style={{ borderColor: "var(--border-faint)" }}
    >
      {button("assembly", t("ledger.wholeAssembly"), true)}
      {button("part", partLabel, false)}
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

  return (
    <>
      {variant === "rail" ? (
        <>
          <div
            className="flex items-center justify-center"
            style={{ background: "var(--surface-inset)", padding: "14px 10px" }}
          >
            <ProfileDrawing p={p} className="w-full flex flex-col items-center" />
          </div>
          <div className="-mt-1 flex flex-col gap-0.5">
            <span className="fs-track-tight text-[18px] font-extrabold text-foreground">
              {formatCommandParseName(t, p)}
            </span>
            <span className="font-mono text-[13px] text-foreground-secondary">
              {share != null ? `${spec} · ${t("ledger.share", { percent: share })}` : spec}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-[66px] w-[84px] shrink-0 items-center justify-center overflow-hidden"
            style={{ background: "var(--surface-inset)" }}
          >
            <ProfileDrawing p={p} variant="thumb" className="h-full w-full flex items-center justify-center" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[20px] font-extrabold text-foreground">{formatCommandParseName(t, p)}</span>
            <span className="font-mono text-[13px] text-foreground-secondary">
              {share != null ? `${spec} · ${t("ledger.share", { percent: share })}` : spec}
            </span>
          </div>
        </div>
      )}

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

      <NearbySpecs input={p.calc.input} onPick={onNearby} />

      <HowCalculated rows={pick(rows.geometry, SOURCE_ROWS)} />
    </>
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
