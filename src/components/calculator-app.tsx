"use client";

import type { AppTabId } from "@/lib/app-shell";
import { FerroScaleAppShell } from "@/components/ferroscale-app-shell";
import { NumpadProvider } from "@/components/calculator/numpad-context";
import { CustomNumpad } from "@/components/calculator/custom-numpad";

export function CalculatorApp({
  currentTab = "calculator",
}: {
  currentTab?: AppTabId;
}) {
  return (
    <NumpadProvider>
      <FerroScaleAppShell currentTab={currentTab} />
      <CustomNumpad />
    </NumpadProvider>
  );
}
