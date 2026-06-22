// concept-a-desktop.jsx — Desktop companions for the Numpad-native mobile concept.
// Same cream/orange DNA, same weight-first hierarchy, evolved for the larger canvas.

const AD = {
  bg: '#efeae0',
  surface: '#fbf8f1',
  surfaceRaised: '#f3ede1',
  surfaceInset: '#e6dfd0',
  border: 'rgba(20,18,15,0.07)',
  borderStrong: 'rgba(20,18,15,0.13)',
  ink: '#1a1611',
  ink2: '#4b4339',
  ink3: '#766c5c',
  muted: '#9b9484',
  faint: '#cbc4b3',
  accent: '#a35a32',
  accentHover: '#874829',
  accentSurface: '#f5e7da',
  accentSurfaceStrong: '#edd4be',
  accentInk: '#6e3a17',
  pos: '#198560',
  posSurface: '#e3f1e8',
};

const ADSANS = '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif';
const ADDISP = '-apple-system, "SF Pro Display", "Inter Display", system-ui, sans-serif';
const ADTAB = '"SF Pro Display", -apple-system, "Inter", system-ui, sans-serif';

// ─────────────────────────────────────────────────────────────
// Tiny atoms
// ─────────────────────────────────────────────────────────────
function ADLabel({ children, color, style, ...rest }) {
  return <div {...rest} style={{ fontFamily: ADSANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, color: color || AD.muted, textTransform: 'uppercase', ...style }}>{children}</div>;
}

function ADKey({ children, k }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 18, height: 18, padding: '0 5px',
      borderRadius: 5, background: AD.surface, border: `1px solid ${AD.borderStrong}`,
      fontFamily: ADSANS, fontSize: 10, fontWeight: 600, color: AD.ink2,
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)',
    }}>{children ?? k}</span>
  );
}

function ADBtn({ children, primary, ghost, icon, w }) {
  const base = {
    height: 38, borderRadius: 12, padding: '0 16px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: ADSANS, fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
    whiteSpace: 'nowrap',
    width: w,
  };
  if (primary) return <div style={{ ...base, background: AD.ink, color: AD.bg, boxShadow: '0 10px 20px -10px rgba(0,0,0,0.4)' }}>{icon}{children}</div>;
  if (ghost) return <div style={{ ...base, background: 'transparent', color: AD.ink2 }}>{icon}{children}</div>;
  return <div style={{ ...base, background: AD.surface, border: `1px solid ${AD.border}`, color: AD.ink }}>{icon}{children}</div>;
}

// ─────────────────────────────────────────────────────────────
// Sidebar (used by D1 and D3)
// ─────────────────────────────────────────────────────────────
function ADSidebar({ active = 'calc', collapsed }) {
  const w = collapsed ? 64 : 220;
  const items = [
    { id: 'calc', label: 'Calculator', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v17"/><path d="M2 7h4l3 9H2"/><path d="M15 7h4l3 9h-7"/><path d="M8 7h8"/></svg>
    ) },
    { id: 'saved', label: 'Saved', count: 12, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.6 3.3c1.1.1 1.9 1 1.9 2.2V21l-7.5-3.8L4.5 21V5.5c0-1.1.8-2.1 1.9-2.2 3.7-.4 7.5-.4 11.2 0z"/></svg>
    ) },
    { id: 'projects', label: 'Projects', count: 3, icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z"/></svg>
    ) },
    { id: 'compare', label: 'Compare', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
    ) },
    { id: 'settings', label: 'Settings', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    ) },
  ];

  return (
    <div style={{
      width: w, flexShrink: 0,
      background: AD.surface,
      borderRight: `1px solid ${AD.border}`,
      display: 'flex', flexDirection: 'column', padding: 14,
      transition: 'width .2s',
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 18px' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: AD.ink, color: AD.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: ADDISP, fontSize: 15, fontWeight: 700 }}>f</div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: ADSANS, fontSize: 13.5, fontWeight: 700, color: AD.ink, letterSpacing: -0.2 }}>Ferroscale</div>
            <div style={{ fontFamily: ADSANS, fontSize: 10, color: AD.muted, marginTop: -1 }}>v2026.1</div>
          </div>
        )}
      </div>

      {/* nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const isActive = it.id === active;
          return (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '8px' : '8px 10px',
              borderRadius: 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: isActive ? AD.accentSurface : 'transparent',
              color: isActive ? AD.accentInk : AD.ink2,
              fontFamily: ADSANS, fontSize: 13.5, fontWeight: isActive ? 600 : 500,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.icon}
              </div>
              {!collapsed && <div style={{ flex: 1 }}>{it.label}</div>}
              {!collapsed && it.count && (
                <div style={{ fontFamily: ADTAB, fontSize: 11, fontWeight: 600,
                  padding: '1px 7px', borderRadius: 999,
                  background: isActive ? '#fff8' : AD.surfaceInset,
                  color: isActive ? AD.accentInk : AD.muted,
                  fontVariantNumeric: 'tabular-nums' }}>{it.count}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* recent below nav (D1 / D3 style) */}
      {!collapsed && (
        <>
          <div style={{ height: 1, background: AD.border, margin: '14px 4px' }} />
          <ADLabel style={{ padding: '0 8px 6px' }}>Recent</ADLabel>
          {[
            { p: 'HEA 100', s: '6 m × 4', kg: '167.4' },
            { p: 'IPE 140', s: '4 m × 12', kg: '624.0' },
            { p: '50×50×4', s: '3 m × 8', kg: '142.6' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: AD.surfaceInset,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: AD.ink2 }}>
                <ProfileGlyph kind={['hea','ipe','sq_tube'][i]} size={14} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: ADSANS, fontSize: 12, fontWeight: 600, color: AD.ink, letterSpacing: -0.1 }}>{r.p}</div>
                <div style={{ fontFamily: ADSANS, fontSize: 10.5, color: AD.muted }}>{r.s}</div>
              </div>
              <div style={{ fontFamily: ADTAB, fontSize: 11, fontWeight: 600, color: AD.ink2, fontVariantNumeric: 'tabular-nums' }}>{r.kg}</div>
            </div>
          ))}
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* bottom strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px' }}>
        {!collapsed && <div style={{ fontFamily: ADSANS, fontSize: 11, color: AD.muted }}>Synced · just now</div>}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: AD.surfaceInset, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AD.ink2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Profile picker (shared by D1, D2, D3)
// ─────────────────────────────────────────────────────────────
function ADCategoryRow({ active = 'beam' }) {
  const cats = [
    { id: 'beam', label: 'Beams', icon: 'hea' },
    { id: 'channel', label: 'Channels', icon: 'upn' },
    { id: 'angle', label: 'Angles', icon: 'angle' },
    { id: 'tube', label: 'Tubes', icon: 'sq_tube' },
    { id: 'plate', label: 'Plates & sheets', icon: 'sht' },
    { id: 'bar', label: 'Bars', icon: 'round_bar' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {cats.map((c) => {
        const isActive = c.id === active;
        return (
          <div key={c.id} style={{
            height: 36, padding: '0 14px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: isActive ? AD.accentSurface : AD.surface,
            border: `1px solid ${isActive ? '#d9b69a' : AD.border}`,
            color: isActive ? AD.accentInk : AD.ink2,
            fontFamily: ADSANS, fontSize: 12.5, fontWeight: 600,
          }}>
            <ProfileGlyph kind={c.icon} size={16} strokeWidth={2.2} />
            {c.label}
          </div>
        );
      })}
    </div>
  );
}

function ADProfileGrid({ active = 'hea_100' }) {
  const profiles = [
    { id: 'hea_100', kind: 'hea', label: 'HEA 100' },
    { id: 'hea_120', kind: 'hea', label: 'HEA 120' },
    { id: 'hea_140', kind: 'hea', label: 'HEA 140' },
    { id: 'heb_100', kind: 'heb', label: 'HEB 100' },
    { id: 'heb_120', kind: 'heb', label: 'HEB 120' },
    { id: 'ipe_120', kind: 'ipe', label: 'IPE 120' },
    { id: 'ipe_140', kind: 'ipe', label: 'IPE 140' },
    { id: 'ipe_180', kind: 'ipe', label: 'IPE 180' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
      {profiles.map((p) => {
        const isActive = p.id === active;
        return (
          <div key={p.id} style={{
            background: isActive ? AD.accentSurface : AD.surface,
            border: `1px solid ${isActive ? '#d9b69a' : AD.border}`,
            borderRadius: 12, padding: '10px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            color: isActive ? AD.accent : AD.ink2,
            fontFamily: ADSANS, fontSize: 11, fontWeight: 600, letterSpacing: -0.1,
          }}>
            <ProfileGlyph kind={p.kind} size={22} strokeWidth={2.2} />
            <div style={{ color: isActive ? AD.accentInk : AD.ink }}>{p.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Big result card (right panel for D1)
// ─────────────────────────────────────────────────────────────
function ADResultPanel({ size = 'lg' }) {
  return (
    <div style={{
      background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 20,
      padding: 22, height: '100%', display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ADLabel>Total weight · live</ADLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: ADSANS, fontSize: 10.5, fontWeight: 600, color: AD.pos }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: AD.pos }} /> LIVE
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontFamily: ADTAB, fontSize: size === 'lg' ? 88 : 64, fontWeight: 700, letterSpacing: -3.5, color: AD.ink, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
        <div style={{ fontFamily: ADTAB, fontSize: size === 'lg' ? 26 : 22, fontWeight: 600, color: AD.accent }}>kg</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontFamily: ADTAB, fontSize: 22, fontWeight: 700, color: AD.ink2, fontVariantNumeric: 'tabular-nums' }}>€ 502.30</div>
        <div style={{ fontFamily: ADSANS, fontSize: 11.5, color: AD.muted }}>· @ 1.25/kg</div>
      </div>

      <div style={{ height: 1, background: AD.border, margin: '2px 0' }} />

      <ADLabel>Breakdown</ADLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {[
          { l: 'Per piece', v: '41.85', u: 'kg' },
          { l: 'Per metre', v: '16.7', u: 'kg/m' },
          { l: 'Total length', v: '24.0', u: 'm' },
          { l: 'Waste +5%', v: '8.4', u: 'kg' },
        ].map((s, i) => (
          <div key={i} style={{ background: AD.surfaceRaised, borderRadius: 12, padding: '10px 12px' }}>
            <ADLabel style={{ fontSize: 9.5, letterSpacing: 1 }}>{s.l}</ADLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
              <div style={{ fontFamily: ADTAB, fontSize: 18, fontWeight: 700, color: AD.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{s.v}</div>
              <div style={{ fontFamily: ADSANS, fontSize: 10.5, color: AD.muted }}>{s.u}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* keyboard mini-pad — desktop-native, optional */}
      <div style={{ background: AD.surfaceRaised, borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <ADLabel>Keyboard</ADLabel>
          <div style={{ fontFamily: ADSANS, fontSize: 11, color: AD.muted }}>focus: length</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <ADKey k="↑↓" /> <span style={{ fontFamily: ADSANS, fontSize: 11, color: AD.ink2 }}>step length</span>
          <ADKey k="Tab" /> <span style={{ fontFamily: ADSANS, fontSize: 11, color: AD.ink2 }}>next field</span>
          <ADKey k="⌘S" /> <span style={{ fontFamily: ADSANS, fontSize: 11, color: AD.ink2 }}>save</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <ADBtn primary icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>}>Save</ADBtn>
        <ADBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>}>Compare</ADBtn>
      </div>
    </div>
  );
}

// Length / Pieces / Material strip (used by D1, D2)
function ADInputStrip({ activeField = 'length' }) {
  const fields = [
    { id: 'length', label: 'Length', value: '6.000', unit: 'm', sub: '4500–7500 mm' },
    { id: 'pieces', label: 'Pieces', value: '4', unit: '×', sub: 'integer' },
    { id: 'price', label: 'Unit price', value: '1.25', unit: '€/kg', sub: 'optional' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {fields.map((f) => {
        const active = f.id === activeField;
        return (
          <div key={f.id} style={{
            background: active ? AD.accentSurface : AD.surface,
            border: `1px solid ${active ? '#d9b69a' : AD.border}`,
            borderRadius: 14, padding: '12px 14px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <ADLabel color={active ? AD.accentInk : AD.muted}>{f.label}</ADLabel>
              <div style={{ fontFamily: ADSANS, fontSize: 10, color: active ? AD.accentInk : AD.muted, opacity: 0.7 }}>{f.sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <div style={{ fontFamily: ADTAB, fontSize: 32, fontWeight: 700, color: AD.ink, letterSpacing: -1.2, fontVariantNumeric: 'tabular-nums' }}>{f.value}</div>
              <div style={{ fontFamily: ADSANS, fontSize: 13, fontWeight: 600, color: AD.muted }}>{f.unit}</div>
              {active && <span style={{ width: 2, height: 28, background: AD.accent, marginLeft: 4, alignSelf: 'center', animation: 'aCaret 1s infinite' }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Material picker — desktop variant
function ADMaterialRow({ active = 'S235' }) {
  const list = [
    { id: 'S235', short: 'Steel S235', d: '7850', tone: '#a08373' },
    { id: 'S355', short: 'Steel S355', d: '7850', tone: '#7a6557' },
    { id: 'AL', short: 'Aluminum', d: '2700', tone: '#aab4be' },
    { id: 'SS', short: 'Stainless', d: '8000', tone: '#bcc0c7' },
    { id: 'CU', short: 'Copper', d: '8960', tone: '#c8835d' },
    { id: 'BR', short: 'Brass', d: '8500', tone: '#c4a661' },
    { id: 'OTHER', short: 'Custom…', d: '', tone: '#d6cebd' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {list.map((m) => {
        const isActive = m.id === active;
        return (
          <div key={m.id} style={{
            height: 38, padding: '0 12px',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: isActive ? AD.accentSurface : AD.surface,
            border: `1px solid ${isActive ? '#d9b69a' : AD.border}`,
            borderRadius: 12,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: 999, background: m.tone }} />
            <div style={{ fontFamily: ADSANS, fontSize: 12.5, fontWeight: 600, color: isActive ? AD.accentInk : AD.ink }}>{m.short}</div>
            {m.d && <div style={{ fontFamily: ADTAB, fontSize: 11, color: AD.muted, fontVariantNumeric: 'tabular-nums' }}>· {m.d}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// D1 — Workstation (sidebar + form + sticky result)
// ─────────────────────────────────────────────────────────────
function DesktopA1() {
  return (
    <div style={{ background: AD.bg, height: '100%', display: 'flex', color: AD.ink,
      backgroundImage: `radial-gradient(circle at 80% -10%, ${AD.accentSurface}80, transparent 40%)` }}>
      <ADSidebar active="calc" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 56, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${AD.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontFamily: ADDISP, fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: AD.ink }}>Calculator</div>
            <div style={{ fontFamily: ADSANS, fontSize: 12, color: AD.muted, padding: '4px 10px', background: AD.surface, borderRadius: 999, border: `1px solid ${AD.border}` }}>
              HEA 100 · S235 · 6 m × 4
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              height: 32, width: 280, borderRadius: 10, background: AD.surface, border: `1px solid ${AD.border}`,
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
              fontFamily: ADSANS, fontSize: 12, color: AD.muted,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Find profile, preset, or calc…
              <span style={{ marginLeft: 'auto' }}><ADKey k="⌘K" /></span>
            </div>
            <ADBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>}>New</ADBtn>
          </div>
        </div>

        {/* Body — 2 column */}
        <div style={{ flex: 1, padding: 24, display: 'grid', gridTemplateColumns: '1fr 440px', gap: 20, minHeight: 0 }}>

          {/* Form column */}
          <div style={{ background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 22, overflow: 'auto' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <ADLabel>Profile</ADLabel>
                <div style={{ fontFamily: ADSANS, fontSize: 11.5, color: AD.muted }}>Category → Size</div>
              </div>
              <ADCategoryRow />
              <div style={{ height: 12 }} />
              <ADProfileGrid />
            </div>

            <div style={{ height: 1, background: AD.border }} />

            <div>
              <ADLabel style={{ marginBottom: 10 }}>Geometry</ADLabel>
              <ADInputStrip activeField="length" />
            </div>

            <div style={{ height: 1, background: AD.border }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <ADLabel>Material</ADLabel>
                <div style={{ fontFamily: ADSANS, fontSize: 11.5, color: AD.muted }}>Long-press for custom density</div>
              </div>
              <ADMaterialRow active="S235" />
            </div>

            <div style={{ height: 1, background: AD.border }} />

            {/* Optional advanced — collapsed */}
            <div style={{ background: AD.surfaceRaised, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={AD.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15l-1.5-2.6M4.6 9L6 6.4M15 19.4l-2.6 1.5M9 4.6L6.4 6M19.4 9L21 6.4M4.6 15L6 17.6M15 4.6L17.6 6M9 19.4L6.4 18"/></svg>
                  <div>
                    <div style={{ fontFamily: ADSANS, fontSize: 13, fontWeight: 600, color: AD.ink }}>Advanced</div>
                    <div style={{ fontFamily: ADSANS, fontSize: 11, color: AD.muted }}>VAT, waste %, currency, rounding</div>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={AD.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {/* Result column */}
          <div>
            <ADResultPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// D2 — Stage (no sidebar, centered, single column, hero-up-top)
// ─────────────────────────────────────────────────────────────
function DesktopA2() {
  return (
    <div style={{ background: AD.bg, height: '100%', color: AD.ink, position: 'relative', overflow: 'auto',
      backgroundImage: `radial-gradient(ellipse at 50% -20%, ${AD.accentSurface}80, transparent 50%)` }}>
      {/* Floating top bar */}
      <div style={{
        position: 'sticky', top: 0, height: 56, padding: '0 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(239,234,224,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${AD.border}`, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: AD.ink, color: AD.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: ADDISP, fontSize: 13, fontWeight: 700 }}>f</div>
          <div style={{ fontFamily: ADSANS, fontSize: 13.5, fontWeight: 700, color: AD.ink, letterSpacing: -0.2 }}>Ferroscale</div>
          <div style={{ width: 1, height: 18, background: AD.border, margin: '0 6px' }} />
          <div style={{ fontFamily: ADSANS, fontSize: 12.5, color: AD.ink2 }}>Calculator</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['Saved · 12','Projects · 3','Compare'].map((s, i) => (
            <div key={i} style={{ fontFamily: ADSANS, fontSize: 12.5, fontWeight: 500, color: AD.ink2, padding: '6px 10px', borderRadius: 8 }}>{s}</div>
          ))}
          <ADBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}>
            <span style={{ color: AD.muted }}>Search</span> <ADKey k="⌘K" />
          </ADBtn>
        </div>
      </div>

      {/* Hero centered column */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 36px 80px' }}>
        {/* Tiny over-line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <ADLabel>Live result · auto-saved drafts on</ADLabel>
          <div style={{ flex: 1, height: 1, background: AD.border }} />
          <div style={{ fontFamily: ADTAB, fontSize: 11, color: AD.muted, fontVariantNumeric: 'tabular-nums' }}>Updated 0.2s ago</div>
        </div>

        {/* HERO */}
        <div style={{
          background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 24, padding: '32px 32px 24px',
          boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 60px -30px rgba(0,0,0,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <ADLabel>HEA 100 · S235 · 6 m × 4</ADLabel>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                <div style={{ fontFamily: ADTAB, fontSize: 128, fontWeight: 700, color: AD.ink, letterSpacing: -5.5, lineHeight: 0.88, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
                <div style={{ fontFamily: ADTAB, fontSize: 36, fontWeight: 600, color: AD.accent, letterSpacing: -1 }}>kg</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                <div style={{ fontFamily: ADTAB, fontSize: 22, fontWeight: 700, color: AD.ink2, fontVariantNumeric: 'tabular-nums' }}>€ 502.30</div>
                <div style={{ fontFamily: ADSANS, fontSize: 12.5, color: AD.muted }}>· 16.7 kg/m · 41.85 kg/piece</div>
              </div>
            </div>
            <div style={{ width: 92, height: 92, borderRadius: 22, background: AD.surfaceRaised,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: AD.ink }}>
              <ProfileGlyph kind="hea" size={54} strokeWidth={2.3} />
            </div>
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
            <ADBtn primary w={140} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>}>Save</ADBtn>
            <ADBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>}>Compare</ADBtn>
            <ADBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>}>Share</ADBtn>
            <div style={{ flex: 1 }} />
            <ADBtn ghost icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>}>Reset</ADBtn>
          </div>
        </div>

        {/* Inline form sections */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Section title="Profile" hint="Tap a category, then a size. Or type ⌘K to search.">
            <ADCategoryRow />
            <div style={{ height: 10 }} />
            <ADProfileGrid />
          </Section>

          <Section title="Geometry">
            <ADInputStrip activeField="length" />
          </Section>

          <Section title="Material" hint="Long-press for custom density">
            <ADMaterialRow active="S235" />
          </Section>
        </div>

        {/* Recent */}
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <ADLabel>Recent · last 24 hours</ADLabel>
            <div style={{ fontFamily: ADSANS, fontSize: 12, color: AD.muted }}>View all →</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { p: 'IPE 140', m: 'S355', kg: '624.0', sub: '4 m × 12' },
              { p: '50×50×4', m: 'S235', kg: '142.6', sub: '3 m × 8' },
              { p: 'Plate 5', m: 'SS 304', kg: '47.1', sub: '2×1 m × 6' },
              { p: 'L 50×5', m: 'S235', kg: '88.4', sub: '6 m × 4' },
            ].map((c, i) => (
              <div key={i} style={{ background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 14, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: AD.surfaceInset, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AD.ink2 }}>
                    <ProfileGlyph kind="hea" size={12} strokeWidth={2.3} />
                  </div>
                  <div style={{ fontFamily: ADSANS, fontSize: 12, fontWeight: 600, color: AD.ink }}>{c.p}</div>
                  <div style={{ fontFamily: ADSANS, fontSize: 10.5, color: AD.muted, marginLeft: 'auto' }}>{c.m}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 8 }}>
                  <div style={{ fontFamily: ADTAB, fontSize: 18, fontWeight: 700, color: AD.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{c.kg}</div>
                  <div style={{ fontFamily: ADSANS, fontSize: 10.5, color: AD.muted }}>kg</div>
                  <div style={{ marginLeft: 'auto', fontFamily: ADSANS, fontSize: 10.5, color: AD.muted }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: ADDISP, fontSize: 18, fontWeight: 600, color: AD.ink, letterSpacing: -0.4 }}>{title}</div>
        {hint && <div style={{ fontFamily: ADSANS, fontSize: 11.5, color: AD.muted }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// D3 — Bench (3-pane workshop, project always visible)
// ─────────────────────────────────────────────────────────────
function DesktopA3() {
  return (
    <div style={{ background: AD.bg, height: '100%', display: 'flex', color: AD.ink }}>
      <ADSidebar active="calc" collapsed />

      {/* Middle: form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: `1px solid ${AD.border}` }}>
        <div style={{ height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${AD.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: ADDISP, fontSize: 16, fontWeight: 700, color: AD.ink }}>Calculator</div>
            <div style={{ fontFamily: ADSANS, fontSize: 11.5, color: AD.muted, padding: '3px 8px', background: AD.surface, borderRadius: 999, border: `1px solid ${AD.border}` }}>
              Project · Skyline tower
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ADBtn ghost icon={<ADKey k="⌘K" />}>Search</ADBtn>
            <ADBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}>New</ADBtn>
          </div>
        </div>

        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
          {/* Inline mini-result up top */}
          <div style={{
            background: AD.ink, color: AD.bg, borderRadius: 18, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 14px 30px -18px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProfileGlyph kind="hea" size={26} strokeWidth={2.3} color="#f3ead7" />
              </div>
              <div>
                <div style={{ fontFamily: ADSANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, color: '#c8baa3', textTransform: 'uppercase' }}>Live</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <div style={{ fontFamily: ADTAB, fontSize: 36, fontWeight: 700, letterSpacing: -1.4, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
                  <div style={{ fontFamily: ADTAB, fontSize: 16, fontWeight: 600, color: '#f4c5a4' }}>kg</div>
                  <div style={{ marginLeft: 14, fontFamily: ADTAB, fontSize: 16, fontWeight: 600, color: '#dcc8a7', fontVariantNumeric: 'tabular-nums' }}>€&nbsp;502.30</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ height: 36, padding: '0 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: ADSANS, fontSize: 12.5, fontWeight: 600 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                Save
              </div>
              <div style={{ height: 36, padding: '0 12px', borderRadius: 10, background: AD.accent, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: ADSANS, fontSize: 12.5, fontWeight: 600 }}>
                Add to project
              </div>
            </div>
          </div>

          <div style={{ background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 16, padding: 16 }}>
            <ADLabel style={{ marginBottom: 10 }}>Profile</ADLabel>
            <ADCategoryRow />
            <div style={{ height: 10 }} />
            <ADProfileGrid />
          </div>

          <div style={{ background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 16, padding: 16 }}>
            <ADLabel style={{ marginBottom: 10 }}>Geometry</ADLabel>
            <ADInputStrip activeField="length" />
          </div>

          <div style={{ background: AD.surface, border: `1px solid ${AD.border}`, borderRadius: 16, padding: 16 }}>
            <ADLabel style={{ marginBottom: 10 }}>Material</ADLabel>
            <ADMaterialRow active="S235" />
          </div>
        </div>
      </div>

      {/* Right pane: project */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', background: AD.surface }}>
        <div style={{ height: 56, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${AD.border}` }}>
          <div>
            <div style={{ fontFamily: ADDISP, fontSize: 14, fontWeight: 700, color: AD.ink, letterSpacing: -0.2 }}>Skyline tower</div>
            <div style={{ fontFamily: ADSANS, fontSize: 11, color: AD.muted }}>12 parts · 2,684 kg · € 8 011</div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: AD.surfaceInset, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AD.ink2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </div>
        </div>

        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
          {[
            { p: 'HEA 100', m: 'S235', s: '6 m × 4', kg: '167.4' },
            { p: 'HEB 120', m: 'S235', s: '4 m × 6', kg: '648.2' },
            { p: 'IPE 140', m: 'S355', s: '3.5 m × 8', kg: '364.6' },
            { p: '50×50×4', m: 'S235', s: '3 m × 12', kg: '213.9' },
            { p: 'L 50×5', m: 'S235', s: '6 m × 4', kg: '88.4' },
            { p: 'Plate 5 mm', m: 'S235', s: '2×1 m × 8', kg: '628.0' },
            { p: 'Ø42 × 3', m: 'S235', s: '4 m × 6', kg: '67.9' },
            { p: 'UPN 80', m: 'S235', s: '5 m × 6', kg: '258.0' },
          ].map((row, i) => {
            const isActive = i === 0;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: isActive ? AD.accentSurface : 'transparent',
                border: `1px solid ${isActive ? '#d9b69a' : 'transparent'}`,
                borderRadius: 12,
              }}>
                <div style={{ width: 26, height: 26, borderRadius: 7,
                  background: isActive ? '#fff8' : AD.surfaceInset,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: AD.ink2 }}>
                  <ProfileGlyph kind={['hea','heb','ipe','sq_tube','angle','sht','pipe','upn'][i]} size={14} strokeWidth={2.3} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: ADSANS, fontSize: 12.5, fontWeight: 600, color: AD.ink }}>{row.p} <span style={{ color: AD.muted, fontWeight: 500 }}>· {row.m}</span></div>
                  <div style={{ fontFamily: ADSANS, fontSize: 10.5, color: AD.muted }}>{row.s}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: ADTAB, fontSize: 13, fontWeight: 700, color: AD.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{row.kg}</div>
                  <div style={{ fontFamily: ADSANS, fontSize: 10, color: AD.muted }}>kg</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sum strip */}
        <div style={{
          padding: '14px 16px', borderTop: `1px solid ${AD.border}`,
          background: AD.surfaceRaised,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <ADLabel>Project total</ADLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <div style={{ fontFamily: ADTAB, fontSize: 26, fontWeight: 700, color: AD.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.8 }}>2,684</div>
              <div style={{ fontFamily: ADSANS, fontSize: 13, color: AD.accent, fontWeight: 600 }}>kg</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: ADSANS, fontSize: 10.5, color: AD.muted, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>≈ Cost</div>
            <div style={{ fontFamily: ADTAB, fontSize: 18, fontWeight: 700, color: AD.ink, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>€ 8,011</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DesktopA1, DesktopA2, DesktopA3 });
