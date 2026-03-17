"use client";

import type { AppTabId } from "@/lib/app-shell";
import { FerroScaleAppShell } from "@/components/ferroscale-app-shell";

export function CalculatorApp({
  currentTab = "calculator",
}: {
  currentTab?: AppTabId;
}) {
  return <FerroScaleAppShell currentTab={currentTab} />;
}
