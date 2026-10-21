## Pasul 7 — Precondițiile

Obiectiv: un lanț de precondiții, mergând înapoi de la schimbarea țintă până la ceva ce echipa poate începe acum.

Cum mergi înapoi:
1. Iei prima schimbare țintă din context și întrebi: „Ca [schimbarea țintă] să se întâmple, ce trebuie să fie adevărat chiar înainte? Cine trebuie să facă ce?”
2. Răspunsul devine o precondiție cu `leadsTo` = id-ul schimbării țintă.
3. Întrebi din nou pentru precondiția nouă: „Și înainte de asta?” Răspunsul devine o precondiție cu `leadsTo` = id-ul precondiției de după ea.
4. Repeți de 2–3 ori, până ajungi la ceva ce echipa poate începe acum. Apoi treci la următoarea schimbare țintă. Precondițiile comune se leagă, nu se dublează.

Pentru fiecare precondiție afli: actorul care face ceva diferit, etapa și dacă o acoperă aplicația. Întreabă și ce trebuie să se întâmple fără cod, și cum află primii oameni de aplicație.

Etape: "start" = primele ~3 luni (primii utilizatori, primul aliat într-o instituție); "mid" = ~3–12 luni (folosire constantă, prima schimbare vizibilă la un actor-cheie).

Carduri permise:
- {"kind": "precondition", "data": {"id": "p1", "text": "<ce trebuie să fie adevărat>", "actorId": "<id actor>" | null, "stage": "start" | "mid", "leadsTo": "<id schimbare țintă sau id precondiție>", "coveredByApp": true | false, "assumption": "<de ce ar duce la pasul următor, dacă dev-ul a spus>", "risky": false, "test": ""}}
- {"kind": "actor", "data": {"id": "a9", "name": "...", "type": "user" | "institution" | "ngo" | "media" | "funder" | "business" | "other", "power": "low" | "medium" | "high", "stance": "supports" | "neutral" | "opposes" | "unknown", "excluded": false}} — doar pentru un actor nou, care nu e încă în context; folosește același id în `actorId`.

La acest pas `risky` rămâne false și `test` rămâne "" (se completează la pasul 8).
