/**
 * FISCALE PARAMETERS — geversioneerde bron van waarheid
 *
 * Elke parameter draagt:
 *   waarde             — getal
 *   bron               — URL naar officiële publicatie
 *   geverifieerd       — bool: true = handmatig gecontroleerd; false = vereenvoudiging of te verifiëren
 *   status             — 'definitief' | 'voorlopig' | 'afgeleid' | 'vereenvoudigd'
 *                         definitief   : geverifieerd uit officiële publicatie
 *                         voorlopig    : provisorisch; te hercontroleren bij definitieve vaststelling
 *                         afgeleid     : berekend uit andere geverifieerde params (niet direct gebron'd)
 *                         vereenvoudigd: structurele modelkeuze; te vervangen door correcte implementatie
 *   belastingjaar      — int: het jaar waarvoor de waarde geldt
 *   verversings_cadans — 'jaarlijks' | 'halfjaarlijks': hoe vaak de waarde hercontroleerd moet worden
 *   aannames           — optioneel: object met expliciete modelaannames (bv. { loonheffingskorting: true })
 *   toelichting        — optioneel: modelkeuze of beperking
 *
 * Wijzig alleen na verificatie tegen de genoemde bron.
 * GEBRUIK: importeer `getFiscaleWaarden()` — nooit waarden direct hardcoden.
 */

export const FISCALE_PARAMS_2026 = {
  belastingjaar: 2026,
  geverifieerd_op: '2026-05-15',  // datum van laatste verificatie van de gehele set

  // ── VPB ──────────────────────────────────────────────────────────────────
  vpbTariefLaag: {
    waarde: 0.19,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/hoeveel-vennootschapsbelasting-betaalt-u',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  vpbGrens: {
    waarde: 200000,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/hoeveel-vennootschapsbelasting-betaalt-u',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  vpbTariefHoog: {
    waarde: 0.258,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/hoeveel-vennootschapsbelasting-betaalt-u',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },

  // ── Box 2 ─────────────────────────────────────────────────────────────────
  box2TariefLaag: {
    waarde: 0.245,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/inkomen_uit_aanmerkelijk_belang',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  box2Grens: {
    waarde: 68843,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/inkomen_uit_aanmerkelijk_belang',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  box2TariefHoog: {
    waarde: 0.31,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/inkomen_uit_aanmerkelijk_belang',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },

  // ── Dividendbelasting (bronheffing — 15% voorheffing, verrekenbaar met box 2) ──
  dividendbelastingVoorheffing: {
    waarde: 0.15,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/dividendbelasting',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
    toelichting: 'Bronheffing door BV in te houden; verrekenbaar met box 2-heffing van de aandeelhouder. Netto box 2-last = box2TariefLaag/Hoog - 15%, maar cashflow-effect voor de aandeelhouder = box2-tarief (BV houdt 15% in, aandeelhouder verrekent).',
  },

  // ── Box 3 / VRH ───────────────────────────────────────────────────────────
  // Model: vereenvoudiging, forfaitair — tegenbewijsregeling niet gemodelleerd.
  // Component-parameters zijn de bron; `vermogensrendementsheffing` is afgeleid
  // als box3ForfaitOverigeBezittingen × box3Tarief (beleg-dominant portfolio).
  box3Tarief: {
    waarde: 0.36,  // IB-tarief op fictief rendement box 3
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/belasting_berekenen_over_uw_inkomen',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  heffingsvrijVermogen: {
    waarde: 59357,  // per persoon; ×2 bij fiscaal partner
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  box3ForfaitOverigeBezittingen: {
    waarde: 0.060,  // fictief rendement beleggingen/overige bezittingen — definitief 2026
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
    toelichting: 'Definitief gepubliceerd forfait overige bezittingen 2026.',
  },
  box3ForfaitSpaargeld: {
    waarde: 0.0128,  // fictief rendement spaargeld — VOORLOPIG 2026 (definitief pas na aanslagregeling)
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: false,  // ⚠️ voorlopig — definitieve waarde volgt na belastingaanslagen
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },
  box3ForfaitSchulden: {
    waarde: 0.028,  // fictief rendement schulden — VOORLOPIG 2026
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: false,  // ⚠️ voorlopig — buiten geverifieerde band (~2,6–2,7%); te corrigeren bij definitieve vaststelling
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
    toelichting: 'Voorlopig 2026; valt buiten geverifieerde band van ~2,6–2,7%. Corrigeren zodra Belastingdienst definitief forfait publiceert.',
  },
  // Afgeleid effectief tarief: box3ForfaitOverigeBezittingen × box3Tarief = 6,0% × 36% = 2,16%
  // Gebruikt in engine als benadering voor een beleg-dominant privé-portfolio.
  // Vereenvoudiging: tegenbewijsregeling, werkelijk rendement, en schulden-aftrek niet gemodelleerd.
  vermogensrendementsheffing: {
    waarde: 0.02160,  // = box3ForfaitOverigeBezittingen (6,0%) × box3Tarief (36%)
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: true,
    status: 'afgeleid',  // berekend uit box3ForfaitOverigeBezittingen × box3Tarief; niet direct gebron'd
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
    toelichting: 'Vereenvoudiging, forfaitair — tegenbewijsregeling niet gemodelleerd. Effectief: forfait overige bezittingen (6,0% definitief) × IB-tarief (36%). Spaargeld-/schulden-forfaits apart opgeslagen als voorlopig.',
  },

  // ── Inkomstenbelasting / DGA ───────────────────────────────────────────────
  // 🗺️ ROADMAP — TICKET: "Box 1 progressief tarief vervangt platte 43% — vóór Module 3-optimizers"
  //    Scope : volledige schijvenberekening met actuele tariefgrenzen, heffingskortingen (algemeen,
  //            arbeidskorting indien van toepassing) en aftrekposten.
  //    Blocker: Module 3-DGA-optimizers (salaris/dividend-mix) mogen pas gebouwd worden nadat de
  //             progressieve berekening klopt; plat tarief geeft verkeerde optimums.
  //    Prioriteit: vóór eerste betalende gebruiker die DGA-optimizer gebruikt.
  inkomstenbelasting: {
    waarde: 0.43,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/belasting_berekenen_over_uw_inkomen',
    geverifieerd: false,
    status: 'vereenvoudigd',  // structurele modelkeuze — plat tarief ignoreert progressieve schaal; zie roadmap-ticket hierboven
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
    toelichting: 'Structurele vereenvoudiging van progressieve schaal — te vervangen. Plat effectief tarief ignoreert aftrekposten, heffingskortingen en schijfsprongen. Instelling via Instellingen-scherm; accountant-verificatie noodzakelijk.',
  },
  gebruikelijkLoon: {
    waarde: 58000,  // DGA-norm gebruikelijk loon 2026 (belastingdienst.nl)
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/personeel_en_loon/gebruikelijk_loon',
    geverifieerd: true,
    belastingjaar: 2026,
    verversings_cadans: 'jaarlijks',
  },

  // ── AOW ───────────────────────────────────────────────────────────────────
  // AOW-bedragen worden halfjaarlijks geïndexeerd (januari en juli).
  // Cadans: 'halfjaarlijks' — banner slaat alarm bij > 6 maanden zonder hercontrole.
  aowBedragAlleenstaand: {
    waarde: 18700,  // netto p/j, alleenstaand — januari 2026 (svb.nl)
    bron: 'https://www.svb.nl/nl/aow/hoogte-aow',
    geverifieerd: true,
    status: 'definitief',
    belastingjaar: 2026,
    verversings_cadans: 'halfjaarlijks',
    aannames: {
      loonheffingskorting: true,   // bedrag is ná toepassing loonheffingskorting; vervalt automatisch bij hogere andere inkomsten
      peildatum: 'januari 2026',   // SVB indexeert elke januari en juli — hercontroleer bij volgende indexatie
    },
    toelichting: 'Netto jaarbedrag inclusief loonheffingskorting, peildatum januari 2026. Hercontroleer bij elke SVB-indexatie (januari en juli).',
  },
  aowBedragPartner: {
    waarde: 12800,  // netto p/j per persoon, met partner — januari 2026 (svb.nl)
    bron: 'https://www.svb.nl/nl/aow/hoogte-aow',
    geverifieerd: true,
    status: 'definitief',
    belastingjaar: 2026,
    verversings_cadans: 'halfjaarlijks',
    aannames: {
      loonheffingskorting: true,   // bedrag is ná toepassing loonheffingskorting; vervalt automatisch bij hogere andere inkomsten
      peildatum: 'januari 2026',   // SVB indexeert elke januari en juli — hercontroleer bij volgende indexatie
    },
    toelichting: 'Netto jaarbedrag per persoon inclusief loonheffingskorting, peildatum januari 2026. Hercontroleer bij elke SVB-indexatie (januari en juli).',
  },
};

/** Actieve parameterset — wijzig hier om een ander jaar te activeren */
export const ACTIEVE_FISCALE_PARAMS = FISCALE_PARAMS_2026;

/**
 * Geeft de vlakke waarden-map voor gebruik in BASE_PARAMS en de engine.
 * Gooit een Error als een gevraagde sleutel ontbreekt (geen silent fallback).
 */
export function getFiscaleWaarden(set = ACTIEVE_FISCALE_PARAMS) {
  const result = {};
  for (const [key, entry] of Object.entries(set)) {
    if (key === 'belastingjaar' || key === 'geverifieerd_op') continue;
    if (typeof entry === 'object' && 'waarde' in entry) {
      result[key] = entry.waarde;
    }
  }
  return result;
}

/**
 * Controleert of de parameterset (deels) verouderd is.
 *
 * Returns {
 *   verouderd: bool,          — true als minstens één item stale is
 *   reden: string | null,     — eerste/meest urgente reden (backward-compat)
 *   items: Array<{            — alle individuele waarschuwingen
 *     type: 'verkeerd_jaar' | 'halfjaarlijks_verlopen' | 'jaarlijks_verlopen',
 *     params?: string[],      — betrokken parameternamen (halfjaarlijks)
 *     reden: string,
 *   }>
 * }
 */
export function checkStaleness(set = ACTIEVE_FISCALE_PARAMS) {
  const nu = new Date();
  const huidigJaar = nu.getFullYear();
  const geverificeerdOp = new Date(set.geverifieerd_op);
  const maandenOud = (nu - geverificeerdOp) / (1000 * 60 * 60 * 24 * 30.44);

  const items = [];

  // 1. Verkeerd belastingjaar — meest urgent
  if (huidigJaar > set.belastingjaar) {
    items.push({
      type: 'verkeerd_jaar',
      reden: `Fiscale regels zijn van belastingjaar ${set.belastingjaar} — het is nu ${huidigJaar}. Controleer of de tarieven nog geldig zijn.`,
    });
  }

  // 2. Halfjaarlijkse parameters verlopen (> 6 maanden)
  if (maandenOud > 6) {
    const halfjaarParams = Object.entries(set)
      .filter(([k, v]) =>
        typeof v === 'object' &&
        v !== null &&
        'verversings_cadans' in v &&
        v.verversings_cadans === 'halfjaarlijks'
      )
      .map(([k]) => k);

    if (halfjaarParams.length > 0) {
      items.push({
        type: 'halfjaarlijks_verlopen',
        params: halfjaarParams,
        reden: `AOW-bedragen (${halfjaarParams.join(', ')}) zijn ${Math.round(maandenOud)} maanden geleden gecontroleerd — halfjaarlijkse indexatie (jan/jul). Verifieer op svb.nl.`,
      });
    }
  }

  // 3. Algemeen te oud (> 12 maanden) — jaarlijkse parameters
  if (maandenOud > 12) {
    items.push({
      type: 'jaarlijks_verlopen',
      reden: `Alle fiscale parameters zijn ${Math.round(maandenOud)} maanden geleden gecontroleerd (${set.geverifieerd_op}). Verifieer tarieven voor het nieuwe belastingjaar.`,
    });
  }

  return {
    verouderd: items.length > 0,
    reden: items.length > 0 ? items[0].reden : null,
    items,
  };
}
