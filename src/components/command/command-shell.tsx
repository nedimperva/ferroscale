"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "@/i18n/navigation";
import { cmdParse, cmdClassifyToken } from "@/lib/command/parser";
import { cmdSuggest, cmdApplyInsert } from "@/lib/command/suggest";
import { COMMAND_ALIAS_RE } from "@/lib/command/aliases";
import { CURRENCY_SYMBOLS, fsMoney, fsWeight, fsWeightUnit } from "@/lib/command/format";
import type {
  CommandParseResult,
  CommandSettings,
  CommandSuggestionItem,
  CommandTokenKind,
} from "@/lib/command/types";
import { CommandGlyph } from "./command-glyph";
import { CommandKeypad } from "./command-keypad";
import {
  CommandResultSheet,
  CommandSavedSheet,
  CommandSettingsSheet,
} from "./command-sheets";

const FRAME_W = 402;
const FRAME_H = 874;
const HERO_FONT_WEIGHT = 800;

const DEFAULT_SETTINGS: CommandSettings = {
  currency: "EUR",
  rate: 1.18,
  density: 7850,
  defaultGradeId: "steel-s235jr",
};

function loadSettings(): CommandSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem("ferroscale-command-settings");
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: CommandSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("ferroscale-command-settings", JSON.stringify(s));
  } catch {
    /* noop */
  }
}

function loadStrings(key: string, fallback: string[] = []): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : fallback;
  } catch {
    return fallback;
  }
}

function persistStrings(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

const STARTER_RECENTS = [
  "ipe200 12m s355",
  "shs40x40x3 6m x10",
  "chs60.3x3.2 3m x6 s235",
];

export function CommandShell() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const router = useRouter();

  const [settings, setSettingsState] = useState<CommandSettings>(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("hea120 6m x2 s235");
  const [mode, setMode] = useState<"weight" | "price">("weight");
  const [sheet, setSheet] = useState<null | "result" | "settings" | "saved">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>(STARTER_RECENTS);
  const [saved, setSaved] = useState<string[]>([]);
  const [scale, setScale] = useState(1);

  // Hydrate persisted state on mount. setState-in-effect is intentional here:
  // initial SSR/first-paint values must match defaults to avoid hydration
  // mismatches, then we apply localStorage once on the client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsState(loadSettings());
    setRecents(loadStrings("ferroscale-command-recents", STARTER_RECENTS));
    setSaved(loadStrings("ferroscale-command-saved", []));
  }, []);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);
  useEffect(() => {
    persistStrings("ferroscale-command-recents", recents);
  }, [recents]);
  useEffect(() => {
    persistStrings("ferroscale-command-saved", saved);
  }, [saved]);

  // Scale the fixed 402×874 frame to fit the viewport
  useEffect(() => {
    const fit = () => {
      const sH = (window.innerHeight - 32) / FRAME_H;
      const sW = (window.innerWidth - 32) / FRAME_W;
      setScale(Math.min(1, sH, sW));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const p: CommandParseResult = useMemo(
    () => cmdParse(query, settings),
    [query, settings],
  );
  const sug = useMemo(
    () => cmdSuggest(query, settings),
    [query, settings],
  );

  // Auto-close result sheet if query becomes invalid (derive, don't setState)
  const effectiveSheet = sheet === "result" && !p.valid ? null : sheet;

  const sym = CURRENCY_SYMBOLS[settings.currency] ?? "€";
  const isW = mode === "weight";

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1700);
  }, []);

  const doSave = useCallback(() => {
    if (!p.valid) {
      showToast("Add length to save");
      return;
    }
    setSaved((s) => [query, ...s.filter((x) => x !== query)].slice(0, 12));
    setRecents((r) => [query, ...r.filter((x) => x !== query)].slice(0, 8));
    showToast("Saved");
  }, [p.valid, query, showToast]);

  const newCalc = useCallback(() => {
    if (p.valid) {
      setRecents((r) => [query, ...r.filter((x) => x !== query)].slice(0, 8));
    }
    setQuery("");
  }, [p.valid, query]);

  const onSuggest = useCallback(
    (item: CommandSuggestionItem) => {
      if (item.kind === "save") {
        doSave();
        return;
      }
      setQuery((q) => cmdApplyInsert(q, item));
    },
    [doSave],
  );

  const onKey = useCallback((ch: string) => {
    setQuery((q) => q + ch);
  }, []);
  const onBack = useCallback(() => {
    setQuery((q) => q.slice(0, -1));
  }, []);
  const onEnter = useCallback(() => {
    doSave();
  }, [doSave]);

  const cycleTheme = useCallback(() => {
    setTheme(dark ? "light" : "dark");
  }, [dark, setTheme]);

  const heroVal = isW
    ? p.totalKg != null
      ? fsWeight(p.totalKg)
      : "—"
    : p.totalEur != null
      ? fsMoney(p.totalEur)
      : "—";

  const tokens = query.split(/(\s+)/).filter((s) => s.length);
  const kindBg: Record<CommandTokenKind, string> = {
    profile: "bg-[var(--accent-surface)] text-[var(--accent-text)]",
    len: "bg-[var(--blue-surface)] text-[var(--blue-text)]",
    qty: "bg-[var(--green-surface)] text-[var(--green-text)]",
    grade: "bg-[var(--surface-inset)] text-foreground-secondary",
    unknown: "bg-[var(--surface-inset)] text-muted",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[var(--background)] overflow-hidden"
      style={{ transition: "background 220ms ease" }}
    >
      <div
        style={{
          width: FRAME_W * scale,
          height: FRAME_H * scale,
        }}
      >
        <div
          className="relative bg-[var(--screen,var(--surface))] flex flex-col overflow-hidden text-foreground"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            borderRadius: scale < 1 ? 44 : 0,
            background: dark ? "#161109" : "#f4f0e7",
            boxShadow:
              scale < 1
                ? "0 30px 80px -20px rgba(0,0,0,0.4), 0 0 0 10px #0c0a06, 0 0 0 11px #2a2014"
                : "none",
          }}
        >
          {/* Safe-top spacer */}
          <div className="h-14 flex-shrink-0" />

          {/* TOP BAR */}
          <div className="flex items-center justify-between px-[18px] pt-1 pb-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded-[7px] flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <span
                  className="w-2.5 h-2.5"
                  style={{
                    background: dark ? "#161109" : "#fff",
                    borderRadius: 2.5,
                  }}
                />
              </div>
              <span className="text-[17px] font-extrabold tracking-tight">
                FerroScale
              </span>
            </div>
            <div className="flex gap-2">
              <IconBtn onClick={cycleTheme} ariaLabel="Toggle theme">
                {dark ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <circle cx="12" cy="12" r="4.5" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                  </svg>
                )}
              </IconBtn>
              <IconBtn onClick={() => setSheet("saved")} ariaLabel="Saved">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </IconBtn>
              <IconBtn onClick={() => setSheet("settings")} ariaLabel="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </IconBtn>
            </div>
          </div>

          {/* HERO */}
          <div className="px-[18px] pt-1.5">
            <div className="flex gap-1.5 mb-3">
              {(["weight", "price"] as const).map((m) => {
                const active = mode === m;
                const isWeight = m === "weight";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="flex-1 py-2 rounded-[11px] text-[11px] font-bold tracking-[1.4px]"
                    style={{
                      border: active
                        ? `1px solid ${
                            isWeight ? "var(--accent-border)" : "var(--blue-border)"
                          }`
                        : "1px solid var(--border-faint)",
                      background: active
                        ? isWeight
                          ? "var(--accent-surface)"
                          : "var(--blue-surface)"
                        : "transparent",
                      color: active
                        ? isWeight
                          ? "var(--accent-text)"
                          : "var(--blue-text)"
                        : "var(--muted)",
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!p.valid}
              onClick={() => p.valid && setSheet("result")}
              className="block w-full text-left p-0 m-0 bg-transparent border-0"
              style={{ cursor: p.valid ? "pointer" : "default" }}
            >
              <div className="flex items-baseline gap-2">
                {!isW && p.totalEur != null && (
                  <span
                    className="text-[34px] leading-none"
                    style={{
                      color: "var(--blue-strong)",
                      fontWeight: HERO_FONT_WEIGHT,
                    }}
                  >
                    {sym}
                  </span>
                )}
                <span
                  className="leading-[0.82] tracking-[-2.6px]"
                  style={{
                    fontSize: 68,
                    fontWeight: HERO_FONT_WEIGHT,
                    color: heroVal === "—" ? "var(--muted-faint)" : "var(--foreground)",
                  }}
                >
                  {heroVal}
                </span>
                {isW && p.totalKg != null && (
                  <span
                    className="text-[26px] font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    {fsWeightUnit(p.totalKg)}
                  </span>
                )}
                {p.valid && (
                  <span className="ml-auto self-center text-muted-faint">
                    <Chev />
                  </span>
                )}
              </div>
            </button>

            <div className="flex items-center gap-2.5 mt-3 pb-3.5 border-b border-border-faint">
              {p.valid && p.kgm != null ? (
                <span className="font-mono text-[12px] text-muted">
                  <span className="text-foreground-secondary">
                    {p.kgm.toFixed(2)}
                  </span>{" "}
                  kg/m ×{" "}
                  <span className="text-foreground-secondary">{p.lengthM}</span>{" "}
                  m × <span className="text-foreground-secondary">{p.realQty}</span>
                  {p.gradeLabel ? ` · ${p.gradeLabel}` : ""}
                </span>
              ) : (
                <span className="font-mono text-[12px] text-muted-faint">
                  {p.alias
                    ? p.hasSize
                      ? "add a length →"
                      : "add a size →"
                    : "start with a profile →"}
                </span>
              )}
              <span className="ml-auto flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: p.valid
                      ? "var(--green-text)"
                      : "var(--muted-faint)",
                  }}
                />
                <span
                  className="text-[10.5px] font-bold tracking-wider"
                  style={{
                    color: p.valid
                      ? "var(--green-text)"
                      : "var(--muted-faint)",
                  }}
                >
                  {p.valid ? "LIVE" : "WAITING"}
                </span>
              </span>
            </div>
          </div>

          {/* MIDDLE — recents (empty) or preview */}
          {query.trim() === "" ? (
            <RecentsList
              recents={recents}
              settings={settings}
              onPick={(q) => setQuery(q)}
            />
          ) : (
            <PreviewCard
              p={p}
              isWeight={isW}
              sym={sym}
              onOpen={() => p.valid && setSheet("result")}
            />
          )}

          <div className="flex-1 min-h-[6px]" />

          {/* SUGGESTION BAR */}
          <div className="pb-1.5">
            <div className="flex items-center gap-2 px-[18px] pb-1.5">
              <span className="text-[10px] font-bold tracking-[1.2px] text-muted uppercase">
                {sug.hint}
              </span>
              {query !== "" && (
                <button
                  type="button"
                  onClick={newCalc}
                  className="ml-auto bg-transparent border-0 text-muted text-[11px] font-bold tracking-wide"
                >
                  CLEAR
                </button>
              )}
            </div>
            <div
              className="flex gap-1.5 px-[18px] pb-0.5"
              style={{ overflowX: "auto" }}
            >
              {sug.items.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSuggest(it)}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-[12px] font-bold"
                  style={{
                    padding: it.sub ? "7px 12px" : "8px 13px",
                    border:
                      it.kind === "save"
                        ? "none"
                        : "1px solid var(--border-faint)",
                    background:
                      it.kind === "save"
                        ? "var(--accent)"
                        : "var(--surface)",
                    color:
                      it.kind === "save"
                        ? dark
                          ? "#161109"
                          : "#fff"
                        : "var(--foreground)",
                    boxShadow: "var(--panel-shadow-soft)",
                  }}
                >
                  {it.fam && (
                    <span style={{ color: "var(--accent)" }}>
                      <CommandGlyph fam={it.fam} size={17} />
                    </span>
                  )}
                  <span className="flex flex-col items-start leading-tight">
                    <span
                      className={`text-sm font-bold ${
                        it.kind === "size" || it.kind === "length" || it.kind === "qty"
                          ? "font-mono"
                          : ""
                      }`}
                    >
                      {it.label}
                    </span>
                    {it.sub && (
                      <span className="text-[10px] text-muted font-semibold">
                        {it.sub}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* QUERY LINE */}
          <div className="px-[14px] pb-2">
            <div
              className="flex items-center gap-1.5 flex-wrap rounded-[15px] px-3 py-2.5"
              style={{
                minHeight: 50,
                border: "1.5px solid var(--accent-border)",
                background: "var(--surface)",
                boxShadow: dark
                  ? "0 0 0 3px rgba(240,121,63,0.13)"
                  : "0 0 0 3px rgba(216,82,31,0.10)",
              }}
            >
              <span
                className="font-mono text-base font-bold mr-0.5"
                style={{ color: "var(--accent)" }}
              >
                ›
              </span>
              {tokens.length === 0 && (
                <span className="font-mono text-sm text-muted-faint">
                  type or tap a profile…
                </span>
              )}
              {tokens.map((tok, i) => {
                if (/^\s+$/.test(tok)) return <span key={i} style={{ width: 3 }} />;
                const k = cmdClassifyToken(tok);
                return (
                  <span
                    key={i}
                    className={`font-mono text-sm font-semibold px-2 py-0.5 rounded-md ${kindBg[k]}`}
                  >
                    {tok}
                  </span>
                );
              })}
              <span
                className="w-0.5 h-5 rounded-sm"
                style={{
                  background: "var(--accent)",
                  animation: "fsBlink 1s steps(1) infinite",
                }}
              />
            </div>
          </div>

          {/* KEYPAD */}
          <CommandKeypad
            onKey={onKey}
            onBack={onBack}
            onEnter={onEnter}
            valid={p.valid}
          />

          {/* SHEETS */}
          {effectiveSheet === "result" && p.valid && (
            <CommandResultSheet
              p={p}
              sym={sym}
              onClose={() => setSheet(null)}
              onSave={doSave}
              onCopy={() => {
                navigator.clipboard?.writeText(query).catch(() => {});
                setSheet(null);
                showToast("Copied to clipboard");
              }}
              onNew={() => {
                setSheet(null);
                newCalc();
              }}
            />
          )}
          {effectiveSheet === "settings" && (
            <CommandSettingsSheet
              settings={settings}
              setSettings={setSettingsState}
              onClose={() => setSheet(null)}
              onToggleTheme={cycleTheme}
              themeLabel={dark ? "Dark" : "Light"}
            />
          )}
          {effectiveSheet === "saved" && (
            <CommandSavedSheet
              settings={settings}
              saved={saved}
              recents={recents}
              onClose={() => setSheet(null)}
              onPick={(q) => {
                setQuery(q);
                setSheet(null);
              }}
            />
          )}

          {/* TOAST */}
          {toast && (
            <div className="absolute left-0 right-0 bottom-[120px] flex justify-center z-[60] pointer-events-none">
              <div
                className="flex items-center gap-2 px-[18px] py-[11px] rounded-2xl font-bold text-sm"
                style={{
                  background: "var(--foreground)",
                  color: "var(--background)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
                }}
              >
                <span
                  className="flex w-5 h-5 rounded-full items-center justify-center"
                  style={{ background: "var(--green-text)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark ? "#102a1e" : "#fff"} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {toast}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom-anchored secondary navigation for power-users */}
      <FloatingTabsNav
        onSaved={() => router.push("/saved")}
        onProjects={() => router.push("/projects")}
        onSettings={() => router.push("/settings")}
      />
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-[34px] h-[34px] rounded-[11px] border border-border-faint bg-[var(--surface)] flex items-center justify-center cursor-pointer text-foreground-secondary"
    >
      {children}
    </button>
  );
}

function Chev() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l4.5 5L1 11" />
    </svg>
  );
}

function RecentsList({
  recents,
  settings,
  onPick,
}: {
  recents: string[];
  settings: CommandSettings;
  onPick: (q: string) => void;
}) {
  return (
    <div className="mt-3.5 mx-[18px]">
      <div className="text-[10px] font-bold tracking-[1.2px] text-muted mb-2 uppercase">
        Recent
      </div>
      <div
        className="rounded-2xl border border-border-faint bg-[var(--surface)] overflow-hidden"
        style={{ boxShadow: "var(--panel-shadow-soft)" }}
      >
        {recents.slice(0, 4).map((q, i) => {
          const rp = cmdParse(q, settings);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(q)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left bg-transparent ${
                i > 0 ? "border-t border-border-faint" : ""
              }`}
            >
              <div className="w-[34px] h-[34px] rounded-[10px] bg-[var(--surface-inset)] flex items-center justify-center text-foreground flex-shrink-0">
                {rp.alias && <CommandGlyph fam={rp.alias.fam} size={19} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] text-foreground truncate">
                  {rp.name || q}
                </div>
                <div className="font-mono text-[11.5px] text-muted mt-0.5">
                  {rp.valid && rp.totalKg != null
                    ? `${fsWeight(rp.totalKg)} ${fsWeightUnit(rp.totalKg)} · ×${rp.realQty}${
                        rp.gradeLabel ? " · " + rp.gradeLabel : ""
                      }`
                    : q}
                </div>
              </div>
              <span className="text-muted-faint">
                <Chev />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipBadge({
  on,
  fam,
  children,
}: {
  on: boolean;
  fam?: import("@/lib/command/types").CommandFamily;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11.5px] font-semibold whitespace-nowrap"
      style={{
        background: on ? "var(--surface-inset)" : "transparent",
        color: on ? "var(--foreground-secondary)" : "var(--muted-faint)",
        border: on
          ? "1px solid transparent"
          : "1px dashed var(--border-strong)",
      }}
    >
      {fam && on ? (
        <span style={{ color: "var(--accent)" }}>
          <CommandGlyph fam={fam} size={14} />
        </span>
      ) : null}
      {children}
    </span>
  );
}

function PreviewCard({
  p,
  isWeight,
  sym,
  onOpen,
}: {
  p: CommandParseResult;
  isWeight: boolean;
  sym: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!p.valid}
      className="mx-[18px] mt-3.5 rounded-2xl border border-border-faint bg-[var(--surface)] p-3 text-left block w-[calc(100%-36px)]"
      style={{
        boxShadow: "var(--panel-shadow-soft)",
        cursor: p.valid ? "pointer" : "default",
      }}
    >
      <div className="flex gap-3.5">
        <div className="flex-1">
          <div className="text-[9.5px] font-bold tracking-wider text-muted uppercase">
            Per piece
          </div>
          <div
            className="font-mono text-[17px] font-bold mt-1"
            style={{
              color: p.valid ? "var(--foreground)" : "var(--muted-faint)",
            }}
          >
            {p.valid && p.perPieceKg != null
              ? `${fsWeight(p.perPieceKg)} ${fsWeightUnit(p.perPieceKg)}`
              : "—"}
          </div>
        </div>
        <div className="w-px bg-border-faint" />
        <div className="flex-1">
          <div className="text-[9.5px] font-bold tracking-wider text-muted uppercase">
            {isWeight ? "Total cost" : "Total weight"}
          </div>
          <div
            className="font-mono text-[17px] font-bold mt-1"
            style={{
              color: p.valid ? "var(--foreground)" : "var(--muted-faint)",
            }}
          >
            {p.valid && p.totalKg != null && p.totalEur != null
              ? isWeight
                ? `${sym} ${fsMoney(p.totalEur)}`
                : `${fsWeight(p.totalKg)} ${fsWeightUnit(p.totalKg)}`
              : "—"}
          </div>
        </div>
        {p.valid && (
          <span className="self-center text-muted-faint">
            <Chev />
          </span>
        )}
      </div>
      <div className="flex gap-1.5 mt-3 flex-wrap">
        <ChipBadge on={!!p.alias} fam={p.alias?.fam}>
          {p.alias ? p.alias.name : "profile"}
        </ChipBadge>
        <ChipBadge on={p.hasSize}>{p.hasSize ? p.size.replace(/x/g, "×") : "size"}</ChipBadge>
        <ChipBadge on={p.lengthM != null}>
          {p.lengthM != null ? `${p.lengthRaw}${p.lengthUnit}` : "length"}
        </ChipBadge>
        <ChipBadge on={p.qty != null}>{`× ${p.realQty}`}</ChipBadge>
        <ChipBadge on={!!p.gradeLabel}>{p.gradeLabel ?? "grade"}</ChipBadge>
      </div>
    </button>
  );
}

function FloatingTabsNav({
  onSaved,
  onProjects,
  onSettings,
}: {
  onSaved: () => void;
  onProjects: () => void;
  onSettings: () => void;
}) {
  return (
    <div
      className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-6 flex-col gap-2 z-10"
      aria-label="Other sections"
    >
      <NavBtn label="Saved" onClick={onSaved} />
      <NavBtn label="Projects" onClick={onProjects} />
      <NavBtn label="Settings" onClick={onSettings} />
    </div>
  );
}

function NavBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg border border-border-faint bg-[var(--surface)] text-xs font-semibold text-foreground-secondary hover:text-foreground hover:bg-[var(--surface-raised)] shadow-sm"
    >
      {label}
    </button>
  );
}
// suppress unused-import lint for COMMAND_ALIAS_RE (re-exported intentionally elsewhere)
void COMMAND_ALIAS_RE;
