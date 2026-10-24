# Ghidarea în aplicație: drumul explicat la început și la fiecare pas

**Pe scurt:** două lucruri noi.

1. **Un ecran de început, „Cum funcționează”**, înainte de pasul 1. Explică în 90 de secunde lanțul teoriei schimbării, de ce merită și ce iese la final.
2. **Un „Ghid al pasului”** sus, pe fiecare pas. Are patru părți:
   - de ce contează;
   - cum să gândești;
   - un exemplu bun și unul slab;
   - greșeli frecvente și sfaturi.

Totul e deschis implicit, pe toți pașii: și partea esențială, și exemplele, greșelile și sfaturile. Dev-ul poate restrânge ghidul dacă vrea. AI-ul primește aceleași greșeli în prompt, ca să le prindă în conversație.

Machetă interactivă cu tot conținutul: [mockups/ghidare.html](mockups/ghidare.html).

Terminologia e cea decisă în [spec-ul teoriei schimbării](2026-10-24-teoria-schimbarii-spec.md): engleză / română. Pașii sunt cei din v2, cu pasul 7 „Drumul schimbării” și pasul 10 „Activities / Activități”.

---

## 1. Ce spune cercetarea

### Greșeli frecvente în teoriile schimbării

Fiecare greșeală are o contramăsură în ghid:

| Greșeală | Sursa | Unde o prindem |
| --- | --- | --- |
| Ținte vagi: „o lume mai bună”, „comunitatea” | [Moral Ambition](https://www.moralambition.org/stories/theory-of-change) | Pașii 2, 4 și 5: numești oamenii și instituțiile |
| Te oprești la outputs, nu ajungi la schimbare | [SSRI, Six pitfalls](https://morganstanley.theonevalley.com/download/attachments/54763833/Six%20Theory%20of%20Change%20Pitfalls%20to%20Avoid%202012%20SSRI.pdf?api=v2) | Pașii 4 și 7 |
| Salturi: o activitate duce direct la impact | idem | Pasul 7, testul „ca să…” |
| Mai multe rezultate într-un singur pas („guvernul adoptă **și** aplică”) | idem | Pasul 7: un card, o schimbare |
| Ipoteze nespuse sau netestate | [BetterEvaluation](https://betterevaluation.org/node/2406), [Nesta](https://www.nesta.org.uk/blog/whats-wrong-with-theories-of-change/) | Pasul 8 |
| „Facem lucruri și se întâmplă lucruri”: săgeți fără mecanism | BetterEvaluation | Pasul 7, câmpul „Ipoteză” |
| Prea liniar, scris o dată și uitat | Nesta | Ecranul de final: „revino peste 3 luni” |

Ce funcționează, după aceleași surse:

- **Mers înapoi** de la rezultatul pe termen lung, cu întrebarea: ce trebuie să fie adevărat chiar înainte? Sursă: [Center for Theory of Change](https://www.theoryofchange.org/?p=569).
- **Fiecare pas întrebat**: e clar de ce A duce la B? Cum ar putea să nu meargă?
- **Ipotezele** sunt lucruri pe care le credem deja adevărate. Precondițiile sunt lucruri care trebuie create. Sursă: [Research to Action](https://www.researchtoaction.org/glossary/).

### Greșeli frecvente în harta actorilor

- **Puterea citită din titlul funcției.** Influența reală e adesea informală, iar cei care pot bloca pe ascuns lipsesc din hartă.
- **Cei cu putere mică și interes mare sunt ignorați**, de exemplu oamenii afectați. Ei sunt cei care trăiesc eșecurile aplicației.
- **Harta scrisă o dată și uitată.**
- **Fără poziție față de cauză.** În advocacy, grila folosită e putere × susținere, nu doar putere × interes.

Surse: [OpenLearn, advocacy targets](https://www.open.edu/openlearncreate/mod/page/view.php?id=199355), [Consultation Institute](https://www.consultationinstitute.org/?p=69854).

### Ghidarea într-un wizard

- **Un pas, o decizie.** Detaliile apar exact când devin relevante (just-in-time).
- **Ghidarea esențială nu se ascunde** în expandere; doar detaliile secundare.
- **Pași cu nume clare**, ca omul să știe unde e și ce mai urmează.

Surse: [progressive disclosure, rezumat](https://octet.design/progressive-disclosure), [onboarding guidelines](https://trevorcalabro.substack.com/p/onboarding-and-in-app-help-strategy).

### Capcane specifice civic tech

Le avem deja ca alerte. Le mutăm și în ghid, ca să fie prevenite, nu doar semnalate.

- **„Build it and they will come”:** presupui că oamenii vor găsi aplicația singuri.
- **Soluția scrisă în problemă:** „nu există o aplicație care…”.
- **Aplicația ca scop:** ținta devine „oamenii folosesc aplicația”.
- **Folosirea confundată cu schimbarea:** 500 de utilizatori trecuți drept rezultat.
- **Datele publicate fără o acțiune care le folosește.**

Surse: [mySociety](https://www.mysociety.org/2015/08/13/making-an-impact/), [Sunlight](https://www.opengovpartnership.org/wp-content/uploads/2017/05/Sunlight_SocialImpOD.pdf).

---

## 2. Unde apare ghidarea

### 2.1. Ecranul „Cum funcționează”

**Când apare:**

- Pe un proiect nou, după „Am salvat linkurile” și înainte de pasul 1.
- Poate fi redeschis oricând din meniu, la „Cum funcționează”.
- Se poate sări cu „Știu deja, încep”.

**Ce conține, de sus în jos:**

1. **Titlu:** „Din idee la schimbare, în 10 pași”.
2. **Lanțul**, desenat cu cele patru niveluri și cele trei sfere (vezi 3.1).
3. **De ce merită**, trei puncte.
4. **Cum lucrăm**: AI-ul întreabă, tu răspunzi, accepți cardurile; se salvează singur; ~30 de minute; te poți opri oricând.
5. **Cele trei faze și cei 10 pași**, cu câte o propoziție fiecare.
6. **Ce iese la final**: pagina pentru grup și planul de lucru.
7. **Butonul „Încep cu pasul 1”.**

### 2.2. „Ghidul pasului”, pe fiecare pas

Un bloc sus, sub titlul pasului, deasupra conversației și a cardurilor.

| Parte | Vizibil | Lungime |
| --- | --- | --- |
| **Unde ești în lanț** (pașii 4, 7, 8 și 10) | mereu | o bandă mică cu nivelul aprins |
| **De ce contează** | mereu | 1–2 propoziții |
| **Cum să gândești** | mereu | o întrebare-cheie + 2–3 puncte |
| **Exemplu bun / slab** | deschis implicit, sub titlul „Exemple, greșeli și sfaturi” | 2 rânduri |
| **Greșeli frecvente** | deschis implicit | 3–4 puncte |
| **Sfaturi** | deschis implicit | 2–3 puncte |

**Comportament:**

- Ghidul e **deschis implicit, peste tot**: pe fiecare pas, pe desktop și pe telefon, cu tot cu exemple, greșeli și sfaturi. Nu se restrânge singur.
- Dev-ul îl poate restrânge cu „Restrânge ghidul”. Alegerea se ține per pas și per proiect, în `localStorage`; datele proiectului nu se schimbă.

### 2.3. Ghidarea la momentul potrivit (just-in-time)

- **Câmpurile din formularul cardului** au o linie de ajutor. De exemplu, Output: „ceva ce livrați voi și puteți număra”.
- **Alertele** existente trimit la greșeala din ghid: „Vezi greșeala «Folosirea ≠ schimbare»”.
- **AI-ul:** fiecare prompt de pas primește lista „Greșeli frecvente” a pasului. Când dev-ul face una, AI-ul o numește blând și pune întrebarea care o repară.

---

## 3. Conținutul

### 3.1. Ecranul „Cum funcționează”

**Din idee la schimbare, în 10 pași**

Un proiect civic tech reușește când schimbă ce fac oamenii și instituțiile, nu doar când aplicația merge. Ghidul te ajută să scrii drumul de la ce faci tu până la schimbarea pe care o vrei, ca să-l poată înțelege, critica și susține și alții.

**Lanțul (Theory of Change / Teoria schimbării):**

```
Activities      →  Outputs        →  Outcomes                       →  Impact
Activități         Realizări          Rezultate                         Impact
ce faceți          ce livrați         ce fac alții diferit               cum arată lumea
                   (numărabil)        (scurt → intermediar → lung)       pe termen lung
└──── Sphere of control ────┘   └──── Sphere of influence ────┘   └─ Sphere of interest ─┘
      Sferă de control                Sferă de influență              Sferă de interes
```

Citit cu „ca să”: **facem** X **ca să livrăm** Y, **ca** Z să facă ceva diferit, **astfel încât**, pe termen lung, lumea să arate altfel.

Construim drumul **invers**: pornim de la schimbarea pe care o vrei și coborâm până la ce poți face săptămâna asta.

**De ce merită:**

- **Vezi unde se termină controlul tău.** Aplicația e în mâna ta. Ce fac primăria, presa sau oamenii, nu. Acolo ai nevoie de aliați, nu de mai mult cod.
- **Prinzi devreme ipotezele care te pot costa luni de muncă.** Le testezi în două săptămâni, fără cod.
- **Grupul înțelege ce faci și unde poate ajuta.** Pagina finală arată drumul și rolurile care îți lipsesc.

**Cum lucrăm:**

- AI-ul pune întrebări și propune carduri. Tu le accepți, le editezi sau le refuzi.
- Se salvează singur.
- Durează ~30 de minute și te poți opri oricând.
- AI-ul nu inventează: dacă nu știi ceva, notează „de aflat” și mergi mai departe.

**Cele trei faze:**

1. **Contextul:** proiectul și echipa, problema, ce există deja.
2. **Teoria schimbării:** impactul și rezultatele pe termen lung, actorii, relațiile, drumul schimbării, ipotezele.
3. **Organizarea:** oamenii de care ai nevoie, activitățile.

**Ce iese:**

- o pagină publică pentru grupul de civic tech;
- un plan de lucru pe următoarele luni;
- un link privat de editare, ca să revii când afli ceva nou.

### 3.2. Ghidul fiecărui pas

Format: **De ce contează** · **Cum să gândești** (întrebarea-cheie + puncte) · **Exemplu** (✓ bun / ✗ slab) · **Greșeli frecvente** · **Sfaturi**.

Exemplele vin dintr-un proiect fictiv, „Harta gropilor din Cluj”, ca să nu se confunde cu proiectul dev-ului.

---

#### Pasul 1 — Proiectul și echipa

- **De ce contează:** Harta pornește de la ce ai cu adevărat: ce merge deja, ce urmează și câte ore aveți. Un plan care ignoră cele 4 ore pe săptămână ale tale nu va fi urmat.
- **Cum să gândești:** *„Ce poate face un om cu aplicația mea azi, și ce vreau să poată face peste 3 luni?”*
  - Pune separat funcțiile care merg deja și pe cele care urmează.
  - Scrie funcția ca ce face omul, nu ca o tehnologie.
  - Orele sunt orele dintr-o săptămână obișnuită, nu dintr-una bună.
- **Exemplu:**
  - ✓ „Cetățenii pun o groapă pe hartă cu o poză; sesizarea pleacă automat la primărie.”
  - ✗ „Hartă interactivă cu React și Leaflet.”
- **Greșeli frecvente:**
  - Funcții scrise ca obiective („creștem transparența”). Acelea vin la pasul 4.
  - Ore supraestimate: 10 pe săptămână, când realist sunt 3.
  - „Echipa” trecută drept „eu + voluntari”, fără nume și fără ore.
- **Sfaturi:**
  - Lipește lista de funcții din README sau din issues.
  - Dacă nu știi încă cine e în echipă, scrie doar ce știi. Rolurile lipsă vin la pasul 9.

#### Pasul 2 — Problema

- **De ce contează:** Totul se agață de problemă. O problemă vagă face vagi toți pașii de după. O problemă clară îți spune pe cine să întrebi și ce să măsori.
- **Cum să gândești:** *„Cine anume pățește ce, azi, și de unde știu?”*
  - Numește oamenii („părinții din Sectorul 3”), nu „cetățenii”.
  - Descrie ce se întâmplă pas cu pas și ce îi costă: timp, bani, un drept.
  - Spune de unde știi: discuții, date, o cerere 544, un articol.
- **Exemplu:**
  - ✓ „Locuitorii din Mănăștur raportează gropile prin telefon; nu primesc număr de înregistrare și nu află dacă s-a reparat. Știu din 12 discuții la asociația de proprietari.”
  - ✗ „Nu există o aplicație pentru raportat gropi.”
- **Greșeli frecvente:**
  - **Soluția în problemă:** „nu există o aplicație care…”. Lipsa aplicației nu e problema oamenilor.
  - Problema prea mare („corupția”, „birocrația”). Alege bucata pe care o atingi tu.
  - Singura dovadă e experiența ta. E un început, dar verifică și cu alții.
- **Sfaturi:**
  - Întreabă „de ce?” de 3 ori, până ajungi la cauza care contează.
  - Vorbește săptămâna asta cu 3 oameni care au problema. E cea mai ieftină dovadă.

#### Pasul 3 — Ce există deja

- **De ce contează:** Altcineva a încercat probabil ceva asemănător. Poți refolosi, colabora sau învăța din ce n-a mers. Și grupul te va întreba exact asta.
- **Cum să gândești:** *„Cine a mai încercat asta, aici sau în altă țară, și ce fac eu altfel?”*
  - Caută și soluții care nu sunt cod: tabelele Excel ale unui ONG, un grup de Facebook, o linie telefonică.
  - Spune concret diferența, nu „mai bun” sau „mai modern”.
- **Exemplu:**
  - ✓ „FixMyStreet (UK) face raportarea; diferența: noi trimitem sesizarea ca cerere oficială, cu număr de înregistrare.”
  - ✗ „Nu există nimic asemănător.” (fără să fi căutat)
- **Greșeli frecvente:**
  - „Primul din lume” fără căutare. Aproape niciodată nu e adevărat.
  - Ignori soluțiile ne-tech pe care oamenii le folosesc deja.
  - Diferența e doar tehnologică, nu pentru utilizator.
- **Sfaturi:**
  - Caută în Civic Tech Field Guide, pe GitHub și la Code for Romania.
  - Scrie-le celor care au făcut ceva similar. Pot deveni parteneri.

#### Pasul 4 — Impact și rezultate pe termen lung

- **Unde ești în lanț:** **Long-term outcomes / Rezultate pe termen lung** și **Impact / Impact**.
- **De ce contează:** E destinația. Restul hărții se construiește înapoi de aici, deci o destinație vagă dă un drum vag.
- **Cum să gândești:** *„Dacă reușim, ce face cineva anume diferit peste 1–3 ani, și ce aș vedea concret?”*
  - **Rezultat pe termen lung (long-term outcome):** un actor numit + un comportament nou + un indicator.
  - **Impact:** cum arată lumea pe termen lung pentru oameni. Contribuim la el, nu îl controlăm.
  - Un card, o schimbare.
- **Exemplu:**
  - ✓ „Primăria Cluj repară gropile raportate în 15 zile. Indicator: 80% din sesizări rezolvate în termen.”
  - ✗ „Oamenii folosesc aplicația.” · „Mai multă transparență.”
- **Greșeli frecvente:**
  - **Aplicația ca scop:** folosirea aplicației e un output, nu un outcome.
  - Ținte vagi („transparență”, „implicare civică”), fără cine și fără ce.
  - Două schimbări într-un card („repară mai repede **și** publică bugetul”).
  - Impact atât de larg încât nu se mai leagă de nimic („o Românie mai bună”).
- **Sfaturi:**
  - Testul jurnalistului: ce ar putea scrie un jurnalist peste 2 ani dacă ai reușit?
  - Maximum 3 rezultate pe termen lung. Mai multe înseamnă de obicei că nu ai ales.

#### Pasul 5 — Actorii

- **Unde ești în lanț:** actorii sunt cei ale căror schimbări formează **outcomes / rezultatele**.
- **De ce contează:** Schimbarea se întâmplă prin oameni și instituții. Dacă nu știi cine decide și cine poate bloca, nu știi pe cine să convingi.
- **Cum să gândești:** *„Cine suferă, cine decide, cine are datele, cine pierde dacă reușim, cine e lăsat pe dinafară?”*
  - Numește instituția sau grupul precis: departamentul, nu „statul”.
  - Puterea și poziția, cinstit. „Nu știu încă” e un răspuns bun.
- **Exemplu:**
  - ✓ „Direcția de Drumuri a Primăriei Cluj: putere mare, poziție necunoscută. Decide ordinea reparațiilor.”
  - ✗ „Autoritățile.”
- **Greșeli frecvente:**
  - Actori generici („autoritățile”, „comunitatea”).
  - Puterea citită din funcție. Uneori un consilier sau un șef de birou decide de fapt.
  - Uiți oamenii fără putere, dar afectați: vârstnici, oameni fără smartphone.
  - Pui doar aliați. Cine pierde ceva te poate bloca.
- **Sfaturi:**
  - Întreabă: „Cine ar fi deranjat dacă reușim?”
  - Ai voie să ai actori cu poziție „necunoscută”; îi afli la pasul 8.

#### Pasul 6 — Relațiile

- **De ce contează:** Relațiile arată pârghiile: pe cine poți influența ca să ajungi la cine decide. De aici vin și rolurile de la pasul 9.
- **Cum să gândești:** *„Cine poate face pe cine să se miște, prin ce anume?”*
  - Urmărește trei fire: banii, datele, deciziile.
  - Spune direcția (cine acționează asupra cui) și cum („publică articole”, „aprobă bugetul”).
- **Exemplu:**
  - ✓ „Consiliul Local → decide → Direcția de Drumuri: aprobă bugetul de reparații.”
  - ✗ „Toți se influențează reciproc.”
- **Greșeli frecvente:**
  - Totul e „influențează”. Alege tipul precis: decide, finanțează, blochează, are datele.
  - Săgeata pe dos (cine primește datele vs. cine le are).
  - Relații inventate ca să arate harta plină.
- **Sfaturi:**
  - Pornește de la actorul care decide rezultatul pe termen lung și întreabă cine are acces la el.

#### Pasul 7 — Drumul schimbării (Outcomes și Outputs)

- **Unde ești în lanț:** **Short-term / Intermediate outcomes**, adică rezultatele pe termen scurt și intermediare, și **Outputs / Realizări**.
- **De ce contează:** E inima hărții. Leagă ce livrezi de schimbarea pe care o vrei. Fără drum, aplicația și schimbarea sunt două insule.
- **Cum să gândești:** *„Ca [rezultatul pe termen lung] să se întâmple, ce trebuie să facă cineva diferit chiar înainte?”* Repetă până ajungi la ceva ce livrați voi.
  - **Outcome / Rezultat** = un actor + un verb de comportament („jurnaliștii scriu…”).
  - **Output / Realizare** = ceva livrat de voi, numărabil („clasament lunar publicat”).
  - Citește drumul înainte, cu „ca să…”. Dacă sună a salt, lipsește un pas.
- **Exemplu:**
  - ✓ Output „Raport lunar cu gropile nereparate pe cartiere” → „Consilierii locali întreabă în ședință de cartierele restante” → „Direcția de Drumuri prioritizează gropile vechi”.
  - ✗ „Aplicația” → „Primăria repară toate gropile.”
- **Greșeli frecvente:**
  - **Folosirea luată drept schimbare:** „500 de utilizatori” e un output. Ce fac ei diferit după?
  - **Saltul:** de la aplicație direct la lege. Între ele sunt oameni care trebuie să facă ceva.
  - **Mai multe schimbări într-un card:** „Guvernul adoptă și aplică.” Fac două carduri.
  - **Un drum fără nicio realizare la bază:** nu se vede ce faceți voi.
  - Datele publicate fără cineva care să le folosească.
- **Sfaturi:**
  - Fiecare card e o propoziție cu un singur verb.
  - E normal ca unele drumuri să nu treacă prin aplicație: o întâlnire sau o scrisoare pot fi realizări.

#### Pasul 8 — Ipotezele (Assumptions)

- **Unde ești în lanț:** **ipotezele** sunt pe săgețile dintre niveluri.
- **De ce contează:** Planurile cad la săgeți, nu la cutii. O ipoteză greșită descoperită acum costă două săptămâni; descoperită după lansare costă un an.
- **Cum să gândești:** *„De ce ar duce A la B? Ce trebuie să fie adevărat ca asta să meargă?”*
  - Tu spui primul ce ți se pare nesigur, măcar două lucruri.
  - Pentru fiecare: un test ieftin, fără cod, în două săptămâni, și ce rezultat ți-ar spune că ai greșit.
- **Exemplu:**
  - ✓ „Ipoteză: Direcția de Drumuri ține cont de presă. Test: întreb 2 jurnaliști locali dacă au mai scris despre gropi și ce s-a întâmplat după.”
  - ✗ „Test: lansăm aplicația și vedem.”
- **Greșeli frecvente:**
  - Testul e să construiești. Asta e cel mai scump test posibil.
  - Alegi doar ipoteze sigure, ca să treacă testul.
  - Ipoteza spusă ca speranță („o să le placă”), nu ca afirmație care poate fi falsă.
- **Sfaturi:**
  - **Pre-mortem:** e anul viitor și proiectul n-a mers. De ce? Primele trei motive sunt ipotezele tale riscante.
  - O cerere pe Legea 544 sau 5 discuții sunt teste excelente.

#### Pasul 9 — Oamenii de care ai nevoie

- **De ce contează:** Un dev singur nu poate face lobby, drept și organizare de comunitate. Harta îți arată ce roluri lipsesc ca drumul să meargă.
- **Cum să gândești:** *„Ce realizări sau rezultate din hartă nu poate duce nimeni din echipă?”*
  - Fiecare rol vine dintr-un loc anume din hartă: un actor de convins, o realizare de livrat.
  - Rolul poate fi un partener (un ONG), nu neapărat un om nou.
- **Exemplu:**
  - ✓ „Jurist pe drept administrativ, 2 ore/lună: verifică formularul de sesizare ca să fie cerere oficială.”
  - ✗ „Voluntari.”
- **Greșeli frecvente:**
  - Cauți doar încă un dev.
  - Rol vag, fără ce face și fără cât timp.
  - Uiți că un ONG partener poate aduce rolul gata făcut.
- **Sfaturi:**
  - Cere puțin și concret („2 ore pe lună”). Oamenii spun mai ușor da.

#### Pasul 10 — Activities / Activități

- **Unde ești în lanț:** **Activities / Activități**, începutul drumului.
- **De ce contează:** Transformă harta în ce faci în săptămânile următoare. Fiecare activitate produce o realizare din hartă, altfel e muncă fără direcție.
- **Cum să gândești:** *„Ce fac săptămâna asta ca să existe prima realizare?”*
  - Fiecare activitate e legată de o realizare (output).
  - Pune și activitățile fără cod: testele de la pasul 8, discuții, căutatul de oameni.
  - Funcțiile care merg deja nu sunt activități; sunt deja realizări.
- **Exemplu:**
  - ✓ „Sun la Direcția de Drumuri să aflu cum primesc sesizările (pentru: sesizare oficială cu număr).”
  - ✗ „Refactor la tot frontend-ul.” (nu duce la nicio realizare din hartă)
- **Greșeli frecvente:**
  - Doar cod.
  - Prea multe deodată: 15 activități la „început”.
  - Funcții care nu ajută la nicio realizare, păstrate din inerție.
- **Sfaturi:**
  - Maximum 3 activități în lucru deodată.
  - Prima activitate trebuie să încapă în săptămâna asta.

### 3.3. Linii de ajutor pe câmpuri (just-in-time)

| Câmp | Linie de ajutor |
| --- | --- |
| Problemă | „Cine anume, ce pățește azi, ce îl costă. Fără «nu există o aplicație».” |
| Dovezi | „Discuții, date, o cerere 544, un articol. Câte una pe rând.” |
| Long-term outcome / Rezultat pe termen lung | „Un actor + ce face diferit. Nu «folosesc aplicația».” |
| Indicator | „Ce ai număra sau vedea: un procent, un termen, un document.” |
| Impact | „Cum arată lumea pentru oameni, pe termen lung.” |
| Actor · nume | „Instituția sau grupul precis, nu «autoritățile».” |
| Relație · notă | „Cum anume: prin buget, articole, date, vot.” |
| Outcome / Rezultat | „Un actor + un verb de comportament.” |
| Output / Realizare | „Ceva livrat de voi, numărabil.” |
| Assumption / Ipoteză | „De ce ar duce asta la pasul următor? Scrie-o ca afirmație care poate fi falsă.” |
| Test | „Fără cod, în 2 săptămâni: ce faci, cu cine, ce rezultat te-ar contrazice.” |
| Rol · motiv | „Ce face concret și pentru ce loc din hartă.” |
| Activitate | „Pentru ce realizare? Încape în 1–2 săptămâni?” |

---

## 4. Integrare tehnică (propusă)

- **Conținutul:** `src/lib/steps/guides.ts`, un obiect `GUIDES[stepId]` cu `why`, `think` (întrebare + puncte), `good`, `bad`, `mistakes[]`, `tips[]`, `chainLevel?`, plus `INTRO` și `FIELD_HELP`. E o singură sursă pentru UI și prompturi.
- **UI:**
  - componentă `IntroScreen`, după KeepLinks;
  - `StepGuide` în `StepScreen`, sub titlu;
  - `CardEditor` afișează `FIELD_HELP`;
  - „Cum funcționează” în meniu.
- **Prompturi:** `buildMessages` adaugă în promptul pasului secțiunea „Greșeli frecvente la acest pas” din `GUIDES`. AI-ul le numește blând și pune întrebarea care le repară.
- **Teste:**
  - fiecare pas are ghid complet;
  - ghidul e deschis implicit, cu exemplele, greșelile și sfaturile vizibile;
  - intro-ul apare o singură dată pe proiect nou și se redeschide din meniu;
  - e2e actualizat.

Merge implementat împreună cu teoria schimbării v2, pentru că pașii 4, 7 și 10 își schimbă conținutul.
