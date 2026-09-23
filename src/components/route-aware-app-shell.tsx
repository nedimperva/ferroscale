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
 * Command is now the only shell. /saved /projects /settings /compare all
 * render Command — the legacy FerroScaleAppShell is no longer mounted.
 * Pages outside the app tabs (e.g. /contact) still render their own content.
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
