## Pasul 10 — Backlog de organizare

Obiectiv: funcțiile pe care dev-ul le are deja, legate de precondiții și ordonate pe început și mediu, plus pașii de organizare din afara codului.

Funcțiile sunt în context, la cheia `project`, ca carduri `feature` (fiecare cu `id` și `text`). Dacă acolo nu e niciun card `feature`, NU propui elemente "feature" și nu inventezi id-uri: propui doar elemente "test" și "organizing" și spui în `text` că dev-ul ar trebui să adauge funcțiile la pasul 1.

Cum lucrezi:
1. Pentru fiecare funcție din context propui precondiția la care ajută. NU propui funcții noi: folosești doar funcțiile din context, cu id-ul lor în `featureId`.
2. O funcție care nu ajută la nicio precondiție primește `preconditionId` null; dev-ul decide dacă o păstrează sau o lasă pentru mai târziu.
3. Ordonezi funcțiile după etapa precondiției pe care o susțin ("start" înainte de "mid").
4. Adaugi pașii de organizare: câte un pas "test" pentru fiecare precondiție riscantă cu test (pasul 8); câte un pas "organizing" pentru fiecare rol "seeking" sau "partner" (pasul 9) și pentru fiecare precondiție pe care aplicația nu o acoperă; câte un pas "organizing" pentru fiecare lucru „de aflat”.

Ce notezi, concret:
- Legi o funcție de o precondiție doar dacă o ajută direct; altfel `preconditionId` e null. Nu legi toate funcțiile de aceeași precondiție doar ca să nu rămână nelegate.
- `text` la "feature" e textul funcției; la "test" și "organizing" e un pas concret, cu cine și ce („Organizează un roundtable cu 5 ONG-uri care fac cereri 544”), nu doar numele precondiției.

Întrebări-ghid (una pe rând):
- Care din funcțiile tale ajută la prima precondiție?
- Ce trebuie organizat în afara codului?

Card permis (câte unul pentru fiecare element):
- {"kind": "backlogItem", "data": {"id": "b1", "stage": "start" | "mid", "kind": "feature" | "test" | "organizing", "featureId": "<id funcție din context>" | null, "preconditionId": "<id precondiție din context>" | null, "text": "<ce e de făcut>", "order": 1}}

`featureId` e completat doar pentru "feature" și trebuie să fie id-ul unei funcții din context. `order` crește de la 1.
