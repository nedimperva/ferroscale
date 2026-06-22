// concept-a-mobile.jsx — additional mobile screens for Numpad-native (Concept A).
// Re-uses the cream/orange DNA. All screens are 402×874 (iPhone canvas).

const AM = {
  bg: '#efeae0',
  surface: '#fbf8f1',
  surfaceRaised: '#f3ede1',
  surfaceInset: '#e6dfd0',
  border: 'rgba(20,18,15,0.07)',
  borderStrong: 'rgba(20,18,15,0.12)',
  ink: '#1a1611',
  ink2: '#5a5247',
  muted: '#8d8779',
  faint: '#cbc4b3',
  accent: '#a35a32',
  accentSurface: '#f5e7da',
  accentInk: '#6e3a17',
  pad: '#e9e2d2',
  pos: '#198560',
  posSurface: '#e3f1e8',
  neg: '#a83b29',
  negSurface: '#f5dcd6',
};

const AMSANS = '-apple-system, "SF Pro Text", system-ui, sans-serif';
const AMDISP = '-apple-system, "SF Pro Display", system-ui, sans-serif';
const AMTAB = '"SF Pro Display", -apple-system, system-ui, sans-serif';

// ─────────────────────────────────────────────────────────────
// Atoms shared across the new screens
// ─────────────────────────────────────────────────────────────
function AMLabel({ children, color, style }) {
  return <div style={{ fontFamily: AMSANS, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: color || AM.muted, textTransform: 'uppercase', ...style }}>{children}</div>;
}

function AMNavBar({ title, leading, trailing }) {
  return (
    <div style={{ padding: '58px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{leading}</div>
      <div style={{ flex: 1, textAlign: 'center', fontFamily: AMSANS, fontSize: 15, fontWeight: 700, color: AM.ink, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{trailing}</div>
    </div>
  );
}

function AMIconBtn({ children, onPress }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 999, background: AM.surface, border: `1px solid ${AM.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: AM.ink2,
    }}>{children}</div>
  );
}

const ICON = {
  chev: <svg width="6" height="11" viewBox="0 0 6 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4.5L1 10"/></svg>,
  back: <svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 7l7 6"/></svg>,
  close: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  more: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  bookmark: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>,
  folder: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 002-2V8a2 2 0 00-2-2h-7.9a2 2 0 01-1.69-.9L9.6 3.9A2 2 0 008 3H4a2 2 0 00-2 2v13a2 2 0 002 2z"/></svg>,
  swap: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16L3 20l4 4M3 20h13a4 4 0 004-4M17 8l4-4-4-4M21 4H8a4 4 0 00-4 4"/></svg>,
};

// Bottom-sheet wrapper for the mobile screens (top-y is screen offset)
function AMSheet({ children, top = 56, padded = true, scrim = 0.36 }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(20,18,15,${scrim})` }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top, bottom: 0,
        background: AM.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        boxShadow: '0 -18px 40px rgba(0,0,0,0.18)',
        padding: padded ? '8px 18px 28px' : 0,
        overflow: 'hidden',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(20,18,15,0.18)', margin: '4px auto 10px' }} />
        {children}
      </div>
    </>
  );
}

Object.assign(window, { AM, AMSANS, AMDISP, AMTAB, AMLabel, AMNavBar, AMIconBtn, ICON, AMSheet });
