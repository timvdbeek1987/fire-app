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
    expect(mc.years[0].bvP50).toBe(411009);
  });

  it('BV=1M — bvP50 na eerste jaar klopt met VPB-aftrek', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_1M, 1);
    expect(mc.years[0].bvP50).toBe(995575);
  });

  it('BV=3M — bvP50 na eerste jaar klopt met VPB-aftrek', () => {
    const mc = runMonteCarlo(DGA_BASE, START_PENSIOEN_3M, 1);
    expect(mc.years[0].bvP50).toBe(3292644);
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
    // divBelBedrag = brutoDividend × dividendbelasting (24.5%)
    expect(rij.divBelBedrag).toBe(Math.round(rij.brutoDividend * 0.245));
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

  it('bvP50 op leeftijd 60 = 471801 (snapshot)', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60 = run.years.find(r => r.leeftijd === 60);
    expect(r60?.bvP50).toBe(471801);
  });

  it('totaalP50 op leeftijd 60 = 579497 (snapshot)', () => {
    const run = runMonteCarlo(PARAMS_D, START_D, 2500);
    const r60 = run.years.find(r => r.leeftijd === 60);
    expect(r60?.totaalP50).toBe(579497);
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
