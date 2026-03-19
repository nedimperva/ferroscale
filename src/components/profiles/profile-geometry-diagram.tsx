"use client";

import { memo, type ReactNode } from "react";
import type { ProfileId } from "@/lib/datasets/types";

const vb = "0 0 48 48";
const sw = 1.65;

function SvgFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={vb}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/**
 * Cross-section style schematic per profile type (not to scale, for recognition only).
 */
export const ProfileGeometryDiagram = memo(function ProfileGeometryDiagram({
  profileId,
  className = "",
}: {
  profileId: ProfileId;
  className?: string;
}) {
  switch (profileId) {
    case "round_bar":
      return (
        <SvgFrame className={className}>
          <circle cx="24" cy="24" r="13" />
        </SvgFrame>
      );

    case "square_bar":
      return (
        <SvgFrame className={className}>
          <rect x="14" y="14" width="20" height="20" rx="1" />
        </SvgFrame>
      );

    case "flat_bar":
      return (
        <SvgFrame className={className}>
          <rect x="6" y="21" width="36" height="7" rx="0.5" />
        </SvgFrame>
      );

    case "angle":
      return (
        <SvgFrame className={className}>
          <path d="M10 10v28h28v-6H16V10H10z" />
        </SvgFrame>
      );

    case "sheet":
      return (
        <SvgFrame className={className}>
          <rect x="6" y="22.5" width="36" height="3" rx="0.5" />
        </SvgFrame>
      );

    case "plate":
      return (
        <SvgFrame className={className}>
          <rect x="6" y="19" width="36" height="10" rx="0.5" />
        </SvgFrame>
      );

    case "chequered_plate":
      return (
        <SvgFrame className={className}>
          <rect x="6" y="19" width="36" height="10" rx="0.5" />
          <path d="M10 22l4 4m6-4l4 4m6-4l4 4m-22 2l4 4m6-4l4 4" opacity={0.45} strokeWidth={1} />
        </SvgFrame>
      );

    case "expanded_metal":
      return (
        <SvgFrame className={className}>
          <path
            d="M8 16l6 6-6 6m8-16l6 6-6 6m8-16l6 6-6 6m8-16l6 6-6 6m-28 4l6 6-6 6m8-16l6 6-6 6m8-16l6 6-6 6"
            opacity={0.85}
            strokeWidth={1.2}
          />
        </SvgFrame>
      );

    case "corrugated_sheet":
      return (
        <SvgFrame className={className}>
          <path d="M6 28V22c3-2 3-4 6-4s3 2 6 4 3 4 6 4 3-2 6-4 3-4 6-4 3 2 6 4v6H6z" />
        </SvgFrame>
      );

    case "pipe":
      return (
        <SvgFrame className={className}>
          <circle cx="24" cy="24" r="12.5" />
          <circle cx="24" cy="24" r="7" />
        </SvgFrame>
      );

    case "rectangular_tube":
      return (
        <SvgFrame className={className}>
          <rect x="9" y="11" width="30" height="26" rx="1" />
          <rect x="15" y="17" width="18" height="14" rx="0.5" />
        </SvgFrame>
      );

    case "square_hollow":
      return (
        <SvgFrame className={className}>
          <rect x="10" y="10" width="28" height="28" rx="1" />
          <rect x="17" y="17" width="14" height="14" rx="0.5" />
        </SvgFrame>
      );

    case "channel_upn_en":
      return (
        <SvgFrame className={className}>
          {/* Tapered-flange channel (IPN-era style); open to the right */}
          <path d="M12 8v32M12 8h22M12 40h22M34 8L31 13M34 40L31 35" />
        </SvgFrame>
      );

    case "channel_upe_en":
      return (
        <SvgFrame className={className}>
          {/* Parallel flanges: short returns on the open side */}
          <path d="M12 8v32M12 8h20M32 8v5M12 40h20M32 40v-5" />
        </SvgFrame>
      );

    case "beam_ipe_en":
      return (
        <SvgFrame className={className}>
          <path d="M8 9h32M8 13h32M22 13v22M26 13v22M8 35h32M8 39h32" />
        </SvgFrame>
      );

    case "beam_ipn_en":
      return (
        <SvgFrame className={className}>
          <path d="M8 9h32M8 13h32M22 13v22M26 13v22M8 35h32M8 39h32" />
          <path d="M8 11l14 2M40 11L26 13M8 37l14-2M40 37l-14-2" opacity={0.55} strokeWidth={1.2} />
        </SvgFrame>
      );

    case "beam_hea_en":
      return (
        <SvgFrame className={className}>
          <path d="M6 9h36M6 14h36M20 14v20M28 14v20M6 34h36M6 39h36" />
        </SvgFrame>
      );

    case "beam_heb_en":
      return (
        <SvgFrame className={className}>
          <path d="M5 9h38M5 15h38M19 15v18M29 15v18M5 33h38M5 39h38" />
        </SvgFrame>
      );

    case "beam_hem_en":
      return (
        <SvgFrame className={className}>
          <path d="M4 8h40M4 16h40M18 16v16M30 16v16M4 32h40M4 40h40" />
        </SvgFrame>
      );

    case "tee_en":
      return (
        <SvgFrame className={className}>
          <path d="M6 10h36v6H6zM21 16v24h6V16" />
        </SvgFrame>
      );
  }
});
