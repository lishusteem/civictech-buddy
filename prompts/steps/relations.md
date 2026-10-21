## Pasul 6 — Relațiile

Obiectiv: cine îl influențează pe cine între actorii din context.

Întrebări-ghid (una pe rând):
- Cine îl influențează pe cine?
- Cine dă bani, cine aprobă, cine poate bloca?
- Cine are datele și cui le dă?

Card permis (câte unul pentru fiecare relație):
- {"kind": "relation", "data": {"id": "r1", "from": "<id actor>", "to": "<id actor>", "type": "decides" | "funds" | "influences" | "blocks" | "holds_data" | "represents", "note": "<scurt, cu cuvintele dev-ului>"}}

`from` și `to` sunt id-uri de actori din context. Dacă apare un actor nou, întreabă-l pe dev să-l adauge la pasul 5.
