# Teoria schimbării în Ghidul de pornire: acțiuni → rezultate → schimbări → impact

**Pe scurt:** aplicația are deja aproape toate piesele unui lanț de rezultate, dar le amestecă. Precondițiile de azi conțin și lucruri pe care le livrează echipa („Platforma lansează o campanie”), și schimbări la alți oameni („Guvernul reglementează penalizări”). Propunerea:

- Fiecare pas din drum primește un **nivel**: *ce livrăm* sau *ce se schimbă*.
- Backlog-ul devine nivelul *ce facem*.
- Direcția devine *impactul*.
- Totul se afișează ca o hartă cu patru benzi, citită de la stânga la dreapta, „ca să…”.

Nu adăugăm pași în wizard și nu depășim 30 de minute.

Machetă interactivă: [mockups/harta-schimbarii.html](mockups/harta-schimbarii.html).

---

## 1. Ce spune practica

### Lanțul de rezultate

Practica folosește un lanț de rezultate cu patru niveluri. Este folosit în logic models, în fondurile UE și în OECD DAC.

| Nivel | Ce e | Cine controlează | Exemplu civic tech |
| --- | --- | --- | --- |
| **Activități** | Ce face echipa | Noi, complet | Construim feed-ul public, organizăm un roundtable |
| **Rezultate directe** (outputs) | Ce livrează echipa, ce se poate număra | Noi, aproape complet | Clasament lunar publicat, 500 de cereri trimise prin platformă |
| **Schimbări** (outcomes) | Ce fac **alți oameni** diferit, pe termen scurt sau mediu | Doar influențăm | Jurnaliștii folosesc clasamentul în articole; instituțiile restanțiere răspund mai repede |
| **Impact** | Starea lumii pe termen lung | Doar contribuim | Cetățenii au informațiile de care au nevoie |

### Ce aduce teoria schimbării peste lanțul simplu

O teorie a schimbării adaugă trei lucruri la lanțul simplu:

1. **Se construiește înapoi**, de la schimbare spre acțiuni, prin precondiții („ce trebuie să fie adevărat înainte?”). Aplicația face deja asta la pasul 7.
2. **Presupunerile de pe săgeți** sunt explicite: de ce ar duce A la B. Aplicația are deja câmpul `assumption` și pasul de ipoteze riscante.
3. **Nu e strict liniară.** Mai multe drumuri duc la aceeași schimbare, iar o schimbare are mai multe cauze.

Surse: [Candid](https://learningforfunders.candid.org/?p=693), [OpenGrants](https://opengrants.io/encyclopedia/evidence/theory-of-change/), [UNM Evaluation Lab](https://evallab.unm.edu/for-organizations/learning-center/lm_toc_2_15.pdf).

### Sferele de control (Outcome Mapping)

Outcome Mapping pune lanțul pe trei sfere:

- **Control:** activități și rezultate directe.
- **Influență:** schimbări de comportament ale actorilor cu care lucrezi direct.
- **Interes:** impactul, adică schimbări de stare.

E cel mai intuitiv mod de a arăta unde se termină puterea echipei. Pentru un dev civic, conceptul cheie este că schimbările se întâmplă la alții, nu în aplicație.

Surse: [Hearn / ODI](https://www.theoryofchange.org/wp-content/uploads/toco_library/pdf/2001-Hearn-Presentation-Outcome-Mapping-Building-Learning.pdf), [CISU](https://cisu.dk/media/h4ig3r20/cisu-tool-paper-outcome-mapping.pdf).

### Capcana specifică civic tech: rezultatele directe confundate cu schimbările

Rezultatele directe sunt ușor confundate cu schimbările:

- mySociety avertizează că fără gândire concretă despre impact, rezultatele directe sunt luate drept schimbări.
- Datele deschise singure rareori schimbă ceva fără o acțiune care să le urmeze.
- Sunlight recomandă ca ținta să fie schimbările pe mediu, adică comportamentul instituțiilor și al oamenilor, nu numărul de utilizatori.

„500 de utilizatori” e un rezultat direct. „Primăria răspunde în 30 de zile” e o schimbare.

Surse: [mySociety, Making an impact](https://www.mysociety.org/2015/08/13/making-an-impact/), [Sunlight, Social impact of open data](https://www.opengovpartnership.org/wp-content/uploads/2017/05/Sunlight_SocialImpOD.pdf), [TICTeC 2018](https://tictec.mysociety.org/tictec-archive/2018/presentation/problem-impact-measurement.html), [Chatwin & Mayne, JeDEM 2020](https://jedem.org/index.php/jedem/article/view/598/504).

### Afișare

Diagramele mari intimidează pe cine n-a participat la ele. Recomandările din practică:

- descrieri atașate pe noduri și săgeți;
- presupunerile vizibile;
- un text narativ alături de diagramă.

Surse: [Kumu: 6 principles](https://blog.kumu.io/6-principles-for-building-effective-theories-of-change-and-the-kumu-features-that-make-it-possible-af71857cea9f), [Learning for Sustainability](https://learningforsustainability.net/?p=9594).

[TASO](https://toc-builder.taso.org.uk/help) are două vederi: o vedere de bază, la nivel înalt, și una detaliată.

**Concluzie pentru noi:** un drum pe rând, nu toată rețeaua deodată. Fiecare drum are și o propoziție „ca să…”.

### Terminologie (decis: termenii exacți ToC, engleză / română)

În interfață folosim termenii consacrați ai teoriei schimbării, în engleză și română, ca să se potrivească cu ce citesc finanțatorii și grupul.

Pentru română am luat echivalentele oficiale din fondurile UE: „indicatori de **realizare**” pentru outputs și „indicatori de **rezultat**” pentru outcomes. Termenii au și definiția OECD DAC: outputs sunt produse, bunuri și servicii livrate; outcomes sunt efecte pe termen scurt și mediu; impact e efectul pe termen lung ([INTRAC](https://intrac.org/wpcms/wp-content/uploads/2024/11/Outputs-outcomes-and-impact.pdf)).

| Etichetă în interfață | Ce înseamnă (tooltip) | În date |
| --- | --- | --- |
| **Impact / Impact** | Schimbarea de stare pe termen lung la care contribuim | `direction` |
| **Long-term outcomes / Rezultate pe termen lung** | Cine face ce diferit, peste 1–3 ani | `targetChanges` |
| **Intermediate outcomes / Rezultate intermediare** | Schimbări de comportament în 3–12 luni | `preconditions`, `level: outcome`, `stage: mid` |
| **Short-term outcomes / Rezultate pe termen scurt** | Primele schimbări de comportament, 0–3 luni | `preconditions`, `level: outcome`, `stage: start` |
| **Outputs / Realizări** | Ce livrează echipa: produse, servicii, evenimente, numărabile | `preconditions`, `level: output` |
| **Activities / Activități** | Ce face echipa | `backlog` |
| **Assumptions / Ipoteze** | De ce duce un nivel la următorul | `assumption`, `risky`, `test` |
| **Indicators / Indicatori** | Cum vedem că s-a întâmplat | `signal` |
| **Sphere of control / Sferă de control** | Activități și realizări | fundalul benzilor 1–2 |
| **Sphere of influence / Sferă de influență** | Rezultatele, adică comportamentul altora | fundalul benzilor 3–5 |
| **Sphere of interest / Sferă de interes** | Impactul | fundalul benzii 6 |

Fiecare etichetă are un tooltip „ce înseamnă” cu o propoziție simplă, pentru dev-ii care n-au mai lucrat cu ToC.

---

## 2. Unde suntem azi (date existente)

| Nivel în lanț | Ce avem acum | Problema |
| --- | --- | --- |
| Impact | `direction` (o propoziție) | E OK; doar numele „Direcția” nu spune „impact” |
| Schimbări mari, pe termen lung | `targetChanges` (max 3, cu `signal`) | E OK |
| Schimbări pe termen scurt și mediu | `preconditions` cu `stage` start/mid | Amestecă schimbările cu rezultatele directe |
| Rezultate directe | nimic explicit; parțial `preconditions` cu `coveredByApp` sau cu un membru al echipei ca actor; parțial `features` | Nu există ca nivel |
| Activități | `backlog` (feature / test / organizing), legat de precondiții prin `preconditionId` | E OK, doar nu se numește așa |

Exemplu din proiectul Implicare Civica:

- „Platforma asumă și lansează o campanie cetățenească” e un **rezultat direct**: echipa o livrează.
- „Guvernul reglementează penalizări” e o **schimbare**: alt actor face ceva diferit.

Azi amândouă stau în aceeași bandă, „Început / Mediu”, deci harta nu arată unde se termină controlul echipei.

---

## 3. Modelul de date (v2, compatibil cu datele vechi)

Schimbări mici, toate opționale. Proiectele vechi se citesc fără migrare.

### 3.1. Precondițiile primesc un nivel

```ts
preconditions[]: {
  …câmpurile de azi…,
  level?: 'output' | 'outcome',   // ce livrăm / ce se schimbă
  signal?: string,                  // cum vedem că s-a întâmplat (număr, termen)
}
```

Funcție pură `levelOf(p, pre)` pentru datele vechi fără `level`:

- `output` dacă `actorId` e un membru al echipei sau dacă `coveredByApp` e true.
- altfel `outcome`.

`stage` rămâne valabil doar pentru schimbări și le împarte pe termen scurt (start) și mediu (mid). Pentru rezultatele directe, `stage` arată doar când le livrăm.

### 3.2. Celelalte niveluri

- **Impact** = `direction`. Se schimbă doar eticheta în interfață.
- **Schimbări mari** = `targetChanges`, cu `signal`. Rămân cum sunt.
- **Activități** = `backlog`. Fiecare element se leagă de un rezultat direct prin `preconditionId`. Funcțiile aplicației apar ca activități („construim X”) dacă urmează, sau ca parte dintr-un rezultat livrat („merge deja”).

### 3.3. Muchiile

Muchiile rămân `leadsTo`: rezultat → schimbare → … → schimbare mare. Presupunerea stă pe nodul din care pleacă săgeata (`assumption`). Așa se citește și în hartă: eticheta „pentru că…” e pe săgeată.

Un nod poate avea un singur `leadsTo`. Asta e suficient pentru v2. Mai multe ținte per nod ar fi o extensie ulterioară.

---

## 4. Wizard-ul: fără pași noi, doar alte întrebări

| Pas | Azi | v2 |
| --- | --- | --- |
| 4. Schimbarea țintă | Direcție + 1–3 schimbări | **„Impactul și schimbările mari”.** Impactul = „cum arată lumea dacă reușiți, peste 5–10 ani”. Schimbările mari = cine face ce diferit, cu semn. |
| 7. Precondițiile | Lanț înapoi, de 2–3 ori | **„Drumul schimbării”.** Tot înapoi, dar AI-ul știe nivelurile (vezi mai jos). |
| 8. Ipotezele riscante | Precondiții riscante + test | Neschimbat. Presupunerile apar pe săgeți. |
| 10. Backlog | Funcții + test + organizare | **„Activities / Activități”.** Fiecare activitate se leagă de realizarea (output) pe care o produce. |

### Cum lucrează AI-ul la pasul 7

1. Ia prima schimbare mare și întreabă: „Ca [schimbarea] să se întâmple, cine trebuie să facă ce diferit înainte?” Răspunsul devine o **schimbare** (`level: outcome`) cu un actor din hartă.
2. Repetă o dată sau de două ori, până răspunsul devine ceva ce face echipa sau aplicația. Atunci întreabă: „Ce livrați concret ca să pornească asta? Cum îl numărați?” Răspunsul devine un **rezultat direct** (`level: output`) cu un `signal` numărabil.
3. Fiecare drum se termină în cel puțin un rezultat direct. Dacă dev-ul sare de la o funcție a aplicației direct la schimbarea mare, AI-ul întreabă ce face cineva diferit între ele.
4. **Regula de formulare:**
   - un rezultat direct e ceva livrat, cu număr („Clasament lunar publicat cu rata de răspuns a 300 de instituții”);
   - o schimbare are un actor și un verb de comportament („Jurnaliștii folosesc clasamentul în articole”).
5. **Capcana civic tech:** „oamenii folosesc aplicația” nu e o schimbare. E un rezultat direct. AI-ul întreabă: „Și ce fac ei diferit după ce o folosesc?”

În conversație AI-ul folosește termenii în română (activități, realizări, rezultate, impact, ipoteze, indicatori), iar prima dată când îi folosește îi explică într-o propoziție („o realizare e ceva ce livrați voi și puteți număra”). Regula din promptul de sistem care interzicea „outcome” și „indicatori” se înlocuiește cu asta.

---

## 5. Gărzi (alerte care nu blochează)

Alerte noi în `computeCodeAlerts`, pe stilul celor de azi:

| Cod | Când | Mesaj |
| --- | --- | --- |
| `no_output` | Un drum spre o schimbare mare nu are niciun rezultat direct la bază | „Ce livrați voi ca să pornească drumul spre «X»?” |
| `output_without_activity` | La pasul 10, un rezultat direct nu are nicio activitate legată | „Cine face și ce, ca să existe «X»?” |
| `usage_as_change` | O schimbare care sună a folosire („folosesc aplicația”, „utilizatori”, „descărcări”) | „Folosirea aplicației e un rezultat direct. Ce fac oamenii diferit după aceea?” |
| `team_as_actor` | O schimbare al cărei actor e un membru al echipei | „Asta faceți voi, deci e o realizare (output). O mut la «Outputs / Realizări»?” (cu buton de mutare) |

`magic_leap`, `build_and_they_come` și `orphan_feature` rămân. `orphan_feature` devine „funcție care nu ajută la niciun rezultat direct”.

---

## 6. Afișarea

### 6.1. Harta schimbării (editor și pagina publică)

**Ecran lat: patru benzi, de la stânga la dreapta.**

```
 SPHERE OF CONTROL ───────────┐  SPHERE OF INFLUENCE ───────────────────────────┐  SPHERE OF INTEREST
 Activities  →  Outputs         │  Short-term → Intermediate → Long-term outcomes │  Impact
 Activități     Realizări       │  Rezultate: scurt → intermediar → lung        │  Impact
```

- **Sferele:** benzile au trei fundaluri discrete: Sphere of control / Sferă de control, Sphere of influence / Sferă de influență, Sphere of interest / Sferă de interes. Arată fără explicații unde se termină puterea echipei.
- **Un drum pe rând:** deasupra hărții sunt butoane cu schimbările mari („Instituțiile răspund la termen”, „Răspunsurile sunt complete”, „Tot”). Implicit e selectat primul drum. Așa rămâne lizibilă și o hartă cu 20 de noduri.
- **Clic pe un card** evidențiază tot ce duce la el și tot ce pornește din el. Restul se estompează.
- **Pe săgeți:** „pentru că…”, cu presupunerea. Cele riscante sunt chihlimbar ⚠ și au testul la clic.
- **Cardul unei schimbări** arată actorul ca etichetă: „Jurnaliștii”, „Guvernul”.
- **Cardul unui rezultat direct** arată semnul numărabil și funcțiile care îl produc („prin: Feed public · Merge deja”).

**Telefon:** o singură coloană, de sus în jos, în ordinea în care se întâmplă lucrurile. Între carduri stă conectorul **„ca să…”**. Pe telefon se citește mai firesc de sus în jos decât azi, când pagina publică se citește de jos în sus.

### 6.2. Narrative / Narațiunea schimbării („ca să…”)

Sub fiecare drum apare o propoziție generată din date, fără AI:

> **Facem** un clasament lunar cu rata de răspuns → **ca** jurnaliștii să scrie despre instituțiile restanțiere → **ca** instituțiile să răspundă mai repede → **astfel încât** cererile pe Legea 544 să primească răspuns la termen → **pe termen lung,** cetățenii au informațiile de care au nevoie.

Practica recomandă să pui textul narativ lângă diagramă. Această propoziție e și „pitch-ul” bun pentru grup.

### 6.3. Unde apare

- **Pagina publică:** înlocuiește „Cum credem că se produce schimbarea”. Implicit e harta cu primul drum, iar pe telefon e varianta verticală.
- **Editor, pașii 4, 7 și 10:** în coloana din dreapta, sub cardurile pasului, apare o mini-hartă care se completează pe măsură ce accepți carduri. Dev-ul vede banda care încă e goală, de exemplu „Outputs / Realizări: nimic încă”.
- **Rezumat (Overview):** harta completă cu „Tot”.

### 6.4. Accesibilitate

- Harta e o listă ordonată de drumuri, fiecare cu nodurile în ordine. Săgețile sunt doar decor (`aria-hidden`), iar presupunerea e text în listă.
- Evidențierea drumului funcționează și din tastatură (Enter pe card).
- Culorile nu sunt singurul semn: banda are titlu, iar riscul are ⚠ și text.

---

## 7. Plan de implementare (propus)

| Faza | Ce | Cât |
| --- | --- | --- |
| A | `level` și `signal` în schemă, `levelOf()`, funcție `pathsOf(p)` care întoarce drumurile; teste | mic |
| B | Prompturile pașilor 4, 7 și 10 cu niveluri; `level` validat în `stepTurn`; card editor cu „Output / Realizare” și „Outcome / Rezultat” | mediu |
| C | Componenta `ChangeMap`: benzi, selector de drum, evidențiere, versiune verticală; pagina publică | mare |
| D | Mini-harta în editor; cele patru alerte noi | mediu |
| E | Rulare de evaluare pe răspunsurile reale și pe 5 scenarii, apoi deploy | mic |

**Decizii deschise pentru tine:**

1. ~~Etichetele~~ — **decis:** termenii exacți ToC, engleză / română (vezi „Terminologie”).
2. Pagina publică: harta cu un drum implicit, sau direct „Tot”?
3. Proiectele vechi: le clasificăm automat (`levelOf`), sau AI-ul le reclasifică la următoarea deschidere a pasului 7?
