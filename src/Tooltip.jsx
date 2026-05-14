import { useState } from 'react';

// ─── InfoTip: hover/fixed popup (voor gebruik buiten KPI tiles) ───────────
export function InfoTip({ text, maxWidth = 260 }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top:0, left:0, above:true });
  const [btnEl, setBtnEl] = useState(null);

  const reposition = (el) => {
    if (!el) return;
    const r     = el.getBoundingClientRect();
    const above = r.top > 140;
    const left  = Math.min(Math.max(8, r.left + r.width/2 - maxWidth/2), window.innerWidth - maxWidth - 8);
    setPos({ top: r.top, bottom: window.innerHeight - r.top, left, above });
  };

  const show = (e) => { reposition(e.currentTarget); setOpen(true); };
  const hide = () => setOpen(false);

  const arrowLeft = btnEl
    ? Math.min(Math.max(10, btnEl.getBoundingClientRect().left + 7 - pos.left), maxWidth - 10)
    : maxWidth / 2;

  return (
    <span style={{ position:'relative', display:'inline-flex', alignItems:'center', marginLeft:4, verticalAlign:'middle', flexShrink:0 }}>
      <button
        ref={setBtnEl}
        onMouseEnter={show} onMouseLeave={hide}
        onFocus={show} onBlur={hide}
        onClick={() => open ? hide() : show({ currentTarget: btnEl })}
        style={{
          width:15, height:15, borderRadius:'50%',
          background:'#e8eaf0', border:'1.5px solid #b8bcc9',
          color:'#4a5270', fontSize:'0.58rem', fontWeight:800,
          cursor:'help', display:'inline-flex', alignItems:'center', justifyContent:'center',
          lineHeight:1, padding:0, flexShrink:0, fontFamily:'Georgia,serif', userSelect:'none',
        }}
        aria-label="Meer informatie"
      >i</button>

      {open && (
        <span style={{
          position:'fixed',
          ...(pos.above ? { bottom: pos.bottom + 8 } : { top: pos.top + 22 }),
          left: pos.left, width: maxWidth,
          background:'#1e2436', color:'rgba(255,255,255,0.93)',
          fontSize:'0.68rem', lineHeight:1.65, fontFamily:'var(--font-mono)',
          padding:'0.6rem 0.8rem', borderRadius:8, zIndex:9999,
          boxShadow:'0 8px 28px rgba(0,0,0,0.4)', whiteSpace:'normal', pointerEvents:'none',
        }}>
          {text}
          <span style={{
            position:'absolute',
            ...(pos.above
              ? { top:'100%', borderWidth:'6px 6px 0', borderColor:'#1e2436 transparent transparent' }
              : { bottom:'100%', borderWidth:'0 6px 6px', borderColor:'transparent transparent #1e2436' }),
            left: arrowLeft, borderStyle:'solid', width:0, height:0,
          }} />
        </span>
      )}
    </span>
  );
}

// ─── KpiTip: klik-toggle met uitleg ónder de tegel ──
export function KpiTip({ tip, children, style }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={style}>
      {children}
      <div style={{ display:'flex', alignItems:'center', marginTop:'0.3rem' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            border:'none', background:'none', cursor:'pointer',
            color: open ? 'var(--accent)' : 'var(--text-3)',
            fontSize:'0.72rem', padding:0, lineHeight:1,
            fontFamily:'Georgia,serif', userSelect:'none',
            transition:'color 0.15s',
          }}
          aria-label={open ? 'Verberg uitleg' : 'Toon uitleg'}
        >ⓘ</button>
      </div>
      {open && (
        <div style={{
          marginTop:'0.4rem',
          fontSize:'0.65rem', fontFamily:'var(--font-mono)',
          color:'var(--ink-muted)', lineHeight:1.65,
          borderTop:'1px solid var(--border)', paddingTop:'0.4rem',
        }}>
          {tip}
        </div>
      )}
    </div>
  );
}
