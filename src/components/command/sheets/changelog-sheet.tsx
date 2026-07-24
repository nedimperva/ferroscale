"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  CHANGELOG,
  changelogSince,
  entryBullets,
  type ChangelogEntry,
} from "@/lib/changelog";
import { SheetShell } from "./sheet-shell";

interface ChangelogSheetProps {
  /** The version the user last acknowledged; drives which entries to show. */
  lastSeen: string | null;
  onClose: () => void;
}

export function ChangelogSheet({ lastSeen, onClose }: ChangelogSheetProps) {
  const t = useTranslations("command");
  const locale = useLocale();

  // Everything since the user last looked; falls back to the newest entry so a
  // manual open (or an unknown last-seen version) always shows something.
  const since = changelogSince(lastSeen);
  const entries = since.length > 0 ? since : [CHANGELOG[0]];

  return (
    <SheetShell title={t("sheets.whatsNew")} onClose={onClose}>
      <div className="space-y-5 pb-2">
        {entries.map((entry) => (
          <EntryBlock key={entry.version} entry={entry} locale={locale} t={t} />
        ))}
      </div>
    </SheetShell>
  );
}

function EntryBlock({
  entry,
  locale,
  t,
}: {
  entry: ChangelogEntry;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const { added, changed, fixed } = entryBullets(entry, locale);
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-sm font-bold text-foreground">v{entry.version}</h3>
        <span className="font-mono text-[11px] text-muted-faint">{entry.date}</span>
      </div>
      <BulletGroup label={t("whatsNew.added")} items={added} accent="var(--accent-text)" />
      <BulletGroup label={t("whatsNew.changed")} items={changed} accent="var(--blue-text)" />
      <BulletGroup label={t("whatsNew.fixed")} items={fixed} accent="var(--green-text)" />
    </section>
  );
}

function BulletGroup({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 last:mb-0">
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
        style={{ color: accent }}
      >
        {label}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-foreground-secondary">
            <span aria-hidden="true" className="text-muted-faint select-none">
              ·
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
