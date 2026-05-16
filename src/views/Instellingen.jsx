import React, { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { BASE_PARAMS, fmtFull, fmtPct } from '../data.js';

const F = ({ label, help, value, onChange, step=1, min, max, suffix, prefix }) => (
  <div className="form-group">
    <label className="form-label">{typeof label === 'string' ? label : label}</label>
    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
      {prefix && <span style={{ fontSize:'0.85rem', color:'var(--ink-muted)', whiteSpace:'nowrap' }}>{prefix}</span>}
      <input type="number" className="form-input"
        value={value} step={step} min={min} max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{ maxWidth:180 }}/>
      {suffix && <span style={{ fontSize:'0.85rem', color:'var(--ink-muted)' }}>{suffix}</span>}
    </div>
    {help && <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.64rem', color:'var(--ink-muted)', marginTop:'0.2rem', fontStyle:'italic' }}>{help}</div>}
  </div>
);

export default function Instellingen({ params, onParamsChange, userType = 'dga', onRestart }) {
  const isPrive = userType === 'prive';
  const [local,  setLocal]  = useState(() => ({ ...BASE_PARAMS, ...params }));
  const [saved,  setSaved]  = useState(false);

  const set = k => v => setLocal(p => ({...p, [k]: v}));

  const save = () => {
    onParamsChange({ ...local });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    const defaults = { ...BASE_PARAMS };
    setLocal(defaults);
    onParamsChange(defaults);
  };

  const geboortejaar = local.geboortejaar ?? BASE_PARAMS.geboortejaar;
  const pensioenJaar = geboortejaar + (local.pensioenLeeftijd ?? 55);
  const currentYear  = new Date().getFullYear();
  const jaarHypo     = local.jaarHypotheekvrij ?? BASE_PARAMS.jaarHypotheekvrij;

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Configuratie</div>
          <h2 className="section-title">Instellingen</h2>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button className="btn btn-ghost" onClick={reset}><RotateCcw size={14}/> Reset</button>
          <button className={`btn ${saved?'btn-gold':'btn-primary'}`} onClick={save}>
            <Save size={14}/>{saved ? '✓ Opgeslagen' : 'Opslaan'}
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ gap:'1rem' }}>

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>🧓 Planning & leeftijden</div>
          <F label="Geboortejaar" value={geboortejaar} onChange={set('geboortejaar')} min={1950} max={2005}/>
          <F label="Pensioenleeftijd" value={local.pensioenLeeftijd ?? 55} onChange={set('pensioenLeeftijd')} suffix="jaar" min={45} max={70}
            help={`Pensioenjaar: ${pensioenJaar} (${pensioenJaar-currentYear} jaar te gaan)`}/>
          <F label="Pensioen / lijfrente leeftijd" value={local.spmsLeeftijd ?? 60} onChange={set('spmsLeeftijd')} suffix="jaar" min={55} max={70}
            help="Leeftijd waarop aanvullend pensioen of lijfrente ingaat"/>
          <F label="AOW leeftijd" value={local.aowLeeftijd ?? 67} onChange={set('aowLeeftijd')} suffix="jaar" min={65} max={72}
            help="Instelbaar — overheid kan dit verhogen. Huidig: 67 jaar"/>
          <F label="Uitputtingsleeftijd" value={local.uitputtingsLeeftijd ?? 90} onChange={set('uitputtingsLeeftijd')} suffix="jaar" min={70} max={110}
            help="Leeftijd waarop portefeuille op nul staat — gebruikt voor de maandelijkse onttrekkingstegel"/>
          {!isPrive && (
            <F label="Jaarlijkse inleg BV" value={local.inlegJaarlijksBV ?? BASE_PARAMS.inlegJaarlijksBV} onChange={set('inlegJaarlijksBV')} prefix="€" step={1000}
              help="Gemiddeld per jaar tijdens opbouwfase"/>
          )}
          <F label={isPrive ? 'Jaarlijkse inleg' : 'Jaarlijkse inleg Privé'} value={local.inlegJaarlijksPrive ?? BASE_PARAMS.inlegJaarlijksPrive} onChange={set('inlegJaarlijksPrive')} prefix="€" step={500}/>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>📈 Rendement & risico</div>
          <F label="Gemiddeld rendement (vóór pensioen)"
            value={+(local.meanReturn*100).toFixed(2)}
            onChange={v=>set('meanReturn')(v/100)} step={0.1} suffix="%"
            help="~9-10% historisch voor VWCE/SXR8 portefeuille"/>
          <F label="Rendement ná pensioen" value={+(local.rendementNaPensioen*100).toFixed(2)}
            onChange={v=>set('rendementNaPensioen')(v/100)} step={0.1} suffix="%"
            help="Conservatiever na pensionering (bijv. 5% voor mixed portfolio)"/>
          <F label="Standaarddeviatie vóór pensioen" value={+(local.sdReturn*100).toFixed(2)}
            onChange={v=>set('sdReturn')(v/100)} step={0.1} suffix="%"
            help="Volatiliteit opbouwfase (~17% voor mondiale aandelenindex)"/>
          <F label="Standaarddeviatie ná pensioen" value={+((local.sdReturnNaPensioen ?? 0.10)*100).toFixed(2)}
            onChange={v=>set('sdReturnNaPensioen')(v/100)} step={0.1} suffix="%"
            help="Lagere volatiliteit ná pensionering (bijv. 10% voor 60/40 portefeuille)"/>
          <F label="Minimum rendement (stress floor)" value={+(local.minReturn*100).toFixed(0)}
            onChange={v=>set('minReturn')(v/100)} step={1} suffix="%" min={-80} max={0}/>
          <F label="Maximum rendement (cap)" value={+(local.maxReturn*100).toFixed(0)}
            onChange={v=>set('maxReturn')(v/100)} step={1} suffix="%" max={100}/>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>📉 Inflatie</div>
          <F label="Gemiddelde inflatie"
            value={+(local.inflatieGemiddeld*100).toFixed(2)}
            onChange={v=>set('inflatieGemiddeld')(v/100)} step={0.1} suffix="%"
            help="ECB-doel 2%. Wordt automatisch ingesteld op CBS 10-jaarsgemiddelde."/>
          <F label="Standaarddeviatie inflatie" value={+(local.inflatieSD*100).toFixed(2)}
            onChange={v=>set('inflatieSD')(v/100)} step={0.1} suffix="%"/>
          <F label="Minimum inflatie" value={+(local.inflatieMin*100).toFixed(1)}
            onChange={v=>set('inflatieMin')(v/100)} step={0.1} suffix="%" min={-5} max={5}/>
          <F label="Maximum inflatie" value={+(local.inflatieMax*100).toFixed(1)}
            onChange={v=>set('inflatieMax')(v/100)} step={0.1} suffix="%" max={20}/>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>💰 Inkomen na pensioen</div>
          <div style={{ padding:'0.6rem 0.8rem', background:'rgba(41,128,185,0.06)', borderRadius:'var(--r)', border:'1px solid rgba(41,128,185,0.15)', marginBottom:'0.8rem', fontSize:'0.75rem', color:'var(--ink-muted)', fontFamily:'var(--font-mono)', lineHeight:1.6 }}>
            Drie tiers: <strong>Floor</strong> = minimaal nodig, <strong>Streef</strong> = gewenst, <strong>Comfort</strong> = maximum. Bedragen zijn <strong>exclusief hypotheeklast</strong> — die wordt apart opgeteld zolang de hypotheek loopt (tot {jaarHypo}).
          </div>
          <F label="Floor — minimaal netto/jaar (€)" value={local.nettoInkomenVloer ?? BASE_PARAMS.nettoInkomenVloer} onChange={set('nettoInkomenVloer')} prefix="€" step={1000}
            help={`Minimale leefstijl excl. hypotheek. De engine telt hypotheeklast (€${Math.round((local.maandelijkseHypotheeklast??2000)*12).toLocaleString()}/jr) automatisch op tot ${jaarHypo}.`}/>
          <F label="Streef — gewenst netto/jaar (€)" value={local.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef} onChange={set('nettoInkomenStreef')} prefix="€" step={1000}
            help={`Gewenste leefstijl excl. hypotheek. In euro's van nu.`}/>
          <F label="Comfort — max netto/jaar (€)" value={local.nettoInkomenDoel ?? BASE_PARAMS.nettoInkomenDoel} onChange={set('nettoInkomenDoel')} prefix="€" step={1000}
            help={`Comfortabel leven excl. hypotheek. In euro's van nu.`}/>
          <F label="Pensioen / lijfrente netto/jaar"
            value={local.jaarlijksNettoSPMS ?? (isPrive ? 0 : BASE_PARAMS.jaarlijksNettoSPMS)} onChange={set('jaarlijksNettoSPMS')} prefix="€" step={250}
            help={`Netto pensioeninkomen (werkgever, lijfrente, etc.) vanaf leeftijd ${local.spmsLeeftijd??60} jaar. Verlaagt de onttrekkingsbehoefte.`}/>
          <F label="AOW netto/jaar" value={local.jaarlijksNettoAOW ?? BASE_PARAMS.jaarlijksNettoAOW} onChange={set('jaarlijksNettoAOW')} prefix="€" step={250}
            help={`AOW-uitkering vanaf ${local.aowLeeftijd??67} jaar (netto)`}/>
        </div>

        {!isPrive && <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>🧾 Belastingen & DGA</div>
          <F label="Vennootschapsbelasting (VPB)" value={+(local.vennootschapsbelasting*100).toFixed(1)}
            onChange={v=>set('vennootschapsbelasting')(v/100)} step={0.5} suffix="%"
            help="19% over eerste €200K winst (2024)"/>
          <F label="Dividendbelasting (Box 2)" value={+(local.dividendbelasting*100).toFixed(1)}
            onChange={v=>set('dividendbelasting')(v/100)} step={0.5} suffix="%"
            help="24,5% (2024)"/>
          <F label="Inkomstenbelasting DGA-salaris" value={+(local.inkomstenbelasting*100).toFixed(1)}
            onChange={v=>set('inkomstenbelasting')(v/100)} step={0.5} suffix="%"/>
          <F label="Verplicht DGA-salaris" value={local.verplichtDGAsalaris ?? BASE_PARAMS.verplichtDGAsalaris} onChange={set('verplichtDGAsalaris')} prefix="€" step={1000}
            help="Gebruikelijk loon minimum"/>
          <F label="Vermogensrendementsheffing (Privé)" value={+(local.vermogensrendementsheffing*100).toFixed(3)}
            onChange={v=>set('vermogensrendementsheffing')(v/100)} step={0.01} suffix="%"
            help="Box 3 effectief tarief (2024: ~2.09%)"/>
        </div>}

        {!isPrive && <div className="card">
          <div style={{ padding:'0.6rem 0.8rem', background:'rgba(245,158,11,0.08)', borderRadius:'var(--r)', border:'1px solid rgba(245,158,11,0.25)', marginBottom:'1rem', fontSize:'0.75rem', color:'var(--ink-muted)', fontFamily:'var(--font-mono)', lineHeight:1.6 }}>
            ⚠️ Fiscale tarieven — peildatum 2026. Controleer met je accountant; tarieven wijzigen jaarlijks.
          </div>
          <div className="card-title" style={{ marginBottom:'1rem' }}>🏛️ VPB-tarieven</div>
          <F label="VPB laag tarief (t/m schijfgrens)"
            value={+((local.vpbTariefLaag ?? BASE_PARAMS.vpbTariefLaag ?? 0.19)*100).toFixed(1)}
            onChange={v=>set('vpbTariefLaag')(v/100)} step={0.5} suffix="%"
            help="Wet Vpb — 19% over winst t/m schijfgrens (2024)"/>
          <F label="VPB schijfgrens"
            value={local.vpbGrens ?? BASE_PARAMS.vpbGrens ?? 200000}
            onChange={set('vpbGrens')} prefix="€" step={10000}
            help="Grens laag/hoog VPB-tarief — €200.000 (2024)"/>
          <F label="VPB hoog tarief (boven schijfgrens)"
            value={+((local.vpbTariefHoog ?? BASE_PARAMS.vpbTariefHoog ?? 0.258)*100).toFixed(1)}
            onChange={v=>set('vpbTariefHoog')(v/100)} step={0.5} suffix="%"
            help="Wet Vpb — 25,8% over winst boven schijfgrens (2024)"/>
          <F label="Box 2 tarief laag (t/m €67K p.p.)"
            value={+((local.box2TariefLaag ?? BASE_PARAMS.box2TariefLaag ?? 0.245)*100).toFixed(1)}
            onChange={v=>set('box2TariefLaag')(v/100)} step={0.5} suffix="%"
            help="Wet IB 2001 art. 2.12 — 24,5% t/m €67K per persoon (2024)"/>
          <F label="Box 2 schijfgrens per persoon"
            value={local.box2Grens ?? BASE_PARAMS.box2Grens ?? 67000}
            onChange={set('box2Grens')} prefix="€" step={1000}
            help="Fiscaal partner: schijfgrens is €67K per persoon (2024)"/>
          <F label="Box 2 tarief hoog"
            value={+((local.box2TariefHoog ?? BASE_PARAMS.box2TariefHoog ?? 0.331)*100).toFixed(1)}
            onChange={v=>set('box2TariefHoog')(v/100)} step={0.5} suffix="%"
            help="33% over box 2-inkomen boven €67K per persoon (2024)"/>
        </div>}

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>🏠 Hypotheek</div>
          <div className="form-group">
            <label className="form-label">Wat doe je aan het einde van de rentevaste periode?</label>
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              <button onClick={() => setLocal(p => ({...p, hypotheekAflosMethode:'bank'}))}
                className={`scenario-chip ${(local.hypotheekAflosMethode ?? 'bank') === 'bank' ? 'active' : ''}`}>
                🏦 Herfinancieren bij bank
              </button>
              <button onClick={() => setLocal(p => ({...p, hypotheekAflosMethode:'bv'}))}
                className={`scenario-chip ${(local.hypotheekAflosMethode ?? 'bank') === 'bv' ? 'active' : ''}`}>
                💼 Aflossen via BV (eenmalig)
              </button>
            </div>
          </div>

          <F label="Jaar keuze-moment (einde rentevaste periode)"
            value={local.hypotheekAflosJaar ?? BASE_PARAMS.hypotheekAflosJaar} onChange={set('hypotheekAflosJaar')} min={2026} max={2070}
            help="Het jaar waarop je hypotheekrenteperiode afloopt"/>

          {(local.hypotheekAflosMethode ?? 'bank') === 'bank' && <>
            <F label="Nieuwe rente bij herfinanciering (%)"
              value={+(local.hypotheekHerfinRente ?? 4.5).toFixed(2)} onChange={v => setLocal(p => ({...p, hypotheekHerfinRente: v}))}
              suffix="%" step={0.1} min={0} max={15}/>
            <F label="Jaar hypotheek volledig afgelost"
              value={local.jaarHypotheekvrij ?? BASE_PARAMS.jaarHypotheekvrij} onChange={set('jaarHypotheekvrij')} min={2030} max={2080}
              help="Einddatum hypotheek — ná dit jaar vervallen de maandlasten"/>
          </>}

          <F label="Huidige maandlast (vóór herfinanciering/aflossing)"
            value={local.maandelijkseHypotheeklast ?? BASE_PARAMS.maandelijkseHypotheeklast} onChange={set('maandelijkseHypotheeklast')} prefix="€" step={100}
            help="Ingebakken in het inkomensdoel"/>
          <F label="Restschuld op keuze-moment"
            value={local.hypotheekRestschuld ?? BASE_PARAMS.hypotheekRestschuld} onChange={set('hypotheekRestschuld')} prefix="€" step={10000}/>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>🧓 Inkomen later in leven</div>
          <F label="Leeftijd waarop je minder nodig hebt" value={local.inkomstenReductieLft ?? 999} onChange={set('inkomstenReductieLft')} suffix="jaar" min={60} max={999}
            help="Bijv. 75 — minder reizen, lagere uitgaven. Stel 999 in om te deactiveren."/>
          <F label="Reductie inkomensbehoefte" value={Math.round((local.inkomstenReductiePct ?? 0) * 100)} onChange={v => setLocal(p => ({...p, inkomstenReductiePct: v/100}))} suffix="%" step={5} min={0} max={50}
            help="20% = €90K → €72K/jr (in reële termen van vandaag)"/>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom:'1rem' }}>🏦 Spaarrekening</div>
          {!isPrive && (
            <F label="Spaarrente BV" value={+((local.spaarrenteBV??0.025)*100).toFixed(2)}
              onChange={v=>set('spaarrenteBV')(v/100)} step={0.05} suffix="%"
              help="Jaarlijkse rente op de spaarrekening van de BV"/>
          )}
          <F label="Spaarrente Privé" value={+((local.spaarrentePrive??0.025)*100).toFixed(2)}
            onChange={v=>set('spaarrentePrive')(v/100)} step={0.05} suffix="%"
            help="Jaarlijkse rente op de privé spaarrekening"/>
        </div>

        {/* Partner */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>👫 Partner / gezin</div>
          <div className="form-group">
            <label className="form-label">Partner toevoegen</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[{ v: false, l: 'Nee' }, { v: true, l: 'Ja' }].map(({ v, l }) => (
                <button key={String(v)} type="button"
                  onClick={() => set('partnerActief')(v)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--r)', border: `1.5px solid ${(local.partnerActief ?? false) === v ? 'var(--accent)' : 'var(--border)'}`, background: (local.partnerActief ?? false) === v ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                >{l}</button>
              ))}
            </div>
          </div>
          {(local.partnerActief ?? false) && (
            <>
              <F label="Geboortejaar partner" value={local.partnerGeboortejaar ?? 1985} onChange={set('partnerGeboortejaar')} min={1950} max={2005}/>
              <F label="Pensioenleeftijd partner" value={local.partnerPensioenLeeftijd ?? 55} onChange={set('partnerPensioenLeeftijd')} suffix="jaar" min={40} max={70}/>
              <F label="Portefeuille partner nu (€)" value={local.partnerPriveNu ?? 0} onChange={set('partnerPriveNu')} prefix="€" step={5000}
                help="Huidige waarde beleggingsportefeuille partner"/>
              <F label="Jaarlijkse inleg partner (€)" value={local.partnerInlegPrive ?? 0} onChange={set('partnerInlegPrive')} prefix="€" step={500}
                help="Gemiddelde jaarlijkse bijdrage van partner"/>
            </>
          )}
        </div>
      </div>

      {/* Onboarding herstarten */}
      {onRestart && (
        <div className="card" style={{ marginTop:'1rem', borderTop:'3px solid var(--border)' }}>
          <div className="card-title" style={{ marginBottom:'0.5rem' }}>Profiel opnieuw instellen</div>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text-3)', marginBottom:'1rem', lineHeight:1.6 }}>
            Loop de setup-wizard opnieuw door om je profiel, woonlasten, inkomensdoelen en DGA-instellingen bij te werken. Je huidige voortgangsdata blijft bewaard.
          </p>
          <button className="btn btn-outline" onClick={onRestart}>
            ↩ Onboarding opnieuw doorlopen
          </button>
        </div>
      )}

      {/* Samenvatting */}
      <div className="card" style={{ marginTop:'1rem' }}>
        <div className="card-title" style={{ marginBottom:'0.8rem' }}>Actieve parameterwaarden</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:'0.5rem' }}>
          {[
            { k:'Pensioenleeftijd',    v: `${local.pensioenLeeftijd??55}j (${pensioenJaar})` },
            { k:'Pensioen / AOW leeftijd', v: `${local.spmsLeeftijd??60}j / ${local.aowLeeftijd??67}j` },
            !isPrive && { k:'Jaarinleg BV',  v: fmtFull(local.inlegJaarlijksBV) },
            { k: isPrive ? 'Jaarinleg' : 'Jaarinleg Privé', v: fmtFull(local.inlegJaarlijksPrive) },
            { k:'Rendement (pre/post)',v: `${(local.meanReturn*100).toFixed(1)}% / ${(local.rendementNaPensioen*100).toFixed(1)}%` },
            { k:'SD (pre/post)',       v: `${(local.sdReturn*100).toFixed(1)}% / ${((local.sdReturnNaPensioen??0.10)*100).toFixed(1)}%` },
            { k:'Inflatie gem.',       v: `${(local.inflatieGemiddeld*100).toFixed(1)}%` },
            { k:'Floor / Streef / Comfort', v: `€${Math.round((local.nettoInkomenVloer??72000)/12).toLocaleString()} / €${Math.round((local.nettoInkomenStreef??84000)/12).toLocaleString()} / €${Math.round((local.nettoInkomenDoel??90000)/12).toLocaleString()} /mnd` },
            !isPrive && { k:'VPB / Box 2',  v: `${(local.vennootschapsbelasting*100).toFixed(0)}% / ${(local.dividendbelasting*100).toFixed(1)}%` },
          ].filter(Boolean).map((item,i) => (
            <div key={i} style={{ padding:'0.6rem 0.8rem', background:'var(--paper-warm)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.61rem', color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.k}</div>
              <div style={{ fontWeight:600, fontSize:'0.87rem', marginTop:'0.2rem' }}>{item.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
