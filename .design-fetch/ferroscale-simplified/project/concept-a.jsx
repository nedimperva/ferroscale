// concept-a.jsx — "Numpad-native" : iOS-Calculator-feel, cream/orange.
// Big live result + always-visible numpad. Chips switch the active input.

const A = {
  bg: '#efeae0',
  surface: '#fbf8f1',
  surfaceRaised: '#f3ede1',
  border: 'rgba(20,18,15,0.07)',
  borderStrong: 'rgba(20,18,15,0.12)',
  ink: '#1a1611',
  ink2: '#5a5247',
  muted: '#8d8779',
  accent: '#a35a32',
  accentSurface: '#f5e7da',
  accentInk: '#6e3a17',
  pad: '#e9e2d2',
  padPress: '#dcd2bd',
  posAccent: '#198560',
};

const SANS = '-apple-system, "SF Pro Text", system-ui, sans-serif';
const DISP = '-apple-system, "SF Pro Display", system-ui, sans-serif';
const TAB = '"SF Pro Display", -apple-system, system-ui, sans-serif';

// ─────────────────────────────────────────────────────────────
// Small parts
// ─────────────────────────────────────────────────────────────

function ATopBar({ trailing }) {
  return (
    <div style={{ padding: '60px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, background: A.ink, color: A.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: TAB, fontSize: 13, fontWeight: 700, letterSpacing: -0.4,
        }}>f</div>
        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: A.ink, letterSpacing: -0.1 }}>Ferroscale</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trailing}
      </div>
    </div>
  );
}

function APill({ children, onPress, dim, style }) {
  return (
    <div style={{
      height: 30, borderRadius: 999, padding: '0 11px',
      background: dim ? 'transparent' : A.surface,
      border: `1px solid ${dim ? 'transparent' : A.border}`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: A.ink2,
      ...style,
    }}>{children}</div>
  );
}

// Big weight card
function AResultCard({ kg, eur, sub, dim }) {
  return (
    <div style={{
      margin: '12px 14px 0',
      background: A.surface,
      border: `1px solid ${A.border}`,
      borderRadius: 22,
      padding: '14px 16px 14px',
      boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 12px 24px -16px rgba(0,0,0,0.18)',
      opacity: dim ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: A.muted, textTransform: 'uppercase' }}>Total weight</div>
        <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 600, color: A.posAccent, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: A.posAccent, display: 'inline-block' }} />
          live
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontFamily: TAB, fontSize: 64, fontWeight: 700, letterSpacing: -2.4, color: A.ink, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>{kg}</div>
        <div style={{ fontFamily: TAB, fontSize: 22, fontWeight: 600, color: A.accent, letterSpacing: -0.5 }}>kg</div>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: SANS, fontSize: 12, color: A.ink2 }}>{sub}</div>
        <div style={{ fontFamily: TAB, fontSize: 14, fontWeight: 600, color: A.ink2, fontVariantNumeric: 'tabular-nums' }}>€ {eur}</div>
      </div>
    </div>
  );
}

// Selected profile + material card
function ASelectionRow() {
  return (
    <div style={{ margin: '10px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <div style={{
        background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: A.surfaceRaised, display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.ink }}>
          <ProfileGlyph kind="hea" size={20} strokeWidth={2.3} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: A.muted, textTransform: 'uppercase' }}>Profile</div>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: A.ink, letterSpacing: -0.2 }}>HEA 100</div>
        </div>
      </div>
      <div style={{
        background: A.surface, border: `1px solid ${A.border}`, borderRadius: 16, padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#e7dac7',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: '#a08373' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: A.muted, textTransform: 'uppercase' }}>Material</div>
          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: A.ink, letterSpacing: -0.2 }}>Steel S235</div>
        </div>
      </div>
    </div>
  );
}

// Active input strip (length / qty)
function AInputStrip({ activeField = 'length' }) {
  const fields = [
    { id: 'length', label: 'Length', value: '6.000', unit: 'm' },
    { id: 'qty', label: 'Pieces', value: '4', unit: '×' },
    { id: 'price', label: 'Unit price', value: '1.25', unit: '€/kg' },
  ];
  return (
    <div style={{ margin: '12px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
      {fields.map((f) => {
        const active = f.id === activeField;
        return (
          <div key={f.id} style={{
            background: active ? A.accentSurface : A.surface,
            border: `1px solid ${active ? '#d9b69a' : A.border}`,
            borderRadius: 14, padding: '8px 10px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8,
              color: active ? A.accentInk : A.muted, textTransform: 'uppercase' }}>{f.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
              <div style={{ fontFamily: TAB, fontSize: 20, fontWeight: 700, color: A.ink, letterSpacing: -0.6, fontVariantNumeric: 'tabular-nums' }}>{f.value}</div>
              <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: A.muted }}>{f.unit}</div>
              {active && <span style={{ width: 2, height: 18, background: A.accent, marginLeft: 1, animation: 'aCaret 1s infinite' }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Numpad
function ANumpad({ activeUnit = 'm' }) {
  const keys = [
    ['7','8','9','⌫'],
    ['4','5','6','mm'],
    ['1','2','3','cm'],
    ['·','0','000','m'],
  ];
  return (
    <div style={{
      margin: '14px 12px 0',
      background: A.surface,
      borderRadius: 22,
      border: `1px solid ${A.border}`,
      padding: 8,
      display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 6,
      boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 -2px 12px rgba(0,0,0,0.03) inset',
    }}>
      {keys.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {row.map((k) => {
            const isUnit = ['mm', 'cm', 'm', 'in'].includes(k);
            const isUnitActive = isUnit && k === activeUnit;
            const isBs = k === '⌫';
            return (
              <div key={k} style={{
                height: 58, borderRadius: 16,
                background: isUnitActive ? A.accent : A.pad,
                color: isUnitActive ? '#fff' : (isBs ? A.muted : A.ink),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: isUnit ? SANS : TAB,
                fontSize: isUnit ? 14 : 26,
                fontWeight: isUnit ? 700 : 500,
                letterSpacing: isUnit ? 0.4 : -0.8,
                boxShadow: isUnitActive ? '0 6px 12px -6px rgba(120,60,20,0.4)' : '0 1px 0 rgba(255,255,255,0.7) inset, 0 -2px 4px rgba(0,0,0,0.04) inset',
                textTransform: isUnit ? 'uppercase' : 'none',
              }}>
                {isBs ? (
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 2L2 9l5 7h11a2 2 0 002-2V4a2 2 0 00-2-2z"/><path d="M11 6l6 6m0-6l-6 6"/>
                  </svg>
                ) : k}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen A1 — Calculator default
// ─────────────────────────────────────────────────────────────
function CalcA() {
  return (
    <div style={{ background: A.bg, minHeight: '100%', position: 'relative', paddingBottom: 24 }}>
      <ATopBar trailing={
        <>
          <div style={{ height: 30, borderRadius: 999, padding: '0 10px', background: A.surface, border: `1px solid ${A.border}`,
            display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: A.ink2 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>
            Sun
          </div>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: A.surface, border: `1px solid ${A.border}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: A.ink2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </div>
        </>
      } />
      <AResultCard kg={fmt.kg(167.4)} eur={fmt.eur(502.30)} sub="6 m × 4 pcs · S235" />
      <ASelectionRow />
      <AInputStrip activeField="length" />
      <ANumpad activeUnit="m" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen A2 — Result peek (snap sheet partial)
// ─────────────────────────────────────────────────────────────
function ResultPeekA() {
  return (
    <div style={{ background: A.bg, minHeight: '100%', position: 'relative' }}>
      <ATopBar trailing={
        <div style={{ width: 30, height: 30, borderRadius: 999, background: A.surface, border: `1px solid ${A.border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: A.ink2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </div>
      } />
      <AResultCard kg={fmt.kg(167.4)} eur={fmt.eur(502.30)} sub="6 m × 4 pcs · S235" dim />
      <ASelectionRow />
      <AInputStrip activeField="length" />

      {/* Scrim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.18)', pointerEvents: 'none' }} />

      {/* Peek sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: A.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        boxShadow: '0 -18px 40px rgba(0,0,0,0.14)',
        padding: '8px 16px 30px',
        borderTop: `1px solid ${A.border}`,
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,18,15,0.18)', margin: '4px auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: A.muted, textTransform: 'uppercase' }}>Result · HEA 100</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: A.muted }}>Drag up for breakdown</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <div style={{ fontFamily: TAB, fontSize: 56, fontWeight: 700, letterSpacing: -2, color: A.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
          <div style={{ fontFamily: TAB, fontSize: 20, fontWeight: 600, color: A.accent }}>kg</div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: A.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Total</div>
            <div style={{ fontFamily: TAB, fontSize: 18, fontWeight: 700, color: A.ink, fontVariantNumeric: 'tabular-nums' }}>€ 502.30</div>
          </div>
        </div>
        <div style={{ height: 1, background: A.border, margin: '14px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { l: 'Per piece', v: '41.85 kg' },
            { l: 'Per metre', v: '16.7 kg' },
            { l: 'Length', v: '24.0 m' },
          ].map((s, i) => (
            <div key={i} style={{ background: A.surfaceRaised, borderRadius: 14, padding: '10px 12px' }}>
              <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: A.muted, textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ fontFamily: TAB, fontSize: 16, fontWeight: 700, color: A.ink, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{
            height: 44, borderRadius: 14, background: A.ink, color: A.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: SANS, fontSize: 14, fontWeight: 600,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            Save
          </div>
          <div style={{
            height: 44, borderRadius: 14, background: A.surfaceRaised, color: A.ink,
            border: `1px solid ${A.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: SANS, fontSize: 14, fontWeight: 600,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
            Compare
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen A3 — Result full sheet
// ─────────────────────────────────────────────────────────────
function ResultFullA() {
  const lines = [
    { l: 'Linear weight', v: '16.7', u: 'kg/m' },
    { l: 'Length per piece', v: '6.000', u: 'm' },
    { l: 'Weight per piece', v: '100.20', u: 'kg' },
    { l: 'Pieces', v: '4', u: '×' },
    { l: 'Waste allowance', v: '+ 5%', u: '' },
  ];
  return (
    <div style={{ background: A.bg, minHeight: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.36)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 56, bottom: 0,
        background: A.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        boxShadow: '0 -18px 40px rgba(0,0,0,0.18)',
        padding: '8px 18px 28px',
        overflow: 'hidden',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,18,15,0.18)', margin: '4px auto 10px' }} />

        {/* hero */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: A.muted, textTransform: 'uppercase' }}>HEA 100 · S235</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <div style={{ fontFamily: TAB, fontSize: 80, fontWeight: 700, letterSpacing: -3, color: A.ink, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
              <div style={{ fontFamily: TAB, fontSize: 26, fontWeight: 600, color: A.accent }}>kg</div>
            </div>
          </div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: A.surfaceRaised,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.ink }}>
            <ProfileGlyph kind="hea" size={32} strokeWidth={2.3} />
          </div>
        </div>
        <div style={{ fontFamily: TAB, fontSize: 16, fontWeight: 600, color: A.ink2, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
          € 502.30 <span style={{ color: A.muted, fontWeight: 500 }}>· 1.25 €/kg</span>
        </div>

        {/* breakdown */}
        <div style={{ marginTop: 18, borderTop: `1px dashed ${A.borderStrong}`, paddingTop: 12 }}>
          <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: A.muted, textTransform: 'uppercase', marginBottom: 8 }}>
            Breakdown
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${A.border}` }}>
              <div style={{ fontFamily: SANS, fontSize: 13, color: A.ink2 }}>{l.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <div style={{ fontFamily: TAB, fontSize: 14, fontWeight: 600, color: A.ink, fontVariantNumeric: 'tabular-nums' }}>{l.v}</div>
                <div style={{ fontFamily: SANS, fontSize: 11, color: A.muted, minWidth: 26, textAlign: 'right' }}>{l.u}</div>
              </div>
            </div>
          ))}
          {/* Total line */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '10px 0 2px', borderTop: `2px solid ${A.ink}`, marginTop: 4 }}>
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: A.ink }}>Total weight</div>
            <div style={{ fontFamily: TAB, fontSize: 18, fontWeight: 700, color: A.ink, fontVariantNumeric: 'tabular-nums' }}>167.40 kg</div>
          </div>
        </div>

        {/* actions */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ height: 46, borderRadius: 14, background: A.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: SANS, fontSize: 14, fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            Save as preset
          </div>
          <div style={{ height: 46, borderRadius: 14, background: A.surfaceRaised, color: A.ink, border: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: SANS, fontSize: 14, fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4M5 7l1 13a2 2 0 002 2h8a2 2 0 002-2l1-13"/></svg>
            Add to project
          </div>
        </div>

        {/* footer hint */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontFamily: SANS, fontSize: 11, color: A.muted }}>Swipe down to keep editing</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen A4 — Settings
// ─────────────────────────────────────────────────────────────
function SettingsA() {
  const SectionLabel = ({ children }) => (
    <div style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: A.muted, textTransform: 'uppercase', padding: '18px 22px 8px' }}>{children}</div>
  );
  const Row = ({ icon, title, detail, last, toggle, on }) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', minHeight: 52, position: 'relative' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ead8c2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.accentInk, marginRight: 12 }}>{icon}</div>
      <div style={{ flex: 1, fontFamily: SANS, fontSize: 14.5, color: A.ink, fontWeight: 500 }}>{title}</div>
      {toggle ? (
        <div style={{ width: 36, height: 22, borderRadius: 999, background: on ? A.accent : '#d6cebd', position: 'relative' }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: '#fff',
            position: 'absolute', top: 2, left: on ? 16 : 2, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
        </div>
      ) : (
        <>
          <div style={{ fontFamily: SANS, fontSize: 13.5, color: A.muted, marginRight: 6 }}>{detail}</div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke={A.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l5 5-5 5"/></svg>
        </>
      )}
      {!last && <div style={{ position: 'absolute', left: 56, right: 14, bottom: 0, height: 1, background: A.border }} />}
    </div>
  );
  return (
    <div style={{ background: A.bg, minHeight: '100%', paddingBottom: 30 }}>
      <div style={{ padding: '56px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: DISP, fontSize: 30, fontWeight: 700, letterSpacing: -1.2, color: A.ink }}>Settings</div>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: A.surface, border: `1px solid ${A.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.ink2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      </div>

      {/* compact summary card */}
      <div style={{ margin: '14px 14px 0', background: A.surface, border: `1px solid ${A.border}`, borderRadius: 18, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: A.accentSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: A.accentInk }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: A.ink }}>Defaults applied</div>
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: A.muted, marginTop: 1 }}>Steel S235 · metres · € · 0% VAT · 0% waste</div>
          </div>
          <div style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: A.accent, padding: '6px 10px', borderRadius: 999, background: A.accentSurface }}>Edit</div>
        </div>
      </div>

      <SectionLabel>Display</SectionLabel>
      <div style={{ margin: '0 14px', background: A.surface, border: `1px solid ${A.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/><circle cx="12" cy="12" r="4"/></svg>} title="Appearance" detail="Light" />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>} title="Text size" detail="Regular" />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 4h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></svg>} title="Show price inline" toggle on last />
      </div>

      <SectionLabel>Defaults</SectionLabel>
      <div style={{ margin: '0 14px', background: A.surface, border: `1px solid ${A.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>} title="Material" detail="Steel S235" />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 12h16M4 6h16M4 18h16"/></svg>} title="Length unit" detail="m" />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>} title="Currency" detail="EUR" />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12l3-9 6 18 3-9h6"/></svg>} title="Waste allowance" detail="0%" last />
      </div>

      <SectionLabel>Power</SectionLabel>
      <div style={{ margin: '0 14px', background: A.surface, border: `1px solid ${A.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5"/></svg>} title="Sync with Google Drive" detail="Off" />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12l9-9 9 9M9 21V11h6v10"/></svg>} title="Show weight as main value" toggle on />
        <Row icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14l-3-3"/></svg>} title="Haptic feedback" toggle on last />
      </div>

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <div style={{ fontFamily: SANS, fontSize: 11, color: A.muted }}>Ferroscale · v2026.1 · Built for shopfloors</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen A5 — Onboarding (pick default material)
// ─────────────────────────────────────────────────────────────
function OnboardingA() {
  const mats = [
    { id: 'S235', label: 'Steel', sub: 'S235 · 7850', tone: '#a08373', active: true },
    { id: 'S355', label: 'Steel hi-yield', sub: 'S355 · 7850', tone: '#7a6557' },
    { id: 'AL', label: 'Aluminum', sub: '6061 · 2700', tone: '#aab4be' },
    { id: 'SS', label: 'Stainless', sub: '304 · 8000', tone: '#bcc0c7' },
    { id: 'CU', label: 'Copper', sub: 'Cu · 8960', tone: '#c8835d' },
    { id: 'BR', label: 'Brass', sub: 'CuZn · 8500', tone: '#c4a661' },
  ];
  return (
    <div style={{ background: A.bg, minHeight: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, height: 220,
        background: `radial-gradient(circle at 50% 0%, ${A.accentSurface}, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ padding: '70px 22px 0', position: 'relative' }}>
        {/* step bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 26 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: A.accent }} />
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: A.accent, opacity: 0.7 }} />
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#dccfb6' }} />
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#dccfb6' }} />
        </div>

        <div style={{ fontFamily: DISP, fontSize: 30, fontWeight: 700, letterSpacing: -1.2, color: A.ink, lineHeight: 1.05 }}>
          What do you<br/>work with most?
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13.5, color: A.ink2, marginTop: 8, lineHeight: 1.5 }}>
          We'll preselect this so opening Ferroscale<br/>drops you one tap from a result.
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {mats.map((m) => (
            <div key={m.id} style={{
              background: m.active ? A.accentSurface : A.surface,
              border: `1px solid ${m.active ? '#d9b69a' : A.border}`,
              borderRadius: 16, padding: '12px 12px 10px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -16, top: -16, width: 60, height: 60, borderRadius: 999, background: m.tone, opacity: 0.18 }} />
              <div style={{ fontFamily: SANS, fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: A.muted, textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ fontFamily: TAB, fontSize: 17, fontWeight: 700, color: A.ink, marginTop: 2, letterSpacing: -0.4 }}>{m.sub.split(' · ')[0]}</div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: A.muted, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{m.sub.split(' · ')[1]} kg/m³</div>
              {m.active && (
                <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 999, background: A.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 40, left: 18, right: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: SANS, fontSize: 12, color: A.muted }}>You can add more later in Settings</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <div style={{
            height: 50, borderRadius: 16, background: A.surface, border: `1px solid ${A.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: SANS, fontSize: 14, fontWeight: 600, color: A.ink2,
          }}>Skip</div>
          <div style={{
            height: 50, borderRadius: 16, background: A.ink, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: SANS, fontSize: 15, fontWeight: 700,
          }}>
            Continue
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalcA, ResultPeekA, ResultFullA, SettingsA, OnboardingA });
