"use client";

import { useEffect } from "react";

/**
 * Shared behavior for all right-side drawers and overlay panels:
 * - Locks body scroll when open
 * - Calls onClose when Escape is pressed
 */
export function useDrawerBehavior(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
}
