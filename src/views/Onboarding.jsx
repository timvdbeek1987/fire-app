import React, { useState, useEffect } from 'react';
import { BASE_PARAMS, runMonteCarlo, berekenVeiligPensioenKapitaal, fmt } from '../data.js';

const STAPPEN = ['Profiel', 'Portefeuille', 'Inkomensdoel', 'Inleg', 'Klaar'];

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

// F buiten de component — anders verlies je focus na elke toetsaanslag
const F = ({ label, value, onChange, type = 'number', help, min, max, step, placeholder }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      type={type} className="form-input"
      value={value}
      onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      min={min} max={max} step={step ?? 1}
      placeholder={placeholder}
    />
    {help && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{help}</div>}
  </div>
);

export default function Onboarding({ user, onComplete }) {
  const [stap, setStap] = useState(0);
  const [ahaResult,  setAhaResult]  = useState(null);
  const [ahaLoading, setAhaLoading] = useState(false);

  // Stap 1 — Profiel
  const [geboortejaar,      setGeboortejaar]      = useState(1985);
  const [pensioenLeeftijd,  setPensioenLeeftijd]  = useState(55);
  const [userType,          setUserType]          = useState('prive'); // default prive

  // Stap 2 — Portefeuille
  const [bvWaarde,    setBvWaarde]    = useState('');
  const [priveWaarde, setPriveWaarde] = useState('');

  // Stap 3 — Inkomensdoel
  const [nettoInkomenDoel,   setNettoInkomenDoel]   = useState(48000);
  const [nettoInkomenVloer,  setNettoInkomenVloer]  = useState(36000);
  const [nettoInkomenStreef, setNettoInkomenStreef]  = useState(42000);

  // Stap 4 — Inleg
  const [inlegBV,     setInlegBV]     = useState(60000);
  const [inlegPrive,  setInlegPrive]  = useState(500);

  const isPrive     = userType === 'prive';
  const leeftijd    = CURRENT_YEAR - geboortejaar;
  const pensioenJaar = geboortejaar + pensioenLeeftijd;

  useEffect(() => {
    if (stap !== 4) return;
    setAhaLoading(true);
    const timeout = setTimeout(() => {
      const p = {
        ...BASE_PARAMS,
        geboortejaar,
        pensioenLeeftijd,
        nettoInkomenDoel,
        nettoInkomenVloer,
        nettoInkomenStreef,
        inlegJaarlijksBV: isPrive ? 0 : inlegBV,
        inlegJaarlijksPrive: inlegPrive,
        ...(isPrive ? { priveModus: true, verplichtDGAsalaris: 0, inlegJaarlijksBV: 0, vennootschapsbelasting: 0, dividendbelasting: 0, inkomstenbelasting: 0, jaarlijksNettoSPMS: 0 } : {}),
      };
      const startPort = { bv: isPrive ? 0 : (Number(bvWaarde)||0), prive: Number(priveWaarde)||0, jaar: CURRENT_YEAR, maand: CURRENT_MONTH };
      const mc = runMonteCarlo(p, startPort, 400);
      const pkS = berekenVeiligPensioenKapitaal(p, 0, 80, 150);
      setAhaResult({ mc, pkStreef: pkS });
      setAhaLoading(false);
    }, 100);
    return () => clearTimeout(timeout);
  }, [stap]);

  const handleComplete = () => {
    const vandaag = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,'0')}-15`;
    onComplete({
      profile: {
        geboortejaar,
        pensioen_leeftijd: pensioenLeeftijd,
        user_type: userType,
      },
      params: {
        geboortejaar,
        pensioenLeeftijd,
        nettoInkomenDoel,
        nettoInkomenVloer,
        nettoInkomenStreef,
        inlegJaarlijksBV:    isPrive ? 0 : inlegBV,
        inlegJaarlijksPrive: inlegPrive,
      },
      portfolioStart: {
        datum:    vandaag,
        bv:       isPrive ? 0 : (Number(bvWaarde) || 0),
        prive:    Number(priveWaarde) || 0,
        inleg_bv: 0,
      },
    });
  };

  const stapIndicator = () => (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
      {STAPPEN.map((naam, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          color: i === stap ? 'var(--accent)' : i < stap ? 'var(--green)' : 'var(--text-4)',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: i === stap ? 'var(--accent)' : i < stap ? 'var(--green)' : 'var(--surface-2)',
            border: `1.5px solid ${i === stap ? 'var(--accent)' : i < stap ? 'var(--green)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: i <= stap ? '#fff' : 'var(--text-4)', fontSize: '0.62rem', fontWeight: 600,
          }}>
            {i < stap ? '✓' : i + 1}
          </div>
          <span style={{ display: window.innerWidth < 600 ? 'none' : 'inline' }}>{naam}</span>
          {i < STAPPEN.length - 1 && (
            <div style={{ width: 20, height: 1, background: i < stap ? 'var(--green)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStap = () => {
    switch (stap) {
      case 0: // Profiel
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 1 van 4</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Jouw profiel</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Een paar basisgegevens om de berekeningen op jou af te stemmen.
              </p>
            </div>

            <F
              label="Geboortejaar"
              value={geboortejaar}
              onChange={setGeboortejaar}
              min={1950} max={CURRENT_YEAR - 18}
              help={`Huidige leeftijd: ${leeftijd} jaar`}
            />
            <F
              label="Gewenste pensioenleeftijd"
              value={pensioenLeeftijd}
              onChange={setPensioenLeeftijd}
              min={40} max={70}
              help={`Dat is in ${pensioenJaar} (over ${pensioenJaar - CURRENT_YEAR} jaar)`}
            />

            <div className="form-group">
              <label className="form-label">Type belegger</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { id: 'prive', titel: 'Privébelegger', omschrijving: 'Je belegt alleen privé (box 3), geen BV' },
                  { id: 'dga',   titel: 'DGA / BV',      omschrijving: 'Je spaart via een BV én hebt een privéportefeuille' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setUserType(t.id)}
                    style={{
                      textAlign: 'left', padding: '1rem',
                      borderRadius: 'var(--r)',
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

      case 1: // Portefeuille
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 2 van 4</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Huidige portefeuille</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Wat is de huidige waarde van je vermogen? Dit is het startpunt van de projectie.
              </p>
            </div>

            {!isPrive && (
              <F
                label="BV beleggingsrekening (€)"
                value={bvWaarde}
                onChange={v => setBvWaarde(v)}
                min={0}
                help="Totale waarde van je BV-beleggingsportefeuille vandaag"
              />
            )}
            <F
              label={isPrive ? 'Privé portefeuille (€)' : 'Privé portefeuille (€)'}
              value={priveWaarde}
              onChange={v => setPriveWaarde(v)}
              min={0}
              help={isPrive
                ? 'Totale waarde van je beleggingsrekening (DEGIRO, IBKR, etc.)'
                : 'Waarde van je privé beleggingsrekening (DEGIRO, Bolero, etc.)'}
            />

            <div style={{
              padding: '1rem', borderRadius: 'var(--r)', background: 'var(--accent-soft)',
              border: '1px solid var(--accent-mid)', marginTop: '0.5rem',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>
                Totaal vandaag
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                €{((!isPrive ? (Number(bvWaarde) || 0) : 0) + (Number(priveWaarde) || 0)).toLocaleString('nl-NL')}
              </div>
            </div>
          </>
        );

      case 2: // Inkomensdoel
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 3 van 4</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Inkomensdoel</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Hoeveel netto inkomen wil je per jaar na je pensioen? Vul drie niveaus in.
              </p>
            </div>

            <F
              label="Floor — minimaal netto/jaar (€)"
              value={nettoInkomenVloer}
              onChange={setNettoInkomenVloer}
              min={0} step={1000}
              help={`Minimale levensstandaard. €${Math.round(nettoInkomenVloer/12).toLocaleString()}/mnd`}
            />
            <F
              label="Streef — gewenst netto/jaar (€)"
              value={nettoInkomenStreef}
              onChange={setNettoInkomenStreef}
              min={0} step={1000}
              help={`Streefdoel. €${Math.round(nettoInkomenStreef/12).toLocaleString()}/mnd`}
            />
            <F
              label="Comfort — maximum netto/jaar (€)"
              value={nettoInkomenDoel}
              onChange={setNettoInkomenDoel}
              min={0} step={1000}
              help={`Ruime levensstijl. €${Math.round(nettoInkomenDoel/12).toLocaleString()}/mnd`}
            />

            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.6, marginTop: '0.5rem' }}>
              💡 Bedragen zijn in euro's van nu. De engine corrigeert automatisch voor inflatie.
            </div>
          </>
        );

      case 3: // Inleg
        return (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div className="section-eyebrow">Stap 4 van 4</div>
              <h2 style={{ marginBottom: '0.5rem' }}>Jaarlijkse inleg</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                {isPrive
                  ? 'Hoeveel leg je gemiddeld per jaar bij? Dit bepaalt hoe snel je doel nadert.'
                  : 'Hoeveel leg je gemiddeld per jaar bij via BV en privé?'}
              </p>
            </div>

            {!isPrive && (
              <F
                label="Jaarlijkse inleg BV (€)"
                value={inlegBV}
                onChange={setInlegBV}
                min={0} step={1000}
                help={`€${Math.round(inlegBV/12).toLocaleString()}/mnd — inleg via DGA-salaris, dividend of rechtstreeks`}
              />
            )}
            <F
              label={isPrive ? 'Jaarlijkse inleg (€)' : 'Jaarlijkse inleg privé (€)'}
              value={inlegPrive}
              onChange={setInlegPrive}
              min={0} step={100}
              help={`€${Math.round(inlegPrive/12).toLocaleString()}/mnd`}
            />

            <div style={{
              padding: '1rem', borderRadius: 'var(--r)', background: 'var(--green-soft)',
              border: '1px solid #6ee7b7', marginTop: '0.5rem',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '0.4rem' }}>
                Totale jaarlijkse inleg
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)' }}>
                €{((isPrive ? 0 : inlegBV) + inlegPrive).toLocaleString('nl-NL')}/jaar
              </div>
            </div>
          </>
        );

      case 4: // Klaar
        return (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <h2 style={{ marginBottom: '0.75rem' }}>Je bent klaar om te starten!</h2>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 1.5rem' }}>
                Je profiel is ingesteld. De Monte Carlo engine berekent nu duizenden scenario's
                voor jouw FIRE-pad. Je kunt alles later aanpassen in Instellingen.
              </p>

              {/* AHA card */}
              {ahaLoading && (
                <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.08))', borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: '1.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                  Berekening loopt…
                </div>
              )}
              {!ahaLoading && ahaResult && (() => {
                const { mc, pkStreef } = ahaResult;
                const row = mc.years?.find(r => r.leeftijd === pensioenLeeftijd);
                const priveP50 = row?.priveP50 ?? 0;
                const kansSucces = mc.kansSucces ?? 0;
                // FIRE leeftijd: first year where P50 portfolio >= pkStreef
                let fireLeeftijd = null;
                let fireJaar = null;
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
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>Verwacht vermogen op pensioendag</div>
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
                  <div><span style={{ color: 'var(--text-3)' }}>Portefeuille nu</span><br /><b>€{((!isPrive ? (Number(bvWaarde)||0) : 0)+(Number(priveWaarde)||0)).toLocaleString()}</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Jaarlijkse inleg</span><br /><b>€{((isPrive ? 0 : inlegBV)+inlegPrive).toLocaleString()}</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Inkomensdoel</span><br /><b>€{Math.round(nettoInkomenDoel/12).toLocaleString()}/mnd</b></div>
                  <div><span style={{ color: 'var(--text-3)' }}>Type</span><br /><b>{isPrive ? 'Privébelegger' : 'DGA / BV'}</b></div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
                onClick={handleComplete}
              >
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
      <div style={{ maxWidth: 560, width: '100%' }}>
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

          {stap < 4 && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              {stap > 0 && (
                <button className="btn btn-outline" onClick={() => setStap(s => s - 1)}>
                  ← Terug
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => setStap(s => s + 1)}
                disabled={volgendeDisabled}
              >
                {stap === 3 ? 'Afronden →' : 'Volgende →'}
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
