// shared.jsx — common helpers, sample data, profile glyphs for all concepts

const SAMPLE = {
  profile: { id: 'hea_100', short: 'HEA 100', long: 'Steel beam HEA 100 (EN 10025)' },
  length: 6.0,         // meters
  qty: 4,
  material: 'S235',
  weightKg: 167.4,     // ~ 4 × 16.7 kg/m × 6 m
  priceEur: 502.30,
};

// ─────────────────────────────────────────────────────────────
// Profile cross-section glyphs (line / shape only, no fills)
// ─────────────────────────────────────────────────────────────
function ProfileGlyph({ kind = 'hea', size = 40, color = 'currentColor', strokeWidth = 2, filled = false }) {
  const s = size;
  const p = { width: s, height: s, viewBox: '0 0 24 24', fill: filled ? color : 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const heavyStroke = { ...p, strokeWidth: strokeWidth + 0.5 };
  switch (kind) {
    case 'hea':
      return <svg {...p}><path d="M4 3h16M4 21h16M12 3v18"/></svg>;
    case 'heb':
      return <svg {...heavyStroke}><path d="M4 3h16M4 21h16M12 3v18"/></svg>;
    case 'ipe':
      return <svg {...p}><path d="M6 3h12M6 21h12M12 3v18"/></svg>;
    case 'upn':
      return <svg {...p}><path d="M6 3h12M6 3v18M6 21h12"/></svg>;
    case 'angle':
      return <svg {...heavyStroke}><path d="M4 4v16h16"/></svg>;
    case 'tee':
      return <svg {...p}><path d="M4 4h16M12 4v17"/></svg>;
    case 'pipe':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></svg>;
    case 'sht':
      return <svg {...p}><rect x="3" y="8" width="18" height="8" rx="1"/></svg>;
    case 'rect_tube':
      return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="1"/><rect x="6" y="8" width="12" height="8" rx="0.5"/></svg>;
    case 'sq_tube':
      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="1"/><rect x="7" y="7" width="10" height="10" rx="0.5"/></svg>;
    case 'round_bar':
      return <svg {...p} fill={color}><circle cx="12" cy="12" r="9"/></svg>;
    case 'sq_bar':
      return <svg {...p} fill={color}><rect x="3" y="3" width="18" height="18" rx="1"/></svg>;
    case 'flat':
      return <svg {...p} fill={color}><rect x="2" y="7" width="20" height="10" rx="1"/></svg>;
    default:
      return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
  }
}

// Material chip catalog
const MATERIALS = [
  { id: 'S235', label: 'Steel S235', density: 7850, color: '#a08373' },
  { id: 'S355', label: 'Steel S355', density: 7850, color: '#a08373' },
  { id: 'AL6061', label: 'Aluminum 6061', density: 2700, color: '#9aa6b3' },
  { id: 'SS304', label: 'Stainless 304', density: 8000, color: '#b9bdc4' },
  { id: 'CU', label: 'Copper', density: 8960, color: '#c8835d' },
];

const PROFILES = [
  { id: 'hea_100', kind: 'hea', short: 'HEA 100', group: 'beam' },
  { id: 'heb_120', kind: 'heb', short: 'HEB 120', group: 'beam' },
  { id: 'ipe_140', kind: 'ipe', short: 'IPE 140', group: 'beam' },
  { id: 'upn_80', kind: 'upn', short: 'UPN 80', group: 'channel' },
  { id: 'angle_50', kind: 'angle', short: 'L 50×5', group: 'angle' },
  { id: 'tee_60', kind: 'tee', short: 'T 60', group: 'tee' },
  { id: 'pipe_42', kind: 'pipe', short: 'Ø42 × 3', group: 'tube' },
  { id: 'sq_tube', kind: 'sq_tube', short: '50×50×4', group: 'tube' },
  { id: 'plate_5', kind: 'sht', short: 'Plate 5', group: 'plate' },
  { id: 'round_30', kind: 'round_bar', short: 'Ø30', group: 'bar' },
];

// Format helpers
const fmt = {
  kg: (n) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  eur: (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  intPad: (n, w) => String(n).padStart(w, ' '),
  mono: (n, d=3) => Number(n).toFixed(d),
};

Object.assign(window, { SAMPLE, ProfileGlyph, MATERIALS, PROFILES, fmt });
