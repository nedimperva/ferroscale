"use client";

import { useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  COLUMN_KEYBOARD_STEP_PX,
  clampColumnPairPercents,
} from "@/lib/column-layout";

interface ColumnResizeHandleProps {
  leftId: string;
  rightId: string;
  onResize: (leftId: string, rightId: string, leftPercent: number, rightPercent: number) => void;
  onResizeEnd: (widths: Record<string, number>) => void;
  columns: { id: string; widthPercent?: number }[];
}

interface ResizeSnapshot {
  leftPx: number;
  rightPx: number;
  leftPercent: number;
  rightPercent: number;
  equalPercent: number;
}

export function ColumnResizeHandle({
  leftId,
  rightId,
  onResize,
  onResizeEnd,
  columns,
}: ColumnResizeHandleProps) {
  const t = useTranslations();
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getResizeSnapshot = useCallback((): ResizeSnapshot | null => {
    const element = handleRef.current;
    if (!element) return null;

    const container = element.closest("[data-columns-container]") as HTMLElement | null;
    if (!container) return null;

    const leftElement = container.querySelector(`[data-column-id="${leftId}"]`) as HTMLElement | null;
    const rightElement = container.querySelector(`[data-column-id="${rightId}"]`) as HTMLElement | null;
    if (!leftElement || !rightElement) return null;

    const equalPercent = 100 / columns.length;
    return {
      leftPx: leftElement.getBoundingClientRect().width,
      rightPx: rightElement.getBoundingClientRect().width,
      leftPercent: columns.find((column) => column.id === leftId)?.widthPercent ?? equalPercent,
      rightPercent: columns.find((column) => column.id === rightId)?.widthPercent ?? equalPercent,
      equalPercent,
    };
  }, [columns, leftId, rightId]);

  const buildWidthMap = useCallback(
    (leftPercent: number, rightPercent: number, equalPercent: number) => {
      const widths: Record<string, number> = {};

      for (const column of columns) {
        if (column.id === leftId) widths[column.id] = leftPercent;
        else if (column.id === rightId) widths[column.id] = rightPercent;
        else widths[column.id] = column.widthPercent ?? equalPercent;
      }

      return widths;
    },
    [columns, leftId, rightId],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const element = handleRef.current;
      if (!element) return;

      const container = element.closest("[data-columns-container]") as HTMLElement | null;
      if (!container) return;

      const leftElement = container.querySelector(`[data-column-id="${leftId}"]`) as HTMLElement | null;
      const rightElement = container.querySelector(`[data-column-id="${rightId}"]`) as HTMLElement | null;
      if (!leftElement || !rightElement) return;

      const containerRect = container.getBoundingClientRect();
      const leftRect = leftElement.getBoundingClientRect();
      const leftEdge = leftRect.left - containerRect.left;

      const snapshot = getResizeSnapshot();
      if (!snapshot) return;

      element.setPointerCapture(event.pointerId);
      dragging.current = true;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function computePercents(clientX: number) {
        const mouseX = clientX - containerRect.left;
        const nextLeftPx = mouseX - leftEdge;
        return clampColumnPairPercents({
          ...snapshot,
          nextLeftPx,
        });
      }

      function cleanup(pointerId: number) {
        dragging.current = false;
        if (element.hasPointerCapture(pointerId)) {
          element.releasePointerCapture(pointerId);
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerup", onPointerUp);
        element.removeEventListener("pointercancel", onPointerCancel);
      }

      function onPointerMove(moveEvent: PointerEvent) {
        if (!dragging.current) return;
        const { left, right } = computePercents(moveEvent.clientX);
        onResize(leftId, rightId, left, right);
      }

      function onPointerUp(upEvent: PointerEvent) {
        const { left, right } = computePercents(upEvent.clientX);
        onResizeEnd(buildWidthMap(left, right, snapshot.equalPercent));
        cleanup(upEvent.pointerId);
      }

      function onPointerCancel(cancelEvent: PointerEvent) {
        cleanup(cancelEvent.pointerId);
      }

      element.addEventListener("pointermove", onPointerMove);
      element.addEventListener("pointerup", onPointerUp);
      element.addEventListener("pointercancel", onPointerCancel);
    },
    [buildWidthMap, getResizeSnapshot, leftId, onResize, onResizeEnd, rightId],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      const snapshot = getResizeSnapshot();
      if (!snapshot) return;

      const deltaPx = event.key === "ArrowLeft" ? -COLUMN_KEYBOARD_STEP_PX : COLUMN_KEYBOARD_STEP_PX;
      const nextWidths = clampColumnPairPercents({
        ...snapshot,
        nextLeftPx: snapshot.leftPx + deltaPx,
      });

      onResizeEnd(buildWidthMap(nextWidths.left, nextWidths.right, snapshot.equalPercent));
    },
    [buildWidthMap, getResizeSnapshot, onResizeEnd],
  );

  const equalPercent = 100 / columns.length;
  const currentLeftPercent = columns.find((column) => column.id === leftId)?.widthPercent ?? equalPercent;

  return (
    <div
      ref={handleRef}
      role="separator"
      tabIndex={0}
      aria-controls={`column-${leftId} column-${rightId}`}
      aria-label={t("columns.resizeHandle")}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(currentLeftPercent)}
      className="group flex h-full w-4 shrink-0 cursor-col-resize touch-none items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-strong focus:ring-offset-2 focus:ring-offset-background"
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <div className="h-10 w-1 rounded-full bg-border-faint transition-colors group-hover:bg-blue-strong group-focus:bg-blue-strong group-active:bg-blue-strong" />
    </div>
  );
}
