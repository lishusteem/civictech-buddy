# Pagina publică a proiectului: structura informației (variantele A și B)

**Pe scurt:** pagina actuală e subțire pentru că primește puține informații, nu pentru că AI-ul scrie prost. Cu prompturile noi, cardurile ies mai detaliate (vezi rularea pe răspunsurile reale, secțiunea 4). Pentru o pagină pe care oamenii o înțeleg și pe baza căreia acționează lipsesc însă patru lucruri pe care nu le cerem încă:

- un caz concret;
- cifrele de până acum;
- timpul cerut fiecărui rol;
- prima sarcină pentru cine vrea să ajute.

Propunerea are trei părți:

- o structură nouă pentru A (Povestea) și B (Harta), bazată pe cum citesc oamenii pe web și pe cum se comunică problemele sociale;
- patru câmpuri mici noi, cerute în pașii existenți;
- o propoziție-rezumat generată din date.

Machetă: [mockups/pagina-proiect-variante.html](mockups/pagina-proiect-variante.html).

---

## 1. Ce spune cercetarea

| Principiu | Ce înseamnă pentru noi | Sursa |
| --- | --- | --- |
| **Oamenii scanează, nu citesc.** 79% scanează o pagină nouă; doar 16% citesc cuvânt cu cuvânt. Ochii merg pe titluri și pe primele cuvinte. | Titlurile secțiunilor spun ideea („Oamenii nu află dacă instituția le-a răspuns”), nu doar eticheta („Problema”). Eticheta stă mică, deasupra. | NN/g, via [Codecademy](https://www.codecademy.com/article/how-users-scan), [JHU web writing](https://sites.krieger.jhu.edu/using-your-site/web-writing/) |
| **Piramida inversată.** Ce contează cel mai mult stă sus, detaliile jos. | Primul ecran răspunde la: ce e, pentru cine, ce schimbă, cum ajut. | idem |
| **Valoare → problemă → soluție.** Întâi ce e în joc, apoi problema concret, apoi soluția. Soluțiile dau sentimentul că se poate face ceva; tonul de criză descurajează. | Pornim de la ce pierd oamenii azi, nu de la „criza transparenței”. Încheiem fiecare secțiune cu ce se poate face. | [FrameWorks Institute](https://www.frameworksinstitute.org/article/five-framing-tips-framing-for-social-change/), [rezumat Big Think](https://bigthink.com/?p=71918) |
| **Lanțuri explicative.** Oamenii înțeleg o schimbare când văd cauza și efectul, pas cu pas, cu un exemplu concret. | Drumul schimbării apare ca 3–4 pași legați prin „ca să…”, nu ca diagramă completă. | [FrameWorks, What's in a frame](https://www.frameworksinstitute.org/article/whats-in-a-frame/) |
| **Teoria schimbării pentru public: Nevoia → Munca → Rezultatele.** Modelele cu săgeți și ipoteze îi pierd pe cei din afară. | Pagina publică are trei blocuri mari. Harta completă stă în varianta B sau după un link. | [Kevin L. Brown, ToC cheat sheet](https://kevinlbrown.substack.com/p/a-theory-of-change-cheat-sheet) |
| **Teoria schimbării într-o propoziție:** „Pentru că (de ce), lucrăm (unde) ca să ajutăm (pe cine) să (ce), prin (cum), ca să (când/rezultat).” | O propoziție-rezumat generată din date, sus pe pagină. | [Kevin L. Brown, One-sentence ToC](https://kevinlbrown.substack.com/p/the-one-sentence-theory-of-change) |
| **Narațiune, nu doar fapte.** Oamenii raționează în povești; fără narațiune, alții scriu povestea în locul tău. | Un caz concret („Ana a trimis o cerere la primărie și…”) face problema reală. | [EA Forum, The narrative behind your impact](https://forum.effectivealtruism.org/posts/7yjFc4ewSLyip68oE/the-narrative-behind-your-impact) |
| **Voluntarii au nevoie de roluri clare, timp cerut, o primă sarcină ușoară și semne că proiectul e viu.** Mulți vin fără să știe cod. | Fiecare rol are timpul cerut și prima sarcină. Rolurile non-cod sunt spuse explicit. Pagina arată data actualizării și ce s-a făcut recent. | [Code for Philly](https://codeforphilly.org/blog/suggestions_for_attracting_project_volunteers), [Code for Pakistan](https://codeforpakistan.org/volunteer/register), [Idealist](https://www.idealist.org/en/volunteer-opportunity/f7340e6ce1c2419e926bed006156db59-open-sprints-civic-tech-camp-femmecubator-inc-new-york) |
| **Sinceritatea câștigă încredere.** Spune ce încă nu știi. | O singură secțiune scurtă: „Ce încă nu știm”, cu ipotezele riscante și testul fiecăreia. | [Chronicle of Philanthropy](https://www.philanthropy.com/solutions/the-value-of-conveying-complex-ideas-in-simple-terms/) |

---

## 2. Varianta A — Povestea (pentru link trimis pe grup, 2 minute)

Ordinea răspunde pe rând la întrebările unui om care dă clic pe link:

| # | Bloc | Întrebarea omului | Conținut | Din ce date |
| --- | --- | --- | --- | --- |
| 1 | **Antet** | Ce e asta? | Numele; propoziția-rezumat („Pentru că…, construim…, ca să…”); etichete: stadiu, oraș/țară, echipă, actualizat; butoanele „Vreau să ajut ↓” și „Încearcă aplicația ↗” | `project`, `problem`, `targetChanges[0]`, `team`, `publishedAt` |
| 2 | **Ce e în joc** (Nevoia) | De ce m-ar interesa? | Titlu-afirmație = primul punct al problemei; **cazul concret** (nou); restul punctelor; „De unde știm” | `problem.statement`, `problem.example` (nou), `problem.evidence` |
| 3 | **Ce facem** (Munca) | Ce face proiectul, concret? | Titlu-afirmație = primul punct din soluție; „Merge deja” cu **cifrele de până acum** (nou); „Urmează” | `project.description`, `features` (done/planned), `project.traction` (nou) |
| 4 | **Ce se schimbă** (Rezultatele) | Și ce iese din asta? | Rezultatele pe termen lung cu indicatori; dedesubt, **drumul pe scurt** în 3–4 pași „ca să…” pentru primul rezultat; link „Vezi harta completă” spre varianta B | `targetChanges`, drumul (`preconditions` cu `level`), `direction` |
| 5 | **Ce încă nu știm** | E realist? | 1–3 ipoteze riscante, fiecare cu testul ei | `preconditions.risky`, `test` |
| 6 | **Unde suntem** | E viu proiectul? | Ce s-a livrat; următorii 3 pași, cu data actualizării | `features.done`, activitățile, `publishedAt` |
| 7 | **Cum poți ajuta** | Ce pot face eu? | Rolurile, fiecare cu: de ce e nevoie, **cât timp cere** (nou), **prima sarcină** (nou); mențiunea „nu trebuie să știi cod”; contactul | `roles` + câmpuri noi, `project.contact` |

Ce scoatem față de acum: lista lungă de actori și relații. Ei apar doar în varianta B. În A, actorii apar doar prin drum: „ca jurnaliștii să…”.

## 3. Varianta B — Harta (pentru cine vrea să înțeleagă strategia)

| Zonă | Conținut |
| --- | --- |
| **Coloana din stânga (fixă)** | Numele, propoziția-rezumat, problema în 3 puncte, stadiul și echipa, „Vreau să ajut ↓” |
| **Cum citești harta** (o linie, deasupra) | „De la stânga la dreapta: ce facem → ce livrăm → ce fac alții diferit → impactul. Ce e galben e încă nesigur.” |
| **Selectorul de drum** | Câte un buton pentru fiecare rezultat pe termen lung, plus „Tot” |
| **Harta** | Benzile Activities / Outputs / Outcomes / Impact cu sferele de control, influență și interes (ca în [harta-schimbarii.html](mockups/harta-schimbarii.html)). Carduri cu actor, indicator și ipoteză. |
| **Panoul de detalii** (la clic pe un card) | Ce e; cine face; indicatorul; de ce duce la pasul următor (ipoteza); dacă e nesigur, testul; ce roluri ajută aici |
| **Sub hartă** | Narațiunea „ca să…” a drumului ales; cine contează (actorii grupați, cu notele lor); ce încă nu știm; cum poți ajuta |

---

## 4. E pagina subțire din cauza datelor sau a afișării?

Din amândouă.

- **Datele, cu prompturile noi, sunt mai bogate.** Problema e în puncte cu dovezi, soluția în puncte, actorii au „de ce contează”, drumul are niveluri, indicatori și ipoteze, iar testele sunt concrete. Macheta folosește conținutul ieșit din rularea răspunsurilor tale reale prin prompturile noi, cu Haiku în locul lui DeepSeek.
- **Afișarea pierdea date pe care le avem deja:**
  - nu exista o propoziție-rezumat;
  - titlurile erau etichete („Problema”), nu afirmații;
  - drumul nu arăta niveluri;
  - nu se vedea ce e nesigur.
- **Lipsesc patru informații** pe care oamenii le caută și pe care nu le cerem încă. Le adăugăm ca întrebări în pașii existenți, fără pași noi:

| Câmp nou | Unde îl cerem | Întrebarea AI-ului |
| --- | --- | --- |
| `problem.example` | Pasul 2 (deja cere „povestește-mi un caz concret”) | AI-ul îl notează ca un caz scurt, anonim („O mamă din Sectorul 3 a…”) |
| `project.traction` | Pasul 1 | „Ai deja cifre? Câți oameni au folosit-o, câte cereri, ce s-a întâmplat?” |
| `role.timeCommitment` | Pasul 9 | „Cât timp i-ai cere? 2 ore pe lună sunt mai ușor de cerut.” |
| `role.firstTask` | Pasul 9 | „Care ar fi primul lucru mic pe care l-ar putea face cineva nou?” |

**Propoziția-rezumat** e generată din date, fără AI, după formula: „Pentru că [primul punct din problemă], construim [primul punct din soluție], ca [actorul primului rezultat pe termen lung] să [comportamentul].” La publicare, dev-ul o poate edita.

---

## 5. Ce a arătat rularea reală (prompturile noi, răspunsurile tale)

**Ce iese bine:**
- **Drumul schimbării:** are niveluri corecte. Clasamentul lunar e o realizare, iar ce fac presa, ONG-urile și Guvernul sunt rezultate.
- **Indicatori și ipoteze:** fiecare pas are un indicator și o ipoteză pe săgeată.
- **Testul pentru ipoteza riscantă** e concret: roundtable cu 10–15 ONG-uri, cu criteriu de decizie.
- **Actorii** au „de ce contează” scris clar.

**Ce trebuie reparat:**
- **Pași de backlog care copiază rezultatele.** Generatorul automat (`buildOrganizingItems`) a pus în backlog rezultatele din drum ca „pași de organizare” („Guvernul adoptă… penalizări”), deși ele nu sunt activități. Trebuie generați pași doar pentru realizările (outputs) pe care aplicația nu le livrează, formulați ca acțiune.
- **Două schimbări într-un singur pas.** „Guvernul adoptă și implementează” are două schimbări; promptul cere să fie separate, dar AI-ul nu le-a separat. Trebuie întărit cu un exemplu în prompt.
- **Lipsesc** contactul, motivația, cazul concret, cifrele de până acum, timpul cerut de fiecare rol și prima sarcină.

**Titlurile-afirmație** din machetă („Oamenii nu știu cui să ceară informații publice…”) sunt scrise de mână. În aplicație le generează AI-ul o singură dată, la publicare, dintr-un apel scurt, cu un titlu pe secțiune. Dev-ul le poate edita.
