"use client";

import { useCallback, useState } from "react";
import type { Project } from "@/hooks/useProjects";

/**
 * Holds the project the print sheet is rendering. Printing is synchronous in
 * most browsers but not all, so the node stays mounted until `afterprint`
 * fires — unmounting mid-print prints nothing.
 */
export function useQuotePrinting(onPrinted?: (project: Project) => void) {
  const [printing, setPrinting] = useState<Project | null>(null);

  const printQuote = useCallback(
    (project: Project) => {
      if (project.calculations.length === 0) return;
      setPrinting(project);
      onPrinted?.(project);
      // Let React paint the quote before handing the page to the print dialog.
      requestAnimationFrame(() => {
        const done = () => {
          window.removeEventListener("afterprint", done);
          setPrinting(null);
        };
        window.addEventListener("afterprint", done);
        window.print();
      });
    },
    [onPrinted],
  );

  return { printing, printQuote };
}
