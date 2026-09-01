"use client";

import { useLocale, useTranslations } from "next-intl";
import type {
  CutOptimizationResult,
  PlateOptimizationResult,
} from "@ferroscale/metal-core";
import type {
  ProjectCutGroup,
  ProjectProcurementSummary,
} from "@/lib/projects/cutting";

interface ProjectProcurementDocProps {
  summary: ProjectProcurementSummary;
  projectName: string;
}

export function ProjectProcurementDoc({
  summary,
  projectName,
}: ProjectProcurementDocProps) {
  const t = useTranslations("command");
  const locale = useLocale();
  const dateStr = new Date().toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cellStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "12px",
    color: "#1e293b",
  };

  const numCellStyle: React.CSSProperties = {
    ...cellStyle,
    textAlign: "right",
    fontFamily: "monospace",
    fontWeight: "bold",
  };

  return (
    <article
      className="fs-print-doc"
      style={{
        color: "#0f172a",
        background: "#ffffff",
        padding: "24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "2.5px solid #0f172a",
          paddingBottom: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Material Procurement & Purchasing BOM
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              margin: "4px 0 0",
              color: "#0f172a",
            }}
          >
            {projectName}
          </h1>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: "12px",
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          {dateStr}
        </div>
      </header>

      {/* KPI Summary Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            border: "1px solid #cbd5e1",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {t("cutting.rawWeight")}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#0f172a",
              marginTop: "2px",
              fontFamily: "monospace",
            }}
          >
            {summary.totalRawWeightKg.toLocaleString()} kg
          </div>
          <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
            {(summary.totalRawWeightKg / 1000).toFixed(2)} tonnes
          </div>
        </div>

        <div
          style={{
            border: "1px solid #cbd5e1",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {t("cutting.netWeight")}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#0f172a",
              marginTop: "2px",
              fontFamily: "monospace",
            }}
          >
            {summary.totalNetWeightKg.toLocaleString()} kg
          </div>
          <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
            Finished parts
          </div>
        </div>

        <div
          style={{
            border: "1px solid #cbd5e1",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {t("cutting.scrapLoss")}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#0f172a",
              marginTop: "2px",
              fontFamily: "monospace",
            }}
          >
            {summary.totalScrapWeightKg.toLocaleString()} kg
          </div>
          <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
            {summary.globalScrapPercent}% drop
          </div>
        </div>

        <div
          style={{
            border: "1px solid #cbd5e1",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            {t("cutting.globalYield")}
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#16a34a",
              marginTop: "2px",
              fontFamily: "monospace",
            }}
          >
            {summary.globalYieldPercent}%
          </div>
          <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
            {summary.totalBarsCount} bars · {summary.totalSheetsCount} plates
          </div>
        </div>
      </div>

      {/* Itemized Order Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f1f5f9",
              borderTop: "1px solid #cbd5e1",
              borderBottom: "2px solid #0f172a",
              textAlign: "left",
            }}
          >
            <th
              style={{
                padding: "8px 10px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#475569",
              }}
            >
              Material / Profile
            </th>
            <th
              style={{
                padding: "8px 10px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#475569",
              }}
            >
              Recommended Stock to Order
            </th>
            <th
              style={{
                padding: "8px 10px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#475569",
                textAlign: "right",
              }}
            >
              Raw Weight
            </th>
            <th
              style={{
                padding: "8px 10px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#475569",
                textAlign: "right",
              }}
            >
              Net Weight
            </th>
            <th
              style={{
                padding: "8px 10px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#475569",
                textAlign: "right",
              }}
            >
              Scrap
            </th>
            <th
              style={{
                padding: "8px 10px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#475569",
                textAlign: "right",
              }}
            >
              Yield
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.items.map((item, idx) => (
            <tr key={`print-item-${idx}`}>
              <td style={cellStyle}>
                <strong>{item.label}</strong>
              </td>
              <td style={cellStyle}>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    background: "#f1f5f9",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {item.rawStockUnits}
                </span>
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                  ({item.stockDescription})
                </span>
              </td>
              <td style={numCellStyle}>{item.rawWeightKg.toLocaleString()} kg</td>
              <td style={{ ...numCellStyle, color: "#64748b" }}>
                {item.netWeightKg.toLocaleString()} kg
              </td>
              <td style={{ ...numCellStyle, color: "#64748b" }}>
                {item.scrapWeightKg.toLocaleString()} kg
              </td>
              <td style={{ ...numCellStyle, color: "#16a34a" }}>
                {item.yieldPercent}%
              </td>
            </tr>
          ))}

          {/* Grand Total Row */}
          <tr
            style={{
              background: "#f8fafc",
              borderTop: "2px solid #0f172a",
              borderBottom: "2px solid #0f172a",
              fontWeight: 800,
            }}
          >
            <td style={{ ...cellStyle, fontWeight: 800 }}>GRAND TOTAL</td>
            <td style={{ ...cellStyle, color: "#64748b" }}>
              {summary.totalBarsCount} bars · {summary.totalSheetsCount} master plates
            </td>
            <td style={numCellStyle}>
              {summary.totalRawWeightKg.toLocaleString()} kg
            </td>
            <td style={numCellStyle}>
              {summary.totalNetWeightKg.toLocaleString()} kg
            </td>
            <td style={numCellStyle}>
              {summary.totalScrapWeightKg.toLocaleString()} kg
            </td>
            <td style={{ ...numCellStyle, color: "#16a34a" }}>
              {summary.globalYieldPercent}%
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer Notes */}
      <footer
        style={{
          borderTop: "1px solid #cbd5e1",
          paddingTop: "14px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#94a3b8",
        }}
      >
        <div>Generated by FerroScale Metal Estimator & Nesting Optimizer</div>
        <div>Authorized Signature / PO #: _______________________</div>
      </footer>
    </article>
  );
}

interface ProjectCutSheetDocProps {
  group: ProjectCutGroup;
  barResult: CutOptimizationResult | null;
  plateResult: PlateOptimizationResult | null;
  projectName: string;
  kerfMm: number;
}

export function ProjectCutSheetDoc({
  group,
  barResult,
  plateResult,
  projectName,
  kerfMm,
}: ProjectCutSheetDocProps) {
  const locale = useLocale();
  const is2D = group.kind === "2d_plate";
  const dateStr = new Date().toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const cellStyle: React.CSSProperties = {
    padding: "6px 8px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "11.5px",
    color: "#1e293b",
  };

  const numCellStyle: React.CSSProperties = {
    ...cellStyle,
    textAlign: "right",
    fontFamily: "monospace",
    fontWeight: "bold",
  };

  return (
    <article
      className="fs-print-doc"
      style={{
        color: "#0f172a",
        background: "#ffffff",
        padding: "24px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "2.5px solid #0f172a",
          paddingBottom: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Workshop Cut Schedule & Nesting Plan
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 800,
              margin: "3px 0 0",
              color: "#0f172a",
            }}
          >
            {group.label}
          </h1>
          <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
            Project: <strong>{projectName}</strong> · Kerf: {kerfMm} mm
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: "12px",
            color: "#64748b",
            fontFamily: "monospace",
          }}
        >
          {dateStr}
        </div>
      </header>

      {/* 1D Linear Bar Cutting Schedule */}
      {!is2D && barResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {barResult.patterns.map((pattern, bIdx) => (
            <div
              key={`print-bar-${bIdx}`}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "10px 14px",
                background: "#ffffff",
                pageBreakInside: "avoid",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: "bold",
                  borderBottom: "1.5px solid #e2e8f0",
                  paddingBottom: "6px",
                  marginBottom: "8px",
                }}
              >
                <span>
                  BAR #{bIdx + 1} — {(pattern.stockLengthMm / 1000).toFixed(1)} m (
                  {pattern.cuts.length} cuts)
                </span>
                <span>
                  Used: {pattern.usedLengthMm} mm / {pattern.stockLengthMm} mm (
                  {pattern.utilizationPercent}% yield)
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ ...cellStyle, width: "60px", color: "#64748b" }}>Cut #</th>
                    <th style={{ ...cellStyle, width: "100px", color: "#64748b" }}>Length</th>
                    <th style={{ ...cellStyle, width: "160px", color: "#64748b" }}>Cut Range</th>
                    <th style={{ ...cellStyle, color: "#64748b" }}>Part / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {pattern.cuts.map((cut, cIdx) => (
                    <tr key={`print-cut-${cIdx}`}>
                      <td style={{ ...cellStyle, color: "#64748b" }}>#{cut.cutIndex}</td>
                      <td style={{ ...cellStyle, fontWeight: "bold" }}>{cut.lengthMm} mm</td>
                      <td style={{ ...cellStyle, fontFamily: "monospace", color: "#64748b" }}>
                        {cut.startMm} → {cut.endMm} mm
                      </td>
                      <td style={cellStyle}>{cut.label || `Piece ${cIdx + 1}`}</td>
                    </tr>
                  ))}
                  {pattern.remnantMm > 0 && (
                    <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                      <td colSpan={2} style={cellStyle}>
                        {pattern.isReusable ? "✨ Reusable Offcut" : "🗑️ Scrap Remainder"}
                      </td>
                      <td colSpan={2} style={{ ...cellStyle, fontFamily: "monospace" }}>
                        {pattern.remnantMm} mm remaining
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 2D Plate Cutting Schedule */}
      {is2D && plateResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {plateResult.patterns.map((pattern, pIdx) => (
            <div
              key={`print-plate-${pIdx}`}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "10px 14px",
                background: "#ffffff",
                pageBreakInside: "avoid",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: "bold",
                  borderBottom: "1.5px solid #e2e8f0",
                  paddingBottom: "6px",
                  marginBottom: "8px",
                }}
              >
                <span>
                  PLATE #{pIdx + 1} — {pattern.formatLabel} ({pattern.cuts.length} cuts)
                </span>
                <span>
                  Used: {pattern.usedAreaM2} m² / {pattern.totalAreaM2} m² (
                  {pattern.utilizationPercent}% yield)
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ ...cellStyle, width: "60px", color: "#64748b" }}>Cut #</th>
                    <th style={{ ...cellStyle, color: "#64748b" }}>Part / Note</th>
                    <th style={{ ...cellStyle, color: "#64748b" }}>Dimensions (W × L)</th>
                    <th style={{ ...cellStyle, color: "#64748b" }}>Position (X, Y)</th>
                    <th style={{ ...cellStyle, width: "80px", color: "#64748b" }}>Rotated</th>
                    <th style={{ ...cellStyle, width: "90px", textAlign: "right", color: "#64748b" }}>Area</th>
                  </tr>
                </thead>
                <tbody>
                  {pattern.cuts.map((cut, cIdx) => (
                    <tr key={`print-pcut-${cIdx}`}>
                      <td style={{ ...cellStyle, color: "#64748b" }}>#{cut.cutIndex}</td>
                      <td style={{ ...cellStyle, fontWeight: "bold" }}>
                        {cut.label || `Part ${cIdx + 1}`}
                      </td>
                      <td style={cellStyle}>
                        {cut.widthMm} × {cut.lengthMm} mm
                      </td>
                      <td style={{ ...cellStyle, fontFamily: "monospace", color: "#64748b" }}>
                        X: {cut.xMm} mm, Y: {cut.yMm} mm
                      </td>
                      <td style={{ ...cellStyle, color: "#64748b" }}>
                        {cut.rotated ? "✓ 90°" : "—"}
                      </td>
                      <td style={numCellStyle}>
                        {((cut.widthMm * cut.lengthMm) / 1_000_000).toFixed(3)} m²
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                    <td colSpan={3} style={cellStyle}>
                      🗑️ Scrap Remainder
                    </td>
                    <td colSpan={3} style={{ ...numCellStyle, color: "#64748b" }}>
                      {pattern.scrapAreaM2} m² (
                      {((pattern.scrapAreaM2 / pattern.totalAreaM2) * 100).toFixed(1)}%)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Footer Notes */}
      <footer
        style={{
          borderTop: "1px solid #cbd5e1",
          paddingTop: "14px",
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#94a3b8",
        }}
      >
        <div>Generated by FerroScale Metal Estimator & Nesting Optimizer</div>
        <div>Operator Sign-off: _______________________ Date: ___________</div>
      </footer>
    </article>
  );
}
