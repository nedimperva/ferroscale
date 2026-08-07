"use client";

import { useTranslations } from "next-intl";
import type { CommandLine } from "@ferroscale/metal-core";
import { buildLineSummary } from "./line-summary";

/**
 * The equation line's replacement on a multi-item line: one row per item, so
 * the hero's sum can be checked against the parts it came from.
 */
export function LineItems({ line, compact }: { line: CommandLine; compact?: boolean }) {
  const t = useTranslations("command");
  const rows = buildLineSummary(line, t);
  const size = compact ? 11.5 : 13;

  return (
    <ol className="w-full flex flex-col gap-1" aria-label={t("line.items")}>
      {rows.map((row, index) => (
        <li
          key={index}
          className="font-mono flex items-baseline gap-2"
          style={{ fontSize: size, opacity: row.pending ? 0.55 : 1 }}
        >
          <span className="text-muted-faint tabular-nums">{index + 1}</span>
          <span className="text-foreground-secondary truncate">{row.label}</span>
          <span className="ml-auto text-muted whitespace-nowrap">{row.weight}</span>
          <span className="text-muted whitespace-nowrap">{row.amount}</span>
        </li>
      ))}
    </ol>
  );
}
