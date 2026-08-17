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

  const totalKg = calcs.reduce((sum, c) => sum + (c.result.totalWeightKg ?? 0), 0);
  const totalCost = calcs.reduce((sum, c) => sum + (c.result.grandTotalAmount ?? 0), 0);
  const materialTotal = marginPercent > 0 ? sellPrice(totalCost, marginPercent) : totalCost;
  const aggregates = computeAggregates(project);
  const hasPainting = aggregates.paintCoatTotals.length > 0 && aggregates.totalPaintingCost > 0;
  const total = materialTotal + (hasPainting ? aggregates.totalPaintingCost : 0);

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

      {(project.client || project.dueDate || project.description) && (
        <p style={{ fontSize: 12, margin: "10px 0 0", lineHeight: 1.5, opacity: 0.8 }}>
          {[
            project.client,
            project.dueDate,
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
                  {sym} {fsMoney(marginPercent > 0 ? sellPrice(r.grandTotalAmount, marginPercent) : r.grandTotalAmount)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {hasPainting && (
            <>
              <tr>
                <td style={cell} colSpan={4}>
                  {t("quote.material")}
                </td>
                <td style={numeric}>
                  {fsWeight(totalKg)} {fsWeightUnit()}
                </td>
                <td style={numeric}>
                  {sym} {fsMoney(materialTotal)}
                </td>
              </tr>
              {aggregates.paintCoatTotals.map((row) => {
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
            </>
          )}
          <tr style={{ fontWeight: 800 }}>
            <td style={cell} colSpan={4}>
              {t("quote.total")}
            </td>
            <td style={numeric}>
              {fsWeight(totalKg)} {fsWeightUnit()}
            </td>
            <td style={numeric}>
              {sym} {fsMoney(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p style={{ fontSize: 10.5, opacity: 0.7, marginTop: 14, lineHeight: 1.5 }}>
        {t("quote.footnote")}
      </p>
    </article>
  );
}
