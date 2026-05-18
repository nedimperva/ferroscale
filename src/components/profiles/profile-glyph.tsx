import { memo } from "react";
import type { ProfileId } from "@/lib/datasets/types";
import { ProfileIcon } from "./profile-icon";
import { getProfileById } from "@/lib/datasets/profiles";

export type ProfileGlyphSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<ProfileGlyphSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

interface ProfileGlyphProps {
  profileId: ProfileId;
  size?: ProfileGlyphSize;
  className?: string;
}

/**
 * Per-profile cross-section glyph. Renders a unique SVG for every
 * ProfileId — beams have their own outline, channels their own,
 * round bar vs pipe vs square hollow are all distinguishable, etc.
 *
 * Use this wherever a single profile is shown (calc form picker grid,
 * result hero, project parts list, save-template row). Use the
 * category-level `<ProfileIcon>` for places that summarise a whole
 * category (the category pill row).
 */
export const ProfileGlyph = memo(function ProfileGlyph({
  profileId,
  size = "sm",
  className,
}: ProfileGlyphProps) {
  const cls = `${SIZE_CLASS[size]} ${className ?? ""}`.trim();
  return renderGlyph(profileId, cls);
});

function renderGlyph(profileId: ProfileId, className: string): React.ReactElement {
  switch (profileId) {
    /* ── Bars (solid cross-sections) ── */
    case "round_bar":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "square_bar":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
          <rect x="3" y="3" width="18" height="18" rx="1" />
        </svg>
      );
    case "flat_bar":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
          <rect x="2" y="7" width="20" height="10" rx="1" />
        </svg>
      );

    /* ── Tubes (hollow cross-sections) ── */
    case "pipe":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      );
    case "rectangular_tube":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="1" />
          <rect x="6" y="8" width="12" height="8" rx="0.5" />
        </svg>
      );
    case "square_hollow":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <rect x="7" y="7" width="10" height="10" rx="0.5" />
        </svg>
      );

    /* ── Plates & Sheets ── */
    case "sheet":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="9" width="20" height="6" rx="0.5" />
        </svg>
      );
    case "plate":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="10" rx="1" />
        </svg>
      );
    case "chequered_plate":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="10" rx="1" />
          <line x1="7" y1="7" x2="7" y2="17" strokeWidth="1" opacity="0.4" />
          <line x1="12" y1="7" x2="12" y2="17" strokeWidth="1" opacity="0.4" />
          <line x1="17" y1="7" x2="17" y2="17" strokeWidth="1" opacity="0.4" />
        </svg>
      );
    case "expanded_metal":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="10" rx="1" strokeWidth="2" />
          <path d="M5 9l3 2-3 2M9 9l3 2-3 2M13 9l3 2-3 2M17 9l3 2-3 2" strokeWidth="1" opacity="0.5" />
        </svg>
      );
    case "corrugated_sheet":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0 3 4 4.5 0" />
        </svg>
      );

    /* ── Structural — Beams ── */
    case "beam_ipe_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h12M6 21h12M12 3v18" />
        </svg>
      );
    case "beam_ipn_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 3h12M6 21h12M12 3v18" />
        </svg>
      );
    case "beam_hea_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 3h16M4 21h16M12 3v18" />
        </svg>
      );
    case "beam_heb_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 3h16M4 21h16M12 3v18" />
        </svg>
      );
    case "beam_hem_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M4 3h16M4 21h16M12 3v18" />
        </svg>
      );

    /* ── Structural — Channels ── */
    case "channel_upn_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h12M6 3v18M6 21h12" />
        </svg>
      );
    case "channel_upe_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h10M6 3v18M6 21h10" />
        </svg>
      );

    /* ── Structural — Angle ── */
    case "angle":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 4v16h16" />
        </svg>
      );

    /* ── Structural — Tee ── */
    case "tee_en":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16M12 4v17" />
        </svg>
      );

    default: {
      // Defensive fallback: derive category from the profile id and
      // render the category-level glyph so we never blank out.
      const profile = getProfileById(profileId);
      const category = profile?.category ?? "structural";
      return <ProfileIcon category={category} className={className} />;
    }
  }
}
