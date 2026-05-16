/**
 * Karakterisatietests — Fase 0
 *
 * Doel: huidig gedrag vastleggen VOOR de refactor naar configureerbare fiscale constanten.
 * Na de refactor moeten deze tests identieke output geven.
 *
 * Geen mocks — echte functies worden aangeroepen.
 * Verwachte waarden zijn snapshots van de huidige implementatie (peildatum 2026).
 */

import { describe, it, expect } from 'vitest';
import {
  runMonteCarlo,
  berekenVereistKapitaalAnalytisch,
  berekenMaandelijksOnttrektbaar,
  bruterDividendBox2,
  box3Heffing,
  BASE_PARAMS,
} from '../data.js';

// ─── Gedeelde test-params ────────────────────────────────────────────────────

/** DGA geboren 1970, pensioenleeftijd 55 — op pensioendag in 2025 */
const DGA_BASE = {
  ...BASE_PARAMS,
  geboortejaar:           1970,
  pensioenLeeftijd:       55,
  nettoInkomenDoel:       90000,
  inlegJaarlijksBV:       0,
  inlegJaarlijksPrive:    0,
  verplichtDGAsalaris:    20000,
  dividendbelasting:      0.245,
  vennootschapsbelasting: 0.19,
  inkomstenbelasting:     0.43,
};

const START_PENSIOEN_1M  = { bv: 1_000_000, prive: 0, jaar: 2025, maand: 1 };
const START_PENSIOEN_500K = { bv:   500_000, prive: 0, jaar: 2025, maand: 1 };
const START_PENSIOEN_3M  = { bv: 3_000_000, prive: 0, jaar: 2025, maand: 1 };

// ─── A. VPB-berekening rond de tariefbreuk ──────────────────────────────────

describe('A. VPB-berekening rond de tariefbreuk', () => {

  it('BV=500K — winst onder €200K-breuk: VPB ≈ 9037', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_500K, 1);
    const rij = mc.medianPath?.[0];
    expect(rij).toBeDefined();
    // Winst (rendBV - brutoDGA) < 200K => enkel laag tarief 19%
    expect(rij.vpbBedrag).toBe(9037);
  });

  it('BV=1M — winst onder €200K-breuk: VPB ≈ 28671', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_1M, 1);
    const rij = mc.medianPath?.[0];
    expect(rij).toBeDefined();
    expect(rij.vpbBedrag).toBe(28671);
  });

  it('BV=3M — winst boven €200K-breuk: VPB ≈ 127525 (gecombineerd laag + hoog tarief)', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_3M, 1);
    const rij = mc.medianPath?.[0];
    expect(rij).toBeDefined();
    // Winst > 200K => 200K × 19% + (winst-200K) × 25.8%
    expect(rij.vpbBedrag).toBe(127525);
  });

  it('BV=500K — bvP50 na eerste jaar klopt met VPB-aftrek', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_500K, 1);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 411009 → 405482
    expect(mc.years[0].bvP50).toBe(405482);
  });

  it('BV=1M — bvP50 na eerste jaar klopt met VPB-aftrek', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_1M, 1);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 995575 → 990129
    expect(mc.years[0].bvP50).toBe(990129);
  });

  it('BV=3M — bvP50 na eerste jaar klopt met VPB-aftrek', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_3M, 1);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 3292644 → 3287181
    expect(mc.years[0].bvP50).toBe(3287181);
  });

});

// ─── B. Dividend-bruttering ─────────────────────────────────────────────────

describe('B. Dividend-bruttering (indirect via nettoInkomenEngine)', () => {

  it('DGA op pensioenleeftijd: nettoInkomenEngine ≈ 106074 (na dividend-bruttering)', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_1M, 1);
    const rij = mc.medianPath?.[0];
    expect(rij).toBeDefined();
    // nettoInkomenEngine = nettoDGA + nettoDividend + ontPv + inkSPMS + inkAOW
    expect(rij.nettoInkomenEngine).toBe(106074);
  });

  it('DGA op pensioenleeftijd: brutoDividend is positief en divBelBedrag klopt', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_1M, 1);
    const rij = mc.medianPath?.[0];
    expect(rij.brutoDividend).toBeGreaterThan(0);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843).
    // divBelBedrag = divResult.belasting (getrapte berekening via bruterDividendBox2). Delta: 32365 → 36476
    expect(rij.divBelBedrag).toBe(36476);
  });

  it('DGA: ibBedrag = brutoDGA × inkomstenbelasting (43%)', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_1M, 1);
    const rij = mc.medianPath?.[0];
    expect(rij.ibBedrag).toBe(Math.round(rij.brutoDGA * 0.43));
  });

});

// ─── C. VRH / Box 3 ─────────────────────────────────────────────────────────

describe('C. VRH / Box 3 (privé-gebruiker)', () => {

  const PRIVE_PARAMS = {
    ...BASE_PARAMS,
    geboortejaar:           1970,
    pensioenLeeftijd:       55,
    nettoInkomenDoel:       90000,
    inlegJaarlijksBV:       0,
    inlegJaarlijksPrive:    0,
    verplichtDGAsalaris:    0,
    dividendbelasting:      0,
    vennootschapsbelasting: 0,
    inkomstenbelasting:     0,
    priveModus:             true,
    // vermogensrendementsheffing: 0.02088 — override irrelevant na 1c-i:
    // engine gebruikt box3Heffing(priveSpaar, priveBeleg, p) met heffingsvrijvermogen uit BASE_PARAMS
  };

  it('Privé prive=500K: priveP50 na eerste jaar = 402538 (box3Heffing met heffingsvrijvermogen)', () => {
    // UPDATE 1c-i: box3Heffing vervangt prive × vermogensrendementsheffing × frac.
    // box3Heffing(0, 500000, p): grondslag = 500000 − 59357 = 440643; forfait 6% × tarief 36% = 9518/j.
    // Oud (flat 2.088%): 500000 × 0.02088 = 10440/j → 922 méér VRH/j → lagere balans.
    // Nieuw: minder VRH door vrijstelling → priveP50 hoger. Delta: 401692 → 402538 (+846)
    const startPrive = { bv: 0, prive: 500_000, jaar: 2025, maand: 1 };
    const mc = runMonteCarlo(PRIVE_PARAMS, startPrive, 1);
    expect(mc.years[0].priveP50).toBe(402538);
  });

});

// ─── D. runMonteCarlo deterministisch ───────────────────────────────────────

describe('D. runMonteCarlo deterministisch (zelfde seed bij zelfde params)', () => {

  const PARAMS_D = { ...BASE_PARAMS, geboortejaar: 1975 };
  const START_D  = { bv: 800_000, prive: 100_000, jaar: 2026, maand: 6 };

  it('Twee runs met zelfde params geven identiek kansSucces', () => {
    const run1 = runMonteCarlo(PARAMS_D, START_D, 2500);
    const run2 = runMonteCarlo(PARAMS_D, START_D, 2500);
    expect(run1.kansSucces).toBe(run2.kansSucces);
  });

  it('Twee runs met zelfde params geven identiek bvP50 op leeftijd 60', () => {
    const run1 = runMonteCarlo(PARAMS_D, START_D, 2500);
    const run2 = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60_1 = run1.years.find(r => r.leeftijd === 60);
    const r60_2 = run2.years.find(r => r.leeftijd === 60);
    expect(r60_1?.bvP50).toBe(r60_2?.bvP50);
  });

  it('kansSucces is 100 voor robuust scenario', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    expect(run.kansSucces).toBe(100);
  });

  it('bvP50 op leeftijd 60 = 441259 (snapshot)', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60 = run.years.find(r => r.leeftijd === 60);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 471801 → 430892
    // UPDATE box3 params: VRH 2.088% → 2.160% (6,0% forfait × 36% tarief, beide definitief 2026). Delta: 430892 → 430281 (−611)
    // UPDATE 1c-i: box3Heffing met heffingsvrijvermogen. START_D heeft prive=100K; grondslag=40643 (ipv 100K).
    //   VRH oud (flat): 100K × 2.16% = 2160/j; nieuw: 40643 × 6% × 36% = 878/j → 1282/j minder → privé groeit sneller.
    //   Delta: 430281 → 441259 (+10978). BV onveranderd — bvP50 = BV-component van totaal.
    expect(r60?.bvP50).toBe(441259);
  });

  it('totaalP50 op leeftijd 60 = 554636 (snapshot)', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60 = run.years.find(r => r.leeftijd === 60);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 579497 → 538807
    // UPDATE box3 params: VRH 2.088% → 2.160% (6,0% forfait × 36% tarief, beide definitief 2026). Delta: 538807 → 537695 (−1112)
    // UPDATE 1c-i: box3Heffing met heffingsvrijvermogen — privé-component groeit harder. Delta: 537695 → 554636 (+16941)
    expect(r60?.totaalP50).toBe(554636);
  });

});

// ─── E. berekenVereistKapitaalAnalytisch ────────────────────────────────────

describe('E. berekenVereistKapitaalAnalytisch', () => {

  it('Bij pensioenleeftijd 55: vereist kapitaal ≈ 1096187', () => {
    const k = berekenVereistKapitaalAnalytisch(BASE_PARAMS, 55);
    expect(Math.round(k)).toBe(1096187);
  });

  it('Bij leeftijd 60: vereist kapitaal ≈ 792959 (minder jaren te overbruggen)', () => {
    const k = berekenVereistKapitaalAnalytisch(BASE_PARAMS, 60);
    expect(Math.round(k)).toBe(792959);
  });

  it('Vereist kapitaal daalt naarmate leeftijd stijgt', () => {
    const k55 = berekenVereistKapitaalAnalytisch(BASE_PARAMS, 55);
    const k65 = berekenVereistKapitaalAnalytisch(BASE_PARAMS, 65);
    const k75 = berekenVereistKapitaalAnalytisch(BASE_PARAMS, 75);
    expect(k55).toBeGreaterThan(k65);
    expect(k65).toBeGreaterThan(k75);
  });

});

// ─── F. berekenMaandelijksOnttrektbaar ──────────────────────────────────────

describe('F. berekenMaandelijksOnttrektbaar', () => {

  it('Portfolio 1M, 10 jaar tot pensioen: maandelijks onttrektbaar = 2305', () => {
    // UPDATE box3 params: VRH 2.088% → 2.160%. Delta: 2274 → 2248 (−26)
    // UPDATE 1c-i: box3Heffing past heffingsvrijvermogen toe op startportfolio (beleggingen-dominant).
    //   portfolioReeel ≈ 820K (na inflatie); effectief tarief = (820K-59357)×6%×36% / 820K ≈ 2.01%.
    //   Lager tarief → hogere netto-rente → meer onttrektbaar. Delta: 2248 → 2305 (+57)
    const mnd = berekenMaandelijksOnttrektbaar(BASE_PARAMS, 1_000_000, 10);
    expect(mnd).toBe(2305);
  });

  it('Portfolio 500K, 5 jaar tot pensioen: maandelijks onttrektbaar = 1299', () => {
    // UPDATE box3 params: VRH 2.088% → 2.160%. Delta: 1255 → 1241 (−14)
    // UPDATE 1c-i: box3Heffing past heffingsvrijvermogen toe op startportfolio (beleggingen-dominant).
    //   portfolioReeel ≈ 453K; effectief tarief = (453K-59357)×6%×36% / 453K ≈ 1.87%.
    //   Delta: 1241 → 1299 (+58)
    const mnd = berekenMaandelijksOnttrektbaar(BASE_PARAMS, 500_000, 5);
    expect(mnd).toBe(1299);
  });

  it('Grotere portfolio geeft hogere maandelijkse onttrekking', () => {
    const mnd1 = berekenMaandelijksOnttrektbaar(BASE_PARAMS, 500_000, 10);
    const mnd2 = berekenMaandelijksOnttrektbaar(BASE_PARAMS, 1_000_000, 10);
    expect(mnd2).toBeGreaterThan(mnd1);
  });

  it('Portfolio 0 geeft 0 terug', () => {
    expect(berekenMaandelijksOnttrektbaar(BASE_PARAMS, 0, 10)).toBe(0);
  });

});

// ─── G. Getrapte box 2-brutering (bruterDividendBox2) ───────────────────────

describe('G. Getrapte box 2-brutering (bruterDividendBox2)', () => {

  it('Volledig in lage schijf (nettoNodig < €68.843 × 0.755): bruto = netto / 0.755', () => {
    // €50.000 netto, geen fiscaal partner
    // Laag schijf max netto: 68843 × (1-0.245) = 51.975,65
    // €50.000 < €51.975 → volledig laag schijf
    // Verwacht bruto: 50000 / 0.755 = 66.225,17 → afgerond
    const r = bruterDividendBox2(50000, { ...BASE_PARAMS });
    expect(Math.round(r.bruto)).toBe(66225);
    expect(r.inHoogSchijf).toBe(0);
  });

  it('Deels hoge schijf (nettoNodig > €51.975): split over twee schijven', () => {
    // €80.000 netto, geen fiscaal partner
    // Lage schijf: 68843 bruto → 68843 × 0.755 = 51.975,47 netto
    // Rest: 80000 - 51975 = 28025 netto via hoge schijf → 28025 / 0.69 = 40.615 bruto
    // Totaal bruto ≈ 68843 + 40615 = 109.458
    const r = bruterDividendBox2(80000, { ...BASE_PARAMS });
    expect(Math.round(r.bruto)).toBeGreaterThan(109000);
    expect(r.inHoogSchijf).toBeGreaterThan(0);
    // Belasting = bruto - netto
    expect(Math.round(r.belasting)).toBe(Math.round(r.bruto) - 80000);
  });

  it('Drempel verdubbelt bij fiscaal partner', () => {
    const zonder = bruterDividendBox2(100000, { ...BASE_PARAMS, fiscaalPartner: false });
    const met    = bruterDividendBox2(100000, { ...BASE_PARAMS, fiscaalPartner: true  });
    // Met partner: drempel 2×68843 = 137686 → meer in lage schijf → lagere totaalbelasting
    expect(met.belasting).toBeLessThan(zonder.belasting);
  });

  it('nettoNodig = 0 geeft bruto = 0', () => {
    const r = bruterDividendBox2(0, { ...BASE_PARAMS });
    expect(r.bruto).toBe(0);
    expect(r.belasting).toBe(0);
  });

  // ── 2026-nullijn benchmark (§ G5/G6) ──────────────────────────────────────
  // Gebaseerd op geverifieerde params: box2Grens=68.843, tariefLaag=24,5%, tariefHoog=31%.
  // Eerdere benchmark (€107.022 / €29.622) was berekend met grens=67.000 + tariefHoog=33%
  // — een parametercombinatie die nooit in de codebase heeft gezeten; vervalt.
  //
  // Gecorrigeerde bugomvang voor dit profiel (netto €77.400/j, geen partner):
  //   Nieuwe belasting (tiered)   : €28.289
  //   Oude belasting (flat 24,5%) : €25.117  (= bruto €102.517 × 24,5%)
  //   Onderschatting onder oud stelsel: €28.289 − €25.117 = €3.172/jaar
  //   (Eerder genoemde €4.505 was met verouderde 67k/33%-params en vervalt.)

  it('2026-benchmark — netto €77.400 geen partner: bruto=105.689, belasting=28.289 (split schijven)', () => {
    // behoefteNaDGA in een comfort-DGA-profiel (nettoInkomenDoel=90k, DGAsalaris=20k na IB=43%):
    //   nettoDGA = 20000 × 0.57 = 11400
    //   behoefteNaDGA ≈ 90000 - 11400 - 1200 (ontPv) = ~77400
    // Lage schijf max netto: 68843 × 0.755 = 51.976  →  77.400 > 51.976 → split
    // brutoLaag = 68.843; brutoHoog = (77400 - 51976) / 0.69 = 36.846
    // bruto = 105.689; belasting = 28.289
    const r = bruterDividendBox2(77400, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(r.bruto)).toBe(105689);
    expect(Math.round(r.belasting)).toBe(28289);
    expect(Math.round(r.inLaagSchijf)).toBe(68843);
    expect(Math.round(r.inHoogSchijf)).toBe(36846);
  });

  it('2026-benchmark — netto €77.400 MÉT fiscaal partner: bruto=102.517, belasting=25.117 (volledig lage schijf)', () => {
    // grens met partner = 68843 × 2 = 137.686
    // nettoMaxLaag = 137.686 × 0.755 = 103.953  →  77.400 < 103.953 → volledig lage schijf
    // bruto = 77400 / 0.755 = 102.517; belasting = bruto × 0.245 = 25.117
    const r = bruterDividendBox2(77400, { ...BASE_PARAMS, fiscaalPartner: true });
    expect(Math.round(r.bruto)).toBe(102517);
    expect(Math.round(r.belasting)).toBe(25117);
    expect(r.inHoogSchijf).toBe(0);
    // Belasting is exact bruto × 24,5% (volledig lage schijf)
    expect(Math.round(r.belasting)).toBe(Math.round(r.bruto * 0.245));
  });

});

// ─── H. box3Heffing (1c-i, structuur gecorrigeerd) ──────────────────────────
// Belastingdienst-systematiek: fictiefRendement (op vol vermogen) → grondslagverhouding → × tarief.
// Geverifieerde 2026-params: hvv=59.357, box3Tarief=36%, forfaitSpaar=1,28%, forfaitBeleg=6,0%.
// Alle voorbeelden zijn met de hand narekenbaar en direct verificeerbaar.
//
// Structuurwijziging t.o.v. eerste 1c-i-commit: "forfait-middeling" (gewogenForfait × grondslag)
// vervangen door de BD-stappen. Mathematisch equivalent (float-verschil < 1e-12).
// Karakterisatiedelta's ongewijzigd — zie annotaties bij tests C/D/F.

describe('H. box3Heffing — BD-systematiek met heffingsvrijvermogen (2026-params)', () => {

  it('(a) Vermogen onder vrijstelling → heffing 0', () => {
    // totaal = 30.000 + 25.000 = 55.000 < hvv 59.357 → rendementsgrondslag = 0
    const h = box3Heffing(30000, 25000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(h).toBe(0);
  });

  it('(b1) Puur spaargeld 200K — spaargeld-forfait 1,28%', () => {
    // fictiefRendement = 200.000 × 0,0128 + 0 × 0,060 = 2.560
    // rendementsgrondslag = 200.000 − 59.357 = 140.643
    // grondslagVerhouding = 140.643 / 200.000 = 0,703215
    // belastbaarRendement = 2.560 × 0,703215 = 1.800,23
    // heffing = 1.800,23 × 0,36 = 648
    const h = box3Heffing(200000, 0, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(h)).toBe(648);
  });

  it('(b2) Puur beleggingen 200K — beleggingen-forfait 6,0%: heffing factor 4,69× hoger', () => {
    // fictiefRendement = 0 × 0,0128 + 200.000 × 0,060 = 12.000
    // rendementsgrondslag = 140.643; grondslagVerhouding = 0,703215
    // belastbaarRendement = 12.000 × 0,703215 = 8.438,58
    // heffing = 8.438,58 × 0,36 = 3.038
    // Verhouding 3038/648 = 4,69 = forfait-verhouding 6,0%/1,28%
    const hSpaar = box3Heffing(200000, 0,      { ...BASE_PARAMS, fiscaalPartner: false });
    const hBeleg = box3Heffing(0,      200000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(hBeleg)).toBe(3038);
    expect(hBeleg).toBeGreaterThan(hSpaar);
  });

  it('(c1) Zonder fiscaal partner — beleggingen 100K → heffing 878', () => {
    // fictiefRendement = 100.000 × 0,060 = 6.000
    // rendementsgrondslag = 100.000 − 59.357 = 40.643
    // grondslagVerhouding = 40.643 / 100.000 = 0,40643
    // heffing = 6.000 × 0,40643 × 0,36 = 878
    const h = box3Heffing(0, 100000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(h)).toBe(878);
  });

  it('(c2) Mét fiscaal partner — zelfde 100K → heffing 0 (verdubbelde vrijstelling)', () => {
    // hvv = 59.357 × 2 = 118.714 > 100.000 → rendementsgrondslag = 0
    const h = box3Heffing(0, 100000, { ...BASE_PARAMS, fiscaalPartner: true });
    expect(h).toBe(0);
  });

  it('(d1) Ontmaskerend geval — 500K bij 60% spaar / 40% beleg, geen partner', () => {
    // spaargeld=300.000, beleggingen=200.000; totaal=500.000
    //
    // Stap 1 — fictiefRendement op vol vermogen:
    //   300.000 × 0,0128 + 200.000 × 0,060 = 3.840 + 12.000 = 15.840
    //
    // Stap 2 — rendementsgrondslag:
    //   500.000 − 59.357 = 440.643
    //
    // Stap 3 — grondslagVerhouding:
    //   440.643 / 500.000 = 0,881286
    //
    // Stap 4 — belastbaarRendement:
    //   15.840 × 0,881286 = 13.959,57
    //
    // Stap 5 — heffing:
    //   13.959,57 × 0,36 = 5.025
    //
    // Naïeve fout (hvv alleen van spaargeld aftrekken):
    //   (300K-59357)×0,0128×0,36 + 200K×0,06×0,36 = 1.109 + 4.320 = 5.429 ← FOUT
    const h = box3Heffing(300000, 200000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(h)).toBe(5025);
  });

  it('(d2) Handmatig narekenbaar — 500K (10% spaar, 90% beleg), geen partner', () => {
    // spaargeld=50.000, beleggingen=450.000; totaal=500.000
    // fictiefRendement = 50.000×0,0128 + 450.000×0,060 = 640 + 27.000 = 27.640
    // rendementsgrondslag = 440.643; grondslagVerhouding = 0,881286
    // belastbaarRendement = 27.640 × 0,881286 = 24.358,74
    // heffing = 24.358,74 × 0,36 = 8.769
    const h = box3Heffing(50000, 450000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(h)).toBe(8769);
  });

});
