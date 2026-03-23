"use client";

import { useCallback, useRef } from "react";

interface ColumnResizeHandleProps {
  leftId: string;
  rightId: string;
  onResize: (leftId: string, rightId: string, leftPercent: number, rightPercent: number) => void;
  onResizeEnd: (widths: Record<string, number>) => void;
  columns: { id: string; widthPercent?: number }[];
}

export function ColumnResizeHandle({
  leftId,
  rightId,
  onResize,
  onResizeEnd,
  columns,
}: ColumnResizeHandleProps) {
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const el = handleRef.current;
      if (!el) return;

      // Capture pointer so we get all move/up events even outside the element
      el.setPointerCapture(e.pointerId);
      dragging.current = true;

      const container = el.closest("[data-columns-container]") as HTMLElement | null;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      const leftEl = container.querySelector(`[data-column-id="${leftId}"]`) as HTMLElement | null;
      const rightEl = container.querySelector(`[data-column-id="${rightId}"]`) as HTMLElement | null;
      if (!leftEl || !rightEl) return;

      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();
      const combinedPx = leftRect.width + rightRect.width;
      const leftEdge = leftRect.left - containerRect.left;
      const minPx = 280;

      const equalPercent = 100 / columns.length;
      const leftStartPercent = columns.find((c) => c.id === leftId)?.widthPercent ?? equalPercent;
      const rightStartPercent = columns.find((c) => c.id === rightId)?.widthPercent ?? equalPercent;
      const combinedPercent = leftStartPercent + rightStartPercent;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function computePercents(clientX: number) {
        const mouseX = clientX - containerRect.left;
        let leftPx = mouseX - leftEdge;
        leftPx = Math.max(minPx, Math.min(combinedPx - minPx, leftPx));
        const ratio = leftPx / combinedPx;
        return {
          left: combinedPercent * ratio,
          right: combinedPercent * (1 - ratio),
        };
      }

      function onPointerMove(ev: PointerEvent) {
        if (!dragging.current) return;
        const { left, right } = computePercents(ev.clientX);
        onResize(leftId, rightId, left, right);
      }

      function onPointerUp(ev: PointerEvent) {
        dragging.current = false;
        el!.releasePointerCapture(ev.pointerId);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        const { left, right } = computePercents(ev.clientX);
        const widths: Record<string, number> = {};
        for (const col of columns) {
          if (col.id === leftId) widths[col.id] = left;
          else if (col.id === rightId) widths[col.id] = right;
          else widths[col.id] = col.widthPercent ?? equalPercent;
        }
        onResizeEnd(widths);

        el!.removeEventListener("pointermove", onPointerMove);
        el!.removeEventListener("pointerup", onPointerUp);
      }

      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp);
    },
    [leftId, rightId, onResize, onResizeEnd, columns],
  );

  return (
    <div
      ref={handleRef}
      className="group flex h-full w-4 shrink-0 cursor-col-resize touch-none items-center justify-center"
      onPointerDown={handlePointerDown}
    >
      <div className="h-10 w-1 rounded-full bg-border-faint transition-colors group-hover:bg-blue-strong group-active:bg-blue-strong" />
    </div>
  );
}
