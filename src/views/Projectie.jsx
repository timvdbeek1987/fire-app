import React, { useState, useMemo } from 'react';
import JaarTick from '../JaarTick.jsx';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt, fmtFull, fmtPct, BASE_PARAMS, berekenVereistKapitaalAnalytisch } from '../data.js';
import { InfoTip } from '../Tooltip.jsx';

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--paper-card)', border:'1px solid var(--border)', borderRadius:6, padding:'0.7rem 1rem', maxWidth:220 }}>
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

export default function Projectie({
  params, start, mcResult, pensioenKapitaal,
  pkVloer, pkStreef, birthYear = BASE_PARAMS.geboortejaar, userType = 'dga',
}) {
  const isPrive = userType === 'prive';
  const [tabIndex, setTabIndex] = useState(0);
  const TABS = ['Portfolio', 'Doelcurves', 'Uitkomstbandbreedte', 'Tabel'];

  const pensioenLeeftijd = params.pensioenLeeftijd ?? 55;
  const pensioenJaar     = birthYear + pensioenLeeftijd;
  const currentAge       = new Date().getFullYear() - birthYear;

  // Safety factors voor de drie tiers
  const sfComfort = useMemo(() => {
    if (!pensioenKapitaal) return 1;
    const a = berekenVereistKapitaalAnalytisch(params, pensioenLeeftijd);
    return a > 0 ? pensioenKapitaal / a : 1;
  }, [pensioenKapitaal, params, pensioenLeeftijd]);

  const sfVloer = useMemo(() => {
    if (!pkVloer) return sfComfort;
    const vloerP = { ...params, nettoInkomenDoel: params.nettoInkomenVloer ?? BASE_PARAMS.nettoInkomenVloer };
    const a = berekenVereistKapitaalAnalytisch(vloerP, pensioenLeeftijd);
    return a > 0 ? pkVloer / a : 1;
  }, [pkVloer, params, pensioenLeeftijd, sfComfort]);

  const sfStreef = useMemo(() => {
    if (!pkStreef) return sfComfort;
    const streefP = { ...params, nettoInkomenDoel: params.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef };
    const a = berekenVereistKapitaalAnalytisch(streefP, pensioenLeeftijd);
    return a > 0 ? pkStreef / a : 1;
  }, [pkStreef, params, pensioenLeeftijd, sfComfort]);

  const chartData = useMemo(() => {
    if (!mcResult?.years?.length) return [];
    return mcResult.years.map(r => {
      const vloerP  = { ...params, nettoInkomenDoel: params.nettoInkomenVloer  ?? BASE_PARAMS.nettoInkomenVloer  };
      const streefP = { ...params, nettoInkomenDoel: params.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef };
      return {
        jaar:          r.jaar,
        leeftijd:      r.leeftijd,
        bvP25:         r.bvP25,
        bvP50:         r.bvP50,
        bvP75:         r.bvP75,
        totaalP25:     r.totaalP25,
        totaalP50:     r.totaalP50,
        totaalP75:     r.totaalP75,
        priveP25:      r.priveP25,
        priveP50:      r.priveP50,
        priveP75:      r.priveP75,
        doelCurve:     berekenVereistKapitaalAnalytisch(params,  r.leeftijd) * sfComfort,
        doelCurveStreef: berekenVereistKapitaalAnalytisch(streefP, r.leeftijd) * sfStreef,
        doelCurveVloer:  berekenVereistKapitaalAnalytisch(vloerP,  r.leeftijd) * sfVloer,
      };
    });
  }, [mcResult, params, sfComfort, sfStreef, sfVloer]);

  if (!mcResult?.years?.length) {
    return (
      <div className="card" style={{ textAlign:'center', padding:'3rem' }}>
        <div style={{ color:'var(--text-3)', fontFamily:'var(--font-mono)', fontSize:'0.85rem' }}>
          Simulatie bezig…
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Projectie</div>
          <h2 className="section-title">Toekomstprojectie</h2>
        </div>
        <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
          {TABS.map((t,i) => (
            <button key={i}
              className={`scenario-chip ${tabIndex===i?'active':''}`}
              onClick={() => setTabIndex(i)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Tab: Portfolio */}
      {tabIndex === 0 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{isPrive ? 'Portefeuille (normaal scenario)' : 'BV + Privé portefeuille (normaal scenario)'}</div>
              <div className="card-subtitle">Normaal scenario · 2500 doorgerekende scenario's · €nominaal</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top:8, right:8, bottom:8, left:0 }}>
              <defs>
                <linearGradient id="gBV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="jaar" tick={<JaarTick birthYear={birthYear}/>} tickLine={false} axisLine={{ stroke:'var(--border)' }} interval={4} height={32}/>
              <YAxis tickFormatter={v => v>=1e6?`€${(v/1e6).toFixed(1)}M`:`€${Math.round(v/1000)}K`} tick={{ fontFamily:'var(--font-mono)', fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false} width={60}/>
              <Tooltip content={<ChartTip/>}/>
              <ReferenceLine x={pensioenJaar} stroke="var(--amber)" strokeDasharray="4 3"/>
              {!isPrive && <Area dataKey="bvP50"    name="BV (normaal)"    stroke="var(--accent)" fill="url(#gBV)" strokeWidth={2} dot={false}/>}
              <Area dataKey="priveP50" name={isPrive ? 'Portefeuille (normaal)' : 'Privé (normaal)'} stroke="var(--green)" fill="url(#gPv)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab: Doelcurves */}
      {tabIndex === 1 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Portefeuille vs. doelcurves</div>
              <div className="card-subtitle">Totaal normaal scenario vs. benodigde kapitaalcurves per tier</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'0.75rem', fontFamily:'var(--font-mono)', fontSize:'0.72rem' }}>
            <span style={{ color:'var(--accent)' }}>── Floor</span>
            <span style={{ color:'var(--green)'  }}>── Streef</span>
            <span style={{ color:'var(--amber)'  }}>── Comfort</span>
            <span style={{ color:'var(--text-3)' }}>--- Totaal normaal</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top:8, right:8, bottom:8, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="jaar" tick={<JaarTick birthYear={birthYear}/>} tickLine={false} axisLine={{ stroke:'var(--border)' }} interval={4} height={32}/>
              <YAxis tickFormatter={v => v>=1e6?`€${(v/1e6).toFixed(1)}M`:`€${Math.round(v/1000)}K`} tick={{ fontFamily:'var(--font-mono)', fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false} width={60}/>
              <Tooltip content={<ChartTip/>}/>
              <ReferenceLine x={pensioenJaar} stroke="var(--amber)" strokeDasharray="4 3"/>
              <Line dataKey="doelCurveVloer"  name="Doel floor"   stroke="var(--accent)" strokeDasharray="4 3" dot={false} strokeWidth={1.5}/>
              <Line dataKey="doelCurveStreef" name="Doel streef"  stroke="var(--green)"  strokeDasharray="5 3" dot={false} strokeWidth={1.5}/>
              <Line dataKey="doelCurve"       name="Doel comfort" stroke="var(--amber)"  strokeDasharray="6 3" dot={false} strokeWidth={1.5}/>
              <Line dataKey="totaalP50"       name="Totaal normaal"   stroke="var(--text-2)" strokeDasharray="2 2" dot={false} strokeWidth={2}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab: Percentielband */}
      {tabIndex === 2 && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{isPrive ? 'Portefeuille uitkomstbandbreedte (tegenvallend–meevallend)' : 'Totaal portefeuille uitkomstbandbreedte (tegenvallend–meevallend)'}</div>
              <div className="card-subtitle">Onzekerheidsrange rond normaal scenario · €nominaal</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top:8, right:8, bottom:8, left:0 }}>
              <defs>
                <linearGradient id="gBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0.03}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="jaar" tick={<JaarTick birthYear={birthYear}/>} tickLine={false} axisLine={{ stroke:'var(--border)' }} interval={4} height={32}/>
              <YAxis tickFormatter={v => v>=1e6?`€${(v/1e6).toFixed(1)}M`:`€${Math.round(v/1000)}K`} tick={{ fontFamily:'var(--font-mono)', fontSize:10, fill:'var(--text-3)' }} axisLine={false} tickLine={false} width={60}/>
              <Tooltip content={<ChartTip/>}/>
              <ReferenceLine x={pensioenJaar} stroke="var(--amber)" strokeDasharray="4 3"/>
              <Area dataKey={isPrive ? 'priveP75' : 'totaalP75'} name="meevallend" stroke="none" fill="url(#gBand)" dot={false}/>
              <Area dataKey={isPrive ? 'priveP50' : 'totaalP50'} name="normaal" stroke="var(--green)" fill="none" strokeWidth={2} dot={false}/>
              <Area dataKey={isPrive ? 'priveP25' : 'totaalP25'} name="tegenvallend" stroke="none" fill="var(--bg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab: Tabel */}
      {tabIndex === 3 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Projectietabel (5-jaar intervallen)</div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jaar</th>
                  <th>Lft</th>
                  {isPrive ? (
                    <>
                      <th className="num">Tegenvallend</th>
                      <th className="num">Normaal</th>
                      <th className="num">Meevallend</th>
                    </>
                  ) : (
                    <>
                      <th className="num">BV tegenvallend</th>
                      <th className="num">BV normaal</th>
                      <th className="num">BV meevallend</th>
                      <th className="num">Privé normaal</th>
                    </>
                  )}
                  <th className="num">Totaal normaal</th>
                  <th className="num">Doel comfort</th>
                </tr>
              </thead>
              <tbody>
                {chartData
                  .filter(r => r.leeftijd % 5 === 0 || r.leeftijd === pensioenLeeftijd)
                  .map((r, i) => (
                    <tr key={i} style={r.leeftijd === pensioenLeeftijd ? { background:'rgba(217,119,6,0.07)' } : {}}>
                      <td style={{ fontFamily:'var(--font-mono)', fontWeight: r.leeftijd===pensioenLeeftijd?700:400 }}>{r.jaar}</td>
                      <td style={{ fontFamily:'var(--font-mono)' }}>{r.leeftijd}j</td>
                      {isPrive ? (
                        <>
                          <td className="num">{fmt(r.priveP25)}</td>
                          <td className="num"><b>{fmt(r.priveP50)}</b></td>
                          <td className="num">{fmt(r.priveP75)}</td>
                        </>
                      ) : (
                        <>
                          <td className="num">{fmt(r.bvP25)}</td>
                          <td className="num"><b>{fmt(r.bvP50)}</b></td>
                          <td className="num">{fmt(r.bvP75)}</td>
                          <td className="num">{fmt(r.priveP50)}</td>
                        </>
                      )}
                      <td className="num"><b>{fmt(r.totaalP50)}</b></td>
                      <td className="num" style={{ color:'var(--amber)' }}>{fmt(r.doelCurve)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kans succes */}
      <div style={{ marginTop:'1rem', padding:'0.75rem 1rem', borderRadius:'var(--r)', background:'var(--surface-2)', border:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text-3)' }}>
        Kans succes op comfort-doelvermogen: <b style={{ color: mcResult.kansSucces >= 80 ? 'var(--green)' : 'var(--amber)' }}>{mcResult.kansSucces}%</b>
        {' '}· 2500 paden · Grens: portefeuille &gt; 0 op leeftijd 85 · onttrekking op comfort-niveau
      </div>
    </div>
  );
}
