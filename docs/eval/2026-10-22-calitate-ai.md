# Evaluarea calității AI-ului (22 oct 2026)

**Concluzie:** prompturile produc planuri concrete și acționabile în majoritatea pașilor. Punctul slab era fiabilitatea răspunsurilor structurate la pașii de la final: precondiții, roluri și backlog. Am reparat trei cauze. Mai e nevoie de o rulare de confirmare cu DeepSeek.

## Cum s-a testat

- 20 de scenarii civic tech din România, de la proiecte mature până la ideea naivă „App pentru tot orașul”, parcurse prin toți cei 10 pași.
- **AI-ul testat:** prompturile reale ale aplicației, cu Claude Sonnet prin CLI în locul DeepSeek. Calitatea măsurată e deci a prompturilor, nu a DeepSeek.
- **Dev-ul simulat:** Claude Haiku, care joacă un voluntar realist, uneori naiv, care nu inventează date.
- **Volum:** 1.079 de apeluri, cam 15 minute pe scenariu (aproape tot timpul e pornirea CLI-ului; cu API-ul direct va fi mult mai rapid).

## Rezultate (prima rulare)

Pași care au produs carduri, din 20 de scenarii:

| Pas | Problema | Ce există | Schimbare țintă | Actori | Proiect | Relații | Precondiții | Ipoteze | Roluri | Backlog |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reușite din 20 | 20 | 19 | 20 | 19 | 17 | 17 | 14 | 14 | 14 | 12 |

- **Întrebări pe scenariu:** cam 20 în total. La un om real asta înseamnă aproximativ 30 de minute, deci ținta se respectă.
- **Ce merge bine:**
  - Precondițiile sunt acționabile: „sun la serviciul de sesizări, 15 minute”, „o cafea cu asociația locală în 10 zile”.
  - Testele ieftine sunt bune.
  - Alertele prind naivitățile reale: „cum află primii oameni de aplicație?”, „ce înseamnă concret «simt presiunea»?”.
  - Rolurile complementare sunt derivate corect din hartă. La bugetare participativă au ieșit: jurist pentru hotărârea de consiliu, jurist GDPR pentru verificarea cu CNP, organizator comunitar pentru pensionarii fără internet, parteneriat cu un ONG.
- **Cauzele eșecurilor (reparate în 25d28e6, 79b6813, 40dabf3):**
  1. La pasul 1, AI-ul uita să noteze funcțiile (5 din 20) și echipa (8 din 20). Fără funcții, backlog-ul eșua la final.
  2. Precondițiile de tipul „echipa face X” foloseau un membru al echipei ca actor, iar validarea le respingea.
  3. La backlog fără funcții, AI-ul inventa id-uri de funcții.
  4. Pe lângă acestea, parsarea tolerează acum text în jurul JSON-ului.

## A doua rulare (6 scenarii care eșuaseră)

- Funcțiile și echipa se notează acum în toate cele 6.
- s07, s11 și s19 s-au îmbunătățit clar. s07 a trecut de la 4/10 la 9/10 pași, fără niciun eșec.
- s02 și s04 au avut eșecuri noi. Rularea a atins limita de utilizare a contului Claude, iar reluarea pașilor nu a mai putut porni. Rezultatul pentru ele e neconcludent și trebuie refăcut.

## Recomandări

- Rulează `npx tsx --env-file=.env.local scripts/smoke-ai.ts` cu cheia DeepSeek, apoi o rundă de 5–10 scenarii cu DeepSeek ca provider.
- **Scope prea mare:** la „App pentru tot orașul” AI-ul nu se opune destul și păstrează toate cele 6 funcții. Merită o alertă nouă pentru proiecte prea largi.
- Relațiile ies adesea vagi („influențează” în ambele sensuri) când dev-ul nu știe nimic. Promptul poate cere explicit tipul relației sau „necunoscut”.
