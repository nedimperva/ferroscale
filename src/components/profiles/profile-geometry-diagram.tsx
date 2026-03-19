"use client";

import { memo } from "react";
import type { ProfileId } from "@/lib/datasets/types";

const VB = "0 0 48 48";
/** Primary outline — technical drawing weight */
const SW = 1.2;
/** Secondary (hatch, centerline) */
const SW2 = 0.85;
const fillMuted = { fill: "currentColor", fillOpacity: 0.055 } as const;
const strokeOnly = {
  stroke: "currentColor",
  strokeWidth: SW,
  strokeLinecap: "butt" as const,
  strokeLinejoin: "miter" as const,
  strokeMiterlimit: 2,
  fill: "none" as const,
};

/** Vertical symmetry axis — dashed, low contrast */
function CenterlineY({ x = 24, y1 = 8, y2 = 40 }: { x?: number; y1?: number; y2?: number }) {
  return (
    <line
      x1={x}
      y1={y1}
      x2={x}
      y2={y2}
      stroke="currentColor"
      strokeWidth={SW2}
      strokeDasharray="2 3"
      strokeOpacity={0.22}
    />
  );
}

/** Cross-section primitives in local 0–48 space (y-down). */
export function ProfileGeometryPrimitives({ profileId }: { profileId: ProfileId }) {
  switch (profileId) {
    case "round_bar":
      return (
        <>
          <circle cx="24" cy="24" r="12.5" {...fillMuted} {...strokeOnly} />
        </>
      );

    case "square_bar":
      return (
        <>
          <rect x="13.5" y="13.5" width="21" height="21" {...fillMuted} {...strokeOnly} />
        </>
      );

    case "flat_bar":
      return (
        <>
          <rect x="7" y="21.5" width="34" height="5" {...fillMuted} {...strokeOnly} />
        </>
      );

    case "angle":
      return (
        <>
          <path
            d="M10 10v26h26v-5H15V10H10z"
            {...fillMuted}
            {...strokeOnly}
          />
        </>
      );

    case "sheet":
      return (
        <>
          <rect x="7" y="23" width="34" height="2.5" {...fillMuted} {...strokeOnly} />
        </>
      );

    case "plate":
      return (
        <>
          <rect x="7" y="19.5" width="34" height="9" {...fillMuted} {...strokeOnly} />
        </>
      );

    case "chequered_plate":
      return (
        <>
          <rect x="7" y="19.5" width="34" height="9" {...fillMuted} {...strokeOnly} />
          <g stroke="currentColor" strokeWidth={SW2} strokeOpacity={0.32} strokeLinecap="square">
            <path d="M8 20.5h32M8 24h32M8 27.5h32" />
            <path d="M12 19.5v9M18 19.5v9M24 19.5v9M30 19.5v9M36 19.5v9" />
          </g>
        </>
      );

    case "expanded_metal":
      return (
        <>
          <rect x="9" y="12" width="30" height="24" rx="0.5" {...fillMuted} {...strokeOnly} />
          <g stroke="currentColor" strokeWidth={SW2} strokeLinecap="square" strokeOpacity={0.42}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <line
                key={i}
                x1={10 + i * 4}
                y1={14}
                x2={18 + i * 4}
                y2={34}
              />
            ))}
          </g>
        </>
      );

    case "corrugated_sheet":
      return (
        <>
          <path
            d="M7 31V26c2.4-1.5 2.4-3.2 4.8-3.2s2.4 1.7 4.8 3.2 2.4 3.2 4.8 3.2 2.4-1.7 4.8-3.2 2.4-3.2 4.8-3.2 2.4 1.7 4.8 3.2 2.4 3.2 4.8 3.2 2.4-1.7 4.8-3.2 2.4-3.2 4.8-3.2 2.4 1.7 4.8 3.2V31H7z"
            {...fillMuted}
            {...strokeOnly}
          />
        </>
      );

    case "pipe":
      return (
        <>
          <circle cx="24" cy="24" r="12.5" {...fillMuted} {...strokeOnly} />
          <circle cx="24" cy="24" r="7.5" {...strokeOnly} />
        </>
      );

    case "rectangular_tube":
      return (
        <>
          <rect x="9.5" y="11.5" width="29" height="25" {...fillMuted} {...strokeOnly} />
          <rect x="15.5" y="17.5" width="17" height="13" {...strokeOnly} />
        </>
      );

    case "square_hollow":
      return (
        <>
          <rect x="10.5" y="10.5" width="27" height="27" {...fillMuted} {...strokeOnly} />
          <rect x="17.5" y="17.5" width="13" height="13" {...strokeOnly} />
        </>
      );

    case "channel_upn_en":
      return (
        <>
          <path
            d="M11 8v32M11 8h21.5M11 40h21.5M32.5 8l-2.5 4.5M32.5 40l-2.5-4.5"
            {...strokeOnly}
          />
        </>
      );

    case "channel_upe_en":
      return (
        <>
          <path
            d="M11 8v32M11 8h19.5M30.5 8v4.5M11 40h19.5M30.5 40v-4.5"
            {...strokeOnly}
          />
        </>
      );

    case "beam_ipe_en": {
      /* Double-symmetric I: web 22–26, flanges 9–39, tf/bf 3px */
      const p = "M9 9L39 9 39 12 26 12 26 36 39 36 39 39 9 39 9 36 22 36 22 12 9 12Z";
      return (
        <>
          <path d={p} {...fillMuted} {...strokeOnly} />
          <CenterlineY x={24} y1={10} y2={38} />
        </>
      );
    }

    case "beam_ipn_en": {
      const p = "M9 9L39 9 39 12 26 12 26 36 39 36 39 39 9 39 9 36 22 36 22 12 9 12Z";
      return (
        <>
          <path d={p} {...fillMuted} {...strokeOnly} />
          <CenterlineY x={24} y1={10} y2={38} />
          <path
            d="M9 10.5L17 11.75M39 10.5L31 11.75M9 37.5L17 36.25M39 37.5L31 36.25"
            stroke="currentColor"
            strokeWidth={SW2}
            strokeOpacity={0.38}
            fill="none"
          />
        </>
      );
    }

    case "beam_hea_en": {
      const p = "M7 8.5L41 8.5 41 12 25 12 25 36 41 36 41 39.5 7 39.5 7 36 21 36 21 12 7 12Z";
      return (
        <>
          <path d={p} {...fillMuted} {...strokeOnly} />
          <CenterlineY x={24} y1={9.5} y2={38.5} />
        </>
      );
    }

    case "beam_heb_en": {
      const p = "M6 8.5L42 8.5 42 12.5 25 12.5 25 35.5 42 35.5 42 39.5 6 39.5 6 35.5 21 35.5 21 12.5 6 12.5Z";
      return (
        <>
          <path d={p} {...fillMuted} {...strokeOnly} />
          <CenterlineY x={24} y1={9.5} y2={38.5} />
        </>
      );
    }

    case "beam_hem_en": {
      const p = "M5 8L43 8 43 12.5 25 12.5 25 35.5 43 35.5 43 40 5 40 5 35.5 21 35.5 21 12.5 5 12.5Z";
      return (
        <>
          <path d={p} {...fillMuted} {...strokeOnly} />
          <CenterlineY x={24} y1={9} y2={39} />
        </>
      );
    }

    case "tee_en": {
      const p = "M7 9.5L41 9.5 41 14.5 26.5 14.5 26.5 38 21.5 38 21.5 14.5 7 14.5 7 9.5Z";
      return (
        <>
          <path d={p} {...fillMuted} {...strokeOnly} />
          <CenterlineY x={24} y1={14.5} y2={38} />
        </>
      );
    }
  }
}

export const ProfileGeometryDiagram = memo(function ProfileGeometryDiagram({
  profileId,
  className = "",
}: {
  profileId: ProfileId;
  className?: string;
}) {
  return (
    <svg viewBox={VB} className={className} aria-hidden>
      <ProfileGeometryPrimitives profileId={profileId} />
    </svg>
  );
});
