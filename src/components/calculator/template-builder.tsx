"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { TemplatePartDraft } from "@/hooks/useSaved";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { formatStaticNumber } from "@/components/ui/result-style";

interface TemplateBuilderProps {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  seedInput: CalculationInput | null;
  seedResult: CalculationResult | null;
  savedTemplates: Array<{ id: string; name: string; partCount: number }>;
  savedTemplateCount: number;
  onSave: (name: string, notes?: string, tags?: string[], parts?: TemplatePartDraft[]) => void;
  onAppendToTemplate: (templateId: string, parts: TemplatePartDraft[]) => void;
}

type DraftPart = TemplatePartDraft & { id: string };

function makeDraftPart(input: CalculationInput, result: CalculationResult): DraftPart {
  return {
    id: crypto.randomUUID(),
    name: result.profileLabel,
    input,
    result,
  };
}

export const TemplateBuilder = memo(function TemplateBuilder({
  open,
  onClose,
  defaultName,
  seedInput,
  seedResult,
  savedTemplates,
  savedTemplateCount,
  onSave,
  onAppendToTemplate,
}: TemplateBuilderProps) {
  const t = useTranslations("templateBuilder");
  const tBase = useTranslations();

  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [showAppend, setShowAppend] = useState(false);
  const [targetTemplateId, setTargetTemplateId] = useState(savedTemplates[0]?.id ?? "");
  const [parts, setParts] = useState<DraftPart[]>(() => {
    if (seedInput && seedResult) return [makeDraftPart(seedInput, seedResult)];
    return [];
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const canSave = parts.length > 0 && name.trim().length > 0;
  const canAppend = parts.length > 0 && targetTemplateId.length > 0;

  const addCurrentPart = () => {
    if (!seedInput || !seedResult) return;
    setParts((prev) => [...prev, makeDraftPart(seedInput, seedResult)]);
  };

  const removePart = (id: string) => {
    setParts((prev) => (prev.length <= 1 ? prev : prev.filter((part) => part.id !== id)));
  };

  const normalizedParts = useMemo(
    () =>
      parts.map((part) => ({
        name: part.name,
        input: part.input,
        result: part.result,
      })),
    [parts],
  );

  const handleSave = () => {
    if (!canSave) return;

    const normalizedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    onSave(
      name.trim(),
      notes.trim() || undefined,
      normalizedTags.length > 0 ? normalizedTags : undefined,
      normalizedParts,
    );
  };

  const handleAppend = () => {
    if (!canAppend) return;
    onAppendToTemplate(targetTemplateId, normalizedParts);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="tb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-85 bg-overlay"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="tb-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 340, mass: 0.8 }}
            className="fixed inset-x-3 top-[10%] z-86 mx-auto flex max-h-[80dvh] w-auto max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl sm:inset-x-4"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="truncate text-base font-semibold text-foreground">{t("title")}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary"
                aria-label={t("close")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </header>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto scroll-native">
              <div className="grid gap-4 p-4">
                {/* "Already in N templates" hint */}
                {savedTemplateCount > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-blue-border/50 bg-blue-surface/50 px-3 py-2 text-xs text-blue-text">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    <span>{t("alreadyInTemplates", { count: savedTemplateCount })}</span>
                  </div>
                )}

                {/* Form fields */}
                <label className="grid gap-1 text-xs font-medium text-foreground-secondary">
                  {t("name")}
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                    maxLength={80}
                    autoFocus
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium text-foreground-secondary">
                  {t("notes")}
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                    maxLength={200}
                  />
                </label>

                <label className="grid gap-1 text-xs font-medium text-foreground-secondary">
                  {t("tags")}
                  <input
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder={t("tagsPlaceholder")}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                    maxLength={140}
                  />
                </label>

                {/* Parts list */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground-secondary">
                      {t("partsLabel")} ({parts.length})
                    </p>
                    <button
                      type="button"
                      onClick={addCurrentPart}
                      disabled={!seedInput || !seedResult}
                      className="rounded-lg px-2 py-1 text-2xs font-semibold text-blue-text transition-colors hover:bg-blue-surface disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + {t("addCurrent")}
                    </button>
                  </div>

                  {parts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center text-xs text-muted">
                      {t("noParts")}
                    </div>
                  ) : (
                    <div className="grid gap-1.5">
                      {parts.map((part) => {
                        const profile = normalizeProfileSnapshot(part.input);
                        const gradeLabel = resolveGradeLabel(part.result.gradeLabel, tBase);
                        const currency = CURRENCY_SYMBOLS[part.result.currency];
                        return (
                          <div key={part.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-foreground-secondary">
                              <ProfileIcon category={profile.iconKey} className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-foreground">{part.name}</p>
                              <p className="truncate text-2xs text-muted-faint">
                                {profile.shortLabel}{gradeLabel ? ` · ${gradeLabel}` : ""}
                                <span className="ml-2 tabular-nums">{formatStaticNumber(part.result.totalWeightKg)} kg</span>
                                <span className="ml-2 tabular-nums">{formatStaticNumber(part.result.grandTotalAmount)} {currency}</span>
                              </p>
                            </div>
                            {parts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePart(part.id)}
                                className="rounded p-1 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive"
                                title={t("remove")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add to existing — secondary option */}
                {savedTemplates.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAppend((v) => !v)}
                      className="flex w-full items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-foreground-secondary"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${showAppend ? "rotate-90" : ""}`}>
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                      {t("addToExistingLabel")}
                    </button>

                    {showAppend && (
                      <div className="mt-2 flex items-end gap-2">
                        <label className="min-w-0 flex-1 grid gap-1 text-xs font-medium text-foreground-secondary">
                          {t("selectTemplate")}
                          <select
                            value={targetTemplateId}
                            onChange={(event) => setTargetTemplateId(event.target.value)}
                            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                          >
                            {savedTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} ({template.partCount})
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={handleAppend}
                          disabled={!canAppend}
                          className="shrink-0 rounded-lg border border-blue-border bg-blue-surface px-3 py-2 text-sm font-semibold text-blue-text transition-colors hover:bg-blue-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("append")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-lg border border-accent-border bg-accent-surface px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("publish")}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
