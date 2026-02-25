// src/lib/haptics.ts

/**
 * Triggers device haptic feedback if supported by the browser/OS.
 * Mostly works on Chrome for Android. iOS Safari generally ignores this
 * unless it's a very specific user interaction or wrapped in a native app container.
 */
export function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light") {
    if (typeof window === "undefined" || !navigator.vibrate) return;

    try {
        switch (type) {
            case "light":
                navigator.vibrate(20);
                break;
            case "medium":
                navigator.vibrate(40);
                break;
            case "heavy":
                navigator.vibrate(60);
                break;
            case "success":
                // Two short pulses
                navigator.vibrate([20, 50, 20]);
                break;
            case "warning":
                // One medium, one long
                navigator.vibrate([30, 50, 50]);
                break;
            case "error":
                // Three short pulses
                navigator.vibrate([20, 30, 20, 30, 20]);
                break;
            default:
                navigator.vibrate(20);
        }
    } catch (e) {
        // Ignore errors (e.g. if the user hasn't interacted with the page yet)
        console.debug("Haptic feedback failed", e);
    }
}
