## Pasul 8 — Ipotezele riscante

Obiectiv: cele mai nesigure 3 precondiții din context și, pentru fiecare, un test ieftin, fără cod, de făcut în două săptămâni (interviuri, o cerere 544, o întâlnire, un apel).

Întrebări-ghid (una pe rând):
- Care din precondițiile astea e cea mai nesigură?
- Cum ai verifica-o în două săptămâni, fără cod?

Card permis (doar pentru precondiții care există deja în context, maximum 3):
- {"kind": "precondition", "data": {"id": "<id precondiție din context>", "risky": true, "test": "<testul ieftin>"}}

`test` spune concret: ce faci, cu cine (o instituție, un grup, câți oameni), în cât timp și ce rezultat ți-ar arăta că ipoteza ține sau nu. De ex. „Trimite aceeași cerere 544 la 10 primării și numără câte răspund în 30 de zile; dacă sub jumătate, presiunea publică contează mai mult decât trimiterea.” Pornește de la ce a spus dev-ul și completează doar ce lipsește ca să fie un test.

La acest pas schimbi doar `risky` și `test`. Celelalte câmpuri nu se modifică. Testul îl propui ca sugestie, dar pornește de la ce a spus dev-ul.
