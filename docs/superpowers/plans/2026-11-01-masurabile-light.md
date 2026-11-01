# Măsurabile light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un pas nou, „Cum vedem dacă merge”, în care echipa lucrează o măsură-cheie și două măsuri simple, afișate apoi pe pagina proiectului și pe hartă.

**Architecture:** `measures` e o listă nouă pe proiect și un `EntityKind` nou, care trece prin același flux de carduri ca restul. Logica de stare stă în `src/lib/project/measures.ts`. Proiectele vechi sunt aduse la forma nouă de `normalizeProject`, la citirea din repo și la salvare.

**Tech Stack:** Next.js, React, TypeScript, Zod, Vitest, Testing Library, Supabase.

**Spec:** `docs/superpowers/specs/2026-11-01-masurabile-light-design.md`

## Global Constraints

- Lucrezi pe branch-ul `feat/masurabile-light`, nu pe `main`.
- Nu adaugi în commit `.claude/` și `docs/video/`, care sunt nesalvate de dinainte.
- Fiecare mesaj de commit se încheie cu `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `signal` rămâne neschimbat în date.
- `measures`: cel mult 3 elemente, cel mult unul pe `role`. Roluri: `key`, `delivery`, `longTerm`.
- Pasul: id `measures`, titlu `Cum vedem dacă merge`, faza `toc`, 8 minute, numărul 9. Rolurile devin 10, Activitățile 11.
- Fără cifre sau valori inventate: `counts`, `today`, `enough`, `ifBelow` vin doar de la echipă.
- Fără scor, procente de progres sau culori de eroare în afișare.
- Fără comutator per proiect, instrumentare în aplicație, urmărire în timp sau export.
- `src/lib/backlog/organizing.ts` rămâne neatins.
- Textele pentru utilizatori sunt în română, cu diacritice cu virgulă (ș, ț).

## Review Focus

1. Pasul legat de o măsură e șters: editorul arată „Pasul nu mai există”, nu un id, iar pagina publică ascunde măsura. Teste: Task 4, Task 5.
2. „Azi” e `0` față de gol: `0` se afișează ca valoare, iar golul ca „nu știm încă”. Test: Task 5.
3. AI-ul sau formularul adaugă a doua măsură cu același `role`: rămâne ultima, fără eroare la salvare. Test: Task 1.
4. Un tab deschis înainte de lansare salvează un draft fără `measures`: salvarea reușește, fără 422 și fără pierdere de date. Test: Task 2.
5. `what` format doar din spații la măsura-cheie: pasul rămâne incomplet și pașii următori rămân blocați. Test: Task 1.

---

### Task 1: Modelul de date și pasul nou

**Files:**
- Create: `src/lib/project/measures.ts`, `src/lib/project/measures.test.ts`
- Modify: `src/lib/project/schema.ts`, `src/lib/project/empty.ts`, `src/lib/project/entities.ts`, `src/lib/project/humanText.ts`
- Modify: `src/lib/steps/definitions.ts`, `src/lib/steps/completion.ts`, `src/lib/steps/completion.fixtures.ts`, `src/lib/steps/requirements.ts`, `src/lib/steps/waitTips.ts`
- Modify: `src/lib/alerts/messages.ts`, `src/components/start/StartScreen.tsx`, `src/lib/ai/provider.ts`
- Modify: `src/components/editor/CardEditor.tsx` (doar intrările necesare tipurilor; comportamentul în Task 4)
- Test: `src/lib/steps/completion.test.ts`, `src/lib/steps/requirements.test.ts`, `src/lib/project/entities.test.ts`, plus așteptările cu 10 pași din testele existente

**Interfaces:**
- Produces:
  - `StepId` include `'measures'`, în `StepIdSchema` imediat după `'risks'`
  - `EntityKind` include `'measure'`; `Project['measures']`
  - `type Measure = Project['measures'][number]`
  - `liveMeasures(p: Project): Measure[]`: măsurile al căror pas există încă
  - `measureFor(p: Project, stepId: string): Measure | undefined`: măsura vie a unui pas
  - `isKeyMeasureSet(p: Project): boolean`: regula de completare
  - `measureState(m: Measure): 'clear' | 'sketch' | null`: `null` pentru măsurile simple

- [ ] **Step 1: Creează branch-ul și pune specificația în commit**

```bash
git checkout -b feat/masurabile-light
git add docs/superpowers/specs/2026-11-01-masurabile-light-design.md docs/superpowers/plans/2026-11-01-masurabile-light.md
git commit -m "docs: spec and plan for the light measures step"
```

- [ ] **Step 2: Scrie testele care pică**

În `measures.test.ts`, cu un helper `withMeasures(list)` care pornește de la `createEmptyProject`, adaugă precondiția `p1` și rezultatul pe termen lung `t1`, apoi setează `measures`:

```ts
const key = { id: 'ms1', role: 'key', stepId: 'p1', what: '% cereri cu răspuns' } as const;
const full = { ...key, source: 's', counts: 'c', routine: 'r', enough: 'e', ifBelow: 'i' };

expect(isKeyMeasureSet(withMeasures([key]))).toBe(true);
expect(isKeyMeasureSet(withMeasures([{ ...key, what: '   ' }]))).toBe(false);
expect(isKeyMeasureSet(withMeasures([{ ...key, stepId: 'nu-exista' }]))).toBe(false);
expect(isKeyMeasureSet(withMeasures([{ ...key, stepId: 't1' }]))).toBe(false); // un rezultat pe termen lung nu e un pas din drum
expect(isKeyMeasureSet(withMeasures([{ ...key, role: 'delivery' }]))).toBe(false);

expect(measureState(key)).toBe('sketch');
expect(measureState(full)).toBe('sketch'); // lipsesc și today, și firstCheck
expect(measureState({ ...full, today: '0' })).toBe('clear');
expect(measureState({ ...full, firstCheck: 'probă' })).toBe('clear');
expect(measureState({ ...full, today: '0', role: 'delivery' })).toBeNull();

expect(liveMeasures(withMeasures([{ ...key, stepId: 'sters' }]))).toEqual([]);
expect(measureFor(withMeasures([key]), 'p1')?.id).toBe('ms1');
```

În `entities.test.ts`: după `upsertEntity` cu `{ id: 'ms2', role: 'key', ... }` peste un proiect care are `ms1` tot cu `role: 'key'`, `p.measures.map((m) => m.id)` este `['ms2']`. O măsură cu alt `role` rămâne.

În `completion.test.ts`: cu pașii 1–8 completi și fără măsură, `isStepUnlocked(p, 'measures')` e `true`, iar `isStepUnlocked(p, 'roles')` e `false`. Cu o măsură-cheie fără alte câmpuri, `isStepUnlocked(p, 'roles')` e `true`. `missingForStep` întoarce exact `Alege măsura-cheie: un pas din drum și ce urmărești la el.`

- [ ] **Step 3: Rulează testele și confirmă că pică**

Run: `npx vitest run src/lib/project/measures.test.ts src/lib/project/entities.test.ts src/lib/steps/completion.test.ts`
Expected: FAIL, `measures.ts` nu există

- [ ] **Step 4: Implementează schema și entitatea**

În `schema.ts`, `measures` e obligatoriu pe proiect, lângă `toFindOut`:

```ts
measures: z.array(z.object({
  id: z.string(),
  role: z.enum(['key', 'delivery', 'longTerm']),
  stepId: z.string(),
  what: z.string().min(1).max(300),
  source: z.string().max(300).optional(),
  counts: z.string().max(500).optional(),
  routine: z.string().max(300).optional(),
  today: z.string().max(300).optional(),
  firstCheck: z.string().max(500).optional(),
  enough: z.string().max(300).optional(),
  ifBelow: z.string().max(500).optional(),
})).max(3),
```

`createEmptyProject` pune `measures: []`.

În `entities.ts`: `measure` în `EntityKind`, `ENTITY_SCHEMAS`, `LIST_KEY` (`measures`), `ListKey`, `ID_PREFIX` (`ms`); `STEP_ENTITIES.measures = ['measure', 'toFindOut']`; `STEP_CONTENT.measures = ['measure']`; `stepId` în `REF_FIELDS`; `REF_TARGETS.stepId = ['precondition', 'targetChange']`.

`upsertEntity`: la `kind === 'measure'`, înainte de inserare, scoate orice altă măsură cu același `role` și alt `id`.

`HUMAN_TEXT_FIELDS` primește `what`, `source`, `counts`, `routine`, `today`, `firstCheck`, `enough`, `ifBelow`.

- [ ] **Step 5: Implementează `measures.ts`**

`isKeyMeasureSet`: există o măsură `role === 'key'`, cu `what` nevid după `trim` și cu `stepId` printre `p.preconditions`. `liveMeasures`: `stepId` printre `p.preconditions` sau `p.targetChanges`. `measureState`: pentru `key`, `'clear'` când `what`, `source`, `counts`, `routine`, `enough`, `ifBelow` sunt nevide și `today` sau `firstCheck` e nevid; altfel `'sketch'`.

- [ ] **Step 6: Înregistrează pasul și renumerotează**

- `definitions.ts`: după `risks`, `{ id: 'measures', number: 9, phase: 'toc', title: 'Cum vedem dacă merge', minutes: 8, summary: 'O măsură gândită bine și două simple' }`; `roles` devine 10, `backlog` 11.
- `completion.ts`: `measures: { done: isKeyMeasureSet, hint: 'Alege măsura-cheie: un pas din drum și ce urmărești la el.' }`.
- `requirements.ts`, `case 'measures'`:
  - `req('measures.key', 'O măsură-cheie, legată de un pas din drum', isKeyMeasureSet)`
  - `rec('measures.clear', 'Măsura-cheie e clară: definiție, cine o scoate, prag, ce faceți dacă iese sub', ...)`
  - `rec('measures.others', 'O măsură pentru ce livrați și una pentru schimbarea mare', ...)`
- `requirements.ts`: textul `la pasul 10` devine `la pasul 11`.
- `alerts/messages.ts`: `all_on_one` are `step: 10`; `orphan_feature` și `only_code` au `step: 11`.
- `StartScreen.tsx`: `10 pași` devine `{STEPS.length} pași`.
- `waitTips.ts`: la `target`, `Un indicator bun spune: cine, câți, cât și până când.` devine `Un semn bun se poate vedea: ce ai observa dacă s-a întâmplat?`; `measures` primește:
  - `Întrebarea care contează: ce faceți dacă cifra iese mică?`
  - `Procent din ce? Numitorul spune mai mult decât cifra.`
  - `„Nu știm încă” e un răspuns bun, dacă știi cum afli.`
- `provider.ts`, `defaultProposal`: `case 'measures'` cere primul id `precondition` (altfel întrebare) și propune `{ id: 'ms1', role: 'key', stepId: pre, what: 'Măsură de test.' }`.
- `completion.fixtures.ts`: `measures` păstrează precondițiile existente sau pune `precondition`, apoi adaugă măsura-cheie pe `p1`.
- `CardEditor.tsx`: intrări minime în `KIND_LABEL` (`Măsură`), `FIELDS` și `defaultData`, ca tipurile să compileze.

- [ ] **Step 7: Rulează toată suita și actualizează așteptările vechi**

Run: `npx vitest run`
Expected: pică doar testele care presupun 10 pași sau ordinea veche (de exemplu `definitions`, `StepSidebar`, `StartScreen`, `Editor`). Actualizează-le la 11 pași și la numerele noi, fără să slăbești alte verificări.

Run: `npx vitest run; npx tsc --noEmit`
Expected: PASS, fără erori de tip

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat(measures): measure entity and the new step"
```

### Task 2: Proiectele existente

**Files:**
- Create: `src/lib/project/normalize.ts`, `src/lib/project/normalize.test.ts`
- Modify: `src/lib/db/supabaseRepo.ts`, `src/app/api/e/[token]/route.ts`
- Test: `src/lib/db/supabaseRepo.test.ts`, `src/app/api/projects.test.ts`

**Interfaces:**
- Consumes: `Project` din Task 1
- Produces: `normalizeProject(raw: Project): Project`, pură și idempotentă

- [ ] **Step 1: Scrie testele care pică**

În `normalize.test.ts`, pornind de la un proiect gol din care scoți `measures` și `steps.measures`, cu mesaje și alerte pe pașii 8, 9 și 10:

```ts
const out = normalizeProject(old);
expect(out.measures).toEqual([]);
expect(out.steps.measures).toEqual({ status: 'untouched', messages: [] });
expect(out.alerts.map((a) => a.step)).toEqual([8, 10, 11]);
expect(out.steps.roles.messages).toEqual(old.steps.roles.messages);
expect(normalizeProject(out)).toEqual(out); // nu renumerotează a doua oară
expect(old.alerts[1].step).toBe(9); // nu modifică intrarea
expect(ProjectSchema.safeParse(out).success).toBe(true);
expect(normalizeProject({ version: 1 } as never)).toEqual({ version: 1 }); // `steps` lipsește: neschimbat
```

În `supabaseRepo.test.ts`: `getByToken` și `getPublishedBySlug` întorc rândurile vechi normalizate; conflictul din `saveDraft` întoarce draft-ul normalizat.

În `projects.test.ts`: un `PUT` cu un draft fără `measures` și `steps.measures` întoarce 200, iar un `GET` ulterior are `measures: []`. Un `PUT` cu `draft: 'x'` întoarce în continuare 422.

- [ ] **Step 2: Rulează testele și confirmă că pică**

Run: `npx vitest run src/lib/project/normalize.test.ts src/lib/db/supabaseRepo.test.ts src/app/api/projects.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementează**

Un proiect e vechi când `steps` e obiect și nu are cheia `measures`. Doar atunci: adaugă `steps.measures`, `measures: []` dacă lipsește și crește cu 1 `alerts[].step` când e cel puțin 9. Dacă `steps` nu e obiect, întoarce intrarea neschimbată, ca validarea să o respingă. Alertele care nu sunt listă rămân neatinse.

În `supabaseRepo.ts`, aplică în `toStored`, `getPublishedBySlug` și pe draft-ul din conflict. În `route.ts`, aplică pe `body.draft` înainte de `safeParse`, doar dacă e obiect.

- [ ] **Step 4: Rulează testele**

Run: `npx vitest run src/lib/project/normalize.test.ts src/lib/db/supabaseRepo.test.ts src/app/api/projects.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(measures): bring existing projects to the new shape"
```

### Task 3: Facilitarea AI

**Files:**
- Create: `prompts/steps/measures.md`
- Modify: `prompts/system.md`, `prompts/steps/target.md`, `prompts/steps/preconditions.md`, `prompts/steps/backlog.md`, `prompts/steps/{project,relations,roles}.md`
- Modify: `src/lib/ai/stepTurn.ts`
- Test: `src/lib/ai/stepTurn.test.ts`, `src/lib/ai/provider.test.ts`

**Interfaces:**
- Consumes: `measure` din Task 1

- [ ] **Step 1: Scrie testele care pică**

În `stepTurn.test.ts`, la pasul `measures`, cu `fakeQueue`:

- Un card `measure` valid cu `role: 'key'` și `stepId` al unei precondiții ajunge în `turn.cards`.
- `role: 'key'` cu `stepId` al unui rezultat pe termen lung, `role: 'delivery'` cu la fel și `role: 'longTerm'` cu `stepId` de precondiție duc la o a doua încercare, cu un mesaj de eroare care conține `stepId`.
- `role: 'delivery'` pe o precondiție de nivel `outcome` e respins la fel; pe nivel `output` trece (folosește `levelOf`).
- `stepId` inexistent e respins.
- Un card `toFindOut` e acceptat la acest pas.

În `provider.test.ts`: `defaultProposal('measures', ...)` cu o precondiție în context întoarce o propunere care trece validarea.

Un test care citește `loadPrompt('steps/measures.md')` verifică prezența textelor `Dacă drumul tău se rupe, unde s-ar vedea primul?` și `cel mult de două ori`.

- [ ] **Step 2: Rulează testele și confirmă că pică**

Run: `npx vitest run src/lib/ai`
Expected: FAIL

- [ ] **Step 3: Adaugă validarea în `refError`**

`case 'measure'`: `key` și `delivery` cer o precondiție, `longTerm` un `targetChange`, iar `delivery` nu acceptă un pas de nivel `outcome`. Mesajele spun ce tip de pas se așteaptă. Pentru a citi nivelul din lot, caută precondiția în `p` sau în cardurile lotului.

- [ ] **Step 4: Scrie `prompts/steps/measures.md` exact așa**

```markdown
## Pasul 9 — Cum vedem dacă merge (indicatori)

Obiectiv: o măsură-cheie gândită bine și două măsuri simple, una pentru ce livrează echipa și una pentru rezultatul pe termen lung.

De ce contează: fără asta, echipa nu va ști dacă drumul ține. O măsură bună schimbă o decizie. O cifră pe care nu o folosește nimeni e doar muncă în plus.

La acest pas, regulile de aici au prioritate față de cele generale: dev-ul răspunde primul, iar tu nu propui după 1–3 întrebări și nu îmbunătățești fondul răspunsului.

Cum facilitezi, câte o întrebare pe rând:
1. Măsura-cheie: „Dacă drumul tău se rupe, unde s-ar vedea primul?” Nu propui un pas înainte să răspundă dev-ul. Dacă e blocat, poți indica primul rezultat care depinde de altcineva sau un pas marcat riscant.
2. „Ce urmărești acolo, fără cifre?”
3. „Ce se numără și ce nu? Cum ar putea cifra să arate bine fără să se fi schimbat nimic?”
4. „Cine o scoate, din ce loc, cât de des și în cât timp?”
5. „Cât e azi?” Dacă nu știe, propui o probă: o măsurare de mână, fără cod, în două săptămâni. Dacă o acceptă, o notezi în `firstCheck`. Dacă nu, propui un card „De aflat”.
6. „Ce e suficient de bine și ce faceți dacă iese sub?”
7. Apoi, câte o întrebare pentru realizare și pentru rezultatul pe termen lung: ce urmărești și de unde iei datele. Dacă pasul are deja `signal`, pornești de la el și scoți cifra din indicator.

Ce vine doar de la dev: `counts`, `today`, `enough` și `ifBelow`. Le poți corecta gramatical sau poți da un exemplu dintr-un alt domeniu, spus clar că e inventat, dar nu le scrii în locul lui. Dacă nu le-a spus, rămân goale, chiar și când ți se cere să propui acum. `today` nu se ghicește niciodată; „0” e o valoare, iar golul înseamnă „nu știm încă”.

Testul înlocuirii: „Ar merge fraza asta și la alt proiect?” Dacă da, ceri numele instituției, locul sau numitorul.

Insiști cel mult de două ori pe aceeași măsură. Apoi propui cardul așa cum e și mergeți mai departe.

Greșeli frecvente (le prinzi blând, într-o propoziție, și pui întrebarea care le repară):
- „500 de utilizatori” la un rezultat → „Asta arată că unealta e folosită. Ce ar arăta că instituția a reacționat?”
- Cifră în indicator („50 de articole”) → o muți la `enough`.
- „60%” → „Procent din ce?”
- Schimbare greu de numărat → propui o scară în cuvinte (nu e pe agendă → în discuție → adoptată → aplicată).
- Retenție la un instrument pe care lumea îl folosește o dată → „Cine a primit documentul din prima a reușit. Ce ai vedea atunci?”

În exemple, la proiectele civice, pui în față răspunsul instituției, nu numărul de utilizatori.

Exemplu de nivel, inventat, nu de copiat:
- `what`: % din cererile 544 trimise prin aplicație către primăriile din județul Cluj care primesc în termen informația cerută.
- `counts`: nu se numără răspunsurile „nu deținem” și redirecționările; le urmărim separat, ca să nu umfle cifra.
- `routine`: o persoană din echipă, lunar, cam 30 de minute.
- `source`: datele aplicației.
- `firstCheck`: probă pe 10 cereri în următoarele două săptămâni.
- `enough`: 50% în 6 luni.
- `ifBelow`: dacă iese sub 30%, nu mai investim în clasament și trecem la plângeri, cu ajutorul unui avocat.

Carduri permise:
- {"kind": "measure", "data": {"id": "ms1", "role": "key" | "delivery" | "longTerm", "stepId": "<id pas din drum sau rezultat pe termen lung>", "what": "<ce urmărim, fără cifre>", "source": "", "counts": "", "routine": "", "today": "", "firstCheck": "", "enough": "", "ifBelow": ""}}
- {"kind": "toFindOut", "data": {"id": "q1", "step": "measures", "text": "<întrebarea>"}}

Câte o măsură pe rol. `key` și `delivery` se leagă de un pas din drum, iar `delivery` de o realizare; `longTerm` de un rezultat pe termen lung. Câmpurile `counts`, `routine`, `today`, `firstCheck`, `enough` și `ifBelow` există doar la `key`.
```

- [ ] **Step 5: Actualizează celelalte prompturi**

- `system.md`: `10 pași` devine `11 pași`. Indicatorii devin: `Indicatori (indicators): ce urmărim, fără cifre; cifra pe care o vrem e ținta.` Lista câmpurilor din regula despre id-uri primește `what`, `source`, `counts`, `routine`, `today`, `firstCheck`, `enough`, `ifBelow`. La începutul „Reguli de conversație” adaugă: `Dacă descrierea pasului spune altceva decât regulile de mai jos, urmezi descrierea pasului.`
- `target.md`: linia 11 devine `Pentru semn: „Ce ai vedea în lume dacă s-a întâmplat?”`. La `signal`: semnul observabil, cu cifre doar dacă dev-ul le spune singur. Obiectivul spune „fiecare cu un semn observabil”.
- `preconditions.md`: la pasul 3 scoate „Cum l-ați număra?”. `signal` se notează doar dacă dev-ul îl spune; nu ceri cifre.
- `backlog.md`: `Pasul 10` devine `Pasul 11`; `pasul 9` (rolurile) devine `pasul 10`. Adaugă la punctul 3: câte un element „test” pentru fiecare `firstCheck` din măsuri, în etapa „start”, legat de pasul măsurii când e un pas din drum, fără dubluri.
- `roles.md`: `Pasul 9` devine `Pasul 10`.
- `project.md`, `relations.md`: `pasul 9` devine `pasul 10`.
- `preconditions.md`: `pasul 10` devine `pasul 11`.

Run: `npx vitest run src/lib/ai`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add prompts src
git commit -m "feat(measures): facilitation prompt and validation"
```

### Task 4: Editorul

**Files:**
- Modify: `src/components/editor/CardEditor.tsx`, `src/components/editor/CardsPanel.tsx`, `src/components/editor/ChatPanel.tsx`
- Test: `src/components/editor/StepScreen.test.tsx`

**Interfaces:**
- Consumes: `FIELDS`, `KIND_LABEL`, `defaultData` din Task 1
- Produces: `KEY_ONLY_FIELDS: string[]` în `CardEditor.tsx`, cu `['counts','routine','today','firstCheck','enough','ifBelow']`

- [ ] **Step 1: Scrie testele care pică**

La pasul `measures` în `StepScreen.test.tsx`:

- Fără mesaj de la utilizator, butonul `Propune acum` lipsește; apare după primul mesaj.
- La alt pas, butonul apare ca înainte.
- Trei `Nu știu` la rând trimit trei cereri către AI și `draft.toFindOut` rămâne gol. Testul existent pentru „de aflat” la alți pași continuă să treacă.
- În formular, cu `role` `delivery`, câmpul `Ce se numără și ce nu` lipsește; cu `key`, apare.
- Un card de măsură cu `stepId` inexistent afișează `Pasul nu mai există` și nu afișează id-ul.
- Titlul cardului e valoarea din `what`.
- Când există deja o măsură-cheie, un card nou pornește cu primul rol liber.

- [ ] **Step 2: Rulează testul și confirmă că pică**

Run: `npx vitest run src/components/editor/StepScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementează câmpurile**

`FIELDS.measure`, în ordine:

| key | label | type |
|---|---|---|
| `what` | Ce urmărim (fără cifre) | text, required |
| `role` | Tip de măsură | enum: `key` Măsura-cheie, `delivery` Ce livrăm, `longTerm` Schimbarea mare |
| `stepId` | Pasul la care se referă | ref `preconditions`, `targetChanges`, required |
| `source` | De unde luăm datele | text |
| `counts` | Ce se numără și ce nu | textarea |
| `routine` | Cine o scoate, cât de des, în cât timp | text |
| `today` | Cât e azi (gol = nu știm încă) | text |
| `firstCheck` | Proba: măsurare de mână, în două săptămâni | textarea |
| `enough` | Ce e suficient de bine | text |
| `ifBelow` | Ce faceți dacă iese sub | textarea |

În `CardEditor`, ascunde la randare `KEY_ONLY_FIELDS` când `values.role !== 'key'` și scoate-le din `next` la salvare. În `defaultData`, `role` e primul rol liber din `key`, `delivery`, `longTerm`.

În `CardsPanel`, adaugă `what` în `TITLE_KEYS`, filtrează `KEY_ONLY_FIELDS` la rolurile simple, iar în `fieldText`, pentru `stepId` fără țintă, întoarce `Pasul nu mai există`.

- [ ] **Step 4: Implementează butoanele**

În `ChatPanel`, pe `step === 'measures'`: butonul `Propune acum` se randează doar când `messages.some((m) => m.role === 'user')`, iar ramura cu `streak % 3 === 0` nu se aplică. Ceilalți pași rămân neschimbați.

- [ ] **Step 5: Rulează testele**

Run: `npx vitest run src/components/editor`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat(measures): measure cards and chat behaviour on the step"
```

### Task 5: Rezultatul public

**Files:**
- Create: `src/components/project/MeasuresSection.tsx`
- Modify: `src/components/project/ProjectView.tsx`, `src/components/project/PathStory.tsx`, `src/components/project/MapView.tsx`, `src/lib/project/measures.ts`
- Test: `src/components/project/ProjectView.test.tsx`, `src/components/project/MapView.test.tsx`, `src/lib/project/measures.test.ts`

**Interfaces:**
- Consumes: `liveMeasures`, `measureFor`, `measureState` din Task 1
- Produces:
  - `indicatorLine(p: Project, stepId: string, signal: string | undefined): string | null`: `Urmărim: <what>`, altfel `Indicator: <signal>`, altfel `null`
  - `<MeasureDetails measure project clean preview />`, exportat din `MeasuresSection.tsx`
  - `<MeasuresSection project clean preview />`

- [ ] **Step 1: Scrie testele care pică**

În `measures.test.ts`: `indicatorLine` întoarce `Urmărim: X` când pasul are măsură (și `signal`), `Indicator: Y` fără măsură, `null` fără ambele, și `Indicator: Y` când măsura are pasul șters.

În `ProjectView.test.tsx`:

- Secțiunea `Cum vedem dacă merge` apare între `Rezultatele pe care le urmărim` și `Ce încă nu știm`.
- `today` gol afișează `Azi: nu știm încă`; `today: '0'` afișează `Azi: 0`.
- `firstCheck` afișează `Probă:`; `ifBelow` afișează textul `Dacă iese sub`; câmpurile goale nu au etichetă.
- `routine` nu apare când `preview` lipsește și apare când `preview` e `true`.
- O măsură-cheie incompletă are textul `schiță`; una `clear` nu îl are.
- O măsură cu pas șters nu apare, iar fără măsuri vii secțiunea lipsește.
- Un proiect fără măsuri se randează ca înainte.
- La un rezultat pe termen lung cu măsură, apare `Urmărim:` în locul `Indicator:`.

În `MapView.test.tsx`: detaliul unui pas cu măsură arată `Urmărim:` și `Suficient:`; un pas fără măsură păstrează `Indicator:`.

- [ ] **Step 2: Rulează testele și confirmă că pică**

Run: `npx vitest run src/components/project src/lib/project/measures.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementează afișarea**

`MeasuresSection` folosește `Section` cu `headingId="h-measures"`, `eyebrow="Se vede?"`, `title="Cum vedem dacă merge"` și `empty` când `liveMeasures` e goală. Măsura-cheie stă prima, mai mare, iar simplele dedesubt. Etichete:

| Etichetă | Rol | Etichetă de nivel |
|---|---|---|
| `Măsura-cheie` | `key` | plus textul pasului |
| `Ce livrăm` | `delivery` | plus textul pasului |
| `Schimbarea mare` | `longTerm` | plus textul rezultatului |

`MeasureDetails` afișează, în ordine, când sunt completate: `Urmărim:`, `Ce se numără:`, `Azi:` (mereu la `key`), `Probă:`, `Suficient:`, `Dacă iese sub:`, `Sursa:`, iar `Cine o scoate:` doar cu `preview`. Tag-ul `schiță` folosește un stil neutru, nu de eroare. Tot textul trece prin `clean`.

În `ProjectView`, secțiunea vine imediat după `Rezultatele pe care le urmărim`, iar linia de indicator a rezultatelor pe termen lung vine din `indicatorLine`. În `PathStory` și `MapView`, liniile `Indicator:` vin din `indicatorLine`; detaliul din `MapView` randează `MeasureDetails` când pasul sau rezultatul pe termen lung are măsură.

- [ ] **Step 4: Rulează testele**

Run: `npx vitest run src/components/project src/lib/project/measures.test.ts src/app/p`
Expected: PASS

- [ ] **Step 5: Verifică în browser**

Pornește aplicația cu `preview_start` și `REPO=memory`. Parcurge pasul cu AI-ul fals, deschide `Rezumat` și pagina publică, pe desktop, pe mobil și în tema închisă.
Expected: secțiunea se citește bine, fără erori în consolă. Fă o captură de ecran.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat(measures): show measures on the public page and the map"
```

### Task 6: Documentație și scenarii de calitate

**Files:**
- Create: `docs/test/masurabile-scenarii-ai.md`
- Modify: `docs/superpowers/specs/2026-10-21-ghid-pornire-prd.md`, `README.md`, `docs/prompturi-ai.md`

- [ ] **Step 1: Actualizează PRD-ul și README-ul**

În PRD, linia 22, excluderea devine: `Nu e o teorie a schimbării pentru dosare de finanțare: fără logframe și fără export pentru finanțatori; măsurabilele rămân un plan light, fără urmărire în timp.` În tabelul de pași, adaugă `Cum vedem dacă merge` ca pas 9, cu 8 minute, și renumerotează. Actualizează trimiterile la pașii 9 și 10 din PRD. În `README.md`, `10 pași` devine `11 pași`.

- [ ] **Step 2: Actualizează `docs/prompturi-ai.md`**

Adaugă secțiunea `Pasul 9` cu textul din `prompts/steps/measures.md`, renumerotează pașii următori și aliniază textele schimbate în Task 3.

- [ ] **Step 3: Scrie scenariile de calitate AI**

`docs/test/masurabile-scenarii-ai.md` are câte un scenariu cu mesaje de intrare și rezultat așteptat pentru: AI-ul nu propune măsura-cheie înainte de răspunsul echipei; nu completează `counts`, `today`, `enough`, `ifBelow`; „Propune acum” lasă goale câmpurile nespuse; insistă cel mult de două ori; scoate cifra din `what`; la pasul Activități propune un singur test pe `firstCheck`. Adaugă formularul pentru testul cu 3–5 echipe, cu întrebările din secțiunea „Cum verificăm” a specificației.

- [ ] **Step 4: Verifică totul**

Run: `npx vitest run; npx tsc --noEmit; npm run lint; npm run build`
Expected: toate trec

Run: `git grep -nE "10 pași|din 10|[Pp]asul (9|10)\b" -- src prompts README.md`
Expected: doar trimiteri corecte, la numerotarea nouă

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-10-21-ghid-pornire-prd.md README.md docs/prompturi-ai.md docs/test/masurabile-scenarii-ai.md
git commit -m "docs: light measures in the PRD, prompts and AI quality scenarios"
```
