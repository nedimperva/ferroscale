import { memo, useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { LengthUnit } from "@/lib/calculator/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  RESULT_PANE_CAP_CHOICES,
  desktopResultPaneMaxCapStore,
  desktopResultPaneWidthStore,
  desktopThirdPaneWidthStore,
  desktopThirdVisibleStore,
  normalizeResultPaneCap,
} from "@/lib/external-stores";
import { DEFAULT_RESULT_PANE_PX, DEFAULT_THIRD_PANE_PX } from "@/lib/desktop-pane-clamp";
import { triggerHaptic } from "@/lib/haptics";

interface WorkspaceSectionProps {
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
  defaultUnit: LengthUnit;
  onDefaultUnitChange: (value: LengthUnit) => void;
  unitOptions: LengthUnit[];
}

const COMPARE_OPTIONS = [3, 5, 8];

export const WorkspaceSection = memo(function WorkspaceSection({
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
  defaultUnit,
  onDefaultUnitChange,
  unitOptions,
}: WorkspaceSectionProps) {
  const t = useTranslations("workspace");
  const isMobile = useIsMobile();

  const thirdVisibleDesktop = useSyncExternalStore(
    desktopThirdVisibleStore.subscribe,
    desktopThirdVisibleStore.getSnapshot,
    desktopThirdVisibleStore.getServerSnapshot,
  );
  const maxCapRaw = useSyncExternalStore(
    desktopResultPaneMaxCapStore.subscribe,
    desktopResultPaneMaxCapStore.getSnapshot,
    desktopResultPaneMaxCapStore.getServerSnapshot,
  );
  const normalizedCap = normalizeResultPaneCap(maxCapRaw);

  const resetDesktopWidths = useCallback(() => {
    triggerHaptic("light");
    desktopResultPaneWidthStore.set(DEFAULT_RESULT_PANE_PX);
    desktopThirdPaneWidthStore.set(DEFAULT_THIRD_PANE_PX);
  }, []);

  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
        {t("title")}
      </h3>

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

      <p className="text-[11px] text-muted-faint">
        {t("activeCompareLimit", { limit: maxCompare })}
        {isCompareMobileCapped ? ` ${t("mobileCap", { cap: 3 })}` : ""}
      </p>

      <div className="mt-1 border-t border-border-faint pt-2 grid gap-2">
        <div className="grid gap-1">
          <label htmlFor="default-unit" className="text-xs font-medium text-foreground-secondary">
            {t("defaultUnit")}
          </label>
          <select
            id="default-unit"
            value={defaultUnit}
            onChange={(e) => onDefaultUnitChange(e.target.value as LengthUnit)}
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
          >
            {unitOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-faint">{t("defaultUnitHint")}</p>
        </div>
      </div>

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

      {!isMobile && (
        <div className="mt-1 border-t border-border-faint pt-2 grid gap-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t("desktopLayoutTitle")}
          </h4>
          <p className="text-[11px] text-muted-faint">{t("desktopLayoutHint")}</p>

          <ToggleRow
            label={t("desktopThirdColumn")}
            checked={thirdVisibleDesktop}
            onToggle={() => {
              triggerHaptic("light");
              desktopThirdVisibleStore.toggle();
            }}
          />

          <div className="grid gap-1">
            <label htmlFor="result-pane-max-cap" className="text-xs font-medium text-foreground-secondary">
              {t("resultPaneMaxCap")}
            </label>
            <select
              id="result-pane-max-cap"
              value={normalizedCap}
              onChange={(e) => {
                triggerHaptic("light");
                desktopResultPaneMaxCapStore.set(Number(e.target.value));
              }}
              className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm transition-colors focus:border-blue-500"
            >
              {RESULT_PANE_CAP_CHOICES.map((px) => (
                <option key={px} value={px}>
                  {t("resultPaneCapOption", { px })}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-faint">{t("resultPaneMaxCapHint")}</p>
          </div>

          <button
            type="button"
            onClick={resetDesktopWidths}
            className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-left text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
            title={t("resetDesktopWidthsHint")}
          >
            {t("resetDesktopWidths")}
          </button>
        </div>
      )}
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
