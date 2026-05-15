import React, { useState, useMemo } from 'react';
import { BASE_PARAMS, fmt } from '../data.js';

const CATEGORIEEN = [
  { key: 'hypotheek',    label: 'Hypotheek / huur',      groep: 'vast',      default: 1500 },
  { key: 'energie',      label: 'Energie & water',        groep: 'vast',      default: 175  },
  { key: 'verzekering',  label: 'Verzekeringen',          groep: 'vast',      default: 275  },
  { key: 'abonnementen', label: 'Abonnementen',           groep: 'vast',      default: 100  },
  { key: 'boodschappen', label: 'Boodschappen',           groep: 'vast',      default: 600  },
  { key: 'uiteten',      label: 'Uit eten & cafe',        groep: 'variabel',  default: 250  },
  { key: 'transport',    label: 'Transport & auto',       groep: 'variabel',  default: 200  },
  { key: 'vakantie',     label: 'Vakanties (per maand)',  groep: 'variabel',  default: 200  },
  { key: 'kleding',      label: 'Kleding & persoonlijk',  groep: 'variabel',  default: 100  },
  { key: 'overig',       label: 'Overig',                 groep: 'variabel',  default: 150  },
];

const GROEPEN = [
  { id: 'vast',     label: 'Vaste lasten',    kleur: 'var(--accent)' },
  { id: 'variabel', label: 'Variabele lasten', kleur: 'var(--amber)'  },
];

function fmtEur(n) {
  return `€${Math.round(n).toLocaleString('nl-NL')}`;
}

// Eindvermogen extra inleg via annuïteitsformule (maandelijkse PMT)
function extraEindvermogen(extraMaand, jaarRendement, aantalJaren) {
  if (aantalJaren <= 0 || extraMaand <= 0) return 0;
  const r = jaarRendement / 12;
  const n = aantalJaren * 12;
  if (Math.abs(r) < 0.000001) return extraMaand * n;
  return extraMaand * (Math.pow(1 + r, n) - 1) / r;
}

export default function Budget({ params, onParamsChange }) {
  const pensioenLft = params.pensioenLeeftijd ?? 55;
  const geboortejaar = params.geboortejaar ?? BASE_PARAMS.geboortejaar;
  const currentAge  = new Date().getFullYear() - geboortejaar;
  const jaarTotPensioen = Math.max(0, pensioenLft - currentAge);
  const meanReturn = params.meanReturn ?? 0.097;
  const huidigInleg = params.inlegJaarlijksPrive ?? BASE_PARAMS.inlegJaarlijksPrive;

  const [inkomen, setInkomen] = useState(() => params.budget?.inkomen ?? 5000);
  const [uitgaven, setUitgaven] = useState(() =>
    Object.fromEntries(CATEGORIEEN.map(c => [c.key, params.budget?.[c.key] ?? c.default]))
  );
  const [opgeslagen, setOpgeslagen] = useState(false);

  const heeftWijzigingen = inkomen !== (params.budget?.inkomen ?? 5000) ||
    CATEGORIEEN.some(c => uitgaven[c.key] !== (params.budget?.[c.key] ?? c.default));

  const slaAllesOp = () => {
    if (!onParamsChange) return;
    onParamsChange({ ...params, budget: { inkomen, ...uitgaven } });
    setOpgeslagen(true);
    setTimeout(() => setOpgeslagen(false), 2500);
  };

  const set = key => val => setUitgaven(p => ({ ...p, [key]: Math.max(0, val) }));

  const totaalUitgaven = useMemo(
    () => Object.values(uitgaven).reduce((s, v) => s + v, 0),
    [uitgaven]
  );

  const beschikbaar = Math.max(0, inkomen - totaalUitgaven);
  const huidigInlegMaand = Math.round(huidigInleg / 12);

  const slaInlegOp = () => {
    if (!onParamsChange || beschikbaar <= 0) return;
    onParamsChange({ ...params, inlegJaarlijksPrive: beschikbaar * 12 });
    setOpgeslagen(true);
    setTimeout(() => setOpgeslagen(false), 2500);
  };

  // Per-category share for the visual bar
  const totalForBar = Math.max(1, totaalUitgaven + beschikbaar);

  // Impact scenarios for compound interest table
  const scenariosExtra = [25, 50, 100, 200, 500].filter(x => x <= beschikbaar + 100);

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Tool</div>
          <h2 className="section-title">Budget & inlegplanner</h2>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
          {jaarTotPensioen}j tot pensioen · rendement {(meanReturn * 100).toFixed(1)}%
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* Inkomen + uitgaven */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Netto maandinkomen</div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>€</span>
              <input
                type="number" className="form-input"
                style={{ maxWidth: 140 }}
                value={inkomen} step={100} min={0}
                onChange={e => setInkomen(Math.max(0, Number(e.target.value)))}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)' }}>/mnd netto</span>
            </div>
          </div>

          {GROEPEN.map(({ id, label, kleur }) => (
            <div key={id} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: kleur, marginBottom: '0.5rem' }}>{label}</div>
              {CATEGORIEEN.filter(c => c.groep === id).map(c => (
                <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)', flex: 1 }}>{c.label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-4)' }}>€</span>
                    <input
                      type="number" className="form-input"
                      style={{ maxWidth: 90, textAlign: 'right', padding: '0.3rem 0.5rem' }}
                      value={uitgaven[c.key]} step={25} min={0}
                      onChange={e => set(c.key)(Number(e.target.value))}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Budget overzicht + balk */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>Budget overzicht</div>

            {/* Stacked bar */}
            <div style={{ display: 'flex', borderRadius: 'var(--r-sm)', overflow: 'hidden', height: 14, marginBottom: '0.4rem' }}>
              {CATEGORIEEN.map(c => (
                <div
                  key={c.key}
                  style={{
                    width: `${(uitgaven[c.key] / totalForBar) * 100}%`,
                    background: GROEPEN.find(g => g.id === c.groep)?.kleur,
                    opacity: c.groep === 'vast' ? 0.8 : 0.55,
                    transition: 'width 0.2s',
                  }}
                />
              ))}
              <div style={{ flex: 1, background: 'var(--green)', opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--accent)' }}>Vast</span>
              <span style={{ color: 'var(--amber)' }}>Variabel</span>
              <span style={{ color: 'var(--green)' }}>Inlegbaar</span>
            </div>

            {/* Summary rows */}
            {[
              { label: 'Netto inkomen', val: inkomen, kleur: 'var(--text)', bold: true },
              { label: 'Vaste lasten', val: -CATEGORIEEN.filter(c => c.groep === 'vast').reduce((s, c) => s + uitgaven[c.key], 0), kleur: 'var(--accent)' },
              { label: 'Variabele lasten', val: -CATEGORIEEN.filter(c => c.groep === 'variabel').reduce((s, c) => s + uitgaven[c.key], 0), kleur: 'var(--amber)' },
            ].map(({ label, val, kleur, bold }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-3)' }}>{label}</span>
                <span style={{ color: kleur, fontWeight: bold ? 700 : 400 }}>
                  {val < 0 ? '−' : ''}{fmtEur(Math.abs(val))}/mnd
                </span>
              </div>
            ))}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>Beschikbaar om te beleggen</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: beschikbaar > 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmtEur(beschikbaar)}/mnd
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
              <span>Huidig ingestelde inleg</span>
              <span>{fmtEur(huidigInlegMaand)}/mnd</span>
            </div>

            {beschikbaar !== huidigInlegMaand && (
              <button
                className={`btn ${opgeslagen ? 'btn-gold' : 'btn-primary'} w-full`}
                style={{ justifyContent: 'center', marginBottom: '0.5rem' }}
                onClick={slaInlegOp}
                disabled={beschikbaar <= 0}
              >
                {opgeslagen ? '✓ Opgeslagen' : `Sla ${fmtEur(beschikbaar)}/mnd op als inleg`}
              </button>
            )}

            <button
              className="btn w-full"
              style={{ justifyContent: 'center', background: heeftWijzigingen ? 'var(--surface-2)' : 'transparent', border: '1px solid var(--border)', color: heeftWijzigingen ? 'var(--text)' : 'var(--text-4)', cursor: heeftWijzigingen ? 'pointer' : 'default' }}
              onClick={slaAllesOp}
              disabled={!heeftWijzigingen}
            >
              {heeftWijzigingen ? 'Budget opslaan' : '✓ Budget opgeslagen'}
            </button>
          </div>

          {/* Totaal per categorie */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '0.75rem' }}>Per categorie</div>
            {CATEGORIEEN.map(c => {
              const pct = inkomen > 0 ? (uitgaven[c.key] / inkomen * 100) : 0;
              return (
                <div key={c.key} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>{c.label}</span>
                    <span>{fmtEur(uitgaven[c.key])}/mnd <span style={{ color: 'var(--text-4)' }}>({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: GROEPEN.find(g => g.id === c.groep)?.kleur, transition: 'width 0.2s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compound interest impact */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Wat levert bezuinigen op?</div>
            <div className="card-subtitle">
              Extra inleg → rendement {(meanReturn * 100).toFixed(1)}% · {jaarTotPensioen}j tot pensioen
            </div>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Extra inleg/mnd</th>
                <th className="num">Extra/jaar</th>
                <th className="num">Extra eindvermogen</th>
                <th>Minder dan</th>
              </tr>
            </thead>
            <tbody>
              {scenariosExtra.map(x => {
                const eindv = extraEindvermogen(x, meanReturn, jaarTotPensioen);
                // Find a category that costs approximately x euro
                const cat = CATEGORIEEN.find(c => Math.abs(uitgaven[c.key] - x) < 50);
                return (
                  <tr key={x}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>+{fmtEur(x)}/mnd</td>
                    <td className="num">{fmtEur(x * 12)}</td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(eindv)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {cat ? `bijv. de helft van ${cat.label.toLowerCase()}` : '—'}
                    </td>
                  </tr>
                );
              })}
              {beschikbaar > 0 && (
                <tr style={{ background: 'rgba(16,185,129,0.06)' }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green)' }}>+{fmtEur(beschikbaar)}/mnd</td>
                  <td className="num">{fmtEur(beschikbaar * 12)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(extraEindvermogen(beschikbaar, meanReturn, jaarTotPensioen))}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600 }}>← volledig beschikbaar budget</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-4)', lineHeight: 1.7 }}>
          Eindvermogen berekend als toekomstige waarde van maandelijkse inleg bij {(meanReturn * 100).toFixed(1)}% nominaal rendement · vóór VRH en belasting · indicatief
        </div>
      </div>
    </div>
  );
}
