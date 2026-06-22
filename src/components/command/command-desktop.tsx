"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getAppTabFromPathname } from "@/lib/app-shell";
import { APP_VERSION } from "@/lib/changelog";
import { CommandGlyph } from "./command-glyph";
import {
  formatCommandHint,
  formatCommandParseName,
  formatCommandSuggestionLabel,
} from "./command-copy";
import { SyncSection } from "./command-sheets";
import { cmdParse, cmdClassifyToken, cmdTokenize } from "@/lib/command/parser";
import { COMMAND_GRADES, findAliasByProfileId } from "@/lib/command/aliases";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@/lib/command/format";
import type {
  CommandParseResult,
  CommandParserSettings,
  CommandSuggestion,
  CommandSuggestionItem,
  CommandTokenKind,
} from "@/lib/command/types";
import type { SharedCalcSettings } from "@/lib/settings-stores";
import type {
  CalculationInput,
  CalculationResult,
  CurrencyCode,
  LengthUnit,
  PriceBasis,
  PriceUnit,
} from "@/lib/calculator/types";
import type { SavedEntry } from "@/hooks/useSaved";
import type { CompareItem } from "@/hooks/useCompare";
import type { Project } from "@/hooks/useProjects";

/* ──────────────────────────────────────────────────────────────
 *  FerroScale Command Desktop — sidebar workspace shell.
 *  Typing-first: the command line is a real <input> (caret, paste,
 *  selection all work); a global listener routes stray keystrokes
 *  into it so you can start typing from anywhere in the calc view.
 * ────────────────────────────────────────────────────────────── */

type DeskView = "calc" | "saved" | "projects" | "compare" | "settings";

const CURRENCIES: CurrencyCode[] = ["EUR", "USD", "GBP", "PLN", "BAM"];
const UNIT_OPTIONS: LengthUnit[] = ["mm", "cm", "m", "in", "ft"];
const BASIS_UNIT: Record<PriceBasis, PriceUnit> = {
  weight: "kg",
  length: "m",
  piece: "piece",
};

const KIND_BG: Record<CommandTokenKind, string> = {
  profile: "bg-[var(--accent-surface)] text-[var(--accent-text)]",
  len: "bg-[var(--blue-surface)] text-[var(--blue-text)]",
  qty: "bg-[var(--green-surface)] text-[var(--green-text)]",
  grade: "bg-[var(--surface-inset)] text-foreground-secondary",
  price: "bg-[var(--blue-surface)] text-[var(--blue-text)]",
  unknown: "bg-[var(--surface-inset)] text-muted",
};

export interface CommandDesktopProps {
  dark: boolean;
  onToggleTheme: () => void;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  p: CommandParseResult;
  sug: CommandSuggestion;
  sym: string;
  mode: "weight" | "price";
  onSetMode: (m: "weight" | "price") => void;
  parserSettings: CommandParserSettings;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  sessionTape: string[];
  onRemoveTapeEntry: (q: string) => void;
  onClearTape: () => void;
  saved: SavedEntry[];
  compareItems: CompareItem[];
  projects: Project[];
  onSave: () => void;
  onCopy: () => void;
  onNew: () => void;
  onSuggest: (item: CommandSuggestionItem) => void;
  onCompareCurrent: () => void;
  onAddCompare: (input: CalculationInput, result: CalculationResult) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
  onAddToProject: () => void;
  onLoadInput: (input: CalculationInput) => void;
  onRemoveSaved: (id: string) => void;
  onCreateProject: (name: string) => Project;
  onRemoveProjectCalc: (projectId: string, calcId: string) => void;
}

export function CommandDesktop(props: CommandDesktopProps) {
  const pathname = usePathname();
  const [view, setView] = useState<DeskView>(() => {
    switch (getAppTabFromPathname(pathname)) {
      case "saved":
        return "saved";
      case "projects":
        return "projects";
      case "settings":
        return "settings";
      default:
        return "calc";
    }
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focusInputAtEnd = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const gotoCalc = useCallback(() => {
    setView("calc");
    requestAnimationFrame(() => focusInputAtEnd());
  }, [focusInputAtEnd]);

  const pickInput = useCallback(
    (input: CalculationInput) => {
      props.onLoadInput(input);
      gotoCalc();
    },
    [props, gotoCalc],
  );

  // ⌘K from anywhere → new calculation: clear the line, focus it.
  // A printable key outside any field routes into the command line
  // (focus happens during keydown, so the character lands in the input).
  const { onNew } = props;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setView("calc");
        onNew();
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inField =
        tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (inField || event.metaKey || event.ctrlKey || event.altKey) return;
      if (view !== "calc") return;
      if (
        (event.key.length === 1 && /^[a-z0-9 .x×*]$/i.test(event.key)) ||
        event.key === "Backspace"
      ) {
        focusInputAtEnd();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, focusInputAtEnd, onNew]);

  const counts = {
    saved: props.saved.length,
    projects: props.projects.length,
    compare: props.compareItems.length,
  };

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <DeskSidebar
        dark={props.dark}
        view={view}
        setView={setView}
        counts={counts}
        onToggleTheme={props.onToggleTheme}
      />
      {view === "calc" && (
        <DeskCalcView {...props} inputRef={inputRef} gotoCompare={() => setView("compare")} />
      )}
      {view === "compare" && (
        <DeskCompareView
          dark={props.dark}
          compareItems={props.compareItems}
          onRemove={props.onRemoveCompare}
          onClearAll={props.onClearCompare}
          gotoCalc={gotoCalc}
          onPick={pickInput}
        />
      )}
      {view === "saved" && (
        <DeskSavedView
          saved={props.saved}
          onPick={(entry) => pickInput(entry.input)}
          onAddCompare={(entry) => props.onAddCompare(entry.input, entry.result)}
          onRemove={props.onRemoveSaved}
        />
      )}
      {view === "projects" && (
        <DeskProjectsView
          dark={props.dark}
          projects={props.projects}
          onPickItem={pickInput}
          onCreateProject={props.onCreateProject}
          onRemoveCalc={props.onRemoveProjectCalc}
        />
      )}
      {view === "settings" && (
        <DeskSettingsView
          dark={props.dark}
          sym={props.sym}
          shared={props.shared}
          onUpdateShared={props.onUpdateShared}
          weightAsMain={props.weightAsMain}
          onSetWeightAsMain={props.onSetWeightAsMain}
          defaultUnit={props.defaultUnit}
          onSetDefaultUnit={props.onSetDefaultUnit}
          onToggleTheme={props.onToggleTheme}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Sidebar ───────────────────────── */

function SidebarNavItem({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  count?: number;
}) {
  const t = useTranslations("command");
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[11px] w-full rounded-[11px] text-left cursor-pointer"
      style={{
        padding: "9px 12px",
        background: active ? "var(--accent-surface)" : "transparent",
        color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
      }}
    >
      <span className="flex" style={{ color: active ? "var(--accent)" : "var(--muted)" }}>
        {icon}
      </span>
      <span
        className="flex-1 text-[13.5px]"
        style={{ fontWeight: active ? 700 : 600, letterSpacing: -0.1 }}
      >
        {label}
      </span>
      {count != null && count > 0 && (
        <span
          className="font-mono text-[10.5px] font-bold px-[7px] py-[2px] rounded-full"
          style={{
            background: active ? "var(--surface)" : "var(--surface-inset)",
            color: active ? "var(--accent-text)" : "var(--muted)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function DeskSidebar({
  dark,
  view,
  setView,
  counts,
  onToggleTheme,
}: {
  dark: boolean;
  view: DeskView;
  setView: (v: DeskView) => void;
  counts: { saved: number; projects: number; compare: number };
  onToggleTheme: () => void;
}) {
  const t = useTranslations("command");
  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 224,
        background: "var(--surface-raised)",
        borderRight: "1px solid var(--border-faint)",
        padding: "18px 12px 14px",
      }}
    >
      {/* brand */}
      <div className="flex items-center gap-2.5" style={{ padding: "0 6px 16px" }}>
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-[9px]"
          style={{ width: 30, height: 30, background: "var(--accent)" }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              background: dark ? "#161109" : "#fff",
              borderRadius: 3,
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-[15.5px] tracking-tight text-foreground">
            FerroScale
          </div>
          <div className="font-mono text-[9.5px] text-muted mt-px">
            command · v{APP_VERSION}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: "var(--border-faint)", margin: "0 2px" }} />

      <div
        className="text-[9.5px] font-bold text-muted-faint"
        style={{ letterSpacing: 1.3, padding: "14px 12px 6px" }}
      >
        {t("nav.workspace")}
      </div>
      <div className="flex flex-col gap-0.5">
        <SidebarNavItem
          active={view === "calc"}
          onClick={() => setView("calc")}
          label={t("nav.calculator")}
          icon={<DeskIcon name="calc" />}
        />
        <SidebarNavItem
          active={view === "saved"}
          onClick={() => setView("saved")}
          label={t("nav.saved")}
          icon={<DeskIcon name="saved" />}
          count={counts.saved}
        />
        <SidebarNavItem
          active={view === "projects"}
          onClick={() => setView("projects")}
          label={t("nav.projects")}
          icon={<DeskIcon name="projects" />}
          count={counts.projects}
        />
        <SidebarNavItem
          active={view === "compare"}
          onClick={() => setView("compare")}
          label={t("nav.compare")}
          icon={<DeskIcon name="compare" />}
          count={counts.compare}
        />
      </div>

      <div className="flex-1" />

      {/* shortcut hint */}
      <div
        className="flex items-center gap-2 rounded-[11px] mb-2.5"
        style={{ padding: "10px 12px", background: "var(--surface-inset)" }}
      >
        <Kbd>⌘K</Kbd>
        <span className="text-[11px] text-muted font-semibold">{t("common.newCalculation")}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <SidebarNavItem
          active={view === "settings"}
          onClick={() => setView("settings")}
          label={t("nav.settings")}
          icon={<DeskIcon name="settings" />}
        />
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-[11px] w-full rounded-[11px] text-left cursor-pointer text-foreground-secondary"
          style={{ padding: "9px 12px", background: "transparent" }}
        >
          <span className="flex text-muted">
            <DeskIcon name={dark ? "sun" : "moon"} />
          </span>
          <span className="flex-1 font-semibold text-[13.5px]">
            {dark ? t("settings.lightMode") : t("settings.darkMode")}
          </span>
        </button>
      </div>
    </aside>
  );
}

/* ───────────────────────── Topbar + atoms ───────────────────────── */

function DeskTopbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 flex-shrink-0"
      style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border-faint)" }}
    >
      <div className="min-w-0">
        <div className="font-extrabold text-xl text-foreground" style={{ letterSpacing: -0.4 }}>
          {title}
        </div>
        {subtitle && <div className="font-mono text-[11.5px] text-muted mt-0.5">{subtitle}</div>}
      </div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}

function DeskBtn({
  dark,
  children,
  onClick,
  primary,
  small,
  disabled,
}: {
  dark: boolean;
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-1 items-center justify-center gap-[7px] rounded-[11px] font-bold whitespace-nowrap"
      style={{
        padding: small ? "7px 13px" : "10px 16px",
        cursor: disabled ? "default" : "pointer",
        border: primary ? "none" : "1px solid var(--border-faint)",
        background: primary ? "var(--accent)" : "var(--surface)",
        color: primary ? (dark ? "#161109" : "#fff") : "var(--foreground)",
        fontSize: small ? 12 : 13,
        opacity: disabled ? 0.45 : 1,
        boxShadow: primary ? "none" : "var(--panel-shadow-soft)",
      }}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono text-[10px] font-bold rounded-md whitespace-nowrap"
      style={{
        padding: "2.5px 6px",
        background: "var(--surface)",
        border: "1px solid var(--border-faint)",
        color: "var(--muted)",
      }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold text-muted" style={{ letterSpacing: 1.2 }}>
      {children}
    </span>
  );
}

function famForInput(input: CalculationInput) {
  return findAliasByProfileId(input.profileId)?.fam;
}

/* ───────────────────────── Calculator view ───────────────────────── */

type DeskCalcViewProps = CommandDesktopProps & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  gotoCompare: () => void;
};

function DeskCalcView({
  dark,
  query,
  setQuery,
  p,
  sug,
  sym,
  mode,
  onSetMode,
  parserSettings,
  sessionTape,
  onRemoveTapeEntry,
  onClearTape,
  compareItems,
  onSave,
  onCopy,
  onNew,
  onSuggest,
  onCompareCurrent,
  onAddToProject,
  onLoadInput,
  onRemoveCompare,
  inputRef,
  gotoCompare,
}: DeskCalcViewProps) {
  const t = useTranslations("command");
  const isW = mode === "weight";
  const firstSuggestionRef = useRef<HTMLButtonElement | null>(null);

  const queryTokens = useMemo(() => cmdTokenize(query), [query]);
  // The trailing piece (no whitespace after it) is still being typed — it
  // lives in the real input; the completed tokens render as chips before it.
  const hasPartial = !/\s$/.test(query) && queryTokens.length > 0;
  const chipTokens = hasPartial ? queryTokens.slice(0, -1) : queryTokens;
  const partial = hasPartial ? queryTokens[queryTokens.length - 1] : "";
  const chipPrefix = chipTokens.length > 0 ? chipTokens.join(" ") + " " : "";

  const focusInputAtEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [inputRef]);

  const removeTokenAt = (idx: number) => {
    const rest = queryTokens.filter((_, i) => i !== idx);
    const trailing = rest.length > 0 && /\s$/.test(query) ? " " : "";
    setQuery(rest.join(" ") + trailing);
    focusInputAtEnd();
  };
  // Pull a token back to the end of the query as the editable trailing
  // partial (parser is order-tolerant, so reordering is safe).
  const editTokenAt = (idx: number) => {
    const others = queryTokens.filter((_, i) => i !== idx);
    setQuery(others.join(" ") + (others.length ? " " : "") + queryTokens[idx]);
    focusInputAtEnd();
  };

  const heroVal = isW
    ? p.totalKg != null
      ? fsWeight(p.totalKg)
      : "—"
    : p.totalAmount != null
      ? fsMoney(p.totalAmount)
      : "—";

  const tapeRows = useMemo(
    () =>
      sessionTape
        .slice(0, 6)
        .map((q) => ({ q, rp: cmdParse(q, parserSettings) }))
        .filter(
          (x) => x.rp.valid && x.rp.totalKg != null && x.rp.totalAmount != null,
        ),
    [sessionTape, parserSettings],
  );
  const sumKg = tapeRows.reduce((s, x) => s + (x.rp.totalKg ?? 0), 0);
  const sumAmount = tapeRows.reduce((s, x) => s + (x.rp.totalAmount ?? 0), 0);
  const displayName = formatCommandParseName(t, p);

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.calculator")}
        subtitle={p.valid && displayName ? t("desktop.calcLive", { name: displayName }) : t("desktop.typeProfileToStart")}
        actions={
          <div className="flex items-center gap-[7px]">
            <Kbd>{t("desktop.enterSave")}</Kbd>
            <Kbd>{t("desktop.escClear")}</Kbd>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ───────── main column ───────── */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ padding: "26px 32px 32px" }}>
          {/* COMMAND LINE */}
          <label
            className="flex items-center gap-2 flex-wrap rounded-2xl cursor-text"
            style={{
              minHeight: 62,
              border: "1.5px solid var(--accent-border)",
              background: "var(--surface)",
              padding: "13px 18px",
              boxShadow: dark
                ? "0 0 0 3px rgba(240,121,63,0.13)"
                : "0 0 0 3px rgba(216,82,31,0.10)",
            }}
          >
            <span
              className="font-mono font-bold text-[19px] mr-0.5"
              style={{ color: "var(--accent)" }}
              aria-hidden="true"
            >
              ›
            </span>
            {chipTokens.map((tok, i) => (
              <DeskTokenChip
                key={`${tok}-${i}`}
                tok={tok}
                kindClass={KIND_BG[cmdClassifyToken(tok)]}
                onEdit={() => editTokenAt(i)}
                onRemove={() => removeTokenAt(i)}
              />
            ))}
            <input
              ref={inputRef}
              type="text"
              value={partial}
              onChange={(e) => setQuery(chipPrefix + e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (p.valid) {
                    e.preventDefault();
                    onSave();
                    return;
                  }
                  // Mid-query: insert the first matching suggestion chip
                  // (skip the "Save calculation" chip in the Ready stage).
                  const first = sug.items.find((it) => it.kind !== "save");
                  if (first) {
                    e.preventDefault();
                    onSuggest(first);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onNew();
                  return;
                }
                // Empty partial + backspace pulls the last chip back into
                // the input for editing.
                if (
                  e.key === "Backspace" &&
                  partial === "" &&
                  chipTokens.length > 0 &&
                  e.currentTarget.selectionStart === 0
                ) {
                  e.preventDefault();
                  setQuery(chipTokens.join(" "));
                  focusInputAtEnd();
                  return;
                }
                // Arrow-down opens chip navigation; Tab stays out of the
                // chip row entirely so typing isn't trapped.
                if (e.key === "ArrowDown" && sug.items.length > 0) {
                  e.preventDefault();
                  firstSuggestionRef.current?.focus();
                }
              }}
              autoFocus
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              placeholder={
                queryTokens.length === 0 ? t("query.placeholderExample") : ""
              }
              aria-label={t("query.aria")}
              className="flex-1 bg-transparent font-mono text-base font-semibold text-foreground placeholder:text-muted-faint min-w-[120px]"
              // The command-line box carries the permanent accent glow; the
              // global :focus-visible ring on the inner input is just noise.
              style={{ outline: "none" }}
            />
            {query !== "" && (
              <button
                type="button"
                onClick={onNew}
                className="ml-auto bg-transparent border-0 text-muted text-[11px] font-bold cursor-pointer"
                style={{ letterSpacing: 0.4 }}
              >
                {t("common.clear")}
              </button>
            )}
          </label>

          {/* SUGGESTIONS */}
          <div className="mt-3.5">
            <div className="text-[10px] font-bold text-muted mb-2 uppercase" style={{ letterSpacing: 1.2 }}>
              {formatCommandHint(t, sug.hint)}
            </div>
            <div className="flex gap-[7px] flex-wrap">
              {sug.items.map((it, i) => (
                <button
                  key={i}
                  ref={i === 0 ? firstSuggestionRef : undefined}
                  type="button"
                  // Chips stay out of the Tab order — keep typing flow unbroken.
                  // ArrowDown from the input opens this list explicitly.
                  tabIndex={-1}
                  onClick={() => {
                    onSuggest(it);
                    focusInputAtEnd();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const dir = e.key === "ArrowRight" ? 1 : -1;
                      const buttons = Array.from(
                        e.currentTarget.parentElement?.querySelectorAll("button") ?? [],
                      ) as HTMLButtonElement[];
                      const idx = buttons.indexOf(e.currentTarget as HTMLButtonElement);
                      const next = buttons[idx + dir];
                      if (next) {
                        next.focus();
                      } else if (dir === -1) {
                        focusInputAtEnd();
                      }
                      return;
                    }
                    if (e.key === "ArrowUp" || e.key === "Escape") {
                      e.preventDefault();
                      focusInputAtEnd();
                    }
                  }}
                  className="flex items-center gap-[7px] rounded-[11px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
                  style={{
                    padding: it.sub ? "7px 13px" : "8px 14px",
                    border: it.kind === "save" ? "none" : "1px solid var(--border-faint)",
                    background: it.kind === "save" ? "var(--accent)" : "var(--surface)",
                    color: it.kind === "save" ? (dark ? "#161109" : "#fff") : "var(--foreground)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  {it.fam && (
                    <span className="flex" style={{ color: "var(--accent)" }}>
                      <CommandGlyph fam={it.fam} size={16} />
                    </span>
                  )}
                  <span className="flex flex-col items-start" style={{ lineHeight: 1.15 }}>
                    <span
                      className={`font-bold text-[13px] ${
                        it.kind === "size" || it.kind === "length" || it.kind === "qty"
                          ? "font-mono"
                          : ""
                      }`}
                    >
                      {formatCommandSuggestionLabel(t, it)}
                    </span>
                    {it.sub && (
                      <span className="text-[10px] text-muted font-semibold">{it.sub}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* HERO */}
          <div className="mt-[30px]">
            <div
              className="inline-flex gap-1 rounded-xl mb-4"
              style={{ padding: 3, background: "var(--surface-inset)" }}
            >
              {(["weight", "price"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSetMode(m)}
                  className="rounded-[9px] cursor-pointer border-0 font-bold text-[10.5px]"
                  style={{
                    padding: "7px 18px",
                    letterSpacing: 1.3,
                    background: mode === m ? "var(--surface)" : "transparent",
                    color:
                      mode === m
                        ? m === "weight"
                          ? "var(--accent-text)"
                          : "var(--blue-text)"
                        : "var(--muted)",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {(m === "weight" ? t("settings.weight") : t("settings.price")).toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-baseline gap-3">
              {!isW && p.totalAmount != null && (
                <span
                  className="leading-none"
                  style={{ fontWeight: 800, fontSize: 44, color: "var(--blue-strong)" }}
                >
                  {sym}
                </span>
              )}
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "clamp(56px, 7.5vw, 96px)",
                  lineHeight: 0.85,
                  letterSpacing: -4,
                  color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                }}
              >
                {heroVal}
              </span>
              {isW && p.totalKg != null && (
                <span className="font-bold text-[34px]" style={{ color: "var(--accent)" }}>
                  {fsWeightUnit(p.totalKg)}
                </span>
              )}
            </div>
            <div
              className="flex items-center gap-3 mt-4"
              style={{
                paddingBottom: 18,
                borderBottom: "1px solid var(--border-faint)",
                maxWidth: 640,
              }}
            >
              {p.valid && p.kgm != null ? (
                <span className="font-mono text-[13px] text-muted flex items-center gap-1.5 flex-wrap">
                  <span>
                    <span className="text-foreground-secondary">{p.kgm.toFixed(2)}</span> kg/m ×{" "}
                    <span className="text-foreground-secondary">{p.lengthM}</span> m ×{" "}
                    <span className="text-foreground-secondary">{p.realQty}</span>
                    {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
                  </span>
                  {!isW && p.pricing.wastePercent > 0 && (
                    <DeskPricingBadge>{t("pricingBadge.waste", { percent: p.pricing.wastePercent })}</DeskPricingBadge>
                  )}
                  {!isW && p.pricing.includeVat && (
                    <DeskPricingBadge>{t("pricingBadge.vat", { percent: p.pricing.vatPercent })}</DeskPricingBadge>
                  )}
                </span>
              ) : (
                <span className="font-mono text-[13px] text-muted-faint">
                  {p.alias
                    ? p.hasSize
                      ? t("hint.addLength")
                      : t("hint.addSize")
                    : t("hint.startProfile")}
                </span>
              )}
              <span className="ml-auto flex items-center gap-[5px]">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: p.valid ? "var(--green-text)" : "var(--muted-faint)" }}
                />
                <span
                  className="text-[10.5px] font-bold"
                  style={{
                    letterSpacing: 0.5,
                    color: p.valid ? "var(--green-text)" : "var(--muted-faint)",
                  }}
                >
                  {p.valid ? t("status.live") : t("status.waiting")}
                </span>
              </span>
            </div>
          </div>

          {/* SESSION TAPE */}
          <div className="mt-[22px]" style={{ maxWidth: 640 }}>
            <div className="flex items-baseline gap-2 mb-[9px]">
              <SectionLabel>{t("desktop.session")}</SectionLabel>
              <span className="font-mono text-[10.5px] text-muted-faint">
                {t("desktop.sessionSub")}
              </span>
              {tapeRows.length > 0 && (
                <button
                  type="button"
                  onClick={onClearTape}
                  className="ml-auto bg-transparent border-0 text-muted text-[10.5px] font-bold cursor-pointer hover:text-foreground"
                  style={{ letterSpacing: 0.4 }}
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
            {tapeRows.length === 0 ? (
              <div className="font-mono text-[11.5px] text-muted-faint" style={{ padding: "6px 2px" }}>
                {t("desktop.emptyTape")}
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid var(--border-faint)",
                  background: "var(--surface)",
                  boxShadow: "var(--panel-shadow-soft)",
                }}
              >
                {tapeRows.map(({ q, rp }, i) => (
                  <div
                    key={`${q}-${i}`}
                    className="group flex items-center gap-[11px]"
                    style={{
                      padding: "9.5px 12px 9.5px 16px",
                      borderTop: i ? "1px solid var(--border-faint)" : "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(q + " ");
                        focusInputAtEnd();
                      }}
                      className="flex-1 min-w-0 flex items-center gap-[11px] border-0 cursor-pointer text-left bg-transparent p-0"
                    >
                      <span className="flex flex-shrink-0 text-muted">
                        {rp.alias && <CommandGlyph fam={rp.alias.fam} size={16} />}
                      </span>
                      <span className="flex-1 min-w-0 font-bold text-[13.5px] text-foreground truncate">
                        {formatCommandParseName(t, rp)}
                      </span>
                      <span className="font-mono text-[11px] text-muted flex-shrink-0">
                        {rp.lengthM} m × {rp.realQty}
                      </span>
                      <span
                        className="font-mono text-[12.5px] font-bold text-foreground text-right flex-shrink-0"
                        style={{ width: 88 }}
                      >
                        {fsWeight(rp.totalKg!)} {fsWeightUnit(rp.totalKg!)}
                      </span>
                      <span
                        className="font-mono text-[12.5px] font-semibold text-muted text-right flex-shrink-0"
                        style={{ width: 92 }}
                      >
                        {sym} {fsMoney(rp.totalAmount!)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTapeEntry(q)}
                      title={t("desktop.removeFromTape")}
                      aria-label={t("desktop.removeFromTapeAria", { name: formatCommandParseName(t, rp) ?? q })}
                      className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      style={{ width: 20, height: 20, background: "var(--surface-inset)" }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ))}
                <div
                  className="flex items-center gap-[11px]"
                  style={{
                    padding: "10px 12px 10px 16px",
                    borderTop: "1.5px solid var(--border-strong)",
                    background: "var(--surface-raised)",
                  }}
                >
                  <span className="font-mono text-xs font-bold text-muted">Σ</span>
                  <span
                    className="flex-1 text-[11px] font-bold text-muted"
                    style={{ letterSpacing: 0.8 }}
                  >
                    {t("desktop.runningTotal", { count: tapeRows.length })}
                  </span>
                  <span
                    className="font-mono text-[13px] font-bold text-right"
                    style={{ width: 88, color: "var(--accent)" }}
                  >
                    {fsWeight(sumKg)} {fsWeightUnit(sumKg)}
                  </span>
                  <span
                    className="font-mono text-[13px] font-bold text-right"
                    style={{ width: 92, color: "var(--blue-strong)" }}
                  >
                    {sym} {fsMoney(sumAmount)}
                  </span>
                  {/* spacer mirroring the per-row × button keeps columns aligned */}
                  <span className="flex-shrink-0" style={{ width: 20 }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───────── right rail ───────── */}
        <div
          className="flex-shrink-0 overflow-y-auto"
          style={{
            width: 316,
            borderLeft: "1px solid var(--border-faint)",
            padding: "22px 22px 28px",
            background: "var(--surface-raised)",
          }}
        >
          <DeskBreakdown p={p} sym={sym} />
          {/* actions */}
          <div className="flex flex-col gap-2 mt-3.5">
            <DeskBtn dark={dark} primary onClick={onSave} disabled={!p.valid}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={dark ? "#161109" : "#fff"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              {t("suggest.saveCalculation")}
            </DeskBtn>
            <div className="flex gap-2">
              <DeskBtn dark={dark} small onClick={onCompareCurrent} disabled={!p.valid}>
                <DeskIcon name="compare" />
                {t("common.compare")}
              </DeskBtn>
              <DeskBtn dark={dark} small onClick={onCopy} disabled={!p.valid}>
                <DeskIcon name="copy" />
                {t("common.copy")}
              </DeskBtn>
              <DeskBtn dark={dark} small onClick={onAddToProject} disabled={!p.valid}>
                <DeskIcon name="plus" />
                {t("common.project")}
              </DeskBtn>
            </div>
          </div>
          {/* compare tray */}
          <div className="flex items-baseline justify-between mt-[26px] mb-2">
            <SectionLabel>
              {t("desktop.compareTray", { count: compareItems.length })}
            </SectionLabel>
            {compareItems.length > 0 && (
              <button
                type="button"
                onClick={gotoCompare}
                className="border-0 bg-transparent text-[11px] font-bold cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                {t("common.openArrow")}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {compareItems.map((item, i) => {
              const fam = famForInput(item.input);
              const r = item.result;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-[9px] rounded-xl"
                  style={{
                    padding: "8px 10px",
                    border: `1px solid ${i === 0 ? "var(--accent-border)" : "var(--border-faint)"}`,
                    background: "var(--surface)",
                  }}
                >
                  <span
                    className="flex flex-shrink-0"
                    style={{ color: i === 0 ? "var(--accent)" : "var(--muted)" }}
                  >
                    {fam && <CommandGlyph fam={fam} size={15} />}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadInput(item.input);
                      focusInputAtEnd();
                    }}
                    className="flex-1 min-w-0 border-0 bg-transparent p-0 cursor-pointer text-left"
                  >
                    <span className="block font-bold text-[12.5px] text-foreground truncate">
                      {item.normalizedProfile?.shortLabel ?? r.profileLabel}
                    </span>
                  </button>
                  <span className="font-mono text-[11px] font-semibold text-muted flex-shrink-0">
                    {fsWeight(r.totalWeightKg)} {fsWeightUnit(r.totalWeightKg)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveCompare(item.id)}
                    title={t("common.remove")}
                    aria-label={t("desktop.removeFromCompare")}
                    className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted"
                    style={{ width: 20, height: 20, background: "var(--surface-inset)" }}
                  >
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
            {compareItems.length === 0 && (
              <div
                className="font-mono text-[11px] text-muted-faint"
                style={{ padding: "2px 2px", lineHeight: 1.5 }}
              >
                {t("desktop.emptyCompareTray")}
                <br />
                profiles for a side-by-side
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── breakdown card ───────────────────────── */

function Line({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3" style={{ padding: "7.5px 0" }}>
      <span
        className="whitespace-nowrap"
        style={{
          fontSize: strong ? 12.5 : 12,
          fontWeight: strong ? 700 : 500,
          color: strong ? "var(--foreground)" : "var(--muted)",
        }}
      >
        {label}
      </span>
      <span
        className="whitespace-nowrap font-mono"
        style={{
          fontSize: strong ? 15 : 12.5,
          fontWeight: strong ? 700 : 600,
          color: accent ?? "var(--foreground)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DeskBreakdown({ p, sym }: { p: CommandParseResult; sym: string }) {
  const t = useTranslations("command");
  const r = p.calc?.result;

  return (
    <div
      className="rounded-2xl"
      style={{
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
        boxShadow: "var(--panel-shadow-soft)",
        padding: "16px 18px",
      }}
    >
      <div className="text-[10px] font-bold text-muted mb-2.5" style={{ letterSpacing: 1.2 }}>
        {t("desktop.breakdown")}
      </div>
      {p.valid && r && p.kgm != null ? (
        <>
          <div
            className="flex items-center gap-[11px]"
            style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-faint)" }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0 rounded-[11px] text-foreground"
              style={{ width: 40, height: 40, background: "var(--surface-inset)" }}
            >
              {p.alias && <CommandGlyph fam={p.alias.fam} size={23} />}
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[15px] text-foreground" style={{ letterSpacing: -0.2 }}>
                {formatCommandParseName(t, p)}
              </div>
              <div className="font-mono text-[10.5px] text-muted mt-px">
                {p.gradeLabel ?? r.gradeLabel} · {r.densityKgPerM3} kg/m³
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 4 }}>
            <Line label={t("result.massPerMetre")} value={`${p.kgm.toFixed(2)} kg/m`} />
            <Line label={t("result.length")} value={`${p.lengthM} m`} />
            <Line label={t("result.pieces")} value={`× ${p.realQty}`} />
            <div style={{ height: 1, background: "var(--border-faint)", margin: "2px 0" }} />
            <Line
              label={t("compare.weightPerPiece")}
              value={`${fsWeight(r.unitWeightKg)} ${fsWeightUnit(r.unitWeightKg)}`}
            />
            <Line
              label={t("result.totalWeight")}
              value={`${fsWeight(r.totalWeightKg)} ${fsWeightUnit(r.totalWeightKg)}`}
              strong
              accent="var(--accent)"
            />
            <div style={{ height: 1, background: "var(--border-faint)", margin: "2px 0" }} />
            <Line
              label={t("result.unitPrice")}
              value={`${sym} ${fsMoney(p.calc!.input.unitPrice)} /${r.priceUnit}`}
            />
            {p.pricing.wastePercent > 0 && (
              <Line
                label={t("result.waste", { percent: p.pricing.wastePercent })}
                value={`${sym} ${fsMoney(r.wasteAmount)}`}
              />
            )}
            {p.pricing.includeVat && (
              <Line
                label={t("result.vat", { percent: p.pricing.vatPercent })}
                value={`${sym} ${fsMoney(r.vatAmount)}`}
              />
            )}
            <Line
              label={t("result.totalCost")}
              value={`${sym} ${fsMoney(r.grandTotalAmount)}`}
              strong
              accent="var(--blue-strong)"
            />
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center gap-2 text-center"
          style={{ padding: "18px 0 14px" }}
        >
          <span className="text-muted-faint">
            <CommandGlyph fam="beam" size={26} />
          </span>
          <span className="font-mono text-[11.5px] text-muted-faint" style={{ lineHeight: 1.5 }}>
            {t("desktop.breakdownEmpty")}
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Compare view ───────────────────────── */

function DeltaChip({ pct }: { pct: number }) {
  const t = useTranslations("command");
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) {
    return (
      <span
        className="font-mono text-[10px] font-bold rounded-full"
        style={{ padding: "2px 7px", background: "var(--surface-inset)", color: "var(--muted)" }}
      >
        {t("compare.approxBase")}
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      className="font-mono text-[10px] font-bold rounded-full"
      style={{
        padding: "2px 7px",
        background: up ? "var(--accent-surface)" : "var(--green-surface)",
        color: up ? "var(--accent-text)" : "var(--green-text)",
      }}
    >
      {up ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

function DeskCompareView({
  dark,
  compareItems,
  onRemove,
  onClearAll,
  gotoCalc,
  onPick,
}: {
  dark: boolean;
  compareItems: CompareItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  gotoCalc: () => void;
  onPick: (input: CalculationInput) => void;
}) {
  const t = useTranslations("command");
  // One column per compare item; the first is the base every delta reads from.
  const cols = compareItems.map((item) => {
    const r = item.result;
    const lengthM = r.lengthMm / 1000;
    return {
      item,
      r,
      fam: famForInput(item.input),
      name: item.normalizedProfile?.shortLabel ?? r.profileLabel,
      lengthM,
      kgm: lengthM > 0 ? r.unitWeightKg / lengthM : null,
      costPerM:
        lengthM > 0 && r.quantity > 0
          ? r.grandTotalAmount / (lengthM * r.quantity)
          : null,
      sym: CURRENCY_SYMBOLS[r.currency] ?? "€",
    };
  });
  const base = cols[0];
  const maxKg = Math.max(1, ...cols.map((c) => c.r.totalWeightKg));
  const minKg = Math.min(...cols.map((c) => c.r.totalWeightKg));
  const minCost = Math.min(...cols.map((c) => c.r.grandTotalAmount));
  const multi = cols.length > 1;
  const kgVaries = multi && cols.some((c) => c.r.totalWeightKg !== minKg);
  const costVaries = multi && cols.some((c) => c.r.grandTotalAmount !== minCost);
  const hasSurface = cols.some((c) => c.r.surfaceAreaM2 != null);

  const labelCell: React.CSSProperties = {
    padding: "13px 16px",
    borderTop: "1px solid var(--border-faint)",
  };
  const valueCell = (i: number): React.CSSProperties => ({
    padding: "13px 16px",
    borderTop: "1px solid var(--border-faint)",
    borderLeft: "1px solid var(--border-faint)",
    background: i === 0 ? "var(--surface-raised)" : "transparent",
  });

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.compare")}
        subtitle={
          compareItems.length
            ? t("compare.subtitleCount", { count: compareItems.length })
            : t("compare.subtitleEmpty")
        }
        actions={
          <>
            {compareItems.length > 0 && (
              <DeskBtn dark={dark} small onClick={onClearAll}>
                <DeskIcon name="trash" />
                {t("common.clearAll")}
              </DeskBtn>
            )}
            <DeskBtn dark={dark} small primary onClick={gotoCalc}>
              <DeskIcon name="plus" stroke={dark ? "#161109" : "#fff"} />
              {t("compare.addFromCalculator")}
            </DeskBtn>
          </>
        }
      />
      {compareItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center" style={{ maxWidth: 360 }}>
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{
                width: 56,
                height: 56,
                background: "var(--accent-surface)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent)",
              }}
            >
              <DeskIcon name="compare" />
            </div>
            <div className="font-extrabold text-[17px] text-foreground mt-4">
              {t("compare.emptyTitle")}
            </div>
            <div className="text-[13px] text-muted mt-1.5" style={{ lineHeight: 1.5 }}>
              {t("compare.emptyBody")}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
          <div className="overflow-x-auto">
            <div
              className="rounded-[18px] overflow-hidden"
              style={{
                display: "grid",
                gridTemplateColumns: `140px repeat(${cols.length}, minmax(190px, 250px))`,
                width: "fit-content",
                minWidth: 0,
                border: "1px solid var(--border-faint)",
                background: "var(--surface)",
                boxShadow: "var(--panel-shadow-soft)",
              }}
            >
              {/* header row */}
              <div style={{ padding: "14px 16px" }}>
                <span className="text-[10px] font-bold text-muted" style={{ letterSpacing: 1.2 }}>
                  {t("compare.profile")}
                </span>
              </div>
              {cols.map((c, i) => (
                <div
                  key={c.item.id}
                  style={{ ...valueCell(i), borderTop: "none", padding: "14px 16px 12px" }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-foreground"
                      style={{ width: 34, height: 34, background: "var(--surface-inset)" }}
                    >
                      {c.fam && <CommandGlyph fam={c.fam} size={19} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-extrabold text-[14.5px] text-foreground truncate"
                        style={{ letterSpacing: -0.2 }}
                      >
                        {c.name}
                      </div>
                      <div className="font-mono text-[10.5px] text-muted mt-px">
                        {formatLengthM(c.lengthM)} m × {c.r.quantity}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(c.item.id)}
                      title={t("common.remove")}
                      aria-label={t("compare.removeAria", { name: c.name })}
                      className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted"
                      style={{ width: 22, height: 22, background: "var(--surface-inset)" }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="mt-2">
                    {i === 0 ? (
                      <span
                        className="text-[9px] font-extrabold rounded-full"
                        style={{
                          letterSpacing: 1,
                          padding: "3px 8px",
                          background: "var(--accent-surface)",
                          color: "var(--accent-text)",
                          border: "1px solid var(--accent-border)",
                        }}
                      >
                        {t("compare.base")}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-faint">
                        {t("compare.vsBase", { name: base.name })}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* total weight */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.totalWeight")}</span>
              </div>
              {cols.map((c, i) => {
                const pct = base.r.totalWeightKg > 0
                  ? ((c.r.totalWeightKg - base.r.totalWeightKg) / base.r.totalWeightKg) * 100
                  : 0;
                const best = kgVaries && c.r.totalWeightKg === minKg;
                return (
                  <div key={c.item.id} style={valueCell(i)}>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="font-extrabold text-[22px]"
                        style={{
                          letterSpacing: -0.8,
                          color: best ? "var(--green-text)" : "var(--foreground)",
                        }}
                      >
                        {fsWeight(c.r.totalWeightKg)}
                      </span>
                      <span className="font-bold text-xs" style={{ color: "var(--accent)" }}>
                        {fsWeightUnit(c.r.totalWeightKg)}
                      </span>
                      {i > 0 && (
                        <span className="ml-auto">
                          <DeltaChip pct={pct} />
                        </span>
                      )}
                    </div>
                    <div
                      className="rounded-[3px] overflow-hidden mt-2"
                      style={{ height: 5, background: "var(--surface-inset)" }}
                    >
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${Math.max(4, (c.r.totalWeightKg / maxKg) * 100)}%`,
                          background: i === 0 ? "var(--accent)" : "var(--blue-strong)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* total cost */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.totalCost")}</span>
              </div>
              {cols.map((c, i) => {
                const pct = base.r.grandTotalAmount > 0
                  ? ((c.r.grandTotalAmount - base.r.grandTotalAmount) / base.r.grandTotalAmount) * 100
                  : 0;
                const best = costVaries && c.r.grandTotalAmount === minCost;
                return (
                  <div key={c.item.id} style={valueCell(i)} className="flex items-baseline gap-1.5">
                    <span
                      className="font-mono text-[14px] font-bold"
                      style={{ color: best ? "var(--green-text)" : "var(--foreground)" }}
                    >
                      {c.sym} {fsMoney(c.r.grandTotalAmount)}
                    </span>
                    {i > 0 && (
                      <span className="ml-auto">
                        <DeltaChip pct={pct} />
                      </span>
                    )}
                  </div>
                );
              })}

              {/* weight / piece */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("compare.weightPerPiece")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {fsWeight(c.r.unitWeightKg)} {fsWeightUnit(c.r.unitWeightKg)}
                  </span>
                </div>
              ))}

              {/* mass per metre */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.massPerMetre")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {c.kgm != null ? `${c.kgm.toFixed(2)} kg/m` : "—"}
                  </span>
                </div>
              ))}

              {/* cost per metre */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("compare.costPerMetre")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {c.costPerM != null ? `${c.sym} ${fsMoney(c.costPerM)} /m` : "—"}
                  </span>
                </div>
              ))}

              {/* surface area (only when the dataset provides it) */}
              {hasSurface && (
                <>
                  <div style={labelCell}>
                    <span className="text-[11.5px] font-semibold text-muted">{t("compare.surfaceArea")}</span>
                  </div>
                  {cols.map((c, i) => (
                    <div key={c.item.id} style={valueCell(i)}>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {c.r.surfaceAreaM2 != null ? `${c.r.surfaceAreaM2.toFixed(2)} m²` : "—"}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* grade */}
              <div style={labelCell}>
                <span className="text-[11.5px] font-semibold text-muted">{t("result.grade")}</span>
              </div>
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {c.r.gradeLabel || "—"}
                  </span>
                </div>
              ))}

              {/* actions */}
              <div style={labelCell} />
              {cols.map((c, i) => (
                <div key={c.item.id} style={valueCell(i)}>
                  <button
                    type="button"
                    onClick={() => onPick(c.item.input)}
                    className="w-full rounded-[10px] cursor-pointer font-bold text-[11.5px] text-foreground-secondary"
                    style={{
                      padding: "8px 0",
                      border: "1px solid var(--border-faint)",
                      background: "var(--surface-raised)",
                    }}
                  >
                    {t("compare.openInCalculator")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLengthM(lengthM: number): string {
  return Number(lengthM.toFixed(2)).toString();
}

/* ───────────────────────── Saved view ───────────────────────── */

function DeskSavedView({
  saved,
  onPick,
  onAddCompare,
  onRemove,
}: {
  saved: SavedEntry[];
  onPick: (entry: SavedEntry) => void;
  onAddCompare: (entry: SavedEntry) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("command");
  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.saved")}
        subtitle={
          saved.length
            ? t("saved.subtitleCount", { count: saved.length })
            : t("saved.subtitleEmpty")
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
        {saved.length === 0 ? (
          <div className="font-mono text-[12.5px] text-muted-faint" style={{ padding: "16px 2px" }}>
            {t("saved.empty")}
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              maxWidth: 960,
            }}
          >
            {saved.map((entry) => {
              const fam = famForInput(entry.input);
              const r = entry.result;
              const entrySym = CURRENCY_SYMBOLS[r.currency] ?? "€";
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-2xl"
                  style={{
                    padding: "13px 15px",
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-[11px] text-foreground"
                    style={{ width: 40, height: 40, background: "var(--surface-inset)" }}
                  >
                    {fam && <CommandGlyph fam={fam} size={22} />}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(entry)}
                    className="flex-1 min-w-0 border-0 bg-transparent text-left cursor-pointer p-0"
                  >
                    <span className="block font-bold text-[14.5px] text-foreground truncate">
                      {entry.name}
                    </span>
                    <span className="block font-mono text-[11.5px] text-muted mt-0.5 truncate">
                      {fsWeight(r.totalWeightKg)} {fsWeightUnit(r.totalWeightKg)} · {entrySym}{" "}
                      {fsMoney(r.grandTotalAmount)} · ×{r.quantity}
                    </span>
                  </button>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <SavedAction title={t("saved.addToCompare")} onClick={() => onAddCompare(entry)}>
                      <DeskIcon name="compare" />
                    </SavedAction>
                    <SavedAction title={t("common.delete")} onClick={() => onRemove(entry.id)}>
                      <DeskIcon name="trash" />
                    </SavedAction>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex items-center justify-center rounded-[9px] cursor-pointer text-foreground-secondary"
      style={{
        width: 30,
        height: 30,
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── Projects view ───────────────────────── */

function DeskProjectsView({
  dark,
  projects,
  onPickItem,
  onCreateProject,
  onRemoveCalc,
}: {
  dark: boolean;
  projects: Project[];
  onPickItem: (input: CalculationInput) => void;
  onCreateProject: (name: string) => Project;
  onRemoveCalc: (projectId: string, calcId: string) => void;
}) {
  const t = useTranslations("command");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const submit = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateProject(trimmed);
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar
        title={t("nav.projects")}
        subtitle={projects.length ? t("projects.subtitleCount", { count: projects.length }) : t("projects.subtitleEmpty")}
        actions={
          <DeskBtn dark={dark} small primary onClick={() => setCreating((v) => !v)}>
            <DeskIcon name="plus" stroke={dark ? "#161109" : "#fff"} />
            {t("library.newProject")}
          </DeskBtn>
        }
      />
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
        {creating && (
          <div className="flex gap-2 mb-4" style={{ maxWidth: 420 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setCreating(false);
              }}
              autoFocus
              placeholder={t("library.newProjectName")}
              className="flex-1 h-10 rounded-xl border border-border-faint bg-[var(--surface)] px-3 text-sm text-foreground placeholder:text-muted-faint"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!newName.trim()}
              className="h-10 px-4 rounded-xl bg-[var(--accent)] text-white dark:text-[#161109] font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("common.create")}
            </button>
          </div>
        )}
        {projects.length === 0 && !creating ? (
          <div className="font-mono text-[12.5px] text-muted-faint" style={{ padding: "16px 2px" }}>
            {t("projects.empty")}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              maxWidth: 980,
            }}
          >
            {projects.map((project) => {
              const calcs = project.calculations;
              const totKg = calcs.reduce((s, c) => s + (c.result.totalWeightKg ?? 0), 0);
              const totAmount = calcs.reduce((s, c) => s + (c.result.grandTotalAmount ?? 0), 0);
              const currency = calcs[0]?.result.currency ?? ("EUR" as CurrencyCode);
              const projSym = CURRENCY_SYMBOLS[currency] ?? "€";
              return (
                <div
                  key={project.id}
                  className="rounded-[18px] overflow-hidden"
                  style={{
                    border: "1px solid var(--border-faint)",
                    background: "var(--surface)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  <div
                    style={{ padding: "15px 18px 13px", borderBottom: "1px solid var(--border-faint)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex" style={{ color: "var(--accent)" }}>
                        <DeskIcon name="projects" />
                      </span>
                      <span
                        className="flex-1 font-extrabold text-[15.5px] text-foreground truncate"
                        style={{ letterSpacing: -0.2 }}
                      >
                        {project.name}
                      </span>
                      <span className="font-mono text-[10.5px] text-muted">
                        {t("projects.itemCount", { count: calcs.length })}
                      </span>
                    </div>
                    <div className="flex gap-3.5 mt-2.5">
                      <span
                        className="font-mono text-[12.5px] font-bold"
                        style={{ color: "var(--accent)" }}
                      >
                        {fsWeight(totKg)} {fsWeightUnit(totKg)}
                      </span>
                      <span
                        className="font-mono text-[12.5px] font-bold"
                        style={{ color: "var(--blue-strong)" }}
                      >
                        {projSym} {fsMoney(totAmount)}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: "6px 8px 8px" }}>
                    {calcs.length === 0 ? (
                      <div className="font-mono text-[11px] text-muted-faint" style={{ padding: "8px 10px" }}>
                        {t("projects.emptyProjectHint")}
                      </div>
                    ) : (
                      calcs.map((calc) => {
                        const fam = famForInput(calc.input);
                        return (
                          <div
                            key={calc.id}
                            className="group flex items-center gap-2.5 rounded-[11px] hover:bg-[var(--surface-raised)]"
                            style={{ padding: "8px 10px" }}
                          >
                            <span className="flex flex-shrink-0 text-muted">
                              {fam && <CommandGlyph fam={fam} size={15} />}
                            </span>
                            <button
                              type="button"
                              onClick={() => onPickItem(calc.input)}
                              className="flex-1 min-w-0 border-0 bg-transparent p-0 cursor-pointer text-left font-semibold text-[13px] text-foreground truncate"
                            >
                              {calc.normalizedProfile?.shortLabel ?? calc.result.profileLabel}
                            </button>
                            <span className="font-mono text-[11px] text-muted flex-shrink-0">
                              ×{calc.result.quantity} · {fsWeight(calc.result.totalWeightKg)}{" "}
                              {fsWeightUnit(calc.result.totalWeightKg)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveCalc(project.id, calc.id)}
                              title={t("common.remove")}
                              aria-label={t("projects.removeFromProject")}
                              className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0 text-muted opacity-0 group-hover:opacity-100"
                              style={{ width: 20, height: 20, background: "var(--surface-inset)" }}
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Settings view ───────────────────────── */

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string; mono?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex rounded-[11px]"
      style={{ background: "var(--surface-inset)", padding: 3, gap: 2 }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-[9px] border-0 cursor-pointer font-bold text-[13px] ${
            o.mono ? "font-mono" : ""
          }`}
          style={{
            padding: "8px 0",
            background: value === o.v ? "var(--surface)" : "transparent",
            color: value === o.v ? "var(--foreground)" : "var(--muted)",
            boxShadow: value === o.v ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "13px 0" }}>
      <div className="text-[10px] font-bold text-muted mb-[9px]" style={{ letterSpacing: 1.2 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function DeskSettingsView({
  dark,
  sym,
  shared,
  onUpdateShared,
  weightAsMain,
  onSetWeightAsMain,
  defaultUnit,
  onSetDefaultUnit,
  onToggleTheme,
}: {
  dark: boolean;
  sym: string;
  shared: SharedCalcSettings;
  onUpdateShared: (patch: Partial<SharedCalcSettings>) => void;
  weightAsMain: boolean;
  onSetWeightAsMain: (value: boolean) => void;
  defaultUnit: LengthUnit;
  onSetDefaultUnit: (unit: LengthUnit) => void;
  onToggleTheme: () => void;
}) {
  const t = useTranslations("command");
  const numberBox = (
    value: number,
    onChange: (v: number) => void,
    suffix: string,
    prefix?: string,
  ) => (
    <div
      className="flex items-center gap-2.5 rounded-[13px]"
      style={{
        padding: "11px 14px",
        border: "1px solid var(--border-faint)",
        background: "var(--surface-raised)",
      }}
    >
      {prefix && (
        <span className="font-bold text-base" style={{ color: "var(--blue-strong)" }}>
          {prefix}
        </span>
      )}
      <input
        type="number"
        step={0.01}
        min={0}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 w-full border-0 bg-transparent outline-none font-mono text-[17px] font-bold text-foreground"
      />
      <span className="text-[13px] text-muted font-semibold">{suffix}</span>
    </div>
  );

  return (
    <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
      <DeskTopbar title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <div className="flex-1 overflow-y-auto" style={{ padding: "24px 32px 32px" }}>
        <div style={{ maxWidth: 520 }}>
          <div
            className="rounded-[18px]"
            style={{
              border: "1px solid var(--border-faint)",
              background: "var(--surface)",
              boxShadow: "var(--panel-shadow-soft)",
              padding: "10px 22px 16px",
            }}
          >
            <Field label={t("settings.defaultResultUpper")}>
              <Seg
                value={weightAsMain ? "weight" : "price"}
                onChange={(v) => onSetWeightAsMain(v === "weight")}
                options={[
                  { v: "weight", label: t("settings.weight") },
                  { v: "price", label: t("settings.price") },
                ]}
              />
            </Field>
            <Field label={t("settings.currencyUpper")}>
              <Seg
                value={shared.currency}
                onChange={(v) => onUpdateShared({ currency: v })}
                options={CURRENCIES.map((c) => ({
                  v: c,
                  label: `${CURRENCY_SYMBOLS[c] ?? ""} ${c}`.trim(),
                }))}
              />
            </Field>
            <Field label={t("settings.priceBasisUpper")}>
              <Seg
                value={shared.priceBasis}
                onChange={(v) =>
                  onUpdateShared({ priceBasis: v, priceUnit: BASIS_UNIT[v] })
                }
                options={[
                  { v: "weight" as PriceBasis, label: t("settings.weight") },
                  { v: "length" as PriceBasis, label: t("settings.length") },
                  { v: "piece" as PriceBasis, label: t("settings.piece") },
                ]}
              />
            </Field>
            <Field label={t("settings.unitPricePer", { unit: shared.priceUnit.toUpperCase() })}>
              {numberBox(
                shared.unitPrice,
                (v) => onUpdateShared({ unitPrice: v }),
                `/${shared.priceUnit}`,
                sym,
              )}
            </Field>
            <Field label={t("settings.wastePercentUpper")}>
              {numberBox(shared.wastePercent, (v) => onUpdateShared({ wastePercent: v }), "%")}
            </Field>
            <Field label={t("settings.vat")}>
              <div className="flex items-center gap-2.5">
                <div className="flex-1">
                  <Seg
                    value={shared.includeVat ? "on" : "off"}
                    onChange={(v) => onUpdateShared({ includeVat: v === "on" })}
                    options={[
                      { v: "off", label: t("common.off") },
                      { v: "on", label: t("common.on") },
                    ]}
                  />
                </div>
                {shared.includeVat && (
                  <div className="flex-1">
                    {numberBox(
                      shared.vatPercent,
                      (v) => onUpdateShared({ vatPercent: v }),
                      "%",
                    )}
                  </div>
                )}
              </div>
            </Field>
            <Field label={t("settings.defaultGradeUpper")}>
              <div className="flex gap-[7px] flex-wrap">
                {COMMAND_GRADES.map((g) => {
                  const active = shared.defaultGradeId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onUpdateShared({ defaultGradeId: g.id })}
                      className="rounded-[11px] cursor-pointer font-mono font-bold text-[13px]"
                      style={{
                        padding: "8px 14px",
                        border: `1px solid ${active ? "var(--accent-border)" : "var(--border-faint)"}`,
                        background: active ? "var(--accent-surface)" : "var(--surface-raised)",
                        color: active ? "var(--accent-text)" : "var(--foreground-secondary)",
                      }}
                    >
                      {g.label}
                      <span className="font-sans text-[10px] text-muted ml-1.5">{g.group}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t("settings.lengthUnitFallback")}>
              <Seg
                value={defaultUnit}
                onChange={onSetDefaultUnit}
                options={UNIT_OPTIONS.map((u) => ({ v: u, label: u, mono: true }))}
              />
            </Field>
            <Field label={t("settings.appearance")}>
              <Seg
                value={dark ? "dark" : "light"}
                onChange={(v) => {
                  if ((v === "dark") !== dark) onToggleTheme();
                }}
                options={[
                  { v: "light", label: t("settings.light") },
                  { v: "dark", label: t("settings.dark") },
                ]}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted mt-3 px-1">
            {t("settings.inlinePriceHint", { example: `@${shared.unitPrice}/${shared.priceUnit}` })}
          </p>
          <SyncSection />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── small pieces ───────────────────────── */

function DeskTokenChip({
  tok,
  kindClass,
  onEdit,
  onRemove,
}: {
  tok: string;
  kindClass: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("command");
  return (
    <span className={`inline-flex items-stretch font-mono text-base font-semibold rounded-lg ${kindClass}`}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("token.edit", { token: tok })}
        className="pl-2.5 pr-1 py-1 rounded-l-lg"
      >
        {tok}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("token.remove", { token: tok })}
        className="flex items-center justify-center w-6 rounded-r-lg text-[14px] leading-none hover:bg-[rgba(0,0,0,0.08)] dark:hover:bg-[rgba(255,255,255,0.12)]"
      >
        ×
      </button>
    </span>
  );
}

function DeskPricingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-[9.5px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-[var(--blue-surface)] text-[var(--blue-text)] whitespace-nowrap">
      {children}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function DeskIcon({ name, stroke }: { name: string; stroke?: string }) {
  const c = stroke ?? "currentColor";
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: c,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "calc":
      return (
        <svg {...common}>
          <path d="M4 17l6-5-6-5" />
          <path d="M13 19h7" />
        </svg>
      );
    case "saved":
      return (
        <svg {...common}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="18" rx="1.5" />
          <rect x="14" y="3" width="7" height="18" rx="1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common} width={15} height={15} strokeLinejoin={undefined}>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common} width={15} height={15}>
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common} width={15} height={15}>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} width={15} height={15} strokeWidth={2.2} strokeLinejoin={undefined}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common} width={14} height={14}>
          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        </svg>
      );
    default:
      return null;
  }
}
