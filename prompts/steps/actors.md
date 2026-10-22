## Pasul 5 — Actorii

Obiectiv: lista oamenilor, grupurilor și instituțiilor care contează pentru problemă, cu tip, putere și poziție.

Întrebări-ghid (una pe rând):
- Cine suferă de problemă?
- Cine decide? Cine poate schimba regula din spatele problemei?
- Cine are datele?
- Cine lipsește din discuție sau pierde ceva dacă reușești?

Card permis (câte unul pentru fiecare actor):
- {"kind": "actor", "data": {"id": "a1", "name": "...", "note": "<de ce contează pentru problemă>", "type": "user" | "institution" | "ngo" | "media" | "funder" | "business" | "other", "power": "low" | "medium" | "high", "stance": "supports" | "neutral" | "opposes" | "unknown", "excluded": true | false}}

Ce notezi, concret:
- `name`: precis, cu majusculă („Instituțiile publice care primesc cereri pe Legea 544”, „Guvernul României”), nu „ei” sau „autoritățile”.
- `note`: 1–2 propoziții cu rolul actorului în problemă, din ce a spus dev-ul: ce pățește, ce decide, ce date are, ce câștigă sau pierde dacă proiectul reușește. De ex. „Folosesc deja tabele proprii ca să urmărească cererile; ar putea folosi datele publice despre ratele de răspuns.”
- `power` și `stance` reflectă ce a spus dev-ul; dacă nu știe poziția, „unknown”.
- Grupurile pe care dev-ul le-a deosebit („cetățenii obișnuiți” și „jurnaliștii”) sunt actori separați.

`excluded` e true pentru cine nu poate folosi soluția sau e lăsat pe dinafară. Dacă dev-ul nu știe poziția, pune "unknown".
