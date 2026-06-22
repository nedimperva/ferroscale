// concept-a-mobile-compare.jsx — Compare two profiles, Add-to-project sheet, Empty state

// ─────────────────────────────────────────────────────────────
// Compare (2-up, stacked)
// ─────────────────────────────────────────────────────────────
function CompareA() {
  const A1 = { kind: 'hea', p: 'HEA 100', m: 'S235', s: '6 m × 4', kg: '167.4', eur: '502.30', kgM: '16.7' };
  const A2 = { kind: 'ipe', p: 'IPE 140', m: 'S235', s: '6 m × 4', kg: '309.6', eur: '929.00', kgM: '12.9' };
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', paddingBottom: 24 }}>
      <AMNavBar
        title="Compare"
        leading={<AMIconBtn>{ICON.back}</AMIconBtn>}
        trailing={<AMIconBtn>{ICON.swap}</AMIconBtn>}
      />

      {/* Sliding scale at the top — visual anchor */}
      <div style={{ margin: '0 14px 14px', background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 18, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <AMLabel>Heavier ↑</AMLabel>
          <div style={{ fontFamily: AMTAB, fontSize: 11, color: AM.muted, fontVariantNumeric: 'tabular-nums' }}>Δ 142.2 kg · +85%</div>
        </div>
        <div style={{ position: 'relative', height: 96, marginTop: 8 }}>
          {/* Axis line */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: AM.border }} />
          {/* B (lighter) */}
          <div style={{ position: 'absolute', left: '12%', top: '50%', transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontFamily: AMTAB, fontSize: 13, fontWeight: 700, color: AM.ink2, fontVariantNumeric: 'tabular-nums' }}>167.4</div>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: AM.surface, border: `2px solid ${AM.ink2}` }} />
            <div style={{ fontFamily: AMSANS, fontSize: 10.5, fontWeight: 600, color: AM.ink2 }}>HEA 100</div>
          </div>
          {/* A (heavier) */}
          <div style={{ position: 'absolute', left: '78%', top: '50%', transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontFamily: AMTAB, fontSize: 15, fontWeight: 700, color: AM.accent, fontVariantNumeric: 'tabular-nums' }}>309.6</div>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: AM.accent, border: `2px solid ${AM.accent}` }} />
            <div style={{ fontFamily: AMSANS, fontSize: 11, fontWeight: 700, color: AM.accentInk }}>IPE 140</div>
          </div>
        </div>
      </div>

      {/* Cards: A and B */}
      {[A2, A1].map((it, idx) => {
        const isHeavier = idx === 0;
        return (
          <div key={idx} style={{
            margin: '0 14px 8px',
            background: isHeavier ? AM.accentSurface : AM.surface,
            border: `1px solid ${isHeavier ? '#d9b69a' : AM.border}`,
            borderRadius: 18, padding: '14px 16px',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isHeavier ? '#fff8' : AM.surfaceInset,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: isHeavier ? AM.accentInk : AM.ink2 }}>
                <ProfileGlyph kind={it.kind} size={20} strokeWidth={2.3} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: AMSANS, fontSize: 14, fontWeight: 700, color: AM.ink, letterSpacing: -0.2 }}>{it.p} <span style={{ color: AM.muted, fontWeight: 500 }}>· {it.m}</span></div>
                <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted }}>{it.s}</div>
              </div>
              <div style={{ fontFamily: AMSANS, fontSize: 10, fontWeight: 700,
                color: isHeavier ? AM.accentInk : AM.ink2,
                background: isHeavier ? '#fff8' : AM.surfaceInset,
                padding: '3px 7px', borderRadius: 999, letterSpacing: 0.4 }}>
                {isHeavier ? '+85%' : 'BASE'}
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div style={{ fontFamily: AMTAB, fontSize: 44, fontWeight: 700, color: AM.ink, letterSpacing: -1.6, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>{it.kg}</div>
              <div style={{ fontFamily: AMTAB, fontSize: 18, fontWeight: 600, color: AM.accent }}>kg</div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: AMTAB, fontSize: 13, fontWeight: 700, color: AM.ink, fontVariantNumeric: 'tabular-nums' }}>€ {it.eur}</div>
                <div style={{ fontFamily: AMSANS, fontSize: 10.5, color: AM.muted }}>{it.kgM} kg/m</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Spec table */}
      <div style={{ margin: '10px 14px 0', background: AM.surface, border: `1px solid ${AM.border}`, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${AM.border}` }}>
          <AMLabel>Side-by-side</AMLabel>
        </div>
        {[
          ['Per metre', '12.9 kg', '16.7 kg'],
          ['Per piece', '77.4 kg', '41.85 kg'],
          ['Length', '24.0 m', '24.0 m'],
          ['Price', '€ 929', '€ 502'],
          ['€ / kg', '3.00', '3.00'],
        ].map((r, i, a) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr',
            padding: '9px 14px', alignItems: 'center',
            borderBottom: i < a.length - 1 ? `1px solid ${AM.border}` : 'none',
          }}>
            <div style={{ fontFamily: AMSANS, fontSize: 12, color: AM.muted }}>{r[0]}</div>
            <div style={{ fontFamily: AMTAB, fontSize: 13, fontWeight: 700, color: AM.accent, fontVariantNumeric: 'tabular-nums' }}>{r[1]}</div>
            <div style={{ fontFamily: AMTAB, fontSize: 13, fontWeight: 600, color: AM.ink, fontVariantNumeric: 'tabular-nums' }}>{r[2]}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 14px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{
          height: 44, borderRadius: 14, background: AM.surfaceRaised, color: AM.ink, border: `1px solid ${AM.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: AMSANS, fontSize: 13.5, fontWeight: 600 }}>
          {ICON.plus} Add another
        </div>
        <div style={{
          height: 44, borderRadius: 14, background: AM.ink, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: AMSANS, fontSize: 13.5, fontWeight: 700 }}>
          {ICON.bookmark} Save both
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add-to-project peek sheet
// ─────────────────────────────────────────────────────────────
function AddToProjectA() {
  const list = [
    { name: 'Skyline tower', sub: '8 parts · 2 684 kg', tone: '#a08373', active: true },
    { name: 'Workshop mezzanine', sub: '14 parts · 4 120 kg', tone: '#7a6557' },
    { name: 'Atelier hood', sub: '6 parts · 94 kg', tone: '#bcc0c7' },
    { name: 'Lab cabling tray', sub: '4 parts · 38 kg', tone: '#aab4be' },
  ];
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Result-full behind */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }}>
        <ResultFullA />
      </div>
      <AMSheet top={220}>
        <div style={{ fontFamily: AMDISP, fontSize: 22, fontWeight: 700, letterSpacing: -0.6, color: AM.ink }}>Add to project</div>
        <AMLabel style={{ marginTop: 4 }}>HEA 100 · 6 m × 4 · 167.4 kg</AMLabel>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
          {list.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px',
              borderBottom: i < list.length - 1 ? `1px solid ${AM.border}` : 'none',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: p.tone, opacity: 0.85,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{ICON.folder}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: AMSANS, fontSize: 14, fontWeight: 600, color: AM.ink, letterSpacing: -0.2 }}>{p.name}</div>
                <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted, marginTop: 1 }}>{p.sub}</div>
              </div>
              {p.active ? (
                <div style={{ width: 22, height: 22, borderRadius: 999, background: AM.accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ICON.check}</div>
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${AM.borderStrong}` }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: '14px 14px', borderRadius: 14, background: AM.surfaceRaised, border: `1px dashed ${AM.borderStrong}`,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: AM.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AM.accent }}>
            {ICON.plus}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: AMSANS, fontSize: 13.5, fontWeight: 600, color: AM.ink }}>New project</div>
            <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted }}>Start a fresh list for this part</div>
          </div>
        </div>

        <div style={{ marginTop: 14, height: 48, borderRadius: 14, background: AM.ink, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: AMSANS, fontSize: 14, fontWeight: 700 }}>
          Add to Skyline tower
        </div>
      </AMSheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state — no saved presets / projects yet
// ─────────────────────────────────────────────────────────────
function EmptyA() {
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', paddingBottom: 92 }}>
      <div style={{ padding: '58px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AMDISP, fontSize: 30, fontWeight: 700, letterSpacing: -1.2, color: AM.ink }}>Saved</div>
          <AMIconBtn>{ICON.search}</AMIconBtn>
        </div>
        <div style={{ fontFamily: AMSANS, fontSize: 13.5, color: AM.ink2, marginTop: 4 }}>Nothing here yet</div>
      </div>

      <div style={{ position: 'absolute', top: 220, left: 24, right: 24, textAlign: 'center' }}>
        <div style={{ width: 84, height: 84, margin: '0 auto', borderRadius: 24,
          background: AM.accentSurface, border: `1px solid #d9b69a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: AM.accent }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </div>
        <div style={{ marginTop: 18, fontFamily: AMDISP, fontSize: 22, fontWeight: 700, color: AM.ink, letterSpacing: -0.4 }}>Save a calculation</div>
        <div style={{ marginTop: 6, fontFamily: AMSANS, fontSize: 13.5, color: AM.ink2, lineHeight: 1.45 }}>
          Run a calculation, then tap Save to keep the profile, length, and material for next time.
        </div>
        <div style={{ marginTop: 18, display: 'inline-flex', height: 46, padding: '0 18px', borderRadius: 14,
          background: AM.ink, color: '#fff', alignItems: 'center', gap: 8,
          fontFamily: AMSANS, fontSize: 14, fontWeight: 700 }}>
          Open Calculator →
        </div>
      </div>

      <AMTabBar active="saved" />
    </div>
  );
}

Object.assign(window, { CompareA, AddToProjectA, EmptyA });
