"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { COMMAND_ALIASES, COMMAND_GRADES } from "@ferroscale/metal-core";
import { SheetShell } from "./sheet-shell";

/**
 * The grammar and the shortcuts on one screen, opened with `?`.
 *
 * Organized into intuitive categories: Multi-Item Line & Tabs, Command Line &
 * Suggestions, Workspace & Session, Grammar, and Profiles & Grades.
 */

export type HelpTabId = "all" | "tabs" | "command" | "actions" | "grammar" | "profiles";

interface ShortcutItem {
  keys: string;
  key: string;
  category: "tabs" | "command" | "actions";
}

const TAB_SHORTCUTS: ShortcutItem[] = [
  { keys: "⌥[ ⌥]", key: "tabs", category: "tabs" },
  { keys: "⌥⇧1–9", key: "tabJump", category: "tabs" },
  { keys: "⌥+", key: "tabAdd", category: "tabs" },
  { keys: "⌥W", key: "tabClose", category: "tabs" },
  { keys: "⌫", key: "tabBackspace", category: "tabs" },
];

const COMMAND_SHORTCUTS: ShortcutItem[] = [
  { keys: "↵", key: "enter", category: "command" },
  { keys: "Tab", key: "tab", category: "command" },
  { keys: "⌥1–9", key: "digits", category: "command" },
  { keys: "⌫", key: "backspace", category: "command" },
  { keys: "Esc", key: "clear", category: "command" },
  { keys: "?", key: "help", category: "command" },
];

const ACTION_SHORTCUTS: ShortcutItem[] = [
  { keys: "↑ ↓", key: "history", category: "actions" },
  { keys: "⌘S", key: "save", category: "actions" },
  { keys: "⌘⏎", key: "compare", category: "actions" },
  { keys: "⌘K", key: "new", category: "actions" },
];

const ALL_SHORTCUTS: ShortcutItem[] = [
  ...TAB_SHORTCUTS,
  ...COMMAND_SHORTCUTS,
  ...ACTION_SHORTCUTS,
];

const GRAMMAR: { token: string; key: string }[] = [
  { token: "hea120", key: "profile" },
  { token: "6m", key: "length" },
  { token: "x2", key: "quantity" },
  { token: "s355", key: "grade" },
  { token: "@2.50/kg", key: "price" },
  { token: "=500kg", key: "target" },
  { token: "+ ipe200 4m", key: "item" },
  { token: "6m-50mm", key: "arith" },
];

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4"
      style={{ padding: "6px 0", borderBottom: "1px solid var(--border-faint)" }}
    >
      <span className="flex-shrink-0">{left}</span>
      <span className="text-[13px] text-muted text-right">{right}</span>
    </div>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="font-mono text-[13px] font-bold rounded"
      style={{
        padding: "2px 7px",
        background: "var(--surface-inset)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </code>
  );
}

function ShortcutKbd({ keys }: { keys: string }) {
  return (
    <kbd
      className="font-mono text-[12px] font-bold rounded"
      style={{
        padding: "2px 7px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
        color: "var(--foreground-secondary)",
      }}
    >
      {keys}
    </kbd>
  );
}

function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div
      className="flex items-center justify-between text-[10px] font-bold text-muted uppercase"
      style={{ letterSpacing: 1.2, margin: "16px 0 6px" }}
    >
      <span>{children}</span>
      {count != null && (
        <span className="font-mono text-[10px] text-muted-faint font-normal lowercase tracking-normal">
          {count}
        </span>
      )}
    </div>
  );
}

export function CommandHelpSheet({
  onClose,
  onTryExample,
}: {
  onClose: () => void;
  /** Load an example into the line — the fastest way to learn the grammar. */
  onTryExample: (query: string) => void;
}) {
  const t = useTranslations("command");
  const tFaq = useTranslations("faq");
  const [activeFilter, setActiveFilter] = useState<HelpTabId>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const profiles = useMemo(
    () => COMMAND_ALIASES.filter((a) => a.alias !== "sht"),
    [],
  );
  const grades = useMemo(() => COMMAND_GRADES.slice(0, 6), []);

  const filterTabs: { id: HelpTabId; labelKey: string; count?: number }[] = [
    { id: "all", labelKey: "help.filterAll" },
    { id: "tabs", labelKey: "help.filterTabs", count: TAB_SHORTCUTS.length },
    { id: "command", labelKey: "help.filterCommand", count: COMMAND_SHORTCUTS.length },
    { id: "actions", labelKey: "help.filterActions", count: ACTION_SHORTCUTS.length },
    { id: "grammar", labelKey: "help.filterGrammar", count: GRAMMAR.length },
    { id: "profiles", labelKey: "help.filterProfiles", count: profiles.length },
  ];

  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Search filtering logic
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;

    const matchedShortcuts = ALL_SHORTCUTS.filter((sc) => {
      const desc = t(`help.shortcut.${sc.key}`).toLowerCase();
      return sc.keys.toLowerCase().includes(trimmedQuery) || desc.includes(trimmedQuery);
    });

    const matchedGrammar = GRAMMAR.filter((g) => {
      const desc = t(`help.token.${g.key}`).toLowerCase();
      return g.token.toLowerCase().includes(trimmedQuery) || desc.includes(trimmedQuery);
    });

    const matchedProfiles = profiles.filter(
      (p) =>
        p.alias.toLowerCase().includes(trimmedQuery) ||
        p.name.toLowerCase().includes(trimmedQuery),
    );

    const matchedGrades = grades.filter((gr) =>
      gr.aliases.some((a) => a.toLowerCase().includes(trimmedQuery)),
    );

    return {
      shortcuts: matchedShortcuts,
      grammar: matchedGrammar,
      profiles: matchedProfiles,
      grades: matchedGrades,
      hasAny:
        matchedShortcuts.length > 0 ||
        matchedGrammar.length > 0 ||
        matchedProfiles.length > 0 ||
        matchedGrades.length > 0,
    };
  }, [trimmedQuery, t, profiles, grades]);

  return (
    <SheetShell title={t("help.title")} onClose={onClose} maxWidth={560}>
      {/* Category filter rail */}
      <div
        role="tablist"
        aria-label={t("help.shortcuts")}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 pt-0.5 border-b border-[var(--border-faint)]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {filterTabs.map((tab) => {
          const isSelected = activeFilter === tab.id && !trimmedQuery;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                setActiveFilter(tab.id);
                setSearchQuery("");
              }}
              className={`px-2.5 py-1 text-xs transition-colors cursor-pointer whitespace-nowrap border ${
                isSelected
                  ? "bg-[var(--surface-raised)] text-foreground border-[var(--foreground)] font-semibold"
                  : "bg-transparent text-muted hover:text-foreground border-[var(--border-faint)] hover:border-[var(--border)]"
              }`}
            >
              <span>{t(tab.labelKey)}</span>
              {tab.count != null && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-faint">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick filter input */}
      <div className="relative my-2.5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("help.searchPlaceholder")}
          className="w-full px-3 py-1.5 pr-8 text-xs border border-[var(--border)] bg-[var(--surface-inset)] text-foreground placeholder:text-muted focus:outline-none focus:border-[var(--foreground)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label={t("common.clear")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-foreground font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* SEARCH RESULTS VIEW */}
      {searchResults != null ? (
        searchResults.hasAny ? (
          <div>
            {searchResults.shortcuts.length > 0 && (
              <>
                <SectionTitle count={searchResults.shortcuts.length}>
                  {t("help.shortcuts")}
                </SectionTitle>
                {searchResults.shortcuts.map((row) => (
                  <Row
                    key={row.key}
                    left={<ShortcutKbd keys={row.keys} />}
                    right={t(`help.shortcut.${row.key}`)}
                  />
                ))}
              </>
            )}

            {searchResults.grammar.length > 0 && (
              <>
                <SectionTitle count={searchResults.grammar.length}>
                  {t("help.grammar")}
                </SectionTitle>
                {searchResults.grammar.map((row) => (
                  <Row
                    key={row.key}
                    left={<Token>{row.token}</Token>}
                    right={t(`help.token.${row.key}`)}
                  />
                ))}
              </>
            )}

            {searchResults.profiles.length > 0 && (
              <>
                <SectionTitle count={searchResults.profiles.length}>
                  {t("help.profiles")}
                </SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {searchResults.profiles.map((alias) => (
                    <button
                      key={alias.alias}
                      type="button"
                      onClick={() => onTryExample(alias.alias)}
                      title={alias.name}
                      className="cursor-pointer bg-transparent border-0 p-0"
                    >
                      <Token>{alias.alias}</Token>
                    </button>
                  ))}
                </div>
              </>
            )}

            {searchResults.grades.length > 0 && (
              <>
                <SectionTitle count={searchResults.grades.length}>
                  {t("help.grades")}
                </SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {searchResults.grades.map((grade) => (
                    <Token key={grade.id}>{grade.aliases[0]}</Token>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted">
            <p>{t("help.noMatches", { query: searchQuery })}</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2.5 px-3 py-1 text-xs border border-[var(--border)] bg-[var(--surface-raised)] text-foreground cursor-pointer"
            >
              {t("common.clear")}
            </button>
          </div>
        )
      ) : (
        /* CATEGORIZED STANDARD VIEW */
        <div>
          {/* Example card shown on All or Tabs */}
          {(activeFilter === "all" || activeFilter === "tabs") && (
            <button
              type="button"
              onClick={() => onTryExample("hea120 6m x2 s355 @2.50/kg + ipe200 4m")}
              className="w-full rounded-button text-left cursor-pointer my-1.5"
              style={{
                padding: "10px 13px",
                border: "1px solid var(--accent-border)",
                background: "var(--accent-surface)",
              }}
            >
              <div className="font-mono text-[13px] font-bold" style={{ color: "var(--accent-text)" }}>
                hea120 6m x2 s355 @2.50/kg + ipe200 4m
              </div>
              <div className="text-[11px] text-muted mt-0.5">{t("help.exampleHint")}</div>
            </button>
          )}

          {/* 1. Multi-Item Line & Tabs Category */}
          {(activeFilter === "all" || activeFilter === "tabs") && (
            <section aria-labelledby="section-tabs">
              <SectionTitle count={TAB_SHORTCUTS.length}>
                {t("help.categoryTabs")}
              </SectionTitle>
              {TAB_SHORTCUTS.map((row) => (
                <Row
                  key={row.key}
                  left={<ShortcutKbd keys={row.keys} />}
                  right={t(`help.shortcut.${row.key}`)}
                />
              ))}
            </section>
          )}

          {/* 2. Command Line & Suggestions Category */}
          {(activeFilter === "all" || activeFilter === "command") && (
            <section aria-labelledby="section-command">
              <SectionTitle count={COMMAND_SHORTCUTS.length}>
                {t("help.categoryCommand")}
              </SectionTitle>
              {COMMAND_SHORTCUTS.map((row) => (
                <Row
                  key={row.key}
                  left={<ShortcutKbd keys={row.keys} />}
                  right={t(`help.shortcut.${row.key}`)}
                />
              ))}
            </section>
          )}

          {/* 3. Workspace & Session Category */}
          {(activeFilter === "all" || activeFilter === "actions") && (
            <section aria-labelledby="section-actions">
              <SectionTitle count={ACTION_SHORTCUTS.length}>
                {t("help.categoryActions")}
              </SectionTitle>
              {ACTION_SHORTCUTS.map((row) => (
                <Row
                  key={row.key}
                  left={<ShortcutKbd keys={row.keys} />}
                  right={t(`help.shortcut.${row.key}`)}
                />
              ))}
            </section>
          )}

          {/* 4. Grammar Tokens */}
          {(activeFilter === "all" || activeFilter === "grammar") && (
            <section aria-labelledby="section-grammar">
              <SectionTitle count={GRAMMAR.length}>{t("help.grammar")}</SectionTitle>
              {GRAMMAR.map((row) => (
                <Row
                  key={row.key}
                  left={<Token>{row.token}</Token>}
                  right={t(`help.token.${row.key}`)}
                />
              ))}
              <div className="text-[12px] text-muted mt-2" style={{ lineHeight: 1.5 }}>
                {t("help.orderNote")}
              </div>
            </section>
          )}

          {/* 5. Profiles & Grades */}
          {(activeFilter === "all" || activeFilter === "profiles") && (
            <section aria-labelledby="section-profiles">
              <SectionTitle count={profiles.length}>{t("help.profiles")}</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {profiles.map((alias) => (
                  <button
                    key={alias.alias}
                    type="button"
                    onClick={() => onTryExample(alias.alias)}
                    title={alias.name}
                    className="cursor-pointer bg-transparent border-0 p-0"
                  >
                    <Token>{alias.alias}</Token>
                  </button>
                ))}
              </div>

              <SectionTitle count={grades.length}>{t("help.grades")}</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {grades.map((grade) => (
                  <Token key={grade.id}>{grade.aliases[0]}</Token>
                ))}
                <span className="text-[12px] text-muted self-center">
                  {t("help.moreGrades")}
                </span>
              </div>
            </section>
          )}
        </div>
      )}

      {/* FAQ Navigation Link */}
      <div className="mt-5 pt-3 border-t border-[var(--border-faint)]">
        <Link
          href="/faq"
          onClick={onClose}
          className="flex items-center justify-between p-2.5 border border-[var(--border-faint)] bg-[var(--surface-raised)] hover:border-[var(--border)] transition-colors text-xs text-foreground font-medium"
        >
          <span>{tFaq("navLink")}</span>
          <span aria-hidden="true" className="text-muted">
            →
          </span>
        </Link>
      </div>
    </SheetShell>
  );
}
