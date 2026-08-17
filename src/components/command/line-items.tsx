"use client";

import { useTranslations } from "next-intl";
import type { CommandLine } from "@ferroscale/metal-core";
import { buildLineSummary } from "./line-summary";

/**
 * The equation line's replacement on a multi-item line: one row per item, so
 * the hero's sum can be checked against the parts it came from.
 *
 * On the phone the list is capped. Unbounded, it grew about 21px per item and
 * pushed everything under it — the glance row, the actions, the session strip
 * — down the screen, so adding a fifth calculation moved the buttons you had
 * just been using. Past `maxRows` it scrolls inside a fixed box instead, and
 * the layout below it stops moving.
 */

/** Explicit so the cap is arithmetic rather than a guess at line-height. */
const ROW_HEIGHT = { compact: 16, full: 18 };
const ROW_GAP = 4;

export function LineItems({
  line,
  compact,
  maxRows,
}: {
  line: CommandLine;
  compact?: boolean;
  /** Rows shown before the list scrolls instead of growing. */
  maxRows?: number;
}) {
  const t = useTranslations("command");
  const rows = buildLineSummary(line, t);
  const size = compact ? 11.5 : 13;
  const rowHeight = compact ? ROW_HEIGHT.compact : ROW_HEIGHT.full;
  const capped = maxRows != null && rows.length > maxRows;

  // A mask rather than a gradient overlay: the hero paints the shell's own
  // background, not a token, so an overlay would have to be told which colour
  // to fade into and would be wrong in one theme or the other.
  const fade = capped
    ? "linear-gradient(to bottom, #000 calc(100% - 12px), transparent 100%)"
    : undefined;

  const list = (
    <ol
      className="w-full flex flex-col"
      aria-label={t("line.items")}
      style={{
        gap: ROW_GAP,
        maxHeight: maxRows != null ? maxRows * rowHeight + (maxRows - 1) * ROW_GAP : undefined,
        overflowY: capped ? "auto" : undefined,
        maskImage: fade,
        WebkitMaskImage: fade,
      }}
    >
      {rows.map((row, index) => (
        <li
          key={index}
          className="font-mono flex items-baseline gap-2 flex-shrink-0"
          style={{
            fontSize: size,
            lineHeight: `${rowHeight}px`,
            height: rowHeight,
            opacity: row.pending ? 0.55 : 1,
          }}
        >
          <span className="text-muted-faint tabular-nums">{index + 1}</span>
          <span className="text-foreground-secondary truncate">{row.label}</span>
          <span className="ml-auto text-muted whitespace-nowrap">{row.weight}</span>
          <span className="text-muted whitespace-nowrap">{row.amount}</span>
        </li>
      ))}
    </ol>
  );

  return list;
}
