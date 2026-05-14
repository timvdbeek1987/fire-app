import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LayoutDashboard, TrendingUp, LineChart, FlaskConical, Settings, ArrowDownCircle, LogOut, Calculator, Euro } from 'lucide-react';
import Dashboard    from './views/Dashboard.jsx';
import Voortgang    from './views/Voortgang.jsx';
import Projectie    from './views/Projectie.jsx';
import Scenarios    from './views/Scenarios.jsx';
import Instellingen from './views/Instellingen.jsx';
import Onboarding   from './views/Onboarding.jsx';
import Onttrekking  from './views/Onttrekking.jsx';
import Planner      from './views/Planner.jsx';
import Salaris      from './views/Salaris.jsx';
import {
  BASE_PARAMS, meestRecenteSpaar, getProjectionStart, runMonteCarlo,
  berekenVeiligPensioenKapitaal, berekenVereistKapitaalAnalytisch, fmt,
  berekenGemiddeldeInflatieCBS, BIRTH_YEAR,
} from './data.js';
import {
  supabase, supabaseEnabled, onAuthStateChange, signInWithMagicLink, signOut,
  loadProfile, saveProfile, loadFireData, saveFireData,
  loadVoortgang, loadLocal, saveLocal,
} from './supabase.js';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'voortgang',    label: 'Voortgang',    Icon: TrendingUp      },
  { id: 'projectie',    label: 'Projectie',    Icon: LineChart        },
  { id: 'onttrekking',  label: 'Onttrekking',  Icon: ArrowDownCircle },
  { id: 'scenarios',    label: "Scenario's",   Icon: FlaskConical     },
  { id: 'planner',      label: 'Planner',      Icon: Calculator      },
  { id: 'salaris',      label: 'Salaris',      Icon: Euro            },
  { id: 'instellingen', label: 'Instellingen', Icon: Settings         },
];

// ── Login scherm ──────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithMagicLink(email);
    setLoading(false);
    if (err) { setError(err.message); }
    else     { setSent(true); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem',
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #1a1f2e, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '1.5rem',
          }}>🔥</div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>FIRE App</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
            Bereken wanneer jij financieel onafhankelijk bent.
          </p>
        </div>

        {sent ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📬</div>
            <h3 style={{ marginBottom: '0.5rem' }}>Check je inbox</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
              We hebben een inloglink gestuurd naar <strong>{email}</strong>.
              Klik op de link om in te loggen.
            </p>
          </div>
        ) : (
          <div className="card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '1.25rem' }}>
              Inloggen met magic link
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">E-mailadres</label>
                <input
                  type="email" required
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                />
              </div>
              {error && (
                <div style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? 'Versturen…' : 'Stuur inloglink →'}
              </button>
            </form>
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-4)', textAlign: 'center', lineHeight: 1.6 }}>
              Geen wachtwoord nodig. Je ontvangt een eenmalige inloglink per e-mail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hoofd app ──────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(undefined); // undefined = loading, null = not logged in
  const [profile, setProfile] = useState(null);
  const [view,    setView]    = useState('dashboard');

  // Params & data
  const [params,          setParams]          = useState({});
  const [vermogenUpdates, setVermogenUpdates] = useState([]);
  const [pkCache,         setPkCache]         = useState(null);

  // Computed / simulation
  const [mcResult,       setMcResult]       = useState(null);
  const [mcRunning,      setMcRunning]      = useState(false);
  const [pkResult,       setPkResult]       = useState(null);
  const [pkLoading,      setPkLoading]      = useState(false);
  const [pkVloer,        setPkVloer]        = useState(null);
  const [pkStreef,       setPkStreef]        = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Auth: listen for changes
  useEffect(() => {
    const unsub = onAuthStateChange(u => setUser(u));
    // Also check initial session
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setUser(data?.session?.user ?? null);
      });
    } else {
      setUser(null); // no auth configured — run local-only
    }
    return unsub;
  }, []);

  // Load user data when user logs in
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    (async () => {
      // Load profile
      const prof = await loadProfile(user.id);
      setProfile(prof);
      setProfileLoading(false);

      // Load fire_data (params)
      const fireData = await loadFireData(user.id);
      if (fireData) {
        setParams(fireData.params ?? {});
        setPkCache(fireData.pkCache ?? null);
        if (fireData.pkCache?.pk)      setPkResult(fireData.pkCache.pk);
        if (fireData.pkCache?.pkVloer) setPkVloer(fireData.pkCache.pkVloer);
        if (fireData.pkCache?.pkStreef) setPkStreef(fireData.pkCache.pkStreef);
      } else {
        // Fall back to local storage
        const local = loadLocal();
        setParams(local.params ?? {});
        setPkCache(local.pkCache ?? null);
      }

      // Load voortgang
      const vg = await loadVoortgang(user.id);
      if (vg && vg.length > 0) {
        const updates = vg.map(r => ({
          datum:     r.datum,
          bv:        r.bv        ?? 0,
          prive:     r.prive     ?? 0,
          inlegBV:   r.inleg_bv  ?? 0,
          bvSpaar:   r.bv_spaar  ?? 0,
          priveSpaar: r.prive_spaar ?? 0,
          id:        r.id,
        }));
        setVermogenUpdates(updates);
      }
    })();
  }, [user?.id]);

  // Effective params: BASE_PARAMS + user params + geboortejaar from profile
  const effectiveParams = useMemo(() => {
    const inflatieCBS = berekenGemiddeldeInflatieCBS();
    const geboortejaar = profile?.geboortejaar ?? params.geboortejaar ?? BASE_PARAMS.geboortejaar;
    const basejaar = new Date().getFullYear();
    const isPrive = (profile?.user_type ?? 'dga') === 'prive';
    return {
      ...BASE_PARAMS,
      inflatieGemiddeld: inflatieCBS,
      ...params,
      geboortejaar,
      basejaar,
      ...(isPrive ? {
        verplichtDGAsalaris:    0,
        inlegJaarlijksBV:       0,
        vennootschapsbelasting: 0,
        dividendbelasting:      0,
        inkomstenbelasting:     0,
        jaarlijksNettoSPMS:     0, // geen SPMS voor privé; instelbaar via Instellingen
        priveModus:             true,
      } : {}),
    };
  }, [params, profile]);

  const birthYear = effectiveParams.geboortejaar ?? BIRTH_YEAR;

  const partnerActief = effectiveParams.partnerActief ?? false;

  // Start of simulation
  const start = useMemo(() => {
    const s = getProjectionStart(vermogenUpdates);
    return { ...s, bvSpaar: 0, priveSpaar: 0, ...meestRecenteSpaar(vermogenUpdates) };
  }, [vermogenUpdates]);

  const mcStart = useMemo(() => {
    if (!partnerActief) return start;
    return { ...start, prive: (start.prive ?? 0) + (effectiveParams.partnerPriveNu ?? 0) };
  }, [start, partnerActief, effectiveParams.partnerPriveNu]);

  const mcParams = useMemo(() => {
    if (!partnerActief) return effectiveParams;
    return { ...effectiveParams, inlegJaarlijksPrive: (effectiveParams.inlegJaarlijksPrive ?? 0) + (effectiveParams.partnerInlegPrive ?? 0) };
  }, [effectiveParams, partnerActief]);

  // Privé at pension day (for pk calculation)
  const priveOpPensioendag = useMemo(() => {
    if (!mcResult?.years?.length) return 0;
    const pensioenLft = effectiveParams.pensioenLeeftijd ?? 55;
    const row = mcResult.years.find(r => r.leeftijd === pensioenLft);
    return row?.priveP50 ?? 0;
  }, [mcResult, effectiveParams.pensioenLeeftijd]);

  // Run Monte Carlo when start or params change
  const mcDeps = JSON.stringify({
    bv:    mcStart.bv,
    prive: mcStart.prive,
    jaar:  mcStart.jaar,
    maand: mcStart.maand,
    p:     mcParams.pensioenLeeftijd,
    r:     mcParams.meanReturn,
    i:     mcParams.inlegJaarlijksBV,
    ip:    mcParams.inlegJaarlijksPrive,
  });

  useEffect(() => {
    if (!start.jaar) return;
    setMcRunning(true);
    const t = setTimeout(() => {
      const result = runMonteCarlo(mcParams, mcStart, 2500);
      setMcResult(result);
      setMcRunning(false);
    }, 50);
    return () => clearTimeout(t);
  }, [mcDeps]);

  // Pensioenkapitaal berekenen (na MC klaar)
  const pkDeps = JSON.stringify({
    netto: effectiveParams.nettoInkomenDoel,
    p:     effectiveParams.pensioenLeeftijd,
    r:     effectiveParams.rendementNaPensioen,
    s:     effectiveParams.jaarlijksNettoSPMS,
    a:     effectiveParams.jaarlijksNettoAOW,
    prive: priveOpPensioendag,
  });

  useEffect(() => {
    if (!mcResult) return;
    setPkLoading(true);
    const t = setTimeout(() => {
      const pk = berekenVeiligPensioenKapitaal(mcParams, priveOpPensioendag, 80, 250);
      setPkResult(pk);
      setPkLoading(false);
    }, 100);
    return () => clearTimeout(t);
  }, [mcResult, pkDeps, priveOpPensioendag]);

  // Floor pk (nettoInkomenVloer)
  useEffect(() => {
    if (!mcResult) return;
    const vloerInkomen = mcParams.nettoInkomenVloer ?? BASE_PARAMS.nettoInkomenVloer;
    const paramsVloer  = { ...mcParams, nettoInkomenDoel: vloerInkomen };
    const t = setTimeout(() => {
      setPkVloer(berekenVeiligPensioenKapitaal(paramsVloer, priveOpPensioendag, 80, 250));
    }, 150);
    return () => clearTimeout(t);
  }, [mcResult, pkDeps, priveOpPensioendag, params.nettoInkomenVloer]);

  // Streef pk
  useEffect(() => {
    if (!mcResult) return;
    const streefInkomen = mcParams.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef;
    const paramsStreef  = { ...mcParams, nettoInkomenDoel: streefInkomen };
    const t = setTimeout(() => {
      setPkStreef(berekenVeiligPensioenKapitaal(paramsStreef, priveOpPensioendag, 80, 250));
    }, 200);
    return () => clearTimeout(t);
  }, [mcResult, pkDeps, priveOpPensioendag, params.nettoInkomenStreef]);

  // Countdown helper
  const makeCountdown = useCallback((ep, pk) => {
    if (!mcResult?.years?.length || !pk) return null;
    const pensioenLft = ep.pensioenLeeftijd ?? 55;
    const analytischGepland = berekenVereistKapitaalAnalytisch(ep, pensioenLft);
    const safetyFactor = analytischGepland > 0 ? pk / analytischGepland : 1;
    const geplandPensioenjaar = birthYear + pensioenLft;
    const now = new Date();
    for (const row of mcResult.years.filter(r => r.leeftijd <= pensioenLft)) {
      const portfolio = row.totaalP50 ?? row.bvP50 ?? 0;
      const vereist   = berekenVereistKapitaalAnalytisch(ep, row.leeftijd) * safetyFactor;
      if (portfolio >= vereist) {
        const doelDatum = new Date(row.jaar, 5, 15);
        const msVerschil = Math.max(0, doelDatum - now);
        const totalDagen = Math.floor(msVerschil / 86400000);
        const jaren      = Math.floor(totalDagen / 365.25);
        const restDagen  = totalDagen - Math.floor(jaren * 365.25);
        const maanden    = Math.floor(restDagen / 30.44);
        return {
          doelJaar:    row.jaar,
          doelMaand:   6,
          doelLeeftijd: row.leeftijd,
          jaren, maanden,
          alBereikt:    doelDatum <= now,
          verschilMetGepland: row.jaar - geplandPensioenjaar,
          pensioenKapitaal: Math.round(vereist),
        };
      }
    }
    return null;
  }, [mcResult, birthYear]);

  const countdown = useMemo(
    () => makeCountdown(mcParams, pkResult),
    [makeCountdown, mcParams, pkResult]
  );

  const countdownVloer = useMemo(() => {
    const vloerInkomen = mcParams.nettoInkomenVloer ?? BASE_PARAMS.nettoInkomenVloer;
    return makeCountdown({ ...mcParams, nettoInkomenDoel: vloerInkomen }, pkVloer);
  }, [makeCountdown, mcParams, pkVloer]);

  const countdownStreef = useMemo(() => {
    const streefInkomen = mcParams.nettoInkomenStreef ?? BASE_PARAMS.nettoInkomenStreef;
    return makeCountdown({ ...mcParams, nettoInkomenDoel: streefInkomen }, pkStreef);
  }, [makeCountdown, mcParams, pkStreef]);

  // Save params to Supabase
  const saveParams = useCallback(async (newParams) => {
    setParams(newParams);
    const newPkCache = { pk: pkResult, pkVloer, pkStreef };
    setPkCache(newPkCache);
    saveLocal(newParams, newPkCache);
    if (user && supabaseEnabled) {
      await saveFireData(user.id, newParams, newPkCache);
    }
  }, [user, pkResult, pkVloer, pkStreef]);

  // Save voortgang update
  const saveVoortgangUpdate = useCallback((update) => {
    setVermogenUpdates(prev => {
      const idx = prev.findIndex(u => u.datum === update.datum);
      return idx >= 0
        ? prev.map((u, i) => i === idx ? update : u)
        : [...prev, update].sort((a, b) => a.datum.localeCompare(b.datum));
    });
  }, []);

  // Onboarding compleet
  const handleOnboardingComplete = useCallback(async (onboardingData) => {
    const { profile: newProfile, params: newParams, portfolioStart } = onboardingData;

    // Save profile
    if (user) await saveProfile(user.id, { ...newProfile, onboarding_completed: true });
    setProfile({ ...newProfile, onboarding_completed: true });

    // Save params
    await saveParams(newParams);

    // Save initial portfolio entry
    if (portfolioStart && user) {
      const { upsertVoortgang } = await import('./supabase.js');
      const id = `${portfolioStart.datum.replace(/-/g,'')}_initial`;
      await upsertVoortgang(user.id, { id, ...portfolioStart });
      setVermogenUpdates([portfolioStart]);
    }
  }, [user, saveParams]);

  // ── Loading state ────────────────────────────────────────
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: '0.85rem' }}>Laden…</div>
      </div>
    );
  }

  // ── Niet ingelogd ────────────────────────────────────────
  if (!user && supabaseEnabled) {
    return <LoginScreen />;
  }

  // ── Profiel laden ────────────────────────────────────────
  if (supabaseEnabled && user && profileLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: '0.85rem' }}>Profiel laden…</div>
      </div>
    );
  }

  // ── Onboarding ───────────────────────────────────────────
  if (supabaseEnabled && user && (!profile || !profile.onboarding_completed)) {
    return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
  }

  // ── Hoofd UI ─────────────────────────────────────────────
  const userType = profile?.user_type ?? 'dga';

  const sharedProps = {
    params: effectiveParams,
    start,
    mcResult,
    pensioenKapitaal: pkResult,
    pkLoading,
    pkVloer,
    pkStreef,
    priveOpPensioendag,
    countdown,
    countdownVloer,
    countdownStreef,
    birthYear,
    vermogenUpdates,
    userType,
    partnerActief,
    onParamsChange: saveParams,
    onVoortgangUpdate: saveVoortgangUpdate,
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':    return <Dashboard    {...sharedProps} />;
      case 'voortgang':    return <Voortgang    {...sharedProps} />;
      case 'projectie':    return <Projectie    {...sharedProps} />;
      case 'onttrekking':  return <Onttrekking  {...sharedProps} />;
      case 'scenarios':    return <Scenarios    {...sharedProps} />;
      case 'planner':      return <Planner      {...sharedProps} />;
      case 'salaris':      return <Salaris />;
      case 'instellingen': return <Instellingen {...sharedProps} />;
      default:             return <Dashboard    {...sharedProps} />;
    }
  };

  const displayEmail = user?.email ?? 'lokaal';
  const currentAge   = new Date().getFullYear() - birthYear;

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <span className="topbar-brand">🔥 FIRE App</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="topbar-meta">{displayEmail}</span>
          {user && (
            <button
              className="btn btn-ghost"
              style={{ padding: '0.3rem 0.6rem', minHeight: 'auto', fontSize: '0.75rem', gap: '0.3rem' }}
              onClick={() => signOut().then(() => setUser(null))}
            >
              <LogOut size={12} />
              Uitloggen
            </button>
          )}
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="nav-section-label">Menu</div>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item${view === id ? ' active' : ''}`}
            onClick={() => setView(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', padding: '2rem 1.25rem 0', borderTop: '1px solid var(--sidebar-border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
            Leeftijd: {currentAge}j<br />
            Portfolio: {fmt((start.bv ?? 0) + (start.prive ?? 0))}<br />
            Doel: {effectiveParams.pensioenLeeftijd}j
          </div>
        </div>
      </nav>

      {/* Hoofd inhoud */}
      <main className="main-content fade-up">
        {renderView()}
      </main>

      {/* Mobile nav */}
      <nav className="mobile-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`mobile-nav-item${view === id ? ' active' : ''}`}
            onClick={() => setView(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
