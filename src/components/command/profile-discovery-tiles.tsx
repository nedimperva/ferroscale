"use client";

import { useTranslations } from "next-intl";
import { CommandGlyph } from "./command-glyph";
import type { CommandFamily } from "@ferroscale/metal-core";

interface DiscoveryTile {
  id: string;
  fam: CommandFamily;
  query: string;
  labelKey: string;
  subKey: string;
}

const DISCOVERY_TILES: DiscoveryTile[] = [
  {
    id: "beams",
    fam: "beam",
    query: "hea ",
    labelKey: "discovery.beams",
    subKey: "discovery.beamsSub",
  },
  {
    id: "squareTubes",
    fam: "shs",
    query: "shs ",
    labelKey: "discovery.squareTubes",
    subKey: "discovery.squareTubesSub",
  },
  {
    id: "rectangularTubes",
    fam: "rhs",
    query: "rhs ",
    labelKey: "discovery.rectangularTubes",
    subKey: "discovery.rectangularTubesSub",
  },
  {
    id: "roundPipes",
    fam: "chs",
    query: "chs ",
    labelKey: "discovery.roundPipes",
    subKey: "discovery.roundPipesSub",
  },
  {
    id: "plates",
    fam: "panel",
    query: "plt ",
    labelKey: "discovery.plates",
    subKey: "discovery.platesSub",
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
        className={`grid gap-2 ${
          compact
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        }`}
      >
        {DISCOVERY_TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => onSelectProfile(tile.query)}
            className="group flex flex-col items-start p-3 text-left cursor-pointer transition-colors bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border-faint)] hover:border-[var(--border)] rounded-none"
            style={{ minHeight: compact ? 70 : 88 }}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-foreground-secondary group-hover:text-foreground transition-colors">
                <CommandGlyph fam={tile.fam} size={compact ? 20 : 22} />
              </span>
              <span
                className="font-mono text-[9px] font-bold text-muted-faint group-hover:text-muted uppercase"
                style={{ letterSpacing: 0.5 }}
              >
                {tile.query.trim()}
              </span>
            </div>
            <span className="font-bold text-[12.5px] text-foreground leading-tight">
              {t(tile.labelKey)}
            </span>
            <span className="font-mono text-[10px] text-muted-faint mt-0.5 truncate w-full">
              {t(tile.subKey)}
            </span>
          </button>
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
