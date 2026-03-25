"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { CalculationInput, CalculationResult } from "@/lib/calculator/types";
import { CURRENCY_SYMBOLS } from "@/lib/calculator/types";
import type { TemplatePartDraft } from "@/hooks/useSaved";
import { resolveGradeLabel } from "@/lib/calculator/grade-label";
import { ProfileIcon } from "@/components/profiles/profile-icon";
import { normalizeProfileSnapshot } from "@/lib/profiles/normalize";
import { formatStaticNumber } from "@/components/ui/result-style";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { BottomSheet } from "@/components/ui/bottom-sheet";

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

/* ------------------------------------------------------------------ */
/*  Inner content — shared between BottomSheet and desktop modal       */
/* ------------------------------------------------------------------ */

function TemplateBuilderContent({
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
  const [showAppend, setShowAppend] = useState(false);
  const [targetTemplateId, setTargetTemplateId] = useState(savedTemplates[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const [parts, setParts] = useState<DraftPart[]>(() => {
    if (seedInput && seedResult) return [makeDraftPart(seedInput, seedResult)];
    return [];
  });

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with prop on open
      setName(defaultName);
      setNotes("");
      setShowAppend(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultName]);

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
    onSave(name.trim(), notes.trim() || undefined, undefined, normalizedParts);
  };

  const handleAppend = () => {
    if (!canAppend) return;
    onAppendToTemplate(targetTemplateId, normalizedParts);
  };

  return (
    <>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        {savedTemplateCount > 0 && (
          <p className="mt-0.5 text-xs text-blue-text">
            {t("alreadyInTemplates", { count: savedTemplateCount })}
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-3 px-4 py-3">
        {/* Name */}
        <div>
          <label
            htmlFor="tb-name"
            className="mb-1.5 block text-xs font-medium text-foreground-secondary"
          >
            {t("name")}
          </label>
          <input
            ref={inputRef}
            id="tb-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
            maxLength={80}
          />
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="tb-notes"
            className="mb-1.5 block text-xs font-medium text-foreground-secondary"
          >
            {t("notes")}
            <span className="ml-1 text-muted-faint">{t("optional")}</span>
          </label>
          <textarea
            id="tb-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-faint outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
            maxLength={200}
          />
        </div>

        {/* Parts */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-secondary">
              {t("partsLabel")} ({parts.length})
            </span>
            <button
              type="button"
              onClick={addCurrentPart}
              disabled={!seedInput || !seedResult}
              className="rounded-lg px-2 py-1 text-2xs font-semibold text-blue-text transition-colors hover:bg-blue-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              + {t("addCurrent")}
            </button>
          </div>

          {parts.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border px-4 py-5 text-center text-xs text-muted-faint">
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

        {/* Append to existing template */}
        {savedTemplates.length > 0 && (
          <div className="border-t border-border-faint pt-3">
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
                <label htmlFor="tb-target" className="min-w-0 flex-1 grid gap-1 text-xs font-medium text-foreground-secondary">
                  {t("selectTemplate")}
                  <select
                    id="tb-target"
                    value={targetTemplateId}
                    onChange={(e) => setTargetTemplateId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
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
                  className="shrink-0 rounded-lg border border-blue-border bg-blue-surface px-3 py-2.5 text-sm font-semibold text-blue-text transition-colors hover:bg-blue-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("append")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-border-faint px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border-faint bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent-border bg-accent-surface px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          {t("publish")}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Outer shell — BottomSheet on mobile, centered modal on desktop     */
/* ------------------------------------------------------------------ */

export const TemplateBuilder = memo(function TemplateBuilder(props: TemplateBuilderProps) {
  const { open, onClose } = props;
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()} title="">
        <TemplateBuilderContent {...props} />
      </BottomSheet>
    );
  }

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
            key="tb-modal"
            role="dialog"
            aria-modal="true"
            aria-label=""
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            className="fixed left-1/2 top-[12vh] z-86 w-[90vw] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <TemplateBuilderContent {...props} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
