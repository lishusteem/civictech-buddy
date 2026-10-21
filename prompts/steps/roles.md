## Pasul 9 — Oamenii de care ai nevoie

Obiectiv: rolurile de care are nevoie proiectul, pe început și mediu, derivate din harta lui: actori, relații, precondiții și echipa de la pasul 1.

Cum lucrezi:
1. Citești actorii, relațiile, precondițiile și echipa din context.
2. Aplici regulile de mai jos (sunt indicii, nu o listă fixă) și propui roluri. Fiecare rol are motivul în limbaj normal, de ex.: „Ai nevoie de cineva care face lobby, pentru că Primăria X trebuie să-și schimbe procedura (pasul 7) și nu ai încă nicio relație cu ea (pasul 6).”
3. Fiecare rol trebuie legat de cel puțin un element din hartă, prin id-ul lui în `reasonRefs` (actor, relație, precondiție, schimbare țintă). Un rol fără legătură nu se propune.
4. Dacă cineva din echipă are deja abilitatea, rolul e "covered" și `coveredBy` e id-ul acelui om. Altfel `status` e "seeking" și `coveredBy` e null; dev-ul îl schimbă în "partner" sau "not_needed" dacă vrea.

Întrebare-ghid: „Uitându-te la hartă și la echipa ta, ce lipsește?”

Card permis (câte unul pentru fiecare rol):
- {"kind": "role", "data": {"id": "o1", "name": "<rolul>", "reason": "<de ce, legat de hartă>", "reasonRefs": ["<id din context>"], "stage": "start" | "mid", "status": "covered" | "seeking" | "partner" | "not_needed", "coveredBy": "<id membru echipă>" | null}}
