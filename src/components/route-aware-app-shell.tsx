"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { FerroScaleAppShell } from "@/components/ferroscale-app-shell";
import { CommandShell } from "@/components/command/command-shell";
import { getAppTabFromPathname } from "@/lib/app-shell";

interface RouteAwareAppShellProps {
  children: ReactNode;
}

export function RouteAwareAppShell({ children }: RouteAwareAppShellProps) {
  const pathname = usePathname();
  const currentTab = getAppTabFromPathname(pathname);

  if (!currentTab) {
    return <>{children}</>;
  }

  if (currentTab === "calculator") {
    return <CommandShell />;
  }

  return <FerroScaleAppShell currentTab={currentTab} />;
}
