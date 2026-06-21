import React, { useState } from 'react';
import { fmt } from '../data.js';

function vereistInleg(huidigePortfolio, doel, jaren, r) {
  if (jaren <= 0) return doel > huidigePortfolio ? Infinity : 0;
  const fv = huidigePortfolio * Math.pow(1 + r, jaren);
  if (fv >= doel) return 0;
  const af = r > 0.0001 ? (Math.pow(1 + r, jaren) - 1) / r : jaren;
  return Math.max(0, (doel - fv) / af);
}


export default function Planner({ params, start, pkVloer, pkStreef, pensioenKapitaal, birthYear, userType }) {
  const isPrive = userType === 'prive';
  const pensioenLeeftijd = params?.pensioenLeeftijd ?? 55;
  const r = params?.meanReturn ?? 0.097;
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - (birthYear ?? 1985);

  const huidigPortfolio = (start?.bv ?? 0) + (start?.prive ?? 0);

  const [doelLeeftijd, setDoelLeeftijd] = useState(pensioenLeeftijd);

  const tiers = [
    { label: 'Floor',   pk: pkVloer         ?? 0, kleur: 'var(--accent)' },
    { label: 'Streef',  pk: pkStreef         ?? 0, kleur: 'var(--green)'  },
    { label: 'Comfort', pk: pensioenKapitaal ?? 0, kleur: 'var(--amber)'  },
  ];

  const jaren = Math.max(0, doelLeeftijd - currentAge);

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Tool</div>
          <h2 className="section-title">FIRE Planner</h2>
        </div>
      </div>

      {/* Card 1: Benodigde inleg */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Benodigde inleg per maand</div>
            <div className="card-subtitle">Hoeveel inleg heb ik nodig voor FIRE op leeftijd X?</div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">
            Doelleeftijd: <strong>{doelLeeftijd} jaar</strong>
            {' '}({currentYear + jaren} · over {jaren} jaar)
          </label>
          <input
            type="range" min={40} max={70} step={1}
            value={doelLeeftijd}
            onChange={e => setDoelLeeftijd(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', marginTop: '0.5rem' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)' }}>
            <span>40j</span><span>55j</span><span>70j</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
          {tiers.map(({ label, pk, kleur }) => {
            const inlegJaar = pk > 0 ? vereistInleg(huidigPortfolio, pk, jaren, r) : null;
            const inlegMaand = inlegJaar != null && isFinite(inlegJaar) ? Math.ceil(inlegJaar / 12) : null;
            return (
              <div key={label} style={{ padding: '1rem', borderRadius: 'var(--r)', background: 'var(--surface-2)', borderLeft: `3px solid ${kleur}` }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: kleur, marginBottom: '0.4rem' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700 }}>
                  {pk <= 0 ? '—' : inlegMaand === null ? '∞' : inlegMaand === 0 ? 'Al bereikt' : `€${inlegMaand.toLocaleString()}/mnd`}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>
                  doel: {pk > 0 ? fmt(pk) : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

{/* Disclaimer */}
      <div style={{
        padding: '0.75rem 1rem', borderRadius: 'var(--r)',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.7,
      }}>
        Analytische schatting · geen inflatie · geen Monte Carlo. Zie Dashboard voor volledige projectie.
      </div>
    </div>
  );
}
