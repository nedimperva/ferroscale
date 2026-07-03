"use client";

import { useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import { CommandGlyph } from "../command-glyph";
import type { CalculationInput } from "@/lib/calculator/types";
import type { CompareItem } from "@/hooks/useCompare";
import { DeskTopbar } from "./desk-sidebar";
import { CloseIcon, DeskBtn, DeskIcon, famForInput } from "./desk-atoms";

function DeltaChip({ pct }: { pct: number }) {
  const t = useTranslations("command");
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) {
    return (
      <span
        className="font-mono text-[10px] font-bold rounded-full"
        style={{ padding: "2px 7px", background: "var(--surface-inset)", color: "var(--muted)" }}
      >
        {t("compare.approxBase")}
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      className="font-mono text-[10px] font-bold rounded-full"
      style={{
        padding: "2px 7px",
        background: up ? "var(--accent-surface)" : "var(--green-surface)",
        color: up ? "var(--accent-text)" : "var(--green-text)",
      }}
    >
      {up ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

export function DeskCompareView({
  dark,
  compareItems,
  onRemove,
  onClearAll,
  gotoCalc,
  onPick,
}: {
  dark: boolean;
  compareItems: CompareItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  gotoCalc: () => void;
  onPick: (input: CalculationInput) => void;
}) {
  const t = useTranslations("command");
  // One column per compare item; the first is the base every delta reads from.
  const cols = compareItems.map((item) => {
    const r = item.result;
    const lengthM = r.lengthMm / 1000;
    return {
      item,
      r,
      fam: famForInput(item.input),
      name: item.normalizedProfile?.shortLabel ?? r.profileLabel,
      lengthM,
      kgm: lengthM > 0 ? r.unitWeightKg / lengthM : null,
      costPerM:
        lengthM > 0 && r.quantity > 0
          ? r.grandTotalAmount / (lengthM * r.quantity)
          : null,
      sym: CURRENCY_SYMBOLS[r.currency] ?? "€",
    };
  });
  const base = cols[0];
  const maxKg = Math.max(1, ...cols.map((c) => c.r.totalWeightKg));
  const minKg = Math.min(...cols.map((c) => c.r.totalWeightKg));
  const minCost = Math.min(...cols.map((c) => c.r.grandTotalAmount));
  const multi = cols.length > 1;
  const kgVaries = multi && cols.some((c) => c.r.totalWeightKg !== minKg);
  const costVaries = multi && cols.some((c) => c.r.grandTotalAmount !== minCost);
  const hasSurface = cols.some((c) => c.r.surfaceAreaM2 != null);

  const labelCell: React.CSSProperties = {
    padding: "13px 16px",
    borderTop: "1px solid var(--border-faint)",
  };
  const valueCell = (i: number): React.CSSProperties => ({
    padding: "13px 16px",
    borderTop: "1px solid var(--border-faint)",
    borderLeft: "1px solid var(--border-faint)",
    background: i === 0 ? "var(--surface-raised)" : "transparent",
  });

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.compare")}
        subtitle={
          compareItems.length
            ? t("compare.subtitleCount", { count: compareItems.length })
            : t("compare.subtitleEmpty")
        }
        actions={
          <>
            {compareItems.length > 0 && (
              <DeskBtn dark={dark} small onClick={onClearAll}>
                <DeskIcon name="trash" />
                {t("common.clearAll")}
              </DeskBtn>
            )}
            <DeskBtn dark={dark} small primary onClick={gotoCalc}>
              <DeskIcon name="plus" stroke={dark ? "#161109" : "#fff"} />
              {t("compare.addFromCalculator")}
            </DeskBtn>
          </>
        }
      />
      {compareItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center" style={{ maxWidth: 360 }}>
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: 56,
                height: 56,
                background: "var(--accent-surface)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent)",
              }}
            >
              <DeskIcon name="compare" />
            </div>
            <div className="font-extrabold text-[17px] text-foreground mt-4">
              {t("compare.emptyTitle")}
            </div>
            <div className="text-[13px] text-muted mt-1.5" style={{ lineHeight: 1.5 }}>
              {t("compare.emptyBody")}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
          <div className="overflow-x-auto">
            <div
              className="rounded-[18px] overflow-hidden"
              style={{
                display: "grid",
                gridTemplateColumns: `140px repeat(${cols.length}, minmax(190px, 250px))`,
                width: "fit-content",
                minWidth: 0,
                border: "1px solid var(--border-faint)",
                background: "var(--surface)",
                boxShadow: "var(--panel-shadow-soft)",
              }}
            >
              {/* header row */}
              <div style={{ padding: "14px 16px" }}>
                <span className="text-[10px] font-bold text-muted" style={{ letterSpacing: 1.2 }}>
                  {t("compare.profile")}
                </span>
              </div>
              {cols.map((c, i) => (
                <div
                  key={c.item.id}
                  style={{ ...valueCell(i), borderTop: "none", padding: "14px 16px 12px" }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-foreground"
                      style={{ width: 34, height: 34, background: "var(--surface-inset)" }}
                    >
                      {c.fam && <CommandGlyph fam={c.fam} size={19} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-extrabold text-[14.5px] text-foreground truncate"
                        style={{ letterSpacing: -0.2 }}
                      >
                        {c.name}
                      </div>
                      <div className="font-mono text-[10.5px] text-muted mt-px">
                        {formatLengthM(c.lengthM)} m × {c.r.quantity}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(c.item.id)}
                      title={t("common.remove")}
                      aria-label={t("compare.removeAria", { name: c.name })}
                      className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted"
                      style={{ width: 22, height: 22, background: "var(--surface-inset)" }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="mt-2">
                    {i === 0 ? (
                      <span
                        className="text-[9px] font-extrabold rounded-full"
                        style={{
                          letterSpacing: 1,
                          padding: "3px 8px",
                          background: "var(--accent-surface)",
                          color: "var(--accent-text)",
                          border: "1px solid var(--accent-border)",
                        }}
                      >
                        {t("compare.base")}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-faint">
                        {t("compare.vsBase", { name: base.name })}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* total weight */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.totalWeight")}</span>
              </div>
              {cols.map((c, i) => {
                const pct = base.r.totalWeightKg > 0
                  ? ((c.r.totalWeightKg - base.r.totalWeightKg) / base.r.totalWeightKg) * 100
                  : 0;
                const best = kgVaries && c.r.totalWeightKg === minKg;
                return (
                  <div key={c.item.id} style={valueCell(i)}>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="font-extrabold text-[22px]"
                        style={{
                          letterSpacing: -0.8,
                          color: best ? "var(--green-text)" : "var(--foreground)",
                        }}
                      >
                        {fsWeight(c.r.totalWeightKg)}
                      </span>
                      <span className="font-bold text-xs" style={{ color: "var(--accent)" }}>
                        {fsWeightUnit(c.r.totalWeightKg)}
                      </span>
                      {i > 0 && (
                        <span className="ml-auto">
                          <DeltaChip pct={pct} />
                        </span>
                      )}
                    </div>
                    <div
                      className="rounded-[3px] overflow-hidden mt-2"
                      style={{ height: 5, background: "var(--surface-inset)" }}
                    >
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${Math.max(4, (c.r.totalWeightKg / maxKg) * 100)}%`,
                          background: i === 0 ? "var(--accent)" : "var(--blue-strong)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* total cost */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.totalCost")}</span>
              </div>
              {cols.map((c, i) => {
                const pct = base.r.grandTotalAmount > 0
                  ? ((c.r.grandTotalAmount - base.r.grandTotalAmount) / base.r.grandTotalAmount) * 100
                  : 0;
                const best = costVaries && c.r.grandTotalAmount === minCost;
                return (
                  <div key={c.item.id} style={valueCell(i)} className="flex items-baseline gap-1.5">
                    <span
                      className="font-mono text-[14px] font-bold"
                      style={{ color: best ? "var(--green-text)" : "var(--foreground)" }}
                    >
                      {c.sym} {fsMoney(c.r.grandTotalAmount)}
                    </span>
                    {i > 0 && (
                      <span className="ml-auto">
                        <DeltaChip pct={pct} />
                      </span>
                    )}
                  </div>
                );
              })}

              {/* weight / piece */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("compare.weightPerPiece")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {fsWeight(c.r.unitWeightKg)} {fsWeightUnit(c.r.unitWeightKg)}
                  </span>
                </div>
              ))}

              {/* mass per metre */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.massPerMetre")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {c.kgm != null ? `${c.kgm.toFixed(2)} kg/m` : "—"}
                  </span>
                </div>
              ))}

              {/* cost per metre */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("compare.costPerMetre")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {c.costPerM != null ? `${c.sym} ${fsMoney(c.costPerM)} /m` : "—"}
                  </span>
                </div>
              ))}

              {/* surface area (only when the dataset provides it) */}
              {hasSurface && (
                <>
                  <div style={labelCell}>
                    <span className="text-[11.5px] font-semibold text-muted">{t("compare.surfaceArea")}</span>
                  </div>
                  {cols.map((c, i) => (
                    <div key={c.item.id} style={valueCell(i)}>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {c.r.surfaceAreaM2 != null ? `${c.r.surfaceAreaM2.toFixed(2)} m²` : "—"}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* grade */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.grade")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {c.r.gradeLabel || "—"}
                  </span>
                </div>
              ))}

              {/* actions */}
              <div style={labelCell} />
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <button
                    type="button"
                    onClick={() => onPick(c.item.input)}
                    className="w-full rounded-[10px] cursor-pointer font-bold text-[11.5px] text-foreground-secondary"
                    style={{
                      padding: "8px 0",
                      border: "1px solid var(--border-faint)",
                      background: "var(--surface-raised)",
                    }}
                  >
                    {t("compare.openInCalculator")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLengthM(lengthM: number): string {
  return Number(lengthM.toFixed(2)).toString();
}

/* ───────────────────────── Saved view ───────────────────────── */
