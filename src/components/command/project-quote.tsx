"use client";

import { useLocale, useTranslations } from "next-intl";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import type { CurrencyCode } from "@/lib/calculator/types";
import { computeAggregates, type Project } from "@/hooks/useProjects";
import { sellPrice } from "./breakdown-rows";

/**
 * A printable quote for one project.
 *
 * Rendered into the page and revealed only by `@media print` (see the
 * `fs-print` rules in globals.css), so printing — or "save as PDF", which is
 * the same button on every OS — produces a document with no app chrome, no
 * dependencies, and no network. A fabricator can send it as it stands.
 */
export function ProjectQuote({
  project,
  marginPercent,
}: {
  project: Project;
  marginPercent: number;
}) {
  const t = useTranslations("command");
  const locale = useLocale();
  const calcs = project.calculations;
  const currency = calcs[0]?.result.currency ?? ("EUR" as CurrencyCode);
  const sym = CURRENCY_SYMBOLS[currency] ?? "€";

  const effectiveMargin =
    project.marginPercent !== undefined ? project.marginPercent : marginPercent;

  const totalKg = calcs.reduce((sum, c) => sum + (c.result.totalWeightKg ?? 0), 0);
  const rawMaterialCost = calcs.reduce((sum, c) => sum + (c.result.grandTotalAmount ?? 0), 0);
  const materialTotal =
    effectiveMargin > 0 ? sellPrice(rawMaterialCost, effectiveMargin) : rawMaterialCost;

  const aggregates = computeAggregates(project);
  const hasPainting = aggregates.paintCoatTotals.length > 0 && aggregates.totalPaintingCost > 0;
  const paintingCost = hasPainting ? aggregates.totalPaintingCost : 0;

  const laborHours = project.laborHours ?? 0;
  const laborRate = project.laborRatePerHour ?? 0;
  const laborTotal = laborHours * laborRate;
  const hasLabor = laborTotal > 0;

  const additionalCosts = project.additionalCosts ?? [];
  const extrasTotal = additionalCosts.reduce((s, c) => s + c.amount, 0);
  const hasExtras = extrasTotal > 0;

  const grandTotal = materialTotal + paintingCost + laborTotal + extrasTotal;

  // Stored short labels tack the length on ("SHS 40x40x3 x L 4000 mm"); the
  // quote has a Length column, so the item column keeps just the profile.
  const itemLabel = (label: string) => label.replace(/\s*[·x]\s*L\s*[\d.]+\s*mm\s*$/i, "");

  const cell: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #ddd" };
  const numeric: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };

  return (
    <article className="fs-print-doc" style={{ color: "#111", background: "#fff", padding: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          borderBottom: "2px solid #111",
          paddingBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{project.name}</h1>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{t("quote.title")}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>
          {new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </header>

      {(project.client || project.dueDate || project.description || project.category) && (
        <p style={{ fontSize: 12, margin: "10px 0 0", lineHeight: 1.5, opacity: 0.8 }}>
          {[
            project.client ? `Client: ${project.client}` : null,
            project.category ? `Category: ${project.category}` : null,
            project.dueDate ? `Due: ${project.dueDate}` : null,
            project.description,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 14 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={cell}>{t("quote.item")}</th>
            <th style={cell}>{t("result.grade")}</th>
            <th style={numeric}>{t("result.length")}</th>
            <th style={numeric}>{t("result.pieces")}</th>
            <th style={numeric}>{t("result.totalWeight")}</th>
            <th style={numeric}>{t("result.totalCost")}</th>
          </tr>
        </thead>
        <tbody>
          {calcs.map((calc) => {
            const r = calc.result;
            return (
              <tr key={calc.id}>
                <td style={cell}>
                  {itemLabel(calc.templateName ?? calc.normalizedProfile?.shortLabel ?? r.profileLabel)}
                  {calc.assembly ? (
                    <span style={{ fontSize: 10.5, opacity: 0.6, marginLeft: 6 }}>[{calc.assembly}]</span>
                  ) : null}
                  {calc.note ? (
                    <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 2 }}>{calc.note}</div>
                  ) : null}
                </td>
                <td style={cell}>{r.gradeLabel}</td>
                <td style={numeric}>{Number((r.lengthMm / 1000).toFixed(3))} m</td>
                <td style={numeric}>{r.quantity}</td>
                <td style={numeric}>
                  {fsWeight(r.totalWeightKg)} {fsWeightUnit()}
                </td>
                <td style={numeric}>
                  {sym} {fsMoney(effectiveMargin > 0 ? sellPrice(r.grandTotalAmount, effectiveMargin) : r.grandTotalAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {/* Subtotal Material */}
          <tr>
            <td style={cell} colSpan={4}>
              {t("quote.material")} {effectiveMargin > 0 ? `(+${effectiveMargin}% markup)` : ""}
            </td>
            <td style={numeric}>
              {fsWeight(totalKg)} {fsWeightUnit()}
            </td>
            <td style={numeric}>
              {sym} {fsMoney(materialTotal)}
            </td>
          </tr>

          {/* Painting Breakdown */}
          {hasPainting &&
            aggregates.paintCoatTotals.map((row) => {
              const name =
                row.coat.kind === "primer"
                  ? t("projects.paintPrimer")
                  : row.coat.kind === "finish"
                    ? t("projects.paintFinish")
                    : row.coat.name?.trim() || t("projects.paintCustom");
              return (
                <tr key={row.coat.id}>
                  <td style={cell} colSpan={4}>
                    {t("quote.paintCoat", {
                      name,
                      layers: row.coat.layers,
                      kg: row.kg,
                    })}
                  </td>
                  <td style={numeric} />
                  <td style={numeric}>
                    {sym} {fsMoney(row.cost)}
                  </td>
                </tr>
              );
            })}

          {/* Labor Breakdown */}
          {hasLabor && (
            <tr>
              <td style={cell} colSpan={4}>
                Shop Fabrication & Welding ({laborHours} hrs @ {sym} {fsMoney(laborRate)}/hr)
              </td>
              <td style={numeric} />
              <td style={numeric}>
                {sym} {fsMoney(laborTotal)}
              </td>
            </tr>
          )}

          {/* Additional Expenses */}
          {hasExtras &&
            additionalCosts.map((cost) => (
              <tr key={cost.id}>
                <td style={cell} colSpan={4}>
                  Extra: {cost.label}
                </td>
                <td style={numeric} />
                <td style={numeric}>
                  {sym} {fsMoney(cost.amount)}
                </td>
              </tr>
            ))}

          {/* Grand Total */}
          <tr style={{ fontWeight: 800 }}>
            <td style={cell} colSpan={4}>
              {t("quote.total")}
            </td>
            <td style={numeric}>
              {fsWeight(totalKg)} {fsWeightUnit()}
            </td>
            <td style={numeric}>
              {sym} {fsMoney(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
