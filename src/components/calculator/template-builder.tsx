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
  onSave,
  onAppendToTemplate,
}: TemplateBuilderProps) {
  const t = useTranslations("templateBuilder");
  const tBase = useTranslations();

  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<"new" | "existing">("new");
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

  const canPublish =
    parts.length > 0 && (mode === "new" ? name.trim().length > 0 : targetTemplateId.length > 0);

  const addCurrentPart = () => {
    if (!seedInput || !seedResult) return;
    setParts((prev) => [...prev, makeDraftPart(seedInput, seedResult)]);
  };

  const movePart = (id: string, direction: -1 | 1) => {
    setParts((prev) => {
      const index = prev.findIndex((part) => part.id === id);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const removePart = (id: string) => {
    setParts((prev) => (prev.length <= 1 ? prev : prev.filter((part) => part.id !== id)));
  };

  const updatePart = (id: string, patch: Partial<DraftPart>) => {
    setParts((prev) => prev.map((part) => (part.id === id ? { ...part, ...patch } : part)));
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

  const handlePublish = () => {
    if (!canPublish) return;

    if (mode === "existing") {
      onAppendToTemplate(targetTemplateId, normalizedParts);
      return;
    }

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
            className="fixed inset-2 z-86 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl sm:inset-4"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{t("title")}</h2>
                <p className="text-xs text-muted-faint">{parts.length} {parts.length === 1 ? "part" : "parts"}</p>
              </div>
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
              <div className="grid gap-4 p-4 lg:grid-cols-[320px,1fr]">
                {/* Left: Form fields */}
                <div className="grid content-start gap-3">
                  {/* Mode toggle */}
                  <div className="inline-flex w-full rounded-lg border border-border bg-surface p-0.5">
                    <button
                      type="button"
                      onClick={() => setMode("new")}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        mode === "new"
                          ? "bg-accent-surface text-accent"
                          : "text-foreground-secondary hover:bg-surface-raised"
                      }`}
                    >
                      {t("modeNew")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("existing")}
                      disabled={savedTemplates.length === 0}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        mode === "existing"
                          ? "bg-accent-surface text-accent"
                          : "text-foreground-secondary hover:bg-surface-raised"
                      }`}
                    >
                      {t("modeExisting")}
                    </button>
                  </div>

                  {mode === "existing" ? (
                    <label className="grid gap-1 text-xs font-medium text-foreground-secondary">
                      {t("selectTemplate")}
                      <select
                        value={targetTemplateId}
                        onChange={(event) => setTargetTemplateId(event.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                        disabled={savedTemplates.length === 0}
                      >
                        {savedTemplates.length === 0 ? (
                          <option value="">{t("noTemplates")}</option>
                        ) : (
                          savedTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.partCount})
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label className="grid gap-1 text-xs font-medium text-foreground-secondary">
                        {t("name")}
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                          maxLength={80}
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
                    </>
                  )}
                </div>

                {/* Right: Parts list */}
                <div className="grid content-start gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground-secondary">Parts</p>
                    <button
                      type="button"
                      onClick={addCurrentPart}
                      disabled={!seedInput || !seedResult}
                      className="rounded-lg border border-blue-border bg-blue-surface px-2.5 py-1 text-2xs font-semibold text-blue-text transition-colors hover:bg-blue-surface/80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + {t("addCurrent")}
                    </button>
                  </div>

                  {parts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center text-xs text-muted">
                      No parts yet
                    </div>
                  ) : (
                    <div className="grid gap-1.5">
                      {parts.map((part, index) => {
                        const profile = normalizeProfileSnapshot(part.input);
                        const gradeLabel = resolveGradeLabel(part.result.gradeLabel, tBase);
                        const currency = CURRENCY_SYMBOLS[part.result.currency];
                        return (
                          <div key={part.id} className="rounded-lg border border-border bg-surface p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-inset text-foreground-secondary">
                                <ProfileIcon category={profile.iconKey} className="h-3.5 w-3.5" />
                              </span>

                              <div className="min-w-0 flex-1">
                                <input
                                  type="text"
                                  value={part.name}
                                  onChange={(event) => updatePart(part.id, { name: event.target.value })}
                                  className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold text-foreground outline-none hover:border-border focus:border-blue-border focus:bg-surface"
                                  maxLength={80}
                                />
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5">
                                <button type="button" onClick={() => movePart(part.id, -1)} className="rounded p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary" title={t("up")}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M9.47 4.22a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 1 1-1.06 1.06L10 5.81 6.03 9.78a.75.75 0 0 1-1.06-1.06l4.5-4.5Z" clipRule="evenodd" /></svg>
                                </button>
                                <button type="button" onClick={() => movePart(part.id, 1)} className="rounded p-1 text-muted-faint transition-colors hover:bg-surface-inset hover:text-foreground-secondary" title={t("down")}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M10.53 15.78a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06L10 14.19l3.97-3.97a.75.75 0 1 1 1.06 1.06l-4.5 4.5Z" clipRule="evenodd" /></svg>
                                </button>
                                <button type="button" onClick={() => removePart(part.id)} className="rounded p-1 text-muted-faint transition-colors hover:bg-red-surface hover:text-red-interactive" title={t("remove")}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </div>

                            <div className="mt-1 flex items-center gap-3 pl-9 text-2xs text-muted-faint">
                              <span>{profile.shortLabel}{gradeLabel ? ` · ${gradeLabel}` : ""}</span>
                              <span className="ml-auto tabular-nums">{formatStaticNumber(part.result.totalWeightKg)} kg</span>
                              <span className="tabular-nums">{formatStaticNumber(part.result.grandTotalAmount)} {currency}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                onClick={handlePublish}
                disabled={!canPublish}
                className="rounded-lg border border-accent-border bg-accent-surface px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mode === "existing" ? t("append") : t("publish")}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
