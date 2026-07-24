"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CURRENCY_SYMBOLS,
  findGradeById,
  fsMoney,
  fsWeight,
  fsWeightUnit,
} from "@ferroscale/metal-core";
import type { SavedEntry } from "@/hooks/useSaved";
import type { Project } from "@/hooks/useProjects";
import { computeInsights, type InsightsRecord } from "@/lib/insights";
import { readUsageSnapshot, type UsageSnapshot } from "@/lib/usage-stats";
import { SheetShell } from "./sheet-shell";

interface InsightsSheetProps {
  saved: SavedEntry[];
  projects: Project[];
  onClose: () => void;
}

const EMPTY_SNAPSHOT: UsageSnapshot = { queries: [], buckets: {} };

export function InsightsSheet({ saved, projects, onClose }: InsightsSheetProps) {
  const t = useTranslations("command");
  // The usage snapshot lives in localStorage; read it after mount to keep
  // render pure (empty until then — the sheet just shows zeros for an instant).
  const [snapshot, setSnapshot] = useState<UsageSnapshot>(EMPTY_SNAPSHOT);
  useEffect(() => {
    setSnapshot(readUsageSnapshot()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const insights = useMemo(() => {
    const records: InsightsRecord[] = [];
    for (const entry of saved) {
      records.push({
        totalWeightKg: entry.result.totalWeightKg,
        grandTotalAmount: entry.result.grandTotalAmount,
        currency: entry.result.currency,
      });
    }
    for (const project of projects) {
      for (const calc of project.calculations) {
        records.push({
          totalWeightKg: calc.result.totalWeightKg,
          grandTotalAmount: calc.result.grandTotalAmount,
          currency: calc.result.currency,
        });
      }
    }
    return computeInsights(snapshot, records, {
      savedCount: saved.length,
      projectCount: projects.length,
    });
  }, [snapshot, saved, projects]);

  const nothingYet = insights.calcsRecorded === 0 && insights.savedCount === 0;

  return (
    <SheetShell title={t("sheets.insights")} onClose={onClose}>
      {nothingYet ? (
        <p className="text-sm text-muted text-center py-12 px-6 leading-relaxed">
          {t("insights.empty")}
        </p>
      ) : (
        <div className="space-y-5 pb-2">
          <div className="grid grid-cols-2 gap-2">
            <Tile label={t("insights.calcsRecorded")} value={String(insights.calcsRecorded)} />
            <Tile
              label={t("insights.libraryWeight")}
              value={`${fsWeight(insights.libraryWeightKg)} ${fsWeightUnit()}`}
            />
            <Tile label={t("nav.saved")} value={String(insights.savedCount)} />
            <Tile label={t("nav.projects")} value={String(insights.projectCount)} />
          </div>

          {insights.valueByCurrency.length > 0 && (
            <Section title={t("insights.libraryValue")}>
              <div className="flex flex-wrap gap-2">
                {insights.valueByCurrency.map((v) => (
                  <span
                    key={v.currency}
                    className="font-mono text-[13px] font-bold rounded-lg px-2.5 py-1"
                    style={{ background: "var(--blue-surface)", color: "var(--blue-text)" }}
                  >
                    {CURRENCY_SYMBOLS[v.currency as keyof typeof CURRENCY_SYMBOLS] ?? ""}{" "}
                    {fsMoney(v.amount)}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {insights.topQueries.length > 0 && (
            <Section title={t("insights.topQueries")}>
              <ol className="space-y-1.5">
                {insights.topQueries.map((row) => (
                  <StatRow key={row.query} label={row.query} count={row.count} mono />
                ))}
              </ol>
            </Section>
          )}

          {insights.topGrades.length > 0 && (
            <Section title={t("insights.topGrades")}>
              <ol className="space-y-1.5">
                {insights.topGrades.map((row) => (
                  <StatRow
                    key={row.gradeId}
                    label={findGradeById(row.gradeId)?.label ?? row.gradeId}
                    count={row.count}
                  />
                ))}
              </ol>
            </Section>
          )}

          <p className="text-[11px] text-muted-faint px-1 leading-relaxed">
            {t("insights.privacyNote")}
          </p>
        </div>
      )}
    </SheetShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-faint px-3 py-2.5" style={{ background: "var(--surface-raised)" }}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted truncate">{label}</div>
      <div className="font-mono text-[18px] font-extrabold text-foreground mt-0.5" style={{ color: "var(--accent-text)" }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">{title}</div>
      {children}
    </section>
  );
}

function StatRow({ label, count, mono }: { label: string; count: number; mono?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className={`min-w-0 truncate text-[13px] text-foreground-secondary ${mono ? "font-mono" : ""}`}>
        {label}
      </span>
      <span className="flex-shrink-0 font-mono text-[11px] font-bold text-muted">×{count}</span>
    </li>
  );
}
