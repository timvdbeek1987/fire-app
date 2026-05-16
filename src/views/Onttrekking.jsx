import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { BASE_PARAMS, fmt } from '../data.js';

const STRATEGIES = [
  {
    id: 'annuiteit',
    naam: 'Annuïteit',
    emoji: '📅',
    kleur: 'var(--green)',
    sub: 'Vaste maandelijkse onttrekking — pot precies €0 op doelleeftijd',
    uitleg: 'Je onttrekt elk maand hetzelfde bedrag (in huidig koopkrachtniveau). De pot is precies leeg op je doelleeftijd. Eenvoudig en voorspelbaar — handig als je weet dat je AOW en pensioen aanvullen.',
  },
  {
    id: 'swr',
    naam: '4% Regel',
    emoji: '📊',
    kleur: 'var(--accent)',
    sub: 'Jaarlijks 4% van startportefeuille — gecorrigeerd voor inflatie',
    uitleg: 'De klassieke Trinity Study-regel: onttrek jaarlijks 4% van je startportefeuille, elk jaar gecorrigeerd voor inflatie. Historisch overleeft de portefeuille 30+ jaar in 90%+ van de gevallen. Met lager echt rendement (na VRH) kan de pot toch slinken.',
  },
  {
    id: 'vpw',
    naam: 'Dynamisch (VPW)',
    emoji: '📈',
    kleur: 'var(--amber)',
    sub: 'Jaarlijks % van huidige portefeuille — flexibel naar markt',
    uitleg: 'Variable Percentage Withdrawal: elk jaar onttrek je een percentage van de HUIDIGE portefeuille, berekend zodat de pot leeg is op je doelleeftijd. In goede beursjaren meer inkomen, in slechte jaren minder. Nooit eerder leeg.',
  },
];

// Annuity factor: PV of n beginning-of-period payments at rate r
// P = PMT * annuityFactor  →  PMT = P / annuityFactor
function annuityFactor(r, n) {
  if (n <= 0) return 1;
  if (Math.abs(r) < 0.0001) return n;
  return (1 + r) * (1 - Math.pow(1 + r, -n)) / r;
}

// Compute depletion path in REAL (today's) euros
function berekenPad(strategie, P0, pensioenLft, uitputtingLft, r) {
  if (P0 <= 0) return [];
  const maxLft = Math.max(uitputtingLft + 10, 95);
  const nTotal = Math.max(1, uitputtingLft - pensioenLft);

  const fixedPmt = strategie === 'swr'
    ? P0 * 0.04
    : strategie === 'annuiteit'
      ? P0 / annuityFactor(r, nTotal)
      : 0;

  const data = [];
  let p = P0;

  for (let lft = pensioenLft; lft <= maxLft; lft++) {
    if (p <= 0) {
      for (let l = lft; l <= maxLft; l++) data.push({ leeftijd: l, waarde: 0, mndOntrekking: 0 });
      break;
    }

    let pmt;
    if (strategie === 'vpw') {
      const restJ = Math.max(1, uitputtingLft - lft + 1);
      pmt = p / annuityFactor(r, restJ);
    } else {
      pmt = Math.min(fixedPmt, p);
    }

    data.push({ leeftijd: lft, waarde: Math.round(p), mndOntrekking: Math.round(pmt / 12) });
    p = Math.max(0, (p - pmt) * (1 + r));
  }

  const lastLft = data[data.length - 1]?.leeftijd ?? pensioenLft - 1;
  for (let l = lastLft + 1; l <= maxLft; l++) data.push({ leeftijd: l, waarde: 0, mndOntrekking: 0 });

  return data;
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--paper-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.7rem 1rem' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-muted)', marginBottom: 4 }}>Leeftijd {label}j</div>
      {payload.map((p, i) => p.value > 0 && (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{p.name}: <b>{fmt(p.value)}</b></span>
        </div>
      ))}
    </div>
  );
};

export default function Onttrekking({
  params, priveOpPensioendag, totaalOpPensioendag,
  birthYear = BASE_PARAMS.geboortejaar, userType = 'dga',
}) {
  const isPrive = userType === 'prive';
  const pensioenLft  = params.pensioenLeeftijd    ?? 55;
  const uitputtingLft = params.uitputtingsLeeftijd ?? 90;
  const currentAge   = new Date().getFullYear() - birthYear;

  const verwachtPortfolio = isPrive ? priveOpPensioendag : totaalOpPensioendag;

  const [portfolioInput, setPortfolioInput] = useState(null);
  const [selected, setSelected] = useState('annuiteit');

  const portfolio = portfolioInput ?? verwachtPortfolio ?? 0;

  // Real net annual return after VRH and inflation
  const rNettoJaar = useMemo(() => {
    const rNom = params.rendementNaPensioen        ?? 0.05;
    const vrh  = params.vermogensrendementsheffing ?? BASE_PARAMS.vermogensrendementsheffing;
    const inf  = params.inflatieGemiddeld          ?? 0.02;
    return (1 + rNom - vrh) / (1 + inf) - 1;
  }, [params]);

  // Convert nominal pension portfolio to real today's euros
  const portfolioReeel = useMemo(() => {
    const inf      = params.inflatieGemiddeld ?? 0.02;
    const jaarTot  = Math.max(0, pensioenLft - currentAge);
    return portfolio / Math.pow(1 + inf, jaarTot);
  }, [portfolio, params, pensioenLft, currentAge]);

  const paths = useMemo(() => {
    const res = {};
    for (const { id } of STRATEGIES) {
      res[id] = berekenPad(id, portfolioReeel, pensioenLft, uitputtingLft, rNettoJaar);
    }
    return res;
  }, [portfolioReeel, pensioenLft, uitputtingLft, rNettoJaar]);

  const depletionAge = id => {
    const dep = paths[id]?.find(r => r.waarde === 0);
    return dep?.leeftijd ?? null;
  };
  const maandBij = id => paths[id]?.[0]?.mndOntrekking ?? 0;

  // Merge paths for comparison chart
  const chartData = useMemo(() => {
    const ages = paths[STRATEGIES[0].id]?.map(r => r.leeftijd) ?? [];
    const byAge = lft => ({
      leeftijd: lft,
      annuiteit: paths.annuiteit?.find(r => r.leeftijd === lft)?.waarde ?? 0,
      swr:       paths.swr?.find(r => r.leeftijd === lft)?.waarde ?? 0,
      vpw:       paths.vpw?.find(r => r.leeftijd === lft)?.waarde ?? 0,
    });
    return ages.map(byAge);
  }, [paths]);

  if (!verwachtPortfolio && portfolioInput === null) {
    return (
      <div className="fade-up">
        <div className="section-header">
          <div>
            <div className="section-eyebrow">Strategie</div>
            <h2 className="section-title">Onttrekkingsstrategie</h2>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Simulatie nog niet beschikbaar — voer je portefeuille in via Voortgang.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-4)', marginBottom: '1rem' }}>
            Of vul hieronder een startbedrag in om strategieën te verkennen:
          </div>
          <input
            type="number" className="form-input"
            style={{ maxWidth: 200, margin: '0 auto' }}
            placeholder="Startportefeuille €"
            step={10000} min={0}
            onChange={e => setPortfolioInput(e.target.value ? Math.max(0, Number(e.target.value)) : null)}
          />
        </div>
      </div>
    );
  }

  const selectedStrat = STRATEGIES.find(s => s.id === selected);
  const selectedPath  = paths[selected] ?? [];

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Strategie</div>
          <h2 className="section-title">Onttrekkingsstrategie</h2>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
          Pensioen op {pensioenLft}j · Doelleeftijd {uitputtingLft}j
        </div>
      </div>

      {/* Portfolio input row */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Startportefeuille op pensioenleeftijd
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>€</span>
              <input
                type="number" className="form-input"
                style={{ maxWidth: 160 }}
                step={10000} min={0}
                value={portfolioInput ?? (verwachtPortfolio || '')}
                placeholder="bijv. 500000"
                onChange={e => setPortfolioInput(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
              />
              {portfolioInput !== null && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', minHeight: 'auto' }}
                  onClick={() => setPortfolioInput(null)}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.8 }}>
            <div>Normaal scenario verwacht op pensioendag: <strong style={{ color: 'var(--text)' }}>{fmt(verwachtPortfolio)}</strong></div>
            <div>Reëel vandaag: <strong style={{ color: 'var(--text)' }}>{fmt(portfolioReeel)}</strong></div>
            <div>Reëel netto rendement: <strong style={{ color: 'var(--text)' }}>{(rNettoJaar * 100).toFixed(2)}%/jaar</strong></div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-4)', lineHeight: 1.7, maxWidth: 280 }}>
            Alle bedragen hieronder zijn in <strong>huidig koopkrachtniveau</strong> (reëel). Het werkelijke toekomstige bedrag is hoger door inflatie. AOW (~€1.390/mnd) en pensioen tellen op als extra inkomen bovenop de onttrekking.
          </div>
        </div>
      </div>

      {/* Strategy selector */}
      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        {STRATEGIES.map(({ id, naam, emoji, sub, kleur }) => {
          const depl   = depletionAge(id);
          const mnd    = maandBij(id);
          const active = selected === id;
          return (
            <div
              key={id}
              className="card"
              onClick={() => setSelected(id)}
              style={{
                cursor: 'pointer',
                borderTop: `3px solid ${active ? kleur : 'var(--border)'}`,
                outline: active ? `2px solid ${kleur}33` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: kleur }}>
                  {emoji} {naam}
                </span>
                {active && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: kleur, background: `${kleur}22`, padding: '1px 6px', borderRadius: 10 }}>actief</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 700, lineHeight: 1 }}>
                €{mnd.toLocaleString('nl-NL')}
                <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--text-3)', marginLeft: '0.3rem' }}>/mnd</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)', marginTop: '0.2rem', marginBottom: '0.6rem' }}>reëel · huidig geld</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem', marginBottom: '0.4rem' }}>
                {depl
                  ? <span style={{ color: 'var(--amber)' }}>⚠ Pot leeg op leeftijd {depl}j</span>
                  : <span style={{ color: 'var(--green)' }}>✓ Pot blijft gevuld tot {uitputtingLft}j+</span>
                }
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.61rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{sub}</div>
            </div>
          );
        })}
      </div>

      {/* Comparison chart */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Portefeuilleverloop — alle 3 strategieën</div>
            <div className="card-subtitle">Reëel vermogen (huidig geld) · analytisch gemiddeld rendement · geselecteerde strategie dikker</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
          {STRATEGIES.map(({ id, naam, kleur }) => (
            <span
              key={id}
              onClick={() => setSelected(id)}
              style={{ cursor: 'pointer', color: kleur, opacity: selected === id ? 1 : 0.5 }}
            >
              ── {naam}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="leeftijd"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-3)' }}
              tickLine={false} axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={v => `${v}j`} interval={4}
            />
            <YAxis
              tickFormatter={v => v >= 1e6 ? `€${(v / 1e6).toFixed(1)}M` : `€${Math.round(v / 1000)}K`}
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-3)' }}
              axisLine={false} tickLine={false} width={60}
            />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine x={uitputtingLft} stroke="var(--amber)" strokeDasharray="4 3" label={{ value: 'Doel', fill: 'var(--amber)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
            {STRATEGIES.map(({ id, kleur, naam }) => (
              <Line
                key={id} dataKey={id} name={naam} stroke={kleur}
                strokeWidth={selected === id ? 3 : 1.5}
                strokeOpacity={selected === id ? 1 : 0.35}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Selected strategy detail */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '0.5rem' }}>
          {selectedStrat.emoji} {selectedStrat.naam} — details
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
          {selectedStrat.uitleg}
        </p>

        {/* 3 KPI chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Maandelijks (reëel)', val: `€${maandBij(selected).toLocaleString('nl-NL')}/mnd`, kleur: selectedStrat.kleur },
            { label: 'Jaarlijks (reëel)',   val: `€${(maandBij(selected) * 12).toLocaleString('nl-NL')}/jaar`, kleur: 'var(--text)' },
            {
              label: depletionAge(selected) ? 'Pot leeg op' : 'Pot status',
              val: depletionAge(selected) ? `leeftijd ${depletionAge(selected)}j` : `gevuld tot ${uitputtingLft}j+`,
              kleur: depletionAge(selected) ? 'var(--amber)' : 'var(--green)',
            },
          ].map(({ label, val, kleur }) => (
            <div key={label} style={{ padding: '0.7rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: kleur }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Per-5-years table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Leeftijd</th>
                <th className="num">Portefeuille (reëel)</th>
                <th className="num">Onttrekking/mnd</th>
                <th className="num">Jaarlijks totaal</th>
              </tr>
            </thead>
            <tbody>
              {selectedPath
                .filter(r =>
                  r.leeftijd === pensioenLft ||
                  (r.leeftijd - pensioenLft) % 5 === 0 ||
                  r.leeftijd === uitputtingLft
                )
                .slice(0, 16)
                .map(r => (
                  <tr
                    key={r.leeftijd}
                    style={r.leeftijd === uitputtingLft ? { background: 'rgba(217,119,6,0.07)' } : {}}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: r.leeftijd === uitputtingLft ? 700 : 400 }}>
                      {r.leeftijd}j
                    </td>
                    <td className="num">{r.waarde > 0 ? fmt(r.waarde) : <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                    <td className="num" style={{ color: r.mndOntrekking > 0 ? 'var(--text)' : 'var(--text-4)' }}>
                      {r.mndOntrekking > 0 ? `€${r.mndOntrekking.toLocaleString('nl-NL')}` : '—'}
                    </td>
                    <td className="num" style={{ color: 'var(--text-3)' }}>
                      {r.mndOntrekking > 0 ? `€${(r.mndOntrekking * 12).toLocaleString('nl-NL')}` : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-4)', lineHeight: 1.7 }}>
          Reëel = huidig koopkrachtniveau · nominaal rendement na pensioen {((params.rendementNaPensioen ?? 0.05) * 100).toFixed(1)}% · VRH {((params.vermogensrendementsheffing ?? BASE_PARAMS.vermogensrendementsheffing) * 100).toFixed(2)}% · inflatie {((params.inflatieGemiddeld ?? 0.02) * 100).toFixed(1)}% · reëel netto {(rNettoJaar * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}
