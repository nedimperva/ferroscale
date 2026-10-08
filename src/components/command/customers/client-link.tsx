"use client";

import { useTranslations } from "next-intl";
import type { Project } from "@/hooks/useProjects";

/**
 * A project's client, as a way to its customer. Plain text when the project
 * has no customer or the surface has nowhere to go; an underlined button
 * otherwise — the hairline underline the design gives every jump between tabs.
 */
export function ClientLink({
  project,
  onOpenCustomer,
  className = "",
}: {
  project: Project;
  onOpenCustomer?: (customerId: string) => void;
  className?: string;
}) {
  const t = useTranslations("command");
  const name = project.client?.trim();
  if (!name) return <span className={className}>—</span>;
  const customerId = project.customerId;
  if (!customerId || !onOpenCustomer) return <span className={className}>{name}</span>;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenCustomer(customerId);
      }}
      aria-label={t("customers.openCustomer", { name })}
      className={`text-left cursor-pointer underline hover:text-[var(--accent-text)] ${className}`}
      style={{
        border: 0,
        background: "transparent",
        padding: 0,
        color: "inherit",
        textDecorationColor: "var(--border)",
        textUnderlineOffset: 3,
      }}
    >
      {name}
    </button>
  );
}
