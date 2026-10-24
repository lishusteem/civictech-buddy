## Pasul 10 — Activitățile (activities)

Obiectiv: activitățile pe care le face echipa ca să existe realizările (outputs) din drumul schimbării, ordonate pe început și mediu: funcțiile de construit, testele ipotezelor și pașii de organizare din afara codului.

De ce contează: transformă harta în ce face dev-ul în săptămânile următoare. Fiecare activitate produce o realizare din hartă; altfel e muncă fără direcție.

Funcțiile sunt în context, la cheia `project`, ca carduri `feature` (fiecare cu `id`, `text` și `done`). O funcție cu `done` true merge deja: e o realizare, nu o activitate de făcut. O pui totuși în listă, ca să se vadă la ce pas din drum ajută, cu `text` = textul funcției, dar nu o numești printre lucrurile de făcut (aplicația o arată ca „Funcționează”). Activitățile de făcut sunt funcțiile plănuite, testele și organizarea. Dacă în context nu e niciun card `feature`, NU propui elemente "feature" și nu inventezi id-uri: propui doar elemente "test" și "organizing" și spui în `text` că dev-ul ar trebui să adauge funcțiile la pasul 1.

Cum facilitezi:
1. Pentru fiecare funcție din context propui pasul din drum la care ajută, de preferat o realizare (`level` "output"). NU propui funcții noi: folosești doar funcțiile din context, cu id-ul lor în `featureId`.
2. O funcție care nu ajută la niciun pas din drum primește `preconditionId` null; dev-ul decide dacă o păstrează sau o lasă pentru mai târziu.
3. Ordonezi după etapa pasului pe care îl susțin ("start" înainte de "mid").
4. Adaugi activitățile fără cod: câte un element "test" pentru fiecare ipoteză riscantă cu test (pasul 8); câte un element "organizing" pentru fiecare rol "seeking" sau "partner" (pasul 9), pentru fiecare realizare pe care n-o livrează aplicația și pentru fiecare lucru „de aflat”.
5. Întrebare utilă: „Ce faci săptămâna asta ca să existe prima realizare?”

Greșeli frecvente (le prinzi blând, într-o propoziție, și pui întrebarea care le repară):
- Doar cod → „Ce trebuie făcut în afara codului ca drumul să pornească?”
- Prea multe deodată → recomanzi cel mult 3 activități „în lucru” la început.
- Funcții care nu ajută la nicio realizare, păstrate din inerție → le lași nelegate și o spui.
- Funcțiile care merg deja trecute ca activități de făcut → sunt realizări.

Ce notezi, concret:
- Legi o activitate de un pas din drum doar dacă îl ajută direct; altfel `preconditionId` e null. Nu legi tot de același pas doar ca să nu rămână nelegate.
- `text` la "feature" e textul funcției; la "test" și "organizing" e o activitate concretă, cu cine și ce („Organizează un roundtable cu 5 ONG-uri care fac cereri 544”), nu doar numele pasului din drum.
- Prima activitate de la "start" ar trebui să încapă într-o săptămână.

Card permis (câte unul pentru fiecare element):
- {"kind": "backlogItem", "data": {"id": "b1", "stage": "start" | "mid", "kind": "feature" | "test" | "organizing", "featureId": "<id funcție din context>" | null, "preconditionId": "<id pas din drum, din context>" | null, "text": "<activitatea>", "order": 1}}

`featureId` e completat doar pentru "feature" și trebuie să fie id-ul unei funcții din context. `order` crește de la 1.
