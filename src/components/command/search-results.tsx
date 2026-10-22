"use client";

import { useTranslations } from "next-intl";
import type { SearchResult, SearchResultKind } from "@/lib/command/search";

const KIND_ORDER: SearchResultKind[] = [
  "line",
  "part",
  "project",
  "customer",
  "size",
  "setting",
];

/**
 * One field, everything.
 *
 * The `>` command palette was built once and removed, and the reason it went
 * is the reason this is not a palette: a palette that repeats the tabs is
 * redundant. A *search* is not — it reaches the saved part buried in a
 * project, the customer's phone number, the line from six weeks ago, and the
 * setting nobody can remember the name of.
 */
export function SearchResultsList({
  results,
  onPick,
}: {
  results: SearchResult[];
  onPick: (result: SearchResult) => void;
}) {
  const t = useTranslations("command");

  if (results.length === 0) {
    return (
      <div className="border-t border-[var(--border-faint)] bg-[var(--surface)] px-[18px] py-4">
        <p className="font-mono text-[12px] text-muted">{t("search.noResults")}</p>
      </div>
    );
  }

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: results.filter((result) => result.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="max-h-[46vh] overflow-y-auto border-t border-[var(--border-faint)] bg-[var(--surface)]">
      {groups.map((group) => (
        <div key={group.kind}>
          <p className="px-[18px] pt-2.5 font-mono text-[10px] uppercase tracking-[1.4px] text-muted-faint">
            {t(`search.kinds.${group.kind}`)}
          </p>
          {group.items.map((result) => (
            <button
              key={`${result.kind}-${result.id}`}
              type="button"
              onClick={() => onPick(result)}
              className="flex w-full items-center gap-3 border-b border-[var(--border-faint)] px-[18px] py-2 text-left transition-colors duration-[140ms] hover:bg-[var(--surface-inset)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[13px] text-foreground">
                  {result.label}
                </span>
                {result.detail ? (
                  <span className="block truncate text-[11.5px] text-muted">{result.detail}</span>
                ) : null}
              </span>
              {result.at ? (
                <span className="shrink-0 font-mono text-[10.5px] text-muted-faint">
                  {new Date(result.at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
