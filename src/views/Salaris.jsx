import React, { useState } from 'react';

function berekenNetto(brutoJaar) {
  // Box 1 tarieven 2024
  const schijfMax = 75518, t1 = 0.3697, t2 = 0.495;
  const ib = brutoJaar <= schijfMax ? brutoJaar * t1 : schijfMax * t1 + (brutoJaar - schijfMax) * t2;
  // AHK
  const ahkMax = 3374, ahkStart = 24812, ahkAfbouw = 0.06095;
  const ahk = Math.max(0, brutoJaar <= ahkStart ? ahkMax : brutoJaar >= schijfMax ? 0 : ahkMax - (brutoJaar - ahkStart) * ahkAfbouw);
  // Arbeidskorting (simplified)
  const akMax = 5052, akAfbStart = 37690, akAfbEind = 115302;
  let ak = 0;
  if (brutoJaar <= 10741) ak = brutoJaar * 0.08231;
  else if (brutoJaar <= 23201) ak = 10741 * 0.08231 + (brutoJaar - 10741) * 0.29861;
  else if (brutoJaar <= akAfbStart) ak = akMax;
  else if (brutoJaar >= akAfbEind) ak = 0;
  else ak = Math.max(0, akMax - (brutoJaar - akAfbStart) * 0.06010);

  const ibNetto = Math.max(0, ib - ahk - ak);
  const nettoJaar = Math.round(brutoJaar - ibNetto);
  return {
    brutoMaand: Math.round(brutoJaar / 12),
    ib: Math.round(ib), ahk: Math.round(ahk), ak: Math.round(ak),
    ibNetto: Math.round(ibNetto),
    nettoJaar, nettoMaand: Math.round(nettoJaar / 12),
    effectief: brutoJaar > 0 ? (ibNetto / brutoJaar * 100).toFixed(1) : '0.0',
  };
}

const COMPARISON_ROWS = [30000, 40000, 50000, 60000, 75000, 90000, 120000, 150000];

export default function Salaris() {
  const [bruto, setBruto] = useState(60000);

  const res = berekenNetto(bruto);
  const belastingPct = bruto > 0 ? (res.ibNetto / bruto * 100) : 0;
  const nettoPct = 100 - belastingPct;

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Tool</div>
          <h2 className="section-title">Netto salaris berekening</h2>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        {/* Card 1: input + big netto */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Bruto salaris</div>
          <div className="form-group">
            <label className="form-label">Bruto per jaar (€)</label>
            <input
              type="number" className="form-input"
              value={bruto}
              onChange={e => setBruto(Math.max(0, Number(e.target.value)))}
              step={1000} min={0} max={500000}
            />
          </div>
          <div className="form-group">
            <input
              type="range" min={0} max={200000} step={1000}
              value={Math.min(bruto, 200000)}
              onChange={e => setBruto(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)' }}>
              <span>€0</span><span>€100K</span><span>€200K</span>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(37,99,235,0.08))', borderRadius: 'var(--r)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '0.4rem' }}>Netto per maand</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>
              €{res.nettoMaand.toLocaleString('nl-NL')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
              €{res.nettoJaar.toLocaleString('nl-NL')} per jaar
            </div>
          </div>
        </div>

        {/* Card 2: breakdown */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Berekening</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            <tbody>
              {[
                { label: 'Bruto per jaar', val: bruto, color: 'var(--text)', bold: true },
                { label: '− Inkomstenbelasting (IB)', val: -res.ib, color: 'var(--red)' },
                { label: '+ Algemene heffingskorting', val: res.ahk, color: 'var(--green)' },
                { label: '+ Arbeidskorting', val: res.ak, color: 'var(--green)' },
                { label: '= Netto per jaar', val: res.nettoJaar, color: 'var(--accent)', bold: true },
              ].map(({ label, val, color, bold }) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-3)' }}>{label}</td>
                  <td style={{ padding: '0.5rem 0', textAlign: 'right', color, fontWeight: bold ? 700 : 400 }}>
                    €{Math.abs(val).toLocaleString('nl-NL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Kleurenbalk */}
          {bruto > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', borderRadius: 'var(--r-sm)', overflow: 'hidden', height: 12 }}>
                <div style={{ width: `${nettoPct}%`, background: 'var(--green)', transition: 'width 0.2s' }} />
                <div style={{ width: `${belastingPct}%`, background: 'var(--red)', opacity: 0.7, transition: 'width 0.2s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>
                <span style={{ color: 'var(--green)' }}>Netto {nettoPct.toFixed(1)}%</span>
                <span style={{ color: 'var(--red)' }}>Belasting {belastingPct.toFixed(1)}%</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
            Effectief belastingtarief: <strong>{res.effectief}%</strong>
          </div>
        </div>
      </div>

      {/* Card 3: Vergelijkingstabel */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-title" style={{ marginBottom: '1rem' }}>Vergelijkingstabel</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Bruto/jaar', 'Bruto/mnd', 'Belasting', 'Kortingen', 'Netto/mnd', 'Eff. tarief'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map(b => {
                const r2 = berekenNetto(b);
                const isSelected = b === bruto || (bruto > b - 5000 && bruto <= b);
                return (
                  <tr
                    key={b}
                    onClick={() => setBruto(b)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: isSelected ? 700 : 400, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>€{b.toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>€{r2.brutoMaand.toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--red)' }}>€{r2.ibNetto.toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--green)' }}>€{(r2.ahk + r2.ak).toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>€{r2.nettoMaand.toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--amber)' }}>{r2.effectief}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: 'var(--r)',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.7,
      }}>
        Indicatief · Box 1 tarieven 2024 · excl. ZVW en pensioenpremie
      </div>
    </div>
  );
}
