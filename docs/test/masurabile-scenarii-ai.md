# Scenarii de calitate AI: pasul „Cum vedem dacă merge”

Scenarii de rulat de mână, cu AI-ul real, pe pasul 9 (măsurile) și pe pasul 11 (Activități). Pornești de la un proiect cu pașii 1–8 acceptați. Exemplul de mai jos folosește proiectul de test **Implicare Civica** (vezi `raspunsuri-implicare-civica.md`), în care drumul schimbării are:

- un rezultat pe termen lung: „Primăriile răspund la cererile 544 în termenul legal de 30 de zile”;
- un rezultat de la început: „Un funcționar dintr-o primărie pilot răspunde la o cerere trimisă prin aplicație”, marcat riscant;
- o realizare: „Aplicația trimite cereri către primării și ține evidența răspunsurilor”.

Pentru fiecare scenariu notezi: trecut sau picat, plus mesajul AI-ului care l-a picat. Un scenariu pică și dacă AI-ul respectă regula, dar rezultatul nu se înțelege singur (cardul n-ar fi clar pentru cineva care n-a văzut discuția).

## 1. Nu propune măsura-cheie înainte de răspunsul echipei

**Intrare** (pasul 9 abia deschis, fără niciun mesaj de la dev-ul):

1. Dev-ul deschide pasul. AI-ul pune prima întrebare.
2. Dev-ul scrie: `nu stiu, zi tu`.

**Așteptat**

- Prima replică a AI-ului e o întrebare („Dacă drumul tău se rupe, unde s-ar vedea primul?”), nu o propunere cu carduri.
- După „nu știu, zi tu” răspunde tot cu o întrebare, cu un indiciu legat de proiect (primul rezultat care depinde de altcineva sau pasul marcat riscant). Nu scrie cardul `measure` cu `role: "key"`.
- Nu trec 1–3 întrebări urmate de o propunere din oficiu: propunerea vine abia după ce dev-ul a numit un loc din drum.

**Pică dacă:** primul sau al doilea răspuns al AI-ului conține un card `measure` cu `role: "key"`.

## 2. Nu completează `counts`, `today`, `enough`, `ifBelow`

**Intrare** (în ordine):

1. `Primul loc unde se vede e când un funcționar din primărie răspunde la o cerere trimisă prin aplicație.`
2. `Urmărim dacă primăria răspunde la cererile trimise prin aplicație.`
3. `Datele le scot eu, din aplicație, o dată pe lună.`

**Așteptat**

- AI-ul pune întrebările pe rând (ce se numără, cât e azi, ce e suficient, ce faceți dacă iese sub) și nu răspunde în locul dev-ului.
- Orice card `measure` apărut până aici are `counts`, `today`, `enough` și `ifBelow` goale (`""`).
- Dacă AI-ul dă un exemplu pentru ce ar putea însemna „suficient”, îl spune ca exemplu dintr-un alt domeniu, declarat inventat, și nu îl pune în card.

**Pică dacă:** vreunul din cele patru câmpuri are conținut pe care dev-ul nu l-a scris. Verifică mai ales `today`: „0” fără ca dev-ul să fi spus „0” este o greșeală (golul înseamnă „nu știm încă”).

## 3. „Propune acum” lasă goale câmpurile nespuse

**Intrare** (după scenariul 2, dev-ul n-a spus nimic despre `counts`, `today`, `enough`, `ifBelow`):

- `Propune rezumatul acum.`

**Așteptat**

- AI-ul răspunde cu o propunere cu carduri (nu cu altă întrebare, fiindcă dev-ul a cerut explicit).
- Cardul `key` are `what` fără cifre, `routine` și `source` din ce a spus dev-ul, iar `counts`, `today`, `enough`, `ifBelow` rămân `""`.
- Pentru `today` necunoscut, AI-ul propune fie o probă în `firstCheck` (o măsurare de mână, fără cod, în două săptămâni), fie un card `toFindOut` cu `step: "measures"`. Nu scrie o cifră.
- Textul propunerii spune într-o propoziție ce a rămas necompletat.

**Pică dacă:** o valoare apare în câmpurile rezervate dev-ului sau propunerea nu vine deloc.

## 4. Insistă cel mult de două ori

**Intrare** (aceeași măsură, patru răspunsuri vagi la rând, după ce AI-ul a întrebat „ce urmărești acolo?”):

1. `Creste transparenta.`
2. `Adica sa fie mai multa transparenta.`
3. `Pai sa se vada ca merge bine.`
4. `Nu stiu ce sa zic.`

**Așteptat**

- După răspunsurile 1 și 2, AI-ul reformulează și mai întreabă, fiecare dată cu o întrebare nouă (testul înlocuirii: „Ar merge fraza asta și la alt proiect?”; numele instituției, locul sau numitorul).
- După răspunsul 3 propune cardul așa cum e, cu `what` cât se poate de apropiat de cuvintele dev-ului, și merge mai departe. Nu pune a treia întrebare pe aceeași măsură.
- Răspunsul 4 nu declanșează o a patra rundă pe aceeași măsură.

**Pică dacă:** AI-ul pune mai mult de două întrebări de insistență pe aceeași măsură, sau refuză să propună până nu primește un răspuns bun.

## 5. Scoate cifra din `what`

**Intrare:**

1. `Vreau sa urmaresc ca 50 de primarii raspund in termen.`
2. După întrebarea AI-ului despre cifră: `Da, 50 e tinta.`

**Așteptat**

- AI-ul numește blând ce vede („cifra e ținta, nu ce urmărim”) și întreabă care e numitorul sau în ce perioadă, într-o singură propoziție, fără ton evaluativ.
- Cardul propus are `what` fără cifră (de exemplu „primăriile care răspund în termenul legal la cererile trimise prin aplicație”), iar „50” ajunge în `enough` doar pentru că dev-ul a spus-o ca țintă.
- La „60%” fără numitor, AI-ul întreabă „Procent din ce?”.

**Pică dacă:** `what` conține o cifră, un procent sau un termen ca „până în 2027”, sau dacă „50” e mutat în `enough` fără ca dev-ul să fi spus că e ținta.

## 6. La pasul Activități propune un singur test pe `firstCheck`

**Pregătire:** măsura-cheie are `firstCheck` = `probă pe 10 cereri în următoarele două săptămâni`. Pasul 11 se deschide cu funcțiile din pasul 1 în context.

**Intrare:**

1. `Propune rezumatul acum.`

**Așteptat**

- Propunerea conține exact un element `backlogItem` cu `kind: "test"` pentru acest `firstCheck`, cu `stage: "start"`.
- `preconditionId` e id-ul pasului din drum pe care îl urmărește măsura-cheie (când e un pas din drum); testul nu repetă un test deja existent la o ipoteză riscantă (pasul 8) dacă acela acoperă aceeași probă.
- `text` e o acțiune concretă („Trimite 10 cereri 544 prin aplicație către primării din județ și notează câte răspund în 30 de zile”), nu textul măsurii.
- Nu apar două elemente `test` pentru același `firstCheck`.
- Nu sunt propuse funcții noi.

**Pică dacă:** același `firstCheck` produce mai mult de un test, nu produce niciunul, sau testul nu e în etapa „start”.

## Formular pentru testul cu 3–5 echipe

Sesiuni observate, cu echipe reale. Observatorul notează timpul și abandonul; aplicația nu are instrumentare. Câte o fișă pe echipă.

**Echipa:** ______________  **Data:** ________  **Observator:** ______________

| Cât a durat pasul „Cum vedem dacă merge” (minute; estimarea e 8) | Cât a durat toată sesiunea (minute; estimarea e 38) | A abandonat la acest pas (da / nu) |
| --- | --- | --- |
|  |  |  |

Întrebări de bifat și de notat:

1. **Au ajuns la un rezultat ca măsură-cheie, nu la o realizare?**
   Da / Nu. Ce loc din drum au ales: ______________
2. **Măsura-cheie a ieșit „clară” sau a rămas „schiță”?**
   Clară / Schiță. Ce câmp lipsea: ______________
3. **Răspunsul la „ce faceți dacă iese sub” e specific proiectului lor?**
   Da / Nu. Scrie răspunsul cuvânt cu cuvânt: ______________
   Ar merge și la alt proiect? Da / Nu
4. **Cât a durat pasul față de cele 8 minute estimate?**
   Mai puțin / Cam la fel / Mai mult. Unde s-a pierdut timpul: ______________
5. **Le pare birocrație? Abandonează aici?**
   Da / Nu. Replica exactă sau momentul în care s-au blocat: ______________
6. **Fac proba în următoarele două săptămâni?**
   Au ales o probă (`firstCheck`): da / nu. După două săptămâni: au făcut-o da / nu. Dacă nu, de ce: ______________

Observații libere (ce n-a înțeles AI-ul, ce a corectat echipa, ce a surprins):

______________________________________________________________

**Dacă echipele se blochează:** primul lucru de simplificat e împărțirea `enough` / `ifBelow`, apoi întrebarea despre trucuri („Cum ar putea cifra să arate bine fără să se fi schimbat nimic?”).

**Sinteză după 3–5 echipe** (completezi la final):

- Echipe care au ales un rezultat ca măsură-cheie: ___ din ___
- Măsuri-cheie „clare”: ___ din ___
- Răspunsuri specifice la „ce faceți dacă iese sub”: ___ din ___
- Timp mediu al pasului: ___ minute (estimat: 8)
- Abandonuri la pas: ___ din ___
- Echipe care au făcut proba în două săptămâni: ___ din ___
