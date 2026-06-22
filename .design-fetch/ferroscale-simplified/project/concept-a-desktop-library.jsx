// concept-a-desktop-library.jsx — Saved presets, Projects list (Workstation desktop)

// ─────────────────────────────────────────────────────────────
// Shared atoms (re-declared local to this script's transpilation scope)
// ─────────────────────────────────────────────────────────────
const ADL = {
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
  accent: '#a35a32',
  accentSurface: '#f5e7da',
  accentInk: '#6e3a17',
  pos: '#198560',
};
const ADLSANS = '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif';
const ADLDISP = '-apple-system, "SF Pro Display", "Inter Display", system-ui, sans-serif';
const ADLTAB = '"SF Pro Display", -apple-system, "Inter", system-ui, sans-serif';

function ADLLabel({ children, style }) {
  return <div style={{ fontFamily: ADLSANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, color: ADL.muted, textTransform: 'uppercase', ...style }}>{children}</div>;
}
function ADLKey({ children }) {
  return <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 18, height: 18, padding: '0 5px', borderRadius: 5,
    background: ADL.surface, border: `1px solid ${ADL.borderStrong}`,
    fontFamily: ADLSANS, fontSize: 10, fontWeight: 600, color: ADL.ink2,
    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.06)' }}>{children}</span>;
}
function ADLBtn({ children, primary, ghost, icon }) {
  const base = {
    height: 36, borderRadius: 11, padding: '0 14px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: ADLSANS, fontSize: 12.5, fontWeight: 600, letterSpacing: -0.1, whiteSpace: 'nowrap',
  };
  if (primary) return <div style={{ ...base, background: ADL.ink, color: ADL.bg, boxShadow: '0 10px 20px -10px rgba(0,0,0,0.4)' }}>{icon}{children}</div>;
  if (ghost) return <div style={{ ...base, background: 'transparent', color: ADL.ink2 }}>{icon}{children}</div>;
  return <div style={{ ...base, background: ADL.surface, border: `1px solid ${ADL.border}`, color: ADL.ink }}>{icon}{children}</div>;
}

// Sidebar (re-use from concept-a-desktop.jsx via window)
const Side = (props) => window.ADSidebar(props);

// Topbar with search
function ADLTopbar({ title, sub, actions }) {
  return (
    <div style={{ height: 56, padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${ADL.border}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontFamily: ADLDISP, fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: ADL.ink }}>{title}</div>
        {sub && <div style={{ fontFamily: ADLSANS, fontSize: 12, color: ADL.muted }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ height: 32, width: 240, borderRadius: 10, background: ADL.surface, border: `1px solid ${ADL.border}`,
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
          fontFamily: ADLSANS, fontSize: 12, color: ADL.muted }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          Search…
          <span style={{ marginLeft: 'auto' }}><ADLKey>⌘K</ADLKey></span>
        </div>
        {actions}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Saved presets (full page, table)
// ─────────────────────────────────────────────────────────────
function SavedDesktopA() {
  const items = [
    { p: 'HEA 100', m: 'S235', s: '6 m × 4', kg: '167.4', eur: '502.30', kind: 'hea', tag: 'Shop', updated: '2 min ago' },
    { p: 'IPE 140', m: 'S355', s: '4 m × 12', kg: '624.0', eur: '1 872.00', kind: 'ipe', tag: 'Shop', updated: '12 min ago' },
    { p: '50×50×4', m: 'S235', s: '3 m × 8', kg: '142.6', eur: '427.80', kind: 'sq_tube', tag: 'Frame', updated: 'Today, 09:14' },
    { p: 'L 50×5', m: 'S235', s: '6 m × 4', kg: '88.4', eur: '265.20', kind: 'angle', tag: 'Shop', updated: 'Yesterday' },
    { p: 'Plate 5', m: 'SS 304', s: '2×1 m × 6', kg: '47.1', eur: '305.50', kind: 'sht', tag: 'Kitchen', updated: 'Yesterday' },
    { p: 'Ø42 × 3', m: 'S235', s: '6 m × 6', kg: '101.8', eur: '305.40', kind: 'pipe', tag: 'Frame', updated: '2 days ago' },
    { p: 'UPN 80', m: 'S235', s: '5 m × 4', kg: '172.0', eur: '516.00', kind: 'upn', tag: 'Shop', updated: '3 days ago' },
    { p: 'HEB 120', m: 'S235', s: '4 m × 6', kg: '648.2', eur: '1 944.60', kind: 'heb', tag: 'Shop', updated: '5 days ago' },
    { p: 'Ø30 bar', m: 'S235', s: '6 m × 10', kg: '332.0', eur: '996.00', kind: 'round_bar', tag: 'Unfiled', updated: 'Last week' },
  ];
  return (
    <div style={{ background: ADL.bg, height: '100%', display: 'flex', color: ADL.ink,
      backgroundImage: `radial-gradient(circle at 80% -10%, ${ADL.accentSurface}80, transparent 40%)` }}>
      <Side active="saved" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ADLTopbar title="Saved" sub="9 presets" actions={
          <>
            <ADLBtn ghost icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>}>Filter</ADLBtn>
            <ADLBtn primary icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}>New preset</ADLBtn>
          </>
        } />

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {/* Filter chip row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[
              { l: 'All', n: 9, active: true },
              { l: 'Shop', n: 5 },
              { l: 'Frame', n: 2 },
              { l: 'Kitchen', n: 1 },
              { l: 'Unfiled', n: 1 },
            ].map((c, i) => (
              <div key={i} style={{
                height: 30, padding: '0 12px', borderRadius: 999,
                background: c.active ? ADL.ink : ADL.surface,
                color: c.active ? '#fff' : ADL.ink2,
                border: c.active ? 'none' : `1px solid ${ADL.border}`,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: ADLSANS, fontSize: 12, fontWeight: 600,
              }}>
                {c.l}
                <span style={{ fontFamily: ADLTAB, fontSize: 10.5, fontWeight: 600,
                  padding: '1px 6px', borderRadius: 999,
                  background: c.active ? 'rgba(255,255,255,0.18)' : ADL.surfaceInset,
                  color: c.active ? '#f3ead7' : ADL.muted, fontVariantNumeric: 'tabular-nums' }}>{c.n}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {/* head */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1.6fr 0.9fr 1.2fr 0.9fr 0.9fr 1fr 28px',
              padding: '12px 16px', alignItems: 'center', gap: 12,
              borderBottom: `1px solid ${ADL.border}`, background: ADL.surfaceRaised }}>
              {['', 'Profile', 'Material', 'Geometry', 'Weight', 'Price', 'Updated', ''].map((h, i) => (
                <div key={i} style={{ fontFamily: ADLSANS, fontSize: 10.5, fontWeight: 700, color: ADL.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {items.map((it, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '40px 1.6fr 0.9fr 1.2fr 0.9fr 0.9fr 1fr 28px',
                padding: '12px 16px', alignItems: 'center', gap: 12,
                borderBottom: i < items.length - 1 ? `1px solid ${ADL.border}` : 'none',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: ADL.surfaceInset,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.ink2 }}>
                  <ProfileGlyph kind={it.kind} size={16} strokeWidth={2.3} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: ADLSANS, fontSize: 13, fontWeight: 600, color: ADL.ink, letterSpacing: -0.1 }}>{it.p}</div>
                  <div style={{ fontFamily: ADLSANS, fontSize: 10, fontWeight: 700,
                    color: ADL.accentInk, background: ADL.accentSurface, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.4 }}>{it.tag}</div>
                </div>
                <div style={{ fontFamily: ADLSANS, fontSize: 12.5, color: ADL.ink2 }}>{it.m}</div>
                <div style={{ fontFamily: ADLTAB, fontSize: 12.5, color: ADL.ink2, fontVariantNumeric: 'tabular-nums' }}>{it.s}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <div style={{ fontFamily: ADLTAB, fontSize: 14, fontWeight: 700, color: ADL.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{it.kg}</div>
                  <div style={{ fontFamily: ADLSANS, fontSize: 10.5, color: ADL.muted }}>kg</div>
                </div>
                <div style={{ fontFamily: ADLTAB, fontSize: 12.5, color: ADL.ink, fontVariantNumeric: 'tabular-nums' }}>€ {it.eur}</div>
                <div style={{ fontFamily: ADLSANS, fontSize: 11.5, color: ADL.muted }}>{it.updated}</div>
                <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.muted }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Projects list (full page, grid of cards)
// ─────────────────────────────────────────────────────────────
function ProjectsDesktopA() {
  const projects = [
    { name: 'Skyline tower', sub: '8 parts · S235 mostly', kg: '2 684', eur: '8 011', tone: '#a35a32', updated: '2 min ago', pinned: true,
      mix: [{ k: 'hea', n: 4 }, { k: 'heb', n: 6 }, { k: 'ipe', n: 8 }, { k: 'sq_tube', n: 12 }] },
    { name: 'Workshop mezzanine', sub: '14 parts · mixed', kg: '4 120', eur: '11 240', tone: '#7a6557', updated: 'Yesterday',
      mix: [{ k: 'ipe', n: 12 }, { k: 'angle', n: 8 }, { k: 'sht', n: 4 }] },
    { name: 'Atelier hood', sub: '6 parts · SS 304', kg: '94', eur: '610', tone: '#bcc0c7', updated: '2 days ago',
      mix: [{ k: 'sht', n: 6 }, { k: 'sq_tube', n: 4 }] },
    { name: 'Lab cabling tray', sub: '4 parts · aluminum', kg: '38', eur: '210', tone: '#aab4be', updated: 'Last week',
      mix: [{ k: 'angle', n: 8 }, { k: 'flat', n: 4 }] },
    { name: 'Garden gate', sub: '11 parts · S235', kg: '212', eur: '636', tone: '#a08373', updated: '2 weeks ago',
      mix: [{ k: 'sq_tube', n: 8 }, { k: 'flat', n: 6 }, { k: 'round_bar', n: 8 }] },
    { name: 'Trailer chassis', sub: '22 parts · S355', kg: '1 480', eur: '4 440', tone: '#c08552', updated: 'May 04',
      mix: [{ k: 'upn', n: 4 }, { k: 'sq_tube', n: 14 }, { k: 'sht', n: 6 }] },
  ];
  return (
    <div style={{ background: ADL.bg, height: '100%', display: 'flex', color: ADL.ink,
      backgroundImage: `radial-gradient(circle at 80% -10%, ${ADL.accentSurface}80, transparent 40%)` }}>
      <Side active="projects" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ADLTopbar title="Projects" sub="6 active · 8 628 kg · € 25 147" actions={
          <>
            <ADLBtn ghost icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}>Grid</ADLBtn>
            <ADLBtn primary icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}>New project</ADLBtn>
          </>
        } />

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {projects.map((p, i) => (
              <div key={i} style={{
                background: p.pinned ? ADL.ink : ADL.surface,
                color: p.pinned ? '#fff' : ADL.ink,
                border: `1px solid ${p.pinned ? 'transparent' : ADL.border}`,
                borderRadius: 18, padding: 20, position: 'relative', overflow: 'hidden',
                boxShadow: p.pinned ? '0 24px 60px -30px rgba(0,0,0,0.4)' : 'none',
                minHeight: 200,
              }}>
                {/* Folder tone strip */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: p.tone }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: p.pinned ? 'rgba(255,255,255,0.08)' : ADL.surfaceInset,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.pinned ? '#fff' : ADL.ink2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z"/></svg>
                    </div>
                    <div style={{ fontFamily: ADLSANS, fontSize: 11, color: p.pinned ? '#c8baa3' : ADL.muted }}>{p.updated}</div>
                  </div>
                  {p.pinned && (
                    <div style={{ fontFamily: ADLSANS, fontSize: 10, fontWeight: 700,
                      color: '#fbf7ec', background: 'rgba(255,255,255,0.1)',
                      padding: '3px 8px', borderRadius: 999, letterSpacing: 0.6 }}>PINNED</div>
                  )}
                </div>

                <div style={{ fontFamily: ADLDISP, fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginTop: 16, color: p.pinned ? '#fff' : ADL.ink }}>{p.name}</div>
                <div style={{ fontFamily: ADLSANS, fontSize: 12, color: p.pinned ? '#c8baa3' : ADL.muted, marginTop: 2 }}>{p.sub}</div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: ADLTAB, fontSize: 34, fontWeight: 700, letterSpacing: -1.2, fontVariantNumeric: 'tabular-nums',
                    color: p.pinned ? '#fff' : ADL.ink }}>{p.kg}</div>
                  <div style={{ fontFamily: ADLTAB, fontSize: 14, fontWeight: 600, color: p.pinned ? '#f4c5a4' : ADL.accent }}>kg</div>
                  <div style={{ marginLeft: 'auto', fontFamily: ADLTAB, fontSize: 13, fontWeight: 600,
                    color: p.pinned ? '#dcc8a7' : ADL.ink2, fontVariantNumeric: 'tabular-nums' }}>€ {p.eur}</div>
                </div>

                {/* Part-kind mix */}
                <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.mix.map((m, j) => (
                    <div key={j} style={{
                      height: 24, padding: '0 8px', borderRadius: 8,
                      background: p.pinned ? 'rgba(255,255,255,0.08)' : ADL.surfaceInset,
                      color: p.pinned ? '#f3ead7' : ADL.ink2,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontFamily: ADLSANS, fontSize: 11, fontWeight: 600,
                    }}>
                      <ProfileGlyph kind={m.k} size={11} strokeWidth={2.3} color={p.pinned ? '#f3ead7' : ADL.ink2} />
                      ×{m.n}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{
              border: `1px dashed ${ADL.borderStrong}`, borderRadius: 18, minHeight: 200,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: ADL.ink2,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: ADL.surface, border: `1px solid ${ADL.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <div style={{ fontFamily: ADLSANS, fontSize: 13, fontWeight: 600 }}>New project</div>
              <div style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>Group parts, share a total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SavedDesktopA, ProjectsDesktopA, ADL, ADLSANS, ADLDISP, ADLTAB, ADLLabel, ADLKey, ADLBtn, ADLTopbar });
