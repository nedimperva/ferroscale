"use client";

import { useTranslations } from "next-intl";
import type { CommandLine } from "@ferroscale/metal-core";
import { fsWeight } from "@ferroscale/metal-core";
import { CommandGlyph } from "./command-glyph";
import type { LineChipGroup } from "./line-edit";

export interface SegmentedRailProps {
  line: CommandLine;
  groups: LineChipGroup[];
  expandedIndex: number;
  onSelectTab: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  compact?: boolean;
}

export function SegmentedRail({
  line,
  groups,
  expandedIndex,
  onSelectTab,
  onRemoveItem,
  onAddItem,
  compact = false,
}: SegmentedRailProps) {
  const t = useTranslations("command");

  if (groups.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label={t("line.items")}
      className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {groups.map((group, index) => {
        const item = line.items[index];
        const active = index === expandedIndex;
        const parse = item?.parse;
        const alias = parse?.alias;

        // Label: parse name if valid, else first token, else fallback
        const label =
          parse?.name ||
          group.tokens[0] ||
          String(index + 1);

        const qty = parse?.realQty ?? 1;
        const weightKg = parse?.totalKg;

        return (
          <div
            key={group.item}
            className={`inline-flex items-stretch flex-shrink-0 transition-colors border ${
              active
                ? "bg-[var(--surface)] text-foreground border-[var(--foreground)] border-b-2 border-b-[var(--accent)] shadow-sm"
                : "bg-[var(--surface-inset)] text-muted hover:text-foreground border-[var(--border-faint)] hover:border-[var(--border)]"
            }`}
            style={{
              height: compact ? 32 : 36,
            }}
          >
            <button
              type="button"
              aria-pressed={active}
              aria-label={t("query.expandItem", { index: index + 1, name: label })}
              onClick={() => onSelectTab(index)}
              className="inline-flex items-center gap-1.5 cursor-pointer select-none text-left bg-transparent border-0 py-0"
              style={{
                paddingLeft: compact ? 7 : 9,
                paddingRight: compact ? 5 : 7,
              }}
            >
              <span
                className={`font-mono text-[10px] font-bold ${
                  active ? "text-[var(--accent)]" : "text-muted-faint"
                }`}
              >
                {index + 1}
              </span>

              {alias && (
                <span className="flex items-center text-foreground-secondary shrink-0" aria-hidden="true">
                  <CommandGlyph fam={alias.fam} alias={alias.alias} size={13} />
                </span>
              )}

              <span className="truncate max-w-[140px] font-bold text-[12px] leading-tight">
                {label}
              </span>

              {qty > 1 && (
                <span
                  className="font-mono text-[10px] font-bold px-1 py-0.5 bg-[var(--surface-raised)] border border-[var(--border-faint)] text-muted shrink-0"
                >
                  ×{qty}
                </span>
              )}

              {weightKg != null && (
                <span className="font-mono text-[10.5px] text-muted-faint shrink-0 hidden sm:inline">
                  {fsWeight(weightKg)} kg
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(index);
              }}
              aria-label={t("query.removeItem", { index: index + 1 })}
              className="inline-flex items-center justify-center w-6 text-[13px] leading-none text-muted-faint hover:text-[var(--accent)] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer border-0 border-l border-transparent hover:border-[var(--border-faint)] rounded-none"
            >
              ×
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddItem}
        aria-label={t("query.addItem")}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold font-mono text-muted hover:text-foreground bg-[var(--surface-inset)] hover:bg-[var(--surface)] border border-dashed border-[var(--border)] hover:border-[var(--foreground)] transition-colors whitespace-nowrap cursor-pointer rounded-none flex-shrink-0"
        style={{ height: compact ? 32 : 36 }}
      >
        <span className="text-[13px] leading-none">+</span>
        <span>{t("query.addItem")}</span>
      </button>
    </div>
  );
}
