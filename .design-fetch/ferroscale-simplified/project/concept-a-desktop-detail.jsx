// concept-a-desktop-detail.jsx — Project detail page + Compare page (Workstation desktop)

const ADSide = (props) => window.ADSidebar(props);

// ─────────────────────────────────────────────────────────────
// Project detail
// ─────────────────────────────────────────────────────────────
function ProjectDetailDesktopA() {
  const parts = [
    { kind: 'hea', p: 'HEA 100', m: 'S235', s: '6 m × 4', kgm: '16.7', kg: '167.4', eur: '502.30' },
    { kind: 'heb', p: 'HEB 120', m: 'S235', s: '4 m × 6', kgm: '26.7', kg: '648.2', eur: '1 944.60' },
    { kind: 'ipe', p: 'IPE 140', m: 'S355', s: '3.5 m × 8', kgm: '12.9', kg: '364.6', eur: '1 312.60' },
    { kind: 'sq_tube', p: '50×50×4', m: 'S235', s: '3 m × 12', kgm: '5.94', kg: '213.9', eur: '641.70' },
    { kind: 'angle', p: 'L 50×5', m: 'S235', s: '6 m × 4', kgm: '3.68', kg: '88.4', eur: '265.20' },
    { kind: 'sht', p: 'Plate 5', m: 'S235', s: '2×1 × 8', kgm: '39.25', kg: '628.0', eur: '1 884.00' },
    { kind: 'pipe', p: 'Ø42 × 3', m: 'S235', s: '4 m × 6', kgm: '2.83', kg: '67.9', eur: '203.70' },
    { kind: 'upn', p: 'UPN 80', m: 'S235', s: '5 m × 6', kgm: '8.60', kg: '258.0', eur: '774.00' },
  ];
  const totalKg = '2 436.4';
  const totalEur = '7 528.10';
  return (
    <div style={{ background: ADL.bg, height: '100%', display: 'flex', color: ADL.ink,
      backgroundImage: `radial-gradient(circle at 80% -10%, ${ADL.accentSurface}80, transparent 40%)` }}>
      <ADSide active="projects" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* breadcrumb topbar */}
        <div style={{ height: 56, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${ADL.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: ADLSANS, fontSize: 12.5 }}>
            <span style={{ color: ADL.muted }}>Projects</span>
            <span style={{ color: ADL.muted }}>›</span>
            <span style={{ color: ADL.ink, fontWeight: 600 }}>Skyline tower</span>
            <span style={{ marginLeft: 10, padding: '2px 8px', borderRadius: 999, background: ADL.accentSurface, color: ADL.accentInk, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4 }}>EDITING</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ADLBtn ghost icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>}>Export CSV</ADLBtn>
            <ADLBtn icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 17l5-5-5-5M21 12H9"/></svg>}>Share</ADLBtn>
            <ADLBtn primary icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}>Add part</ADLBtn>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, overflow: 'auto' }}>
          {/* Main */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Hero */}
            <div style={{
              background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 20,
              padding: '22px 26px', boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <ADLLabel>Project · live total</ADLLabel>
                <div style={{ fontFamily: ADLDISP, fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginTop: 6, color: ADL.ink }}>Skyline tower</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                  <div style={{ fontFamily: ADLTAB, fontSize: 72, fontWeight: 700, color: ADL.ink, letterSpacing: -3, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>{totalKg}</div>
                  <div style={{ fontFamily: ADLTAB, fontSize: 22, fontWeight: 600, color: ADL.accent }}>kg</div>
                </div>
                <div style={{ marginTop: 6, fontFamily: ADLTAB, fontSize: 16, fontWeight: 600, color: ADL.ink2, fontVariantNumeric: 'tabular-nums' }}>
                  € {totalEur} <span style={{ color: ADL.muted, fontWeight: 500 }}>· avg 3.09 €/kg</span>
                </div>
              </div>

              {/* Stacked bar — composition by part */}
              <div style={{ width: 320 }}>
                <ADLLabel style={{ marginBottom: 8 }}>Composition by weight</ADLLabel>
                <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: ADL.surfaceInset }}>
                  {[
                    { c: '#a35a32', f: 648 },
                    { c: '#c08552', f: 628 },
                    { c: '#7a6557', f: 364 },
                    { c: '#d5a778', f: 258 },
                    { c: '#a08373', f: 213 },
                    { c: '#bf8f5e', f: 167 },
                    { c: '#967e6c', f: 88 },
                    { c: '#cbab90', f: 67 },
                  ].map((s, i) => <div key={i} style={{ flex: s.f, background: s.c }} />)}
                </div>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { c: '#a35a32', l: 'HEB' },
                    { c: '#c08552', l: 'Plate' },
                    { c: '#7a6557', l: 'IPE' },
                    { c: '#d5a778', l: 'UPN' },
                    { c: '#a08373', l: 'Tube' },
                    { c: '#bf8f5e', l: 'HEA' },
                    { c: '#967e6c', l: 'Angle' },
                    { c: '#cbab90', l: 'Pipe' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontFamily: ADLSANS, fontSize: 10.5, color: ADL.ink2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />
                      {s.l}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Parts table */}
            <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${ADL.border}` }}>
                <ADLLabel>Parts · 8</ADLLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <ADLBtn ghost icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>}>Sort · added</ADLBtn>
                  <ADLBtn ghost icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>}>Group · by profile</ADLBtn>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 1.6fr 0.8fr 1.2fr 0.9fr 0.9fr 1fr 28px',
                padding: '10px 18px', alignItems: 'center', gap: 12,
                background: ADL.surfaceRaised, borderBottom: `1px solid ${ADL.border}` }}>
                {['', 'Profile', 'Material', 'Geometry', 'kg/m', 'Weight', 'Price', ''].map((h, i) => (
                  <div key={i} style={{ fontFamily: ADLSANS, fontSize: 10.5, fontWeight: 700, color: ADL.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {parts.map((p, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '36px 1.6fr 0.8fr 1.2fr 0.9fr 0.9fr 1fr 28px',
                  padding: '12px 18px', alignItems: 'center', gap: 12,
                  borderBottom: i < parts.length - 1 ? `1px solid ${ADL.border}` : 'none',
                }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: ADL.surfaceInset,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.ink2 }}>
                    <ProfileGlyph kind={p.kind} size={14} strokeWidth={2.3} />
                  </div>
                  <div style={{ fontFamily: ADLSANS, fontSize: 13, fontWeight: 600, color: ADL.ink, letterSpacing: -0.1 }}>{p.p}</div>
                  <div style={{ fontFamily: ADLSANS, fontSize: 12.5, color: ADL.ink2 }}>{p.m}</div>
                  <div style={{ fontFamily: ADLTAB, fontSize: 12.5, color: ADL.ink2, fontVariantNumeric: 'tabular-nums' }}>{p.s}</div>
                  <div style={{ fontFamily: ADLTAB, fontSize: 12.5, color: ADL.ink2, fontVariantNumeric: 'tabular-nums' }}>{p.kgm}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <div style={{ fontFamily: ADLTAB, fontSize: 13.5, fontWeight: 700, color: ADL.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{p.kg}</div>
                    <div style={{ fontFamily: ADLSANS, fontSize: 10.5, color: ADL.muted }}>kg</div>
                  </div>
                  <div style={{ fontFamily: ADLTAB, fontSize: 12.5, color: ADL.ink, fontVariantNumeric: 'tabular-nums' }}>€ {p.eur}</div>
                  <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.muted }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>
                  </div>
                </div>
              ))}
              {/* Add row */}
              <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, color: ADL.ink2, background: ADL.surfaceRaised }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: ADL.surface, border: `1px dashed ${ADL.borderStrong}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.accent }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <div style={{ fontFamily: ADLSANS, fontSize: 12.5, fontWeight: 600 }}>Add part — opens calculator pinned to this project</div>
              </div>
            </div>
          </div>

          {/* Sidebar: notes + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 16, padding: 16 }}>
              <ADLLabel>Project details</ADLLabel>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Status', 'In progress'],
                  ['Owner', 'You'],
                  ['Created', 'Apr 28, 2026'],
                  ['Updated', '2 min ago'],
                  ['Default material', 'Steel S235'],
                  ['Waste allowance', '+5%'],
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: ADLSANS, fontSize: 11.5, color: ADL.muted }}>{r[0]}</div>
                    <div style={{ fontFamily: ADLSANS, fontSize: 12.5, fontWeight: 600, color: ADL.ink }}>{r[1]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <ADLLabel>Notes</ADLLabel>
                <div style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>Markdown</div>
              </div>
              <div style={{ marginTop: 10, fontFamily: ADLSANS, fontSize: 12.5, color: ADL.ink2, lineHeight: 1.5 }}>
                Stair stringers + landing braces.<br/>
                Plates to be cut at supplier — confirm tolerance ±2 mm.<br/>
                <span style={{ color: ADL.muted }}>Add price update once quote returns Fri.</span>
              </div>
            </div>

            <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 16, padding: 16 }}>
              <ADLLabel>History</ADLLabel>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['2 min ago', 'Added HEA 100 × 4'],
                  ['09:14', 'Updated Plate 5 length'],
                  ['Yesterday', 'Renamed from “Tower v2”'],
                  ['Apr 28', 'Created'],
                ].map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '88px 1fr', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>{r[0]}</div>
                    <div style={{ fontFamily: ADLSANS, fontSize: 12, color: ADL.ink2 }}>{r[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Compare (desktop)
// ─────────────────────────────────────────────────────────────
function CompareDesktopA() {
  const cards = [
    { kind: 'hea', p: 'HEA 100', m: 'S235', kgm: '16.7', kg: '167.4', eur: '502.30', delta: 'BASE', tone: ADL.ink2, base: true },
    { kind: 'ipe', p: 'IPE 140', m: 'S235', kgm: '12.9', kg: '309.6', eur: '929.00', delta: '+85%', tone: ADL.accent },
    { kind: 'heb', p: 'HEB 120', m: 'S235', kgm: '26.7', kg: '640.8', eur: '1 922.40', delta: '+283%', tone: ADL.accent },
  ];
  return (
    <div style={{ background: ADL.bg, height: '100%', display: 'flex', color: ADL.ink,
      backgroundImage: `radial-gradient(circle at 80% -10%, ${ADL.accentSurface}80, transparent 40%)` }}>
      <ADSide active="compare" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ADLTopbar title="Compare" sub="3 items · 6 m × 4 · S235" actions={
          <>
            <ADLBtn ghost>Reset</ADLBtn>
            <ADLBtn primary icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}>Add column</ADLBtn>
          </>
        } />

        <div style={{ flex: 1, padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Cards row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {cards.map((c, i) => (
              <div key={i} style={{
                background: c.base ? ADL.surface : ADL.accentSurface,
                border: `1px solid ${c.base ? ADL.border : '#d9b69a'}`,
                borderRadius: 18, padding: 20, position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: c.base ? ADL.surfaceInset : '#fff8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.base ? ADL.ink2 : ADL.accentInk }}>
                      <ProfileGlyph kind={c.kind} size={18} strokeWidth={2.3} />
                    </div>
                    <div>
                      <div style={{ fontFamily: ADLSANS, fontSize: 13.5, fontWeight: 700, color: ADL.ink, letterSpacing: -0.2 }}>{c.p}</div>
                      <div style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>{c.m}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: ADLSANS, fontSize: 10.5, fontWeight: 700,
                    color: c.base ? ADL.ink2 : ADL.accentInk,
                    background: c.base ? ADL.surfaceInset : '#fff8',
                    padding: '3px 8px', borderRadius: 999, letterSpacing: 0.6 }}>{c.delta}</div>
                </div>

                <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontFamily: ADLTAB, fontSize: 54, fontWeight: 700, color: ADL.ink, letterSpacing: -2, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>{c.kg}</div>
                  <div style={{ fontFamily: ADLTAB, fontSize: 18, fontWeight: 600, color: ADL.accent }}>kg</div>
                </div>
                <div style={{ marginTop: 6, fontFamily: ADLTAB, fontSize: 14, fontWeight: 600, color: ADL.ink2, fontVariantNumeric: 'tabular-nums' }}>
                  € {c.eur} <span style={{ color: ADL.muted, fontWeight: 500 }}>· {c.kgm} kg/m</span>
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
                  <ADLBtn ghost icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>}>Save</ADLBtn>
                  <ADLBtn ghost>Make base</ADLBtn>
                  <div style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 8,
                    background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.muted }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-side spec table */}
          <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${ADL.border}` }}>
              <ADLLabel>Side-by-side</ADLLabel>
            </div>
            {[
              ['Linear weight', '16.7 kg/m', '12.9 kg/m', '26.7 kg/m'],
              ['Length × pieces', '6 m × 4', '6 m × 4', '6 m × 4'],
              ['Weight per piece', '41.85 kg', '77.40 kg', '160.20 kg'],
              ['Total weight', '167.4 kg', '309.6 kg', '640.8 kg'],
              ['Total length', '24.0 m', '24.0 m', '24.0 m'],
              ['Unit price', '3.00 €/kg', '3.00 €/kg', '3.00 €/kg'],
              ['Total cost', '€ 502.30', '€ 929.00', '€ 1 922.40'],
              ['Section modulus', 'Wx 72.8 cm³', 'Wx 88.3 cm³', 'Wx 144 cm³'],
            ].map((r, i, a) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                padding: '11px 18px', alignItems: 'center', gap: 12,
                borderBottom: i < a.length - 1 ? `1px solid ${ADL.border}` : 'none',
                background: i % 2 === 1 ? ADL.surfaceRaised : 'transparent',
              }}>
                <div style={{ fontFamily: ADLSANS, fontSize: 12, color: ADL.muted }}>{r[0]}</div>
                <div style={{ fontFamily: ADLTAB, fontSize: 13, fontWeight: 600, color: ADL.ink, fontVariantNumeric: 'tabular-nums' }}>{r[1]}</div>
                <div style={{ fontFamily: ADLTAB, fontSize: 13, fontWeight: 700, color: ADL.accent, fontVariantNumeric: 'tabular-nums' }}>{r[2]}</div>
                <div style={{ fontFamily: ADLTAB, fontSize: 13, fontWeight: 700, color: ADL.accent, fontVariantNumeric: 'tabular-nums' }}>{r[3]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProjectDetailDesktopA, CompareDesktopA });
