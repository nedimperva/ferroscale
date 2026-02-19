"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { useDrawerBehavior } from "@/hooks/useDrawerBehavior";
import { ContactForm } from "@/components/contact-form";

interface ContactDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const ContactDrawer = memo(function ContactDrawer({
  open,
  onClose,
}: ContactDrawerProps) {
  const t = useTranslations("contact.drawer");

  useDrawerBehavior(open, onClose);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-overlay transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        aria-label={t("ariaLabel")}
        className={`fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-[90vw] flex-col bg-surface-raised shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {/* envelope icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            {t("title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            aria-label={t("close")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-xs text-muted">{t("description")}</p>
          <ContactForm compact />
        </div>
      </aside>
    </>
  );
});
