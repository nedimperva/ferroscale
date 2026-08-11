"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SavedEntry } from "@/hooks/useSaved";
import { SheetShell } from "./sheet-shell";

const MAX_TAGS = 8;

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

/**
 * Name, notes and tags for one saved entry. Opened from a card's edit action
 * and from the "name it" action on the save toast — naming right after saving
 * is the only moment the user still has the context in their head.
 */
export function SavedEditSheet({
  entry,
  onClose,
  onSubmit,
}: {
  entry: SavedEntry;
  onClose: () => void;
  onSubmit: (patch: { name: string; notes: string; tags: string[] }) => void;
}) {
  const t = useTranslations("command");
  const [name, setName] = useState(entry.name);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [tags, setTags] = useState((entry.tags ?? []).join(", "));

  const submit = () => {
    onSubmit({ name, notes, tags: parseTags(tags) });
    onClose();
  };

  const fieldClass =
    "w-full rounded-xl border border-border-faint bg-[var(--surface-raised)] px-3 text-sm text-foreground placeholder:text-muted-faint outline-none focus-visible:border-[var(--accent-border)]";

  return (
    <SheetShell title={t("saved.editTitle")} onClose={onClose} maxWidth={520}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted uppercase" style={{ letterSpacing: 1 }}>
            {t("saved.fieldName")}
          </span>
          <input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={entry.result.profileLabel}
            className={`${fieldClass} h-11`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted uppercase" style={{ letterSpacing: 1 }}>
            {t("saved.fieldNotes")}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("saved.notesPlaceholder")}
            className={`${fieldClass} py-2.5 resize-none`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted uppercase" style={{ letterSpacing: 1 }}>
            {t("saved.fieldTags")}
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t("saved.tagsPlaceholder")}
            className={`${fieldClass} h-11 font-mono text-[13px]`}
          />
          <span className="text-[11px] text-muted-faint">{t("saved.tagsHint", { max: MAX_TAGS })}</span>
        </label>

        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={submit}
            className="flex-1 h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-sm"
          >
            {t("common.saveChanges")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border bg-[var(--surface)] font-semibold text-sm text-foreground"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}
