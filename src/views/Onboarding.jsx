import React, { useState, useEffect } from 'react';
import { BASE_PARAMS, runMonteCarlo, berekenVeiligPensioenKapitaal, fmt } from '../data.js';

const STAPPEN = ['Profiel', 'Portefeuille', 'Inkomensdoel', 'Woonlasten', 'Inkomen', 'Inleg', 'Klaar'];

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const F = ({ label, value, onChange, type = 'number', help, min, max, step, placeholder, suffix, prefix }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {prefix && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)' }}>{prefix}</span>}
      <input
        type={type} className="form-input"
        value={value}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        min={min} max={max} step={step ?? 1}
        placeholder={placeholder}
        style={{ flex: 1 }}
      />
      {suffix && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{suffix}</span>}
    </div>
    {help && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{help}</div>}
  </div>
);

const KostenRij = ({ label, value, onChange, step = 25 }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)', flex: 1 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-4)' }}>€</span>
      <input
        type="number" className="form-input"
        style={{ maxWidth: 90, textAlign: 'right', padding: '0.3rem 0.5rem' }}
        value={value} step={step} min={0}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
      />
    </div>
  </div>
);

const Toggle = ({ value, onChange, options }) => (
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    {options.map(o => (
      <button key={String(o.v)} type="button"
        onClick={() => onChange(o.v)}
        style={{
          flex: 1, padding: '0.5rem', borderRadius: 'var(--r)',
          border: `1.5px solid ${value === o.v ? 'var(--accent)' : 'var(--border)'}`,
          background: value === o.v ? 'var(--accent-soft)' : 'var(--surface)',
          cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          fontWeight: value === o.v ? 600 : 400,
        }}
      >{o.l}</button>
    ))}
  </div>
);

const Sectie = ({ titel, kleur = 'var(--text-3)', children }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: kleur, marginBottom: '0.75rem' }}>
      {titel}
    </div>
    {children}
  </div>
);

export default function Onboarding({ user, onComplete }) {
  const [stap, setStap] = useState(0);
  const [ahaResult,  setAhaResult]  = useState(null);
  const [ahaLoading, setAhaLoading] = useState(false);

  // Stap 0 — Profiel
  const [geboortejaar,     setGeboortejaar]     = useState(1985);
  const [pensioenLeeftijd, setPensioenLeeftijd] = useState(55);
  const [userType,         setUserType]         = useState('prive');

  // Stap 1 — Portefeuille
  const [bvWaarde,    setBvWaarde]    = useState('');
  const [priveWaarde, setPriveWaarde] = useState('');

  // Stap 2 — Inkomensdoel
  const [nettoInkomenDoel,   setNettoInkomenDoel]   = useState(48000);
  const [nettoInkomenVloer,  setNettoInkomenVloer]  = useState(36000);
  const [nettoInkomenStreef, setNettoInkomenStreef]  = useState(42000);

  // Stap 3 — Woonlasten & leefkosten
  const [huidigInkomen,  setHuidigInkomen]  = useState(5000);
  const [woningType,     setWoningType]     = useState('hypotheek');
  const [woningLast,     setWoningLast]     = useState(1200);
  const [hypotheekJaren, setHypotheekJaren] = useState(20);
  const [hypotheekRestschuld, setHypotheekRestschuld] = useState(150000);
  const [energie,        setEnergie]        = useState(175);
  const [verzekering,    setVerzekering]    = useState(275);
  const [abonnementen,   setAbonnementen]   = useState(100);
  const [boodschappen,   setBoodschappen]   = useState(600);
  const [uiteten,        setUiteten]        = useState(250);
  const [transport,      setTransport]      = useState(200);
  const [vakantie,       setVakantie]       = useState(200);
  const [kleding,        setKleding]        = useState(100);
  const [overig,         setOverig]         = useState(150);

  // Stap 4 — Inkomen & DGA
  const [aowLeeftijd,            setAowLeeftijd]            = useState(67);
  const [jaarlijksNettoAOW,      setJaarlijksNettoAOW]      = useState(16680);
  const [heeftPensioen,          setHeeftPensioen]          = useState(false);
  const [spmsLeeftijd,           setSpmsLeeftijd]           = useState(60);
  const [jaarlijksNettoSPMS,     setJaarlijksNettoSPMS]     = useState(10000);
  const [verplichtDGASalaris,    setVerplichtDGASalaris]    = useState(20000);
  const [hypotheekAflosMethode,  setHypotheekAflosMethode]  = useState('bank');
  const [hypotheekHerfinRente,   setHypotheekHerfinRente]   = useState(4.5);
  const [partnerActief,          setPartnerActief]          = useState(false);
  const [partnerGeboortejaar,    setPartnerGeboortejaar]    = useState(1985);
  const [partnerPensioenLft,     setPartnerPensioenLft]     = useState(55);
  const [partnerPriveNu,         setPartnerPriveNu]         = useState(0);
  const [partnerInlegPrive,      setPartnerInlegPrive]      = useState(0);

  // Stap 5 — Inleg
  const [inlegBV,    setInlegBV]    = useState(60000);
  const [inlegPrive, setInlegPrive] = useState(500);

  const isPrive     = userType === 'prive';
  const leeftijd    = CURRENT_YEAR - geboortejaar;
  const pensioenJaar = geboortejaar + pensioenLeeftijd;
  const jaarHypotheekvrij = woningType === 'hypotheek' ? CURRENT_YEAR + hypotheekJaren : 9999;

  const totaalWoonlasten   = woningLast + energie + verzekering + abonnementen;
  const totaalVariabel     = boodschappen + uiteten + transport + vakantie + kleding + overig;
  const totaalUitgaven     = totaalWoonlasten + totaalVariabel;
  const beschikbaarVoorInleg = Math.max(0, huidigInkomen - totaalUitgaven);

  useEffect(() => {
    if (stap !== 6) return;
    setAhaLoading(true);
    const timeout = setTimeout(() => {
      const p = buildParams();
      const startPort = { bv: isPrive ? 0 : (Number(bvWaarde)||0), prive: Number(priveWaarde)||0, jaar: CURRENT_YEAR, maand: CURRENT_MONTH };
      const mc  = runMonteCarlo(p, startPort, 400);
      const pkS = berekenVeiligPensioenKapitaal(p, 0, 80, 150);
      setAhaResult({ mc, pkStreef: pkS });
      setAhaLoading(false);
    }, 100);
    return () => clearTimeout(timeout);
  }, [stap]);

  const buildParams = () => ({
    ...BASE_PARAMS,
    geboortejaar,
    pensioenLeeftijd,
    nettoInkomenDoel,
    nettoInkomenVloer,
    nettoInkomenStreef,
    inlegJaarlijksBV:    isPrive ? 0 : inlegBV,
    inlegJaarlijksPrive: inlegPrive,
    // AOW & pensioen
    aowLeeftijd,
    jaarlijksNettoAOW,
    spmsLeeftijd,
    jaarlijksNettoSPMS: heeftPensioen ? jaarlijksNettoSPMS : 0,
    // Hypotheek
    maandelijkseHypotheeklast: woningType === 'hypotheek' ? woningLast : 0,
    jaarHypotheekvrij,
    hypotheekAflosJaar:    woningType === 'hypotheek' ? jaarHypotheekvrij : 9999,
    hypotheekAflosMethode: woningType === 'hypotheek' ? hypotheekAflosMethode : 'bank',
    hypotheekHerfinRente,
    hypotheekRestschuld:   woningType === 'hypotheek' ? hypotheekRestschuld : 0,
    // DGA
    verplichtDGAsalaris: isPrive ? 0 : verplichtDGASalaris,
    ...(isPrive ? {
      priveModus: true, inlegJaarlijksBV: 0,
      vennootschapsbelasting: 0, dividendbelasting: 0,
      inkomstenbelasting: 0, jaarlijksNettoSPMS: 0,
    } : {}),
    // Partner
    partnerActief,
    ...(partnerActief ? {
      partnerGeboortejaar,
      partnerPensioenLeeftijd: partnerPensioenLft,
      partnerPriveNu,
      partnerInlegPrive,
    } : {}),
    // Budget
    budget: {
      inkomen: huidigInkomen,
      hypotheek: woningLast,
      energie, verzekering, abonnementen,
      boodschappen, uiteten, transport, vakantie, kleding, overig,
      woningType,
      ...(woningType === 'hypotheek' ? { hypotheekJarenResterend: hypotheekJaren } : {}),
    },
  });

  const handleComplete = () => {
    const vandaag = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,'0')}-15`;
    const p = buildParams();
    onComplete({
      profile: {
        geboortejaar,
        pensioen_leeftijd: pensioenLeeftijd,
        user_type: userType,
      },
      params: p,
      portfolioStart: {
        datum:    vandaag,
        bv:       isPrive ? 0 : (Number(bvWaarde) || 0),
        prive:    Number(priveWaarde) || 0,
        inleg_bv: 0,
      },
    });
  };

  const stapIndicator = () => (
    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
      {STAPPEN.map((naam, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
          color: i === stap ? 'var(--accent)' : i < stap ? 'var(--green)' : 'var(--text-4)',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: i === stap ? 'var(--accent)' : i < stap ? 'var(--green)' : 'var(--surface-2)',
            border: `1.5px solid ${i === stap ? 'var(--accent)' : i < stap ? 'var(--green)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: i <= stap ? '#fff' : 'var(--text-4)', fontSize: '0.58rem', fontWeight: 600,
          }}>
            {i < stap ? '✓' : i + 1}
          </div>
          <span style={{ display: window.innerWidth < 640 ? 'none' : 'inline' }}>{naam}</span>
          {i < STAPPEN.length - 1 && (
            <div style={{ width: 16, height: 1, background: i < stap ? 'var(--green)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStap = () => {
    switch (stap) {

      // ── STAP 0: PROFIEL ──────────────────────────────────────────
      case 0:
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 1 van 6</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Jouw profiel</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Een paar basisgegevens om de berekeningen op jou af te stemmen.
              </p>
            </div>

            <F label="Geboortejaar" value={geboortejaar} onChange={setGeboortejaar}
              min={1950} max={CURRENT_YEAR - 18} help={`Huidige leeftijd: ${leeftijd} jaar`} />
            <F label="Gewenste pensioenleeftijd" value={pensioenLeeftijd} onChange={setPensioenLeeftijd}
              min={40} max={70} suffix="jaar"
              help={`Dat is in ${pensioenJaar} (over ${pensioenJaar - CURRENT_YEAR} jaar)`} />

            <div className="form-group">
              <label className="form-label">Type belegger</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { id: 'prive', titel: 'Privébelegger', omschrijving: 'Je belegt alleen privé (box 3), geen BV' },
                  { id: 'dga',   titel: 'DGA / BV',      omschrijving: 'Je spaart via een BV én hebt een privéportefeuille' },
                ].map(t => (
                  <button key={t.id} type="button" onClick={() => setUserType(t.id)}
                    style={{
                      textAlign: 'left', padding: '1rem', borderRadius: 'var(--r)',
                      border: `2px solid ${userType === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: userType === t.id ? 'var(--accent-soft)' : 'var(--surface)',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.3rem' }}>{t.titel}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{t.omschrijving}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      // ── STAP 1: PORTEFEUILLE ─────────────────────────────────────
      case 1:
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 2 van 6</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Huidige portefeuille</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Wat is de huidige waarde van je vermogen? Dit is het startpunt van de projectie.
              </p>
            </div>

            {!isPrive && (
              <F label="BV beleggingsrekening (€)" value={bvWaarde} onChange={v => setBvWaarde(v)}
                min={0} help="Totale waarde van je BV-beleggingsportefeuille vandaag" />
            )}
            <F label="Privé portefeuille (€)" value={priveWaarde} onChange={v => setPriveWaarde(v)}
              min={0}
              help={isPrive
                ? 'Totale waarde van je beleggingsrekening (DEGIRO, IBKR, etc.)'
                : 'Waarde van je privé beleggingsrekening (DEGIRO, Bolero, etc.)'} />

            <div style={{ padding: '1rem', borderRadius: 'var(--r)', background: 'var(--accent-soft)', border: '1px solid var(--accent-mid)', marginTop: '0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>Totaal vandaag</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                €{((!isPrive ? (Number(bvWaarde)||0) : 0) + (Number(priveWaarde)||0)).toLocaleString('nl-NL')}
              </div>
            </div>
          </>
        );

      // ── STAP 2: INKOMENSDOEL ─────────────────────────────────────
      case 2:
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 3 van 6</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Inkomensdoel na pensioen</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Hoeveel netto per jaar wil je na je pensioen? Hypotheeklasten worden apart meegeteld — vul hier exclusief woonlasten in.
              </p>
            </div>

            <F label="Floor — minimaal netto/jaar (€)" value={nettoInkomenVloer} onChange={setNettoInkomenVloer}
              min={0} step={1000} prefix="€"
              help={`Minimale levensstandaard excl. woonlasten. €${Math.round(nettoInkomenVloer/12).toLocaleString()}/mnd`} />
            <F label="Streef — gewenst netto/jaar (€)" value={nettoInkomenStreef} onChange={setNettoInkomenStreef}
              min={0} step={1000} prefix="€"
              help={`Streefdoel excl. woonlasten. €${Math.round(nettoInkomenStreef/12).toLocaleString()}/mnd`} />
            <F label="Comfort — maximum netto/jaar (€)" value={nettoInkomenDoel} onChange={setNettoInkomenDoel}
              min={0} step={1000} prefix="€"
              help={`Ruime levensstijl excl. woonlasten. €${Math.round(nettoInkomenDoel/12).toLocaleString()}/mnd`} />

            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
              💡 Bedragen in euro's van nu — inflatie wordt automatisch meegenomen. Hypotheeklasten voer je in de volgende stap in.
            </div>
          </>
        );

      // ── STAP 3: WOONLASTEN ───────────────────────────────────────
      case 3:
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 4 van 6</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Woonlasten & leefkosten</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Maandelijkse kosten — pre-ingevuld met gemiddelden. Pas aan wat van jou afwijkt.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Huidig netto maandinkomen</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>€</span>
                <input type="number" className="form-input" style={{ maxWidth: 140 }}
                  value={huidigInkomen} step={100} min={0}
                  onChange={e => setHuidigInkomen(Math.max(0, Number(e.target.value)))} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)' }}>/mnd netto</span>
              </div>
            </div>

            <Sectie titel="Woning" kleur="var(--accent)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {[
                  { id: 'hypotheek', label: 'Koopwoning', sub: 'Hypotheek' },
                  { id: 'huur',      label: 'Huurwoning', sub: 'Huur' },
                ].map(t => (
                  <button key={t.id} type="button" onClick={() => setWoningType(t.id)}
                    style={{
                      padding: '0.6rem 1rem', borderRadius: 'var(--r)',
                      border: `2px solid ${woningType === t.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: woningType === t.id ? 'var(--accent-soft)' : 'var(--surface)',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{t.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>{t.sub}</div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    {woningType === 'hypotheek' ? 'Maandlast' : 'Maandhuur'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>€</span>
                  <input type="number" className="form-input" style={{ maxWidth: 100, textAlign: 'right' }}
                    value={woningLast} step={50} min={0}
                    onChange={e => setWoningLast(Math.max(0, Number(e.target.value)))} />
                </div>
                {woningType === 'hypotheek' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>Nog</span>
                    <input type="number" className="form-input" style={{ maxWidth: 60, textAlign: 'right' }}
                      value={hypotheekJaren} step={1} min={0} max={40}
                      onChange={e => setHypotheekJaren(Math.max(0, Number(e.target.value)))} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      jaar ({jaarHypotheekvrij})
                    </span>
                  </div>
                )}
              </div>

              {woningType === 'hypotheek' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>Restschuld</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>€</span>
                  <input type="number" className="form-input" style={{ maxWidth: 120, textAlign: 'right' }}
                    value={hypotheekRestschuld} step={5000} min={0}
                    onChange={e => setHypotheekRestschuld(Math.max(0, Number(e.target.value)))} />
                </div>
              )}
            </Sectie>

            <Sectie titel="Overige vaste lasten" kleur="var(--accent)">
              <KostenRij label="Energie & water"  value={energie}      onChange={setEnergie}      />
              <KostenRij label="Verzekeringen"     value={verzekering}  onChange={setVerzekering}  />
              <KostenRij label="Abonnementen"      value={abonnementen} onChange={setAbonnementen} />
            </Sectie>

            <Sectie titel="Levensonderhoud (variabel)" kleur="var(--amber)">
              <KostenRij label="Boodschappen"          value={boodschappen} onChange={setBoodschappen} />
              <KostenRij label="Uit eten & café"        value={uiteten}      onChange={setUiteten}      />
              <KostenRij label="Transport & auto"       value={transport}    onChange={setTransport}    />
              <KostenRij label="Vakanties (per maand)"  value={vakantie}     onChange={setVakantie}     />
              <KostenRij label="Kleding & persoonlijk"  value={kleding}      onChange={setKleding}      />
              <KostenRij label="Overig"                 value={overig}       onChange={setOverig}       />
            </Sectie>

            <div style={{ padding: '1rem', borderRadius: 'var(--r)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div>
                  <div style={{ color: 'var(--text-4)', fontSize: '0.62rem', marginBottom: '0.2rem' }}>Vaste lasten</div>
                  <div style={{ color: 'var(--accent)', fontWeight: 600 }}>€{totaalWoonlasten.toLocaleString('nl-NL')}/mnd</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-4)', fontSize: '0.62rem', marginBottom: '0.2rem' }}>Variabel</div>
                  <div style={{ color: 'var(--amber)', fontWeight: 600 }}>€{totaalVariabel.toLocaleString('nl-NL')}/mnd</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-4)', fontSize: '0.62rem', marginBottom: '0.2rem' }}>Vrij inlegbaar</div>
                  <div style={{ color: beschikbaarVoorInleg > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                    €{beschikbaarVoorInleg.toLocaleString('nl-NL')}/mnd
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      // ── STAP 4: INKOMEN & DGA ────────────────────────────────────
      case 4:
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 5 van 6</div>
              <h2 style={{ marginBottom: '0.5rem' }}>
                {isPrive ? 'Inkomen later in leven' : 'Inkomen & DGA-instellingen'}
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                {isPrive
                  ? 'AOW, eventueel aanvullend pensioen en partnerinformatie.'
                  : 'AOW, pensioen, DGA-salaris, hypotheekstrategie en partnerinformatie.'}
              </p>
            </div>

            {/* AOW */}
            <Sectie titel="AOW" kleur="var(--text-3)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <F label="AOW-leeftijd" value={aowLeeftijd} onChange={setAowLeeftijd}
                  min={65} max={72} suffix="jaar" help="Huidig: 67 jaar" />
                <F label="AOW netto/jaar" value={jaarlijksNettoAOW} onChange={setJaarlijksNettoAOW}
                  min={0} step={250} prefix="€"
                  help={`≈ €${Math.round(jaarlijksNettoAOW/12).toLocaleString()}/mnd`} />
              </div>
            </Sectie>

            {/* Aanvullend pensioen / lijfrente */}
            <Sectie titel="Aanvullend pensioen / lijfrente" kleur="var(--text-3)">
              <div className="form-group">
                <label className="form-label">Heb je een aanvullend pensioen of lijfrente?</label>
                <Toggle value={heeftPensioen} onChange={setHeeftPensioen}
                  options={[{ v: false, l: 'Nee' }, { v: true, l: 'Ja' }]} />
              </div>
              {heeftPensioen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <F label="Ingangsdatum (leeftijd)" value={spmsLeeftijd} onChange={setSpmsLeeftijd}
                    min={55} max={70} suffix="jaar" />
                  <F label="Netto per jaar" value={jaarlijksNettoSPMS} onChange={setJaarlijksNettoSPMS}
                    min={0} step={250} prefix="€"
                    help={`≈ €${Math.round(jaarlijksNettoSPMS/12).toLocaleString()}/mnd`} />
                </div>
              )}
            </Sectie>

            {/* DGA-specifiek */}
            {!isPrive && (
              <Sectie titel="DGA & BV" kleur="var(--accent)">
                <F label="Verplicht DGA-salaris" value={verplichtDGASalaris} onChange={setVerplichtDGASalaris}
                  min={0} step={1000} prefix="€"
                  help="Gebruikelijk loon minimum (wettelijk minimum 2024: €56.000)" />

                {woningType === 'hypotheek' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Hypotheekstrategie einde rentevaste periode ({jaarHypotheekvrij})</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                          { id: 'bank', label: '🏦 Herfinancieren', sub: 'Nieuwe hypotheek bij bank' },
                          { id: 'bv',   label: '💼 Aflossen via BV', sub: 'Eenmalige aflossing vanuit BV' },
                        ].map(t => (
                          <button key={t.id} type="button"
                            onClick={() => setHypotheekAflosMethode(t.id)}
                            style={{
                              flex: 1, minWidth: 140, padding: '0.6rem 0.75rem', borderRadius: 'var(--r)', textAlign: 'left',
                              border: `2px solid ${hypotheekAflosMethode === t.id ? 'var(--accent)' : 'var(--border)'}`,
                              background: hypotheekAflosMethode === t.id ? 'var(--accent-soft)' : 'var(--surface)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600 }}>{t.label}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>{t.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    {hypotheekAflosMethode === 'bank' && (
                      <F label="Verwachte nieuwe rente bij herfinanciering"
                        value={hypotheekHerfinRente} onChange={setHypotheekHerfinRente}
                        min={0} max={15} step={0.1} suffix="%" />
                    )}
                  </>
                )}
              </Sectie>
            )}

            {/* Partner */}
            <Sectie titel="Partner / gezin" kleur="var(--text-3)">
              <div className="form-group">
                <label className="form-label">Heb je een partner wiens vermogen meeloopt?</label>
                <Toggle value={partnerActief} onChange={setPartnerActief}
                  options={[{ v: false, l: 'Nee' }, { v: true, l: 'Ja' }]} />
              </div>
              {partnerActief && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <F label="Geboortejaar partner" value={partnerGeboortejaar} onChange={setPartnerGeboortejaar}
                    min={1950} max={CURRENT_YEAR - 18}
                    help={`${CURRENT_YEAR - partnerGeboortejaar} jaar`} />
                  <F label="Pensioenleeftijd partner" value={partnerPensioenLft} onChange={setPartnerPensioenLft}
                    min={40} max={70} suffix="jaar" />
                  <F label="Portefeuille partner nu" value={partnerPriveNu} onChange={setPartnerPriveNu}
                    min={0} step={5000} prefix="€" />
                  <F label="Jaarlijkse inleg partner" value={partnerInlegPrive} onChange={setPartnerInlegPrive}
                    min={0} step={500} prefix="€"
                    help={`€${Math.round(partnerInlegPrive/12).toLocaleString()}/mnd`} />
                </div>
              )}
            </Sectie>
          </>
        );

      // ── STAP 5: INLEG ────────────────────────────────────────────
      case 5:
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 6 van 6</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Jaarlijkse inleg</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                {isPrive
                  ? 'Hoeveel leg je gemiddeld per jaar bij?'
                  : 'Hoeveel leg je gemiddeld per jaar bij via BV en privé?'}
              </p>
            </div>

            {!isPrive && (
              <F label="Jaarlijkse inleg BV (€)" value={inlegBV} onChange={setInlegBV}
                min={0} step={1000} prefix="€"
                help={`€${Math.round(inlegBV/12).toLocaleString()}/mnd — inleg via DGA-salaris, dividend of rechtstreeks`} />
            )}
            <F label={isPrive ? 'Jaarlijkse inleg (€)' : 'Jaarlijkse inleg privé (€)'}
              value={inlegPrive} onChange={setInlegPrive}
              min={0} step={100} prefix="€"
              help={`€${Math.round(inlegPrive/12).toLocaleString()}/mnd`} />

            {beschikbaarVoorInleg > 0 && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-3)' }}>Op basis van je budget: </span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                  €{beschikbaarVoorInleg.toLocaleString('nl-NL')}/mnd (€{(beschikbaarVoorInleg * 12).toLocaleString('nl-NL')}/jaar)
                </span>
                <span style={{ color: 'var(--text-3)' }}> beschikbaar</span>
              </div>
            )}

            <div style={{ padding: '1rem', borderRadius: 'var(--r)', background: 'var(--green-soft)', border: '1px solid #6ee7b7', marginTop: '0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '0.4rem' }}>Totale jaarlijkse inleg</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>
                €{((isPrive ? 0 : inlegBV) + inlegPrive).toLocaleString('nl-NL')}/jaar
              </div>
            </div>
          </>
        );

      // ── STAP 6: KLAAR ────────────────────────────────────────────
      case 6:
        return (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ marginBottom: '0.75rem' }}>Je bent klaar om te starten!</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 1.5rem' }}>
                Je profiel is ingesteld. De simulatie-engine berekent nu duizenden doorgerekende scenario's
                voor jouw FIRE-pad. Je kunt alles later aanpassen in Instellingen.
              </p>

              {ahaLoading && (
                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.08))', borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: '1.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                  Berekening loopt…
                </div>
              )}

              {!ahaLoading && ahaResult && (() => {
                const { mc, pkStreef } = ahaResult;
                const row = mc.years?.find(r => r.leeftijd === pensioenLeeftijd);
                const priveP50   = row?.priveP50 ?? 0;
                const kansSucces = mc.kansSucces ?? 0;
                let fireLeeftijd = null, fireJaar = null;
                if (pkStreef > 0) {
                  for (const r of (mc.years ?? [])) {
                    const port = r.totaalP50 ?? r.priveP50 ?? 0;
                    if (port >= pkStreef) { fireLeeftijd = r.leeftijd; fireJaar = r.jaar; break; }
                  }
                }
                return (
                  <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.08))', borderRadius: 'var(--r)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: '1.5rem', textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>Jouw FIRE prognose</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>FIRE leeftijd</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                          {fireLeeftijd ? `${fireLeeftijd}j (${fireJaar})` : `${pensioenLeeftijd}j (${pensioenJaar})`}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Vermogen op pensioendag</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>
                          {priveP50 > 0 ? fmt(priveP50) : '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Kans van slagen</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: kansSucces >= 80 ? 'var(--green)' : kansSucces >= 60 ? 'var(--amber)' : 'var(--red)' }}>
                          {kansSucces}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="card" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <div className="card-title" style={{ marginBottom: '1rem' }}>Samenvatting</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                  <div><span style={{ color: 'var(--text-3)' }}>Geboortejaar</span><br /><b>{geboortejaar}</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Pensioenleeftijd</span><br /><b>{pensioenLeeftijd} jaar</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Portefeuille nu</span><br /><b>€{((!isPrive ? (Number(bvWaarde)||0) : 0) + (Number(priveWaarde)||0)).toLocaleString()}</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Jaarlijkse inleg</span><br /><b>€{((isPrive ? 0 : inlegBV) + inlegPrive).toLocaleString()}</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Inkomensdoel (streef)</span><br /><b>€{Math.round(nettoInkomenStreef/12).toLocaleString()}/mnd</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Woning</span><br /><b>{woningType === 'hypotheek' ? `Hypotheek €${woningLast.toLocaleString()}/mnd` : `Huur €${woningLast.toLocaleString()}/mnd`}</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Maandlasten totaal</span><br /><b>€{totaalUitgaven.toLocaleString('nl-NL')}/mnd</b></div>
                  {!isPrive && <div><span style={{ color: 'var(--text-3)' }}>DGA-salaris</span><br /><b>€{verplichtDGASalaris.toLocaleString()}/jr</b></div>}
                  {heeftPensioen && <div><span style={{ color: 'var(--text-3)' }}>Pensioen/lijfrente</span><br /><b>€{Math.round(jaarlijksNettoSPMS/12).toLocaleString()}/mnd v.a. {spmsLeeftijd}j</b></div>}
                  {partnerActief && <div><span style={{ color: 'var(--text-3)' }}>Partner</span><br /><b>ja — {CURRENT_YEAR - partnerGeboortejaar} jaar, FIRE op {partnerPensioenLft}j</b></div>}
                </div>
              </div>

              <button className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
                onClick={handleComplete}>
                Naar mijn dashboard →
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const volgendeDisabled =
    stap === 1 && !priveWaarde && (isPrive || !bvWaarde);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem 1rem', paddingTop: '3rem',
    }}>
      <div style={{ maxWidth: 580, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #1a1f2e, #2563eb)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', marginBottom: '0.75rem',
          }}>🔥</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>FIRE App</div>
        </div>

        {stapIndicator()}

        <div className="card fade-up">
          {renderStap()}

          {stap < 6 && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              {stap > 0 && (
                <button className="btn btn-outline" onClick={() => setStap(s => s - 1)}>
                  ← Terug
                </button>
              )}
              <button className="btn btn-primary"
                onClick={() => setStap(s => s + 1)}
                disabled={volgendeDisabled}
              >
                {stap === 5 ? 'Afronden →' : 'Volgende →'}
              </button>
            </div>
          )}
        </div>

        {user?.email && (
          <div style={{ textAlign: 'center', marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-4)' }}>
            Ingelogd als {user.email}
          </div>
        )}
      </div>
    </div>
  );
}
