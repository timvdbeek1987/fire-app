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
  berekenNettoBesteedbaar,
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
    // nettoMaxLaag = 68.843 × (1−0,245) = 68.843 × 0,755 = 51.976,47
    // 50.000 < 51.976 → volledig lage schijf
    // bruto = 50.000 / 0,755 = 66.225,17 → afgerond 66.225
    const r = bruterDividendBox2(50000, { ...BASE_PARAMS });
    expect(Math.round(r.bruto)).toBe(66225);
    expect(r.inHoogSchijf).toBe(0);
  });

  it('(ontmaskerend) Split lage/hoge schijf — flat-rate zou €3.497 belasting onderschatten', () => {
    // Meest waarschijnlijke fout: flat-rate (netto / 0,755) voor elk bedrag.
    //   Flat-rate (FOUT): 80.000 / 0,755 = 105.960 bruto, belasting = 25.960
    //
    // Correcte tiered berekening — €80.000 netto, geen fiscaal partner:
    //   nettoMaxLaag = 68.843 × (1−0,245) = 68.843 × 0,755 = 51.976,47
    //   80.000 > 51.976 → split noodzakelijk
    //   brutoLaag    = 68.843
    //   nettoLaag    = 51.976,47
    //   brutoHoog    = (80.000 − 51.976,47) / (1−0,31) = 28.023,53 / 0,69 = 40.613,82
    //   bruto        = 68.843 + 40.613,82 = 109.456,82 → 109.457
    //   belasting    = 109.456,82 − 80.000 = 29.456,82 → 29.457
    //   inHoogSchijf = 40.613,82 → 40.614
    const r = bruterDividendBox2(80000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(r.bruto)).toBe(109457);
    expect(Math.round(r.belasting)).toBe(29457);
    expect(r.inLaagSchijf).toBe(68843);
    expect(Math.round(r.inHoogSchijf)).toBe(40614);
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
// Algebraïsche equivalentie middeling ↔ BD-systematiek (hergroepering):
//
//   Middeling (eerste 1c-i-commit):
//     gewogenForfait  = (spaar×fS + beleg×fB) / totaal
//     heffing         = gewogenForfait × grondslag × tarief
//                     = [(spaar×fS + beleg×fB) / totaal] × grondslag × tarief
//
//   BD-systematiek (huidige code):
//     fictiefR        = spaar×fS + beleg×fB
//     grondslagV      = grondslag / totaal
//     heffing         = fictiefR × grondslagV × tarief
//                     = (spaar×fS + beleg×fB) × (grondslag / totaal) × tarief
//                     = [(spaar×fS + beleg×fB) / totaal] × grondslag × tarief   ← identiek
//
//   Gelijk door hergroepering van vermenigvuldiging — geen gedragswijziging.
//   Karakterisatiedelta's ongewijzigd — zie annotaties bij tests C/D/F.

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
    //   13.959,57 × 0,36 = 5.025,44 → afgerond 5.025
    //
    // Naïeve fout — proportioneel-per-categorie (hvv volledig op spaargeld geboekt, nooit in productie):
    //   Per-categorie: spaarGrondslag=300K−59.357=240.643; belegGrondslag=200K (geen aftrek) — FOUT
    //   (240.643×0,0128 + 200.000×0,060) × 0,36 = (3.080 + 12.000) × 0,36 = 5.429 ← FOUT (+€404 te veel)
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

// ─── I. berekenNettoBesteedbaar (1c-ii, §5.2-waterfall) ─────────────────────
// Samenstelling: latente VPB (getrapt 19%/25,8%) → latente box 2 (getrapt 24,5%/31%) →
//                privé netto (box3Heffing + eigenwoningwaarde) → netto besteedbaar.
// Geverifieerde 2026-params uit BASE_PARAMS (vpbGrens=200K, box2Grens=68.843, hvv=59.357).

describe('I. berekenNettoBesteedbaar — §5.2-waterfall (2026-params)', () => {

  const WATERFALL_P = { ...BASE_PARAMS, fiscaalPartner: false };

  it('(a) Volledige handberekening: BV=500K, winst=100K, privéBeleg=200K, geen woning', () => {
    // Invoer: bvBruto=500.000, ongerealiseerdeWinstBV=100.000,
    //         priveSpaar=0, priveBeleg=200.000, wozWaarde=0, hypotheekRestschuld=0
    //
    // Stap 1 — latente VPB:
    //   100.000 ≤ vpbGrens (200.000) → volledig laag tarief 19%
    //   latenteVpb = 100.000 × 0,19 = 19.000
    //   bvNaVpb = 500.000 − 19.000 = 481.000
    //
    // Stap 2 — latente box 2 (bruto BV na VPB):
    //   box2Grens = 68.843 (geen partner); 481.000 > 68.843 → split
    //   box2InLaag = 68.843; box2InHoog = 481.000 − 68.843 = 412.157
    //   latenteBox2 = 68.843×0,245 + 412.157×0,31
    //              = 16.866,54 + 127.768,67 = 144.635,21 → 144.635
    //
    // Stap 3 — VRH (box3Heffing(0, 200.000, p)):
    //   fictiefR = 200.000×0,060 = 12.000
    //   grondslag = 200.000−59.357 = 140.643; grondslagV = 0,703215
    //   vrh = 12.000×0,703215×0,36 = 3.037,89 → 3.038
    //
    // Stap 4 — privé netto:
    //   priveVermogen = 200.000; eigenWoningNetto = 0
    //   priveNetto = 200.000 − 3.037,89 + 0 = 196.962,11 → 196.962
    //
    // Stap 5 — netto besteedbaar:
    //   481.000 − 144.635,21 + 196.962,11 = 533.326,91 → 533.327
    const result = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 100000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: WATERFALL_P,
    });
    expect(Math.round(result.latenteVpb)).toBe(19000);
    expect(Math.round(result.bvNaVpb)).toBe(481000);
    expect(Math.round(result.latenteBox2)).toBe(144635);
    expect(Math.round(result.vrh)).toBe(3038);
    expect(Math.round(result.eigenWoningNetto)).toBe(0);
    expect(Math.round(result.priveNetto)).toBe(196962);
    expect(Math.round(result.nettoBesteedbaar)).toBe(533327);
  });

  it('(b) Ontmaskerend — hoge koerswinst: VPB-aanname maakt €61.824 verschil', () => {
    // Meest waarschijnlijke fout: stilzwijgend ongerealiseerdeWinstBV=0 (stille nul) →
    // hero-getal overschat; gebruiker denkt dat hij rijker is dan hij netto is.
    //
    // Met VPB-aanname (ongerealiseerdeWinstBV=400K):
    //   inLaag=200K×19%=38.000; inHoog=200K×25,8%=51.600 → latenteVpb=89.600
    //   bvNaVpb=500.000−89.600=410.400
    //   box2InHoog=410.400−68.843=341.557; latenteBox2=16.867+341.557×0,31=122.749
    //   netto = 410.400 − 122.749 + 196.962 = 484.613
    //
    // Zonder VPB-aanname (ongerealiseerdeWinstBV=0):
    //   latenteVpb=0; bvNaVpb=500.000 (vol bruto → hogere box 2 grondslag)
    //   box2InHoog=500.000−68.843=431.157; latenteBox2=16.867+431.157×0,31=150.525
    //   netto = 500.000 − 150.525 + 196.962 = 546.437
    //
    // delta = 546.437 − 484.613 = 61.824 — effect is groter dan alleen de VPB,
    // omdat hogere bvNaVpb ook meer box 2 genereert.
    const metVpb = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 400000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: WATERFALL_P,
    });
    const zonderVpb = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 0,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: WATERFALL_P,
    });
    // Getrapt VPB: 200K×19% + 200K×25,8% = 89.600
    expect(Math.round(metVpb.latenteVpb)).toBe(89600);
    expect(Math.round(metVpb.nettoBesteedbaar)).toBe(484613);
    // Stille nul → latenteVpb=0 maar ook hogere box 2 grondslag
    expect(zonderVpb.latenteVpb).toBe(0);
    expect(Math.round(zonderVpb.nettoBesteedbaar)).toBe(546437);
    // Materieel verschil: VPB+box2-effect samen
    const delta = Math.round(zonderVpb.nettoBesteedbaar) - Math.round(metVpb.nettoBesteedbaar);
    expect(delta).toBe(61824);
  });

  it('(c) Eigen woning telt mee in privé netto', () => {
    // wozWaarde=400.000, hypotheek=150.000 → eigenWoningNetto=250.000
    // priveNetto = 200.000 − 3.038 + 250.000 = 446.962
    // netto = 481.000 − 144.635 + 446.962 = 783.327  (= test a + 250.000)
    const result = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 100000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 400000, hypotheekRestschuld: 150000,
      p: WATERFALL_P,
    });
    expect(Math.round(result.eigenWoningNetto)).toBe(250000);
    expect(Math.round(result.nettoBesteedbaar)).toBe(783327);
  });

});
