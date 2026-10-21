# PRD — Ghidul de pornire pentru proiecte civic tech

Oct 21, 2026 · @Lish

Un wizard în 10 pași, cu un AI care pune întrebări, ajută un dezvoltator solo să plece de la proiectul și echipa pe care le are deja și să ajungă, în aproximativ 30 de minute, la o teorie a schimbării simplă (ce schimbare țintește și ce trebuie să fie adevărat înainte), o hartă a actorilor, lista oamenilor de care are nevoie și un backlog de organizare pe termen scurt și mediu. Rezultatul e o pagină web publică a proiectului, pe care echipa o poate modifica oricând printr-un link privat de editare, fără cont.

## 1. Scop

Dezvoltatorii din grup pornesc de la soluție („hai să facem o aplicație pentru X”), nu de la problemă și nu de la oamenii care trebuie să-și schimbe comportamentul. Proiectele civic tech eșuează mai ales din lipsă de utilizatori și de relație cu instituțiile, nu din cauza codului ([research](https://claude.ai/artifact/Hhzpha2tD7rXv4zdvr3obu)).

**Obiective**

- Un dev solo ajunge, în aproximativ 30 de minute, de la proiectul pe care îl are deja la un plan pe care îl poate arăta altora.
- Își formulează pe scurt teoria schimbării: ce schimbare țintește aplicația, pentru cine, și ce precondiții trebuie îndeplinite ca ea să se întâmple.
- Află **de ce fel de alți oameni** are nevoie proiectul, derivat din relațiile dintre actori și din ce lipsește echipei actuale (lobby la o instituție → lobbist; modificare legislativă → jurist).
- Iese cu un backlog de organizare, doar pe termen scurt și mediu: funcțiile pe care le are deja, legate de precondiții, plus pașii de organizare și testele pentru ipotezele riscante. AI-ul nu inventează funcții noi.
- Primește alerte de naivitate pe parcurs, fără să fie blocat.
- Primește la final **o pagină web publică** a proiectului și **un link privat de editare**, pe care le copiază sau și le trimite singur (Gmail, aplicația de email, partajare pe telefon). Planul e viu: se poate schimba oricând, iar pagina publică se actualizează.

**Ce nu facem (non-goals)**

- Nu e o teorie a schimbării pentru dosare de finanțare: fără logframe, indicatori formali, export pentru finanțatori.
- Nu e un tool de colaborare în timp real între membrii unei echipe.
- Nu grupăm încă proiectele la nivel de comunitate (vezi secțiunea 10).
- Nu căutăm oameni în locul dev-ului (matchmaking).

**Ce ar însemna eșec, chiar dacă tehnic merge (anti-goals)**

- AI-ul scrie planul în locul dev-ului: textul e al AI-ului, nu gândirea omului.
- Procesul e lung și plictisitor, iar dev-ii renunță la pasul 2.
- Alertele sună a judecată sau a lecție de metodologie și îi descurajează.
- Vocabularul e de ONG („outcome challenges”, „boundary partners”) în loc de limbaj normal.

## 2. Utilizatori

Utilizatorul principal e un **dezvoltator solo** din grupul civic tech. Lucrează în timpul liber, are de obicei deja o idee clară sau o aplicație începută, cu funcții gândite, și știe să construiască, dar nu știe cu cine trebuie să vorbească sau de cine are nevoie ca proiectul să aibă efect.

| Cine | Ce vrea | Ce îl sperie |
| --- | --- | --- |
| Dev solo cu o idee clară sau o aplicație începută (principal) | Să știe de unde să o ia și ce să construiască primul | Procese lungi, jargon, să i se spună că ideea e proastă |
| Mai mulți dev-i pe aceeași idee, fiecare când are timp | Să continue de unde a rămas altul | Să-și suprascrie munca unul altuia |
| Comunitatea (cititor al rezultatului) | Să vadă rapid ce vrea proiectul și ce oameni caută | Documente lungi, greu de scanat |

Nu există un facilitator uman: AI-ul și structura wizard-ului țin locul lui. Nu există nici conturi sau parole: **cine are linkul de editare poate modifica proiectul**. Mai mulți dev-i pe aceeași idee lucrează pe același proiect trimițându-și linkul de editare, pe rând, nu simultan — *decizia mea pentru v1, vezi secțiunea 10*.

## 3. Wizard-ul: 10 pași, toți vizibili de la început

Primul ecran arată toți cei 10 pași, cu numele, o propoziție despre fiecare și timpul estimat. Dev-ul vede tot drumul înainte să răspundă la prima întrebare. Pe parcurs, pașii rămân într-o bară laterală (sau sus, pe mobil), cu starea fiecăruia: neatins, în lucru, gata, gata cu alerte.

Fiecare pas e o mini-conversație: AI-ul pune 1–3 întrebări, dev-ul răspunde liber, AI-ul propune un rezumat structurat, iar dev-ul îl acceptă sau îl corectează. Doar ce a acceptat dev-ul intră în proiect.

| # | Pas | Ce întreabă AI-ul (exemple) | Ce produce | Timp |
| --- | --- | --- | --- | --- |
| 1 | **Proiectul și echipa** | „Spune-mi pe scurt ce faci și în ce stadiu ești. Ce funcții are aplicația? Cine mai e în echipă, ce știe fiecare și câte ore pe săptămână aveți?” | Descriere, stadiu (idee / prototip / live), zonă (oraș / național), link-uri (repo, demo), lista de funcții, echipa actuală cu abilități și timp, motivația | 4 min |
| 2 | **Problema** | „Ce problemă rezolvă funcțiile astea? Cui? De unde știi?” | Problema în 2–3 propoziții + dovada (sau „neverificat”) | 3 min |
| 3 | **Ce există deja** | „Cine a mai încercat asta? Ce faci diferit?” | Listă scurtă de inițiative + diferența | 2 min |
| 4 | **Schimbarea țintă** | „Dacă aplicația reușește, ce e diferit și pentru cine? Cum ai observa asta peste un an?” | O propoziție de direcție + 1–3 schimbări țintă, fiecare cu un semn observabil | 3 min |
| 5 | **Actorii** | „Cine suferă de problemă? Cine decide? Cine are datele? Cine lipsește din discuție?” | Listă de actori cu tip, putere, poziție | 3 min |
| 6 | **Relațiile** | „Cine îl influențează pe cine? Cine dă bani, aprobă sau poate bloca?” | Relații tipizate între actori | 3 min |
| 7 | **Precondițiile** | „Ca \[schimbarea țintă\] să se întâmple, ce trebuie să fie adevărat înainte? Cine trebuie să facă ce? Și înainte de asta?” | Lanț de precondiții, fiecare cu actorul care face ceva diferit, etapa (început / mediu) și dacă o acoperă aplicația | 4 min |
| 8 | **Ipotezele riscante** | „Care din precondițiile astea e cea mai nesigură? Cum ai verifica-o în două săptămâni, fără cod?” | Top 3 ipoteze + câte un test ieftin pentru fiecare | 3 min |
| 9 | **Oamenii de care ai nevoie** | „Uitându-te la hartă și la echipa ta, ce lipsește?” | Rolurile necesare pe început și mediu, ce acoperă echipa, ce lipsește | 3 min |
| 10 | **Backlog de organizare** | „Care din funcțiile tale ajută la prima precondiție? Ce trebuie organizat în afara codului?” | Funcțiile tale ordonate pe început și mediu, legate de precondiții + pași de organizare + testele de la pasul 8 | 2 min |

La final, un ecran **Rezumat** pune toate rezultatele pe o pagină și oferă exportul (secțiunea 8). Țintă: aproximativ 30 de minute în total, de validat la primul test. AI-ul pune puține întrebări și propune rezumatul devreme; dev-ul corectează mai repede decât scrie.

**Teoria schimbării, pe scurt:** pașii 4, 7 și 8 o formează. Dev-ul spune ce schimbare țintește (4), apoi merge înapoi: ce trebuie să fie adevărat înainte, și înainte de asta (7). La final alege precondițiile cele mai nesigure și un mod ieftin de a le verifica (8). Pașii 5–6 dau actorii care apar în precondiții.

**Etapele** folosite în pașii 7–10, doar două *(definiții propuse de mine, de ajustat)*:

- **Început** (primele \~3 luni): ce trebuie să fie adevărat ca să merite să continui — primii utilizatori, primul aliat într-o instituție.
- **Mediu** (\~3–12 luni): folosire constantă, prima schimbare vizibilă la un actor-cheie.

Termenul lung apare o singură dată, ca direcție: propoziția de la pasul 4 despre ce vrei să se schimbe în cele din urmă. Precondițiile, rolurile și backlog-ul rămân pe început și mediu; ce e mai departe intră într-o listă „mai târziu”.

**Navigare liberă:** dev-ul poate sări la orice pas, se poate întoarce și poate lăsa un pas incomplet. AI-ul doar observă când un pas se bazează pe unul gol („la pasul 5 n-ai actori, vrei să-i adaugi acum?”).

## Fluxul dintr-o privire

&#91;embedded content: fluxul wizard-ului · 10 pași, 3 faze\]

Pașii merg de sus în jos, dar ordinea e o sugestie. Pasul 9 citește actorii, relațiile, precondițiile și echipa de la pasul 1 ca să propună roluri; pasul 10 leagă funcțiile tale de precondiții.

## UX și UI

Fiecare pas e un hibrid: o conversație scurtă scoate informația, iar rezultatul stă în carduri structurate pe care dev-ul le editează direct. Ghidurile practicienilor converg pe asta: chat pentru intenție, ambiguitate și ajutor; controale structurate pentru informația cunoscută dinainte ([UX Planet / SAP Emarsys](https://uxplanet.org/ai-chat-or-not-if-its-a-form-it-should-stay-a-form-0294c59332d6), [InsertChat](https://insertchat.com/glossary/in-chat-form), [OpenDialog](https://www.opendialog.ai/articles/forms-or-conversational-ai-agents-together-is-better)). Sursele sunt bloguri de practică, nu studii controlate.

| Principiu | Ce spun sursele | Cum aplicăm |
| --- | --- | --- |
| Pași cu nume, vizibili mereu | Etichetele pașilor arată ce urmează; punctele numerotate merg la fluxuri scurte și fixe ([Lollypop](https://lollypop.design/blog/2026/february/beyond-the-progress-bar-the-art-of-stepper-ui-design/)) | Bară laterală cu cei 10 pași, grupați pe cele 3 faze, cu starea fiecăruia |
| Progres onest | Indicatorul trebuie să arate efortul rămas, nu numărul de ecrane ([SaaS UI](https://www.saasui.design/blog/saas-multi-step-form-wizard-ux-patterns)) | Afișăm minutele rămase estimate, nu procente |
| Nimic nu se pierde | „Înapoi” care șterge munca și fluxurile care nu pot fi reluate sunt eșecuri frecvente ([SaaS UI](https://www.saasui.design/blog/saas-multi-step-form-wizard-ux-patterns)) | Salvare automată la fiecare card acceptat; reluare oricând prin linkul de editare |
| Libertate, nu tunel | Wizard-urile sunt rigide pentru utilizatorii avansați; uneori un formular scurt e mai bun ([UX Planet](https://uxplanet.org/wizard-design-pattern-8c86e14f2a38), [LogRocket](https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/)) | Salt la orice pas; mod formular fără AI; vedere „tot proiectul” pe o pagină |
| Sugestiile AI arată provizoriu | Conținutul generat apare atenuat până e confirmat; omul acceptă, editează sau respinge ([AI UX Playground](https://aiuxplayground.com/pattern/human-in-the-loop), [Thesys](https://www.thesys.dev/blogs/designing-human-in-the-loop-ai-interfaces-that-empower-users)) | Cardurile propuse au contur punctat și eticheta „propus”; butoane Acceptă / Editează / Șterge; după acceptare devin normale |
| Fricțiune doar unde contează | Aprobările se pun pe acțiuni greu reversibile, nu pe sugestii ușor de anulat ([AI UX Playground](https://aiuxplayground.com/guides/how-to-design-human-in-the-loop)) | Alertele nu blochează; confirmare cerută doar la „Generează link nou” (invalidează linkul vechi) |
| Accesibilitate | Titlu real pentru fiecare pas, focus pe primul câmp la avans, pasul curent marcat pentru cititoarele de ecran ([ghid UX patterns](https://skillselion.com/skills/thedaviddias/ux-patterns-for-developers/wizard)) | Un `h1` per pas, `aria-current="step"` în bara de pași, focus mutat la întrebarea nouă |

**Ecranele** *(propunerea mea)*:

- **Start** — o propoziție despre ce obții, cei 10 pași pe 3 faze cu timpul, butonul Începe.
- **Pas** — pe desktop, trei zone: bara de pași (stânga), conversația (centru), cardurile rezultatului (dreapta). Pe mobil: pașii devin o bară compactă sus („Pasul 4 din 10 · \~16 min rămase”), conversația, apoi cardurile dedesubt.
- **Tot proiectul** — aceeași structură ca pagina publică, dar editabilă; util pentru revenirile ulterioare, când dev-ul vrea să schimbe un singur lucru fără conversație.
- **Păstrează-ți linkurile** — cele două linkuri, butonul de email și butoanele de copiere (F6).
- **Pagina publică** — read-only, se citește de sus în jos (secțiunea 8).

&#91;embedded content: wireframe · ecranul unui pas pe desktop\]

Cardul propus de AI rămâne punctat până când dev-ul îl acceptă; doar cardurile acceptate intră în proiect și în pagina publică.

## 4. De la relații între actori la oamenii de care ai nevoie

Rolurile necesare nu vin dintr-o listă generică, ci din harta actorilor: fiecare rol propus are atașată relația sau schimbarea care îl cere. Dacă dev-ul șterge relația, rolul dispare sau devine opțional.

**Cum funcționează (pasul 9):**

1. AI-ul citește actorii (pasul 5), relațiile (pasul 6), precondițiile (pasul 7) și echipa actuală (pasul 1).
2. Aplică regulile din tabelul de mai jos și propune roluri, fiecare cu motivul în limbaj normal: „Ai nevoie de cineva care face lobby, pentru că *Primăria X* trebuie să-și schimbe procedura (pasul 7) și nu ai încă nicio relație cu ea (pasul 6).”
3. Rolurile pe care le acoperă deja cineva din echipă, după abilitățile de la pasul 1, apar ca **acoperit de \[nume\]**; dev-ul poate corecta.
4. Pentru restul, dev-ul marchează: **caut pe cineva**, **un partener (ONG, instituție) poate face asta** sau **nu e nevoie**.

**Reguli de derivare** *(set inițial propus de mine; lista e configurabilă, nu hardcodată în prompt)*

| Semnal în hartă | Rol necesar | Etapă tipică |
| --- | --- | --- |
| O instituție publică trebuie să-și schimbe o procedură sau să adopte tool-ul | Advocacy / relații instituționale (lobbist) | Mediu |
| Schimbarea cere modificarea unei legi, HG, regulament sau hotărâri de consiliu local | Jurist (drept administrativ) | Mediu |
| Proiectul prelucrează date personale sau se bazează pe cereri 544 | Jurist GDPR / acces la informații | Început |
| Datele sunt la o instituție, în format greu de folosit | Specialist date / date deschise | Început |
| Utilizatorii sunt greu de atins (vârstnici, mediu rural, grupuri vulnerabile) | Organizator comunitar / lucrător de teren | Început |
| Utilizatorii sunt nespecialiști și n-a vorbit nimeni cu ei | Cercetător UX / designer | Început |
| Problema cere cunoștințe de domeniu (sănătate, educație, urbanism) | Expert de domeniu | Început |
| Un ONG are deja relația cu beneficiarii | Parteneriat cu ONG-ul (nu un om nou) | Început |
| Oamenii trebuie să afle de proiect / presa poate pune presiune | Comunicare / relația cu presa | Mediu |
| Un actor puternic se opune | Strateg de campanie | Mediu |
| Nu există răspuns la „cine plătește sau întreține peste un an” | Fundraising / scriere de proiecte | Mediu |

Regulile sunt indicii pentru AI, nu un motor de reguli strict: AI-ul poate propune și alte roluri, dar fiecare trebuie să aibă motivul legat de un element din hartă.

## 5. Alertele de naivitate

O alertă e o notă scurtă lângă răspuns, cu o întrebare și două butoane: **Lucrez la asta acum** sau **Merg mai departe**. Nu blochează niciodată trecerea la pasul următor. Alertele ignorate rămân vizibile în Rezumat, ca „puncte deschise”.

| Alertă | Pas | Ce detectează | Exemplu de mesaj | Detectare |
| --- | --- | --- | --- | --- |
| Echipă fără timp | 1 | Totalul de ore pe săptămână e foarte mic față de ce își propune proiectul | „Aveți împreună 3 ore pe săptămână. Ce ar fi realist de făcut în primele 3 luni?” | Cod + LLM |
| Soluția în problemă | 2 | Problema descrisă ca lipsă a aplicației | „Ai descris ce lipsește (aplicația), nu ce se întâmplă oamenilor. Ce pățesc ei azi?” | LLM |
| Fără dovadă | 2 | Problema nu are nicio sursă: date, discuție, articol, cerere 544 | „De unde știi că problema există? Ai vorbit cu cineva care o are?” | Cod |
| Primul de pe lume | 3 | Nicio inițiativă existentă găsită | „E rar ca nimeni să nu fi încercat. Ai căutat în Civic Tech Field Guide?” | Cod |
| Aplicația ca scop | 4 | Schimbarea țintă e „oamenii folosesc aplicația” | „Și dacă o folosesc, ce e diferit în viața lor sau în instituție?” | LLM |
| Schimbare fără actor | 4, 7 | Schimbare abstractă („transparență crescută”) | „Cine anume face ceva diferit? Ce ai vedea concret?” | LLM |
| Nimeni exclus | 5 | Niciun actor marcat ca exclus sau afectat negativ | „Cine nu poate folosi asta sau pierde ceva dacă reușești?” | Cod |
| Doar utilizatori | 5 | Nicio instituție sau decident în hartă | „Cine poate schimba regula din spatele problemei?” | Cod |
| Actor puternic uitat | 6–7 | Actorul cu cea mai mare putere nu are nicio relație și nu apare în nicio precondiție | „*Ministerul X* e cel mai puternic din hartă, dar nu apare nicăieri. E aliat, obstacol sau neutru?” | Cod |
| Salt magic | 7 | Între o precondiție și ce urmează după ea lipsește mecanismul | „De ce ar duce A la B? Ce trebuie să fie adevărat?” | LLM |
| Totul prin aplicație | 7 | Toate precondițiile sunt marcate „o acoperă aplicația” | „Ce trebuie să se întâmple fără cod? Pe cine trebuie să convingi?” | Cod |
| „Dacă o construim, vin” | 7–10 | Nicio precondiție despre cum ajung oamenii la aplicație | „Cum află primii 50 de oameni de aplicație?” | LLM |
| Ipoteză fără test | 8 | O ipoteză riscantă nu are niciun test | „Cum ai afla în două săptămâni dacă e adevărat?” | Cod |
| Totul pe un om | 9 | Echipa are un singur om, marcat la toate rolurile | „Ai marcat că faci tu și lobby, și juridic, și cod, în 4 ore pe săptămână. E realist?” | Cod |
| Feature orfan | 10 | O funcție din lista ta nu ajută la nicio precondiție | „La ce ajută funcția asta? Poate așteaptă în lista „mai târziu”.” | Cod |
| Doar cod | 10 | Backlog-ul nu are niciun pas de organizare | „Ce trebuie făcut în afara codului: întâlniri, parteneriate, teste cu oameni?” | Cod |

**Tonul:** curios, nu evaluativ. Fără „greșit”, „naiv” sau „slab” în mesaje. Numele intern „alertă de naivitate” nu apare în interfață; acolo e un semn discret, de exemplu „întrebare deschisă”.

**Detectare:** unde se poate, verifică codul, nu LLM-ul (câmpuri goale, legături lipsă). E mai ieftin, previzibil și nu depinde de cum răspunde modelul. LLM-ul acoperă doar alertele care cer înțelegerea textului.

## 6. User stories

Prioritate: **M** = obligatoriu în v1 de test, **S** = ar fi bine în v1, **C** = mai târziu. „Eu” = dev-ul solo, dacă nu scrie altfel.

| ID | Ca... | vreau să... | ca să... | Prio |
| --- | --- | --- | --- | --- |
| **Pornire, proiectul și echipa** |  |  |  |  |
| US-01 | dev | văd toți cei 10 pași și cât durează înainte să încep | știu în ce mă bag și pot împărți munca în mai multe sesiuni | M |
| US-02 | dev | încep descriind aplicația sau ideea pe care o am deja, cu funcțiile ei | tool-ul pornește de la ce am, nu de la zero | M |
| US-03 | dev | lipesc lista de funcții din README sau issues și AI-ul să o împartă în elemente | nu le rescriu de mână | M |
| US-04 | dev | descriu echipa actuală: cine, ce știe, câte ore pe săptămână | rolurile necesare țin cont de ce avem deja | M |
| US-05 | dev | notez stadiul (idee / prototip / live), zona și link-urile | comunitatea înțelege unde e proiectul | S |
| US-06 | dev | văd un exemplu de proiect completat | înțeleg ce fel de răspunsuri se așteaptă | S |
| **Conversația pe fiecare pas** |  |  |  |  |
| US-07 | dev | AI-ul să-mi pună câte o întrebare pe rând, în limbaj normal | nu trebuie să știu metodologie | M |
| US-08 | dev | AI-ul să-mi propună un rezumat structurat, pe care îl accept sau îl corectez | rămâne gândirea mea, nu a AI-ului | M |
| US-09 | dev | editez direct orice element acceptat, fără să trec iar prin chat | corectez repede | M |
| US-10 | dev | spun „nu știu” și să primesc un indiciu sau un exemplu | nu rămân blocat | M |
| **Teoria schimbării** |  |  |  |  |
| US-11 | dev | formulez ce schimbare țintește aplicația și pentru cine | știu spre ce construiesc | M |
| US-12 | dev | dau pentru fiecare schimbare țintă un semn observabil | știu cum aș vedea că merge | M |
| US-13 | dev | merg înapoi de la schimbarea țintă, pas cu pas, la ce trebuie să fie adevărat înainte | văd lanțul de precondiții, nu doar aplicația | M |
| US-14 | dev | leg fiecare precondiție de un actor și de o etapă | știu cine trebuie să facă ce și când | M |
| US-15 | dev | marchez care precondiții le acoperă aplicația și care nu | văd ce trebuie făcut în afara codului | M |
| US-16 | dev | aleg cele mai nesigure 3 precondiții și primesc idei de teste ieftine | verific înainte să construiesc | M |
| US-17 | dev | văd teoria schimbării ca lanț vizual | prind dintr-o privire logica | S |
| **Actori și relații** |  |  |  |  |
| US-18 | dev | adaug actori cu tip, putere și poziție față de proiect | văd cine contează | M |
| US-19 | dev | AI-ul să-mi sugereze actori la care nu m-am gândit, pe baza problemei | nu uit instituții sau grupuri excluse | M |
| US-20 | dev | leg actorii prin relații cu tip (decide, finanțează, influențează, blochează, are datele, reprezintă) | înțeleg pe unde trece puterea | M |
| US-21 | dev | văd actorii și relațiile ca hartă vizuală | prind dintr-o privire structura | S |
| US-22 | dev | văd actorii pe grila putere/interes | știu pe cine să tratez cu prioritate | C |
| **Oamenii de care am nevoie** |  |  |  |  |
| US-23 | dev | primesc o listă de roluri necesare, fiecare cu motivul legat de hartă și de precondiții | înțeleg de ce am nevoie de un jurist sau de un lobbist | M |
| US-24 | dev | văd ce roluri acoperă deja echipa mea | caut doar ce lipsește | M |
| US-25 | dev | marchez rolurile rămase: caut / partener / nu e nevoie | văd clar ce lipsește | M |
| US-26 | dev | văd rolurile împărțite pe început și mediu | nu caut pe toată lumea din prima zi | M |
| **Backlog de organizare** |  |  |  |  |
| US-27 | dev | îmi văd funcțiile existente ordonate pe început și mediu, fiecare legată de o precondiție | construiesc întâi ce contează | M |
| US-28 | dev | văd pașii de organizare: cu cine vorbesc, pe cine caut, ce testez | nu confund aplicația cu proiectul; AI-ul nu-mi inventează funcții noi | M |
| US-29 | dev | reordonez, editez și șterg elemente din backlog | backlog-ul e al meu | M |
| US-30 | dev | export backlog-ul în format de issues (Markdown / CSV) | îl pun în GitHub | S |
| **Alerte** |  |  |  |  |
| US-31 | dev | primesc o alertă când ceva pare naiv, cu o întrebare | îmi dau seama singur de problemă | M |
| US-32 | dev | merg mai departe peste o alertă | nu sunt blocat | M |
| US-33 | dev | văd în Rezumat alertele ignorate | știu ce am lăsat deschis | S |
| **Salvare și continuare** |  |  |  |  |
| US-34 | dev | progresul să se salveze automat | pot închide și reveni oricând | M |
| US-35 | dev | trimit linkul de editare altui dev | îl dau altui dev care continuă | M |
| US-36 | dev | mă întorc la orice pas și modific | ideile se schimbă pe drum | M |
| **Comunitatea** |  |  |  |  |
| US-37 | membru al comunității | citesc un rezumat de o pagină al proiectului, cu schimbarea pe care o țintește | înțeleg rapid ce vrea și dacă pot ajuta | M |
| US-38 | membru al comunității | văd rolurile căutate de proiect | știu dacă sunt omul de care e nevoie | M |
| US-39 | membru al comunității | văd toate proiectele grupului pe o hartă comună | văd suprapuneri și goluri | C |

**Pagina publică și linkurile**

| ID | Ca... | vreau să... | ca să... | Prio |
| --- | --- | --- | --- | --- |
| US-40 | dev | primesc la final un link public către pagina proiectului | o pun pe Discord sau GitHub | M |
| US-41 | dev | primesc un link privat de editare, fără cont și fără parolă | revin și modific oricând | M |
| US-42 | dev | copiez fiecare link cu un click | îl pun unde vreau | M |
| US-43 | dev | îmi trimit linkurile prin Gmail sau aplicația de email, cu mesajul deja scris | nu le pierd, indiferent ce folosesc | M |
| US-44 | dev | pe telefon, partajez linkurile prin meniul nativ | le trimit în WhatsApp, Signal sau note | S |
| US-45 | dev | văd clar că linkul de editare nu poate fi recuperat dacă îl pierd | îl salvez înainte să închid | M |
| US-46 | dev | modific orice pas și apoi actualizez pagina publică | planul rămâne viu, iar pagina nu arată stări pe jumătate | M |
| US-47 | dev | generez un link de editare nou, care îl invalidează pe cel vechi | controlez cine poate edita | S |
| US-48 | membru al comunității | văd pe pagina publică data ultimei actualizări | știu dacă planul e la zi | M |
| US-49 | membru al comunității | contactez echipa direct de pe pagină pentru un rol | mă implic ușor | S |
| US-50 | dev | văd versiunile anterioare ale paginii publice | văd cum a evoluat planul | C |

## 7. Fluxuri logice

**F1 — Prima intrare**

1. Ecran de start: titlu, o propoziție despre ce obții, cei 10 pași cu timpul estimat (\~30 de minute).
2. Două butoane: **Începe un proiect nou** sau **Continuă un proiect** (lipești linkul de editare).
3. Proiect nou → pasul 1, Proiectul și echipa: dev-ul descrie aplicația, stadiul și echipa, apoi lipește lista de funcții (din README, issues sau scrisă liber); AI-ul o împarte în elemente pe care dev-ul le confirmă.

**F2 — Bucla pe un pas** (la fel pentru toți pașii)

1. Dev-ul intră în pas. AI-ul primește ca context: obiectivul pasului, întrebările-ghid, tot ce s-a acceptat în pașii anteriori.
2. AI-ul pune o întrebare. Dev-ul răspunde liber.
3. Se repetă până când AI-ul are destul pentru rezumat (țintă: 1–3 întrebări) sau dev-ul apăsă **Propune rezumatul acum**.
4. AI-ul propune rezumatul ca **carduri editabile** (ex.: un card per actor), nu ca text liber.
5. Dev-ul: acceptă tot, editează un card, șterge un card sau cere „mai încearcă”.
6. La acceptare: verificările din cod și cele din LLM rulează → alertele apar lângă cardurile vizate.
7. Dev-ul rezolvă o alertă (întoarcere la pasul 2 al buclei, cu întrebarea alertei) sau apasă **Pasul următor**.

**F3 — „Nu știu”**

1. Dev-ul răspunde „nu știu” sau apasă butonul cu același nume.
2. AI-ul dă un indiciu legat de proiectul lui, apoi, dacă tot nu merge, un exemplu dintr-un proiect fictiv.
3. Dacă tot nu, întrebarea se marchează **de aflat** și dev-ul merge mai departe. „De aflat” apare în backlog ca activitate non-tech (ex.: „vorbește cu 3 oameni din grupul X”).

**F4 — Revenire la un pas anterior**

1. Dev-ul face click pe un pas din bara de pași și modifică ceva.
2. Elementele din pașii următori care depind de ce s-a schimbat se marchează **de revizuit** (ex.: actor șters → relațiile lui, schimbările lui, rolurile derivate din el, features legate).
3. Nimic nu se șterge automat. La revenire în pasul afectat, AI-ul întreabă ce să facă cu fiecare element marcat.

**F4b — Teoria schimbării (pașii 4, 7, 8)**

1. La pasul 4, dev-ul formulează 1–3 schimbări țintă, fiecare cu un semn observabil, plus o propoziție de direcție pe termen lung.
2. La pasul 7, AI-ul ia prima schimbare țintă și întreabă „ce trebuie să fie adevărat chiar înainte?”. Fiecare răspuns devine o precondiție legată de ce urmează după ea. Se repetă de 2–3 ori, până la ceva ce echipa poate începe acum.
3. Fiecare precondiție primește: actorul care face ceva diferit (din pasul 5 sau unul nou, adăugat automat în hartă), etapa (început / mediu) și dacă o acoperă aplicația.
4. Se repetă pentru celelalte schimbări țintă; precondițiile comune se leagă, nu se dublează.
5. La pasul 8, dev-ul alege cele mai nesigure 3 precondiții. AI-ul propune câte un test ieftin, fără cod (interviuri, o cerere 544, o întâlnire). Testele intră în backlog la pasul 10.

**F5 — Derivarea rolurilor (pasul 9)**

1. AI-ul aplică regulile din secțiunea 4 pe actori, relații și precondiții → lista de roluri, fiecare cu motivul și elementul din hartă care îl cere.
2. Compară lista cu echipa de la pasul 1 și marchează rolurile deja acoperite.
3. Dev-ul corectează și marchează restul (caut / partener / nu e nevoie).
4. Alerta „Totul pe un om” rulează; un rol propus fără element din hartă atașat nu e afișat deloc.

**F5b — Backlog-ul de organizare (pasul 10)**

1. AI-ul ia funcțiile de la pasul 1 și propune, pentru fiecare, precondiția de la pasul 7 la care ajută. Nu propune funcții noi.
2. Funcțiile fără nicio precondiție primesc alerta „Feature orfan”; dev-ul le păstrează, le mută în „mai târziu” sau le șterge.
3. Funcțiile rămase se ordonează pe început și mediu, după etapa precondiției pe care o susțin.
4. AI-ul adaugă pașii de organizare: testele de la pasul 8, câte un pas pentru fiecare rol marcat „caut” sau „partener” (pasul 9) și pentru fiecare precondiție pe care aplicația nu o acoperă.
5. Întrebările rămase „de aflat” intră tot ca pași de organizare.
6. Dev-ul reordonează, editează sau șterge orice element.

**F6 — Publicarea și linkurile**

1. Ecranul Rezumat arată pagina publică așa cum va arăta. Dev-ul apasă **Publică**.
2. Serverul creează două linkuri: **publicul** `/p/<slug>` (numele proiectului + un sufix scurt aleator) și **cel de editare** `/e/<token>` (token aleator lung, vezi secțiunea 9).
3. Ecranul **Păstrează-ți linkurile**:
   - un avertisment vizibil, nu o notă mică: „Linkul de editare e singura cheie a proiectului. Dacă îl pierzi, nu-l putem recupera.”;
   - fiecare link cu butonul **Copiază**;
   - blocul **Trimite-ți-le**: **Gmail** **(link care deschide fereastra de compunere în browser, cu subiectul și linkurile deja scrise; merge** pe PC fără aplicație de email, dacă utilizatorul e logat în browser), **Aplicația de email** (`mailto:`, pentru cine are una), iar pe telefon **Partajează** (meniul nativ, doar unde browserul îl oferă).
4. Mesajul e scurt: subiect „Linkurile proiectului \[nume\]”, două rânduri de explicație și cele două linkuri, sub \~1.500 de caractere, ca să încapă în limitele URL-urilor de compunere ([Microsoft](https://learn.microsoft.com/en-us/archive/blogs/ieinternals/url-length-limits), [MAPLE](https://github.com/codeforboston/maple/issues/1964)).
5. Până când dev-ul apasă **Am salvat linkurile**, browserul cere confirmare dacă încearcă să închidă tab-ul.
6. Exportul Markdown / JSON rămâne ca opțiune secundară, în meniul proiectului.

**F7 — Revenirea și actualizarea (prin linkul de editare)**

1. Cine deschide `/e/<token>` intră direct în proiect, pe ecranul Tot proiectul, cu starea fiecărui pas și un rezumat AI de 3 rânduri.
2. Poate modifica orice pas, prin conversație sau direct în carduri. Modificările se salvează automat ca **ciornă**; pagina publică nu se schimbă încă.
3. O bară sus arată „Ai modificări nepublicate” și butonul **Actualizează pagina publică**.
4. La actualizare, pagina publică preia noua versiune și data actualizării.
5. Alt dev continuă proiectul dacă primește linkul de editare. Dacă doi editează în același timp, aplicația avertizează când ciorna s-a schimbat de când ai deschis-o și întreabă ce versiune păstrează *(decizia mea: fără colaborare în timp real în v1)*.

**F8 — AI-ul nu răspunde sau răspunde prost**

1. Eroare de API → reîncercare automată o dată, apoi mesaj și buton **Reîncearcă**.
2. Orice pas are un **mod formular**: aceiași câmpi, completați manual, fără AI. Wizard-ul rămâne utilizabil și când modelul cade.
3. Răspuns invalid de la model (rezumat care nu respectă schema) → o reîncercare cu mesajul de eroare, apoi trecere în mod formular cu ce s-a putut extrage.

**F9 — Link de editare scurs sau pierdut**

1. Link ajuns unde nu trebuie: din editare, **Generează link nou**, cu confirmare. Linkul vechi nu mai funcționează, iar ecranul Păstrează-ți linkurile apare din nou.
2. Link pierdut: în v1 nu există recuperare. Pagina publică rămâne online. Dev-ul poate porni un proiect nou, iar AI-ul poate prelua conținutul din pagina publică veche ca punct de plecare *(C, mai târziu)*.
3. Când grupul va avea un domeniu, se poate adăuga emailul trimis de server și recuperarea prin email, fără să schimbe restul fluxului.

## 8. Rezultatul final

Rezultatul e o **pagină web publică**, la `/p/<slug>`, citită în 2 minute de dev și de comunitate. E doar pentru citire, arată data ultimei actualizări și se schimbă doar când echipa apasă Actualizează pagina publică (F7). Sus are o „carte de vizită”: numele, problema într-o propoziție, schimbarea țintă, stadiul și rolurile căutate. Dedesubt urmează secțiunile complete, în ordinea:

1. **Proiectul și echipa** — ce face, stadiul, zona, link-urile, echipa actuală și timpul ei, plus un contact opțional (email sau Discord) pentru cine vrea să ajute.
2. **Problema** — 2–3 propoziții + dovada sau „neverificat”.
3. **Ce există deja** — inițiative similare și ce e diferit.
4. **Teoria schimbării** — direcția, schimbările țintă cu semnul lor observabil și lanțul de precondiții pe început și mediu, fiecare cu actorul ei.
5. **Ipotezele riscante** — top 3 și testul fiecăreia.
6. **Harta actorilor** — actori și relații (vizual în aplicație, listă în export).
7. **Echipa căutată** — tabel: rol · de ce (legătura cu harta) · etapă · stare (acoperit de cineva / caut / partener).
8. **Backlog de organizare** — doar început și mediu: funcțiile tale existente, testele și pașii de organizare, fiecare legat de precondiția pe care o susține. Ce e mai departe intră într-o listă „mai târziu”.
9. **Puncte deschise** — alertele ignorate și ce e marcat „de aflat”.

**Exemplu de element de backlog:**

| Etapă | Tip | Element | Susține precondiția |
| --- | --- | --- | --- |
| Început | Non-tech | Discuție cu 5 asociații de proprietari despre cum raportează azi problemele | Asociațiile raportează problemele prin platformă, nu la telefon |
| Început | Feature | Formular de raportare cu poză și locație | Asociațiile raportează problemele prin platformă, nu la telefon |
| Mediu | Non-tech | Întâlnire cu direcția tehnică a primăriei (cere lobbist) | Primăria răspunde la sesizări în 30 de zile, public |

*Exemplu inventat, doar pentru format.*

## 9. Model de date și cerințe tehnice

Tot proiectul e un singur obiect JSON, salvat în Supabase în două variante: ciorna (ce editează echipa) și versiunea publicată (ce vede comunitatea). Legăturile dintre elemente sunt prin ID-uri: relație → actori, precondiție → actor și → ce urmează după ea (altă precondiție sau o schimbare țintă), rol → elementele din hartă care îl cer, element de backlog → funcție și precondiție. Pe ele se bazează alertele, derivarea rolurilor și marcarea „de revizuit”.

```json
{
  "version": 1,
  "project": { "name": "Sesizări pentru asociații de proprietari", "description": "...",
               "stage": "prototype", "area": "București", "links": ["https://github.com/..."],
               "motivation": "...", "contact": "..." },
  "team": [{ "name": "Ana", "skills": ["frontend", "design"], "hoursPerWeek": 5 }],
  "features": [{ "id": "f1", "text": "Formular de raportare cu poză și locație" }],
  "steps": { "problem": { "status": "done", "messages": [] } },
  "problem": { "statement": "...", "evidence": ["..."], "verified": false },
  "existing": [{ "name": "...", "url": "...", "difference": "..." }],
  "direction": "...",
  "targetChanges": [{ "id": "t1", "text": "Primăria răspunde public la sesizări în 30 de zile",
                     "signal": "..." }],
  "actors": [{ "id": "a1", "name": "Primăria sectorului", "type": "institution",
               "power": "high", "stance": "unknown", "excluded": false }],
  "relations": [{ "id": "r1", "from": "a1", "to": "a2", "type": "decides", "note": "..." }],
  "preconditions": [{ "id": "p1", "text": "...", "actorId": "a1", "stage": "mid",
                     "leadsTo": "t1", "coveredByApp": false, "assumption": "...",
                     "risky": true, "test": "..." }],
  "roles": [{ "id": "o1", "name": "Lobbist", "reasonRefs": ["p1", "r1"],
              "stage": "mid", "status": "seeking", "coveredBy": null }],
  "backlog": [{ "id": "b1", "stage": "start", "kind": "feature", "featureId": "f1",
                "preconditionId": "p2" }],
  "alerts": [{ "code": "powerful_actor_unused", "step": 7, "refs": ["a1"], "status": "dismissed" }],
  "stale": ["p1"]
}
```

Valori fixe: `stage` proiect = idea, prototype, live · `type` actor = user, institution, ngo, media, funder, business, other · `type` relație = decides, funds, influences, blocks, holds\_data, represents · `stage` precondiție / rol / backlog = start, mid · `leadsTo` = ID-ul unei alte precondiții sau al unei schimbări țintă · `kind` backlog = feature, test, organizing · `status` rol = covered, seeking, partner, not\_needed.

**Cerințe tehnice**

| Zonă | Cerință |
| --- | --- |
| Găzduire | Vercel, pe subdomeniul gratuit `*.vercel.app` (nu e nevoie de domeniu propriu) |
| Bază de date | Supabase Postgres, un tabel `projects`: `id`, `slug` (unic), `edit_token_hash`, `draft` (jsonb), `published` (jsonb), `published_at`, `draft_updated_at`, `created_at` |
| Acces fără login | Două linkuri: public `/p/<slug>` citește `published`; editare `/e/<token>` citește și scrie `draft`. Modelul e „capability URL”: cine are linkul are accesul ([W3C TAG](https://www.w3.org/TR/capability-urls)) |
| Tokenul de editare | Aleator, minim 128 de biți; în bază se păstrează doar hash-ul lui; se poate regenera (F9) |
| Securitate | Fără acces direct din browser la tabel (RLS fără politici pentru `anon`); toate citirile și scrierile trec prin rutele server din Vercel, cu cheia `service_role` doar pe server ([Supabase, de verificat în docs](https://vibeappscanner.com/guide/secure-supabase-app)); `Referrer-Policy: no-referrer` și `noindex` pe paginile de editare; fără scripturi externe pe paginile de editare |
| Costuri și abuz | Limită de proiecte noi și de apeluri AI pe IP și pe token (apelurile DeepSeek costă) |
| Model | DeepSeek, modelul deepseek-flash (setat prin variabila de mediu DEEPSEEK\_MODEL) |
| Cheia de API | Doar în variabilele de mediu Vercel, niciodată în browser |
| Ieșiri structurate | Rezumatul fiecărui pas cerut ca JSON, validat pe schemă în cod; la eșec, o reîncercare, apoi mod formular (F8) |
| Prompturi | Un prompt de sistem comun + unul per pas, în fișiere separate, editabile fără cod |
| Context | La fiecare pas, modelul primește doar ce s-a acceptat în pașii anteriori, nu tot istoricul de chat |
| Alerte | Cele marcate „Cod” în secțiunea 5 = funcții deterministe; cele „LLM” = un apel separat, scurt |
| Limba | Interfața și AI-ul în română |
| Date personale | Nu cerem și nu stocăm email; contactul de pe pagina publică e opțional și public; interfața sugerează roluri, nu nume de funcționari; nu loghăm conținutul conversațiilor |
| Dispozitive | Desktop întâi; utilizabil pe mobil (bara de pași compactă sus) |

Stack: Vercel și Supabase sunt alegerea ta. Propunerea mea pentru aplicație e Next.js: paginile publice se randează pe server, așa că linkul pus pe Discord sau WhatsApp arată un preview corect (titlu, descriere), iar rutele server țin cheile departe de browser.

## 10. Scope v1, mai târziu, întrebări deschise

V1 e o versiune de test: cei 10 pași cap-coadă, cu toate user stories marcate **M**, pe câțiva dev-i reali din grup.

| În v1 | Mai târziu |
| --- | --- |
| Ecran de start cu toți pașii, navigare liberă | Colaborare în timp real între dev-i |
| Cei 10 pași cu bucla AI + mod formular | Hartă vizuală a relațiilor (US-21), grila putere/interes (US-22) |
| Actori și relații ca listă editabilă | Potrivire cu oameni din comunitate care au rolurile căutate |
| Derivarea rolurilor din hartă și din echipă | Email trimis de server și recuperarea linkului (când există domeniu) |
| Alertele din secțiunea 5 | Istoricul versiunilor paginii publice (US-50) |
| Pagina publică + linkul de editare, ciornă și publicare | „Proiectele tale pe acest dispozitiv” (localStorage), cod QR |
| Copiază + Gmail / aplicația de email / partajare pe telefon | Export CSV pentru issues (US-30), integrare GitHub |
| Rezumat pe o pagină | Harta comună a tuturor proiectelor grupului (US-39) |

**Cum știm că v1 merge** *(propunere)*: din primii 5–10 dev-i care încep, cel puțin jumătate ajung la backlog în cel mult 40 de minute; după sesiune, fiecare poate spune ce rol caută și de ce, și ce construiește primul. După fiecare test, o discuție de 15 minute: unde s-a plictisit, ce alertă l-a enervat, ce alertă l-a ajutat.

**Întrebări deschise**

- [ ] Cine sunt primii 3–5 dev-i care testează și pe ce proiecte?
- [ ] Cine plătește apelurile către DeepSeek în perioada de test și ce limită lunară punem?
- [ ] Modelul deepseek-flash acceptă răspunsuri JSON (response\_format)? De verificat la primul apel real.
- [ ] Definirea etapelor (3 luni / 3–12 luni) se potrivește cu ritmul unor voluntari?
- [ ] Cine din grup (sau din afară: un jurist, cineva din advocacy) verifică regulile de derivare a rolurilor?
- [ ] Harta vizuală a relațiilor intră în v1? Ai spus că relațiile sunt importante; o listă poate fi prea puțin.
- [ ] Paginile publice pot fi indexate de Google sau rămân doar pentru cine are linkul?
- [ ] Cine poate șterge un proiect abuziv sau spam, dacă nu există conturi?
