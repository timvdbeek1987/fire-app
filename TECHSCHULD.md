# Technische schuld — DGA FIRE Cockpit

Vindbare lijst van bekende vereenvoudigingen en openstaande migraties.
Bijhouden: voeg toe bij elke bewuste modelkeuze, verwijder bij oplossing.

---

## TS-01 · Box 1: progressief tarief vervangt platte 43%

**Status:** open  
**Prioriteit:** BLOCKER voor Module 3-optimizers (salaris/dividend-mix)  
**Locatie:** `src/data.js` — `inkomstenbelasting` in BASE_PARAMS; `src/fiscalParams.js` — `inkomstenbelasting.status = 'vereenvoudigd'`

Huidige engine gebruikt een plat effectief tarief van 43% voor box 1. Dit ignoreert:
- Progressieve schijven (schijf 1: 36,97% / schijf 2: 49,50% in 2026)
- Algemene heffingskorting en arbeidskorting
- Aftrekposten (hypotheekrenteaftrek e.d.)

**Impact:** DGA-optimizers (Module 3) die de optimale salaris/dividend-verdeling berekenen geven
verkeerde uitkomsten zolang box 1 plat is — het marginale voordeel van extra dividend t.o.v. salaris
wordt verkeerd ingeschat.

**Oplossing:** Implementeer `berekenBox1Heffing(brutoloon, p)` met actuele schijven en heffingskortingen,
vervang de platte vermenigvuldiging vóór eerste gebruik van Module 3.

---

## TS-02 · dividendbelasting-alias migratie (nSims=1 → nSims≥100)

**Status:** open  
**Prioriteit:** medium — werkt, maar verbergt onzekerheid in A/B-karakterisatietests  
**Locatie:** `src/data.js` r. 96 (BASE_PARAMS), r. 193 (`paramsToSeed`)

De `dividendbelasting`-alias in BASE_PARAMS bestaat uitsluitend als hash-anker voor de deterministische
Monte Carlo-seed. De A- en B-tests gebruiken `nSims=1` — één pad per seed. Dat maakt de tests extreem
gevoelig voor seedwijzigingen (andere hash → ander rendementsjaar → compleet andere VPB/bvP50-waarden).

**Geblokkeerd tot:** A- en B-tests worden gemigreerd van `nSims=1` naar `nSims≥100` (mediane
uitkomst stabiel over meerdere paden). Na migratie kan de alias uit BASE_PARAMS én paramsToSeed
verwijderd worden zonder cascade van snapshot-updates.

**Oplossing:** Migreer A/B-tests naar `nSims=100+`, verwijder daarna `dividendbelasting` uit BASE_PARAMS
en vervang `dividendbelasting` in `paramsToSeed` door `box2TariefLaag`, `box2Grens`, `box2TariefHoog`.

---

## TS-03 · box3Heffing negeert tegenbewijsregeling

**Status:** open (bewuste modelkeuze)  
**Prioriteit:** laag — relevant zodra werkelijkrendement-stelsel in werking treedt  
**Locatie:** `src/data.js` — `box3Heffing()`; `src/fiscalParams.js` — `vermogensrendementsheffing.toelichting`

`box3Heffing` berekent heffing op forfaitaire grondslag zonder tegenbewijsoptie. Gebruikers met een
werkelijk rendement dat significant lager is dan het forfait (bijv. spaargeld in een laagrentejaar)
betalen in werkelijkheid minder. De tegenbewijsregeling is juridisch complex en peildatumafhankelijk.

**Oplossing:** Zie ook TS-05 (werkelijk rendement 2028-schakelaar). Als werkelijkrendement-stelsel
definitief in werking treedt, vervalt het forfait voor die categorie volledig.

---

## TS-04 · box3ForfaitSchulden definitief bepalen

**Status:** open  
**Prioriteit:** laag — schulden niet gemodelleerd in box3Heffing  
**Locatie:** `src/fiscalParams.js` — `box3ForfaitSchulden.geverifieerd = false`

Het schulden-forfait voor box 3 staat op 2,80% (voorlopig 2026), buiten de geverifieerde band van
~2,6–2,7%. Bovendien modelleert `box3Heffing()` de schuldenaftrek niet: schulden reduceren de
box 3-grondslag, maar dit is niet geïmplementeerd.

**Actie:** Zodra Belastingdienst het definitieve 2026-forfait publiceert, bijwerken in fiscalParams.js.
Daarna optioneel: schulden-component toevoegen aan `box3Heffing(spaargeld, beleggingen, schulden, p)`.

---

## TS-05 · berekenMaandelijksOnttrektbaar: analytische VRH-vereenvoudiging

**Status:** open (bewuste modelkeuze)  
**Prioriteit:** laag — analytische helper, niet de simulatielus  
**Locatie:** `src/data.js` — `berekenMaandelijksOnttrektbaar()` r. ~1026

De analytische onttrekkingsberekening gebruikt `box3Heffing(0, portfolioReeel, p)` op het
startportfolio (beleggingen-dominant aangenomen, geen spaargeld-component). Twee vereenvoudigingen:

1. **Uitputting genegeerd:** naarmate het portfolio krimpt, stijgt de effectieve VRH-druk
   (heffingsvrijvermogen als % van totaal neemt toe). De analytische berekening snapshots dit niet.
2. **Spaargeld-fractie genegeerd:** functie heeft geen `priveSpaarFractie`-parameter.

**Oplossing:** Voeg `priveSpaarFractie = 0` als optionele parameter toe; overweeg iteratieve
correctie bij kleine portfolios (< 3× hvv).
