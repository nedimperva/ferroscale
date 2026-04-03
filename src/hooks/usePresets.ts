"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DimensionKey, ProfileId } from "@/lib/datasets/types";
import {
  isActiveSyncEntity,
  loadPresets,
  markEntityDeleted,
  persistPresets,
} from "@/lib/sync/collections";

const MAX_PRESETS = 50;

export interface DimensionPreset {
  id: string;
  profileId: ProfileId;
  label: string;
  manualDimensionsMm: Partial<Record<DimensionKey, number>>;
  selectedSizeId?: string;
  lengthValue?: number;
  createdAt: number;
  updatedAt: string;
  deletedAt?: string;
}

function generateId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface UsePresetsReturn {
  presets: DimensionPreset[];
  presetsForProfile: (profileId: ProfileId) => DimensionPreset[];
  addPreset: (preset: Omit<DimensionPreset, "id" | "createdAt" | "updatedAt" | "deletedAt">) => void;
  removePreset: (id: string) => void;
  renamePreset: (id: string, label: string) => void;
}

export function usePresets(): UsePresetsReturn {
  const [allPresets, setAllPresets] = useState<DimensionPreset[]>([]);

  useEffect(() => {
    setAllPresets(loadPresets()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const persist = useCallback((updater: React.SetStateAction<DimensionPreset[]>) => {
    setAllPresets((previous) => {
      const next = typeof updater === "function"
        ? (updater as (prev: DimensionPreset[]) => DimensionPreset[])(previous)
        : updater;
      persistPresets(next);
      return next;
    });
  }, []);

  const presets = useMemo(
    () => allPresets.filter((preset) => isActiveSyncEntity(preset)),
    [allPresets],
  );

  const addPreset = useCallback(
    (preset: Omit<DimensionPreset, "id" | "createdAt" | "updatedAt" | "deletedAt">) => {
      persist((previous) => {
        const timestamp = new Date().toISOString();
        const entry: DimensionPreset = {
          ...preset,
          id: generateId(),
          createdAt: Date.now(),
          updatedAt: timestamp,
        };
        const active = previous.filter((item) => !item.deletedAt);
        const deleted = previous.filter((item) => item.deletedAt);
        return [entry, ...active].slice(0, MAX_PRESETS).concat(deleted);
      });
    },
    [persist],
  );

  const removePreset = useCallback(
    (id: string) => {
      const deletedAt = new Date().toISOString();
      persist((previous) =>
        previous.map((preset) => (
          preset.id === id && !preset.deletedAt ? markEntityDeleted(preset, deletedAt) : preset
        )),
      );
    },
    [persist],
  );

  const renamePreset = useCallback(
    (id: string, label: string) => {
      const updatedAt = new Date().toISOString();
      persist((previous) =>
        previous.map((preset) => (
          preset.id === id && !preset.deletedAt
            ? { ...preset, label, updatedAt }
            : preset
        )),
      );
    },
    [persist],
  );

  const presetsByProfile = useMemo(() => {
    const map = new Map<ProfileId, DimensionPreset[]>();
    for (const preset of presets) {
      const list = map.get(preset.profileId);
      if (list) list.push(preset);
      else map.set(preset.profileId, [preset]);
    }
    return map;
  }, [presets]);

  const presetsForProfile = useCallback(
    (profileId: ProfileId) => presetsByProfile.get(profileId) ?? [],
    [presetsByProfile],
  );

  return { presets, presetsForProfile, addPreset, removePreset, renamePreset };
}
