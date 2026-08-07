import { hapticsStore } from "@/lib/settings-stores";

/**
 * Short vibrations for the on-screen keypad and the actions around it. A
 * custom keyboard without haptics feels emulated; with them it feels like the
 * phone's own. Feature-detected (iOS Safari has no Vibration API), and off
 * whenever the user has switched it off in Settings.
 */

type HapticKind =
  /** A key, a chip insert — the smallest possible tick. */
  | "tap"
  /** A committed action: saved, logged to the tape. */
  | "commit"
  /** Something didn't parse. */
  | "warn";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  commit: [12, 30, 12],
  warn: 24,
};

export function haptic(kind: HapticKind): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (!hapticsStore.getSnapshot()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* a browser that rejects the pattern is not worth reporting */
  }
}
