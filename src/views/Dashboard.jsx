import React, { useMemo } from 'react';
import JaarTick from '../JaarTick.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CheckCircle, Clock } from 'lucide-react';
import { BASE_PARAMS, fmt, fmtFull, berekenVereistKapitaalAnalytisch } from '../data.js';
import { InfoTip } from '../Tooltip.jsx';

const CURRENT_YEAR = new Date().getFullYear();

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--paper-card)', border:'1px solid var(--border)', borderRadius:6, padding:'0.7rem 1rem' }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-muted)', marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => p.value != null && (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:p.color }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>{p.name}: <b>{fmt(p.value)}</b></span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({
  params, start, mcResult, pensioenKapitaal, pkLoading,
  pkVloer, pkStreef, priveOpPensioendag, countdown, countdownVloer, countdownStreef,
  birthYear = BASE_PARAMS.geboortejaar, userType = 'dga',
}) {
  const isPrive = userType === 'prive';
  const pensioenLeeftijd = params.pensioenLeeftijd ?? 55;
  const pensioenJaar     = birthYear + pensioenLeeftijd;
  const bvNu             = start.bv   ?? 0;
  const priveNu          = start.prive ?? 0;
  const totaalNu         = bvNu + priveNu;
  const currentAge       = CURRENT_YEAR - birthYear;

  // Countdown tiers
  const cdV = countdownVloer;
  const cdS = countdownStreef;
  const cdC = countdown;

  // Welke tier is als eerst bereikbaar?
  const eersteCD = cdV ?? cdS ?? cdC;
  const tierKleur = cdV ? 'var(--accent)' : cdS ? 'var(--green)' : 'var(--amber)';

  // Grafiekdata
  const chartData = useMemo(() => {
    if (!mcResult?.years?.length) return [];
    return mcResult.years
      .filter(r => r.leeftijd >= currentAge - 1 && r.leeftijd <= pensioenLeeftijd + 5)
      .map(r => ({
        jaar:      r.jaar,
        leeftijd:  r.leeftijd,
        bvP50:     r.bvP50,
        priveP50:  r.priveP50,
        totaalP50: r.totaalP50,
        bvP25:     r.bvP25,
        bvP75:     r.bvP75,
      }));
  }, [mcResult, currentAge, pensioenLeeftijd]);

  // Progressie naar doel (comfort)
  const doelKapitaal = pensioenKapitaal ?? 0;
  const pkVloerVal   = pkVloer  ?? 0;
  const pkStreefVal  = pkStreef  ?? 0;
  const pkComfort    = doelKapitaal;

  // Prive: vergelijk verwachte waarde op pensioendag (zelfde nominale euros als pkComfort)
  // DGA:  vergelijk huidige waarde (minder zinvol maar consistenter met huidige logica)
  const progressRef = isPrive ? priveOpPensioendag : totaalNu;
  const progressPct = pkComfort > 0
    ? Math.min(100, Math.round(progressRef / pkComfort * 100))
    : 0;

  const refMax    = pkComfort > 0 ? pkComfort * 1.05 : 1;
  const floorPct  = pkVloerVal > 0 ? Math.min(100, pkVloerVal / refMax * 100) : 0;
  const streefPct = pkStreefVal > 0 ? Math.min(100, pkStreefVal / refMax * 100) : 0;
  const fillPct   = pkComfort  > 0 ? Math.min(100, progressRef / refMax * 100) : 0;

  const kansSucces = mcResult?.kansSucces ?? 0;

  // Inkomen tiers
  const inkomenTiers = [
    { key: 'FLOOR',   inkomen: params.nettoInkomenVloer  ?? BASE_PARAMS.nettoInkomenVloer,  cd: cdV, kleur: 'var(--accent)' },
    { key: 'STREEF',  inkomen: params.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef, cd: cdS, kleur: 'var(--green)'  },
    { key: 'COMFORT', inkomen: params.nettoInkomenDoel   ?? BASE_PARAMS.nettoInkomenDoel,   cd: cdC, kleur: 'var(--amber)'  },
  ];

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Dashboard</div>
          <h2 className="section-title">FIRE Overzicht</h2>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
          Leeftijd {currentAge}j · Pensioen op {pensioenLeeftijd}j ({pensioenJaar})
        </div>
      </div>

      {/* KPI rij */}
      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        {isPrive ? (
          <>
            {/* Prive: 4 relevante tegels */}
            <div className="kpi green">
              <div className="kpi-label">Portefeuille nu</div>
              <div className="kpi-value">{fmt(priveNu)}</div>
              <div className="kpi-sub">huidig belegd vermogen</div>
            </div>
            <div className="kpi blue">
              <div className="kpi-label">
                Verwacht bij pensioen
                <InfoTip text={`Mediaan (P50) verwachte portefeuillewaarde op leeftijd ${pensioenLeeftijd} jaar, op basis van 2500 Monte Carlo simulaties.`} />
              </div>
              <div className="kpi-value">{priveOpPensioendag > 0 ? fmt(priveOpPensioendag) : '—'}</div>
              <div className="kpi-sub">mediaan · leeftijd {pensioenLeeftijd}j</div>
            </div>
            <div className="kpi gold">
              <div className="kpi-label">Jaarlijkse inleg</div>
              <div className="kpi-value">{fmt(params.inlegJaarlijksPrive ?? 0)}</div>
              <div className="kpi-sub">€{Math.round((params.inlegJaarlijksPrive ?? 0) / 12).toLocaleString()}/mnd gemiddeld</div>
            </div>
            <div className="kpi" style={{ borderTop: '2px solid var(--green)' }}>
              <div className="kpi-label">
                Kans succes
                <InfoTip text="% simulaties waarbij je portefeuille > 0 is op leeftijd 85 (2500 Monte Carlo paden)." />
              </div>
              <div className="kpi-value" style={{ color: kansSucces >= 80 ? 'var(--green)' : kansSucces >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                {kansSucces}%
              </div>
              <div className="kpi-sub">bij comfort-doelvermogen</div>
            </div>
          </>
        ) : (
          <>
            {/* DGA: originele 4 tegels */}
            <div className="kpi blue">
              <div className="kpi-label">BV Portefeuille</div>
              <div className="kpi-value">{fmt(bvNu)}</div>
              <div className="kpi-sub">beleggingsrekening</div>
            </div>
            <div className="kpi green">
              <div className="kpi-label">Privé Portefeuille</div>
              <div className="kpi-value">{fmt(priveNu)}</div>
              <div className="kpi-sub">box 3 beleggen</div>
            </div>
            <div className="kpi gold">
              <div className="kpi-label">Totaal Vermogen</div>
              <div className="kpi-value">{fmt(totaalNu)}</div>
              <div className="kpi-sub">BV + privé gecombineerd</div>
            </div>
            <div className="kpi" style={{ borderTop: '2px solid var(--green)' }}>
              <div className="kpi-label">
                Kans succes
                <InfoTip text="% simulaties waarbij BV > 0 op leeftijd 85 (2500 Monte Carlo paden, 80e percentiel veiligheidsgrens)." />
              </div>
              <div className="kpi-value" style={{ color: kansSucces >= 80 ? 'var(--green)' : kansSucces >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                {kansSucces}%
              </div>
              <div className="kpi-sub">bij comfort-doelvermogen</div>
            </div>
          </>
        )}
      </div>

      {/* Countdown tegel + Progressie */}
      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* Countdown tegel */}
        <div className="card" style={{ borderTop: `3px solid ${tierKleur}` }}>
          <div className="card-header">
            <div>
              <div className="card-title">FIRE Countdown</div>
              <div className="card-subtitle">Wanneer bereik je elk tier?</div>
            </div>
            {eersteCD?.alBereikt
              ? <CheckCircle size={20} color="var(--green)" />
              : <Clock size={20} color="var(--text-3)" />
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inkomenTiers.map(({ key, inkomen, cd, kleur }) => (
              <div key={key} style={{
                padding: '0.75rem', borderRadius: 'var(--r)',
                background: 'var(--surface-2)',
                borderLeft: `3px solid ${kleur}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.09em', color: kleur, fontWeight: 600 }}>{key}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>
                      €{Math.round(inkomen/12).toLocaleString()}/mnd
                    </span>
                  </div>
                  {cd && (
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text-3)' }}>lft </span>
                      <b style={{ color: 'var(--text)' }}>{cd.doelLeeftijd}j</b>
                      <span style={{ color: 'var(--text-3)', marginLeft: '0.4rem' }}>· {fmt(cd.pensioenKapitaal)}</span>
                    </div>
                  )}
                </div>
                {cd && !cd.alBereikt && (
                  <div style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: kleur, fontWeight: 600 }}>
                    {cd.jaren > 0 ? `${cd.jaren}j ` : ''}{cd.maanden}mnd
                  </div>
                )}
                {cd?.alBereikt && (
                  <div style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>
                    ✓ Al bereikt!
                  </div>
                )}
                {!cd && (
                  <div style={{ marginTop: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-4)' }}>
                    {pkLoading ? 'Berekenen…' : 'Niet bereikbaar vóór pensioenleeftijd'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progressie */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Voortgang naar doel</div>
              <div className="card-subtitle">
                {isPrive
                  ? `Verwacht op pensioen: ${fmt(priveOpPensioendag)} van ${fmt(pkComfort)}`
                  : `${fmt(totaalNu)} van ${fmt(pkComfort)} comfort-doelkapitaal`}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>{progressPct}%</span>
          </div>

          {/* Tier markers boven balk */}
          {pkComfort > 0 && (
            <div style={{ position: 'relative', height: 22, marginBottom: '0.3rem' }}>
              {pkVloerVal > 0 && (
                <div style={{ position: 'absolute', left: `${floorPct}%`, transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--accent)', whiteSpace: 'nowrap' }}>Floor</div>
                  <div style={{ width: 1, height: 6, background: 'var(--accent)', margin: '0 auto' }} />
                </div>
              )}
              {pkStreefVal > 0 && (
                <div style={{ position: 'absolute', left: `${streefPct}%`, transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--green)', whiteSpace: 'nowrap' }}>Streef</div>
                  <div style={{ width: 1, height: 6, background: 'var(--green)', margin: '0 auto' }} />
                </div>
              )}
            </div>
          )}

          {/* Progressiebalk */}
          <div className="progress-track" style={{ marginBottom: '1.25rem', position: 'relative', overflow: 'visible' }}>
            <div className="progress-fill" style={{ width: `${fillPct}%` }} />
            {pkComfort > 0 && pkVloerVal > 0 && (
              <div style={{ position: 'absolute', top: -1, left: `${floorPct}%`, width: 2, height: 10, background: 'var(--accent)', borderRadius: 2 }} />
            )}
            {pkComfort > 0 && pkStreefVal > 0 && (
              <div style={{ position: 'absolute', top: -1, left: `${streefPct}%`, width: 2, height: 10, background: 'var(--green)', borderRadius: 2 }} />
            )}
          </div>

          {/* Waardes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Floor',   val: pkVloerVal,  kleur: 'var(--accent)' },
              { label: 'Streef',  val: pkStreefVal,  kleur: 'var(--green)'  },
              { label: 'Comfort', val: pkComfort,   kleur: 'var(--amber)'  },
            ].map(({ label, val, kleur }) => (
              <div key={label} style={{ padding: '0.6rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: kleur, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700 }}>{val > 0 ? fmt(val) : pkLoading ? '…' : '—'}</div>
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* Extra info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
            <div>
              <div style={{ color: 'var(--text-3)' }}>Geplande pensioenleeftijd</div>
              <div style={{ fontWeight: 600 }}>{pensioenLeeftijd} jaar ({pensioenJaar})</div>
            </div>
            {isPrive ? (
              <div>
                <div style={{ color: 'var(--text-3)' }}>Nu al belegd</div>
                <div style={{ fontWeight: 600 }}>{fmt(priveNu)}</div>
              </div>
            ) : (
              <div>
                <div style={{ color: 'var(--text-3)' }}>Nog te sparen</div>
                <div style={{ fontWeight: 600 }}>{fmt(Math.max(0, pkComfort - totaalNu))}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Groeichart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Verwachte portefeuillegroei</div>
              <div className="card-subtitle">Mediaan (P50) · Monte Carlo 2500 simulaties</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="gradBV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradPrive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="jaar"
                tick={<JaarTick birthYear={birthYear} />}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                interval={4}
                height={32}
              />
              <YAxis
                tickFormatter={v => v >= 1e6 ? `€${(v/1e6).toFixed(1)}M` : `€${Math.round(v/1000)}K`}
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-3)' }}
                axisLine={false} tickLine={false} width={60}
              />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine x={pensioenJaar} stroke="var(--amber)" strokeDasharray="4 3" label={{ value: 'Pensioen', fill: 'var(--amber)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              {pkVloerVal > 0 && <ReferenceLine y={pkVloerVal} stroke="var(--accent)" strokeDasharray="3 4" strokeOpacity={0.6} label={{ value: 'Floor', position: 'insideTopLeft', fill: 'var(--accent)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />}
              {pkStreefVal > 0 && <ReferenceLine y={pkStreefVal} stroke="var(--green)" strokeDasharray="3 4" strokeOpacity={0.6} label={{ value: 'Streef', position: 'insideTopLeft', fill: 'var(--green)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />}
              {pkComfort > 0 && <ReferenceLine y={pkComfort} stroke="var(--amber)" strokeDasharray="3 4" strokeOpacity={0.6} label={{ value: 'Comfort', position: 'insideTopLeft', fill: 'var(--amber)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />}
              {!isPrive && (
                <Area dataKey="bvP50" name="BV (P50)" stroke="var(--accent)" fill="url(#gradBV)" strokeWidth={2} dot={false} />
              )}
              <Area dataKey="priveP50" name={isPrive ? 'Portefeuille (P50)' : 'Privé (P50)'} stroke="var(--green)" fill="url(#gradPrive)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Info */}
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: 'var(--r)',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.72rem',
        color: 'var(--text-3)',
        lineHeight: 1.7,
      }}>
        {isPrive
          ? '💡 De countdown gebruikt 2500 Monte Carlo paden. Doelkapitalen zijn berekend als het minimale privévermogen waarbij 80% van de paden de portefeuille in stand houdt tot leeftijd 85.'
          : '💡 De countdown gebruikt 2500 Monte Carlo paden. Doelkapitalen zijn berekend als het minimale BV-bedrag waarbij 80% van de paden de BV in stand houdt tot leeftijd 85.'
        }
        {' '}Voeg portefeuille-updates toe via <b>Voortgang</b> om de projectie actueel te houden.
      </div>
    </div>
  );
}
