"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { CommandShell } from "@/components/command/command-shell";
import { SyncEngine } from "@/components/sync-engine";
import { getAppTabFromPathname } from "@/lib/app-shell";

interface RouteAwareAppShellProps {
  children: ReactNode;
}

/**
 * Command is the only shell: every app tab (/, /saved, /projects, /customers,
 * /settings) renders it. Pages outside the app tabs (/contact, /faq, /qa)
 * render their own content.
 */
export function RouteAwareAppShell({ children }: RouteAwareAppShellProps) {
  const pathname = usePathname();
  const currentTab = getAppTabFromPathname(pathname);

  // SyncEngine sits outside the branch so switching between an app tab and
  // /contact or /faq does not tear the engine down mid-sync.
  return (
    <>
      <SyncEngine />
      {currentTab ? <CommandShell /> : children}
    </>
  );
}
