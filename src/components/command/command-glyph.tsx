import type { CommandFamily } from "@/lib/command/types";

interface CommandGlyphProps {
  fam: CommandFamily;
  size?: number;
  className?: string;
}

export function CommandGlyph({ fam, size = 20, className }: CommandGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (fam) {
    case "beam":
      return (
        <svg {...common}>
          <path d="M5 4h14M5 20h14M12 4v16" />
        </svg>
      );
    case "shs":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="1.5" />
          <rect x="8.5" y="8.5" width="7" height="7" rx="0.5" />
        </svg>
      );
    case "rhs":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="10" rx="1.5" />
          <rect x="7" y="10" width="10" height="4" rx="0.5" />
        </svg>
      );
    case "chs":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "round":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <circle cx="12" cy="12" r="7.5" fill="currentColor" />
        </svg>
      );
    case "sqbar":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <rect x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor" />
        </svg>
      );
    case "flat":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
          <rect x="4" y="9.5" width="16" height="5" rx="1" fill="currentColor" />
        </svg>
      );
    case "angle":
      return (
        <svg {...common}>
          <path d="M7 4v13h13" />
        </svg>
      );
  }
}
