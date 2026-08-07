"use client";

import { useTranslations } from "next-intl";
import { COMMAND_ALIASES, COMMAND_GRADES } from "@ferroscale/metal-core";
import { SheetShell } from "./sheet-shell";

/**
 * The grammar and the shortcuts on one screen, opened with `?`.
 *
 * The profile list is generated from the alias table, so it can't drift from
 * what the parser actually accepts — a cheat sheet that lies is worse than
 * none.
 */

const SHORTCUTS: { keys: string; key: string }[] = [
  { keys: "↵", key: "enter" },
  { keys: "Tab", key: "tab" },
  { keys: "⌥1–9", key: "digits" },
  { keys: "↑ ↓", key: "history" },
  { keys: "⌘S", key: "save" },
  { keys: "⌘⏎", key: "compare" },
  { keys: "⌘K", key: "new" },
  { keys: "Esc", key: "clear" },
  { keys: "⌫", key: "backspace" },
];

const GRAMMAR: { token: string; key: string }[] = [
  { token: "hea120", key: "profile" },
  { token: "6m", key: "length" },
  { token: "x2", key: "quantity" },
  { token: "s355", key: "grade" },
  { token: "@2.50/kg", key: "price" },
];

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4"
      style={{ padding: "6px 0", borderBottom: "1px solid var(--border-faint)" }}
    >
      <span className="flex-shrink-0">{left}</span>
      <span className="text-[12.5px] text-muted text-right">{right}</span>
    </div>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="font-mono text-[12.5px] font-bold rounded"
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-bold text-muted uppercase"
      style={{ letterSpacing: 1.2, margin: "14px 0 4px" }}
    >
      {children}
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
  const profiles = COMMAND_ALIASES.filter((a) => a.alias !== "sht");
  const grades = COMMAND_GRADES.slice(0, 6);

  return (
    <SheetShell title={t("help.title")} onClose={onClose} maxWidth={560}>
      <button
        type="button"
        onClick={() => onTryExample("hea120 6m x2 s355 @2.50/kg")}
        className="w-full rounded-xl text-left cursor-pointer"
        style={{
          padding: "11px 14px",
          border: "1px solid var(--accent-border)",
          background: "var(--accent-surface)",
        }}
      >
        <div className="font-mono text-[13.5px] font-bold" style={{ color: "var(--accent-text)" }}>
          hea120 6m x2 s355 @2.50/kg
        </div>
        <div className="text-[11.5px] text-muted mt-0.5">{t("help.exampleHint")}</div>
      </button>

      <SectionTitle>{t("help.grammar")}</SectionTitle>
      {GRAMMAR.map((row) => (
        <Row
          key={row.key}
          left={<Token>{row.token}</Token>}
          right={t(`help.token.${row.key}`)}
        />
      ))}
      <div className="text-[11.5px] text-muted mt-2" style={{ lineHeight: 1.5 }}>
        {t("help.orderNote")}
      </div>

      <SectionTitle>{t("help.shortcuts")}</SectionTitle>
      {SHORTCUTS.map((row) => (
        <Row
          key={row.key}
          left={
            <kbd
              className="font-mono text-[11.5px] font-bold rounded"
              style={{
                padding: "2px 7px",
                border: "1px solid var(--border-faint)",
                background: "var(--surface-raised)",
                color: "var(--foreground-secondary)",
              }}
            >
              {row.keys}
            </kbd>
          }
          right={t(`help.shortcut.${row.key}`)}
        />
      ))}

      <SectionTitle>{t("help.profiles")}</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {profiles.map((alias) => (
          <button
            key={alias.alias}
            type="button"
            onClick={() => onTryExample(`${alias.alias}`)}
            title={alias.name}
            className="cursor-pointer bg-transparent border-0 p-0"
          >
            <Token>{alias.alias}</Token>
          </button>
        ))}
      </div>

      <SectionTitle>{t("help.grades")}</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {grades.map((grade) => (
          <Token key={grade.id}>{grade.aliases[0]}</Token>
        ))}
        <span className="text-[11.5px] text-muted self-center">{t("help.moreGrades")}</span>
      </div>
    </SheetShell>
  );
}
