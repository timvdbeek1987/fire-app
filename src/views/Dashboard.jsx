import React, { useMemo, useState } from 'react';
import JaarTick from '../JaarTick.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CheckCircle, Clock } from 'lucide-react';
import { BASE_PARAMS, fmt, fmtFull, berekenVereistKapitaalAnalytisch } from '../data.js';
import { InfoTip } from '../Tooltip.jsx';
import { checkStaleness } from '../fiscalParams.js';

const CURRENT_YEAR = new Date().getFullYear();

function berekenHistorischRendement(updates) {
  if (!updates || updates.length < 2) return null;
  const sorted = [...updates].sort((a, b) => a.datum.localeCompare(b.datum));
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  const vStart = (first.bv ?? 0) + (first.prive ?? 0);
  const vEnd   = (last.bv  ?? 0) + (last.prive  ?? 0);
  if (vStart <= 0) return null;
  // jaren tussen eerste en laatste entry
  const jaren = (new Date(last.datum) - new Date(first.datum)) / (365.25 * 24 * 3600 * 1000);
  if (jaren < 0.25) return null; // minder dan 3 maanden: niet zinvol
  const cagr = Math.pow(vEnd / vStart, 1 / jaren) - 1;
  return { cagr, jaren: Math.round(jaren * 10) / 10, aantalEntries: sorted.length };
}

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
  pkVloer, pkStreef, priveOpPensioendag, totaalOpPensioendag, maandelijksOnttrektbaar,
  countdown, countdownVloer, countdownStreef,
  birthYear = BASE_PARAMS.geboortejaar, userType = 'dga',
  partnerActief = false, hasPartner = false, onPartnerToggle,
  vermogenUpdates = [],
}) {
  const [showCalc, setShowCalc] = useState(false);
  const [showOnttrekking, setShowOnttrekking] = useState(false);
  const [inflatieCorrectie, setInflatieCorrectie] = useState(true);
  const isPrive = userType === 'prive';
  const histRendement = berekenHistorischRendement(vermogenUpdates);

  // Onttrekking berekeningen
  const pensioenLeeftijdMO = params.pensioenLeeftijd ?? 55;
  const uitputtingLftMO    = Math.min(95, params.uitputtingsLeeftijd ?? 90);
  const infMO              = params.inflatieGemiddeld ?? BASE_PARAMS.inflatieGemiddeld ?? 0.02;
  const jaarTotPensioenMO  = Math.max(0, pensioenLeeftijdMO - (CURRENT_YEAR - birthYear));
  const cumulInflatiePens  = Math.pow(1 + infMO, jaarTotPensioenMO);
  // Vaste nominale onttrekking = reëel bedrag omgezet naar nominaal op pensioendag
  const nominaalVastBedrag = maandelijksOnttrektbaar
    ? Math.round(maandelijksOnttrektbaar * cumulInflatiePens)
    : 0;

  // Hoe lang gaat het portfolio mee bij vaste nominale onttrekking?
  const uitputtingNominaalJaren = useMemo(() => {
    const portfolio = isPrive ? priveOpPensioendag : totaalOpPensioendag;
    if (!portfolio || !nominaalVastBedrag) return uitputtingLftMO - pensioenLeeftijdMO;
    const rNom = params.rendementNaPensioen ?? BASE_PARAMS.rendementNaPensioen ?? 0.05;
    const vrh  = params.vermogensrendementsheffing ?? BASE_PARAMS.vermogensrendementsheffing ?? 0.02088;
    const rM = Math.pow(1 + Math.max(-0.5, rNom - vrh), 1 / 12) - 1;
    let n;
    if (Math.abs(rM) < 0.000001) {
      n = portfolio / nominaalVastBedrag;
    } else {
      const x = 1 - (portfolio * rM) / nominaalVastBedrag;
      n = x <= 0 ? 999 * 12 : -Math.log(x) / Math.log(1 + rM);
    }
    return Math.round(n / 12);
  }, [isPrive, priveOpPensioendag, totaalOpPensioendag, nominaalVastBedrag,
      pensioenLeeftijdMO, uitputtingLftMO, params]);

  const uitputtingNominaalLft = Math.min(95, pensioenLeeftijdMO + uitputtingNominaalJaren);

  const inflatieTable = useMemo(() => {
    if (!maandelijksOnttrektbaar) return [];
    const eindLft = inflatieCorrectie ? uitputtingLftMO : uitputtingNominaalLft;
    const row = (lft, isEinde = false) => {
      const jarenVandaag = lft - (CURRENT_YEAR - birthYear);
      const cumInf = Math.pow(1 + infMO, Math.max(0, jarenVandaag));
      return {
        lft, isEinde,
        nominaal: inflatieCorrectie
          ? Math.round(maandelijksOnttrektbaar * cumInf)
          : nominaalVastBedrag,
        reeel: inflatieCorrectie
          ? maandelijksOnttrektbaar
          : Math.round(nominaalVastBedrag / cumInf),
      };
    };
    return [row(pensioenLeeftijdMO), row(eindLft, true)];
  }, [inflatieCorrectie, maandelijksOnttrektbaar, nominaalVastBedrag,
      pensioenLeeftijdMO, uitputtingLftMO, uitputtingNominaalLft, infMO, birthYear]);
  const pensioenLeeftijd = params.pensioenLeeftijd ?? 55;
  const pensioenJaar     = birthYear + pensioenLeeftijd;
  const bvNu             = start.bv   ?? 0;
  const priveNu          = (start.prive ?? 0) + (partnerActief ? (params.partnerPriveNu ?? 0) : 0);
  const totaalNu         = bvNu + priveNu;
  const inlegGezamenlijk = (params.inlegJaarlijksPrive ?? 0) + (partnerActief ? (params.partnerInlegPrive ?? 0) : 0);
  const currentAge       = CURRENT_YEAR - birthYear;

  // Countdown
  const cdV = countdownVloer;
  const cdS = countdownStreef;
  const cdC = countdown;

  const eersteCD  = cdV ?? cdS ?? cdC;
  const tierKleur = cdV ? 'var(--accent)' : cdS ? 'var(--green)' : 'var(--amber)';

  // Vaste lasten (uit budget of defaults)
  const bgt = params.budget ?? {};
  const vasteLastenMetHypo    = (bgt.hypotheek    ?? params.maandelijkseHypotheeklast ?? 0)
                               + (bgt.energie       ?? 175)
                               + (bgt.verzekering   ?? 275)
                               + (bgt.abonnementen  ?? 100)
                               + (bgt.boodschappen  ?? 600);
  const vasteLastenZonderHypo = vasteLastenMetHypo
                               - (bgt.hypotheek     ?? params.maandelijkseHypotheeklast ?? 0);
  const hypoAflosJaar  = params.jaarHypotheekvrij ?? 9999;
  const hypoAflosLft   = hypoAflosJaar - birthYear;
  const heeftHypotheek = (bgt.hypotheek ?? params.maandelijkseHypotheeklast ?? 0) > 0
                      && hypoAflosJaar < 9998;

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
  const stalenessCheck = checkStaleness();

  // Inkomen tiers
  const inkomenTiers = [
    { key: 'FLOOR',   inkomen: params.nettoInkomenVloer  ?? BASE_PARAMS.nettoInkomenVloer,  cd: cdV, kleur: 'var(--accent)' },
    { key: 'STREEF',  inkomen: params.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef, cd: cdS, kleur: 'var(--green)'  },
    { key: 'COMFORT', inkomen: params.nettoInkomenDoel   ?? BASE_PARAMS.nettoInkomenDoel,   cd: cdC, kleur: 'var(--amber)'  },
  ];

  return (
    <div>
      {stalenessCheck.verouderd && (
        <div style={{ padding: '0.5rem 0.8rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r)', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#dc2626' }}>
          ⚠️ {stalenessCheck.reden}
        </div>
      )}
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Dashboard</div>
          <h2 className="section-title">FIRE Overzicht</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {hasPartner && onPartnerToggle && (
            <button
              onClick={onPartnerToggle}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.3rem 0.75rem', borderRadius: 20,
                border: `1.5px solid ${partnerActief ? 'var(--green)' : 'var(--border)'}`,
                background: partnerActief ? 'rgba(16,185,129,0.1)' : 'var(--surface-2)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                color: partnerActief ? 'var(--green)' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>{partnerActief ? '●' : '○'}</span>
              {partnerActief ? 'Gezamenlijk' : 'Alleen ik'}
            </button>
          )}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
            Leeftijd {currentAge}j · Pensioen op {pensioenLeeftijd}j ({pensioenJaar})
          </div>
        </div>
      </div>

      {/* KPI rij */}
      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        {isPrive ? (
          <>
            {/* Prive: 4 relevante tegels */}
            <div className="kpi green">
              <div className="kpi-label">{partnerActief ? 'Gezamenlijk nu' : 'Portefeuille nu'}</div>
              <div className="kpi-value">{fmt(priveNu)}</div>
              <div className="kpi-sub">huidig belegd vermogen</div>
            </div>
            <div className="kpi blue">
              <div className="kpi-label">
                Verwacht bij pensioen
                <InfoTip text={`Normaal scenario (verwachte portefeuillewaarde) op leeftijd ${pensioenLeeftijd} jaar, op basis van 2500 doorgerekende scenario's. Berekend door 2500 doorgerekende scenario's te draaien met jaarlijkse inleg €${(params.inlegJaarlijksPrive ?? 0).toLocaleString()}/jaar en rendement ${((params.meanReturn ?? 0.097)*100).toFixed(1)}%.`} />
              </div>
              <div className="kpi-value">{priveOpPensioendag > 0 ? fmt(priveOpPensioendag) : '—'}</div>
              <div className="kpi-sub">normaal scenario · leeftijd {pensioenLeeftijd}j</div>
            </div>
            <div className="kpi gold">
              <div className="kpi-label">{partnerActief ? 'Gezamenlijke inleg' : 'Jaarlijkse inleg'}</div>
              <div className="kpi-value">{fmt(inlegGezamenlijk)}</div>
              <div className="kpi-sub">
                {partnerActief
                  ? `jij €${Math.round((params.inlegJaarlijksPrive ?? 0) / 12).toLocaleString()} + partner €${Math.round((params.partnerInlegPrive ?? 0) / 12).toLocaleString()}/mnd`
                  : `€${Math.round(inlegGezamenlijk / 12).toLocaleString()}/mnd gemiddeld`}
              </div>
            </div>
            <div className="kpi" style={{ borderTop: '2px solid var(--green)' }}>
              <div className="kpi-label">
                Kans succes
                <InfoTip text="% simulaties waarbij je portefeuille > 0 is op leeftijd 85 (2500 doorgerekende scenario's)." />
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
                <InfoTip text="% simulaties waarbij BV > 0 op leeftijd 85 (2500 doorgerekende scenario's, 80e percentiel veiligheidsgrens)." />
              </div>
              <div className="kpi-value" style={{ color: kansSucces >= 80 ? 'var(--green)' : kansSucces >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                {kansSucces}%
              </div>
              <div className="kpi-sub">bij comfort-doelvermogen</div>
            </div>
          </>
        )}
      </div>

      {/* Gerealiseerd rendement */}
      {histRendement && (
        <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
              Gerealiseerd rendement
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: histRendement.cagr >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {histRendement.cagr >= 0 ? '+' : ''}{(histRendement.cagr * 100).toFixed(1)}%
              <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-3)', marginLeft: '0.4rem' }}>per jaar</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)' }}>
              op basis van {histRendement.aantalEntries} meetpunten over {histRendement.jaren}j · CAGR vóór inleg
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'right' }}>
            <div>Verwacht rendement</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>{(params.meanReturn * 100).toFixed(1)}% per jaar</div>
          </div>
        </div>
      )}

      {/* Maandelijkse onttrekking */}
      {maandelijksOnttrektbaar > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', borderTop: '3px solid var(--green)' }}>

          {/* Altijd zichtbaar: label + bedrag + uitklap */}
          <div
            onClick={() => setShowOnttrekking(v => !v)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
                Maandelijkse onttrekking
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>
                €{maandelijksOnttrektbaar.toLocaleString('nl-NL')}
                <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-3)', marginLeft: '0.4rem' }}>/mnd</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--amber)', marginTop: '0.2rem' }}>
                Normaal scenario — geen veiligheidsmarge
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', marginTop: '0.1rem' }}>
                {isPrive ? 'In euro\'s van vandaag · excl. AOW & pensioen' : 'Vóór dividendbelasting · excl. AOW & pensioen'}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>
              {showOnttrekking ? '▲' : '▼'}
            </span>
          </div>

          {/* Uitklapbaar detail */}
          {showOnttrekking && (
            <div style={{ marginTop: '1.25rem' }}>

              {/* Inflatie toggle */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                  onClick={() => setInflatieCorrectie(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.25rem 0.65rem', borderRadius: 20,
                    border: `1.5px solid ${inflatieCorrectie ? 'var(--green)' : 'var(--border)'}`,
                    background: inflatieCorrectie ? 'rgba(16,185,129,0.1)' : 'var(--surface-2)',
                    cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
                    color: inflatieCorrectie ? 'var(--green)' : 'var(--text-3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {inflatieCorrectie ? '● Koopkracht-constant' : '○ Nominaal vast'}
                </button>
              </div>

              {/* Toelichting modus */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
                {inflatieCorrectie
                  ? <>Koopkracht blijft gelijk — nominale onttrekking groeit mee met inflatie ({(infMO * 100).toFixed(1)}%/jr), portfolio raakt eerder leeg</>
                  : <>Nominaal vast op €{nominaalVastBedrag.toLocaleString('nl-NL')}/mnd — koopkracht daalt met inflatie, portfolio gaat langer mee</>
                }
              </div>

              {/* Kerngetallen */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Portefeuille op pensioendag</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 700 }}>
                    {fmt(isPrive ? priveOpPensioendag : totaalOpPensioendag)}
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Portfolio leeg op</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 700 }}>
                    {inflatieCorrectie ? uitputtingLftMO : uitputtingNominaalLft}j
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-4)', marginTop: '0.15rem' }}>
                    {inflatieCorrectie ? uitputtingLftMO - pensioenLeeftijdMO : uitputtingNominaalJaren} jaar
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Inflatie (aanname)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 700 }}>
                    {(infMO * 100).toFixed(1)}% /jr
                  </div>
                </div>
              </div>

              {/* Inflatietabel */}
              {inflatieTable.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
                    Effect van inflatie over de onttrekkingsperiode
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem', color: 'var(--text-3)', fontWeight: 500 }}>Leeftijd</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: 'var(--text-3)', fontWeight: 500 }}>Per maand (nominaal)</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0.5rem', color: 'var(--text-3)', fontWeight: 500 }}>In euro's van vandaag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inflatieTable.map(({ lft, nominaal, reeel, isEinde }, i) => (
                        <tr key={lft} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600 }}>
                            {lft}j {i === 0 ? '(aanvang)' : '(einde)'}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.35rem 0.5rem', fontWeight: 600 }}>
                            €{nominaal.toLocaleString('nl-NL')}
                          </td>
                          <td style={{ textAlign: 'right', padding: '0.35rem 0.5rem', color: inflatieCorrectie ? 'var(--green)' : (i === 0 ? 'var(--green)' : 'var(--amber)'), fontWeight: 600 }}>
                            €{reeel.toLocaleString('nl-NL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Methodologie-noot */}
              <div style={{ marginTop: '1rem', padding: '0.6rem 0.8rem', borderRadius: 'var(--r-sm)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                ⚠️ <b>Let op:</b> dit bedrag is gebaseerd op het <b>normaal scenario</b> (verwachte portefeuille, mediaan van 2500 simulaties). De FIRE Countdown gebruikt een strengere maatstaf: het vereiste kapitaal waarbij 80% van alle scenario's de portefeuille in stand houdt. Daardoor kan het onttrekkingsbedrag hier hoger lijken dan wat de Countdown als "haalbaar" markeert.
              </div>

              {/* Belastingnoot */}
              <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.8rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                {isPrive
                  ? <>💡 <b>Belastingen:</b> VRH (box 3, ~{((params.vermogensrendementsheffing ?? 0.02088) * 100).toFixed(1)}%/jr) is verwerkt in het rendement. Onttrekkingen uit privévermogen zijn zelf belastingvrij.</>
                  : <>💡 <b>Belastingen:</b> VRH (~{((params.vermogensrendementsheffing ?? 0.02088) * 100).toFixed(1)}%/jr) is verwerkt in het rendement. Dividendbelasting (~{((params.dividendbelasting ?? 0.245) * 100).toFixed(0)}%) op BV-uitkeringen is <b>nog niet verwerkt</b> — het werkelijke netto besteedbare bedrag ligt lager.</>
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Countdown tegel + Progressie */}
      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>

        {/* Countdown tegel */}
        <div className="card" style={{ borderTop: `3px solid ${tierKleur}` }}>
          <div className="card-header">
            <div>
              <div className="card-title">FIRE Countdown</div>
              <div className="card-subtitle">Wanneer bereik je elk inkomensniveau?</div>
            </div>
            {eersteCD?.alBereikt
              ? <CheckCircle size={20} color="var(--green)" />
              : <Clock size={20} color="var(--text-3)" />
            }
          </div>

          {/* Vaste lasten context */}
          {vasteLastenMetHypo > 0 && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span>Vaste lasten nu: <b style={{ color: 'var(--text)' }}>€{vasteLastenMetHypo.toLocaleString()}/mnd</b></span>
              {heeftHypotheek && (
                <span>Na hypotheek ({hypoAflosLft}j): <b style={{ color: 'var(--text)' }}>€{vasteLastenZonderHypo.toLocaleString()}/mnd</b></span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inkomenTiers.map(({ key, inkomen, cd, kleur }) => {
              const maandelijks = Math.round(inkomen / 12);
              const dektNu       = vasteLastenMetHypo > 0 && maandelijks >= vasteLastenMetHypo;
              const dektNaHypo   = !dektNu && heeftHypotheek && maandelijks >= vasteLastenZonderHypo;
              const dektNiet     = vasteLastenMetHypo > 0 && !dektNu && !dektNaHypo;
              return (
                <div key={key} style={{
                  padding: '0.75rem', borderRadius: 'var(--r)',
                  background: 'var(--surface-2)',
                  borderLeft: `3px solid ${kleur}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.09em', color: kleur, fontWeight: 600 }}>{key}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-3)', marginLeft: '0.5rem' }}>
                        €{maandelijks.toLocaleString()}/mnd
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
                  {/* Vaste lasten dekking */}
                  {dektNu && (
                    <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--green)' }}>
                      ✓ Dekt vaste lasten (€{vasteLastenMetHypo.toLocaleString()}/mnd)
                    </div>
                  )}
                  {dektNaHypo && (
                    <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--amber)' }}>
                      ✓ Dekt lasten na hypotheek ({hypoAflosLft}j) · dan €{vasteLastenZonderHypo.toLocaleString()}/mnd
                    </div>
                  )}
                  {dektNiet && (
                    <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-4)' }}>
                      ✗ Dekt vaste lasten niet (tekort €{(vasteLastenMetHypo - maandelijks).toLocaleString()}/mnd)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', lineHeight: 1.6 }}>
            Vereist kapitaal: 80% van 2500 scenario's houdt portefeuille in stand tot 85j. Het onttrekkingsbedrag hierboven is gebaseerd op het normaal scenario en kan hoger liggen — zie de tegel "Maandelijkse onttrekking" voor de toelichting.
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
              <div className="card-subtitle">Normaal scenario · 2500 doorgerekende scenario's</div>
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
                <Area dataKey="bvP50" name="BV (normaal)" stroke="var(--accent)" fill="url(#gradBV)" strokeWidth={2} dot={false} />
              )}
              <Area dataKey="priveP50" name={isPrive ? 'Portefeuille (normaal)' : 'Privé (normaal)'} stroke="var(--green)" fill="url(#gradPrive)" strokeWidth={2} dot={false} />
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
        marginBottom: '1.25rem',
      }}>
        {isPrive
          ? "💡 De countdown gebruikt 2500 doorgerekende scenario's. Doelkapitalen zijn berekend als het minimale privévermogen waarbij 80% van de scenario's de portefeuille in stand houdt tot leeftijd 85."
          : "💡 De countdown gebruikt 2500 doorgerekende scenario's. Doelkapitalen zijn berekend als het minimale BV-bedrag waarbij 80% van de scenario's de BV in stand houdt tot leeftijd 85."
        }
        {' '}Voeg portefeuille-updates toe via <b>Voortgang</b> om de projectie actueel te houden.
      </div>

      {/* Berekening-transparantie */}
      <div className="card">
        <div
          onClick={() => setShowCalc(v => !v)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div className="card-title" style={{ marginBottom: 0 }}>Hoe werkt de berekening?</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)' }}>{showCalc ? '▲' : '▼'}</span>
        </div>
        {showCalc && (
          <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              {
                label: 'Simulatie',
                text: "2500 doorgerekende scenario's, elk met jaarlijkse return uit N(μ, σ). Normaal scenario is de middelste uitkomst.",
              },
              {
                label: 'Doelkapitaal (Comfort)',
                text: `€${pkComfort > 0 ? pkComfort.toLocaleString('nl-NL') : '—'} berekend als minimaal vermogen bij pensioen waarbij 80% van de 250 testpaden de portefeuille in stand houdt tot leeftijd 85.`,
              },
              {
                label: 'Kans succes',
                text: `${kansSucces}% van 2500 paden heeft nog vermogen op leeftijd 85, met het huidige comfort-doelkapitaal als startpunt voor onttrekkingen.`,
              },
              {
                label: 'Rendementaanname',
                text: `${(params.meanReturn != null ? params.meanReturn * 100 : 9).toFixed(1)}% nominaal vóór pensioen, ${(params.rendementNaPensioen != null ? params.rendementNaPensioen * 100 : 5).toFixed(1)}% ná pensioen. Inflatie: ${(params.inflatieGemiddeld != null ? params.inflatieGemiddeld * 100 : 2.8).toFixed(1)}%.`,
              },
            ].map(({ label, text }) => (
              <div key={label} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
