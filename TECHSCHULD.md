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

---

## TS-06 · box3VrhJaar: werkelijk-rendement-grondslag overgenomen van forfaitair stelsel

**Status:** open (bewuste implementatiekeuze, aanname op aanname)  
**Prioriteit:** laag — zit achter prominent onzekerheidslabel; geen correctheidsfout gegeven huidige wetgeving  
**Locatie:** `src/data.js` — `box3VrhJaar()` werkelijk-rendement-pad; `src/views/Instellingen.jsx` — toggle-label

De werkelijk-rendement-variant in `box3VrhJaar` (actief wanneer `box3WerkelijkRendement2028 > 0 && jaar >= 2028`)
berekent de heffing als:

    werkelijkRendement × grondslagVerhouding × box3Tarief

waarbij `grondslagVerhouding = (totaal − heffingsvrijVermogen) / totaal` en `box3Tarief = 36%`
direct zijn overgenomen van het **forfaitaire** stelsel. Dit is een dubbele aanname:

1. **Grondslag-systematiek:** Of het heffingsvrijvermogen en de grondslagverhouding-methode
   ongewijzigd blijven in het werkelijke-rendementstelsel is niet vastgelegd in wet — de huidige
   wetsvoorstellen bevatten afwijkende grondslagsystematiek.
2. **Tarief:** Of het 36%-tarief ongewijzigd blijft is evenmin vastgelegd.

De UI-toggle draagt het label "wettelijk aangekondigd maar politiek onzeker en al eerder uitgesteld —
schakelbare aanname, geen voorspelling." Dit dekt de onzekerheid richting de gebruiker.

**Oplossing:** Herzien zodra het werkelijke-rendementstelsel definitief in wet is vastgelegd.
Vermoedelijk moet de grondslag worden aangepast (forfait vervalt, werkelijk rendement is de volledige
grondslag, hvv-aftrek kan anders uitwerken). Toets dan: heeft `box3VrhJaar` een apart `grondslag`-pad
nodig, of volstaat een parameter-update?

---

## TS-07 · Verzilvering eigenwoning-overwaarde als expliciete scenario-hefboom

**Status:** open (bewuste modelkeuze)  
**Prioriteit:** laag — gerelateerd aan scenario-infrastructuur die nog niet bestaat  
**Locatie:** `src/data.js` — `berekenNettoBesteedbaar()` resultaatobject (`nietLiquideVermogen`);
`src/views/Dashboard.jsx` — niet-liquide vermogen sectie

Eigenwoning-overwaarde (WOZ − hypotheek) wordt nu bewust buiten het hero-getal
"netto besteedbaar vandaag" gehouden en apart weergegeven als `nietLiquideVermogen`.
Dit is gecorrigeerd in de spec (§5.2) en implementatie — zie commit bericht voor
de foutlokalisatie (spec-fout, niet implementatiefout).

Verzilvering van de overwaarde via verkleinen of herfinancieren is een reële
FIRE-hefboom voor veel DGA's, maar vereist:
1. Scenario-modellering (aflossingsvrij herfinancieren vs. annuïtair verkleinen)
2. Fiscale behandeling van de vrijgekomen liquiditeit (box 3-impact)
3. UI-workflow voor de scenariovergelijking

**Oplossing:** Bouwen als expliciete scenario-hefboom wanneer de scenario-infrastructuur
beschikbaar is. Analoog aan de 2028-schakelaar: schakelbare aanname met onzekerheids-
label, niet als stille term in het hero-getal.

---

## TS-08 · Doelcurves: statisch doelkapitaal vervangt glide-path-allocatie

**Status:** open (bewuste modelkeuze)  
**Prioriteit:** laag — relevant zodra Monte Carlo een portefeuille-allocatiemodel krijgt  
**Locatie:** `src/data.js` — `berekenPensioenKapitaal()`, `pkVloer`/`pkStreef`; `src/views/Planner.jsx` — tier-berekening

De huidige doelcurves (vloer, streef, comfort) zijn statische kapitaaldrempels berekend op basis
van een vast onttrekkingspercentage (SWR) en een vaste verwachte return `r`. De projectie gebruikt
diezelfde `r` over de gehele opbouwfase — er is geen glide-path: geen afbouw van aandelenblootstelling
naarmate de FIRE-datum nadert.

**Impact:** Een DGA die op koers is voor FIRE in drie jaar heeft in werkelijkheid een conservatiever
risicoprofiel nodig dan iemand met een horizon van twintig jaar. De huidige engine negeert dat
sequentie-van-rendementsrisico toeneemt naarmate de horizon krimpt, waardoor de kansberekening
(P50, P10-banden) te optimistisch is op korte horizons.

**Oplossing:** Voeg een `allocatieGlidePathJaren`-parameter toe die de equity-fractie lineair afbouwt
van `aandelenFractieMax` naar `aandelenFractieMin` over de opgegeven aanloopperiode vóór FIRE. Herbereken
`r` per simulatiejaar als gewogen gemiddelde van aandelen- en obligatierendement. Vereist ook een
aparte Monte Carlo-verificatiefase voor de gewijzigde simulatielus.

---

## TS-09 · VPB-afrekenmethode: aankoopwaarde-pad gereserveerd maar niet uitgeleverd

**Status:** open — infrastructuur klaar, rekenpad ontbreekt  
**Prioriteit:** medium — DGA's met kostprijsregistratie hebben een materieel ander fiscaal profiel  
**Locatie:** `src/data.js` — `BASE_PARAMS.vpbAfrekenmethode` (default `'actuele_waarde'`);
`berekenNettoBesteedbaar()` — `methode !== 'actuele_waarde'`-tak (getrapte VPB al correct);
`src/views/Instellingen.jsx` — read-only statusregel VPB-tarieven card

De engine ondersteunt twee VPB-afrekenmethoden conceptueel, maar levert er slechts één uit:

- **`actuele_waarde`** (geïmplementeerd, default): beleggingsrendement wordt elk jaar belast in de
  opbouwfase (data.js r. 568–570: `vpbBeleg = rendBelegBVb × vennootschapsbelasting`). Bij liquidatie
  geen latente VPB-claim. `berekenNettoBesteedbaar` geeft `latenteVpb = 0`.

- **`aankoopwaarde`** (gereserveerd): koerswinst wordt uitgesteld en pas bij liquidatie belast via de
  getrapte VPB-tarieven (19% / 25,8%). De waterfall-tak in `berekenNettoBesteedbaar` is correct
  geïmplementeerd en getest (test I(b) `aankoopwaarde-schakelaar-bewijs`: `latenteVpb = 89.600`). Maar
  de **opbouwfase-simulatielus** belast het rendement nóg steeds jaarlijks — er is geen apart
  rekenpad dat de VPB-last uitstelt en ophoogt als uitgestelde schuld. Een schakelaar naar
  `aankoopwaarde` zou nu **dubbele heffing** produceren: jaarlijks in de lus én bij liquidatie.

**Vereiste werk vóór uitlevering:**
1. Tweede simulatiefunctie (of vertakking in `runSimulatie`) die onder `aankoopwaarde` de jaarlijkse
   VPB-aftrek op beleggingsrendement overslaat en in plaats daarvan een cumulatieve kostprijs bijhoudt.
2. Monte Carlo-verificatiefase voor het nieuwe pad (aparte karakterisatietests).
3. UI-toggle in Instellingen (vervangt de huidige read-only statusregel).
4. Migratiescript of waarschuwing voor bestaande gebruikers die onder `actuele_waarde` een seed hebben.

**Bewust niet uitgeleverd in feat/latente-belastingen:** de infrastructuur (parameter + waterfall-tak +
tests + UI-statusregel) is geland zodat de switch straks één PR is, niet een big-bang-migratie.
