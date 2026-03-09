"use client";

import { useCallback, useEffect, useState } from "react";
import { loadArrayFromStorage, persistToStorage } from "@/lib/storage";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";

const PRESETS_KEY = "ferroscale-presets-v1";
const MAX_PRESETS = 50;

export interface DimensionPreset {
  id: string;
  profileId: ProfileId;
  label: string;
  manualDimensionsMm: Partial<Record<DimensionKey, number>>;
  selectedSizeId?: string;
  /** Saved piece length (raw value in whatever unit the user had active at save time).
   *  Only stored for plates_sheets profiles where length is as important as width/thickness. */
  lengthValue?: number;
  createdAt: number;
}

function generateId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface UsePresetsReturn {
  presets: DimensionPreset[];
  presetsForProfile: (profileId: ProfileId) => DimensionPreset[];
  addPreset: (preset: Omit<DimensionPreset, "id" | "createdAt">) => void;
  removePreset: (id: string) => void;
  renamePreset: (id: string, label: string) => void;
}

export function usePresets(): UsePresetsReturn {
  const [presets, setPresets] = useState<DimensionPreset[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount hydration from storage
    setPresets(loadArrayFromStorage<DimensionPreset>(PRESETS_KEY));
  }, []);

  const addPreset = useCallback(
    (preset: Omit<DimensionPreset, "id" | "createdAt">) => {
      setPresets((prev) => {
        const entry: DimensionPreset = {
          ...preset,
          id: generateId(),
          createdAt: Date.now(),
        };
        const next = [entry, ...prev].slice(0, MAX_PRESETS);
        persistToStorage(PRESETS_KEY, next);
        return next;
      });
    },
    [],
  );

  const removePreset = useCallback(
    (id: string) => {
      setPresets((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persistToStorage(PRESETS_KEY, next);
        return next;
      });
    },
    [],
  );

  const renamePreset = useCallback(
    (id: string, label: string) => {
      setPresets((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, label } : p));
        persistToStorage(PRESETS_KEY, next);
        return next;
      });
    },
    [],
  );

  const presetsForProfile = useCallback(
    (profileId: ProfileId) => presets.filter((p) => p.profileId === profileId),
    [presets],
  );

  return { presets, presetsForProfile, addPreset, removePreset, renamePreset };
}
