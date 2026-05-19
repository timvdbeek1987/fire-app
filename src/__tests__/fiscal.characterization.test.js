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
  box3VrhJaar,
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

// ─── G. bruterDividendBox2 — getrapte box 2-brutering ───────────────────────
//
// Nullijn-parameters (fiscalParams.js, belastingjaar 2026):
//   box2Grens      = € 68.843  (fiscalParams.js r.58, geverifieerd)
//                    ×2 = € 137.686 bij fiscaalPartner
//   box2TariefLaag = 24,5%    (fiscalParams.js r.51, geverifieerd) → netto-ratio 0,755
//   box2TariefHoog = 31%      (fiscalParams.js r.65, geverifieerd) → netto-ratio 0,69
//
// Alle handberekeningen in deze describe gebruiken bovenstaande nullijn-waarden
// tenzij een individuele test expliciet afwijkt.

describe('G. Getrapte box 2-brutering (bruterDividendBox2)', () => {

  it('Volledig in lage schijf (nettoNodig < €68.843 × 0.755): bruto = netto / 0.755', () => {
    // Nullijn (zie describe G): box2Grens=68.843 (r.58), tariefLaag=24,5% (r.51); peildatum 2026
    // €50.000 netto, geen fiscaal partner
    // nettoMaxLaag = 68.843 × (1−0,245) = 68.843 × 0,755 = 51.976,47
    // 50.000 < 51.976 → volledig lage schijf
    // bruto = 50.000 / 0,755 = 66.225,17 → afgerond 66.225
    const r = bruterDividendBox2(50000, { ...BASE_PARAMS });
    expect(Math.round(r.bruto)).toBe(66225);
    expect(r.inHoogSchijf).toBe(0);
  });

  it('(ontmaskerend) Split lage/hoge schijf — flat-rate zou €3.497 belasting onderschatten', () => {
    // Nullijn (zie describe G): box2Grens=68.843 (r.58), tariefLaag=24,5% (r.51),
    //   tariefHoog=31% (r.65), fiscaalPartner=false; peildatum 2026
    //
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
    // Nullijn (zie describe G): box2Grens=68.843 (r.58); peildatum 2026
    // Met partner: drempel 2×68843 = 137686 → meer in lage schijf → lagere totaalbelasting
    expect(met.belasting).toBeLessThan(zonder.belasting);
  });

  it('nettoNodig = 0 geeft bruto = 0', () => {
    const r = bruterDividendBox2(0, { ...BASE_PARAMS });
    expect(r.bruto).toBe(0);
    expect(r.belasting).toBe(0);
  });

  // ── 2026-nullijn benchmark (§ G5/G6) ──────────────────────────────────────
  // Nullijn (zie describe G): box2Grens=68.843 (r.58), tariefLaag=24,5% (r.51),
  //   tariefHoog=31% (r.65) — geverifieerd belastingjaar 2026.
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
//
// Nullijn-parameters (fiscalParams.js, belastingjaar 2026):
//   heffingsvrijVermogen          = € 59.357  (fiscalParams.js r.94, geverifieerd)
//                                   ×2 = € 118.714 bij fiscaalPartner
//   box3Tarief                    = 36%        (fiscalParams.js r.87, geverifieerd)
//   box3ForfaitSpaargeld          = 1,28%      (fiscalParams.js r.109, ⚠️ voorlopig 2026)
//   box3ForfaitOverigeBezittingen = 6,0%       (fiscalParams.js r.101, geverifieerd)
//
// Alle handberekeningen in deze describe gebruiken bovenstaande nullijn-waarden
// tenzij een individuele test expliciet afwijkt.
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
    // Nullijn (zie describe H): hvv=59.357 (r.94); peildatum 2026
    // totaal = 30.000 + 25.000 = 55.000 < hvv 59.357 → rendementsgrondslag = 0
    const h = box3Heffing(30000, 25000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(h).toBe(0);
  });

  it('(b1) Puur spaargeld 200K — spaargeld-forfait 1,28%', () => {
    // Nullijn (zie describe H): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //   box3Tarief=36% (r.87); peildatum 2026
    // fictiefRendement = 200.000 × 0,0128 + 0 × 0,060 = 2.560
    // rendementsgrondslag = 200.000 − 59.357 = 140.643
    // grondslagVerhouding = 140.643 / 200.000 = 0,703215
    // belastbaarRendement = 2.560 × 0,703215 = 1.800,23
    // heffing = 1.800,23 × 0,36 = 648
    const h = box3Heffing(200000, 0, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(h)).toBe(648);
  });

  it('(b2) Puur beleggingen 200K — beleggingen-forfait 6,0%: heffing factor 4,69× hoger', () => {
    // Nullijn (zie describe H): hvv=59.357 (r.94), forfaitBeleg=6,0% (r.101),
    //   box3Tarief=36% (r.87); peildatum 2026
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
    // Nullijn (zie describe H): hvv=59.357 (r.94), forfaitBeleg=6,0% (r.101),
    //   box3Tarief=36% (r.87), fiscaalPartner=false; peildatum 2026
    // fictiefRendement = 100.000 × 0,060 = 6.000
    // rendementsgrondslag = 100.000 − 59.357 = 40.643
    // grondslagVerhouding = 40.643 / 100.000 = 0,40643
    // heffing = 6.000 × 0,40643 × 0,36 = 878
    const h = box3Heffing(0, 100000, { ...BASE_PARAMS, fiscaalPartner: false });
    expect(Math.round(h)).toBe(878);
  });

  it('(c2) Mét fiscaal partner — zelfde 100K → heffing 0 (verdubbelde vrijstelling)', () => {
    // Nullijn (zie describe H): hvv=59.357 (r.94), fiscaalPartner=true → hvv×2=118.714; peildatum 2026
    // hvv = 59.357 × 2 = 118.714 > 100.000 → rendementsgrondslag = 0
    const h = box3Heffing(0, 100000, { ...BASE_PARAMS, fiscaalPartner: true });
    expect(h).toBe(0);
  });

  it('(d1) Ontmaskerend geval — 500K bij 60% spaar / 40% beleg, geen partner', () => {
    // Nullijn (zie describe H): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //   forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87), fiscaalPartner=false; peildatum 2026
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
    // Nullijn (zie describe H): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //   forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87), fiscaalPartner=false; peildatum 2026
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
// Samenstelling: latente VPB (getrapt) → latente box 2 (getrapt) →
//                privé netto (box3Heffing + eigenwoningwaarde) → netto besteedbaar.
//
// Nullijn-parameters (fiscalParams.js, belastingjaar 2026):
//   vpbTariefLaag                 = 19%        (fiscalParams.js r.28, geverifieerd)
//   vpbGrens                      = € 200.000   (fiscalParams.js r.35, geverifieerd)
//   vpbTariefHoog                 = 25,8%       (fiscalParams.js r.42, geverifieerd)
//   box2TariefLaag                = 24,5%       (fiscalParams.js r.51, geverifieerd)
//   box2Grens                     = € 68.843    (fiscalParams.js r.58, geverifieerd)
//   box2TariefHoog                = 31%         (fiscalParams.js r.65, geverifieerd)
//   heffingsvrijVermogen          = € 59.357    (fiscalParams.js r.94, geverifieerd)
//   box3Tarief                    = 36%         (fiscalParams.js r.87, geverifieerd)
//   box3ForfaitSpaargeld          = 1,28%       (fiscalParams.js r.109, ⚠️ voorlopig 2026)
//   box3ForfaitOverigeBezittingen = 6,0%        (fiscalParams.js r.101, geverifieerd)
//
// Alle handberekeningen in deze describe gebruiken bovenstaande nullijn-waarden
// tenzij een individuele test expliciet afwijkt.
//
// Auditlog handberekeningen:
//   Test (a): eerste versie correct — alle assertions onafhankelijk berekend, geen aanpassing nodig.
//   Test (b): zonderVpb-assertie post-hoc gecorrigeerd. Oorspronkelijke waarde (533.327) was fout
//   omdat de handberekening bvNaVpb=481K leende van test (a) (ongerealiseerdeWinstBV=100K),
//   terwijl zonderVpb ongerealiseerdeWinstBV=0 heeft → bvNaVpb=500K → andere box2-grondslag.
//   Fout zat in Stap 2 van de zonderVpb-berekening: verkeerd tussentgetal box2InHoog
//   (412.157 i.p.v. correct 431.157). Correctie gerechtvaardigd: functie-output (546.437)
//   volgt onafhankelijk uit de invoer; zie uitgeschreven berekening hieronder.

describe('I. berekenNettoBesteedbaar — §5.2-waterfall (2026-params)', () => {

  const WATERFALL_P = { ...BASE_PARAMS, fiscaalPartner: false };

  it('(a) Volledige handberekening: BV=500K, winst=100K (genegeerd), privéBeleg=200K, geen woning', () => {
    // Nullijn (zie describe I): vpbGrens=200K (r.35), vpbTariefLaag=19% (r.28),
    //   box2Grens=68.843 (r.58), tariefLaag=24,5% (r.51), tariefHoog=31% (r.65),
    //   hvv=59.357 (r.94), forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87); peildatum 2026
    //
    // Invoer (alle 7 velden expliciet):
    //   bvBruto=500.000, ongerealiseerdeWinstBV=100.000 (GENEGEERD — zie stap 1),
    //   priveSpaar=0, priveBeleg=200.000, wozWaarde=0, hypotheekRestschuld=0, fiscaalPartner=false
    //
    // Stap 1 — latente VPB:
    //   methode = 'actuele_waarde' (BASE_PARAMS default) → latenteVpb = 0.
    //   Herkomst nullijn: rendement jaarlijks al belast in opbouwfase (data.js r.568–570).
    //   Er bouwt geen latente VPB-claim op bij liquidatie.
    //   bvNaVpb = 500.000 − 0 = 500.000
    //   BUGFIX dubbele heffing: oud (aankoopwaarde) was latenteVpb=19.000, bvNaVpb=481.000
    //
    // Stap 2 — latente box 2 (op bvNaVpb=500.000, was 481.000):
    //   box2Grens=68.843 (geen partner); 500.000 > 68.843 → split
    //   box2InLaag = 68.843
    //   box2InHoog = 500.000 − 68.843 = 431.157  (oud: 412.157)
    //   68.843 × 0,245 = 16.866,535
    //   431.157 × 0,31 = 133.658,670              (oud: 127.768,670)
    //   latenteBox2    = 150.525,205 → 150.525     (oud: 144.635)
    //
    // Stap 3 — VRH (ongewijzigd, box3Heffing(0, 200.000, p)):
    //   fictiefRendement    = 0×0,0128 + 200.000×0,060 = 12.000
    //   rendementsGrondslag = 200.000 − 59.357 = 140.643
    //   grondslagVerhouding = 140.643 / 200.000 = 0,703215
    //   belastbaarRendement = 12.000 × 0,703215 = 8.438,58
    //   vrh = 8.438,58 × 0,36 = 3.037,8888 → 3.038
    //
    // Stap 4 — privé netto (eigenWoning NIET opgeteld, ongewijzigd):
    //   priveNetto = 200.000 − 3.037,8888 = 196.962,1112 → 196.962
    //   eigenWoningNetto = max(0, 0−0) = 0 → nietLiquideVermogen = 0
    //
    // Stap 5 — netto besteedbaar (bewijs dat hero-getal = (bvBruto − latenteBox2) + priveNetto):
    //   500.000 − 150.525,205 + 196.962,111 = 546.436,906 → 546.437
    //   Oud (aankoopwaarde): 533.327.
    //   Delta +13.110: dubbele VPB-heffing verwijderd,
    //     weggevallen latente VPB €19.000 (=100K×19%) − extra box 2 €5.890 (=19K×31%) = €13.110 netto
    const result = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 100000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: WATERFALL_P,
    });
    expect(result.latenteVpb).toBe(0);                        // actuele_waarde: al jaarlijks afgerekend
    expect(Math.round(result.bvNaVpb)).toBe(500000);          // oud: 481000
    expect(Math.round(result.latenteBox2)).toBe(150525);      // oud: 144635 (+5.890 door hogere box2-grondslag)
    expect(Math.round(result.vrh)).toBe(3038);                 // ongewijzigd
    expect(Math.round(result.nietLiquideVermogen)).toBe(0);
    expect(Math.round(result.priveNetto)).toBe(196962);        // ongewijzigd
    expect(Math.round(result.nettoBesteedbaar)).toBe(546437);  // oud: 533327  (+13.110 netto: +19K VPB − 5.890 extra box2)
    // Bewijs dat hero-getal = (bvBruto − latenteBox2) + priveNetto (geen VPB-term meer):
    expect(Math.round(result.nettoBesteedbaar)).toBe(
      Math.round(result.bvBruto - result.latenteBox2 + result.priveNetto)
    );
  });

  it('(b) Ontmaskerend bugfix dubbele heffing: groot ongerealiseerde-koerswinst profiel', () => {
    // BUGFIX: onder actuele_waarde is ongerealiseerdeWinstBV irrelevant voor de VPB-berekening.
    // Het rendement is jaarlijks al belast in de opbouwfase (data.js r.568–570).
    // Profiel met €400K ongerealiseerde winst wordt NIET langer dubbel belast bij liquidatie.
    //
    // Beide gevallen: bvBruto=500.000, priveSpaar=0, priveBeleg=200.000,
    //                 wozWaarde=0, hypotheekRestschuld=0, fiscaalPartner=false
    // Enige verschil: ongerealiseerdeWinstBV=400.000 (metWinst) vs. 0 (zonderWinst).
    //
    // Nullijn (zie describe I): peildatum 2026, vpbAfrekenmethode='actuele_waarde' (BASE_PARAMS)
    //
    // ── Onder actuele_waarde: ──────────────────────────────────────────────────
    // Beide gevallen: latenteVpb = 0 (ongerealiseerdeWinstBV genegeerd)
    //   bvNaVpb    = 500.000
    //   latenteBox2 = 68.843×24,5% + 431.157×31% = 16.866,535 + 133.658,670 = 150.525,205
    //   priveNetto  = 196.962 (ongewijzigd — zie test a)
    //   nettoBesteedbaar = 500.000 − 150.525,205 + 196.962,111 = 546.436,906 → 546.437
    //
    // ── Oud (aankoopwaarde, buggy) voor het geval met 400K winst: ─────────────
    //   inLaag     = 200.000 × 19%  = 38.000
    //   inHoog     = 200.000 × 25,8% = 51.600
    //   latenteVpb = 89.600
    //   bvNaVpb    = 410.400
    //   latenteBox2 = 68.843×24,5% + 341.557×31% = 16.866,535 + 105.882,670 = 122.749,205
    //   nettoBesteedbaar = 410.400 − 122.749,205 + 196.962,111 = 484.612,906 → 484.613
    //
    // Delta voor 400K-geval: 546.437 − 484.613 = +61.824.
    //   Dubbele VPB-heffing verwijderd,
    //   weggevallen latente VPB €89.600 (=200K×19%+200K×25,8%) − extra box 2 €27.776 (=89.600×31%) = €61.824 netto
    const metWinst = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 400000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: WATERFALL_P,
    });
    const zonderWinst = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 0,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: WATERFALL_P,
    });
    // Onder actuele_waarde: ongerealiseerdeWinstBV is irrelevant — beide paden identiek
    expect(metWinst.latenteVpb).toBe(0);                                  // oud: 89.600
    expect(Math.round(metWinst.nettoBesteedbaar)).toBe(546437);           // oud: 484.613 (+61.824: +89.600 VPB − 27.776 extra box2)
    expect(zonderWinst.latenteVpb).toBe(0);
    expect(Math.round(zonderWinst.nettoBesteedbaar)).toBe(546437);        // slider irrelevant: zelfde uitkomst
    // Slider maakt geen verschil meer: delta = 0
    const delta = Math.round(zonderWinst.nettoBesteedbaar) - Math.round(metWinst.nettoBesteedbaar);
    expect(delta).toBe(0);

    // ── Bewijs dat schakelaar het juiste pad kiest ───────────────────────────
    // Onder 'aankoopwaarde' moet de getrapte VPB-berekening wél worden betreden.
    // Handberekening (nullijn vpbGrens=200K (r.35), tariefLaag=19% (r.28), tariefHoog=25,8% (r.42)):
    //   inLaag = min(400.000, 200.000) = 200.000 → 200.000 × 0,19 = 38.000
    //   inHoog = max(0, 400.000−200.000) = 200.000 → 200.000 × 0,258 = 51.600
    //   latenteVpb = 89.600  (getrapte tak is nu WEL betreden)
    //   bvNaVpb = 500.000 − 89.600 = 410.400
    //   latenteBox2 = 16.866,535 + 341.557×31% = 16.866,535 + 105.882,670 = 122.749,205
    //   nettoBesteedbaar = 410.400 − 122.749,205 + 196.962,111 = 484.612,906 → 484.613
    const metAankoopwaarde = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 400000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 0, hypotheekRestschuld: 0,
      p: { ...WATERFALL_P, vpbAfrekenmethode: 'aankoopwaarde' },
    });
    expect(Math.round(metAankoopwaarde.latenteVpb)).toBe(89600);     // getrapte tak betreden
    expect(Math.round(metAankoopwaarde.nettoBesteedbaar)).toBe(484613); // zelfde als oud buggy gedrag
  });

  it('(c) Eigen woning apart als nietLiquideVermogen — niet in hero-getal', () => {
    // Karakterisatie-delta (eerdere fix): nettoBesteedbaar was 783.327 → 533.327 (−250.000).
    // Oorzaak: spec-fout §5.2 gecorrigeerd — eigenWoningNetto telde mee in nettoBesteedbaar.
    // eigenWoningNetto is nu een apart veld `nietLiquideVermogen` in het resultaatobject.
    //
    // BUGFIX dubbele heffing (deze fix): nettoBesteedbaar 533.327 → 546.437.
    //   Delta +13.110: dubbele VPB-heffing verwijderd,
    //   weggevallen latente VPB €19.000 (=100K×19%) − extra box 2 €5.890 (=19K×31%) = €13.110 netto
    //
    // Nullijn (zie describe I): vpbGrens=200K (r.35), vpbTariefLaag=19% (r.28),
    //   box2Grens=68.843 (r.58), tariefLaag=24,5% (r.51), tariefHoog=31% (r.65),
    //   hvv=59.357 (r.94), forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87); peildatum 2026
    //
    // Invoer: bvBruto=500.000, ongerealiseerdeWinstBV=100.000 (GENEGEERD), priveSpaar=0,
    //         priveBeleg=200.000, wozWaarde=400.000, hypotheekRestschuld=150.000
    //
    // Stap 1 — latente VPB: actuele_waarde → latenteVpb=0, bvNaVpb=500.000 (oud: 481.000)
    // Stap 2 — latente box 2: identiek aan test (a) nieuw → latenteBox2=150.525 (oud: 144.635)
    // Stap 3 — VRH: identiek aan test (a) → vrh=3.038
    // Stap 4 — privé netto: 200.000 − 3.037,889 = 196.962 (ongewijzigd)
    // Stap 5 — netto besteedbaar:
    //   500.000 − 150.525,205 + 196.962,111 = 546.436,906 → 546.437  (oud: 533.327)
    //   Sanity-check: eigenWoning heeft nog steeds geen invloed op het hero-getal.
    // Apart: max(0, 400.000 − 150.000) = 250.000 → `nietLiquideVermogen` (ongewijzigd)
    const result = berekenNettoBesteedbaar({
      bvBruto: 500000, ongerealiseerdeWinstBV: 100000,
      priveSpaar: 0, priveBeleg: 200000,
      wozWaarde: 400000, hypotheekRestschuld: 150000,
      p: WATERFALL_P,
    });
    // Hero-getal: eigenWoning niet opgeteld
    expect(Math.round(result.priveNetto)).toBe(196962);            // ongewijzigd
    expect(Math.round(result.nettoBesteedbaar)).toBe(546437);      // oud: 533.327 (+13.110 bugfix)
    // Niet-liquide vermogen: apart, correct berekend
    expect(Math.round(result.nietLiquideVermogen)).toBe(250000);   // ongewijzigd
  });

});

// ─── J. box3VrhJaar — 2028-schakelaar werkelijk-rendementstelsel ─────────────
//
// Staande regel volledig van kracht: handberekening opgenomen per testgeval.
//
// Nullijn-parameters (fiscalParams.js, belastingjaar 2026):
//   heffingsvrijVermogen          = € 59.357  (fiscalParams.js r.94, geverifieerd)
//   box3Tarief                    = 36%        (fiscalParams.js r.87, geverifieerd)
//   box3ForfaitSpaargeld          = 1,28%      (fiscalParams.js r.109, ⚠️ voorlopig 2026)
//   box3ForfaitOverigeBezittingen = 6,0%       (fiscalParams.js r.101, geverifieerd)
//
// Auditlog handberekeningen (per direct voor review):
//   Initiële berekeningen gebruikten hvv=57.000 (uit geheugen, niet geciteerd) →
//   verkeerde asserties (2360/2059/5148). Fout gevonden via testrun.
//   Correcte waarde: heffingsvrijVermogen=59.357 (fiscalParams.js r.94).
//   Alle asserties gecorrigeerd; error gedocumenteerd in commit-message per staande regel.
//   Aanscherping staande regel (deze commit): elke handberekening citeert voortaan
//   expliciet de nullijn-parameterherkomst — nooit uit geheugen gereproduceerde getallen.
//
// Gedeelde invoer voor alle J-tests:
//   spaargeld   = 60.000
//   beleggingen = 140.000   → totaal = 200.000
//   fiscaalPartner = false  → hvv = 59.357 (fiscalParams.js r.94) — geen verdubbeling
//   grondslag   = max(0, 200.000 − 59.357) = 140.643
//   grondslagVerhouding = 140.643 / 200.000 = 0,703215
//   box3Tarief  = 0,36 (fiscalParams.js r.87)
//
// Forfait-pad (< 2028 of schakelaar=0) — BD-systematiek (zie describe H):
//   fictiefSpaar     = 60.000 × 0,0128  = 768,000     [forfaitSpaar r.109]
//   fictiefBeleg     = 140.000 × 0,060  = 8.400,000   [forfaitBeleg r.101]
//   fictiefRendement = 9.168,000
//   grondslagV.      = 140.643 / 200.000 = 0,703215
//   VRH              = 9.168 × 0,703215 × 0,36 = 2.320,506 → 2.321
//
// Werkelijk-rendement-pad (schakelaar=x%, jaar ≥ 2028):
//   werkelijkRendement = totaal × x%
//   VRH = werkelijkRendement × grondslagVerhouding × tarief
//       = (200.000 × x%) × 0,703215 × 0,36 (tarief r.87)
//
//   Bij x=4%:  VRH = 8.000 × 0,703215 × 0,36 = 5.625,72 × 0,36 = 2.025,259 → 2.025
//   Bij x=10%: VRH = 20.000 × 0,703215 × 0,36 = 14.064,3 × 0,36 = 5.063,148 → 5.063
//
// Ontmaskerend (test d): bij x=10% is VRH in 2028 meer dan dubbel van forfait (5.063 vs 2.321);
//   in 2027 is het identiek aan forfait — jaargrensbewaking wordt direct zichtbaar.
//
describe('J. box3VrhJaar — 2028-schakelaar werkelijk-rendementstelsel', () => {
  // Basis params (nullijn): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
  //   forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87); peildatum 2026
  const J_P = { ...BASE_PARAMS, box3WerkelijkRendement2028: 0 };

  it('(a) jaar=2027, schakelaar=4% → forfait (< 2028)', () => {
    // Nullijn (zie describe J): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //   forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87); peildatum 2026
    // Ongeacht de schakelaarwaarde: jaar 2027 < 2028 → delegeer altijd naar box3Heffing.
    // Handberekening forfait (zie describe J header): VRH = 9.168 × 0,703215 × 0,36 = 2.320,506 → 2.321
    const p = { ...J_P, box3WerkelijkRendement2028: 0.04 };
    expect(Math.round(box3VrhJaar(60000, 140000, 2027, p))).toBe(2321);
  });

  it('(b) jaar=2028, schakelaar=0% → forfait (schakelaar uit)', () => {
    // Nullijn (zie describe J): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //   forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87); peildatum 2026
    // schakelaar=0 (default): jaar ≥ 2028 maar werkelijkPct=0 → delegeer naar box3Heffing.
    // Handberekening forfait (zie describe J header): VRH = 9.168 × 0,703215 × 0,36 = 2.320,506 → 2.321
    const p = { ...J_P, box3WerkelijkRendement2028: 0 };
    expect(Math.round(box3VrhJaar(60000, 140000, 2028, p))).toBe(2321);
  });

  it('(c) jaar=2028, schakelaar=4% → werkelijk rendement', () => {
    // jaar=2028 ≥ 2028 én werkelijkPct=0,04 > 0 → werkelijk-rendementstelsel.
    // Handberekening:
    //   Nullijn: hvv=59.357 (fiscalParams.js r.94), box3Tarief=36% (r.87); peildatum 2026
    //   totaal              = 60.000 + 140.000 = 200.000
    //   hvv                 = 59.357 (fiscalParams.js r.94, fiscaalPartner=false)
    //   grondslag           = 200.000 − 59.357 = 140.643
    //   grondslagVerhouding = 140.643 / 200.000 = 0,703215
    //   werkelijkRendement  = 200.000 × 0,04   = 8.000
    //   VRH                 = 8.000 × 0,703215 × 0,36 = 5.625,72 × 0,36 = 2.025,259 → 2.025
    const p = { ...J_P, box3WerkelijkRendement2028: 0.04 };
    expect(Math.round(box3VrhJaar(60000, 140000, 2028, p))).toBe(2025);
  });

  it('(d) ontmaskerend: x=10% — jaargrens 2027/2028 precies zichtbaar', () => {
    // Nullijn (zie describe J): hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //   forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87); peildatum 2026
    // Hoog werkelijk rendement (10%) maakt het verschil voor vs na 2028 maximaal zichtbaar.
    //
    // jaar=2027 (forfait): VRH = 9.168 × 0,703215 × 0,36 = 2.320,506 → 2.321
    // jaar=2028 (werkelijk 10%):
    //   werkelijkRendement = 200.000 × 0,10 = 20.000
    //   VRH = 20.000 × 0,703215 × 0,36 = 14.064,3 × 0,36 = 5.063,148 → 5.063
    //
    // Verschil = 5.063 − 2.321 = 2.742 (> 118% meer dan forfait bij 10%)
    // Toont aan: de jaargrens 2027→2028 is exact, en de schakelaar heeft materieel effect.
    const p = { ...J_P, box3WerkelijkRendement2028: 0.10 };
    expect(Math.round(box3VrhJaar(60000, 140000, 2027, p))).toBe(2321);
    expect(Math.round(box3VrhJaar(60000, 140000, 2028, p))).toBe(5063);
  });
});

// ─── L. fiscaalPartner-toggle — box 2-drempel en VRH doorwerking ─────────────
//
// Bewijst dat fiscaalPartner: true (Wet IB art. 5a) aantoonbaar doorwerkt tot in
// berekenNettoBesteedbaar via twee afzonderlijke paden:
//   1. box 2-drempel: grens = box2Grens × 2 → minder in hoge schijf → lagere latenteBox2
//   2. VRH: hvv = heffingsvrijVermogen × 2 → grotere grondslag vrijgesteld → lagere vrh
//
// Tevens bevestigd dat dit NIET afhangt van partnerActief (die flag beïnvloedt de MC-
// projectie, niet de §5.2-waterfall). Het pad Instellingen-toggle → params.fiscaalPartner
// → berekenNettoBesteedbaar → hero-getal is hiermee volledig gedekt.
//
// Nullijn (belastingjaar 2026, fiscalParams.js):
//   vpbTariefLaag:                19%    (r.28)
//   vpbGrens:                     200.000 (r.35)
//   vpbTariefHoog:                25,8%  (r.42)
//   box2TariefLaag:               24,5%  (r.51)
//   box2Grens:                    68.843 (r.58)   ← enkelvoud; ×2 bij fiscaalPartner
//   box2TariefHoog:               31%    (r.65)
//   heffingsvrijVermogen:         59.357 (r.94)   ← enkelvoud; ×2 bij fiscaalPartner
//   box3Tarief:                   36%    (r.87)
//   box3ForfaitSpaargeld:         1,28%  (r.109, ⚠️ voorlopig)
//   box3ForfaitOverigeBezittingen: 6,0%  (r.101)
//
// Profiel: DGA-FullStack-2026 (identiek aan describe K)
//   bvBruto = 1.500.000, ongerealiseerdeWinstBV = 500.000
//   priveSpaar = 120.000, priveBeleg = 480.000
//   wozWaarde = 750.000, hypotheekRestschuld = 250.000

const L_P = {
  ...BASE_PARAMS,
  vpbTariefLaag:                 0.19,
  vpbGrens:                      200000,
  vpbTariefHoog:                 0.258,
  box2TariefLaag:                0.245,
  box2Grens:                     68843,
  box2TariefHoog:                0.31,
  box3Tarief:                    0.36,
  heffingsvrijVermogen:          59357,
  box3ForfaitSpaargeld:          0.0128,
  box3ForfaitOverigeBezittingen: 0.06,
  // fiscaalPartner wordt per test overschreven
};

describe('L. fiscaalPartner-toggle — box 2-drempel en VRH doorwerking (2026-params)', () => {

  it('(a) fiscaalPartner=false — enkelvoudige drempel, basishandberekening', () => {
    // Nullijn (zie describe L):
    //   box2Grens = 68.843 (r.58), hvv = 59.357 (r.94)
    //
    // BUGFIX dubbele heffing: actuele_waarde → latenteVpb = 0 (was: 115.400)
    //
    // Stap 1 VPB: methode='actuele_waarde' → latenteVpb = 0
    //   bvNaVpb = 1.500.000 − 0 = 1.500.000  (oud: 1.384.600)
    // Stap 2 box2 (grens = 68.843, op bvNaVpb=1.500.000, was 1.384.600):
    //   box2InHoog = 1.500.000 − 68.843 = 1.431.157  (oud: 1.315.757)
    //   latenteBox2 = 68.843×24,5% + 1.431.157×31% = 16.866,535 + 443.658,670 = 460.525,205
    //   (oud: 424.751)
    // Stap 3 VRH (ongewijzigd, hvv = 59.357):
    //   fictiefRendement = 120.000×1,28% + 480.000×6,0% = 1.536 + 28.800 = 30.336
    //   VRH = 30.336 × (540.643/600.000) × 36% = 9.841 (niet gerond tussenstap)
    // Stap 4 nettoBesteedbaar:
    //   bvNetto  = 1.500.000 − 460.525,205 = 1.039.474,795
    //   priveNetto = 600.000 − vrh_exact = 590.159 (ongewijzigd)
    //   nettoBesteedbaar = 1.039.474,795 + 590.159 = 1.629.634
    //   Oud (aankoopwaarde): 1.550.008.
    //   Delta +79.626: dubbele VPB-heffing verwijderd,
    //   weggevallen latente VPB €115.400 (200K×19%+300K×25,8%) − extra box 2 €35.774 (=115.400×31%) = €79.626 netto
    const p = { ...L_P, fiscaalPartner: false };
    const r = berekenNettoBesteedbaar({
      bvBruto: 1500000, ongerealiseerdeWinstBV: 500000,
      priveSpaar: 120000, priveBeleg: 480000,
      wozWaarde: 750000, hypotheekRestschuld: 250000,
      p,
    });
    expect(Math.round(r.nettoBesteedbaar)).toBe(1629634);  // oud: 1550008  (+79.626: +115.400 VPB − 35.774 extra box2)
    // Intermediaire waarden bevestigen pad via beide functies:
    expect(Math.round(r.latenteBox2)).toBe(460525);        // oud: 424751 (+35.774 = 115.400×31%)
    expect(Math.round(r.vrh)).toBe(9841);                  // VRH-pad ongewijzigd
  });

  it('(b) fiscaalPartner=true — verdubbelde drempel', () => {
    // Nullijn (zie describe L):
    //   box2Grens = 2 × 68.843 = 137.686, hvv = 2 × 59.357 = 118.714
    //
    // BUGFIX dubbele heffing: actuele_waarde → latenteVpb = 0 (was: 115.400)
    //   bvNaVpb = 1.500.000 (oud: 1.384.600)
    //
    // Stap 2 box2 (grens = 137.686, op bvNaVpb=1.500.000, was 1.384.600):
    //   box2InHoog = 1.500.000 − 137.686 = 1.362.314  (oud: 1.246.914)
    //   latenteBox2 = 137.686×24,5% + 1.362.314×31% = 33.733,070 + 422.317,340 = 456.050,410
    //   (oud: 420.276)
    // Stap 3 VRH (hvv = 118.714, ongewijzigd):
    //   VRH = 30.336 × (481.286/600.000) × 36% = 8.760 (niet gerond tussenstap)
    // Stap 4:
    //   bvNetto  = 1.500.000 − 456.050,410 = 1.043.949,590
    //   priveNetto = 600.000 − 8.760  = 591.240 (ongewijzigd)
    //   nettoBesteedbaar = 1.043.949,590 + 591.240 = 1.635.189
    //   Oud (aankoopwaarde): 1.555.563.
    //   Delta +79.626: dubbele VPB-heffing verwijderd,
    //   weggevallen latente VPB €115.400 (200K×19%+300K×25,8%) − extra box 2 €35.774 (=115.400×31%) = €79.626 netto
    const p = { ...L_P, fiscaalPartner: true };
    const r = berekenNettoBesteedbaar({
      bvBruto: 1500000, ongerealiseerdeWinstBV: 500000,
      priveSpaar: 120000, priveBeleg: 480000,
      wozWaarde: 750000, hypotheekRestschuld: 250000,
      p,
    });
    expect(Math.round(r.nettoBesteedbaar)).toBe(1635189);  // oud: 1555563  (+79.626: +115.400 VPB − 35.774 extra box2)
    expect(Math.round(r.latenteBox2)).toBe(456050);        // oud: 420276 (+35.774 = 115.400×31%)
    expect(Math.round(r.vrh)).toBe(8760);                  // VRH-pad ongewijzigd
  });

  it('(c) ontmaskerend: toggle maakt aantoonbaar verschil — niet nul', () => {
    // Volledige berekening met onafgeronde tussenwaarden (JavaScript float64):
    //
    // STAP 1 — onafgeronde componentwaarden (uitvoer Node.js, exact, onder actuele_waarde):
    //   bvNaVpb_beide = 1.500.000 (actuele_waarde: latenteVpb=0)
    //   box2_nop = 68843×0,245 + 1431157×0,31  = 460525,20499999996
    //   box2_met = 137686×0,245 + 1362314×0,31 = 456050,40999999996
    //   vrh_nop  = 30336 × (540643/600000) × 0,36  = 9840,5676288    (ongewijzigd)
    //   vrh_met  = 30336 × (481286/600000) × 0,36  = 8760,1752576    (ongewijzigd)
    //
    // STAP 2 — onafgeronde delta's en hun afronding:
    //   box2Δ = 460525,205 − 456050,410 = 4474,795  → Math.round = 4475  (ongewijzigd!)
    //   vrhΔ  =   9840,568 −  8760,175  = 1080,392  → Math.round = 1080  (ongewijzigd!)
    //   som Δ = 4474,795 + 1080,392     = 5555,188  → Math.round = 5555 ✓
    //
    // STAP 3 — onafgeronde totalen en afronding (absolute waarden stijgen door bugfix, delta ongewijzigd):
    //   netto_nop = (1500000 − 460525,205) + (600000 − 9840,568) = 1629634,227  (oud: 1550008,227)
    //   netto_met = (1500000 − 456050,410) + (600000 − 8760,175) = 1635189,415  (oud: 1555563,415)
    //   Math.round(netto_met) − Math.round(netto_nop) = 1635189 − 1629634 = 5555 ✓
    //
    // CONCLUSIE (a) — functie correct; oorspronkelijke assertie gebruikte foutieve methode:
    //
    //   FOUT:   Math.round(vrh_nop) − Math.round(vrh_met) = 9841 − 8760 = 1081
    //   JUIST:  Math.round(vrh_nop − vrh_met)             = Math.round(1080,392) = 1080
    //
    //   Oorzaak: apart-afronden-dan-aftrekken ≠ aftrekken-dan-afronden wanneer de twee
    //            fracties aan weerszijden van 0,5 vallen:
    //              vrh_nop fractie 0,568 > 0,5 → rondt omhoog naar 9841
    //              vrh_met fractie 0,175 < 0,5 → rondt omlaag naar 8760
    //            Foutieve methode: round(9840,568) − round(8760,175) = 9841 − 8760 = 1081
    //            Correcte methode: round(9840,568 − 8760,175)        = round(1080,392) = 1080
    //
    // Correcte assertiemethode: Math.round(onafgerond Δ) per component, dan optellen.
    // 4475 + 1080 = 5555 = totaalverschil — algebraïsch sluitend.
    // Een echte toggle-regressie (fiscaalPartner niet doorgewerkt) maakt verschil = 0.

    const pNop  = { ...L_P, fiscaalPartner: false };
    const pMet  = { ...L_P, fiscaalPartner: true };
    const invoer = {
      bvBruto: 1500000, ongerealiseerdeWinstBV: 500000,
      priveSpaar: 120000, priveBeleg: 480000,
      wozWaarde: 750000, hypotheekRestschuld: 250000,
    };
    const rNop = berekenNettoBesteedbaar({ ...invoer, p: pNop });
    const rMet = berekenNettoBesteedbaar({ ...invoer, p: pMet });

    const verschil = Math.round(rMet.nettoBesteedbaar) - Math.round(rNop.nettoBesteedbaar);
    expect(verschil).toBe(5555);         // totale toggle-impact
    expect(verschil).toBeGreaterThan(0); // richting: partner → hogere vrijstelling → hoger hero-getal

    // Component-splitsing: Math.round(Δ) — NIET Math.round(a) − Math.round(b)
    const box2Δ = Math.round(rNop.latenteBox2 - rMet.latenteBox2); // Math.round(4474,795) = 4475
    const vrhΔ  = Math.round(rNop.vrh         - rMet.vrh);         // Math.round(1080,392) = 1080
    expect(box2Δ).toBe(4475);
    expect(vrhΔ).toBe(1080);
    expect(box2Δ + vrhΔ).toBe(verschil); // 4475 + 1080 = 5555 — algebraïsch sluitend
  });
});
