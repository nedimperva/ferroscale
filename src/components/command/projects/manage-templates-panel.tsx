"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { fsMoney, fsWeight, fsWeightUnit } from "@ferroscale/metal-core";
import {
  createItemFromCommand,
  type AssemblyTemplate,
  type AssemblyTemplateItem,
  type UseAssemblyTemplatesReturn,
} from "@/hooks/useAssemblyTemplates";
import { PROJECT_CATEGORIES, type ProjectAdditionalCost, type ProjectCategory } from "@/hooks/useProjects";
import { DeskIcon } from "../desktop/desk-atoms";

/** The slice of a template this panel edits. Kept as strings while typing. */
interface TemplateDraft {
  name: string;
  description: string;
  category: ProjectCategory | "";
  laborHours: string;
  items: AssemblyTemplateItem[];
  additionalCosts: ProjectAdditionalCost[];
}

interface PendingToast {
  text: string;
  undo?: () => void;
}

function toDraft(template: AssemblyTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    category: template.category ?? "",
    laborHours: template.laborHours !== undefined ? String(template.laborHours) : "",
    items: template.items,
    additionalCosts: template.additionalCosts ?? [],
  };
}

/**
 * What a draft becomes once saved. Kept next to `toDraft` because the two have
 * to round-trip: the unsaved-changes dot compares a draft against the draft of
 * what is stored, so save has to write exactly what the draft normalizes to.
 */
function fromDraft(draft: TemplateDraft): Partial<AssemblyTemplate> {
  const laborHours = Number(draft.laborHours);
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    category: draft.category || undefined,
    laborHours: Number.isFinite(laborHours) && laborHours > 0 ? laborHours : undefined,
    items: draft.items,
    additionalCosts: draft.additionalCosts.length > 0 ? draft.additionalCosts : undefined,
  };
}

function totalWeightKg(items: AssemblyTemplateItem[]): number {
  return items.reduce((sum, item) => sum + item.result.unitWeightKg * (item.quantity || 1), 0);
}

function pieceCount(items: AssemblyTemplateItem[]): number {
  return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RowAction({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-11 h-11 md:w-8 md:h-8 rounded-chip flex items-center justify-center flex-shrink-0 border border-[var(--border-faint)] bg-[var(--surface)] cursor-pointer transition-colors disabled:opacity-40"
      style={{ color: danger ? "var(--red-text)" : "var(--muted)" }}
    >
      {children}
    </button>
  );
}

export function ManageTemplatesPanel({ api }: { api: UseAssemblyTemplatesReturn }) {
  const t = useTranslations("command");
  const {
    templates,
    removedBuiltins,
    deleteTemplate,
    restoreTemplate,
    updateTemplate,
    duplicateTemplate,
    removeBuiltin,
    restoreBuiltin,
    restoreAllBuiltins,
  } = api;

  // Selection and its working copy are one piece of state, and the effective
  // selection is derived at render: when a template is deleted out from under
  // the editor, focus falls through to whatever is left with no effect to run.
  const [editing, setEditing] = useState<{ id: string; draft: TemplateDraft } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newCmd, setNewCmd] = useState("");
  const [cmdError, setCmdError] = useState(false);
  const [toast, setToast] = useState<PendingToast | null>(null);
  const [mobileStep, setMobileStep] = useState<"list" | "edit">("list");

  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((next: PendingToast) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const effective = useMemo(() => {
    const held = editing ? templates.find((tpl) => tpl.id === editing.id) : undefined;
    if (held && editing) return { template: held, draft: editing.draft };
    const fallback = templates[0];
    return fallback ? { template: fallback, draft: toDraft(fallback) } : null;
  }, [editing, templates]);

  const selected = effective?.template ?? null;
  const draft = effective?.draft ?? null;

  const selectTemplate = useCallback(
    (id: string, advance = false) => {
      const tpl = templates.find((entry) => entry.id === id);
      if (!tpl) return;
      setEditing({ id, draft: toDraft(tpl) });
      setConfirmId(null);
      setNewCmd("");
      setCmdError(false);
      if (advance) setMobileStep("edit");
    },
    [templates],
  );

  const isBuiltin = Boolean(selected?.isBuiltin);
  const dirty =
    !isBuiltin && Boolean(selected) && Boolean(draft) &&
    JSON.stringify(toDraft(selected as AssemblyTemplate)) !== JSON.stringify(draft);

  const patchDraft = useCallback(
    (patch: Partial<TemplateDraft>) => {
      if (!effective) return;
      setEditing({ id: effective.template.id, draft: { ...effective.draft, ...patch } });
    },
    [effective],
  );

  const handleSave = useCallback(() => {
    if (!selected || !draft || isBuiltin) return;
    const values = fromDraft(draft);
    if (!values.name) return;
    updateTemplate(selected.id, values);
    setEditing({ id: selected.id, draft: toDraft({ ...selected, ...values } as AssemblyTemplate) });
    showToast({ text: t("templates.templateSaved") });
  }, [selected, draft, isBuiltin, updateTemplate, showToast, t]);

  const handleDiscard = useCallback(() => {
    if (!selected) return;
    setEditing({ id: selected.id, draft: toDraft(selected) });
  }, [selected]);

  const handleAddCut = useCallback(() => {
    const raw = newCmd.trim();
    if (!raw || !draft) return;
    const item = createItemFromCommand(raw, 1);
    if (!item) {
      setCmdError(true);
      return;
    }
    setCmdError(false);
    setNewCmd("");
    patchDraft({ items: [...draft.items, item] });
  }, [newCmd, draft, patchDraft]);

  const handleDuplicate = useCallback(
    (id: string) => {
      const created = duplicateTemplate(id, t("templates.copyLabel"));
      if (!created) return;
      setEditing({ id: created.id, draft: toDraft(created) });
      setConfirmId(null);
      setMobileStep("edit");
      showToast({ text: t("templates.copyCreated") });
    },
    [duplicateTemplate, showToast, t],
  );

  const handleConfirmRemove = useCallback(
    (tpl: AssemblyTemplate) => {
      setConfirmId(null);
      if (tpl.isBuiltin) {
        removeBuiltin(tpl.id);
        showToast({ text: t("templates.standardRemoved"), undo: () => restoreBuiltin(tpl.id) });
        return;
      }
      deleteTemplate(tpl.id);
      showToast({ text: t("templates.templateDeleted"), undo: () => restoreTemplate(tpl.id) });
    },
    [removeBuiltin, deleteTemplate, restoreBuiltin, restoreTemplate, showToast, t],
  );

  const query = search.trim().toLowerCase();
  const matches = useCallback(
    (tpl: AssemblyTemplate) => {
      if (!query) return true;
      if (tpl.name.toLowerCase().includes(query)) return true;
      if (tpl.description?.toLowerCase().includes(query)) return true;
      return tpl.items.some(
        (item) =>
          item.normalizedProfile.shortLabel.toLowerCase().includes(query) ||
          item.result.profileLabel.toLowerCase().includes(query) ||
          item.note?.toLowerCase().includes(query),
      );
    },
    [query],
  );

  const customRows = templates.filter((tpl) => !tpl.isBuiltin && matches(tpl));
  const builtinRows = templates.filter((tpl) => tpl.isBuiltin && matches(tpl));

  const metaLine = (tpl: AssemblyTemplate) =>
    `${tpl.items.length} × ${fsWeight(totalWeightKg(tpl.items))} ${fsWeightUnit()} · ${(tpl.laborHours ?? 0).toFixed(2)} h`;

  const renderRow = (tpl: AssemblyTemplate) => {
    const isSelected = tpl.id === selected?.id;
    const confirming = confirmId === tpl.id;
    return (
      <div
        key={tpl.id}
        onClick={() => !confirming && selectTemplate(tpl.id, true)}
        className="p-3 rounded-button border transition-all cursor-pointer active:scale-[0.99]"
        style={{
          borderColor: confirming ? "var(--red-border)" : isSelected ? "var(--accent)" : "var(--border-faint)",
          background: confirming ? "var(--red-surface)" : isSelected ? "var(--accent-surface)" : "var(--surface-raised)",
        }}
      >
        {confirming ? (
          <div className="space-y-2.5">
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--red-text)" }}>
                {tpl.isBuiltin ? t("templates.removeStandardConfirm") : t("templates.deleteConfirm")}
              </p>
              <p className="text-[11px] text-muted mt-1 leading-relaxed">
                {tpl.name} — {tpl.isBuiltin ? t("templates.removeStandardHint") : t("templates.deleteConfirmHint")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmId(null);
                }}
                className="flex-1 h-11 md:h-8 rounded-chip text-xs font-bold border border-[var(--border-faint)] bg-[var(--surface)] text-foreground cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmRemove(tpl);
                }}
                className="flex-1 h-11 md:h-8 rounded-chip text-xs font-bold cursor-pointer"
                style={{ background: "var(--red-interactive)", color: "#ffffff" }}
              >
                {tpl.isBuiltin ? t("common.remove") : t("common.delete")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="flex-1 min-w-0 text-xs sm:text-[13px] font-bold text-foreground truncate">
                {tpl.name}
              </span>
              {tpl.isBuiltin ? (
                <RowAction label={t("templates.duplicateAction")} onClick={() => handleDuplicate(tpl.id)}>
                  <DeskIcon name="copy" />
                </RowAction>
              ) : (
                <RowAction label={t("common.edit")} onClick={() => selectTemplate(tpl.id, true)}>
                  <PencilIcon />
                </RowAction>
              )}
              <RowAction
                label={tpl.isBuiltin ? t("templates.removeStandardAction") : t("common.delete")}
                danger
                onClick={() => setConfirmId(tpl.id)}
              >
                <DeskIcon name="trash" />
              </RowAction>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {tpl.category && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface)] text-muted border border-[var(--border-faint)] flex-shrink-0">
                  {t(`projects.categories.${tpl.category}`)}
                </span>
              )}
              <span className="text-[11px] font-mono text-muted-faint truncate">{metaLine(tpl)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  const editorTotals = draft
    ? `${fsWeight(totalWeightKg(draft.items))} ${fsWeightUnit()} · ${(Number(draft.laborHours) || 0).toFixed(2)} h · € ${fsMoney(
        draft.additionalCosts.reduce((sum, cost) => sum + (Number(cost.amount) || 0), 0),
      )}`
    : "";

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Mobile step switcher — the same two-step shape the Browse tab uses */}
      <div className="flex md:hidden items-center border-b border-[var(--border-faint)] bg-[var(--surface-raised)] p-1.5 gap-1.5 flex-shrink-0">
        {(["list", "edit"] as const).map((step, index) => (
          <button
            key={step}
            type="button"
            onClick={() => setMobileStep(step)}
            className="flex-1 py-2 rounded-chip text-xs font-bold transition-all text-center"
            style={{
              background: mobileStep === step ? "var(--surface)" : "transparent",
              color: mobileStep === step ? "var(--foreground)" : "var(--muted)",
              boxShadow: mobileStep === step ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {index + 1}.{" "}
            {step === "list"
              ? t("templates.templatesStep")
              : isBuiltin
                ? t("templates.viewStep")
                : t("templates.editStep")}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* ── Library ─────────────────────────────────────────────── */}
        <div
          className={`md:col-span-5 flex-col border-r border-[var(--border-faint)] overflow-hidden bg-[var(--surface)] ${
            mobileStep === "edit" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-[var(--border-faint)] flex-shrink-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("templates.searchPlaceholder")}
              className="w-full h-11 md:h-9 px-3 rounded-chip text-xs bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground placeholder:text-muted-faint outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                {t("templates.yourTemplates")}
              </span>
              <span className="text-[11px] font-mono text-muted-faint">{customRows.length}</span>
            </div>

            {customRows.length === 0 && (
              <div className="p-4 rounded-button border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] text-center">
                <p className="text-xs font-bold text-foreground">{t("templates.noCustomTemplates")}</p>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  {t("templates.noCustomTemplatesHint")}
                </p>
              </div>
            )}
            {customRows.map(renderRow)}

            <div className="flex items-baseline justify-between gap-2 pt-3 mt-1 border-t border-[var(--border-faint)]">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                {t("templates.standardTemplates")}
              </span>
              <span className="text-[11px] font-mono text-muted-faint">{builtinRows.length}</span>
            </div>
            {builtinRows.map(renderRow)}

            {removedBuiltins.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-2 pt-3 mt-1 border-t border-[var(--border-faint)]">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                    {t("templates.removedStandards")}
                  </span>
                  <button
                    type="button"
                    onClick={restoreAllBuiltins}
                    className="text-[11px] font-bold cursor-pointer underline underline-offset-2"
                    style={{ color: "var(--accent-text)" }}
                  >
                    {t("templates.restoreAll")}
                  </button>
                </div>
                {removedBuiltins.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center gap-2 p-3 rounded-button border border-[var(--border-faint)] bg-[var(--surface-inset)]"
                  >
                    <span className="flex-1 min-w-0 text-xs font-semibold text-muted truncate">{tpl.name}</span>
                    <RowAction label={t("common.unarchive")} onClick={() => restoreBuiltin(tpl.id)}>
                      <RestoreIcon />
                    </RowAction>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Editor ──────────────────────────────────────────────── */}
        <div
          className={`md:col-span-7 flex-col overflow-hidden bg-[var(--surface-raised)] ${
            mobileStep === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {!selected || !draft ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-xs text-muted text-center max-w-[220px] leading-relaxed">
                {templates.length === 0 ? t("templates.noTemplatesAtAllHint") : t("templates.nothingSelected")}
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-sm sm:text-[15px] text-foreground truncate">
                      {isBuiltin ? selected.name : t("templates.editTemplate")}
                    </h3>
                    <p className="text-[11px] text-muted mt-0.5">
                      {isBuiltin ? t("templates.builtinStandard") : t("templates.editTemplateHint")}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border"
                    style={{
                      background: isBuiltin
                        ? "var(--surface-inset)"
                        : dirty
                          ? "var(--amber-surface)"
                          : "var(--green-surface)",
                      color: isBuiltin ? "var(--muted)" : dirty ? "var(--amber-text)" : "var(--green-text)",
                      borderColor: isBuiltin
                        ? "var(--border-faint)"
                        : dirty
                          ? "var(--amber-border)"
                          : "var(--green-border)",
                    }}
                  >
                    {isBuiltin
                      ? t("templates.statusReadOnly")
                      : dirty
                        ? t("templates.statusUnsaved")
                        : t("templates.statusSaved")}
                  </span>
                </div>

                {isBuiltin && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-button bg-[var(--accent-surface)] border border-[var(--accent-border)]">
                    <p className="flex-1 text-[11.5px] leading-relaxed" style={{ color: "var(--accent-text)" }}>
                      {t("templates.builtinBanner")}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(selected.id)}
                      className="flex-shrink-0 h-11 sm:h-9 px-4 rounded-chip text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] cursor-pointer"
                    >
                      {t("templates.duplicateToEdit")}
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">
                      {t("templates.templateNameLabel")}
                    </label>
                    <input
                      value={draft.name}
                      disabled={isBuiltin}
                      onChange={(e) => patchDraft({ name: e.target.value })}
                      className="w-full h-11 sm:h-10 px-3 rounded-button text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground font-semibold outline-none disabled:opacity-55"
                    />
                  </div>
                  <div className="sm:w-[176px] flex-shrink-0 space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">{t("projects.categoryLabel")}</label>
                    <select
                      value={draft.category}
                      disabled={isBuiltin}
                      onChange={(e) => patchDraft({ category: e.target.value as ProjectCategory })}
                      className="w-full h-11 sm:h-10 px-3 rounded-button text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground font-semibold cursor-pointer outline-none disabled:opacity-55"
                    >
                      {PROJECT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {t(`projects.categories.${cat}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    {t("templates.descriptionLabel")}
                  </label>
                  <textarea
                    value={draft.description}
                    disabled={isBuiltin}
                    rows={2}
                    onChange={(e) => patchDraft({ description: e.target.value })}
                    placeholder={t("templates.descriptionPlaceholder")}
                    className="w-full p-2.5 rounded-button text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground outline-none resize-none leading-relaxed disabled:opacity-55"
                  />
                </div>

                {/* Components */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      {t("templates.components")}
                    </span>
                    <span className="text-[11px] font-mono text-muted-faint">
                      {t("templates.componentsSummary", {
                        cuts: draft.items.length,
                        pieces: pieceCount(draft.items),
                      })}
                    </span>
                  </div>
                  <div className="rounded-button border border-[var(--border-faint)] bg-[var(--surface)] overflow-hidden">
                    <div className="divide-y divide-[var(--border-faint)]">
                      {draft.items.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2.5 px-2.5 py-2">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              aria-label="−"
                              disabled={isBuiltin}
                              onClick={() =>
                                patchDraft({
                                  items: draft.items.map((it, i) =>
                                    i === index ? { ...it, quantity: Math.max(1, (it.quantity || 1) - 1) } : it,
                                  ),
                                })
                              }
                              className="w-11 h-11 md:w-7 md:h-7 rounded-chip border border-[var(--border-faint)] bg-[var(--surface-raised)] text-foreground font-extrabold text-base leading-none flex items-center justify-center cursor-pointer disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-7 text-center font-mono text-xs font-semibold text-foreground">
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              aria-label="+"
                              disabled={isBuiltin}
                              onClick={() =>
                                patchDraft({
                                  items: draft.items.map((it, i) =>
                                    i === index
                                      ? { ...it, quantity: Math.min(10000, (it.quantity || 1) + 1) }
                                      : it,
                                  ),
                                })
                              }
                              className="w-11 h-11 md:w-7 md:h-7 rounded-chip border border-[var(--border-faint)] bg-[var(--surface-raised)] text-foreground font-extrabold text-base leading-none flex items-center justify-center cursor-pointer disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block font-mono text-[11.5px] text-foreground truncate">
                              {item.normalizedProfile.shortLabel}
                            </span>
                            {item.note && (
                              <span className="block text-[10.5px] text-muted truncate">{item.note}</span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-muted-faint flex-shrink-0 hidden sm:inline">
                            {fsWeight(item.result.unitWeightKg * (item.quantity || 1))} {fsWeightUnit()}
                          </span>
                          <RowAction
                            label={t("common.remove")}
                            danger
                            disabled={isBuiltin}
                            onClick={() =>
                              patchDraft({ items: draft.items.filter((_, i) => i !== index) })
                            }
                          >
                            <DeskIcon name="trash" />
                          </RowAction>
                        </div>
                      ))}
                    </div>
                    {!isBuiltin && (
                      <div className="flex items-center gap-2 p-2.5 bg-[var(--surface-raised)] border-t border-[var(--border-faint)]">
                        <input
                          value={newCmd}
                          onChange={(e) => {
                            setNewCmd(e.target.value);
                            setCmdError(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCut();
                            }
                          }}
                          placeholder={t("templates.addCutPlaceholder")}
                          className="flex-1 min-w-0 h-11 sm:h-9 px-3 rounded-chip font-mono text-xs bg-[var(--surface)] border text-foreground placeholder:text-muted-faint outline-none"
                          style={{ borderColor: cmdError ? "var(--red-border)" : "var(--border-faint)" }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCut}
                          className="flex-shrink-0 h-11 sm:h-9 px-3.5 rounded-chip text-xs font-bold border border-[var(--border-faint)] bg-[var(--surface)] text-foreground cursor-pointer flex items-center gap-1.5"
                        >
                          <DeskIcon name="plus" />
                          <span>{t("templates.addCut")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {cmdError && (
                    <p className="text-[11px] font-semibold" style={{ color: "var(--red-text)" }}>
                      {t("templates.addCutFailed")}
                    </p>
                  )}
                </div>

                {/* Labour + extra costs */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
                  <div className="sm:w-[176px] flex-shrink-0 space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">
                      {t("templates.laborHoursLabel")}
                    </label>
                    <input
                      value={draft.laborHours}
                      disabled={isBuiltin}
                      inputMode="decimal"
                      onChange={(e) => patchDraft({ laborHours: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-11 sm:h-10 px-3 rounded-button font-mono text-xs sm:text-sm bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground outline-none disabled:opacity-55"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <label className="text-xs font-bold text-foreground block">
                      {t("templates.extraCostsLabel")}
                    </label>
                    <div className="rounded-button border border-[var(--border-faint)] bg-[var(--surface)] overflow-hidden">
                      <div className="divide-y divide-[var(--border-faint)]">
                        {draft.additionalCosts.map((cost, index) => (
                          <div key={cost.id} className="flex items-center gap-2 px-2.5 py-1.5">
                            <input
                              value={cost.label}
                              disabled={isBuiltin}
                              onChange={(e) =>
                                patchDraft({
                                  additionalCosts: draft.additionalCosts.map((c, i) =>
                                    i === index ? { ...c, label: e.target.value } : c,
                                  ),
                                })
                              }
                              className="flex-1 min-w-0 h-9 px-2 rounded-chip text-xs bg-transparent border border-transparent text-foreground outline-none disabled:opacity-55"
                            />
                            <input
                              value={String(cost.amount)}
                              disabled={isBuiltin}
                              inputMode="decimal"
                              onChange={(e) =>
                                patchDraft({
                                  additionalCosts: draft.additionalCosts.map((c, i) =>
                                    i === index ? { ...c, amount: Number(e.target.value) || 0 } : c,
                                  ),
                                })
                              }
                              className="w-[76px] flex-shrink-0 h-9 px-2 rounded-chip font-mono text-xs text-right bg-[var(--surface-inset)] border border-[var(--border-faint)] text-foreground outline-none disabled:opacity-55"
                            />
                            <RowAction
                              label={t("common.remove")}
                              danger
                              disabled={isBuiltin}
                              onClick={() =>
                                patchDraft({
                                  additionalCosts: draft.additionalCosts.filter((_, i) => i !== index),
                                })
                              }
                            >
                              <DeskIcon name="close" />
                            </RowAction>
                          </div>
                        ))}
                      </div>
                      {!isBuiltin && (
                        <button
                          type="button"
                          onClick={() =>
                            patchDraft({
                              additionalCosts: [
                                ...draft.additionalCosts,
                                {
                                  id: crypto.randomUUID(),
                                  label: t("templates.newCostLabel"),
                                  amount: 0,
                                  category: "hardware",
                                },
                              ],
                            })
                          }
                          className="w-full flex items-center gap-1.5 px-2.5 py-2.5 text-[11.5px] font-bold text-muted bg-[var(--surface-raised)] border-t border-[var(--border-faint)] cursor-pointer"
                        >
                          <DeskIcon name="plus" />
                          <span>{t("templates.addCostLine")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {!isBuiltin && (
                <div className="flex-shrink-0 flex items-center gap-2.5 px-4 sm:px-5 py-3 border-t border-[var(--border-faint)] bg-[var(--surface-raised)]">
                  <span className="flex-1 min-w-0 font-mono text-[11px] text-muted-faint truncate hidden sm:block">
                    {editorTotals}
                  </span>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={!dirty}
                    className="flex-1 sm:flex-none h-11 sm:h-10 px-4 rounded-button text-xs font-bold border border-[var(--border-faint)] bg-[var(--surface)] text-foreground cursor-pointer disabled:opacity-40"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || !draft.name.trim()}
                    className="flex-1 sm:flex-none h-11 sm:h-10 px-5 rounded-button text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] cursor-pointer disabled:opacity-40"
                  >
                    {t("common.saveChanges")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="absolute left-0 right-0 bottom-20 flex justify-center px-4 pointer-events-none z-10">
          <div
            className="fs-rise flex items-center gap-2 px-[18px] py-[11px] rounded-2xl font-bold text-xs sm:text-sm pointer-events-auto"
            style={{ background: "var(--foreground)", color: "var(--background)", boxShadow: "0 12px 30px rgba(0,0,0,0.3)" }}
          >
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="ml-1.5 rounded-lg font-bold text-[12px] uppercase tracking-wide cursor-pointer"
                style={{ padding: "4px 10px", background: "var(--background)", color: "var(--foreground)" }}
              >
                {t("common.undo")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
