// concept-a-mobile-pickers.jsx — Profile picker, Material picker, Custom density modal

// ─────────────────────────────────────────────────────────────
// Profile picker (full sheet over calculator)
// ─────────────────────────────────────────────────────────────
function ProfilePickerA() {
  const cats = [
    { id: 'beam', label: 'Beams', icon: 'hea', active: true },
    { id: 'channel', label: 'Channels', icon: 'upn' },
    { id: 'angle', label: 'Angles', icon: 'angle' },
    { id: 'tube', label: 'Tubes', icon: 'sq_tube' },
    { id: 'plate', label: 'Plates', icon: 'sht' },
    { id: 'bar', label: 'Bars', icon: 'round_bar' },
  ];
  const sizes = [
    { id: 'hea_80', kind: 'hea', label: 'HEA 80', sub: '8.4 kg/m' },
    { id: 'hea_100', kind: 'hea', label: 'HEA 100', sub: '16.7 kg/m', active: true },
    { id: 'hea_120', kind: 'hea', label: 'HEA 120', sub: '19.9 kg/m' },
    { id: 'hea_140', kind: 'hea', label: 'HEA 140', sub: '24.7 kg/m' },
    { id: 'hea_160', kind: 'hea', label: 'HEA 160', sub: '30.4 kg/m' },
    { id: 'hea_180', kind: 'hea', label: 'HEA 180', sub: '35.5 kg/m' },
    { id: 'heb_100', kind: 'heb', label: 'HEB 100', sub: '20.4 kg/m' },
    { id: 'heb_120', kind: 'heb', label: 'HEB 120', sub: '26.7 kg/m' },
    { id: 'heb_140', kind: 'heb', label: 'HEB 140', sub: '33.7 kg/m' },
    { id: 'heb_160', kind: 'heb', label: 'HEB 160', sub: '42.6 kg/m' },
    { id: 'ipe_120', kind: 'ipe', label: 'IPE 120', sub: '10.4 kg/m' },
    { id: 'ipe_140', kind: 'ipe', label: 'IPE 140', sub: '12.9 kg/m' },
  ];

  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      <AMNavBar
        title="Choose profile"
        leading={<AMIconBtn>{ICON.close}</AMIconBtn>}
        trailing={<AMIconBtn>{ICON.search}</AMIconBtn>}
      />

      {/* Search input */}
      <div style={{ padding: '0 14px 10px' }}>
        <div style={{
          height: 40, borderRadius: 12, background: AM.surface, border: `1px solid ${AM.border}`,
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        }}>
          <span style={{ color: AM.muted }}>{ICON.search}</span>
          <div style={{ fontFamily: AMSANS, fontSize: 13.5, color: AM.muted, flex: 1 }}>HEA 100, 50×50, plate…</div>
          <div style={{ fontFamily: AMSANS, fontSize: 11, fontWeight: 700, color: AM.muted, letterSpacing: 0.6 }}>RECENT</div>
        </div>
      </div>

      {/* Category strip */}
      <div style={{ padding: '4px 14px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {cats.map((c) => (
          <div key={c.id} style={{
            height: 34, padding: '0 12px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: c.active ? AM.accentSurface : AM.surface,
            border: `1px solid ${c.active ? '#d9b69a' : AM.border}`,
            color: c.active ? AM.accentInk : AM.ink2,
            fontFamily: AMSANS, fontSize: 12.5, fontWeight: 600,
          }}>
            <ProfileGlyph kind={c.icon} size={14} strokeWidth={2.3} />
            {c.label}
          </div>
        ))}
      </div>

      {/* Section header */}
      <div style={{ padding: '4px 18px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <AMLabel>European wide flange · HEA / HEB / IPE</AMLabel>
        <div style={{ fontFamily: AMSANS, fontSize: 11, color: AM.muted }}>12 sizes</div>
      </div>

      {/* Grid */}
      <div style={{ padding: '0 14px 110px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {sizes.map((s) => (
          <div key={s.id} style={{
            background: s.active ? AM.accentSurface : AM.surface,
            border: `1px solid ${s.active ? '#d9b69a' : AM.border}`,
            borderRadius: 14, padding: '12px 10px 10px',
            position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <div style={{ color: s.active ? AM.accent : AM.ink2 }}>
              <ProfileGlyph kind={s.kind} size={28} strokeWidth={2.3} />
            </div>
            <div style={{ fontFamily: AMSANS, fontSize: 12, fontWeight: 700, color: AM.ink, letterSpacing: -0.2 }}>{s.label}</div>
            <div style={{ fontFamily: AMTAB, fontSize: 10.5, color: AM.muted, fontVariantNumeric: 'tabular-nums' }}>{s.sub}</div>
            {s.active && (
              <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 999,
                background: AM.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ICON.check}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky bottom apply bar */}
      <div style={{
        position: 'absolute', left: 12, right: 12, bottom: 18,
        background: AM.ink, color: '#fff', borderRadius: 16,
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', boxShadow: '0 14px 30px -10px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ProfileGlyph kind="hea" size={16} strokeWidth={2.3} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: AMSANS, fontSize: 13, fontWeight: 700 }}>HEA 100</div>
            <div style={{ fontFamily: AMSANS, fontSize: 10.5, color: '#c8baa3' }}>16.7 kg/m · selected</div>
          </div>
        </div>
        <div style={{ fontFamily: AMSANS, fontSize: 13, fontWeight: 700, color: AM.accent }}>Use →</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Material picker (mid-sheet, list with swatches)
// ─────────────────────────────────────────────────────────────
function MaterialPickerA() {
  const mats = [
    { id: 'S235', label: 'Steel S235', sub: 'Carbon · 7850 kg/m³', tone: '#a08373', active: true },
    { id: 'S355', label: 'Steel S355', sub: 'High-yield · 7850 kg/m³', tone: '#7a6557' },
    { id: 'AL', label: 'Aluminum 6061', sub: '2700 kg/m³', tone: '#aab4be' },
    { id: 'AL7075', label: 'Aluminum 7075', sub: '2810 kg/m³', tone: '#9ba6b3' },
    { id: 'SS304', label: 'Stainless 304', sub: '8000 kg/m³', tone: '#bcc0c7' },
    { id: 'SS316', label: 'Stainless 316', sub: '8030 kg/m³', tone: '#a6acb6' },
    { id: 'CU', label: 'Copper', sub: 'Cu · 8960 kg/m³', tone: '#c8835d' },
    { id: 'BR', label: 'Brass', sub: 'CuZn · 8500 kg/m³', tone: '#c4a661' },
  ];
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Faded calculator behind */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }}>
        <CalcA />
      </div>
      <AMSheet top={120}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontFamily: AMDISP, fontSize: 22, fontWeight: 700, letterSpacing: -0.6, color: AM.ink }}>Material</div>
          <div style={{ fontFamily: AMSANS, fontSize: 12, color: AM.muted }}>8 saved</div>
        </div>
        <AMLabel>Density determines kg/m³ for every calc</AMLabel>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
          {mats.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px',
              borderBottom: i < mats.length - 1 ? `1px solid ${AM.border}` : 'none',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: m.tone, opacity: 0.85,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.65)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: AMSANS, fontSize: 14, fontWeight: 600, color: AM.ink, letterSpacing: -0.2 }}>{m.label}</div>
                <div style={{ fontFamily: AMTAB, fontSize: 11.5, color: AM.muted, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{m.sub}</div>
              </div>
              {m.active ? (
                <div style={{ width: 22, height: 22, borderRadius: 999, background: AM.accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ICON.check}</div>
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${AM.borderStrong}` }} />
              )}
            </div>
          ))}
        </div>

        {/* Add custom */}
        <div style={{ marginTop: 12, padding: '14px 14px', borderRadius: 14, background: AM.surfaceRaised, border: `1px dashed ${AM.borderStrong}`,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: AM.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AM.accent }}>
            {ICON.plus}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: AMSANS, fontSize: 13.5, fontWeight: 600, color: AM.ink }}>Custom density</div>
            <div style={{ fontFamily: AMSANS, fontSize: 11.5, color: AM.muted }}>Type a kg/m³ value — saved to your library</div>
          </div>
        </div>
      </AMSheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Custom density modal (small centered card)
// ─────────────────────────────────────────────────────────────
function CustomDensityA() {
  return (
    <div style={{ background: AM.bg, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}><CalcA /></div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,15,0.45)' }} />

      <div style={{
        position: 'absolute', left: 18, right: 18, top: 200,
        background: AM.surface, borderRadius: 22, padding: 20,
        boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: AMDISP, fontSize: 19, fontWeight: 700, letterSpacing: -0.4, color: AM.ink }}>Custom material</div>
          <AMIconBtn>{ICON.close}</AMIconBtn>
        </div>
        <div style={{ fontFamily: AMSANS, fontSize: 12.5, color: AM.ink2, marginTop: 4 }}>Anything not in the preset list. Stored in your library.</div>

        {/* Name */}
        <div style={{ marginTop: 14 }}>
          <AMLabel style={{ marginBottom: 6 }}>Name</AMLabel>
          <div style={{ height: 42, borderRadius: 12, background: AM.surfaceRaised, border: `1px solid ${AM.border}`,
            display: 'flex', alignItems: 'center', padding: '0 12px',
            fontFamily: AMSANS, fontSize: 14, color: AM.ink, fontWeight: 500 }}>
            Bronze CuSn8
            <span style={{ width: 2, height: 18, background: AM.accent, marginLeft: 2, animation: 'aCaret 1s infinite' }} />
          </div>
        </div>

        {/* Density */}
        <div style={{ marginTop: 12 }}>
          <AMLabel style={{ marginBottom: 6 }}>Density</AMLabel>
          <div style={{ height: 56, borderRadius: 12, background: AM.accentSurface, border: `1px solid #d9b69a`,
            display: 'flex', alignItems: 'baseline', padding: '0 14px', gap: 4 }}>
            <div style={{ fontFamily: AMTAB, fontSize: 32, fontWeight: 700, color: AM.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: -1, lineHeight: '56px' }}>8 820</div>
            <div style={{ fontFamily: AMSANS, fontSize: 13, fontWeight: 600, color: AM.accentInk }}>kg/m³</div>
          </div>
        </div>

        {/* Swatch */}
        <div style={{ marginTop: 12 }}>
          <AMLabel style={{ marginBottom: 6 }}>Swatch</AMLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {['#c8835d','#a08373','#aab4be','#c4a661','#7a6557','#bcc0c7'].map((c, i) => (
              <div key={c} style={{
                width: 32, height: 32, borderRadius: 10, background: c,
                border: i === 0 ? `2px solid ${AM.ink}` : `1px solid ${AM.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i === 0 && <div style={{ color: '#fff' }}>{ICON.check}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ height: 46, borderRadius: 14, background: AM.surfaceRaised, color: AM.ink, border: `1px solid ${AM.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AMSANS, fontSize: 14, fontWeight: 600 }}>Cancel</div>
          <div style={{ height: 46, borderRadius: 14, background: AM.ink, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AMSANS, fontSize: 14, fontWeight: 700 }}>Save material</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfilePickerA, MaterialPickerA, CustomDensityA });
