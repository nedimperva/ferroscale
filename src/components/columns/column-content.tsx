"use client";

import { memo } from "react";
import type { ColumnPanelId } from "@/lib/column-layout";

interface ColumnContentProps {
  panelId: ColumnPanelId;
  contentMap: Record<ColumnPanelId, React.ReactNode>;
}

export const ColumnContent = memo(function ColumnContent({ panelId, contentMap }: ColumnContentProps) {
  return <>{contentMap[panelId] ?? null}</>;
});
