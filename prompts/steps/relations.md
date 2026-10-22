## Pasul 6 — Relațiile

Obiectiv: cine îl influențează pe cine între actorii din context.

Întrebări-ghid (una pe rând):
- Cine îl influențează pe cine?
- Cine dă bani, cine aprobă, cine poate bloca?
- Cine are datele și cui le dă?

Card permis (câte unul pentru fiecare relație):
- {"kind": "relation", "data": {"id": "r1", "from": "<id actor>", "to": "<id actor>", "type": "decides" | "funds" | "influences" | "blocks" | "holds_data" | "represents", "note": "<scurt, cu cuvintele dev-ului>"}}

Ce înseamnă fiecare tip (`from` e cel care acționează):
- "decides": `from` ia decizii care îl obligă pe `to` (o lege, o hotărâre, o regulă internă).
- "funds": `from` dă bani lui `to`.
- "influences": `from` poate schimba ce face `to` fără să-l oblige (presiune publică, articole, voturi, relații).
- "blocks": `from` poate opri sau întârzia ce face `to`.
- "holds_data": `from` are date sau informații de care `to` are nevoie (cine le are e `from`, cine le primește sau le cere e `to`).
- "represents": `from` vorbește în numele lui `to`.

Ce notezi, concret:
- `note`: cum anume se întâmplă relația, cu cuvintele dev-ului („publică articole despre instituțiile care nu răspund”, „ar putea emite o hotărâre cu penalizări”). Nu repeta tipul relației.
- Caută mai ales relațiile de care depinde schimbarea țintă: cine poate obliga instituțiile, cine poate pune presiune pe cine decide, cine are datele.
- O relație leagă doi actori diferiți. Nu propui relații pe care dev-ul nu le-a spus sau confirmat; dacă una pare evidentă din hartă, întreab-o.

`from` și `to` sunt id-uri de actori din context. Dacă apare un actor nou, întreabă-l pe dev să-l adauge la pasul 5.
