/** Layout math for the desktop calculator / result / optional third column. */

export const MIN_RESULT_PANE_PX = 260;
export const DEFAULT_RESULT_PANE_PX = 320;
export const ABS_MAX_RESULT_PANE_PX = 480;

export const MIN_THIRD_PANE_PX = 220;
export const DEFAULT_THIRD_PANE_PX = 280;
export const ABS_MAX_THIRD_PANE_PX = 400;

/** Effective horizontal space per drag gutter (matches Tailwind mx-1.5 + hit target). */
export const PANE_GUTTER_PX = 12;

export const MIN_CALCULATOR_PX = 260;

export function maxResultPanePx(params: {
  containerWidth: number;
  thirdOpen: boolean;
  thirdWidthPx: number;
  userCapPx: number;
}): number {
  const { containerWidth: cw, thirdOpen, thirdWidthPx: tw, userCapPx } = params;
  const gutters = thirdOpen ? 2 : 1;
  const fixedRight = thirdOpen ? tw + PANE_GUTTER_PX : 0;
  const layoutMax = cw - MIN_CALCULATOR_PX - fixedRight - gutters * PANE_GUTTER_PX;
  const softFrac = Math.floor(cw * 0.5);
  const cap = Math.min(
    userCapPx,
    ABS_MAX_RESULT_PANE_PX,
    softFrac,
    Math.max(MIN_RESULT_PANE_PX, Math.floor(layoutMax)),
  );
  return Math.max(MIN_RESULT_PANE_PX, cap);
}

export function maxThirdPanePx(params: {
  containerWidth: number;
  resultWidthPx: number;
  thirdOpen: boolean;
}): number {
  const { containerWidth: cw, resultWidthPx: rw, thirdOpen } = params;
  if (!thirdOpen) return MIN_THIRD_PANE_PX;
  const layoutMax = cw - MIN_CALCULATOR_PX - rw - 2 * PANE_GUTTER_PX;
  const softFrac = Math.floor(cw * 0.38);
  const cap = Math.min(
    ABS_MAX_THIRD_PANE_PX,
    softFrac,
    Math.max(MIN_THIRD_PANE_PX, Math.floor(layoutMax)),
  );
  return Math.max(MIN_THIRD_PANE_PX, cap);
}

export function clampResultPanePx(
  widthPx: number,
  params: {
    containerWidth: number;
    thirdOpen: boolean;
    thirdWidthPx: number;
    userCapPx: number;
  },
): number {
  const max = maxResultPanePx(params);
  return Math.min(max, Math.max(MIN_RESULT_PANE_PX, Math.round(widthPx)));
}

export function clampThirdPanePx(
  widthPx: number,
  params: {
    containerWidth: number;
    resultWidthPx: number;
    thirdOpen: boolean;
  },
): number {
  const max = maxThirdPanePx(params);
  return Math.min(max, Math.max(MIN_THIRD_PANE_PX, Math.round(widthPx)));
}
