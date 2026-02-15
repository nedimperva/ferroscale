import { memo } from "react";
import type { ProfileCategory } from "@/lib/datasets/types";

interface ProfileIconProps {
  category: ProfileCategory;
  className?: string;
}

export const ProfileIcon = memo(function ProfileIcon({ category, className = "h-3.5 w-3.5" }: ProfileIconProps) {
  if (category === "tubes") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
        <circle cx="10" cy="10" r="6.5" />
        <circle cx="10" cy="10" r="3" />
      </svg>
    );
  }

  if (category === "plates_sheets") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
        <rect x="2.5" y="6" width="15" height="8" rx="1.5" />
        <path d="M4.5 9.5h11" />
      </svg>
    );
  }

  if (category === "structural") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
        <path d="M4 3.5h12" />
        <path d="M4 16.5h12" />
        <path d="M7 3.5v13" />
        <path d="M13 3.5v13" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="4" y="4" width="12" height="12" rx="2" />
    </svg>
  );
});
