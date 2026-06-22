// concept-c.jsx — "Receipt / engineer's mono". IBM Plex Mono, dotted dividers, single accent.

const C = {
  bg: '#f1ece0',
  paper: '#fbf7ec',
  paperFold: '#ece4d2',
  ink: '#191510',
  ink2: '#52483b',
  muted: '#8a8071',
  faint: '#cdc4b0',
  rule: '#1b1610',
  accent: '#c7401d',
  accentSurface: '#f3d8c8',
  pos: '#1c6e3a',
};

const CMONO = '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace';
const CSANS = '"IBM Plex Sans", -apple-system, system-ui, sans-serif';

// Decorative dotted rule
function CDots({ color = C.rule, h = 1 }) {
  return <div style={{ height: h, backgroundImage: `radial-gradient(${color} 0.6px, transparent 0.7px)`, backgroundSize: '6px 6px', backgroundRepeat: 'repeat-x', backgroundPosition: '0 50%' }} />;
}

// Tape edge with perforations
function CPerforation({ flip }) {
  const r = 6;
  return (
    <div style={{
      position: 'relative', height: 12, background: C.bg,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(${C.bg} ${r}px, transparent ${r+0.5}px)`,
        backgroundSize: `${r*3}px ${r*2}px`,
        backgroundPosition: flip ? `0 100%` : `0 0%`,
        backgroundColor: C.paper,
      }} />
    </div>
  );
}

function CHeader({ title = 'WEIGHT CALC', stamp = '02-MAY-2026 / 09:41' }) {
  return (
    <div style={{ padding: '60px 22px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.ink, letterSpacing: 1.6 }}>FERROSCALE / SHOPFLOOR ED.</div>
        <div style={{ fontFamily: CMONO, fontSize: 9.5, color: C.muted, letterSpacing: 0.8 }}>v2026.1</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ fontFamily: CMONO, fontSize: 22, fontWeight: 600, color: C.ink, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ fontFamily: CMONO, fontSize: 9.5, color: C.muted, letterSpacing: 0.6 }}>{stamp}</div>
      </div>
    </div>
  );
}

// Field row — "label .... value unit"
function CRow({ label, value, unit, big, accent, total, sub }) {
  const labelStyle = { fontFamily: CMONO, fontSize: big ? 12 : 11, fontWeight: total ? 700 : (big ? 600 : 500), color: total ? C.ink : C.ink2, letterSpacing: 0.4, textTransform: 'uppercase' };
  const valueStyle = { fontFamily: CMONO, fontSize: big ? 28 : 13, fontWeight: total ? 700 : 600, color: accent ? C.accent : C.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 };
  const unitStyle = { fontFamily: CMONO, fontSize: big ? 13 : 10.5, fontWeight: 600, color: C.muted, letterSpacing: 0.6, marginLeft: 4 };
  return (
    <div style={{ padding: big ? '12px 0' : '6px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ flex: 1, minWidth: 12, alignSelf: 'flex-end', marginBottom: big ? 6 : 2,
          backgroundImage: `radial-gradient(${C.faint} 0.5px, transparent 0.6px)`, backgroundSize: '5px 5px',
          backgroundRepeat: 'repeat-x', backgroundPosition: '0 100%', height: big ? 10 : 6 }} />
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={valueStyle}>{value}</div>
          {unit && <div style={unitStyle}>{unit}</div>}
        </div>
      </div>
      {sub && <div style={{ fontFamily: CMONO, fontSize: 9.5, color: C.muted, letterSpacing: 0.4, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Inline input chip (looks editable, like calc receipt entry)
function CInputChip({ label, value, unit, active }) {
  return (
    <div style={{
      flex: 1,
      background: active ? C.accentSurface : C.paper,
      border: `1px solid ${active ? C.accent : C.faint}`,
      borderRadius: 4,
      padding: '8px 10px',
      position: 'relative',
    }}>
      <div style={{ fontFamily: CMONO, fontSize: 9, fontWeight: 600, color: active ? C.accent : C.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
        <div style={{ fontFamily: CMONO, fontSize: 18, fontWeight: 600, color: C.ink, letterSpacing: -0.4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 0.4 }}>{unit}</div>
        {active && <div style={{ marginLeft: 'auto', width: 8, height: 14, background: C.accent, alignSelf: 'center', animation: 'cBlink 1s steps(1,end) infinite' }} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen C1 — Calculator
// ─────────────────────────────────────────────────────────────
function CalcC() {
  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.ink, paddingBottom: 30 }}>
      {/* Paper card */}
      <div style={{ margin: '0 14px', background: C.paper, borderRadius: 4, boxShadow: '0 2px 0 rgba(0,0,0,0.04), 0 12px 30px -16px rgba(0,0,0,0.18)', overflow: 'hidden', position: 'relative' }}>
        {/* corner staple */}
        <div style={{ position: 'absolute', top: 64, left: 22, fontFamily: CMONO, fontSize: 8, color: C.muted, letterSpacing: 1.6, transform: 'rotate(-2deg)', opacity: 0.7 }}>№ 00184</div>

        <CHeader />

        <div style={{ padding: '0 22px' }}>
          <CDots />
        </div>

        {/* Job spec inputs */}
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ fontFamily: CMONO, fontSize: 9.5, fontWeight: 600, color: C.muted, letterSpacing: 1.4, marginBottom: 6 }}>SPEC</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
            background: '#fff', border: `1px solid ${C.faint}`, borderRadius: 4 }}>
            <ProfileGlyph kind="hea" size={22} color={C.ink} strokeWidth={2.2} />
            <div style={{ fontFamily: CMONO, fontSize: 14, fontWeight: 600, color: C.ink, letterSpacing: 0.2 }}>HEA 100</div>
            <div style={{ marginLeft: 'auto', fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 0.6 }}>EN 10025 ▾</div>
          </div>

          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <CInputChip label="Length" value="6.000" unit="m" active />
            <CInputChip label="Pieces" value="4" unit="×" />
          </div>

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            background: '#fff', border: `1px solid ${C.faint}`, borderRadius: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#a08373' }} />
            <div style={{ fontFamily: CMONO, fontSize: 12, fontWeight: 600, color: C.ink, letterSpacing: 0.2 }}>STEEL S235</div>
            <div style={{ marginLeft: 'auto', fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 0.6 }}>7850 kg/m³</div>
          </div>
        </div>

        <div style={{ padding: '14px 22px 0' }}><CDots /></div>

        {/* Computed body — receipt lines */}
        <div style={{ padding: '4px 22px 0' }}>
          <div style={{ fontFamily: CMONO, fontSize: 9.5, fontWeight: 600, color: C.muted, letterSpacing: 1.4, padding: '10px 0 0' }}>RUN-OUT</div>
          <CRow label="Lin. weight" value="16.700" unit="kg/m" />
          <CRow label="Length × pcs" value="24.000" unit="m" />
          <CRow label="Subtotal" value="400.800" unit="kg" />
          <CRow label="Waste +5%" value="20.040" unit="kg" />
        </div>

        <div style={{ padding: '4px 22px' }}><CDots color={C.rule} /></div>

        {/* Total - emphasized */}
        <div style={{ padding: '6px 22px 14px', background: C.paperFold }}>
          <CRow big total accent label="TOTAL WEIGHT" value="167.4" unit="kg" sub="≈ €  502.30  ·  @ 1.25/kg" />
        </div>

        {/* Footer with cut tape */}
        <CPerforation flip />
      </div>

      {/* Action band */}
      <div style={{ padding: '14px 18px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[
          { l: 'SAVE', primary: true, icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> },
          { l: 'COPY', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> },
          { l: 'SHARE', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> },
        ].map((b, i) => (
          <div key={i} style={{
            height: 44, borderRadius: 4,
            background: b.primary ? C.ink : 'transparent',
            border: `1px solid ${b.primary ? C.ink : C.faint}`,
            color: b.primary ? C.paper : C.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: CMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
          }}>{b.icon} {b.l}</div>
        ))}
      </div>

      {/* Bottom nav strip */}
      <div style={{ margin: '14px 14px 0', padding: 4, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: C.paper, border: `1px solid ${C.faint}`, borderRadius: 4 }}>
        {[
          { l: 'CALC', active: true },
          { l: 'SAVED' },
          { l: 'JOBS' },
          { l: 'SET' },
        ].map((t, i) => (
          <div key={i} style={{
            height: 36, borderRadius: 2,
            background: t.active ? C.ink : 'transparent',
            color: t.active ? C.paper : C.ink2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: CMONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
          }}>{t.l}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen C2 — Result peek
// ─────────────────────────────────────────────────────────────
function ResultPeekC() {
  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.ink, position: 'relative', overflow: 'hidden' }}>
      <div style={{ opacity: 0.38, padding: '0 14px' }}>
        <div style={{ background: C.paper, borderRadius: 4, padding: '14px 22px', marginTop: 60 }}>
          <CHeader />
        </div>
      </div>

      {/* Receipt tape sliding up */}
      <div style={{
        position: 'absolute', left: 12, right: 12, bottom: 0,
        background: C.paper, borderRadius: 6,
        boxShadow: '0 -24px 50px rgba(0,0,0,0.14), 0 -2px 0 rgba(0,0,0,0.05) inset',
        paddingBottom: 22,
      }}>
        <CPerforation />
        <div style={{ padding: '8px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.4 }}>RESULT TAPE  ·  02-MAY-2026</div>
            <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 0.6 }}>SWIPE↑</div>
          </div>
          <CDots />

          <div style={{ padding: '10px 0 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.2 }}>HEA 100 · S235 · 6m × 4</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <div style={{ fontFamily: CMONO, fontSize: 52, fontWeight: 600, color: C.ink, letterSpacing: -2, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
                <div style={{ fontFamily: CMONO, fontSize: 18, fontWeight: 600, color: C.accent }}>kg</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.2 }}>COST</div>
              <div style={{ fontFamily: CMONO, fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>€ 502.30</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}><CDots /></div>

          <CRow label="Per piece" value="41.85" unit="kg" />
          <CRow label="Per metre" value="16.700" unit="kg/m" />
          <CRow label="Total length" value="24.000" unit="m" />

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ height: 44, borderRadius: 4, background: C.ink, color: C.paper,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: CMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}>SAVE TAPE</div>
            <div style={{ height: 44, borderRadius: 4, background: 'transparent', border: `1px solid ${C.faint}`, color: C.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: CMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}>+ COMPARE</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen C3 — Result full sheet
// ─────────────────────────────────────────────────────────────
function ResultFullC() {
  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.ink, paddingBottom: 30 }}>
      <div style={{ padding: '56px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1.6 }}>TAPE №&nbsp;00184  ·  EDITED</div>
        <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 1 }}>02-MAY-2026</div>
      </div>

      <div style={{ margin: '0 12px', background: C.paper, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
        <CPerforation />

        <div style={{ padding: '8px 22px 0' }}>
          <div style={{ fontFamily: CMONO, fontSize: 11, fontWeight: 700, color: C.ink, letterSpacing: 1.6 }}>STEEL BEAM HEA 100</div>
          <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 1, marginTop: 2 }}>EN 10025  ·  S235  ·  7850 kg/m³</div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
            <div style={{ fontFamily: CMONO, fontSize: 72, fontWeight: 600, color: C.ink, letterSpacing: -3, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
            <div style={{ fontFamily: CMONO, fontSize: 24, fontWeight: 600, color: C.accent }}>kg</div>
            <div style={{ marginLeft: 'auto', fontFamily: CMONO, fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>€&nbsp;502.30</div>
          </div>

          <div style={{ marginTop: 14 }}><CDots /></div>

          <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.4, padding: '12px 0 4px' }}>INPUT</div>
          <CRow label="Profile" value="HEA 100" />
          <CRow label="Material" value="S235" />
          <CRow label="Length" value="6.000" unit="m" />
          <CRow label="Pieces" value="4" unit="×" />

          <div style={{ marginTop: 8 }}><CDots /></div>

          <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.4, padding: '12px 0 4px' }}>COMPUTED</div>
          <CRow label="Lin. weight" value="16.700" unit="kg/m" />
          <CRow label="Per piece" value="100.200" unit="kg" />
          <CRow label="Subtotal" value="400.800" unit="kg" />
          <CRow label="Waste +5%" value="20.040" unit="kg" />
          <CRow label="Unit price" value="1.25" unit="€/kg" />
        </div>

        <div style={{ padding: '4px 22px' }}><div style={{ height: 1, background: C.ink }} /><div style={{ height: 3 }} /><div style={{ height: 1, background: C.ink }} /></div>

        <div style={{ padding: '8px 22px 18px', background: C.paperFold }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: CMONO, fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: 1.6 }}>TOTAL</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <div style={{ fontFamily: CMONO, fontSize: 22, fontWeight: 700, color: C.accent, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.6 }}>420.840</div>
              <div style={{ fontFamily: CMONO, fontSize: 13, fontWeight: 700, color: C.accent }}>kg</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
            <div style={{ fontFamily: CMONO, fontSize: 11, color: C.muted, letterSpacing: 0.4 }}>≈ €&nbsp;526.05 incl. waste</div>
          </div>
        </div>

        <CPerforation flip />
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 18px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ height: 48, borderRadius: 4, background: C.ink, color: C.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: CMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}>SAVE TAPE</div>
        <div style={{ height: 48, borderRadius: 4, background: 'transparent', border: `1px solid ${C.faint}`, color: C.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: CMONO, fontSize: 11, fontWeight: 700, letterSpacing: 1.4 }}>EXPORT PDF</div>
      </div>

      <div style={{ padding: '12px 22px 0' }}>
        <div style={{ height: 44, borderRadius: 4, border: `1px dashed ${C.faint}`, color: C.ink2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: CMONO, fontSize: 11, fontWeight: 600, letterSpacing: 1.2 }}>
          + ADD TO PROJECT
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen C4 — Settings
// ─────────────────────────────────────────────────────────────
function SettingsC() {
  const Section = ({ title, children }) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.4, padding: '0 22px 6px' }}>{title}</div>
      <div style={{ margin: '0 14px', background: C.paper, borderRadius: 4, padding: '4px 0' }}>{children}</div>
    </div>
  );
  const Row = ({ label, value, toggle, on, last }) => (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 16px', position: 'relative' }}>
      <div style={{ flex: 1, fontFamily: CMONO, fontSize: 12, fontWeight: 600, color: C.ink, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ flex: 1, height: 8, alignSelf: 'flex-end', marginBottom: 14,
        backgroundImage: `radial-gradient(${C.faint} 0.5px, transparent 0.6px)`, backgroundSize: '5px 5px',
        backgroundRepeat: 'repeat-x', backgroundPosition: '0 100%' }} />
      {toggle ? (
        <div style={{ width: 30, height: 18, borderRadius: 2, background: on ? C.accent : C.faint, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 2, left: on ? 14 : 2, width: 14, height: 14, borderRadius: 1, background: C.paper }} />
        </div>
      ) : (
        <div style={{ fontFamily: CMONO, fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: 0.4, textAlign: 'right' }}>{value}</div>
      )}
      {!last && <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 1, backgroundImage: `radial-gradient(${C.faint} 0.5px, transparent 0.6px)`, backgroundSize: '4px 1px', backgroundRepeat: 'repeat-x' }} />}
    </div>
  );

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: '100%', paddingBottom: 30 }}>
      <div style={{ padding: '56px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.6 }}>SYSTEM / PREFERENCES</div>
          <div style={{ fontFamily: CMONO, fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 2, letterSpacing: 0.2 }}>SETTINGS</div>
        </div>
        <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 0.8 }}>EDIT&nbsp;✎</div>
      </div>

      {/* Quick defaults band */}
      <div style={{ margin: '14px 14px 0', background: C.paper, borderRadius: 4, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: 1.4 }}>OPEN&nbsp;→&nbsp;RESULT</div>
          <div style={{ fontFamily: CMONO, fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 0.6 }}>2 TAPS · 1.4s avg</div>
        </div>
        <div style={{ marginTop: 6 }}><CDots /></div>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 4 }}>
          {[
            ['MAT','S235'],['PROFILE','HEA 100'],['UNIT','m / kg'],['CURRENCY','EUR'],
          ].map(([l,v], i) => (
            <div key={i} style={{ padding: '4px 0' }}>
              <div style={{ fontFamily: CMONO, fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: 1.2 }}>{l}</div>
              <div style={{ fontFamily: CMONO, fontSize: 13, fontWeight: 700, color: C.ink, letterSpacing: -0.2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <Section title="DISPLAY">
        <Row label="Appearance" value="LIGHT" />
        <Row label="Density" value="COMPACT" />
        <Row label="Show price" toggle on />
        <Row label="Weight primary" toggle on last />
      </Section>

      <Section title="CALCULATION">
        <Row label="Default waste" value="5 %" />
        <Row label="VAT included" toggle on={false} />
        <Row label="Decimals" value="1" last />
      </Section>

      <Section title="SYSTEM">
        <Row label="Sync · GDrive" value="OFF" />
        <Row label="Haptics" toggle on />
        <Row label="Diagnostics" value="↗" last />
      </Section>

      <div style={{ padding: '20px 22px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: CMONO, fontSize: 9.5, color: C.muted, letterSpacing: 1.6 }}>FERROSCALE v2026.1 / build 184</div>
        <div style={{ fontFamily: CMONO, fontSize: 9.5, color: C.muted, letterSpacing: 1.6, marginTop: 2 }}>BUILT FOR SHOPFLOORS</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen C5 — Onboarding
// ─────────────────────────────────────────────────────────────
function OnboardingC() {
  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* punch card title */}
      <div style={{ padding: '64px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: CMONO, fontSize: 10, fontWeight: 700, color: C.ink, letterSpacing: 1.6 }}>FERROSCALE</div>
        <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 1.6 }}>STEP 01/03</div>
      </div>

      {/* big greeting */}
      <div style={{ padding: '40px 22px 0' }}>
        <div style={{ fontFamily: CMONO, fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: 1.8, textTransform: 'uppercase' }}>// hello, fabricator</div>
        <div style={{ fontFamily: CMONO, fontSize: 28, fontWeight: 600, color: C.ink, marginTop: 12, lineHeight: 1.15, letterSpacing: -0.4 }}>
          A weight calculator<br/>
          that thinks like a<br/>
          <span style={{ color: C.accent }}>shopfloor receipt.</span>
        </div>
      </div>

      {/* Sample tape card */}
      <div style={{ margin: '28px 14px 0', background: C.paper, borderRadius: 4, padding: '0 0 14px', position: 'relative' }}>
        <CPerforation />
        <div style={{ padding: '6px 18px 0' }}>
          <div style={{ fontFamily: CMONO, fontSize: 9.5, fontWeight: 600, color: C.muted, letterSpacing: 1.4 }}>SAMPLE OUTPUT</div>
          <CDots />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
            <div style={{ fontFamily: CMONO, fontSize: 42, fontWeight: 700, color: C.ink, letterSpacing: -1.5, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
            <div style={{ fontFamily: CMONO, fontSize: 16, fontWeight: 600, color: C.accent }}>kg</div>
            <div style={{ marginLeft: 'auto', fontFamily: CMONO, fontSize: 12, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>€ 502.30</div>
          </div>
          <div style={{ marginTop: 8 }}><CDots /></div>
          <div style={{ marginTop: 6 }}>
            <CRow label="HEA 100 · S235" value="6.000m × 4" />
          </div>
        </div>
        <CPerforation flip />
      </div>

      {/* Feature ticker */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 96 }}>
        <div style={{ padding: '0 22px', display: 'flex', gap: 8, overflow: 'hidden' }}>
          {['INSTANT', 'OFFLINE', '300+ PROFILES', 'EXPORT PDF'].map((s, i) => (
            <div key={i} style={{
              flex: 'none',
              padding: '6px 10px',
              borderRadius: 2,
              border: `1px solid ${C.faint}`,
              background: C.paper,
              fontFamily: CMONO, fontSize: 10, fontWeight: 700, color: C.ink, letterSpacing: 1.4,
            }}>{s}</div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', left: 18, right: 18, bottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: CMONO, fontSize: 10, color: C.muted, letterSpacing: 1.2 }}>3-step setup · ~ 12 seconds</div>
        </div>
        <div style={{ height: 52, borderRadius: 4, background: C.ink, color: C.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontFamily: CMONO, fontSize: 12, fontWeight: 700, letterSpacing: 1.6 }}>
          BEGIN&nbsp;SETUP
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalcC, ResultPeekC, ResultFullC, SettingsC, OnboardingC });
