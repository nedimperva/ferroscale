import { memo } from "react";
import { useTranslations } from "next-intl";

/**
 * Map reference labels to authoritative URLs where users can look up the
 * standard or data source.  Keys are matched *inclusively* — if the label
 * starts with the key string, the URL is used.  More-specific keys are
 * checked first.
 */
const REFERENCE_URLS: Record<string, string> = {
  /* ── EN steel-product dimension / tolerance standards ── */
  "EN 10365":   "https://www.en-standard.eu/din-en-10365-hot-rolled-steel-channels-i-and-h-sections-dimensions-and-masses/",
  "EN 10024":   "https://www.en-standard.eu/bs-en-10024-hot-rolled-taper-flange-i-sections-tolerances-on-shape-and-dimensions/",
  "EN 10055":   "https://www.en-standard.eu/bs-en-10055-hot-rolled-steel-equal-flange-tees-with-radiused-root-and-toes-dimensions-and-tolerances-on-shape-and-dimensions/",
  "EN 10279":   "https://www.en-standard.eu/bs-en-10279-hot-rolled-steel-channels-tolerances-on-shape-dimensions-and-mass/",
  "EN 10056-1": "https://www.en-standard.eu/bs-en-10056-1-structural-steel-equal-and-unequal-leg-angles-part-1-dimensions/",
  "EN 10060":   "https://www.en-standard.eu/bs-en-10060-hot-rolled-round-steel-bars-for-general-purposes-dimensions-and-tolerances-on-shape-and-dimensions/",
  "EN 10059":   "https://www.en-standard.eu/bs-en-10059-hot-rolled-square-steel-bars-for-general-purposes-dimensions-and-tolerances-on-shape-and-dimensions/",
  "EN 10058":   "https://www.en-standard.eu/bs-en-10058-2018-hot-rolled-flat-steel-bars-for-general-purposes-dimensions-and-tolerances-on-shape-and-dimensions/",
  "EN 10061":   "https://www.en-standard.eu/bs-en-10061-hot-rolled-hexagonal-steel-bars-for-general-purposes-dimensions-and-tolerances-on-shape-and-dimensions/",
  "EN 10255":   "https://www.en-standard.eu/bs-en-10255-non-alloy-steel-tubes-suitable-for-welding-and-threading-technical-delivery-conditions/",
  "EN 10219":   "https://www.en-standard.eu/search/?q=EN+10219",
  "EN 10210":   "https://www.en-standard.eu/search/?q=EN+10210",
  "EN 10216":   "https://www.en-standard.eu/search/?q=EN+10216",
  "EN 10051":   "https://www.en-standard.eu/bs-en-10051-continuously-hot-rolled-strip-and-plate-cut-lengths-of-non-alloy-and-alloy-steels-tolerances-on-dimensions-and-shape/",
  "EN 10029":   "https://www.en-standard.eu/bs-en-10029-hot-rolled-steel-plates-3-mm-thick-or-above-tolerances-on-dimensions-and-shape/",
  "EN 10363":   "https://www.en-standard.eu/search/?q=EN+10363",
  "EN 508":     "https://www.en-standard.eu/search/?q=EN+508",

  /* ── EN material / grade standards ── */
  "EN 10025-2": "https://www.en-standard.eu/bs-en-10025-2-hot-rolled-products-of-structural-steels-part-2-technical-delivery-conditions-for-non-alloy-structural-steels/",
  "EN 10025-4": "https://www.en-standard.eu/bs-en-10025-4-hot-rolled-products-of-structural-steels-part-4-technical-delivery-conditions-for-thermomechanical-rolled-weldable-fine-grain-structural-steels/",
  "EN 10088-2": "https://www.en-standard.eu/search/?q=EN+10088-2",
  "EN 573-3":   "https://www.en-standard.eu/search/?q=EN+573-3",

  /* ── Composite reference labels (matched by startsWith) ── */
  "EN 10255 / EN 10216": "https://www.en-standard.eu/search/?q=EN+10255+EN+10216",
  "EN 10219 / EN 10210": "https://www.en-standard.eu/search/?q=EN+10219+EN+10210",

  /* ── AISC ── */
  AISC: "https://www.aisc.org/publications/steel-construction-manual-resources/",

  /* ── ISO ── */
  "ISO 16573": "https://www.iso.org/standard/57148.html",

  /* ── Geometric (no standard) ── */
  Geometric: "",
};

/** Sorted keys — longest first so composite keys match before partials. */
const SORTED_KEYS = Object.keys(REFERENCE_URLS).sort(
  (a, b) => b.length - a.length,
);

/** Resolve a reference label to a URL (or undefined). */
function getUrl(label: string): string | undefined {
  for (const key of SORTED_KEYS) {
    if (label.startsWith(key)) {
      const url = REFERENCE_URLS[key];
      return url || undefined;        // skip empty strings
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Shared <ReferenceList> component                                  */
/* ------------------------------------------------------------------ */

interface ReferenceListProps {
  labels: string[];
  /** Extra Tailwind wrapper classes. */
  className?: string;
}

export const ReferenceList = memo(function ReferenceList({
  labels,
  className = "",
}: ReferenceListProps) {
  const t = useTranslations();

  const renderLabel = (label: string): string => {
    if (label.startsWith("Dataset ")) {
      return t("references.dataset", { version: label.slice("Dataset ".length) });
    }

    if (label === "User-provided custom density") {
      return t("references.customDensity");
    }

    return label;
  };

  return (
    <div className={className}>
      <p className="font-medium text-muted">{t("references.title")}</p>
      <ul className="mt-1 list-disc pl-4">
        {labels.map((label) => {
          const url = getUrl(label);
          const displayLabel = renderLabel(label);
          return (
            <li key={label}>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {displayLabel}
                  {/* external-link icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="inline h-3 w-3 shrink-0 opacity-50"
                  >
                    <path d="M7 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8A1.5 1.5 0 0 0 13 12.5V9" />
                    <path d="M10 2h4v4" />
                    <path d="M14 2 7.5 8.5" />
                  </svg>
                </a>
              ) : (
                displayLabel
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
});
