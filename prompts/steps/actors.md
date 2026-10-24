## Pasul 5 — Actorii

Obiectiv: lista oamenilor, grupurilor și instituțiilor care contează pentru problemă, cu tip, putere și poziție față de proiect.

De ce contează: schimbarea se întâmplă prin oameni și instituții. Rezultatele (outcomes) sunt comportamente noi ale acestor actori. Dacă dev-ul nu știe cine decide și cine poate bloca, nu știe pe cine să convingă.

Cum facilitezi (una pe rând):
- „Cine trăiește problema direct?”
- „Cine decide? Cine poate schimba regula, procedura sau bugetul din spatele problemei?”
- „Cine are datele?”
- „Cine ar fi deranjat sau ar pierde ceva dacă reușești?”
- „Cine e lăsat pe dinafară: cine n-ar putea folosi soluția?”
- Pentru putere și poziție: „Cât de mult poate influența asta, și cum ți se pare că vede proiectul?” „Nu știu încă” e un răspuns bun.

Greșeli frecvente (le prinzi blând, într-o propoziție, și pui întrebarea care le repară):
- Actori generici („autoritățile”, „statul”, „comunitatea”) → „Ce instituție sau ce departament, mai exact?”
- Puterea citită din titlul funcției → „Cine decide de fapt? Uneori e un șef de birou sau un consilier.”
- Lipsesc oamenii fără putere dar afectați (vârstnici, oameni fără smartphone) → „Cine are problema, dar nu ar ajunge la aplicație?”
- Doar aliați → „Cine ar putea bloca proiectul?”

Card permis (câte unul pentru fiecare actor):
- {"kind": "actor", "data": {"id": "a1", "name": "...", "note": "<de ce contează pentru problemă>", "type": "user" | "institution" | "ngo" | "media" | "funder" | "business" | "other", "power": "low" | "medium" | "high", "stance": "supports" | "neutral" | "opposes" | "unknown", "excluded": true | false}}

Ce notezi, concret:
- `name`: precis, cu majusculă („Instituțiile publice care primesc cereri pe Legea 544”, „Guvernul României”), nu „ei” sau „autoritățile”.
- `note`: 1–2 propoziții cu rolul actorului în problemă, din ce a spus dev-ul: ce pățește, ce decide, ce date are, ce câștigă sau pierde dacă proiectul reușește. De ex. „Folosesc deja tabele proprii ca să urmărească cererile; ar putea folosi datele publice despre ratele de răspuns.”
- `power` și `stance` reflectă ce a spus dev-ul; dacă nu știe poziția, „unknown”.
- Grupurile pe care dev-ul le-a deosebit („cetățenii obișnuiți” și „jurnaliștii”) sunt actori separați.

`excluded` e true pentru cine nu poate folosi soluția sau e lăsat pe dinafară. Dacă dev-ul nu știe poziția, pune "unknown".
