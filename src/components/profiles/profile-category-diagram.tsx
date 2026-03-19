"use client";

import { memo } from "react";
import type { ProfileCategory } from "@/lib/datasets/types";

/**
 * Decorative schematic by profile category (not to scale). Improves scanability of the result header.
 */
export const ProfileCategoryDiagram = memo(function ProfileCategoryDiagram({
  category,
  className = "",
}: {
  category: ProfileCategory;
  className?: string;
}) {
  const stroke = "currentColor";
  const fill = "none";

  switch (category) {
    case "structural":
      return (
        <svg
          viewBox="0 0 48 48"
          className={className}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="7" y="9" width="34" height="9" rx="1" />
          <rect x="7" y="30" width="34" height="9" rx="1" />
          <line x1="24" y1="18" x2="24" y2="30" />
        </svg>
      );
    case "tubes":
      return (
        <svg
          viewBox="0 0 48 48"
          className={className}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.75}
          aria-hidden
        >
          <circle cx="24" cy="24" r="14" />
          <circle cx="24" cy="24" r="8" />
        </svg>
      );
    case "bars":
      return (
        <svg
          viewBox="0 0 48 48"
          className={className}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.75}
          aria-hidden
        >
          <circle cx="24" cy="24" r="13" />
        </svg>
      );
    case "plates_sheets":
      return (
        <svg
          viewBox="0 0 48 48"
          className={className}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.75}
          strokeLinecap="round"
          aria-hidden
        >
          <rect x="6" y="18" width="36" height="12" rx="1" />
          <path d="M10 22h28M10 26h28" opacity={0.35} strokeWidth={1} />
        </svg>
      );
  }
});
