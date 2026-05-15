import { useState } from 'react';
import { createPortal } from 'react-dom';

// ─── InfoTip: hover/fixed popup (voor gebruik buiten KPI tiles) ───────────
export function InfoTip({ text, maxWidth = 260 }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ x: 0, y: 0 });

  const show = (e) => {
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  };
  const move = (e) => {
    if (open) setPos({ x: e.clientX, y: e.clientY });
  };
  const hide = () => setOpen(false);

  const above  = pos.y > window.innerHeight / 2;
  const left   = Math.min(Math.max(8, pos.x - maxWidth / 2), window.innerWidth - maxWidth - 8);
  const arrowX = Math.min(Math.max(10, pos.x - left), maxWidth - 10);

  return (
    <span style={{ display:'inline-flex', alignItems:'center', marginLeft:4, verticalAlign:'middle', flexShrink:0 }}>
      <button
        onMouseEnter={show} onMouseMove={move} onMouseLeave={hide}
        onFocus={show} onBlur={hide}
        style={{
          width:15, height:15, borderRadius:'50%',
          background:'#e8eaf0', border:'1.5px solid #b8bcc9',
          color:'#4a5270', fontSize:'0.58rem', fontWeight:800,
          cursor:'help', display:'inline-flex', alignItems:'center', justifyContent:'center',
          lineHeight:1, padding:0, flexShrink:0, fontFamily:'Georgia,serif', userSelect:'none',
        }}
        aria-label="Meer informatie"
      >i</button>

      {open && createPortal(
        <span style={{
          position:'fixed',
          top: above ? pos.y - 12 : pos.y + 18,
          transform: above ? 'translateY(-100%)' : undefined,
          left, width: maxWidth,
          background:'#1e2436', color:'rgba(255,255,255,0.93)',
          fontSize:'0.68rem', lineHeight:1.65, fontFamily:'var(--font-mono)',
          padding:'0.6rem 0.8rem', borderRadius:8, zIndex:9999,
          boxShadow:'0 8px 28px rgba(0,0,0,0.4)', whiteSpace:'normal', pointerEvents:'none',
        }}>
          {text}
          <span style={{
            position:'absolute',
            ...(above
              ? { top:'100%', borderWidth:'6px 6px 0', borderColor:'#1e2436 transparent transparent' }
              : { bottom:'100%', borderWidth:'0 6px 6px', borderColor:'transparent transparent #1e2436' }),
            left: arrowX, borderStyle:'solid', width:0, height:0,
          }} />
        </span>,
        document.body
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
