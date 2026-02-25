"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768; // px — matches Tailwind's `md`

/**
 * Returns `true` when the viewport width is below the mobile breakpoint.
 * SSR-safe: defaults to `false` on the server.
 */
export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsMobile(e.matches);
        };
        // Set initial value
        onChange(mql);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);

    return isMobile;
}
