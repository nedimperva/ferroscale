"use client";

import { memo, useEffect, useRef, useState } from "react";
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

/* ------------------------------------------------------------------ */
/*  Inner content                                                      */
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

  const [mode, setMode] = useState<"new" | "append">("new");
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [targetTemplateId, setTargetTemplateId] = useState(savedTemplates[0]?.id ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setNotes("");
      setMode("new");
      setTargetTemplateId(savedTemplates[0]?.id ?? "");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, defaultName, savedTemplates]);

  if (!seedInput || !seedResult) return null;

  const profile = normalizeProfileSnapshot(seedInput);
  const gradeLabel = resolveGradeLabel(seedResult.gradeLabel, tBase);
  const currency = CURRENCY_SYMBOLS[seedResult.currency];
  const part: TemplatePartDraft = { name: seedResult.profileLabel, input: seedInput, result: seedResult };

  const canSave = mode === "new" && name.trim().length > 0;
  const canAppend = mode === "append" && targetTemplateId.length > 0;

  const handleSave = () => {
    if (mode === "append" && canAppend) {
      onAppendToTemplate(targetTemplateId, [part]);
    } else if (canSave) {
      onSave(name.trim(), notes.trim() || undefined, undefined, [part]);
    }
  };

  return (
    <>
      {/* Part preview */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-inset text-foreground-secondary">
          <ProfileIcon category={profile.iconKey} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{seedResult.profileLabel}</p>
          <p className="truncate text-xs text-muted">
            {profile.shortLabel}{gradeLabel ? ` · ${gradeLabel}` : ""}
            <span className="mx-1.5">·</span>
            <span className="tabular-nums">{formatStaticNumber(seedResult.totalWeightKg)} kg</span>
            <span className="mx-1.5">·</span>
            <span className="tabular-nums">{formatStaticNumber(seedResult.grandTotalAmount)} {currency}</span>
          </p>
        </div>
      </div>

      {/* Mode toggle — only if templates exist */}
      {savedTemplates.length > 0 && (
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${
              mode === "new"
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            {t("title")}
          </button>
          <button
            type="button"
            onClick={() => setMode("append")}
            className={`flex-1 py-2.5 text-center text-xs font-semibold transition-colors ${
              mode === "append"
                ? "border-b-2 border-blue-text text-blue-text"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            {t("appendTab")}
          </button>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3 px-4 py-3">
        {mode === "new" ? (
          <>
            {savedTemplateCount > 0 && (
              <p className="text-xs text-blue-text">
                {t("alreadyInTemplates", { count: savedTemplateCount })}
              </p>
            )}

            <div>
              <label htmlFor="tb-name" className="mb-1.5 block text-xs font-medium text-foreground-secondary">
                {t("name")}
              </label>
              <input
                ref={inputRef}
                id="tb-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
                maxLength={80}
              />
            </div>

            <div>
              <label htmlFor="tb-notes" className="mb-1.5 block text-xs font-medium text-foreground-secondary">
                {t("notes")}
                <span className="ml-1 text-muted-faint">{t("optional")}</span>
              </label>
              <textarea
                id="tb-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
                maxLength={200}
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="tb-target" className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              {t("selectTemplate")}
            </label>
            <select
              id="tb-target"
              value={targetTemplateId}
              onChange={(e) => setTargetTemplateId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-blue-border focus:ring-2 focus:ring-blue-surface"
            >
              {savedTemplates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} ({tmpl.partCount} {t("partsLabel").toLowerCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-border-faint px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-border-faint bg-surface px-3 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border hover:bg-surface-raised"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={mode === "new" ? !canSave : !canAppend}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent-border bg-accent-surface px-3 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "new" ? t("publish") : t("append")}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Outer shell — BottomSheet on mobile, modal on desktop              */
/* ------------------------------------------------------------------ */

export const TemplateBuilder = memo(function TemplateBuilder(props: TemplateBuilderProps) {
  const { open, onClose } = props;
  const isMobile = useIsMobile();

  useDrawerBehavior(!isMobile && open, onClose);

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380, mass: 0.7 }}
            className="fixed left-1/2 top-[15vh] z-86 w-[90vw] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <TemplateBuilderContent {...props} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
