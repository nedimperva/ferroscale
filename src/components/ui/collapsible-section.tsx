"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * A collapsible section with a smooth max-height CSS transition.
 * Uses `details`/`summary` for no-JS progressive enhancement.
 */
export function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(defaultOpen ? "auto" : 0);

  const toggle = useCallback(() => {
    if (isOpen && contentRef.current) {
      // Capture current height before closing
      setHeight(contentRef.current.scrollHeight);
      // Force a reflow so the browser registers the fixed height
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    } else if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  // After opening animation completes, switch to auto height
  useEffect(() => {
    if (!isOpen) return;
    const el = contentRef.current;
    if (!el) return;

    function onTransitionEnd() {
      setHeight("auto");
    }
    el.addEventListener("transitionend", onTransitionEnd, { once: true });
    return () => el.removeEventListener("transitionend", onTransitionEnd);
  }, [isOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-faint transition-colors hover:bg-surface-inset/40"
        aria-expanded={isOpen}
      >
        {icon}
        <span className="flex-1">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: height === "auto" ? "none" : `${height}px` }}
      >
        {children}
      </div>
    </div>
  );
}
