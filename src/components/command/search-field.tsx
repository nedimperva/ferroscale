"use client";

/**
 * The app's one search input. Settings, Projects and Parts all grew their own
 * copy of this label/icon/input sandwich; they share this instead so the three
 * search boxes stay the same shape.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  compact,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label
      className="flex items-center gap-2 rounded-xl px-3 w-full"
      style={{
        height: compact ? 34 : 38,
        border: "1px solid var(--border-faint)",
        background: "var(--surface)",
      }}
    >
      <span className="flex text-muted flex-shrink-0" aria-hidden="true">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-faint"
      />
    </label>
  );
}
