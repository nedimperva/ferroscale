"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import type { TemplatePartDraft } from "@/hooks/useSaved";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";

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

  const headerSummary = useMemo(() => {
    return t("summary", { count: parts.length });
  }, [parts.length, t]);

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
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{t("title")}</h2>
                <p className="text-xs text-muted-faint">{headerSummary}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addCurrentPart}
                  className="rounded-lg border border-blue-border bg-blue-surface px-3 py-1.5 text-xs font-semibold text-blue-text transition-colors hover:bg-blue-surface/80"
                >
                  {t("addCurrent")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
                >
                  {t("close")}
                </button>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px,1fr]">
              <section className="border-b border-border p-4 lg:border-b-0 lg:border-r">
                <div className="grid gap-3">
                  <div className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
                    <span>{t("mode")}</span>
                    <div className="inline-flex rounded-lg border border-border bg-surface p-1">
                      <button
                        type="button"
                        onClick={() => setMode("new")}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
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
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          mode === "existing"
                            ? "bg-accent-surface text-accent"
                            : "text-foreground-secondary hover:bg-surface-raised"
                        }`}
                      >
                        {t("modeExisting")}
                      </button>
                    </div>
                  </div>

                  {mode === "existing" ? (
                    <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
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
                              {t("templateOption", { name: template.name, count: template.partCount })}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  ) : (
                    <>
                  <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
                    {t("name")}
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                      maxLength={80}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
                    {t("notes")}
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-blue-border"
                      maxLength={200}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-medium text-foreground-secondary">
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
              </section>

              <section className="min-h-0 overflow-y-auto p-4">
                <div className="grid gap-2">
                  {parts.map((part, index) => {
                    const profile = normalizeProfileSnapshot(part.input);
                    const gradeLabel = resolveGradeLabel(part.result.gradeLabel, tBase);
                    return (
                      <div key={part.id} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-inset text-foreground-secondary">
                              <ProfileIcon category={profile.iconKey} className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <input
                                type="text"
                                value={part.name}
                                onChange={(event) => updatePart(part.id, { name: event.target.value })}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-blue-border"
                                maxLength={80}
                              />
                              <p className="mt-1 text-xs text-muted-faint">
                                {profile.shortLabel}{gradeLabel ? ` • ${gradeLabel}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => movePart(part.id, -1)} className="rounded-md border border-border px-2 py-1 text-2xs text-foreground-secondary hover:bg-surface-raised">{t("up")}</button>
                            <button type="button" onClick={() => movePart(part.id, 1)} className="rounded-md border border-border px-2 py-1 text-2xs text-foreground-secondary hover:bg-surface-raised">{t("down")}</button>
                            <button type="button" onClick={() => removePart(part.id)} className="rounded-md border border-red-border px-2 py-1 text-2xs text-red-interactive hover:bg-red-surface">{t("remove")}</button>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-faint">
                          <span>{index + 1}/{parts.length}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

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
