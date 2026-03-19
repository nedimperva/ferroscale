"use client";

import { memo, useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { desktopResultPaneWidthStore } from "@/lib/external-stores";

const MIN_RESULT_PX = 260;
const ABS_MAX_RESULT_PX = 480;
const DEFAULT_RESULT_PX = 320;

function clampResultWidth(px: number, containerWidth: number): number {
  const fracMax = Math.floor(containerWidth * 0.5);
  const cap = Math.min(ABS_MAX_RESULT_PX, Math.max(MIN_RESULT_PX, fracMax));
  return Math.min(cap, Math.max(MIN_RESULT_PX, Math.round(px)));
}

export const DesktopCalculatorSplit = memo(function DesktopCalculatorSplit({
  calculator,
  result,
}: {
  calculator: ReactNode;
  result: ReactNode;
}) {
  const t = useTranslations("result");
  const containerRef = useRef<HTMLDivElement>(null);

  const widthPx = useSyncExternalStore(
    desktopResultPaneWidthStore.subscribe,
    desktopResultPaneWidthStore.getSnapshot,
    desktopResultPaneWidthStore.getServerSnapshot,
  );

  const clampToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = desktopResultPaneWidthStore.getSnapshot();
    const next = clampResultWidth(w, el.clientWidth);
    if (next !== w) {
      desktopResultPaneWidthStore.set(next);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      clampToContainer();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampToContainer]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    const startX = event.clientX;
    const startW = desktopResultPaneWidthStore.getSnapshot();
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    target.setPointerCapture(pointerId);

    const move = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const next = clampResultWidth(startW + delta, el.clientWidth);
      desktopResultPaneWidthStore.set(next);
    };

    const up = () => {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* released */
      }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, []);

  const onDoubleClick = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    desktopResultPaneWidthStore.set(clampResultWidth(DEFAULT_RESULT_PX, el.clientWidth));
  }, []);

  return (
    <div
      ref={containerRef}
      className="hidden w-full gap-0 lg:flex"
    >
      <div className="flex min-w-0 flex-1 flex-col self-start rounded-xl border border-border bg-surface shadow-sm">
        {calculator}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={widthPx}
        aria-valuetext={t("resizeSeparatorValue", { px: widthPx })}
        aria-label={t("resizeSeparator")}
        title={t("resizeSeparatorHint")}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        className="group relative z-10 mx-1.5 w-3 shrink-0 cursor-col-resize touch-none select-none self-stretch"
      >
        <span
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-accent group-active:bg-accent md:group-hover:w-0.5"
          aria-hidden
        />
      </div>

      <aside
        className="sticky top-4 max-h-[calc(100dvh-2rem)] shrink-0 self-start overflow-y-auto overflow-x-hidden"
        style={{ width: widthPx }}
      >
        {result}
      </aside>
    </div>
  );
});
