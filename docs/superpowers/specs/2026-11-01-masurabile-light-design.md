# Măsurabile light: pasul „Cum vedem dacă merge”

Data: 2026-11-01. Stare: propunere, de aprobat. Bazat pe [raportul de research](../../../../reports/Structura%20măsurabilelor%20în%20impact%20social.md).

## De ce

În managementul de impact contează foarte mult ce măsori. Acum, aplicația are doar câmpul `signal`, o frază liberă opțională la pașii din drum, recomandată la rezultatele pe termen lung. Ea amestecă ce urmărești cu cifra pe care o vrei și nu întreabă niciodată de unde vin datele, cine le scoate sau ce faci cu ele.

Vrem o variantă pentru începători, pe care s-o testăm și s-o îmbunătățim. Cerința principală a proprietarului proiectului: **răspunsurile trebuie să fie specifice și gândite, nu completate doar ca să treacă prin pași**. O formă puțin mai complicată e acceptabilă dacă rămâne light.

Oamenii trec prin pași din două motive: răspunsul nu îi costă nimic și, dacă AI-ul îl scrie, ei doar apasă „acceptă”. Designul atacă ambele.

## Ideea

Un singur pas nou, cu **trei măsuri, dintre care una lucrată bine**:

| Măsură | Se leagă de | Ce cere |
|---|---|---|
| **Măsura-cheie** (`key`) | un pas din drum, de obicei primul rezultat care depinde de altcineva | Forma completă, mai jos |
| **Ce livrăm** (`delivery`) | o realizare din drum | Ce urmărim, de unde luăm datele |
| **Schimbarea mare** (`longTerm`) | un rezultat pe termen lung | Ce urmărim, de unde luăm datele |

Numărul 3 și împărțirea sunt decizii de design pentru test. Research-ul nu dă un număr dovedit de indicatori.

## Obiective

- O echipă de începători ajunge la o măsură-cheie specifică proiectului ei, în circa 8 minute.
- Rezultatul arată ce se urmărește, de unde vin datele, ce e „suficient” și ce face echipa dacă iese sub.
- Lipsa datelor e o stare onestă și vizibilă, nu un zero și nu o cifră inventată.
- Pasul ajunge la toate proiectele, fără comutator per proiect, fiindcă lista statică de pași ar cere multă muncă în plus. Scoaterea după test înseamnă un revert plus readucerea numerelor de pași din alerte.

## Ce nu facem acum

- Actualizarea valorilor în timp, istoric, grafice, procente de progres.
- Scor agregat sau culori de eșec.
- Defalcări pe grupuri, bibliotecă de indicatori, praguri de referință.
- Cadru logic și export pentru finanțatori.
- Verificări automate deterministe la scriere. Corecțiile le face facilitatorul AI în conversație.

## Ce ar însemna eșec, chiar dacă merge tehnic

- AI-ul scrie definiția, pragul sau decizia, iar echipa doar acceptă.
- Valori inventate: un „azi” sau un prag pe care echipa nu l-a spus.
- Conversația devine interogatoriu și voluntarii renunță.
- Pagina publică face un proiect mic să pară că a eșuat pentru că încă nu are date.
- Proiectele existente nu se mai deschid sau nu se mai salvează.

## Pasul nou

- Id: `measures`. Titlu: „Cum vedem dacă merge”. Faza: Teoria schimbării. Durată: 8 minute.
- Vine după Ipoteze, ca pasul 9. Rolurile devin pasul 10, iar Activitățile pasul 11.
- Rezumat în listă: „O măsură gândită bine și două simple”.

### Conversația

Facilitatorul pune o singură întrebare pe rând, ca în restul aplicației.

**1. Alegerea măsurii-cheie.** „Dacă drumul tău se rupe, unde s-ar vedea primul?” **Echipa răspunde prima**, ca la pasul Ipotezele. AI-ul nu propune un pas înainte de asta. Dacă echipa e blocată, AI-ul poate indica primul rezultat dependent de altcineva sau un pas marcat riscant și îl leagă de ipoteză.

**2. Cele patru întrebări plus punctul de pornire, doar pentru măsura-cheie:**

| Întrebare | Câmp | Ce forțează |
|---|---|---|
| Ce urmărești, fără cifre? | `what` | Indicatorul neutru |
| Ce se numără și ce nu? Cum ar putea cifra să arate bine fără să se fi schimbat nimic? | `counts` | Definiția exactă, trucurile și excepțiile |
| Cine o scoate, din ce loc, cât de des, în cât timp? | `source`, `routine` | Dovada că măsurarea e realistă |
| Cât e azi? | `today`, eventual `firstCheck` | Punctul de pornire sau proba |
| Ce e „suficient de bine” și ce faceți dacă iese sub? | `enough`, `ifBelow` | O decizie luată dinainte |

Sunt mai multe rânduri decât în formularea din discuție fiindcă „cât e azi” rămâne o întrebare separată, iar a doua combină definiția cu trucurile.

**3. Punctul de pornire.** Dacă răspunsul e „nu știm”, AI-ul propune o probă: o măsurare de mână, fără cod, în două săptămâni. Nu inventează o valoare. Dacă echipa acceptă, proba intră în `firstCheck`. Dacă nu, AI-ul propune un card „De aflat”.

**4. Măsurile simple.** Pentru realizare și pentru rezultatul pe termen lung, câte o întrebare: ce urmărești și de unde iei datele. Dacă `signal` există deja pe acel pas, AI-ul pornește de la el și scoate cifra din indicator.

### Reguli pentru facilitator

- **Echipa răspunde prima.** La acest pas, AI-ul nu face propuneri după 1–3 întrebări și nu „îmbunătățește” fondul răspunsului. `prompts/system.md` spune acum invers (liniile 5 și 22), deci pasul trebuie să aibă o excepție explicită, câștigătoare.
- **`counts`, `enough` și `ifBelow` vin de la echipă.** AI-ul le poate corecta gramatical sau poate da un exemplu dintr-un alt domeniu, spus clar că e inventat, dar nu le scrie în locul echipei. Câmpurile rămân goale dacă echipa nu a spus nimic.
- **`today` nu se ghicește.** Rămâne gol până când echipa dă o valoare.
- **Testul înlocuirii.** „Ar merge fraza asta și la alt proiect?” Dacă da, cere numele instituției, locul sau numitorul.
- **Insistă de cel mult două ori pe aceeași măsură.** Apoi propune cardul așa cum e și continuă, cu măsura rămasă „schiță”.
- Corecturi blânde, în stilul pașilor existenți:
  - „500 de utilizatori” la un rezultat → „Asta arată că unealta e folosită. Ce ar arăta că instituția a reacționat?”
  - Cifră în indicator („50 de articole”) → cifra se mută la `enough`.
  - „60%” → „Procent din ce?”
  - Schimbare greu de numărat → propune o scară în cuvinte (nu e pe agendă → în discuție → adoptată → aplicată).
  - Retenție la un instrument pe care lumea îl folosește o dată → „Cine a primit documentul din prima a reușit. Ce ai vedea atunci?”
- În exemple, proiectele civice privilegiază răspunsul instituției, nu numărul de utilizatori.

### Butoanele din conversație

Regulile din prompt nu acoperă butoanele din `ChatPanel`, așa că pasul are un comportament propriu:

- **„Propune acum”** nu apare până când echipa nu a trimis primul răspuns. După aceea, cardul propus conține doar ce a spus echipa; `counts`, `today`, `enough` și `ifBelow` rămân goale dacă nu au fost spuse.
- **„Nu știu”** apelează mereu AI-ul pe acest pas. Azi, a treia apăsare la rând salvează direct întrebarea AI-ului în „De aflat”; aici asta ar putea publica întrebări ca „Ce faceți dacă iese sub?”. AI-ul oferă indiciu, apoi exemplu, apoi trece mai departe și lasă câmpul gol.

### Exemplu de rezultat dorit (inventat)

> **Urmărim:** % din cererile 544 trimise prin aplicație către primăriile din județul Cluj care primesc în termen informația cerută.
> **Se numără / nu se numără:** nu se numără răspunsurile „nu deținem” și redirecționările; le urmărim separat, ca să nu umfle cifra.
> **De unde și cine:** o persoană din echipă, lunar, cam 30 de minute, din datele aplicației.
> **Azi:** nu știm; probă pe 10 cereri în următoarele două săptămâni.
> **Suficient:** 50% în 6 luni.
> **Dacă iese sub 30%:** nu mai investim în clasament și trecem la plângeri, cu ajutorul unui avocat.

Exemplul trebuie să apară în prompt ca model de nivel, nu ca text de copiat.

## Modificări la pașii existenți

- **Pasul 4 (`prompts/steps/target.md`):** întrebarea devine „Ce ai vedea în lume dacă s-a întâmplat?”, fără „câți, cât, până când”. Câmpul rămâne `signal`, iar cifrele se notează doar dacă echipa le spune singură.
- **Pasul 7 (`prompts/steps/preconditions.md`):** nu mai cere cifre. `signal` se notează numai dacă echipa îl spune. „Cum l-ați număra?” dispare.
- **Pasul Activități (`prompts/steps/backlog.md`):** AI-ul propune câte o activitate de tip `test` pentru fiecare `firstCheck`, în etapa `start`, legată de pasul măsurii când e un pas din drum. Măsurile ajung în context prin `acceptedContext`. Aplicația generează azi activitățile doar prin propuneri AI: `organizing.ts` nu e folosit decât de testele lui și rămâne neatins.
- **Numerele de pași:** „10 pași” devine „11 pași” și toate trimiterile la pașii 9 și 10 se actualizează. Locuri cunoscute: `prompts/system.md`, `prompts/steps/{project,relations,preconditions,roles,backlog}.md`, `src/components/start/StartScreen.tsx`, `src/lib/alerts/messages.ts`, `src/lib/steps/requirements.ts` (textul „la pasul 10”), `docs/prompturi-ai.md` și materialele de ghidare. Trebuie căutat exhaustiv.

## Date

O listă nouă pe proiect, `measures`, de cel mult 3 elemente și cel mult una pentru fiecare `role`. Toate textele sunt libere, în stilul restului aplicației.

| Câmp | Tip | Pentru |
|---|---|---|
| `id` | text, prefix `ms` | toate |
| `role` | `key` / `delivery` / `longTerm` | toate |
| `stepId` | referință către o precondiție sau un rezultat pe termen lung | toate |
| `what` | text, obligatoriu | toate |
| `source` | text | toate |
| `counts` | text, opțional | `key` |
| `routine` | text, opțional | `key` |
| `today` | text, opțional; gol înseamnă „nu știm încă”, iar „0” e o valoare | `key` |
| `firstCheck` | text, opțional | `key` |
| `enough` | text, opțional | `key` |
| `ifBelow` | text, opțional | `key` |

Starea nu se stochează, se calculează. Măsura-cheie e **„clară”** când are `what`, `source`, `counts`, `routine`, `enough`, `ifBelow` și, în plus, `today` sau `firstCheck`. Altfel e **„schiță”**. Măsurile simple nu au stare.

`signal` rămâne neschimbat. Măsurile nu îl înlocuiesc în date.

### Integrare cu tipurile existente

`measure` devine un `EntityKind` nou, cu tot ce implică: `ENTITY_SCHEMAS`, `STEP_ENTITIES`, `LIST_KEY`, `ID_PREFIX`, `REF_FIELDS` / `REF_TARGETS`, `KIND_LABEL`, `FIELDS`, `defaultData`, `HUMAN_TEXT_FIELDS`, `waitTips`, `completion.fixtures`, `defaultProposal`. Pasul primește un prompt nou, `prompts/steps/measures.md`.

`STEP_ENTITIES.measures` include și `toFindOut`, ca AI-ul să poată propune „De aflat”, iar `STEP_CONTENT.measures` arată doar `measure`.

În formularul de editare, câmpurile doar pentru `key` se ascund la celelalte două roluri. Etichetele sunt în limbaj simplu, ca în tabelul de întrebări.

### Reguli de legătură

- `key`: un pas din drum. E recomandat un rezultat, dar se acceptă și o realizare dacă echipa insistă.
- `delivery`: un pas de nivel realizare.
- `longTerm`: un rezultat pe termen lung.
- Dacă pasul legat e șters, măsura rămâne în editor, marcată „pasul nu mai există”, și nu apare pe pagina publică.

## Completarea pasului

- **Pasul cere măsura-cheie, chiar și ca schiță.** Decizia proprietarului proiectului. Regula din `RULES`: există o măsură cu `role` `key`, cu `stepId` valid și cu `what` completat. Ca la ceilalți pași, fără ea nu se poate trece mai departe, iar Rolurile și Activitățile rămân blocate (`isStepUnlocked`). Mesaj: „Alege măsura-cheie: un pas din drum și ce urmărești la el.”
- Dacă pasul legat e șters, regula nu mai e îndeplinită până când măsura primește alt pas.
- Rând obligatoriu în `requirementsFor`: „O măsură-cheie, legată de un pas din drum”.
- Rânduri recomandate în `requirementsFor`:
  - „Măsura-cheie e clară: definiție, cine o scoate, prag, ce faceți dacă iese sub”
  - „O măsură pentru ce livrați și una pentru schimbarea mare”

## Rezultatul

### Pagina proiectului (`ProjectView`, varianta Povestea)

O secțiune nouă, „Cum vedem dacă merge”, între „Rezultatele pe care le urmărim” și „Ce încă nu știm”:

```text
Cum vedem dacă merge

MĂSURA-CHEIE · Instituțiile răspund la cereri              [schiță]
Urmărim: % cereri 544 cu răspuns în termen
Ce se numără: fără „nu deținem” și redirecționări
Azi: nu știm încă · Probă: 10 cereri, două săptămâni
Suficient: 50% în 6 luni
Dacă iese sub 30%: trecem la plângeri, cu un avocat
Sursa: datele aplicației

CE LIVRĂM · Clasament lunar       Urmărim: clasamente publicate · Sursa: site
SCHIMBAREA MARE · Primăriile…     Urmărim: … · Sursa: …
```

- Măsura-cheie apare mai mare. Afirmația „Dacă iese sub…” e la vedere: arată cel mai bine că echipa s-a gândit serios.
- Câmpurile goale nu se afișează, cu excepția lui „Azi”, care scrie „nu știm încă”.
- Tag-ul „schiță” apare doar când e cazul, fără culoare de eroare.
- `routine` nu se afișează pe pagina publică, fiind un detaliu de lucru. E doar o alegere de afișare: câmpul rămâne în copia publicată, ca restul datelor, iar numele echipei sunt oricum publice. Apare în editor și în rezumat.
- Secțiunea respectă mecanismul existent `Section empty` / `preview`.

### Harta și „Cum ajungem acolo”

În `MapView` și `PathStory`, pașii legați de o măsură afișează „Urmărim: …” în locul liniei „Indicator: …”. Pașii fără măsură își păstrează linia de azi. La fel la rezultatele pe termen lung din `ProjectView` și `MapView`. Pe hartă, detaliul pasului arată toată măsura.

### „De aflat” și activități

- Întrebarea din „De aflat” ajunge deja pe pagina publică, la „Întrebări la care ne poți ajuta”. Nu e nevoie de cod nou.
- „De aflat” nu ajunge automat în activități. `backlog.md` cere asta, dar `toFindOut` nu e în contextul trimis AI-ului. E o problemă existentă, în afara acestui proiect. Proba e cea care asigură legătura cu activitățile.

## Proiecte existente

Draft-urile se citesc din baza de date fără să fie parsate, iar salvarea validează cu `ProjectSchema`. `steps` cere câte o cheie pentru fiecare pas. Fără măsuri de precauție, un proiect vechi s-ar strica la deschidere sau ar primi 422 la salvare.

Cerințe, indiferent de cum sunt rezolvate:

- Un draft vechi se deschide, se salvează și se publică fără pierdere de date, iar pasul nou apare neatins.
- Un draft vechi trecut de Ipoteze are Rolurile și Activitățile blocate până adaugă măsura-cheie, ca efect acceptat al deciziei, și se deschide direct pe pasul nou. Datele acelor pași nu se pierd, iar publicarea nu e afectată.
- O pagină publicată veche se afișează ca înainte, fără secțiunea nouă.
- `alerts[].step` e stocat ca număr. Alertele vechi cu pasul 9 sau 10 trebuie să rămână la pasul corect după renumerotare.
- Mesajele din conversații rămân pe id-ul pasului și nu sunt afectate.
- Conversațiile vechi pot conține texte cu „pasul 9”; le lăsăm așa.

## Ce rămâne la latitudinea constructorului

- Mecanismul de compatibilitate: normalizare la citire sau câmpuri opționale cu valori implicite, atâta timp cât cerințele de mai sus sunt respectate.
- Forma exactă a cardului JSON și textul final al promptului.
- Detaliile vizuale, în sistemul de design existent.
- Conținutul de ghidare pentru pas (exemple, tips de așteptare), în stilul celor existente.

## Actualizare PRD

În `docs/superpowers/specs/2026-10-21-ghid-pornire-prd.md`, excluderea „fără logframe, indicatori formali, export pentru finanțatori” devine „fără logframe și fără export pentru finanțatori; măsurabilele rămân un plan light, fără urmărire în timp”. Adăugăm și pasul în lista de pași din PRD și din `README.md`.

## Cum verificăm

**Teste automate**, în stilul existent:

- Schema, compatibilitatea cu un draft vechi și renumerotarea alertelor.
- Calculul stării „clară” / „schiță”.
- „Propune acum” și „Nu știu” se comportă diferit doar pe acest pas.
- Pasul fără măsură-cheie blochează pașii de după; o schiță cu pas și `what` îi deblochează.
- Afișarea publică: „Azi” gol, „0” ca valoare, `routine` absent, măsură cu pas șters absentă.
- `FakeProvider` are propunere implicită pentru pasul nou.

**Calitatea AI-ului**, cu scenarii în `docs/test` / `docs/eval`:

- AI-ul nu propune măsura-cheie înainte de răspunsul echipei.
- Nu completează `counts`, `today`, `enough` sau `ifBelow` din proprie inițiativă.
- Insistă de cel mult două ori.
- Scoate cifra din `what`.
- La pasul Activități, propune un singur test pentru fiecare `firstCheck`.

**Test cu oameni:** 3–5 echipe reale, în sesiuni observate. Timpul și abandonul se notează de către observator, fără instrumentare în aplicație. Urmărim:

- Ajung la un rezultat ca măsură-cheie, nu la o realizare?
- Câte măsuri-cheie ajung „clare”?
- Răspunsurile la „ce faceți dacă iese sub” sunt specifice proiectului?
- Cât durează pasul față de cele 8 minute estimate?
- Le pare birocrație? Abandonează aici?
- Fac proba în următoarele două săptămâni?

Dacă echipele se blochează, primul lucru de simplificat e împărțirea `enough` / `ifBelow`, apoi întrebarea despre trucuri.

## Ce nu știm

Combinația e o inferență din CART, pragurile Center for Theory of Change, fișele de indicatori ale UE și legea lui Campbell. Niciun studiu găsit nu arată că produce măsuri mai bune. Testul înlocuirii e judecat de AI și poate da alarme false, mai ales în română. Pragurile din exemple sunt inventate: nu există un reper dovedit pentru un răspuns „bun” pe Legea 544.
