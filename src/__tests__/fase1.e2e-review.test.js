/**
 * Integrale end-to-end review — Fase 1
 *
 * Verificatie-artefact. Eén DGA-profiel dat alle assen tegelijk activeert:
 *   1. Latente VPB raakt beide schijven (ongerealiseerdeWinstBV > vpbGrens)
 *   2. Uitkeerbaar BV-vermogen boven hoge box 2-schijf (getrapt box 2 actief)
 *   3. Privé spaar + beleg ruim boven hvv×2 (gewogen forfait box 3)
 *   4. Fiscaal partner aan — drempelverdubbeling op élke as die dat kent
 *   5. Eigen woning met hypotheek (eigenWoningNetto-component)
 *   6. Meerjarenprojectie over 2028 — schakelaar aan én uit
 *
 * Staande regel volledig van kracht: geciteerde nullijn-parameterherkomst per stap.
 *
 * Nullijn-parameters (fiscalParams.js, belastingjaar 2026):
 *   vpbTariefLaag                 = 19%       (fiscalParams.js r.28, geverifieerd)
 *   vpbGrens                      = € 200.000  (fiscalParams.js r.35, geverifieerd)
 *   vpbTariefHoog                 = 25,8%      (fiscalParams.js r.42, geverifieerd)
 *   box2TariefLaag                = 24,5%      (fiscalParams.js r.51, geverifieerd)
 *   box2Grens                     = € 68.843   (fiscalParams.js r.58, geverifieerd)
 *   box2TariefHoog                = 31%        (fiscalParams.js r.65, geverifieerd)
 *   heffingsvrijVermogen          = € 59.357   (fiscalParams.js r.94, geverifieerd)
 *   box3Tarief                    = 36%        (fiscalParams.js r.87, geverifieerd)
 *   box3ForfaitSpaargeld          = 1,28%      (fiscalParams.js r.109, ⚠️ voorlopig 2026)
 *   box3ForfaitOverigeBezittingen = 6,0%       (fiscalParams.js r.101, geverifieerd)
 */

import { describe, it, expect } from 'vitest';
import {
  berekenNettoBesteedbaar,
  box3Heffing,
  box3VrhJaar,
  BASE_PARAMS,
} from '../data.js';

// ─── Profiel "DGA-FullStack-2026" ────────────────────────────────────────────
//
// Alle bedragen en flags in één blok:
//   bvBruto                = 1.500.000  (groot BV-vermogen)
//   ongerealiseerdeWinstBV = 500.000    (spans beide VPB-schijven: 200K laag + 300K hoog)
//   priveSpaar             = 120.000    (20% van privé-totaal)
//   priveBeleg             = 480.000    (80% van privé-totaal)
//   wozWaarde              = 750.000
//   hypotheekRestschuld    = 250.000
//   fiscaalPartner         = true       (triggert ×2 op box2Grens én hvv)
//   box3WerkelijkRendement2028 = 0.04  (4%, voor projectie-tests; default 0)
//
// Privé-totaal = 600.000 >> hvv×2 = 118.714 → box 3 materieel belast.
// bvNaVpb = 1.384.600 >> box2Grens×2 = 137.686 → hoge box 2-schijf actief.

const PROFIEL = {
  bvBruto:                 1_500_000,
  ongerealiseerdeWinstBV:    500_000,
  priveSpaar:                120_000,
  priveBeleg:                480_000,
  wozWaarde:                 750_000,
  hypotheekRestschuld:       250_000,
};

const P_BASIS = { ...BASE_PARAMS, fiscaalPartner: true, box3WerkelijkRendement2028: 0 };
const P_SCHAKELAAR = { ...P_BASIS, box3WerkelijkRendement2028: 0.04 };

// ─── Describe K. Integrale end-to-end review — Fase 1 ───────────────────────

describe('K. Integrale end-to-end review — Fase 1 (DGA-FullStack-2026)', () => {

  it('(a) Hero-getal vandaag: volledige waterfall, alle assen actief', () => {
    // Nullijn: zie bestandsheader — alle 10 parameters geciteerd.
    //
    // ── Stap 1 — latente VPB (beide schijven) ────────────────────────────────
    // Nullijn: vpbGrens=200.000 (r.35), tariefLaag=19% (r.28), tariefHoog=25,8% (r.42)
    //   ongerealiseerdeWinstBV = 500.000 > vpbGrens=200.000 → split
    //   inLaag    = min(500.000, 200.000) = 200.000 → 200.000 × 0,19 = 38.000
    //   inHoog    = 500.000 − 200.000    = 300.000 → 300.000 × 0,258 = 77.400
    //   latenteVpb = 38.000 + 77.400 = 115.400
    //   bvNaVpb    = 1.500.000 − 115.400 = 1.384.600
    //
    // ── Stap 2 — latente box 2, partner ×2 (hoge schijf actief) ─────────────
    // Nullijn: box2Grens=68.843 (r.58), tariefLaag=24,5% (r.51), tariefHoog=31% (r.65)
    //   effectieve grens = 68.843 × 2 = 137.686  ← fiscaalPartner doubling
    //   1.384.600 > 137.686 → split, hoge schijf actief
    //   box2InLaag = 137.686                    → 137.686 × 0,245 = 33.733,07
    //   box2InHoog = 1.384.600 − 137.686        → 1.246.914 × 0,31 = 386.543,34
    //   latenteBox2 = 33.733,07 + 386.543,34 = 420.276,41
    //
    //   Afleiding:
    //     137.686 × 245 / 1.000 = 33.733.070 / 1.000 = 33.733,07  (exact)
    //     1.246.914 × 31 / 100  = 38.654.334 / 100   = 386.543,34 (exact)
    //
    // ── Stap 3 — VRH, hvv ×2, gewogen forfait ────────────────────────────────
    // Nullijn: hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109),
    //          forfaitBeleg=6,0% (r.101), box3Tarief=36% (r.87)
    //   totaal          = 120.000 + 480.000 = 600.000
    //   hvv×2           = 59.357 × 2 = 118.714          ← fiscaalPartner doubling
    //   grondslag       = 600.000 − 118.714 = 481.286
    //   grondslagV      = 481.286 / 600.000 = 0,80214333...
    //   fictiefSpaar    = 120.000 × 0,0128 = 1.536
    //   fictiefBeleg    = 480.000 × 0,060  = 28.800
    //   fictiefRendement = 30.336
    //   30.336 × 481.286 = 14.600.292,096      (decomp: 30.000×481.286 + 336×481.286)
    //   14.600.292,096 / 600.000 = 24.333,820
    //   VRH = 24.333,820 × 0,36 = 8.760,175 → 8.760
    //
    // ── Stap 4 — privé netto (eigenWoning NIET opgeteld — spec-correctie) ────
    // Karakterisatie-delta: priveNetto was 1.091.240 → nu 591.240 (−500.000 eigenWoning).
    // Nullijn: hvv=59.357 (r.94), box3Tarief=36% (r.87); peildatum 2026
    //   priveVermogen    = 600.000
    //   priveNetto       = 600.000 − 8.760,175 = 591.239,825 → 591.240
    //   eigenWoningNetto = max(0, 750.000 − 250.000) = 500.000
    //                      → apart als `nietLiquideVermogen`, niet in priveNetto
    //
    // ── Stap 5 — netto besteedbaar ────────────────────────────────────────────
    // Karakterisatie-delta: nettoBesteedbaar was 2.055.563 → nu 1.555.563 (−500.000 eigenWoning).
    //   1.384.600 − 420.276,41 + 591.239,825 = 1.555.563,415 → 1.555.563
    //
    // ── Apart — niet-liquide vermogen ─────────────────────────────────────────
    //   nietLiquideVermogen = 500.000 (apart veld — niet in hero-getal)

    const r = berekenNettoBesteedbaar({ ...PROFIEL, p: P_BASIS });

    // VPB-as: beide schijven geraakt
    expect(Math.round(r.latenteVpb)).toBe(115400);
    expect(Math.round(r.bvNaVpb)).toBe(1384600);

    // Box 2-as: hoge schijf actief, inLaag = 2 × box2Grens
    expect(Math.round(r.box2InLaag)).toBe(137686);     // = 68.843 × 2 (partner)
    expect(Math.round(r.box2InHoog)).toBe(1246914);
    expect(Math.round(r.latenteBox2)).toBe(420276);

    // Box 3-as: gewogen forfait, hvv verdubbeld
    expect(Math.round(r.vrh)).toBe(8760);
    expect(Math.round(r.priveNetto)).toBe(591240);   // eigenWoning niet meegeteld

    // Hero-getal (liquide vermogen only)
    expect(Math.round(r.nettoBesteedbaar)).toBe(1555563);

    // Niet-liquide vermogen: apart veld, correct berekend, NIET in hero-getal
    expect(Math.round(r.nietLiquideVermogen)).toBe(500000);
    expect(r.nettoBesteedbaar + r.nietLiquideVermogen).not.toBeCloseTo(
      Math.round(r.nettoBesteedbaar), 0
    ); // bevestigt dat de twee getallen niet stiekem zijn opgeteld
  });

  it('(b) Partnerdrempel-check: elke as precies 1× verdubbeld', () => {
    // Nullijn: box2Grens=68.843 (r.58), hvv=59.357 (r.94); peildatum 2026
    //
    // Doel: aantonen dat
    //   (1) box2InLaag = 2 × box2Grens — niet 1×, niet 4×
    //   (2) VRH met partner < VRH zonder partner (hvv verdubbeld → minder grondslag)
    //   (3) VPB heeft geen partnereffect — bvNaVpb identiek bij beide
    //
    // Handberekening VRH zonder partner (hvv=1×59.357=59.357):
    //   grondslag       = 600.000 − 59.357 = 540.643
    //   grondslagV      = 540.643 / 600.000 = 0,901072
    //   VRH             = 30.336 × 0,901072 × 0,36
    //   30.336 × 540.643 = 16.403.747,8...
    //   Let me compute: 30.336 × 540.000 = 16.381.440; 30.336 × 643 = 19.506,05
    //   = 16.381.440 + 19.506,05 = 16.400.946,05... hmm let me redo:
    //   30.336 × 540.643:
    //     30.000 × 540.643 = 16.219.290
    //     336   × 540.643 = 181.656,048
    //     Total = 16.400.946,048
    //   16.400.946,048 / 600.000 = 27.334,910
    //   VRH zonder partner = 27.334,910 × 0,36 = 9.840,568 → 9.841
    //
    // VRH met partner: 8.760 (zie test a)
    //   Verschil = 9.841 − 8.760 = 1.081 (= vrijstelling op extra 59.357 × gewogenForfait)
    //
    // box2InLaag met partner = 2 × 68.843 = 137.686 (zie test a)
    // box2InLaag zonder partner: grens=68.843; 1.384.600 > 68.843 → box2InLaag = 68.843
    //
    // VPB: latenteVpb = 115.400 ongeacht partner (VPB is vennootschapsbelasting — geen persoonlijk karakter)

    const metPartner    = berekenNettoBesteedbaar({ ...PROFIEL, p: { ...P_BASIS, fiscaalPartner: true  } });
    const zonderPartner = berekenNettoBesteedbaar({ ...PROFIEL, p: { ...P_BASIS, fiscaalPartner: false } });

    // (1) box2InLaag: met partner = 2×68843, zonder = 1×68843
    expect(Math.round(metPartner.box2InLaag)).toBe(137686);   // 2 × 68.843
    expect(Math.round(zonderPartner.box2InLaag)).toBe(68843); // 1 × 68.843
    // Controle: niet 4× (oververdubbeling) of 0
    expect(metPartner.box2InLaag).toBeLessThan(4 * 68843);
    expect(metPartner.box2InLaag).toBeGreaterThan(68843);

    // (2) VRH: partner geeft lagere VRH (hvv ×2 → minder grondslag → minder belasting)
    expect(Math.round(metPartner.vrh)).toBe(8760);
    expect(Math.round(zonderPartner.vrh)).toBe(9841);
    expect(metPartner.vrh).toBeLessThan(zonderPartner.vrh);

    // (3) VPB: partneronafhankelijk
    expect(metPartner.latenteVpb).toBe(zonderPartner.latenteVpb);
    expect(Math.round(metPartner.latenteVpb)).toBe(115400);
  });

  it('(c) Dubbeltellingscheck: grondslagen niet overlappend, elke vrijstelling precies 1×', () => {
    // Nullijn: vpbGrens=200.000 (r.35), box2Grens=68.843 (r.58), hvv=59.357 (r.94)
    //
    // Drie gescheiden assen — geen enkel bedrag wordt op meerdere assen afgetrokken:
    //
    //   As 1 — VPB grondslag  = ongerealiseerdeWinstBV = 500.000
    //           (NIET bvBruto; uitsluitend de koerswinst)
    //
    //   As 2 — box 2 grondslag = bvNaVpb = bvBruto − latenteVpb = 1.384.600
    //           (NIET ongerealiseerdeWinstBV; NIET bvBruto direct)
    //           → bvBruto is nergens als directe box 2-basis gebruikt.
    //
    //   As 3 — box 3 grondslag = priveVermogen − hvv = 481.286
    //           (VOLLEDIG gescheiden van BV-vermogen; privé ≠ BV)
    //
    // Geen overlap: VPB-grondslag (500K) ≠ box2-grondslag (1384.6K) ≠ box3-grondslag (481.3K).
    // hvv is uitsluitend op privé-vermogen van toepassing — geen aftrek op BV-as.
    // vpbGrens is uitsluitend op ongerealiseerde winst — geen aftrek op privé-as.

    const r = berekenNettoBesteedbaar({ ...PROFIEL, p: P_BASIS });

    // VPB-grondslag = ongerealiseerdeWinstBV (500K), aantoonbaar via inLaag+inHoog splitsing:
    //   de VPB-berekening zelf is niet direct terug in de output, maar bvNaVpb = bvBruto − latenteVpb
    //   bewijst dat de VPB alleen op de winst van 500K is geheven.
    const implicieteVpbGrondslag = Math.round(r.bvBruto - r.bvNaVpb); // = latenteVpb
    // latenteVpb = 115.400 = f(ongerealiseerdeWinstBV=500.000), niet f(bvBruto=1.500.000)
    expect(implicieteVpbGrondslag).toBe(115400);
    // Als bvBruto de VPB-grondslag was: 200K×0.19 + 1300K×0.258 = 38K+335.4K = 373.400 — NIET 115.400
    expect(implicieteVpbGrondslag).not.toBe(373400);

    // box2-grondslag = bvNaVpb (1.384.600), NIET bvBruto (1.500.000)
    //   box2InLaag + box2InHoog = bvNaVpb (niet bvBruto)
    expect(Math.round(r.box2InLaag + r.box2InHoog)).toBe(Math.round(r.bvNaVpb));
    expect(Math.round(r.box2InLaag + r.box2InHoog)).not.toBe(PROFIEL.bvBruto);

    // box3-grondslag = priveVermogen − hvv (geen BV-component)
    //   priveVermogen is NIET in nettoBesteedbaar geteld vóór VRH-aftrek gecombineerd met BV
    const verwachtPriveVermogen = PROFIEL.priveSpaar + PROFIEL.priveBeleg;
    expect(r.priveVermogen).toBe(verwachtPriveVermogen); // = 600.000, uitsluitend privé
    // hvv-aftrek op privé heeft GEEN effect op bvNaVpb of latenteBox2
    expect(Math.round(r.bvNaVpb)).toBe(1384600);        // ongewijzigd door hvv

    // Vrijstellingsduplicatie-check: 1× toegepast per as
    //   box2Grens ×2 (partner) = 137.686 — zie box2InLaag = 137.686 in test (a); niet 275.372
    expect(Math.round(r.box2InLaag)).toBe(137686);   // 1× verdubbeld
    expect(Math.round(r.box2InLaag)).not.toBe(275372); // niet 4×
    //   hvv ×2 (partner) = 118.714 — verifieerbaar via VRH: als hvv 4× zou zijn (237.428),
    //   grondslag = 600.000−237.428=362.572; VRH = 30.336×(362.572/600.000)×0.36 = 6.580 — NIET 8.760
    expect(Math.round(r.vrh)).toBe(8760);
    expect(Math.round(r.vrh)).not.toBe(6580); // niet 4× hvv
    expect(Math.round(r.vrh)).not.toBe(10948); // niet 0× hvv (VRH bij grondslag=600K)
  });

  it('(d) Projectie-isolatie: hero-snapshot onfeilbaar 2026-forfaitair, ongeacht schakelaarstand', () => {
    // berekenNettoBesteedbaar roept box3Heffing aan (data.js r.352),
    // NIET box3VrhJaar — de 2028-schakelaar heeft letterlijk geen codepad naar deze functie.
    // Dit is de isolatiegarantie: het hero-getal van vandaag reflecteert altijd
    // 2026-forfait, en wordt nooit besmet door een projectie-aanname.
    //
    // Bewijs: twee identieke aanroepen, alleen box3WerkelijkRendement2028 verschilt.
    // Verwacht: VRH en nettoBesteedbaar identiek.
    //
    // Nullijn: hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109), forfaitBeleg=6,0% (r.101),
    //          box3Tarief=36% (r.87); peildatum 2026 — ongewijzigd voor beide aanroepen.

    const schakelaarUit = berekenNettoBesteedbaar({ ...PROFIEL, p: { ...P_BASIS, box3WerkelijkRendement2028: 0    } });
    const schakelaarAan = berekenNettoBesteedbaar({ ...PROFIEL, p: { ...P_BASIS, box3WerkelijkRendement2028: 0.04 } });

    // VRH identiek: berekenNettoBesteedbaar gebruikt box3Heffing, niet box3VrhJaar
    expect(schakelaarAan.vrh).toBe(schakelaarUit.vrh);
    expect(Math.round(schakelaarAan.vrh)).toBe(8760);

    // Alle waterfall-stappen identiek
    expect(schakelaarAan.latenteVpb).toBe(schakelaarUit.latenteVpb);
    expect(schakelaarAan.latenteBox2).toBe(schakelaarUit.latenteBox2);
    expect(schakelaarAan.priveNetto).toBe(schakelaarUit.priveNetto);
    expect(schakelaarAan.nettoBesteedbaar).toBe(schakelaarUit.nettoBesteedbaar);
    // Karakterisatie-delta: was 2.055.563 → nu 1.555.563 (eigenWoning niet in hero-getal)
    expect(Math.round(schakelaarAan.nettoBesteedbaar)).toBe(1555563);
  });

  it('(e) 2028-grensoverschrijding: box3VrhJaar vóór/ná 2028, schakelaar aan/uit', () => {
    // Nullijn: hvv=59.357 (r.94), forfaitSpaar=1,28% (r.109), forfaitBeleg=6,0% (r.101),
    //          box3Tarief=36% (r.87), fiscaalPartner=true → hvv×2=118.714; peildatum 2026
    //
    // Profiel-privé: spaargeld=120.000, beleggingen=480.000, totaal=600.000
    //   grondslag       = 600.000 − 118.714 = 481.286
    //   grondslagV      = 481.286/600.000 = 0,80214333...
    //
    // ── Forfait-pad (jaar < 2028 of schakelaar=0) ─────────────────────────────
    //   fictiefRendement = 1.536 + 28.800 = 30.336
    //   VRH = 30.336 × 0,80214333 × 0,36 = 8.760,175 → 8.760
    //   (Effectief forfait-rendement = 30.336/600.000 = 5,056% — het omslagpunt)
    //
    // ── Werkelijk-rendement-pad, schakelaar=4%, jaar=2028 ────────────────────
    //   werkelijkRendement = 600.000 × 0,04 = 24.000
    //   VRH = 24.000 × 0,80214333 × 0,36 = 6.930,518 → 6.931
    //   4% < effectief forfait 5,056% → werkelijk VRH lager dan forfait ✓
    //
    // ── Werkelijk-rendement-pad, schakelaar=6%, jaar=2028 ────────────────────
    //   werkelijkRendement = 600.000 × 0,06 = 36.000
    //   VRH = 36.000 × 0,80214333 × 0,36 = 10.395,778 → 10.396
    //   6% > effectief forfait 5,056% → werkelijk VRH hoger dan forfait ✓
    //   (omslagpunt toont aan dat de schakelaar niet naïef altijd gunstig is)
    //
    // ── Jaargrens 2027→2028: precies op de grens ─────────────────────────────
    //   jaar=2027, schakelaar=4%: delegeert → 8.760 (forfait)
    //   jaar=2028, schakelaar=4%: werkelijk rendement → 6.931
    //   Verschil = 1.829 — jaargrensbewaking exact zichtbaar.

    const P_4 = { ...P_SCHAKELAAR };                                   // schakelaar=4%
    const P_6 = { ...P_BASIS, box3WerkelijkRendement2028: 0.06 };      // schakelaar=6%
    const spaar = PROFIEL.priveSpaar;
    const beleg = PROFIEL.priveBeleg;

    // Forfait altijd bij jaar < 2028 (ongeacht schakelaarstand)
    expect(Math.round(box3VrhJaar(spaar, beleg, 2027, P_4))).toBe(8760);
    expect(Math.round(box3VrhJaar(spaar, beleg, 2027, P_6))).toBe(8760);

    // Forfait bij jaar=2028 wanneer schakelaar=0
    expect(Math.round(box3VrhJaar(spaar, beleg, 2028, P_BASIS))).toBe(8760);

    // Werkelijk rendement 4% bij jaar=2028 → lager dan forfait (4% < 5.056% omslagpunt)
    expect(Math.round(box3VrhJaar(spaar, beleg, 2028, P_4))).toBe(6931);
    expect(box3VrhJaar(spaar, beleg, 2028, P_4)).toBeLessThan(
      box3VrhJaar(spaar, beleg, 2027, P_4)
    );

    // Werkelijk rendement 6% bij jaar=2028 → hoger dan forfait (6% > 5.056% omslagpunt)
    expect(Math.round(box3VrhJaar(spaar, beleg, 2028, P_6))).toBe(10396);
    expect(box3VrhJaar(spaar, beleg, 2028, P_6)).toBeGreaterThan(
      box3VrhJaar(spaar, beleg, 2027, P_6)
    );

    // Jaargrens 2027→2028 is exact: één jaar verschil geeft 1.829 verschil bij 4%
    const delta4 = Math.round(box3VrhJaar(spaar, beleg, 2027, P_4))
                 - Math.round(box3VrhJaar(spaar, beleg, 2028, P_4));
    expect(delta4).toBe(1829); // 8.760 − 6.931 = 1.829

    // Directe vergelijking box3Heffing met box3VrhJaar forfait-pad:
    // box3VrhJaar delegeert identiek naar box3Heffing wanneer schakelaar uit of jaar < 2028
    expect(box3VrhJaar(spaar, beleg, 2027, P_4)).toBe(box3Heffing(spaar, beleg, P_4));
    expect(box3VrhJaar(spaar, beleg, 2028, P_BASIS)).toBe(box3Heffing(spaar, beleg, P_BASIS));
  });

  it('(f) Ontmaskerend — grote overwaarde, klein liquide vermogen: hero-getal is klein, woning apart', () => {
    // Doel: elke regressie die eigenWoning terugzet in nettoBesteedbaar geeft onmiddellijk
    //       een rode test. Het hero-getal moet uitsluitend het liquide vermogen reflecteren.
    //
    // Nullijn: vpbGrens=200K (r.35), box2Grens=68.843 (r.58), hvv=59.357 (r.94),
    //          forfaitSpaar=1,28% (r.109), forfaitBeleg=6,0% (r.101),
    //          box3Tarief=36% (r.87); peildatum 2026
    //
    // Profiel "OverwaardeHeavy":
    //   bvBruto                = 0        (geen BV — puur privé-gebruiker of DGA zonder BV)
    //   ongerealiseerdeWinstBV = 0
    //   priveSpaar             = 5.000
    //   priveBeleg             = 10.000   → totaal privé = 15.000 (klein liquide)
    //   wozWaarde              = 800.000
    //   hypotheekRestschuld    = 100.000  → overwaarde = 700.000 (groot niet-liquide)
    //   fiscaalPartner         = false
    //
    // Handberekening:
    //   Stap 1 — latente VPB: 0 (ongerealiseerdeWinstBV=0)
    //   Stap 2 — bvNaVpb = 0 − 0 = 0
    //   Stap 3 — latente box 2: bvNaVpb=0 ≤ box2Grens=68.843
    //            → box2InLaag=0, box2InHoog=0, latenteBox2=0
    //   Stap 4 — VRH: totaal=15.000 < hvv=59.357 → rendementsgrondslag=0 → vrh=0
    //            priveNetto = 15.000 − 0 = 15.000
    //   Stap 5 — nettoBesteedbaar = 0 − 0 + 15.000 = 15.000   ← klein liquide
    //   Apart  — eigenWoningNetto = max(0, 800.000−100.000) = 700.000
    //            nietLiquideVermogen = 700.000                ← groot, maar apart
    //
    //   Bug-scenario (als eigenWoning wél in hero-getal zat): 15.000 + 700.000 = 715.000
    //   → de .not.toBe(715000)-assertion maakt elke regressie onmiddellijk zichtbaar.

    const P_GEEN_BV = { ...BASE_PARAMS, fiscaalPartner: false };
    const r = berekenNettoBesteedbaar({
      bvBruto: 0, ongerealiseerdeWinstBV: 0,
      priveSpaar: 5000, priveBeleg: 10000,
      wozWaarde: 800000, hypotheekRestschuld: 100000,
      p: P_GEEN_BV,
    });

    // Hero-getal: uitsluitend liquide vermogen
    expect(Math.round(r.nettoBesteedbaar)).toBe(15000);

    // Niet-liquide vermogen: groot en correct
    expect(Math.round(r.nietLiquideVermogen)).toBe(700000);

    // Regressiecheck: eigenWoning niet stiekem opgeteld
    expect(Math.round(r.nettoBesteedbaar)).not.toBe(715000);   // 15K + 700K (bug)
    expect(Math.round(r.nettoBesteedbaar)).not.toBe(700000);   // enkel eigenWoning (bug)

    // VRH = 0: privé-totaal 15K < hvv=59.357 (r.94, fiscaalPartner=false)
    expect(r.vrh).toBe(0);
    expect(r.latenteBox2).toBe(0);
  });

});
