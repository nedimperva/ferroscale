// concept-a-desktop-settings.jsx — Settings full page + ⌘K Command palette overlay

const ASSide = (props) => window.ADSidebar(props);

// ─────────────────────────────────────────────────────────────
// Settings (full page · defaults dashboard)
// ─────────────────────────────────────────────────────────────
function SettingsDesktopA() {
  return (
    <div style={{ background: ADL.bg, height: '100%', display: 'flex', color: ADL.ink,
      backgroundImage: `radial-gradient(circle at 80% -10%, ${ADL.accentSurface}80, transparent 40%)` }}>
      <ASSide active="settings" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ADLTopbar title="Settings" sub="Defaults applied at every calc" actions={null} />

        <div style={{ flex: 1, padding: 28, overflow: 'auto' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Defaults summary hero */}
            <div style={{
              background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 20,
              padding: 22, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24,
              boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset',
            }}>
              <div>
                <ADLLabel>What happens when you open Ferroscale</ADLLabel>
                <div style={{ fontFamily: ADLDISP, fontSize: 24, fontWeight: 700, marginTop: 6, color: ADL.ink, letterSpacing: -0.4 }}>
                  HEA 100 · 6 m × 4 · Steel S235
                </div>
                <div style={{ fontFamily: ADLSANS, fontSize: 13, color: ADL.ink2, marginTop: 6, lineHeight: 1.5 }}>
                  You'll land on the calculator with these values pre-filled. Adjust below and the home screen follows.
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <ADLBtn primary>Save defaults</ADLBtn>
                  <ADLBtn ghost>Reset to recommended</ADLBtn>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Profile', 'HEA 100'],
                  ['Material', 'Steel S235'],
                  ['Length unit', 'metres'],
                  ['Currency', 'EUR'],
                ].map((r, i) => (
                  <div key={i} style={{ background: ADL.surfaceRaised, borderRadius: 12, padding: '12px 14px' }}>
                    <ADLLabel>{r[0]}</ADLLabel>
                    <div style={{ fontFamily: ADLSANS, fontSize: 14, fontWeight: 600, color: ADL.ink, marginTop: 4, letterSpacing: -0.2 }}>{r[1]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-column grid of setting groups */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <SettingsGroup title="Display" rows={[
                { l: 'Appearance', v: 'Light' },
                { l: 'Density of values', v: 'Comfortable' },
                { l: 'Show price inline', toggle: true, on: true },
                { l: 'Tabular numerals', toggle: true, on: true },
              ]} />
              <SettingsGroup title="Numbers" rows={[
                { l: 'Length unit', v: 'm (metres)' },
                { l: 'Weight unit', v: 'kg' },
                { l: 'Currency', v: 'EUR · €' },
                { l: 'Decimal separator', v: '. (point)' },
                { l: 'Thousands separator', v: '  (thin space)' },
              ]} />
              <SettingsGroup title="Calculation" rows={[
                { l: 'Default material', v: 'Steel S235' },
                { l: 'Default profile', v: 'HEA 100' },
                { l: 'Waste allowance', v: '+5%' },
                { l: 'VAT', v: 'Off' },
                { l: 'Round price to', v: '€ 0.10' },
              ]} />
              <SettingsGroup title="Power user" rows={[
                { l: 'Keyboard shortcuts', v: 'On' },
                { l: 'Haptic feedback (mobile)', toggle: true, on: true },
                { l: 'Cloud sync', v: 'Google Drive' },
                { l: 'Export format', v: 'CSV · XLSX · PDF' },
                { l: 'Beta features', toggle: true, on: false, note: 'Includes Columns (preview)' },
              ]} />
            </div>

            {/* Hidden / labs row */}
            <div style={{
              background: ADL.surfaceRaised, border: `1px dashed ${ADL.borderStrong}`, borderRadius: 16, padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: ADL.surface, border: `1px solid ${ADL.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: ADL.ink2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v8L4 20a2 2 0 002 2h12a2 2 0 002-2L14 10V2"/><path d="M9 2h6"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: ADLSANS, fontSize: 13.5, fontWeight: 700, color: ADL.ink }}>Labs · hidden by default</div>
                <div style={{ fontFamily: ADLSANS, fontSize: 12, color: ADL.ink2, marginTop: 2 }}>
                  Columns (multi-result side-by-side) is paused behind a feature flag — turn on Beta features above to opt in once it ships.
                </div>
              </div>
              <div style={{ fontFamily: ADLSANS, fontSize: 11, fontWeight: 700, color: ADL.muted, letterSpacing: 0.6 }}>NOT SHIPPED</div>
            </div>

            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <div style={{ fontFamily: ADLSANS, fontSize: 11.5, color: ADL.muted }}>Ferroscale · v2026.1 · Built for shopfloors</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsGroup({ title, rows }) {
  return (
    <div style={{ background: ADL.surface, border: `1px solid ${ADL.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${ADL.border}`, background: ADL.surfaceRaised }}>
        <ADLLabel>{title}</ADLLabel>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12,
          borderBottom: i < rows.length - 1 ? `1px solid ${ADL.border}` : 'none',
        }}>
          <div style={{ flex: 1, fontFamily: ADLSANS, fontSize: 13, color: ADL.ink, fontWeight: 500 }}>
            {r.l}
            {r.note && <div style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted, marginTop: 2, fontWeight: 400 }}>{r.note}</div>}
          </div>
          {r.toggle ? (
            <div style={{ width: 36, height: 22, borderRadius: 999, background: r.on ? ADL.accent : '#d6cebd', position: 'relative' }}>
              <div style={{ width: 18, height: 18, borderRadius: 999, background: '#fff',
                position: 'absolute', top: 2, left: r.on ? 16 : 2, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            </div>
          ) : (
            <>
              <div style={{ fontFamily: ADLSANS, fontSize: 12.5, color: ADL.muted, fontWeight: 500 }}>{r.v}</div>
              <svg width="6" height="11" viewBox="0 0 6 11" fill="none" stroke={ADL.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4.5L1 10"/></svg>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ⌘K palette overlay
// ─────────────────────────────────────────────────────────────
function PaletteDesktopA() {
  // Behind: calculator (D1) faded
  return (
    <div style={{ background: ADL.bg, height: '100%', position: 'relative', color: ADL.ink, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none' }}>
        <DesktopA1 />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.32)' }} />

      <div style={{
        position: 'absolute', left: '50%', top: 86, transform: 'translateX(-50%)',
        width: 620, background: ADL.surface, borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(20,18,15,0.08)',
      }}>
        {/* Search input */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${ADL.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ADL.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <div style={{ flex: 1, fontFamily: ADLSANS, fontSize: 15, color: ADL.ink, fontWeight: 500 }}>
            hea 1
            <span style={{ display: 'inline-block', width: 2, height: 18, background: ADL.accent, marginLeft: 1, verticalAlign: 'middle', animation: 'aCaret 1s infinite' }} />
          </div>
          <span style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>esc to close</span>
        </div>

        {/* Section: profiles */}
        <PaletteSection title="Profiles · 4 matches">
          {[
            { kind: 'hea', l: 'HEA 100', sub: '16.7 kg/m', hot: '↵' },
            { kind: 'hea', l: 'HEA 120', sub: '19.9 kg/m' },
            { kind: 'hea', l: 'HEA 140', sub: '24.7 kg/m' },
            { kind: 'hea', l: 'HEA 160', sub: '30.4 kg/m' },
          ].map((r, i) => (
            <PaletteRow key={i} icon={<ProfileGlyph kind={r.kind} size={16} strokeWidth={2.3} />} label={r.l} sub={r.sub} hot={r.hot} active={i === 0} />
          ))}
        </PaletteSection>

        {/* Section: presets */}
        <PaletteSection title="Saved · 2 matches">
          {[
            { l: 'HEA 100 · 6 m × 4', sub: 'Steel S235 · 167.4 kg' },
            { l: 'HEA 140 · 3 m × 12', sub: 'Steel S355 · 889.2 kg' },
          ].map((r, i) => (
            <PaletteRow key={i} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>}
              label={r.l} sub={r.sub} />
          ))}
        </PaletteSection>

        {/* Section: actions */}
        <PaletteSection title="Actions">
          {[
            { l: 'New calculation', hot: '⌘N', icon: 'plus' },
            { l: 'New project', hot: '⌘⇧N', icon: 'folder' },
            { l: 'Open Settings', hot: '⌘,', icon: 'cog' },
            { l: 'Toggle compare drawer', hot: '⌘\\', icon: 'compare' },
          ].map((r, i) => (
            <PaletteRow key={i} icon={paletteIcon(r.icon)} label={r.l} hot={r.hot} />
          ))}
        </PaletteSection>

        {/* Footer */}
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: ADL.surfaceRaised, borderTop: `1px solid ${ADL.border}` }}>
          <div style={{ display: 'flex', gap: 12, fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>
            <span><ADLKey>↑↓</ADLKey> navigate</span>
            <span><ADLKey>↵</ADLKey> select</span>
            <span><ADLKey>⌘↵</ADLKey> add to project</span>
          </div>
          <div style={{ fontFamily: ADLSANS, fontSize: 11, color: ADL.muted }}>Ferroscale · v2026.1</div>
        </div>
      </div>
    </div>
  );
}

function PaletteSection({ title, children }) {
  return (
    <div>
      <div style={{ padding: '10px 18px 4px' }}>
        <ADLLabel>{title}</ADLLabel>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PaletteRow({ icon, label, sub, hot, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 18px', minHeight: 36,
      background: active ? ADL.accentSurface : 'transparent',
      borderLeft: `3px solid ${active ? ADL.accent : 'transparent'}`,
    }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, background: active ? '#fff8' : ADL.surfaceInset,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? ADL.accentInk : ADL.ink2 }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontFamily: ADLSANS, fontSize: 13, color: ADL.ink, fontWeight: active ? 600 : 500 }}>{label}</div>
      {sub && <div style={{ fontFamily: ADLSANS, fontSize: 11.5, color: ADL.muted }}>{sub}</div>}
      {hot && <ADLKey>{hot}</ADLKey>}
    </div>
  );
}

function paletteIcon(name) {
  const props = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'plus': return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'folder': return <svg {...props}><path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z"/></svg>;
    case 'cog': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 9L21 6.4M4.6 15L3 17.6"/></svg>;
    case 'compare': return <svg {...props}><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>;
    default: return null;
  }
}

Object.assign(window, { SettingsDesktopA, PaletteDesktopA });
