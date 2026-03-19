"use client";

import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  desktopResultPaneMaxCapStore,
  desktopResultPaneWidthStore,
  desktopThirdPaneWidthStore,
  desktopThirdVisibleStore,
  normalizeResultPaneCap,
} from "@/lib/external-stores";
import {
  clampResultPanePx,
  clampThirdPanePx,
  DEFAULT_RESULT_PANE_PX,
  DEFAULT_THIRD_PANE_PX,
  maxResultPanePx,
  maxThirdPanePx,
  MIN_RESULT_PANE_PX,
  MIN_THIRD_PANE_PX,
} from "@/lib/desktop-pane-clamp";

function PaneSeparator({
  ariaLabel,
  valueText,
  title,
  value,
  valueMin,
  valueMax,
  onPointerDown,
  onDoubleClick,
  onStep,
  onGoMin,
  onGoMax,
}: {
  ariaLabel: string;
  valueText: string;
  title: string;
  value: number;
  valueMin: number;
  valueMax: number;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  onStep: (delta: number) => void;
  onGoMin: () => void;
  onGoMax: () => void;
}) {
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          onStep(-8);
          break;
        case "ArrowRight":
          event.preventDefault();
          onStep(8);
          break;
        case "Home":
          event.preventDefault();
          onGoMin();
          break;
        case "End":
          event.preventDefault();
          onGoMax();
          break;
        default:
          break;
      }
    },
    [onGoMax, onGoMin, onStep],
  );

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      aria-valuetext={valueText}
      aria-label={ariaLabel}
      title={title}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className="group relative z-10 mx-1.5 w-3 shrink-0 cursor-col-resize touch-none select-none self-stretch rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-accent group-active:bg-accent md:group-hover:w-0.5"
        aria-hidden
      />
    </div>
  );
}

function useContainerWidth(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [containerRef]);
  return w;
}

export const DesktopCalculatorSplit = memo(function DesktopCalculatorSplit({
  calculator,
  result,
  thirdPane,
}: {
  calculator: ReactNode;
  result: ReactNode;
  thirdPane: ReactNode | null;
}) {
  const t = useTranslations("result");
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);

  const resultW = useSyncExternalStore(
    desktopResultPaneWidthStore.subscribe,
    desktopResultPaneWidthStore.getSnapshot,
    desktopResultPaneWidthStore.getServerSnapshot,
  );
  const thirdW = useSyncExternalStore(
    desktopThirdPaneWidthStore.subscribe,
    desktopThirdPaneWidthStore.getSnapshot,
    desktopThirdPaneWidthStore.getServerSnapshot,
  );
  const thirdVisible = useSyncExternalStore(
    desktopThirdVisibleStore.subscribe,
    desktopThirdVisibleStore.getSnapshot,
    desktopThirdVisibleStore.getServerSnapshot,
  );
  const capRaw = useSyncExternalStore(
    desktopResultPaneMaxCapStore.subscribe,
    desktopResultPaneMaxCapStore.getSnapshot,
    desktopResultPaneMaxCapStore.getServerSnapshot,
  );
  const userCap = normalizeResultPaneCap(capRaw);

  const clampAll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const cap = normalizeResultPaneCap(desktopResultPaneMaxCapStore.getSnapshot());
    const thirdOn = desktopThirdVisibleStore.getSnapshot();
    let tw = desktopThirdPaneWidthStore.getSnapshot();
    let rw = desktopResultPaneWidthStore.getSnapshot();
    for (let i = 0; i < 4; i++) {
      const nrw = clampResultPanePx(rw, {
        containerWidth: cw,
        thirdOpen: thirdOn,
        thirdWidthPx: tw,
        userCapPx: cap,
      });
      const ntw = thirdOn
        ? clampThirdPanePx(tw, { containerWidth: cw, resultWidthPx: nrw, thirdOpen: true })
        : tw;
      if (nrw === rw && ntw === tw) break;
      rw = nrw;
      tw = ntw;
    }
    if (rw !== desktopResultPaneWidthStore.getSnapshot()) {
      desktopResultPaneWidthStore.set(rw);
    }
    if (thirdOn && tw !== desktopThirdPaneWidthStore.getSnapshot()) {
      desktopThirdPaneWidthStore.set(tw);
    }
  }, []);

  useEffect(() => {
    clampAll();
  }, [clampAll, thirdVisible, userCap, containerWidth]);

  const cw = containerWidth || 1200;
  const maxR = maxResultPanePx({
    containerWidth: cw,
    thirdOpen: thirdVisible,
    thirdWidthPx: thirdW,
    userCapPx: userCap,
  });
  const maxT = maxThirdPanePx({
    containerWidth: cw,
    resultWidthPx: resultW,
    thirdOpen: thirdVisible,
  });

  const startResultDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
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
        const tw0 = desktopThirdPaneWidthStore.getSnapshot();
        const thirdOn = desktopThirdVisibleStore.getSnapshot();
        const cap0 = normalizeResultPaneCap(desktopResultPaneMaxCapStore.getSnapshot());
        const next = clampResultPanePx(startW + delta, {
          containerWidth: el.clientWidth,
          thirdOpen: thirdOn,
          thirdWidthPx: tw0,
          userCapPx: cap0,
        });
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
        clampAll();
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [clampAll],
  );

  const startThirdDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const el = containerRef.current;
      if (!el) return;

      const startX = event.clientX;
      const startW = desktopThirdPaneWidthStore.getSnapshot();
      const target = event.currentTarget;
      const pointerId = event.pointerId;
      target.setPointerCapture(pointerId);

      const move = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const rw0 = desktopResultPaneWidthStore.getSnapshot();
        const next = clampThirdPanePx(startW + delta, {
          containerWidth: el.clientWidth,
          resultWidthPx: rw0,
          thirdOpen: true,
        });
        desktopThirdPaneWidthStore.set(next);
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
        clampAll();
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [clampAll],
  );

  const nudgeResult = useCallback(
    (delta: number) => {
      const el = containerRef.current;
      if (!el) return;
      const tw0 = desktopThirdPaneWidthStore.getSnapshot();
      const thirdOn = desktopThirdVisibleStore.getSnapshot();
      const cap0 = normalizeResultPaneCap(desktopResultPaneMaxCapStore.getSnapshot());
      const rw = desktopResultPaneWidthStore.getSnapshot();
      const next = clampResultPanePx(rw + delta, {
        containerWidth: el.clientWidth,
        thirdOpen: thirdOn,
        thirdWidthPx: tw0,
        userCapPx: cap0,
      });
      desktopResultPaneWidthStore.set(next);
      clampAll();
    },
    [clampAll],
  );

  const nudgeThird = useCallback(
    (delta: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rw0 = desktopResultPaneWidthStore.getSnapshot();
      const tw = desktopThirdPaneWidthStore.getSnapshot();
      const next = clampThirdPanePx(tw + delta, {
        containerWidth: el.clientWidth,
        resultWidthPx: rw0,
        thirdOpen: true,
      });
      desktopThirdPaneWidthStore.set(next);
      clampAll();
    },
    [clampAll],
  );

  const resetResultWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const tw0 = desktopThirdPaneWidthStore.getSnapshot();
    const thirdOn = desktopThirdVisibleStore.getSnapshot();
    const cap0 = normalizeResultPaneCap(desktopResultPaneMaxCapStore.getSnapshot());
    desktopResultPaneWidthStore.set(
      clampResultPanePx(DEFAULT_RESULT_PANE_PX, {
        containerWidth: el.clientWidth,
        thirdOpen: thirdOn,
        thirdWidthPx: tw0,
        userCapPx: cap0,
      }),
    );
    clampAll();
  }, [clampAll]);

  const resetThirdWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rw0 = desktopResultPaneWidthStore.getSnapshot();
    desktopThirdPaneWidthStore.set(
      clampThirdPanePx(DEFAULT_THIRD_PANE_PX, {
        containerWidth: el.clientWidth,
        resultWidthPx: rw0,
        thirdOpen: true,
      }),
    );
    clampAll();
  }, [clampAll]);

  const goResultMax = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const mx = maxResultPanePx({
      containerWidth: el.clientWidth,
      thirdOpen: desktopThirdVisibleStore.getSnapshot(),
      thirdWidthPx: desktopThirdPaneWidthStore.getSnapshot(),
      userCapPx: normalizeResultPaneCap(desktopResultPaneMaxCapStore.getSnapshot()),
    });
    desktopResultPaneWidthStore.set(mx);
    clampAll();
  }, [clampAll]);

  const goThirdMax = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const mx = maxThirdPanePx({
      containerWidth: el.clientWidth,
      resultWidthPx: desktopResultPaneWidthStore.getSnapshot(),
      thirdOpen: true,
    });
    desktopThirdPaneWidthStore.set(mx);
    clampAll();
  }, [clampAll]);

  return (
    <div ref={containerRef} className="hidden w-full gap-0 lg:flex">
      <div className="flex min-w-0 flex-1 flex-col self-start rounded-xl border border-border bg-surface shadow-sm">
        {calculator}
      </div>

      <PaneSeparator
        ariaLabel={t("resizeSeparatorResult")}
        valueText={t("resizeSeparatorValue", { px: resultW })}
        title={t("resizeSeparatorHint")}
        value={resultW}
        valueMin={MIN_RESULT_PANE_PX}
        valueMax={maxR}
        onPointerDown={startResultDrag}
        onDoubleClick={resetResultWidth}
        onStep={nudgeResult}
        onGoMin={() => {
          desktopResultPaneWidthStore.set(MIN_RESULT_PANE_PX);
          clampAll();
        }}
        onGoMax={goResultMax}
      />

      <aside
        className="sticky top-4 max-h-[calc(100dvh-2rem)] shrink-0 self-start overflow-y-auto overflow-x-hidden"
        style={{ width: resultW }}
      >
        {result}
      </aside>

      {thirdVisible && thirdPane != null && (
        <>
          <PaneSeparator
            ariaLabel={t("resizeSeparatorThird")}
            valueText={t("resizeThirdSeparatorValue", { px: thirdW })}
            title={t("resizeThirdSeparatorHint")}
            value={thirdW}
            valueMin={MIN_THIRD_PANE_PX}
            valueMax={maxT}
            onPointerDown={startThirdDrag}
            onDoubleClick={resetThirdWidth}
            onStep={nudgeThird}
            onGoMin={() => {
              desktopThirdPaneWidthStore.set(MIN_THIRD_PANE_PX);
              clampAll();
            }}
            onGoMax={goThirdMax}
          />

          <aside
            className="sticky top-4 max-h-[calc(100dvh-2rem)] shrink-0 self-start overflow-y-auto overflow-x-hidden"
            style={{ width: thirdW }}
          >
            {thirdPane}
          </aside>
        </>
      )}
    </div>
  );
});
