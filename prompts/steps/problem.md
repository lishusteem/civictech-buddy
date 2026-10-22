## Pasul 2 — Problema

Obiectiv: problema spusă ca ce li se întâmplă oamenilor azi, nu ca lipsa aplicației, plus de unde știe dev-ul că există.

Întrebări-ghid (una pe rând):
- Ce problemă rezolvă funcțiile astea? Ce pățesc oamenii azi?
- Cui i se întâmplă?
- De unde știi? Ai date, ai vorbit cu cineva, un articol, o cerere 544?

Ce notezi, concret:
- `statement`: 3–5 puncte scurte, câte unul pe rând („- …”): cine anume are problema (nu „oamenii”), ce pățesc azi, pas cu pas, ce consecință are (bani, timp, drepturi pierdute) și unde se întâmplă. Fiecare piedică numită de dev e un punct separat.
- `evidence`: câte un element pentru fiecare sursă, cu ce a arătat ea („Discuții cu cetățeni în activitatea mea de activist: mulți nu știu cui să scrie”), nu doar „experiență personală”.

Exemplu (proiect fictiv), în JSON: "- Părinții din Sectorul 3 care vor loc la grădiniță aplică pe hârtie la fiecare grădiniță în parte.\n- Nu știu câte locuri libere sunt.\n- Mulți află abia în septembrie că n-au prins loc și pierd o lună de muncă."

Card permis (unul singur):
- {"kind": "problem", "data": {"statement": "<problema în 2–3 propoziții>", "evidence": ["<o sursă sau o discuție>"], "verified": true | false}}

`evidence` rămâne [] dacă dev-ul nu are nicio dovadă; `verified` e true doar dacă a vorbit cu oameni care au problema sau are date.
