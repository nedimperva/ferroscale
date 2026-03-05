"use client";

import { useCallback, useState } from "react";

export type DrawerId = "history" | "settings" | "contact" | "compare" | "projects" | "quickCalc";

export interface UseDrawerStateReturn {
  openId: DrawerId | null;
  isOpen: (id: DrawerId) => boolean;
  open: (id: DrawerId) => void;
  close: () => void;
  toggle: (id: DrawerId) => void;
}

export function useDrawerState(): UseDrawerStateReturn {
  const [openId, setOpenId] = useState<DrawerId | null>(null);

  const isOpen = useCallback((id: DrawerId) => openId === id, [openId]);
  const open = useCallback((id: DrawerId) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);
  const toggle = useCallback(
    (id: DrawerId) => setOpenId((prev) => (prev === id ? null : id)),
    [],
  );

  return { openId, isOpen, open, close, toggle };
}
