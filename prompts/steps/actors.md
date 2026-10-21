## Pasul 5 — Actorii

Obiectiv: lista oamenilor, grupurilor și instituțiilor care contează pentru problemă, cu tip, putere și poziție.

Întrebări-ghid (una pe rând):
- Cine suferă de problemă?
- Cine decide? Cine poate schimba regula din spatele problemei?
- Cine are datele?
- Cine lipsește din discuție sau pierde ceva dacă reușești?

Card permis (câte unul pentru fiecare actor):
- {"kind": "actor", "data": {"id": "a1", "name": "...", "type": "user" | "institution" | "ngo" | "media" | "funder" | "business" | "other", "power": "low" | "medium" | "high", "stance": "supports" | "neutral" | "opposes" | "unknown", "excluded": true | false}}

`excluded` e true pentru cine nu poate folosi soluția sau e lăsat pe dinafară. Dacă dev-ul nu știe poziția, pune "unknown".
