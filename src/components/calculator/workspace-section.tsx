import { memo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { triggerHaptic } from "@/lib/haptics";

interface WorkspaceSectionProps {
  historyLimit: number;
  onHistoryLimitChange: (value: number) => void;
  compareLimit: number;
  onCompareLimitChange: (value: number) => void;
  maxCompare: number;
  isCompareMobileCapped: boolean;
  showInlineMaterial: boolean;
  onToggleInlineMaterial: () => void;
  showInlinePrice: boolean;
  onToggleInlinePrice: () => void;
  showSettingsPreview: boolean;
  onToggleSettingsPreview: () => void;
  weightAsMain: boolean;
  onToggleWeightAsMain: () => void;
}

const HISTORY_OPTIONS = [10, 25, 50, 100];
const COMPARE_OPTIONS = [3, 5, 8];

export const WorkspaceSection = memo(function WorkspaceSection({
  historyLimit,
  onHistoryLimitChange,
  compareLimit,
  onCompareLimitChange,
  maxCompare,
  isCompareMobileCapped,
  showInlineMaterial,
  onToggleInlineMaterial,
  showInlinePrice,
  onToggleInlinePrice,
  showSettingsPreview,
  onToggleSettingsPreview,
  weightAsMain,
  onToggleWeightAsMain,
}: WorkspaceSectionProps) {
  const t = useTranslations("workspace");

  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
        {t("title")}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <label htmlFor="history-limit" className="text-xs font-medium text-foreground-secondary">
            {t("historyDepth")}
          </label>
          <select
            id="history-limit"
            value={historyLimit}
            onChange={(event) => onHistoryLimitChange(Number(event.target.value))}
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
          >
            {HISTORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <label htmlFor="compare-limit" className="text-xs font-medium text-foreground-secondary">
            {t("compareSlots")}
          </label>
          <select
            id="compare-limit"
            value={compareLimit}
            onChange={(event) => onCompareLimitChange(Number(event.target.value))}
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
          >
            {COMPARE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-muted-faint">
        {t("activeCompareLimit", { limit: maxCompare })}
        {isCompareMobileCapped ? ` ${t("mobileCap", { cap: 3 })}` : ""}
      </p>

      <div className="mt-1 border-t border-border-faint pt-2 grid gap-2">
        <ToggleRow
          label={t("settingsPreview")}
          checked={showSettingsPreview}
          onToggle={onToggleSettingsPreview}
        />
        <ToggleRow
          label={t("inlineMaterial")}
          checked={showInlineMaterial}
          onToggle={onToggleInlineMaterial}
        />
        <ToggleRow
          label={t("inlinePrice")}
          checked={showInlinePrice}
          onToggle={onToggleInlinePrice}
        />
        <ToggleRow
          label={t("weightAsMain")}
          checked={weightAsMain}
          onToggle={onToggleWeightAsMain}
        />
      </div>
    </section>
  );
});

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const handleClick = useCallback(() => {
    triggerHaptic("light");
    onToggle();
  }, [onToggle]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-between rounded-lg py-1 text-left"
    >
      <span className="text-xs font-medium text-foreground-secondary">{label}</span>
      <div
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-blue-strong" : "bg-border-strong"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </div>
    </button>
  );
}
