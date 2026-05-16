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
    vermogensrendementsheffing: 0.02088,
  };

  it('Privé prive=500K: priveP50 na eerste jaar = 401692 (VRH verwerkt)', () => {
    const startPrive = { bv: 0, prive: 500_000, jaar: 2025, maand: 1 };
    const mc = runMonteCarlo(PRIVE_PARAMS, startPrive, 1);
    expect(mc.years[0].priveP50).toBe(401692);
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

  it('bvP50 op leeftijd 60 = 430892 (snapshot)', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60 = run.years.find(r => r.leeftijd === 60);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 471801 → 430892
    expect(r60?.bvP50).toBe(430892);
  });

  it('totaalP50 op leeftijd 60 = 538807 (snapshot)', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60 = run.years.find(r => r.leeftijd === 60);
    // BUGFIX 1b: box 2 was flat 24.5%, nu tiered (24.5%/31% met drempel €68.843). Delta: 579497 → 538807
    expect(r60?.totaalP50).toBe(538807);
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

  it('Portfolio 1M, 10 jaar tot pensioen: maandelijks onttrektbaar = 2274', () => {
    const mnd = berekenMaandelijksOnttrektbaar(BASE_PARAMS, 1_000_000, 10);
    expect(mnd).toBe(2274);
  });

  it('Portfolio 500K, 5 jaar tot pensioen: maandelijks onttrektbaar = 1255', () => {
    const mnd = berekenMaandelijksOnttrektbaar(BASE_PARAMS, 500_000, 5);
    expect(mnd).toBe(1255);
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

});
