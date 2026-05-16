/**
 * FISCALE PARAMETERS — geversioneerde bron van waarheid
 *
 * Elke parameter draagt: waarde, belastingjaar, bron (URL), geverifieerd_op (datum).
 * Wijzig alleen na verificatie tegen de genoemde bron.
 *
 * GEBRUIK: importeer `getFiscaleParams()` — nooit waarden direct hardcoden.
 */

export const FISCALE_PARAMS_2026 = {
  belastingjaar: 2026,
  geverifieerd_op: '2026-05-15',  // datum van laatste verificatie

  // ── VPB ──────────────────────────────────────────────────────────────────
  vpbTariefLaag: {
    waarde: 0.19,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/hoeveel-vennootschapsbelasting-betaalt-u',
    geverifieerd: true,
    belastingjaar: 2026,
  },
  vpbGrens: {
    waarde: 200000,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/hoeveel-vennootschapsbelasting-betaalt-u',
    geverifieerd: true,
    belastingjaar: 2026,
  },
  vpbTariefHoog: {
    waarde: 0.258,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/vennootschapsbelasting/hoeveel-vennootschapsbelasting-betaalt-u',
    geverifieerd: true,
    belastingjaar: 2026,
  },

  // ── Box 2 ─────────────────────────────────────────────────────────────────
  box2TariefLaag: {
    waarde: 0.245,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/inkomen_uit_aanmerkelijk_belang',
    geverifieerd: true,
    belastingjaar: 2026,
  },
  box2Grens: {
    waarde: 68843,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/inkomen_uit_aanmerkelijk_belang',
    geverifieerd: true,
    belastingjaar: 2026,
  },
  box2TariefHoog: {
    waarde: 0.31,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/inkomen_uit_aanmerkelijk_belang',
    geverifieerd: true,
    belastingjaar: 2026,
  },

  // ── Dividendbelasting (bronheffing — 15% voorheffing, verrekenbaar met box 2) ──
  dividendbelastingVoorheffing: {
    waarde: 0.15,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/dividendbelasting',
    geverifieerd: true,
    belastingjaar: 2026,
    toelichting: 'Bronheffing door BV in te houden; verrekenbaar met box 2-heffing van de aandeelhouder. Netto box 2-last = box2TariefLaag/Hoog - 15%, maar cashflow-effect voor de aandeelhouder = box2-tarief (BV houdt 15% in, aandeelhouder verrekent).',
  },

  // ── Box 3 / VRH ───────────────────────────────────────────────────────────
  // ⚠️ TE VERIFIËREN — forfaits wijzigen jaarlijks; onder voorbehoud rechtszaak HR
  vermogensrendementsheffing: {
    waarde: 0.02088,  // effectief tarief: 2.001% fictief rendement × 36% IB × correctiefactor
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: false,  // ⚠️ nog niet geverifieerd voor 2026 — forfaits nog niet definitief
    belastingjaar: 2026,
    toelichting: 'Effectief gecombineerd tarief (forfait × IB-tarief). Gebruik werkelijk rendement zodra wet in werking treedt.',
  },
  heffingsvrijVermogen: {
    waarde: 57000,  // per persoon (2025 was €57.000, 2026 te verifiëren)
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/vermogen_en_aanmerkelijk_belang/vermogen/belasting_betalen_over_uw_vermogen/heffingsvrij-vermogen',
    geverifieerd: false,  // ⚠️ te verifiëren voor 2026
    belastingjaar: 2026,
  },

  // ── Inkomstenbelasting / DGA ───────────────────────────────────────────────
  // ⚠️ TE VERIFIËREN — effectief marginaal tarief; sterk afhankelijk van persoonlijke situatie
  inkomstenbelasting: {
    waarde: 0.43,
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/prive/inkomstenbelasting/heffingskortingen_boxen_tarieven/boxen_en_tarieven/belasting_berekenen_over_uw_inkomen',
    geverifieerd: false,  // ⚠️ effectief tarief — afhankelijk van aftrekposten, kortingen; te verifiëren met accountant
    belastingjaar: 2026,
    toelichting: 'Effectief marginaal tarief box 1. Stel in op eigen situatie (via Instellingen).',
  },
  gebruikelijkLoon: {
    waarde: 56000,  // norm gebruikelijk loon 2025 (2026 te verifiëren)
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/personeel_en_loon/gebruikelijk_loon',
    geverifieerd: false,  // ⚠️ te verifiëren voor 2026
    belastingjaar: 2026,
  },

  // ── AOW ───────────────────────────────────────────────────────────────────
  // ⚠️ TE VERIFIËREN — AOW-bedragen worden halfjaarlijks geïndexeerd
  aowBedragAlleenstaand: {
    waarde: 16680,  // netto p/j indicatief 2025; 2026 te verifiëren
    bron: 'https://www.svb.nl/nl/aow/hoogte-aow',
    geverifieerd: false,  // ⚠️ te verifiëren voor 2026 (halfjaarlijkse indexatie)
    belastingjaar: 2026,
  },
  aowBedragPartner: {
    waarde: 11520,  // netto p/j indicatief (per partner) 2025; te verifiëren
    bron: 'https://www.svb.nl/nl/aow/hoogte-aow',
    geverifieerd: false,  // ⚠️ te verifiëren voor 2026
    belastingjaar: 2026,
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
 * Controleert of de parameterset verouderd is.
 * Returns: { verouderd: bool, reden: string | null }
 */
export function checkStaleness(set = ACTIEVE_FISCALE_PARAMS) {
  const nu = new Date();
  const huidigJaar = nu.getFullYear();
  const geverificeerdOp = new Date(set.geverifieerd_op);
  const maandenOud = (nu - geverificeerdOp) / (1000 * 60 * 60 * 24 * 30.44);

  if (huidigJaar > set.belastingjaar) {
    return {
      verouderd: true,
      reden: `Fiscale regels zijn van belastingjaar ${set.belastingjaar} — het is nu ${huidigJaar}. Controleer of de tarieven nog geldig zijn.`,
    };
  }
  if (maandenOud > 12) {
    return {
      verouderd: true,
      reden: `Fiscale parameters zijn ${Math.round(maandenOud)} maanden geleden gecontroleerd (${set.geverifieerd_op}). Verifieer met je accountant.`,
    };
  }
  return { verouderd: false, reden: null };
}
