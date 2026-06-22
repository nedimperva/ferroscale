// concept-a-mobile-library.jsx — Saved list, Projects list, Project detail

// ─────────────────────────────────────────────────────────────
// Bottom tab bar (used on full-page mobile screens)
// ─────────────────────────────────────────────────────────────
function AMTabBar({ active = 'calc' }) {
  const tabs = [
    { id: 'calc', label: 'Calculator', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v17"/><path d="M2 7h4l3 9H2"/><path d="M15 7h4l3 9h-7"/><path d="M8 7h8"/></svg>
    ) },
    { id: 'saved', label: 'Saved', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    ) },
    { id: 'projects', label: 'Projects', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z"/></svg>
    ) },
    { id: 'settings', label: 'Settings', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    ) },
  ];
  return (
    <div style={{
      position: 'absolute', left: 14, right: 14, bottom: 14,
      background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 22,
      padding: 6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      boxShadow: '0 14px 30px -16px rgba(0,0,0,0.18)',
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <div key={t.id} style={{
            height: 50, borderRadius: 16,
            background: isActive ? AM.accentSurface : 'transparent',
            color: isActive ? AM.accent : AM.muted,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
          }}>
            {t.icon}
            <div style={{ fontFamily: AMSANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.2,
              color: isActive ? AM.accentInk : AM.muted }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Saved presets list
// ─────────────────────────────────────────────────────────────
function SavedA() {
  const items = [
    { p: 'HEA 100', m: 'S235', s: '6 m × 4', kg: '167.4', eur: '502.30', kind: 'hea', tag: 'Shop' },
    { p: 'IPE 140', m: 'S355', s: '4 m × 12', kg: '624.0', eur: '1 872.00', kind: 'ipe', tag: 'Shop' },
    { p: '50×50×4', m: 'S235', s: '3 m × 8', kg: '142.6', eur: '427.80', kind: 'sq_tube', tag: 'Frame' },
    { p: 'L 50×5', m: 'S235', s: '6 m × 4', kg: '88.4', eur: '265.20', kind: 'angle', tag: 'Shop' },
    { p: 'Plate 5', m: 'SS 304', s: '2×1 m × 6', kg: '47.1', eur: '305.50', kind: 'sht', tag: 'Kitchen' },
    { p: 'Ø42 × 3', m: 'S235', s: '6 m × 6', kg: '101.8', eur: '305.40', kind: 'pipe', tag: 'Frame' },
    { p: 'UPN 80', m: 'S235', s: '5 m × 4', kg: '172.0', eur: '516.00', kind: 'upn', tag: 'Shop' },
  ];
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', paddingBottom: 92 }}>
      {/* Header */}
      <div style={{ padding: '58px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AMDISP, fontSize: 30, fontWeight: 700, letterSpacing: -1.2, color: AM.ink }}>Saved</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <AMIconBtn>{ICON.search}</AMIconBtn>
            <AMIconBtn>{ICON.more}</AMIconBtn>
          </div>
        </div>
        <div style={{ fontFamily: AMSANS, fontSize: 13.5, color: AM.ink2, marginTop: 4 }}>
          12 presets · sorted by recent
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: '14px 14px 8px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {[
          { l: 'All', n: 12, active: true },
          { l: 'Shop', n: 5 },
          { l: 'Frame', n: 3 },
          { l: 'Kitchen', n: 2 },
          { l: 'Unfiled', n: 2 },
        ].map((c, i) => (
          <div key={i} style={{
            height: 30, padding: '0 12px', borderRadius: 999,
            background: c.active ? AM.ink : AM.surface,
            color: c.active ? '#fff' : AM.ink2,
            border: c.active ? 'none' : `1px solid ${AM.border}`,
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            fontFamily: AMSANS, fontSize: 12, fontWeight: 600,
          }}>
            {c.l}
            <span style={{ fontFamily: AMTAB, fontSize: 10.5, fontWeight: 600,
              padding: '1px 6px', borderRadius: 999,
              background: c.active ? 'rgba(255,255,255,0.18)' : AM.surfaceInset,
              color: c.active ? '#f3ead7' : AM.muted, fontVariantNumeric: 'tabular-nums' }}>{c.n}</span>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '6px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 16,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: AM.surfaceInset,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: AM.ink2 }}>
              <ProfileGlyph kind={it.kind} size={20} strokeWidth={2.3} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontFamily: AMSANS, fontSize: 14, fontWeight: 700, color: AM.ink, letterSpacing: -0.2 }}>{it.p}</div>
                <div style={{ fontFamily: AMSANS, fontSize: 11, color: AM.muted }}>· {it.m}</div>
                <div style={{ marginLeft: 'auto', fontFamily: AMSANS, fontSize: 10, fontWeight: 700,
                  color: AM.accentInk, background: AM.accentSurface, padding: '2px 7px', borderRadius: 999, letterSpacing: 0.4 }}>{it.tag}</div>
              </div>
              <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted, marginTop: 2 }}>{it.s}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: AMTAB, fontSize: 17, fontWeight: 700, color: AM.ink, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>{it.kg}</div>
                <div style={{ fontFamily: AMSANS, fontSize: 10.5, color: AM.muted }}>kg</div>
              </div>
              <div style={{ fontFamily: AMTAB, fontSize: 11, color: AM.muted, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>€ {it.eur}</div>
            </div>
          </div>
        ))}
      </div>

      <AMTabBar active="saved" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Projects list
// ─────────────────────────────────────────────────────────────
function ProjectsA() {
  const projects = [
    { name: 'Skyline tower', sub: '8 parts · steel', kg: '2 684', eur: '8 011', tone: '#a08373', updated: '2 min ago' },
    { name: 'Workshop mezzanine', sub: '14 parts · mixed', kg: '4 120', eur: '11 240', tone: '#7a6557', updated: 'Yesterday' },
    { name: 'Atelier hood', sub: '6 parts · SS 304', kg: '94', eur: '610', tone: '#bcc0c7', updated: '2 days ago' },
    { name: 'Lab cabling tray', sub: '4 parts · aluminum', kg: '38', eur: '210', tone: '#aab4be', updated: 'Last week' },
  ];
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', paddingBottom: 92 }}>
      <div style={{ padding: '58px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AMDISP, fontSize: 30, fontWeight: 700, letterSpacing: -1.2, color: AM.ink }}>Projects</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <AMIconBtn>{ICON.search}</AMIconBtn>
            <div style={{ height: 30, padding: '0 12px', borderRadius: 999, background: AM.ink, color: '#fff',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: AMSANS, fontSize: 12, fontWeight: 700 }}>
              {ICON.plus} New
            </div>
          </div>
        </div>
        <div style={{ fontFamily: AMSANS, fontSize: 13.5, color: AM.ink2, marginTop: 4 }}>
          4 active · 6 824 kg · € 20 071
        </div>
      </div>

      {/* Pinned highlight card */}
      <div style={{ margin: '18px 14px 8px',
        background: AM.ink, color: '#fff', borderRadius: 20, padding: '16px 18px',
        boxShadow: '0 14px 30px -18px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AMSANS, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: '#c8baa3', textTransform: 'uppercase' }}>Active project</div>
          <div style={{ fontFamily: AMSANS, fontSize: 10.5, color: '#9d9281' }}>Pinned</div>
        </div>
        <div style={{ fontFamily: AMDISP, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 4 }}>Skyline tower</div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { l: 'Parts', v: '8' },
            { l: 'Weight', v: '2 684', u: 'kg' },
            { l: 'Cost', v: '€ 8 011' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: AMSANS, fontSize: 9.5, fontWeight: 700, color: '#9d9281', letterSpacing: 1.2, textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 3 }}>
                <div style={{ fontFamily: AMTAB, fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{s.v}</div>
                {s.u && <div style={{ fontFamily: AMSANS, fontSize: 11, color: '#dcc8a7' }}>{s.u}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '4px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((p, i) => (
          <div key={i} style={{
            background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 16,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: p.tone, opacity: 0.85,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {ICON.folder}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: AMSANS, fontSize: 14, fontWeight: 700, color: AM.ink, letterSpacing: -0.2 }}>{p.name}</div>
              <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted, marginTop: 1 }}>{p.sub} · {p.updated}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: AMTAB, fontSize: 16, fontWeight: 700, color: AM.ink, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>{p.kg}</div>
                <div style={{ fontFamily: AMSANS, fontSize: 10.5, color: AM.muted }}>kg</div>
              </div>
              <div style={{ fontFamily: AMTAB, fontSize: 11, color: AM.muted, fontVariantNumeric: 'tabular-nums' }}>€ {p.eur}</div>
            </div>
          </div>
        ))}

        <div style={{
          marginTop: 4, height: 56, borderRadius: 16,
          border: `1px dashed ${AM.borderStrong}`, background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: AM.ink2,
          fontFamily: AMSANS, fontSize: 13, fontWeight: 600,
        }}>
          {ICON.plus} New project
        </div>
      </div>

      <AMTabBar active="projects" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Project detail
// ─────────────────────────────────────────────────────────────
function ProjectDetailA() {
  const parts = [
    { kind: 'hea', p: 'HEA 100', m: 'S235', s: '6 m × 4', kg: '167.4' },
    { kind: 'heb', p: 'HEB 120', m: 'S235', s: '4 m × 6', kg: '648.2' },
    { kind: 'ipe', p: 'IPE 140', m: 'S355', s: '3.5 m × 8', kg: '364.6' },
    { kind: 'sq_tube', p: '50×50×4', m: 'S235', s: '3 m × 12', kg: '213.9' },
    { kind: 'angle', p: 'L 50×5', m: 'S235', s: '6 m × 4', kg: '88.4' },
    { kind: 'sht', p: 'Plate 5', m: 'S235', s: '2×1 × 8', kg: '628.0' },
    { kind: 'pipe', p: 'Ø42 × 3', m: 'S235', s: '4 m × 6', kg: '67.9' },
    { kind: 'upn', p: 'UPN 80', m: 'S235', s: '5 m × 6', kg: '258.0' },
  ];
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', paddingBottom: 110 }}>
      <AMNavBar
        title="Skyline tower"
        leading={<AMIconBtn>{ICON.back}</AMIconBtn>}
        trailing={<AMIconBtn>{ICON.more}</AMIconBtn>}
      />

      {/* Hero numbers */}
      <div style={{ margin: '0 14px',
        background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 22,
        padding: '16px 18px 14px',
        boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset' }}>
        <AMLabel>Project total · live</AMLabel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <div style={{ fontFamily: AMTAB, fontSize: 60, fontWeight: 700, color: AM.ink, letterSpacing: -2.2, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>2 684</div>
          <div style={{ fontFamily: AMTAB, fontSize: 22, fontWeight: 600, color: AM.accent }}>kg</div>
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AMSANS, fontSize: 12.5, color: AM.ink2 }}>8 parts · S235 mostly</div>
          <div style={{ fontFamily: AMTAB, fontSize: 14, fontWeight: 600, color: AM.ink, fontVariantNumeric: 'tabular-nums' }}>€ 8 011</div>
        </div>

        {/* Stacked composition bar */}
        <div style={{ marginTop: 12, display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ flex: 648, background: '#a35a32' }} />
          <div style={{ flex: 628, background: '#c08552' }} />
          <div style={{ flex: 364, background: '#7a6557' }} />
          <div style={{ flex: 258, background: '#d5a778' }} />
          <div style={{ flex: 213, background: '#a08373' }} />
          <div style={{ flex: 167, background: '#bf8f5e' }} />
          <div style={{ flex: 88, background: '#967e6c' }} />
          <div style={{ flex: 67, background: '#cbab90' }} />
        </div>
      </div>

      {/* Section header */}
      <div style={{ padding: '18px 18px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <AMLabel>Parts</AMLabel>
        <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted }}>Sort · added</div>
      </div>

      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 14,
            padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: AM.surfaceInset,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: AM.ink2 }}>
              <ProfileGlyph kind={p.kind} size={18} strokeWidth={2.3} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: AMSANS, fontSize: 13.5, fontWeight: 600, color: AM.ink, letterSpacing: -0.1 }}>{p.p} <span style={{ color: AM.muted, fontWeight: 500 }}>· {p.m}</span></div>
              <div style={{ fontFamily: AMSANS, fontSize: 11, color: AM.muted }}>{p.s}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: AMTAB, fontSize: 14, fontWeight: 700, color: AM.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{p.kg}</div>
              <div style={{ fontFamily: AMSANS, fontSize: 10, color: AM.muted }}>kg</div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating add bar */}
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 18,
        background: AM.ink, borderRadius: 18, padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 14px 30px -10px rgba(0,0,0,0.4)' }}>
        <div>
          <div style={{ fontFamily: AMSANS, fontSize: 10, fontWeight: 700, color: '#c8baa3', letterSpacing: 1.4, textTransform: 'uppercase' }}>Add to project</div>
          <div style={{ fontFamily: AMSANS, fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 1 }}>Open Calculator → tap Add</div>
        </div>
        <div style={{ height: 38, padding: '0 14px', borderRadius: 12, background: AM.accent, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: AMSANS, fontSize: 13, fontWeight: 700 }}>
          {ICON.plus} Add part
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AMTabBar, SavedA, ProjectsA, ProjectDetailA });
