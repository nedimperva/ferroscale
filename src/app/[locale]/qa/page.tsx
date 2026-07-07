import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { runFormulaQa } from "@/lib/qa/run";

interface QaPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: QaPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qa" });
  return { title: t("title"), description: t("subtitle") };
}

/**
 * Formula QA — server-rendered validation of the live engine + dataset
 * against independent reference values (published EN catalog masses and
 * hand-computed formulas). No client JS; recomputed on every request.
 */
export default async function QaPage({ params }: QaPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qa" });
  const report = runFormulaQa();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted no-underline transition-colors hover:text-foreground"
        >
          ← {t("back")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">{t("subtitle")}</p>
      </header>

      <div
        className={`rounded-2xl border px-4 py-3 mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 ${
          report.allPass
            ? "border-[var(--green-border)] bg-[var(--green-surface)]"
            : "border-[var(--red-border)] bg-[var(--red-surface)]"
        }`}
      >
        <span className={`text-sm font-bold ${report.allPass ? "text-[var(--green-text)]" : "text-[var(--red-text)]"}`}>
          {report.allPass
            ? t("summaryPass", { count: report.passCount })
            : t("summaryFail", { fail: report.failCount, total: report.rows.length })}
        </span>
        <span className="font-mono text-xs text-muted">
          {t("maxDelta")}: {report.maxDeltaPct.toFixed(3)}% · {t("tolerance")}: {report.tolerancePct}%
        </span>
        <span className="font-mono text-xs text-muted">
          {t("dataset")}: {report.datasetVersion}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-faint bg-[var(--surface-raised)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted border-b border-border-faint">
              <th className="px-4 py-2.5 font-bold">{t("colProfile")}</th>
              <th className="px-4 py-2.5 font-bold text-right">{t("colExpected")}</th>
              <th className="px-4 py-2.5 font-bold text-right">{t("colActual")}</th>
              <th className="px-4 py-2.5 font-bold text-right">{t("colDelta")}</th>
              <th className="px-4 py-2.5 font-bold">{t("colSource")}</th>
              <th className="px-4 py-2.5 font-bold text-right">{t("colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-faint">
            {report.rows.map((r) => (
              <tr key={r.row.id}>
                <td className="px-4 py-2 font-semibold text-foreground whitespace-nowrap">{r.row.label}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground-secondary">
                  {r.row.expectedKgPerM.toFixed(3)}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground-secondary">
                  {r.actualKgPerM != null ? r.actualKgPerM.toFixed(3) : "—"}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                  {r.deltaPct != null ? `${r.deltaPct.toFixed(3)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-muted whitespace-nowrap">{r.row.source}</td>
                <td
                  className={`px-4 py-2 text-right font-bold text-xs ${
                    r.pass ? "text-[var(--green-text)]" : "text-[var(--red-text)]"
                  }`}
                >
                  {r.pass ? t("pass") : t("fail")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted leading-relaxed">{t("note")}</p>
    </div>
  );
}
