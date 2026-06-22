// concept-b.jsx — "Dial / dark industrial". Black, saturated orange accent.
// Profile picker is a tactile horizontal cross-section rail. Weight is huge & central.

const B = {
  bg: '#0c0c0d',
  surface: '#161617',
  surfaceRaised: '#1d1d1f',
  surfaceHi: '#252527',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  ink: '#f6f5f3',
  ink2: '#a7a39c',
  muted: '#74716c',
  faint: '#48464a',
  accent: '#ff7849',
  accentDim: 'rgba(255,120,73,0.18)',
  accentLine: 'rgba(255,120,73,0.4)',
  pos: '#4ade80',
};

const BSANS = '"Geist", "Inter", -apple-system, system-ui, sans-serif';
const BMONO = '"Geist Mono", "JetBrains Mono", ui-monospace, monospace';
const BDISP = '"Geist", "Inter Display", -apple-system, system-ui, sans-serif';

// ─────────────────────────────────────────────────────────────
// Top nav
// ─────────────────────────────────────────────────────────────
function BNav({ trailing, title }) {
  return (
    <div style={{ padding: '58px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, background: B.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 10, height: 2, background: '#0c0c0d', position: 'relative' }}>
            <div style={{ position: 'absolute', left: -1, top: -4, width: 12, height: 2, background: '#0c0c0d' }} />
            <div style={{ position: 'absolute', left: -1, top: 4, width: 12, height: 2, background: '#0c0c0d' }} />
            <div style={{ position: 'absolute', left: 4, top: -5, width: 2, height: 12, background: '#0c0c0d' }} />
          </div>
        </div>
        <div style={{ fontFamily: BMONO, fontSize: 11, fontWeight: 600, color: B.ink, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {title || 'Ferroscale'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trailing}
      </div>
    </div>
  );
}

function BIcon({ children, active }) {
  return (
    <div style={{ width: 32, height: 32, borderRadius: 10,
      background: active ? B.accent : B.surfaceRaised,
      color: active ? '#0c0c0d' : B.ink2,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: active ? 'none' : `1px solid ${B.border}` }}>{children}</div>
  );
}

// Profile rail — horizontal pickable cross sections
function BProfileRail({ activeIdx = 0, dim }) {
  const items = [
    { kind: 'hea', label: 'HEA 100' },
    { kind: 'heb', label: 'HEB 120' },
    { kind: 'ipe', label: 'IPE 140' },
    { kind: 'upn', label: 'UPN 80' },
    { kind: 'sq_tube', label: '50×50' },
    { kind: 'pipe', label: 'Ø42' },
    { kind: 'angle', label: 'L 50×5' },
  ];
  return (
    <div style={{ position: 'relative', marginTop: 14, opacity: dim ? 0.5 : 1 }}>
      {/* center marker */}
      <div style={{ position: 'absolute', left: '50%', top: 4, bottom: 4, width: 2, background: B.accent, transform: 'translateX(-50%)', borderRadius: 1, opacity: 0.9 }} />
      <div style={{ position: 'absolute', left: '50%', top: -6, transform: 'translateX(-50%)', width: 0, height: 0,
        borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `6px solid ${B.accent}` }} />
      <div style={{ display: 'flex', gap: 6, padding: '12px 4px 12px', overflow: 'hidden' }}>
        {items.map((it, i) => {
          const active = i === activeIdx;
          return (
            <div key={i} style={{
              minWidth: 76, height: 76, borderRadius: 14,
              background: active ? B.surfaceHi : B.surface,
              border: `1px solid ${active ? B.borderStrong : B.border}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              color: active ? B.ink : B.ink2,
              flexShrink: 0,
            }}>
              <ProfileGlyph kind={it.kind} size={26} color={active ? B.accent : B.ink2} strokeWidth={2.2} />
              <div style={{ fontFamily: BMONO, fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Knob (wheel) for length / qty — vertical iOS picker style
function BKnob({ label, values, activeIdx, unit, big }) {
  const fontSizeBig = big ? 30 : 22;
  return (
    <div style={{ flex: 1, position: 'relative', height: 132,
      background: B.surface, border: `1px solid ${B.border}`, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 6, left: 12, fontFamily: BMONO, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: B.muted, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ position: 'absolute', top: 4, right: 12, fontFamily: BMONO, fontSize: 9.5, color: B.muted, letterSpacing: 0.4 }}>{unit}</div>
      {/* selected band */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 40, transform: 'translateY(-50%)',
        background: B.surfaceRaised, borderTop: `1px solid ${B.border}`, borderBottom: `1px solid ${B.border}` }} />
      {/* values list */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {[-2, -1, 0, 1, 2].map((off) => {
          const idx = Math.max(0, Math.min(values.length - 1, activeIdx + off));
          const opacity = off === 0 ? 1 : off === 1 || off === -1 ? 0.4 : 0.18;
          return (
            <div key={off} style={{
              height: off === 0 ? 40 : 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: BMONO,
              fontSize: off === 0 ? fontSizeBig : (off === 1 || off === -1 ? 16 : 13),
              fontWeight: off === 0 ? 600 : 400,
              color: off === 0 ? B.ink : B.ink2,
              opacity,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: -0.5,
            }}>{values[idx]}</div>
          );
        })}
      </div>
    </div>
  );
}

// Material strip
function BMaterialStrip({ active = 'S235' }) {
  const list = [
    { id: 'S235', short: 'S235', tone: '#a08373' },
    { id: 'S355', short: 'S355', tone: '#7a6557' },
    { id: 'AL', short: 'AL', tone: '#aab4be' },
    { id: 'SS', short: 'SS', tone: '#bcc0c7' },
    { id: 'CU', short: 'CU', tone: '#c8835d' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 4px' }}>
      {list.map((m) => {
        const isActive = m.id === active;
        return (
          <div key={m.id} style={{
            flex: 1, height: 38, borderRadius: 12,
            background: isActive ? B.accentDim : B.surface,
            border: `1px solid ${isActive ? B.accentLine : B.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: m.tone }} />
            <span style={{ fontFamily: BMONO, fontSize: 11, fontWeight: 700, color: isActive ? B.accent : B.ink2, letterSpacing: 0.4 }}>{m.short}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen B1 — Calculator
// ─────────────────────────────────────────────────────────────
function CalcB() {
  // length values shown around current
  const lens = ['4.500','5.000','5.500','6.000','6.500','7.000','7.500'];
  const qtys = ['  1','  2','  3','  4','  5','  6','  7'];
  return (
    <div style={{ background: B.bg, minHeight: '100%', color: B.ink, position: 'relative' }}>
      {/* radial accent backdrop */}
      <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', width: 460, height: 460, borderRadius: 999,
        background: `radial-gradient(circle, ${B.accentDim} 0%, transparent 60%)`, filter: 'blur(20px)' }} />

      <BNav trailing={<>
        <BIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></BIcon>
        <BIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></BIcon>
      </>} />

      {/* Hero result */}
      <div style={{ padding: '40px 22px 24px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: BMONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: B.muted, textTransform: 'uppercase' }}>
            Total weight · HEA 100 · S235
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: BMONO, fontSize: 10, color: B.pos, letterSpacing: 0.6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: B.pos }} />
            LIVE
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: BDISP, fontSize: 96, fontWeight: 200, letterSpacing: -4.5, color: B.ink, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
          <div style={{ fontFamily: BMONO, fontSize: 22, fontWeight: 600, color: B.accent }}>kg</div>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: BMONO, fontSize: 12, color: B.ink2, fontVariantNumeric: 'tabular-nums' }}>€&nbsp;502.30 · 1.25/kg</div>
          <div style={{ fontFamily: BMONO, fontSize: 12, color: B.muted, fontVariantNumeric: 'tabular-nums' }}>16.7&nbsp;kg/m</div>
        </div>
      </div>

      <div style={{ padding: '0 14px', position: 'relative' }}>
        {/* Profile rail */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: BMONO, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, color: B.muted, padding: '0 6px 4px', textTransform: 'uppercase' }}>Profile</div>
          <BProfileRail activeIdx={0} />
        </div>

        {/* Knobs for length & qty */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <BKnob label="Length" values={lens} activeIdx={3} unit="m" big />
          <BKnob label="Pieces" values={qtys} activeIdx={3} unit="×" />
        </div>

        {/* Material strip */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: BMONO, fontSize: 9, fontWeight: 700, letterSpacing: 1.4, color: B.muted, padding: '0 6px 4px', textTransform: 'uppercase' }}>Material</div>
          <BMaterialStrip active="S235" />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 38,
        background: B.surface, border: `1px solid ${B.border}`, borderRadius: 18,
        padding: 6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      }}>
        {['Calc','Saved','Projects','More'].map((t, i) => (
          <div key={t} style={{
            height: 46, borderRadius: 12,
            background: i === 0 ? B.accent : 'transparent',
            color: i === 0 ? '#0c0c0d' : B.ink2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: BMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen B2 — Result peek
// ─────────────────────────────────────────────────────────────
function ResultPeekB() {
  return (
    <div style={{ background: B.bg, minHeight: '100%', color: B.ink, position: 'relative', overflow: 'hidden' }}>
      <BNav trailing={<>
        <BIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></BIcon>
        <BIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></BIcon>
      </>} />

      {/* dim main */}
      <div style={{ padding: '40px 22px 0', opacity: 0.32 }}>
        <div style={{ fontFamily: BMONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: B.muted, textTransform: 'uppercase' }}>Total weight · HEA 100 · S235</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <div style={{ fontFamily: BDISP, fontSize: 96, fontWeight: 200, letterSpacing: -4.5, color: B.ink, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
          <div style={{ fontFamily: BMONO, fontSize: 22, fontWeight: 600, color: B.accent }}>kg</div>
        </div>
      </div>

      {/* Peek sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: B.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26,
        padding: '8px 18px 30px',
        borderTop: `1px solid ${B.borderStrong}`,
        boxShadow: '0 -24px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: B.faint, margin: '4px auto 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: BMONO, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: B.muted, textTransform: 'uppercase' }}>Result</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <div style={{ fontFamily: BDISP, fontSize: 56, fontWeight: 200, letterSpacing: -2.4, color: B.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
              <div style={{ fontFamily: BMONO, fontSize: 18, fontWeight: 600, color: B.accent }}>kg</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: BMONO, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: B.muted, textTransform: 'uppercase' }}>Cost</div>
            <div style={{ fontFamily: BMONO, fontSize: 22, fontWeight: 600, color: B.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>€&nbsp;502.30</div>
          </div>
        </div>

        {/* mini grid */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { l: 'Per piece', v: '41.85', u: 'kg' },
            { l: 'Per metre', v: '16.7', u: 'kg/m' },
            { l: 'Total length', v: '24.0', u: 'm' },
          ].map((s, i) => (
            <div key={i} style={{ background: B.surfaceRaised, border: `1px solid ${B.border}`, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontFamily: BMONO, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: B.muted, textTransform: 'uppercase' }}>{s.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                <div style={{ fontFamily: BMONO, fontSize: 16, fontWeight: 600, color: B.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{s.v}</div>
                <div style={{ fontFamily: BMONO, fontSize: 10, color: B.muted }}>{s.u}</div>
              </div>
            </div>
          ))}
        </div>

        {/* actions */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8 }}>
          <div style={{ height: 46, borderRadius: 12, background: B.accent, color: '#0c0c0d',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: BMONO, fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            Save
          </div>
          <div style={{ height: 46, borderRadius: 12, background: B.surfaceRaised, border: `1px solid ${B.border}`, color: B.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: BMONO, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Compare</div>
          <div style={{ height: 46, borderRadius: 12, background: B.surfaceRaised, border: `1px solid ${B.border}`, color: B.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: BMONO, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Project</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen B3 — Result full sheet
// ─────────────────────────────────────────────────────────────
function ResultFullB() {
  const lines = [
    { l: 'Linear weight', v: '16.700', u: 'kg/m' },
    { l: 'Length / piece', v: '6.000', u: 'm' },
    { l: 'Weight / piece', v: '100.200', u: 'kg' },
    { l: 'Quantity', v: '4', u: '×' },
    { l: 'Subtotal', v: '400.800', u: 'kg' },
    { l: 'Waste (+5%)', v: '20.040', u: 'kg' },
  ];
  return (
    <div style={{ background: B.bg, minHeight: '100%', color: B.ink, position: 'relative', padding: '0 0 30px' }}>
      <div style={{ padding: '58px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: BMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: B.muted, textTransform: 'uppercase' }}>Calculation · 02.05.2026</div>
        <BIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></BIcon>
      </div>

      {/* Big readout */}
      <div style={{ padding: '20px 22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: BMONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: B.muted, textTransform: 'uppercase' }}>HEA 100 · S235</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <div style={{ fontFamily: BDISP, fontSize: 96, fontWeight: 200, letterSpacing: -4.5, color: B.ink, lineHeight: 0.85, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
              <div style={{ fontFamily: BMONO, fontSize: 22, fontWeight: 600, color: B.accent }}>kg</div>
            </div>
            <div style={{ marginTop: 8, fontFamily: BMONO, fontSize: 14, color: B.ink2, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.4 }}>
              €&nbsp;502.30
            </div>
          </div>
          <div style={{ width: 80, height: 80, borderRadius: 18, background: B.surfaceRaised, border: `1px solid ${B.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProfileGlyph kind="hea" size={48} color={B.accent} strokeWidth={2.4} />
          </div>
        </div>
      </div>

      {/* Section split */}
      <div style={{ margin: '0 22px', borderTop: `1px solid ${B.border}`, paddingTop: 14 }}>
        <div style={{ fontFamily: BMONO, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: B.muted, textTransform: 'uppercase', marginBottom: 8 }}>Breakdown</div>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0' }}>
            <div style={{ fontFamily: BMONO, fontSize: 12, color: B.ink2 }}>{l.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <div style={{ fontFamily: BMONO, fontSize: 14, fontWeight: 600, color: B.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>{l.v}</div>
              <div style={{ fontFamily: BMONO, fontSize: 10, color: B.muted, minWidth: 36, textAlign: 'right' }}>{l.u}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '12px 0 8px',
          borderTop: `1px solid ${B.borderStrong}`, marginTop: 6 }}>
          <div style={{ fontFamily: BMONO, fontSize: 11, fontWeight: 700, color: B.ink, letterSpacing: 1, textTransform: 'uppercase' }}>Total</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <div style={{ fontFamily: BMONO, fontSize: 18, fontWeight: 700, color: B.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>420.840</div>
            <div style={{ fontFamily: BMONO, fontSize: 11, color: B.accent }}>kg</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '20px 18px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ height: 52, borderRadius: 14, background: B.accent, color: '#0c0c0d',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: BMONO, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          Save
        </div>
        <div style={{ height: 52, borderRadius: 14, background: B.surfaceRaised, border: `1px solid ${B.border}`, color: B.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: BMONO, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
          Share
        </div>
      </div>

      <div style={{ marginTop: 18, padding: '0 18px' }}>
        <div style={{ height: 52, borderRadius: 14, background: 'transparent', border: `1px solid ${B.border}`, color: B.ink2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: BMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          Add to project
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen B4 — Settings
// ─────────────────────────────────────────────────────────────
function SettingsB() {
  const Group = ({ title, children }) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: BMONO, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.6, color: B.muted, textTransform: 'uppercase', padding: '0 22px 8px' }}>{title}</div>
      <div style={{ margin: '0 14px', background: B.surface, border: `1px solid ${B.border}`, borderRadius: 18, overflow: 'hidden' }}>{children}</div>
    </div>
  );
  const Row = ({ label, detail, toggle, on, last }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 50, padding: '0 16px' }}>
      <div style={{ flex: 1, fontFamily: BMONO, fontSize: 13, color: B.ink, letterSpacing: 0.2 }}>{label}</div>
      {toggle ? (
        <div style={{ width: 36, height: 22, borderRadius: 999, background: on ? B.accent : B.surfaceHi, position: 'relative', border: `1px solid ${on ? B.accent : B.border}` }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, background: '#fff',
            position: 'absolute', top: 2, left: on ? 17 : 2 }} />
        </div>
      ) : (
        <>
          <div style={{ fontFamily: BMONO, fontSize: 12, color: B.ink2, marginRight: 6 }}>{detail}</div>
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke={B.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l5 5-5 5"/></svg>
        </>
      )}
      {!last && <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 1, background: B.border }} />}
    </div>
  );

  return (
    <div style={{ background: B.bg, color: B.ink, minHeight: '100%', paddingBottom: 30 }}>
      <div style={{ padding: '56px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: BMONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.6, color: B.muted, textTransform: 'uppercase' }}>System</div>
          <div style={{ fontFamily: BDISP, fontSize: 30, fontWeight: 300, letterSpacing: -1.4, color: B.ink, marginTop: 2 }}>Settings</div>
        </div>
        <BIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></BIcon>
      </div>

      {/* Defaults card with live preview */}
      <div style={{ margin: '18px 14px 0', background: B.surface, border: `1px solid ${B.border}`, borderRadius: 18, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: BMONO, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, color: B.muted, textTransform: 'uppercase' }}>Quick defaults</div>
          <div style={{ fontFamily: BMONO, fontSize: 10, color: B.accent, letterSpacing: 0.6 }}>3 TAPS · OPEN → RESULT</div>
        </div>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'Material', v: 'Steel S235' },
            { l: 'Profile', v: 'HEA 100' },
            { l: 'Length unit', v: 'metres' },
            { l: 'Currency', v: 'EUR' },
          ].map((c, i) => (
            <div key={i} style={{ background: B.surfaceRaised, border: `1px solid ${B.border}`, borderRadius: 12, padding: '8px 10px' }}>
              <div style={{ fontFamily: BMONO, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: B.muted, textTransform: 'uppercase' }}>{c.l}</div>
              <div style={{ fontFamily: BMONO, fontSize: 13, fontWeight: 600, color: B.ink, marginTop: 2, letterSpacing: -0.2 }}>{c.v}</div>
            </div>
          ))}
        </div>
      </div>

      <Group title="Display">
        <Row label="Appearance" detail="Dark" />
        <Row label="Show price inline" toggle on />
        <Row label="Weight as primary" toggle on last />
      </Group>

      <Group title="Calculation">
        <Row label="Default waste %" detail="0%" />
        <Row label="VAT included" toggle on={false} />
        <Row label="Decimal precision" detail="1" last />
      </Group>

      <Group title="System">
        <Row label="Sync (Google Drive)" detail="Off" />
        <Row label="Haptics" toggle on />
        <Row label="About · v2026.1" last />
      </Group>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen B5 — Onboarding
// ─────────────────────────────────────────────────────────────
function OnboardingB() {
  return (
    <div style={{ background: B.bg, color: B.ink, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 520, height: 520, borderRadius: 999,
        background: `radial-gradient(circle, ${B.accentDim} 0%, transparent 65%)`, filter: 'blur(40px)' }} />

      {/* status & wordmark */}
      <div style={{ padding: '60px 22px 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: B.accent }} />
          <div style={{ fontFamily: BMONO, fontSize: 11, fontWeight: 700, color: B.ink, letterSpacing: 0.6, textTransform: 'uppercase' }}>Ferroscale</div>
        </div>
        <div style={{ fontFamily: BMONO, fontSize: 10, color: B.muted, letterSpacing: 0.6 }}>1 / 3</div>
      </div>

      {/* hero glyph */}
      <div style={{ position: 'relative', marginTop: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: 999, border: `1px solid ${B.borderStrong}` }} />
        <div style={{ position: 'absolute', width: 170, height: 170, borderRadius: 999, border: `1px dashed ${B.faint}` }} />
        <div style={{ width: 110, height: 110, borderRadius: 28, background: B.surface, border: `1px solid ${B.borderStrong}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${B.accentDim}` }}>
          <ProfileGlyph kind="hea" size={64} color={B.accent} strokeWidth={2.2} />
        </div>
        {/* measurement ticks */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: B.faint, opacity: 0.4, transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: B.faint, opacity: 0.4, transform: 'translateY(-50%)' }} />
      </div>

      {/* copy */}
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 130, textAlign: 'center' }}>
        <div style={{ fontFamily: BMONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.6, color: B.accent, textTransform: 'uppercase' }}>Weight, instantly</div>
        <div style={{ fontFamily: BDISP, fontSize: 30, fontWeight: 300, letterSpacing: -1.2, color: B.ink, marginTop: 12, lineHeight: 1.1 }}>
          The number you need,<br/>before you ask for it.
        </div>
        <div style={{ fontFamily: BMONO, fontSize: 12, color: B.ink2, marginTop: 12, letterSpacing: 0.2, lineHeight: 1.55 }}>
          Pick a profile, dial in length and pieces.<br/>Ferroscale does the maths in real time.
        </div>
      </div>

      {/* dots + cta */}
      <div style={{ position: 'absolute', bottom: 38, left: 18, right: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
          <div style={{ width: 18, height: 4, borderRadius: 2, background: B.accent }} />
          <div style={{ width: 4, height: 4, borderRadius: 2, background: B.faint }} />
          <div style={{ width: 4, height: 4, borderRadius: 2, background: B.faint }} />
        </div>
        <div style={{ height: 54, borderRadius: 16, background: B.accent, color: '#0c0c0d',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: BMONO, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Get started
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalcB, ResultPeekB, ResultFullB, SettingsB, OnboardingB });
