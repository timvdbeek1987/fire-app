// ============================================================
// FIRE App – Data & Simulation Engine
// Generiek: geen persoonlijke data, multi-user geschikt
// ============================================================

// Standaard geboortejaar als module-level fallback.
// Alle engine-functies gebruiken p.geboortejaar ?? BIRTH_YEAR.
export const BIRTH_YEAR = 1990;

export function getCurrentAge(geboortejaar = BIRTH_YEAR) {
  const now = new Date();
  let age = now.getFullYear() - geboortejaar;
  // Vereenvoudigd: geen exacte geboortemaand
  return age;
}

// ============================================================
// CBS CPI JAARGEMIDDELDEN — bron: CBS StatLine (70936ned)
// Bijgewerkt t/m 2025 (CBS persbericht maart 2026)
// ============================================================
export const CBS_CPI_JAARGEMIDDELD = [
  { jaar: 2015, cpi: 0.006 },
  { jaar: 2016, cpi: 0.003 },
  { jaar: 2017, cpi: 0.014 },
  { jaar: 2018, cpi: 0.017 },
  { jaar: 2019, cpi: 0.026 },
  { jaar: 2020, cpi: 0.013 },
  { jaar: 2021, cpi: 0.027 },
  { jaar: 2022, cpi: 0.100 },
  { jaar: 2023, cpi: 0.038 },
  { jaar: 2024, cpi: 0.033 },
  { jaar: 2025, cpi: 0.033 },
];

export function berekenGemiddeldeInflatieCBS(jaren = 10) {
  const reeks = [...CBS_CPI_JAARGEMIDDELD].sort((a, b) => b.jaar - a.jaar).slice(0, jaren);
  if (reeks.length === 0) return 0.02;
  return reeks.reduce((s, r) => s + r.cpi, 0) / reeks.length;
}

export function cbsCpiUpdateNodig() {
  const now      = new Date();
  const maand    = now.getMonth() + 1;
  const huidigJaar = now.getFullYear();
  const vorigJaar  = huidigJaar - 1;
  const laatstelJaar = Math.max(...CBS_CPI_JAARGEMIDDELD.map(r => r.jaar));
  return maand >= 2 && laatstelJaar < vorigJaar;
}

// ============================================================
// PARAMETERS — consistent benoemd door hele codebase
// ============================================================
export const BASE_PARAMS = {
  geboortejaar:               1990,   // wordt overschreven door user-profiel
  pensioenLeeftijd:           55,
  spmsLeeftijd:               60,
  aowLeeftijd:                67,
  inlegJaarlijksBV:           60000,
  inlegJaarlijksPrive:        3000,
  meanReturn:                 0.097,
  rendementNaPensioen:        0.05,
  sdReturn:                   0.17,
  sdReturnNaPensioen:         0.10,
  minReturn:                  -0.30,
  maxReturn:                  0.30,
  inflatieGemiddeld:          0.02,
  inflatieSD:                 0.01,
  inflatieMin:                -0.01,
  inflatieMax:                0.06,
  nettoInkomenDoel:           90000,  // comfort (€7.5k/mnd incl. hypotheek)
  nettoInkomenVloer:          72000,  // floor (€6k/mnd)
  nettoInkomenStreef:         84000,  // streef (€7k/mnd)
  jaarlijksNettoSPMS:         33750,
  jaarlijksNettoAOW:          16680,
  verplichtDGAsalaris:        20000,
  dividendbelasting:          0.245,
  vennootschapsbelasting:     0.19,
  inkomstenbelasting:         0.43,
  vermogensrendementsheffing: 0.02088,
  jaarHypotheekvrij:          2050,
  maandelijkseHypotheeklast:  2000,
  hypotheekRestschuld:        150000,
  hypotheekAflosJaar:         2040,
  hypotheekAflosMethode:      'bank',
  hypotheekHerfinRente:       4.5,
  inkomstenReductieLft:       75,
  inkomstenReductiePct:       0.20,
  spaarrenteBV:               0.025,
  spaarrentePrive:            0.025,
};

// ============================================================
// BRONNEN HELPERS
// ============================================================
export function meestRecenteSpaar(vermogenUpdates = []) {
  const gesorteerd = [...vermogenUpdates].sort((a, b) => b.datum.localeCompare(a.datum));
  const result = {};
  for (const u of gesorteerd) {
    if (u.bvSpaar         != null && result.bvSpaar         == null) result.bvSpaar         = u.bvSpaar;
    if (u.priveSpaar      != null && result.priveSpaar      == null) result.priveSpaar      = u.priveSpaar;
    if (u.spaarrenteBV    != null && result.spaarrenteBV    == null) result.spaarrenteBV    = u.spaarrenteBV;
    if (u.spaarrentePrive != null && result.spaarrentePrive == null) result.spaarrentePrive = u.spaarrentePrive;
    if (Object.keys(result).length === 4) break;
  }
  return result;
}

/**
 * Geeft het meest actuele startpunt op basis van gebruikersdata.
 * Gebruikt de meest recente voortgangsupdate, of de basisinstellingen.
 */
export function getProjectionStart(vermogenUpdates, fallback = null) {
  if (vermogenUpdates && vermogenUpdates.length > 0) {
    const sorted = [...vermogenUpdates].sort((a, b) => a.datum.localeCompare(b.datum));
    const last = sorted[sorted.length - 1];
    const d = new Date(last.datum);
    return {
      jaar:        d.getFullYear(),
      maand:       d.getMonth() + 1,
      bv:          last.bv         ?? 0,
      prive:       last.prive      ?? 0,
      inlegBV:     last.inlegBV    ?? 0,
      bvSpaar:     last.bvSpaar    ?? 0,
      priveSpaar:  last.priveSpaar ?? 0,
    };
  }
  if (fallback) return fallback;
  // Absolute fallback: simulatie start vandaag met lege portefeuilles
  const now = new Date();
  return { jaar: now.getFullYear(), maand: now.getMonth() + 1, bv: 0, prive: 0 };
}

export function getFracYearRemaining(jaar, maand) {
  const maandenResterend = 12 - maand;
  return maandenResterend / 12;
}

// ============================================================
// MONTE CARLO ENGINE
// ============================================================

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeRandNormal(rng) {
  return function(mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };
}

function paramsToSeed(params, start) {
  const str = JSON.stringify({
    pensioenLeeftijd: params.pensioenLeeftijd,
    meanReturn: params.meanReturn,
    sdReturn: params.sdReturn,
    rendementNaPensioen: params.rendementNaPensioen,
    nettoInkomenDoel: params.nettoInkomenDoel,
    inlegJaarlijksBV: params.inlegJaarlijksBV,
    inlegJaarlijksPrive: params.inlegJaarlijksPrive,
    dividendbelasting: params.dividendbelasting,
    vennootschapsbelasting: params.vennootschapsbelasting,
    hypotheekAflosMethode: params.hypotheekAflosMethode,
    hypotheekAflosJaar: params.hypotheekAflosJaar,
    bv: Math.round((start.bv ?? 0) / 1000),
    prive: Math.round((start.prive ?? 0) / 1000),
    jaar: start.jaar,
    maand: start.maand,
  });
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function runSinglePath(p, start, so, randNorm, strategie = null) {
  const birthYear = p.geboortejaar ?? BIRTH_YEAR;

  let bvBeleg = Math.max(0, (start.bv ?? 0) - (start.bvSpaar ?? 0));
  let bvSpaar = start.bvSpaar ?? 0;
  let bv      = bvBeleg + bvSpaar;
  let priveBeleg = Math.max(0, (start.prive ?? 0) - (start.priveSpaar ?? 0));
  let priveSpaar = start.priveSpaar ?? 0;
  let prive   = priveBeleg + priveSpaar;
  const startJaar = start.jaar;
  const frac0 = getFracYearRemaining(start.jaar, start.maand);

  const eindJaar = birthYear + 90;
  const rows = [];
  const jaarlastVoorBase = (p.maandelijkseHypotheeklast ?? 2000) * 12;

  let guardrailsDoel = p.nettoInkomenDoel - jaarlastVoorBase;
  let guardrailsPortoRef = null;

  let cumIAtSPMSStart = null;
  let cumIAtAOWStart  = null;

  // cumulInflatie: start op 1 op het startjaar van de simulatie.
  // Als we starten vanuit een toekomstig jaar (bijv. berekenVeiligPensioenKapitaal),
  // pre-inflateren we t.o.v. het basejaar zodat het inkomensdoel correct omgerekend wordt.
  const basejaar       = p.basejaar ?? startJaar;
  const jarenSindsBase = Math.max(0, startJaar - basejaar);
  let cumulInflatie    = Math.pow(1 + p.inflatieGemiddeld, jarenSindsBase);

  for (let jaar = startJaar; jaar <= eindJaar; jaar++) {
    const leeftijd   = jaar - birthYear;
    const frac       = jaar === startJaar ? frac0 : 1.0;
    const isPensioen = leeftijd >= p.pensioenLeeftijd;
    const heeftSPMS  = leeftijd >= p.spmsLeeftijd;
    const heeftAOW   = leeftijd >= p.aowLeeftijd;

    let muR  = isPensioen ? p.rendementNaPensioen : p.meanReturn;
    let muI  = p.inflatieGemiddeld;
    let sigR = isPensioen ? (p.sdReturnNaPensioen ?? p.sdReturn) : p.sdReturn;

    if (so) {
      if (so.type === 'crash' && jaar === so.jaar)          { muR = -(so.crashPct ?? 0.30); sigR = 0; }
      if (so.type === 'noGrowth' && jaar >= so.startJaar && jaar < so.startJaar + so.duur) { muR = 0; sigR = 0; }
      if (so.type === 'highInflation' && jaar >= so.startJaar && jaar < so.startJaar + so.duur) muI = so.inflatie ?? 0.04;
      if (so.type === 'combined' && jaar >= so.startJaar && jaar < so.startJaar + (so.duur ?? 999)) {
        if (so.noGrowth) { muR = 0; sigR = 0; }
        if (so.crash && jaar === so.startJaar) { muR = -(so.crashPct ?? 0.30); sigR = 0; }
        if (so.inflatie) muI = so.inflatie;
      }
    }

    const glideParams = isPensioen && strategie
      ? (strategie.type === 'glidepath' ? strategie : (strategie.glidepath ?? null))
      : null;
    if (glideParams) {
      const glideStartJaar = birthYear + (glideParams.startAge ?? p.pensioenLeeftijd);
      const glideEindJaar  = birthYear + (glideParams.endAge   ?? 80);
      const t = Math.min(1, Math.max(0, (jaar - glideStartJaar) / Math.max(1, glideEindJaar - glideStartJaar)));
      muR  = (glideParams.startReturn ?? muR) + ((glideParams.endReturn ?? muR * 0.5) - (glideParams.startReturn ?? muR)) * t;
      sigR = (glideParams.startSD    ?? sigR) + ((glideParams.endSD    ?? sigR * 0.5) - (glideParams.startSD    ?? sigR)) * t;
    }

    const jaarR = clamp(randNorm(muR, sigR) * frac, p.minReturn * frac, p.maxReturn * frac);
    const jaarI = clamp(randNorm(muI, p.inflatieSD) * frac, p.inflatieMin * frac, p.inflatieMax * frac);
    cumulInflatie *= (1 + jaarI);

    if (heeftSPMS && cumIAtSPMSStart === null) cumIAtSPMSStart = cumulInflatie;
    if (heeftAOW  && cumIAtAOWStart  === null) cumIAtAOWStart  = cumulInflatie;

    if (!isPensioen) {
      // === OPBOUWFASE ===
      const inBV = p.inlegJaarlijksBV    * frac;
      const inPv = p.inlegJaarlijksPrive * frac;

      const rendBelegBVb = (bvBeleg + inBV * 0.5) * jaarR;
      const vpbBeleg     = rendBelegBVb > 0 ? rendBelegBVb * p.vennootschapsbelasting : 0;
      const rendBelegBVn = rendBelegBVb - vpbBeleg;

      const spaarRenteBV = p.spaarrenteBV ?? 0.025;
      const rendSpaarBVb = bvSpaar * spaarRenteBV * frac;
      const vpbSpaar     = rendSpaarBVb > 0 ? rendSpaarBVb * p.vennootschapsbelasting : 0;
      const rendSpaarBVn = rendSpaarBVb - vpbSpaar;

      const rendBelegPvb = (priveBeleg + inPv * 0.5) * jaarR;
      const vrh          = prive * p.vermogensrendementsheffing * frac;
      const rendBelegPvn = rendBelegPvb - vrh;

      const spaarRentePv = p.spaarrentePrive ?? 0.025;
      const rendSpaarPvn = priveSpaar * spaarRentePv * frac;

      const aflosJaarOp    = p.hypotheekAflosJaar    ?? 2040;
      const aflosMethodeOp = p.hypotheekAflosMethode ?? 'bank';
      let eenmaligAflosOp  = 0;
      if (aflosMethodeOp === 'bv' && jaar === aflosJaarOp) {
        eenmaligAflosOp = (p.hypotheekRestschuld ?? 150000) / (1 - p.dividendbelasting);
      }

      bvBeleg = Math.max(0, bvBeleg + inBV + rendBelegBVn - eenmaligAflosOp);
      bvSpaar = Math.max(0, bvSpaar + rendSpaarBVn);
      bv      = bvBeleg + bvSpaar;

      priveBeleg = Math.max(0, priveBeleg + inPv + rendBelegPvn);
      priveSpaar = Math.max(0, priveSpaar + rendSpaarPvn);
      prive      = priveBeleg + priveSpaar;

      rows.push({
        jaar, leeftijd,
        bv: Math.round(bv), prive: Math.round(prive),
        totaal: Math.round(bv + prive),
        onttrekkingBV:   Math.round(eenmaligAflosOp),
        onttrekkingPrive: 0,
        eenmaligAflos:   Math.round(eenmaligAflosOp),
        inlegBV: Math.round(inBV),
        cumulInflatie,
        bvReeel: Math.round(bv / cumulInflatie),
        jaarR,
      });

    } else {
      // === ONTTREKKINGSFASE ===
      const bvJaarStart    = bv;
      const priveJaarStart = prive;

      const brutoDGAjaar = p.verplichtDGAsalaris * frac;
      const spaarRenteBV = p.spaarrenteBV ?? 0.025;
      const rendSpaarBVb = bvSpaar * spaarRenteBV * frac;
      const rendBelegBVb = bvBeleg * jaarR;
      const rendBVb      = rendBelegBVb + rendSpaarBVb;
      const winstNaSalaris = Math.max(0, rendBVb - brutoDGAjaar);
      const vpb = winstNaSalaris > 0
        ? (winstNaSalaris <= 200000
            ? winstNaSalaris * 0.19
            : 200000 * 0.19 + (winstNaSalaris - 200000) * 0.258)
        : 0;
      const rendBVn = rendBVb - vpb;

      const rendPvb = prive * jaarR;
      const vrh     = prive * p.vermogensrendementsheffing * frac;
      const rendPvn = rendPvb - vrh;

      const aflosJaar    = p.hypotheekAflosJaar    ?? 2040;
      const aflosMethode = p.hypotheekAflosMethode ?? 'bank';
      const eindHypoJaar = p.jaarHypotheekvrij     ?? 2050;

      const jaarlastVoor = (p.maandelijkseHypotheeklast ?? 2000) * 12;

      const herfinRentePct = (p.hypotheekHerfinRente ?? 4.5) / 100;
      const herfinR  = herfinRentePct / 12;
      const herfinN  = Math.max(1, (eindHypoJaar - aflosJaar) * 12);
      const herfinS  = p.hypotheekRestschuld ?? 150000;
      const maandNa  = herfinR > 0
        ? herfinS * herfinR * Math.pow(1 + herfinR, herfinN) / (Math.pow(1 + herfinR, herfinN) - 1)
        : herfinS / herfinN;
      const jaarlastNa = maandNa * 12;

      let eenmaligAflos = 0;
      if (aflosMethode === 'bv' && jaar === aflosJaar) {
        eenmaligAflos = (p.hypotheekRestschuld ?? 150000) / (1 - p.dividendbelasting);
      }

      const hypotheekAfgelost = (aflosMethode === 'bv'   && jaar >  aflosJaar)
                              || (aflosMethode === 'bank' && jaar >  eindHypoJaar);

      const jaarlastHypo = hypotheekAfgelost          ? 0
        : (aflosMethode === 'bank' && jaar > aflosJaar) ? jaarlastNa
        : jaarlastVoor;

      const reductieLft    = p.inkomstenReductieLft ?? 999;
      const reductiePct    = p.inkomstenReductiePct ?? 0.0;
      const leeftijdFactor = leeftijd >= reductieLft ? (1 - reductiePct) : 1.0;

      let hypoKorting;
      if (hypotheekAfgelost) {
        hypoKorting = jaarlastVoor;
      } else if (aflosMethode === 'bank' && jaar > aflosJaar) {
        hypoKorting = jaarlastVoor - jaarlastNa;
      } else {
        hypoKorting = 0;
      }

      const minFloor  = (strategie?.minInkomen ?? 0) * 12;
      const floorBase = (strategie?.floor      ?? 0) * 12;

      let doelNominaalVol;
      if (strategie?.type === 'percentage') {
        doelNominaalVol = Math.max(0, (bv + prive) * (strategie.pct ?? 0.04) * leeftijdFactor - hypoKorting);
      } else if (strategie?.type === 'guardrails') {
        if (guardrailsPortoRef === null) guardrailsPortoRef = bv + prive;
        const ratio = guardrailsPortoRef > 0 ? (bv + prive) / guardrailsPortoRef : 1;
        const guardrailsTotaal = guardrailsDoel + jaarlastHypo;
        if (ratio < (strategie.lowerBound ?? 0.80) && guardrailsTotaal > minFloor) {
          guardrailsDoel = Math.max(0, Math.max(minFloor - jaarlastHypo, guardrailsDoel * (1 - (strategie.cutPct ?? 0.10))));
          guardrailsPortoRef = bv + prive;
        } else if (ratio > (strategie.upperBound ?? 1.20)) {
          guardrailsDoel = guardrailsDoel * (1 + (strategie.raisePct ?? 0.05));
          guardrailsPortoRef = bv + prive;
        }
        doelNominaalVol = Math.max(0, guardrailsDoel * leeftijdFactor + jaarlastHypo);
      } else if (strategie?.type === 'floor_upside') {
        const upside = (bv + prive) * (strategie.upsidePct ?? 0.025);
        doelNominaalVol = Math.max(0, (floorBase + upside) * leeftijdFactor - hypoKorting);
      } else if (strategie?.type === 'vpw') {
        const targetAge = strategie.targetAge  ?? 95;
        const rReal     = strategie.realReturn ?? 0.03;
        const maxPct    = strategie.maxPct     ?? 0.12;
        const restJaren = Math.max(1, targetAge - leeftijd);
        const pvFactor  = rReal > 0.0005
          ? (1 - Math.pow(1 + rReal, -restJaren)) / rReal
          : restJaren;
        const vpwRaw    = (bv + prive) / pvFactor;
        const vpwCapped = maxPct > 0 ? Math.min(vpwRaw, (bv + prive) * maxPct) : vpwRaw;
        doelNominaalVol = Math.max(0, vpwCapped * leeftijdFactor);
      } else {
        const leefstijlNominaal = (p.nettoInkomenDoel - jaarlastVoor) * cumulInflatie;
        doelNominaalVol = Math.max(0, (leefstijlNominaal + jaarlastHypo) * leeftijdFactor);
      }

      if (minFloor > 0) doelNominaalVol = Math.max(doelNominaalVol, minFloor);

      const doelNetto = doelNominaalVol * frac;

      const inkSPMS = heeftSPMS ? p.jaarlijksNettoSPMS * (cumulInflatie / cumIAtSPMSStart) * frac : 0;
      const inkAOW  = heeftAOW  ? p.jaarlijksNettoAOW  * (cumulInflatie / cumIAtAOWStart)  * frac : 0;

      const behoefteNaExtern = Math.max(0, doelNetto - inkSPMS - inkAOW);
      const maxPv = p.priveModus ? prive : (rendPvn > 0 ? rendPvn * 1.20 : 0);
      const ontPv = Math.min(maxPv, behoefteNaExtern, prive);

      const behoefteNaPrive = Math.max(0, behoefteNaExtern - ontPv);
      const nettoDGA    = brutoDGAjaar * (1 - p.inkomstenbelasting);
      const behoefteNaDGA = Math.max(0, behoefteNaPrive - nettoDGA);
      const brutoDividend = behoefteNaDGA > 0 ? behoefteNaDGA / (1 - p.dividendbelasting) : 0;
      const ontBV = brutoDGAjaar + brutoDividend + eenmaligAflos;

      const nettoDividend  = brutoDividend * (1 - p.dividendbelasting);
      const nettoUitBV     = nettoDGA + nettoDividend;
      const nettoInkomen   = nettoUitBV + ontPv + inkSPMS + inkAOW;

      const ontBVBeleg = Math.min(ontBV, bvBeleg + rendBVn * (bvBeleg / Math.max(1, bv)));
      const ontBVSpaar = Math.max(0, ontBV - ontBVBeleg);
      bvBeleg = Math.max(0, bvBeleg + rendBelegBVb - (rendBelegBVb > 0 ? rendBelegBVb * p.vennootschapsbelasting : 0) - ontBVBeleg);
      bvSpaar = Math.max(0, bvSpaar + rendSpaarBVb - (rendSpaarBVb > 0 ? rendSpaarBVb * p.vennootschapsbelasting : 0) - ontBVSpaar);
      bv      = bvBeleg + bvSpaar;

      const spaarRentePv = p.spaarrentePrive ?? 0.025;
      const rendSpaarPvn = priveSpaar * spaarRentePv * frac;
      const rendBelegPvb = priveBeleg * jaarR;
      const vrhPv        = prive * p.vermogensrendementsheffing * frac;
      const rendBelegPvn = rendBelegPvb - vrhPv;
      priveBeleg = Math.max(0, priveBeleg + rendBelegPvn - ontPv * (priveBeleg / Math.max(1, prive)));
      priveSpaar = Math.max(0, priveSpaar + rendSpaarPvn - ontPv * (priveSpaar / Math.max(1, prive)));
      prive      = priveBeleg + priveSpaar;

      rows.push({
        jaar, leeftijd,
        bv: Math.round(bv), prive: Math.round(prive),
        totaal: Math.round(bv + prive),
        bvBegin:          Math.round(bvJaarStart),
        priveBegin:       Math.round(priveJaarStart),
        onttrekkingBV:    Math.round(ontBV),
        onttrekkingPrive: Math.round(ontPv),
        hypotheekAfgelost,
        eenmaligAflos:    Math.round(eenmaligAflos),
        inlegBV: 0,
        cumulInflatie,
        doelNominaal:     Math.round(doelNominaalVol),
        nettoInkomenEngine: Math.round(nettoInkomen),
        bvReeel: Math.round(bv / cumulInflatie),
        jaarR,
        brutoDGA:         Math.round(brutoDGAjaar),
        ibBedrag:         Math.round(brutoDGAjaar * p.inkomstenbelasting),
        brutoDividend:    Math.round(brutoDividend),
        divBelBedrag:     Math.round(brutoDividend * p.dividendbelasting),
        vpbBedrag:        Math.round(vpb),
        inkSPMS:          Math.round(inkSPMS),
        inkAOW:           Math.round(inkAOW),
        rendBV:           Math.round(rendBVn),
        rendPrive:        Math.round(rendPvn),
      });
    }
  }

  return rows;
}

/**
 * Monte Carlo simulatie
 */
export function runMonteCarlo(params, start, nSims = 2500, so = null) {
  const p = { ...BASE_PARAMS, ...params };

  const seed     = paramsToSeed(p, start);
  const rng      = mulberry32(seed);
  const randNorm = makeRandNormal(rng);

  const allPaths = [];
  for (let i = 0; i < nSims; i++) {
    try {
      const path = runSinglePath(p, start, so, randNorm);
      if (path && path.length > 0) allPaths.push(path);
    } catch (e) { /* skip */ }
  }

  if (allPaths.length === 0) return { years: [], kansSucces: 0 };

  const nYears = allPaths[0].length;
  const pct = (arr, pc) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * pc / 100);
    const val = sorted[Math.min(idx, sorted.length - 1)];
    return isNaN(val) ? 0 : val;
  };

  const result = [];
  for (let yi = 0; yi < nYears; yi++) {
    const row0   = allPaths[0][yi];
    const getBV    = path => path[yi]?.bv    ?? 0;
    const getPrive = path => path[yi]?.prive ?? 0;
    const getTot   = path => path[yi]?.totaal ?? 0;
    const getReeel = path => path[yi]?.bvReeel ?? 0;
    const getOntBV = path => path[yi]?.onttrekkingBV ?? 0;
    const getOntPv = path => path[yi]?.onttrekkingPrive ?? 0;
    const getDoel  = path => path[yi]?.doelNominaal ?? 0;
    const getCumI  = path => path[yi]?.cumulInflatie ?? 1;
    const getInk   = path => path[yi]?.nettoInkomenEngine ?? 0;

    result.push({
      jaar:     row0.jaar,
      leeftijd: row0.leeftijd,
      onttrekkingBV:    pct(allPaths.map(getOntBV), 50),
      onttrekkingPrive: pct(allPaths.map(getOntPv), 50),
      doelNominaal:     pct(allPaths.map(getDoel),  50),
      cumulInflatie:    pct(allPaths.map(getCumI),  50),
      bvP10:  pct(allPaths.map(getBV), 10),
      bvP25:  pct(allPaths.map(getBV), 25),
      bvP50:  pct(allPaths.map(getBV), 50),
      bvP75:  pct(allPaths.map(getBV), 75),
      bvP90:  pct(allPaths.map(getBV), 90),
      priveP25: pct(allPaths.map(getPrive), 25),
      priveP50: pct(allPaths.map(getPrive), 50),
      priveP75: pct(allPaths.map(getPrive), 75),
      totaalP25: pct(allPaths.map(getTot), 25),
      totaalP50: pct(allPaths.map(getTot), 50),
      totaalP75: pct(allPaths.map(getTot), 75),
      bvReëelP50: pct(allPaths.map(getReeel), 50),
      inkomensP10: Math.round(pct(allPaths.map(getInk), 10) / 12),
      inkomensP25: Math.round(pct(allPaths.map(getInk), 25) / 12),
      inkomensP50: Math.round(pct(allPaths.map(getInk), 50) / 12),
      inkomensP75: Math.round(pct(allPaths.map(getInk), 75) / 12),
      inkomensP90: Math.round(pct(allPaths.map(getInk), 90) / 12),
    });
  }

  const pensionLft = p.pensioenLeeftijd ?? 55;
  const idx85 = allPaths[0].findIndex(r => r.leeftijd === 85);
  const kansSucces = idx85 >= 0
    ? Math.round(allPaths.filter(path => ((path[idx85]?.bv ?? 0) + (path[idx85]?.prive ?? 0)) > 0).length / allPaths.length * 100)
    : 0;

  const depletionDist = (() => {
    const counts = {};
    let nooit = 0;
    for (const path of allPaths) {
      const depIdx = path.findIndex(r => r.bv <= 0);
      if (depIdx < 0) { nooit++; }
      else { const age = path[depIdx].leeftijd; counts[age] = (counts[age] ?? 0) + 1; }
    }
    const out = [];
    const ages = Object.keys(counts).map(Number).sort((a,b) => a-b);
    for (const age of ages) out.push({ leeftijd: age, aantal: counts[age], pct: Math.round(counts[age] / allPaths.length * 100) });
    out.push({ leeftijd: 'nooit', aantal: nooit, pct: Math.round(nooit / allPaths.length * 100) });
    return out;
  })();

  const idxPension  = allPaths[0].findIndex(r => r.leeftijd === pensionLft);
  const targetBV    = idxPension >= 0 ? (() => { const sorted = [...allPaths.map(path => path[idxPension]?.bv ?? 0)].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length*50/100)]; })() : 0;
  const medianPath  = allPaths.reduce((best, path) => {
    const diff     = Math.abs((path[idxPension]?.bv ?? 0) - targetBV);
    const bestDiff = Math.abs((best[idxPension]?.bv ?? 0) - targetBV);
    return diff < bestDiff ? path : best;
  }, allPaths[0]);

  return { years: result, kansSucces, medianPath, depletionDist, nSims: allPaths.length };
}

export function runMonteCarloStrategie(params, start, strategie = null, nSims = 600) {
  const p = { ...BASE_PARAMS, ...params };

  const rng      = mulberry32(Date.now() ^ (Math.random() * 0xffffffff | 0));
  const randNorm = makeRandNormal(rng);

  const allPaths = [];
  for (let i = 0; i < nSims; i++) {
    try {
      const path = runSinglePath(p, start, null, randNorm, strategie);
      if (path && path.length > 0) allPaths.push(path);
    } catch (e) { /* skip */ }
  }

  if (allPaths.length === 0) return { years: [], kansSucces: 0, depletionDist: [], nSims: 0 };

  const nYears = allPaths[0].length;
  const pct = (arr, pc) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * pc / 100);
    const val = sorted[Math.min(idx, sorted.length - 1)];
    return isNaN(val) ? 0 : val;
  };

  const result = [];
  for (let yi = 0; yi < nYears; yi++) {
    const row0 = allPaths[0][yi];
    const g    = field => path => path[yi]?.[field] ?? 0;
    const p50  = field => pct(allPaths.map(g(field)), 50);
    result.push({
      jaar:        row0.jaar,
      leeftijd:    row0.leeftijd,
      bvP10:       pct(allPaths.map(g('bv')), 10),
      bvP25:       pct(allPaths.map(g('bv')), 25),
      bvP50:       pct(allPaths.map(g('bv')), 50),
      bvP75:       pct(allPaths.map(g('bv')), 75),
      bvP90:       pct(allPaths.map(g('bv')), 90),
      inkomensP10: Math.round(pct(allPaths.map(g('nettoInkomenEngine')), 10) / 12),
      inkomensP25: Math.round(pct(allPaths.map(g('nettoInkomenEngine')), 25) / 12),
      inkomensP50: Math.round(pct(allPaths.map(g('nettoInkomenEngine')), 50) / 12),
      inkomensP75: Math.round(pct(allPaths.map(g('nettoInkomenEngine')), 75) / 12),
      inkomensP90: Math.round(pct(allPaths.map(g('nettoInkomenEngine')), 90) / 12),
      cumulInflatieP50: pct(allPaths.map(g('cumulInflatie')), 50),
      bvBeginP50:       p50('bvBegin'),
      priveBeginP50:    p50('priveBegin'),
      priveEindP50:     p50('prive'),
      brutoDGAP50:      Math.round(p50('brutoDGA')      / 12),
      ibBedragP50:      Math.round(p50('ibBedrag')      / 12),
      brutoDividendP50: Math.round(p50('brutoDividend') / 12),
      divBelP50:        Math.round(p50('divBelBedrag')  / 12),
      vpbP50:           Math.round(p50('vpbBedrag')     / 12),
      ontPriveP50:      Math.round(p50('onttrekkingPrive') / 12),
      ontBVP50:         Math.round(p50('onttrekkingBV')    / 12),
      inkSPMSP50:       Math.round(p50('inkSPMS')       / 12),
      inkAOWP50:        Math.round(p50('inkAOW')        / 12),
      rendBVP50:        p50('rendBV'),
      rendPriveP50:     p50('rendPrive'),
    });
  }

  const idx85 = allPaths[0].findIndex(r => r.leeftijd === 85);
  const kansSucces = idx85 >= 0
    ? Math.round(allPaths.filter(path => ((path[idx85]?.bv ?? 0) + (path[idx85]?.prive ?? 0)) > 0).length / allPaths.length * 100)
    : 0;

  const depletionDist = (() => {
    const counts = {};
    let nooit = 0;
    for (const path of allPaths) {
      const depIdx = path.findIndex(r => r.bv <= 0);
      if (depIdx < 0) { nooit++; }
      else { const age = path[depIdx].leeftijd; counts[age] = (counts[age] ?? 0) + 1; }
    }
    const out = [];
    const ages = Object.keys(counts).map(Number).sort((a,b) => a-b);
    for (const age of ages) out.push({ leeftijd: age, aantal: counts[age], pct: Math.round(counts[age] / allPaths.length * 100) });
    out.push({ leeftijd: 'nooit', aantal: nooit, pct: Math.round(nooit / allPaths.length * 100) });
    return out;
  })();

  const pensionAge  = p.pensioenLeeftijd ?? 55;
  const scatterData = allPaths.map(path => {
    const firstPensRow = path.find(r => r.leeftijd >= pensionAge);
    const row85        = path.find(r => r.leeftijd === 85);
    return {
      r1:          Math.round((firstPensRow?.jaarR ?? 0) * 1000) / 10,
      eind:        Math.round(((row85?.bv ?? 0) + (row85?.prive ?? 0)) / 1000),
      bvOverleeft: (row85?.bv ?? 0) > 0,
    };
  });

  return { years: result, kansSucces, depletionDist, nSims: allPaths.length, scatterData };
}

// ============================================================
// FORMATTERING
// ============================================================
export const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return `€${(n/1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `€${Math.round(n/1000)}K`;
  return `€${Math.round(n)}`;
};

export const fmtFull = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `€${Math.round(n).toLocaleString('nl-NL')}`;
};

export const fmtPct = (n, d = 1) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${(n * 100).toFixed(d)}%`;
};

export const fmtPctPts = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
};

export const MONTHS_NL = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

export const jaarLabel      = (jaar, birthYear = BIRTH_YEAR) => `${jaar}\n${jaar - birthYear}j`;
export const jaarLabelShort = (jaar, birthYear = BIRTH_YEAR) => `'${String(jaar).slice(2)}\n${jaar - birthYear}j`;

// ============================================================
// VEILIG PENSIOENKAPITAAL — binary search
// ============================================================
export function berekenVeiligPensioenKapitaal(params, priveOpPensioendag = 0, targetKans = 80, nSims = 500) {
  const p           = { ...BASE_PARAMS, ...params };
  const birthYear   = p.geboortejaar ?? BIRTH_YEAR;
  const pensioenLft = p.pensioenLeeftijd ?? 55;
  const pensioenJaar = birthYear + pensioenLft;
  const po = { ...p, inlegJaarlijksBV: 0, inlegJaarlijksPrive: 0 };

  const kansVoor = (portfolioWaarde) => {
    const start = p.priveModus
      ? { bv: 0, prive: portfolioWaarde, jaar: pensioenJaar, maand: 1 }
      : { bv: portfolioWaarde, prive: priveOpPensioendag, jaar: pensioenJaar, maand: 1 };
    return runMonteCarlo(po, start, nSims).kansSucces;
  };

  const kandidaten = [500_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000,
                      3_500_000, 4_000_000, 5_000_000, 6_500_000, 8_000_000];
  const sweep = kandidaten.map(bv => ({ bv, k: kansVoor(bv) }));

  const onder = [...sweep].reverse().find(r => r.k <  targetKans);
  const boven = sweep.find(r => r.k >= targetKans);

  if (!boven) return kandidaten.at(-1);
  if (!onder) return kandidaten[0];

  const mid  = Math.round((onder.bv + boven.bv) / 2 / 25_000) * 25_000;
  const kMid = kansVoor(mid);
  const fijnOnder = kMid < targetKans ? { bv: mid, k: kMid } : onder;
  const fijnBoven = kMid >= targetKans ? { bv: mid, k: kMid } : boven;

  const t2     = fijnBoven.k === fijnOnder.k ? 0.5
               : (targetKans - fijnOnder.k) / (fijnBoven.k - fijnOnder.k);
  const result = fijnOnder.bv + t2 * (fijnBoven.bv - fijnOnder.bv);
  return Math.round(result / 25_000) * 25_000;
}

// ============================================================
// ANALYTISCH VEREIST KAPITAAL
// ============================================================
export function berekenVereistKapitaalAnalytisch(p, lft) {
  const nettoJr  = p.nettoInkomenDoel   ?? BASE_PARAMS.nettoInkomenDoel;
  const spmsLft  = p.spmsLeeftijd       ?? BASE_PARAMS.spmsLeeftijd       ?? 60;
  const aowLft   = p.aowLeeftijd        ?? BASE_PARAMS.aowLeeftijd        ?? 67;
  const spmsJr   = p.jaarlijksNettoSPMS ?? BASE_PARAMS.jaarlijksNettoSPMS ?? 33750;
  const aowJr    = p.jaarlijksNettoAOW  ?? BASE_PARAMS.jaarlijksNettoAOW  ?? 16680;
  const rNa      = p.rendementNaPensioen ?? BASE_PARAMS.rendementNaPensioen;
  const inf      = p.inflatieGemiddeld   ?? BASE_PARAMS.inflatieGemiddeld;
  const rReal    = rNa - inf;
  const horizon  = 85;

  function pvSegment(bedrag, van, tot) {
    if (bedrag <= 0 || van >= tot || van >= horizon) return 0;
    const t1 = Math.max(0, van - lft);
    const t2 = Math.max(0, Math.min(tot, horizon) - lft);
    if (t2 <= t1) return 0;
    const pv = t => rReal > 0.0005 ? (1 - Math.pow(1 + rReal, -t)) / rReal : t;
    return bedrag * (pv(t2) - pv(t1));
  }

  const seg1Einde = Math.max(lft, spmsLft);
  const seg2Einde = Math.max(spmsLft, aowLft);
  return (
    pvSegment(nettoJr,                              lft,      seg1Einde) +
    pvSegment(Math.max(0, nettoJr - spmsJr),        seg1Einde, seg2Einde) +
    pvSegment(Math.max(0, nettoJr - spmsJr - aowJr), seg2Einde, horizon)
  );
}

export function berekenPensioenCountdown(params, huidigBV, pensioenKapitaal) {
  if (!pensioenKapitaal || pensioenKapitaal <= 0 || !huidigBV) return null;

  const p          = { ...BASE_PARAMS, ...params };
  const birthYear  = p.geboortejaar ?? BIRTH_YEAR;
  const rendement  = p.meanReturn  ?? 0.097;
  const inlegJaar  = (p.inlegJaarlijksBV ?? 60000) + (p.inlegJaarlijksPrive ?? 3000);
  const inlegMaand = inlegJaar / 12;
  const pensioenLft = p.pensioenLeeftijd ?? 55;

  const analytischBijGepland = berekenVereistKapitaalAnalytisch(p, pensioenLft);
  const safetyFactor = analytischBijGepland > 0 ? pensioenKapitaal / analytischBijGepland : 1;

  const now        = new Date();
  const huidigJaar = now.getFullYear();
  const rendMaand  = Math.pow(1 + rendement, 1/12) - 1;

  let bv = huidigBV;
  const maxMaanden = 40 * 12;

  for (let m = 0; m < maxMaanden; m++) {
    const simLeeftijd = huidigJaar + m / 12 - birthYear;
    const vereistNu   = berekenVereistKapitaalAnalytisch(p, simLeeftijd) * safetyFactor;

    if (bv >= vereistNu) {
      const doelDatum = new Date(now);
      doelDatum.setMonth(doelDatum.getMonth() + m);

      const msVerschil  = doelDatum - now;
      const totalDagen  = Math.floor(msVerschil / (1000 * 60 * 60 * 24));
      const jaren       = Math.floor(totalDagen / 365.25);
      const restDagen   = totalDagen - Math.floor(jaren * 365.25);
      const maanden     = Math.floor(restDagen / 30.44);

      const doelLeeftijd        = doelDatum.getFullYear() - birthYear;
      const geplandPensioenjaar = birthYear + pensioenLft;

      return {
        doelDatum,
        doelJaar:   doelDatum.getFullYear(),
        doelMaand:  doelDatum.getMonth() + 1,
        doelLeeftijd,
        jaren,
        maanden,
        dagen:       Math.floor(restDagen - maanden * 30.44),
        totalMaanden: m,
        alBereikt: m === 0,
        verschilMetGepland: doelDatum.getFullYear() - geplandPensioenjaar,
        huidigBV,
        pensioenKapitaal: vereistNu,
      };
    }
    bv = bv * (1 + rendMaand) + inlegMaand;
  }

  return null;
}

// ============================================================
// MSCI World EUR Annual Returns (historische stress-test)
// ============================================================
export const MSCI_WORLD_EUR_ANNUAL = {
  1995: 0.183,  1996: 0.138,  1997: 0.219,  1998: 0.241,
  1999: 0.283,
  2000: -0.132, 2001: -0.165, 2002: -0.318,
  2003: 0.118,  2004: 0.069,  2005: 0.103,  2006: 0.070,
  2007: 0.021,  2008: -0.407,
  2009: 0.263,  2010: 0.202,  2011: -0.027, 2012: 0.140,
  2013: 0.274,  2014: 0.195,  2015: 0.104,  2016: 0.107,
  2017: 0.075,  2018: -0.041,
  2019: 0.277,  2020: 0.159,  2021: 0.235,
  2022: -0.128, 2023: 0.237,  2024: 0.245,  2025: 0.042,
};

export function runHistorischScenario(
  params, start, scenarioStartJaar,
  hist = MSCI_WORLD_EUR_ANNUAL
) {
  const p = {
    ...BASE_PARAMS,
    ...params,
    minReturn: -2.0,
    maxReturn:  5.0,
  };
  const birthYear   = p.geboortejaar ?? BIRTH_YEAR;
  const pensionJaar = birthYear + (p.pensioenLeeftijd ?? 55);
  const simStartJaar = start.jaar;
  const inflatieGem  = p.inflatieGemiddeld ?? 0.025;

  let callIndex = 0;

  const stressRandNorm = (mu) => {
    const yearOffset = Math.floor(callIndex / 2);
    const isReturn   = (callIndex % 2) === 0;
    callIndex++;

    if (!isReturn) return inflatieGem;

    const simJaar = simStartJaar + yearOffset;
    if (simJaar < pensionJaar) return mu;

    const histJaar = scenarioStartJaar + (simJaar - pensionJaar);
    const ret      = hist[histJaar];
    return ret !== undefined ? ret : mu;
  };

  return runSinglePath(p, start, null, stressRandNorm, null);
}
