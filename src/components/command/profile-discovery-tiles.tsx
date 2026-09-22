"use client";

import { useTranslations } from "next-intl";
import { CommandGlyph } from "./command-glyph";
import type { CommandFamily } from "@ferroscale/metal-core";

interface ProfileOption {
  alias: string;
  name: string;
  labelKey?: string;
  query: string;
}

interface DiscoveryCategory {
  id: string;
  fam: CommandFamily;
  defaultQuery: string;
  labelKey: string;
  subKey: string;
  options: ProfileOption[];
}

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  {
    id: "beams",
    fam: "beam",
    defaultQuery: "hea",
    labelKey: "discovery.beams",
    subKey: "discovery.beamsSub",
    options: [
      { alias: "hea", name: "HEA", query: "hea" },
      { alias: "heb", name: "HEB", query: "heb" },
      { alias: "ipe", name: "IPE", query: "ipe" },
      { alias: "upn", name: "UPN", query: "upn" },
      { alias: "hem", name: "HEM", query: "hem" },
      { alias: "ipn", name: "IPN", query: "ipn" },
      { alias: "upe", name: "UPE", query: "upe" },
      { alias: "t", name: "T", query: "t" },
    ],
  },
  {
    id: "plates",
    fam: "panel",
    defaultQuery: "plt",
    labelKey: "discovery.plates",
    subKey: "discovery.platesSub",
    options: [
      { alias: "plt", name: "Plate", labelKey: "profiles.plate", query: "plt" },
      { alias: "chq", name: "Chequered", labelKey: "profiles.chequered", query: "chq" },
      { alias: "sht", name: "Sheet", labelKey: "profiles.sheet", query: "sht" },
      { alias: "xpm", name: "Expanded", labelKey: "profiles.expanded", query: "xpm" },
      { alias: "corr", name: "Corrugated", labelKey: "profiles.corrugated", query: "corr" },
    ],
  },
  {
    id: "tubes",
    fam: "shs",
    defaultQuery: "shs",
    labelKey: "discovery.tubes",
    subKey: "discovery.tubesSub",
    options: [
      { alias: "shs", name: "SHS", query: "shs" },
      { alias: "rhs", name: "RHS", query: "rhs" },
      { alias: "chs", name: "CHS", query: "chs" },
    ],
  },
  {
    id: "bars",
    fam: "flat",
    defaultQuery: "flt",
    labelKey: "discovery.bars",
    subKey: "discovery.barsSub",
    options: [
      { alias: "flt", name: "Flat", labelKey: "profiles.flat", query: "flt" },
      { alias: "rnd", name: "Round", labelKey: "profiles.round", query: "rnd" },
      { alias: "sq", name: "Square", labelKey: "profiles.squareBar", query: "sq" },
      { alias: "l", name: "Angle", labelKey: "profiles.angle", query: "l" },
    ],
  },
];

export function ProfileDiscoveryTiles({
  onSelectProfile,
  onTryDemo,
  compact,
  hideTitle,
}: {
  onSelectProfile: (prefix: string) => void;
  onTryDemo: () => void;
  compact?: boolean;
  /**
   * Drop the heading. On the phone the suggestion strip below already says
   * "pick a profile", and the same sentence twice on one screen is worse than
   * the tiles going unlabelled — they carry their own names.
   */
  hideTitle?: boolean;
}) {
  const t = useTranslations("command");

  return (
    <div className="flex flex-col gap-3 py-2" data-testid="profile-discovery">
      {!hideTitle && (
        <div className="flex items-center justify-between">
          <span className="fs-track-label text-[10px] font-bold uppercase text-muted">
            {t("discovery.title")}
          </span>
          <span className="font-mono text-[10px] text-muted-faint hidden sm:inline">
            {t("discovery.subtitle")}
          </span>
        </div>
      )}

      <div
        className={`grid gap-2.5 ${
          compact
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {DISCOVERY_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="flex flex-col justify-between p-3 bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border-faint)] hover:border-[var(--border)] transition-colors rounded-none"
            style={{ minHeight: compact ? 88 : 108 }}
          >
            {/* Primary card button: activates the default/front profile */}
            <button
              type="button"
              onClick={() => onSelectProfile(category.defaultQuery)}
              className="group flex flex-col items-start w-full text-left cursor-pointer bg-transparent border-0 p-0"
              aria-label={t(category.labelKey)}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="text-foreground-secondary group-hover:text-foreground transition-colors">
                  <CommandGlyph fam={category.fam} size={compact ? 18 : 20} />
                </span>
                <span
                  className="font-mono text-[10px] font-bold text-muted-faint group-hover:text-muted uppercase"
                  style={{ letterSpacing: 0.5 }}
                >
                  {category.defaultQuery.trim()}
                </span>
              </div>
              <span className="font-bold text-[13px] text-foreground leading-tight group-hover:text-foreground">
                {t(category.labelKey)}
              </span>
              <span className="font-mono text-[10px] text-muted-faint mt-0.5 truncate w-full">
                {t(category.subKey)}
              </span>
            </button>

            {/* Quick category option chips: provides instant 1-tap access to all shapes in this category */}
            <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-[var(--border-faint)]">
              {category.options.map((opt) => {
                const label = opt.labelKey ? t(opt.labelKey) : opt.name;
                return (
                  <button
                    key={opt.alias}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProfile(opt.query);
                    }}
                    title={label}
                    aria-label={`${opt.alias.toUpperCase()} · ${label}`}
                    className="inline-flex items-center justify-center min-w-[44px] min-h-[32px] px-1.5 py-0.5 font-mono text-[11px] font-bold bg-[var(--surface-inset)] hover:bg-[var(--action)] text-foreground-secondary hover:text-[var(--action-contrast)] border border-[var(--border-faint)] hover:border-[var(--action)] transition-colors cursor-pointer rounded-none uppercase"
                  >
                    {opt.alias}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-start sm:justify-end pt-1">
        <button
          type="button"
          onClick={onTryDemo}
          className="text-left font-mono text-[11px] text-muted hover:text-foreground cursor-pointer bg-transparent border-0 p-0 underline-offset-4 hover:underline transition-colors"
        >
          {t("discovery.tryDemo")}
        </button>
      </div>
    </div>
  );
}
