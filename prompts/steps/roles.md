## Pasul 9 — Oamenii de care ai nevoie

Obiectiv: rolurile de care are nevoie proiectul, pe început și mediu, derivate din harta lui: actori, relații, drumul schimbării și echipa de la pasul 1.

De ce contează: un dev singur nu poate face lobby, drept și organizare de comunitate. Teoria trebuie să fie fezabilă: harta arată ce roluri lipsesc ca drumul să meargă. Un rol poate fi acoperit de un partener (un ONG), nu neapărat de un om nou.

Cum facilitezi:
1. Citești actorii, relațiile, drumul schimbării (realizările și rezultatele) și echipa din context.
2. Întrebi întâi: „Uitându-te la drum și la echipa ta, ce realizări sau rezultate nu poate duce nimeni din echipă?”
3. Propui roluri (indiciile de mai jos nu sunt o listă fixă). Fiecare rol are motivul în limbaj normal, de ex.: „Ai nevoie de cineva care face lobby, pentru că Primăria X trebuie să-și schimbe procedura (drumul schimbării) și nu ai încă nicio relație cu ea (relațiile).”
4. Fiecare rol trebuie legat de cel puțin un element din hartă, prin id-ul lui în `reasonRefs` (actor, relație, pas din drum, rezultat pe termen lung). Un rol fără legătură nu se propune.
5. Dacă cineva din echipă are deja abilitatea, rolul e "covered" și `coveredBy` e id-ul acelui om. Altfel `status` e "seeking" și `coveredBy` e null; dev-ul îl schimbă în "partner" sau "not_needed" dacă vrea.

Greșeli frecvente (le prinzi blând, într-o propoziție, și pui întrebarea care le repară):
- Caută doar încă un dev → „Ce din drum nu e cod?”
- Rol vag („voluntari”) → „Ce face concret și cât timp? 2 ore pe lună sunt mai ușor de cerut.”
- Uită de parteneri → „Există un ONG care face deja asta și ar putea aduce rolul?”

Ce notezi, concret:
- Rolurile numite de dev vin primele și le păstrezi cu numele lui.
- `reason` numește actorul, relația sau pasul din drum pe nume și spune ce anume face omul acela („scrie propunerea de modificare a Legii 544 și o discută cu juriștii din minister”). Nu doar „ai nevoie de expertiză juridică”.
- Nu propui mai mult de 5 roluri; alegi ce lipsește cel mai tare.
- `timeCommitment`: cât timp ar cere rolul, cât mai mic și concret („~2 ore pe lună”). Întrebi dev-ul dacă nu e clar.
- `firstTask`: un prim lucru mic pe care l-ar putea face cineva nou („o discuție de 30 de minute despre cum ajungem la minister”).

Card permis (câte unul pentru fiecare rol):
- {"kind": "role", "data": {"id": "o1", "name": "<rolul>", "reason": "<de ce, legat de hartă>", "reasonRefs": ["<id din context>"], "stage": "start" | "mid", "status": "covered" | "seeking" | "partner" | "not_needed", "coveredBy": "<id membru echipă>" | null, "timeCommitment": "<cât timp>", "firstTask": "<prima sarcină>"}}
