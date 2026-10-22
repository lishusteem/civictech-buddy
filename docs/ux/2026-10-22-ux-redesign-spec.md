# UX redesign spec: Ghidul de pornire (Oct 22, 2026)

**What this is:** an implementable spec for the start screen, step screen (desktop and mobile), alerts, *Tot proiectul*, publish and links, and the public page. The research behind each decision is in [2026-10-22-ux-research.md](2026-10-22-ux-research.md). Static mockups are in [mockups/step-screen.html](mockups/step-screen.html) and [mockups/public-page.html](mockups/public-page.html).

**Conventions:**
- The spec text is in English. All UI copy is in Romanian and is final unless marked *(draft)*.
- Every item is tagged **[UI]** (components, copy, client logic only), **[DATA]** (schema or derived-data change) or **[MODEL]** (prompt or AI output change).
- Priorities: **P0** fixes what the owner hit in real use and should ship first. **P1** makes the AI feel smarter and the page convincing. **P2** is polish.

---

## 0. Priorities at a glance

| ID | Item | Type | Screen | Owner feedback |
| --- | --- | --- | --- | --- |
| **P0-1** | Single action bar: **„Acceptă și treci la pasul următor”**, with a state table | UI | Step | 3, 2 |
| **P0-2** | Proposal digest inside the chat, with its own *Acceptă tot* | UI | Step | 2 |
| **P0-3** | Typing "da" / "ok" / "corect" while proposals are pending saves them | UI | Step | 2 |
| **P0-4** | *Ce cere pasul* checklist at the top of the results column (saved / proposed / missing) | UI | Step | 4, 6, 8 |
| **P0-5** | Explainer line under the step title | UI | Step | 4 |
| **P0-6** | Alerts: code alerts become checklist items; questions are grouped, calm and explained | UI | Step | 5 |
| **P0-7** | Mobile: *Conversația / Rezultatul* tabs plus a sticky action bar | UI | Step | 2, 3 |
| **P0-8** | Public page restructured for the group: pitch, *Cum poți ajuta*, readable relations, at most 5 next steps, no "tu", no duplicates | UI (+DATA fallbacks) | Public | 7 |
| **P0-9** | Pre-publish check: contact, names, pitch, roles | UI | Rezumat | 7 |
| P1-1 | The AI gets the checklist's missing items and targets one per question | MODEL | Step | 8 |
| P1-2 | Reflect-back proposal message: *Am reținut / Încă nu știu* | MODEL + UI | Step | 8 |
| P1-3 | *de ce întreb* tag on AI questions | MODEL + UI | Step | 8 |
| P1-4 | Alert indicators on the affected cards; *mai târziu* stage for features | UI + DATA | Step | 5 |
| P1-5 | Theory-of-change chain and grouped actor map on the public page | UI | Public | 7 |
| P1-6 | `project.pitch` field and a share-to-group message | DATA + MODEL + UI | Pas 1, Links | 7 |
| P1-7 | *Tot proiectul* as a task list with statuses | UI | Overview | — |
| P1-8 | Toast after advancing: *Înapoi la pas* | UI | Step | 3 |
| P1-9 | Clicking a missing checklist item prefills the chat input | UI | Step | 8 |
| P2-1 | Power and stance grid (SVG) for actors | UI | Public | 7 |
| P2-2 | "editat de tine" vs "propus de AI" marker on saved cards; "modificat" diff on re-proposals | UI | Step | 8 |
| P2-3 | Start-screen "how it works" strip and a result preview | UI | Start | 2 |
| P2-4 | OG image for the public link | UI | Public | 7 |

**Suggested build order:**
1. P0-1, P0-2, P0-3 share one state machine (§3.5).
2. P0-4 and P0-6 share the requirement model (§4).
3. P0-5 and P0-7.
4. P0-8 and P0-9.

---

## 1. Global rules

### 1.1 Colour semantics (stop using amber for everything)

| Meaning | Colour | Used for |
| --- | --- | --- |
| Primary action, saved | teal-800 / teal-50 | Primary buttons, ✓ saved items, step done |
| **Not saved yet** | amber-300 / amber-50 | Proposed (unaccepted) cards, the ◐ checklist state, the "Ai modificări nepublicate" bar. **Only these.** |
| Open question (alert) | sky-700 / sky-50 (or stone with a sky left border) | Questions from the AI or the code; never amber |
| Error | red-800 / red-50 | AI down, save failed, publish failed |
| Neutral / missing | stone-500 | ○ missing checklist items, locked steps |

### 1.2 Vocabulary (use exactly these words)

| Concept | UI word | Never |
| --- | --- | --- |
| AI card not yet accepted | **propus** / *propunere* | "sugestie", "draft" |
| Accepted card | **salvat** | "acceptat" in status text (the button can say *Acceptă*) |
| Alert | **întrebare deschisă** | "alertă", "naivitate", "avertisment" |
| A step's requirements | **Ce cere pasul** | "validare" |
| Required / optional | **obligatoriu** / **recomandat** | "opțional" for recommended items |

### 1.3 Accessibility, in every screen

- `<title>` and `h1` read `Pasul 4 din 10: Schimbarea țintă` (W3C WAI).
- The step list uses `<ol>` with `aria-current="step"` (already done).
- Every save or accept announces through one `role="status"` live region per screen, never several.
- Don't use `disabled` on the primary button when the user needs to learn *why*. Use `aria-disabled="true"` and keep it clickable: a click moves focus to the first missing checklist item and announces it (§3.5).

---

## 2. Start screen

Small changes. The current screen is already clear.

### P2-3 How it works: a 3-item strip above the step list **[UI]**

```
┌──────────────────────────────────────────────────────────────┐
│ Ghidul de pornire                                            │
│ În ~30 de minute îți transformi ideea într-un plan pe care   │
│ îl poți arăta grupului: problema, schimbarea, cine trebuie   │
│ să facă ce și de ce oameni ai nevoie.                        │
│                                                              │
│  ① AI-ul te întreabă   ② Tu răspunzi pe scurt   ③ Accepți ce │
│     câte ceva            sau spui „nu știu”        e corect  │
│                                                   în dreapta │
│                                                              │
│ Pregătește dacă poți: lista de funcții (din README), cine    │
│ e în echipă și câte ore aveți pe săptămână.                  │
│                                                              │
│ [ Începe un proiect nou ]                                    │
│ ── 10 pași, 3 faze ─────────────────────── (existing list)   │
│ Continuă un proiect: [ lipește linkul de editare ] [Continuă]│
└──────────────────────────────────────────────────────────────┘
```

**Copy:**
- Lead: „În ~{N} de minute îți transformi ideea într-un plan pe care îl poți arăta grupului: problema, schimbarea, cine trebuie să facă ce și de ce oameni ai nevoie.”
- Strip: „AI-ul te întreabă câte ceva” · „Tu răspunzi pe scurt sau spui «nu știu»” · „Accepți ce e corect — doar asta se salvează”
- Prep line: „Pregătește dacă poți: lista de funcții (din README), cine e în echipă și câte ore aveți pe săptămână.”

**Layout:** move the primary button **above** the 10-step list, so it is visible without scrolling on a laptop. Keep the step list below it.

---

## 3. Step screen

### 3.1 Desktop layout (≥ 1024 px)

The layout keeps three zones (sidebar, conversation, result) and adds a sticky action bar.

```
┌─────────────┬──────────────────────────────────────────────────────────────────────┐
│ Tot proiectul│ Pasul 5 din 10 · Teoria schimbării                                  │
│             │ Actorii                                                     (h1)    │
│ CONTEXTUL   │ Cine suferă de problemă, cine decide, cine are datele, cine e exclus.│
│ ✓ 1 Proiect │ ⓘ AI-ul îți pune întrebări până când lista „Ce cere pasul” e bifată. │
│ ✓ 2 Problema│   Ce propune apare punctat — se salvează doar ce accepți.            │
│ ✓ 3 Există  ├───────────────────────────────┬──────────────────────────────────────┤
│ TEORIA SCH. │ CONVERSAȚIA                   │ CE CERE PASUL                 2 din 4│
│ ✓ 4 Schimb. │                               │ ✓ Cel puțin un actor     obligatoriu │
│ ● 5 Actorii │ ┌───────────────────────────┐ │ ◐ Cine decide (o instituție)          │
│ ○ 6 Relații │ │AI: Cine ar trebui să-și   │ │     propus — acceptă ca să salvezi   │
│   7 Precond.│ │schimbă procedura ca să... │ │ ○ Cine e exclus / pierde  recomandat │
│   8 Ipoteze │ │      de ce întreb: Cine decide│ ○ Cel puțin 2 actori (pt. Relații)   │
│ ORGANIZAREA │ └───────────────────────────┘ │──────────────────────────────────────│
│   9 Oamenii │        ┌──────────────────┐   │ PROPUSE DE AI · nesalvate (3)         │
│  10 Backlog │        │Tu: Primăria, dar │   │ ┆ Actor · propus                    ┆ │
│             │        │și ANAF pt date   │   │ ┆ Primăria Sectorului 3             ┆ │
│ ~14 min     │        └──────────────────┘   │ ┆ Instituție · putere mare · neutru ┆ │
│  rămase     │ ┌───────────────────────────┐ │ ┆ [Acceptă] [Editează] [Șterge]      ┆ │
│             │ │AI: Am reținut:            │ │ ┆ …2 more…                          ┆ │
│             │ │ • Primăria decide …       │ │──────────────────────────────────────│
│             │ │ • ANAF are datele …       │ │ SALVATE (2)                           │
│             │ │Încă nu știu: cine e exclus│ │ ✓ Asociațiile de proprietari  [Edit.] │
│             │ │┌─────────────────────────┐│ │ ✓ Locatarii vârstnici         [Edit.] │
│             │ ││3 propuneri: 3 actori    ││ │──────────────────────────────────────│
│             │ ││[Acceptă tot] [Vezi →]   ││ │ ÎNTREBĂRI DESCHISE (1)        ▸      │
│             │ │└─────────────────────────┘│ │ + Adaugă manual  [Actor ▾]           │
│             │ └───────────────────────────┘ │                                      │
│             │ [Scrie răspunsul tău…       ] │                                      │
│             │ [Trimite] Nu știu · Dă-mi un  │                                      │
│             │ exemplu · Propune acum        │                                      │
├─────────────┴───────────────────────────────┴──────────────────────────────────────┤
│ STICKY ACTION BAR                                                                   │
│ 3 propuneri nesalvate     [Doar acceptă]   [ Acceptă și treci la pasul următor  → ] │
│                                              Salvează 3 propuneri · apoi: Relațiile │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Changes from today:**

| Area | Today | New |
| --- | --- | --- |
| Column order (right) | Alerts → step buttons → editor → proposals → accepted → add | **Checklist → editor (when open) → proposals → saved → open questions (collapsed) → add manual** |
| Grid | `md:grid-cols-2` equal | `lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]` with the chat column scrolling on its own (`max-h-[calc(100vh-…)] overflow-y-auto`), so the newest AI message and the results are both on screen |
| Bottom | Amber "neacceptate" bar + saved count + button row + confirm row | One sticky action bar (§3.5). The amber bar, the separate saved-count line and the confirm row are removed. Their information moves into the bar and the checklist. |
| "Acceptă tot" buttons | Three on screen at once | One in the proposals header and one in the chat digest. The bar says *Doar acceptă* (§3.5). |
| Step-specific buttons | "Nu am găsit nimic similar", "Adaugă pașii sugerați" above the cards | Move them **into the checklist row** they satisfy (§4). |

### 3.2 Header and explainer line (P0-5) **[UI]**

```
Pasul 5 din 10 · Teoria schimbării          ← eyebrow: step number + phase name
Actorii                                     ← h1
Cine suferă de problemă, cine decide, …     ← step.summary (existing)
ⓘ AI-ul îți pune întrebări până când lista „Ce cere pasul” e bifată.
  Ce propune apare punctat — se salvează doar ce accepți.
```

**Explainer copy:**
- Desktop: „AI-ul îți pune întrebări până când lista «Ce cere pasul» e bifată. Ce propune apare punctat — se salvează doar ce accepți.”
- Mobile (one line): „AI-ul întreabă până se bifează «Ce cere pasul». Se salvează doar ce accepți.”

**Rules:**
- Style: `text-sm text-stone-700`, an ⓘ icon (aria-hidden), no box, no dismiss button. It must read as a hint, not an alert.
- Show it on every step. It is one line and costs nothing; the owner asked for it.
- On step 1 only, add a second sentence: „Poți scrie liber, lipi o listă din README sau răspunde «nu știu».”

### 3.3 Conversation column

**Message types:**

| Type | Look | Stored? |
| --- | --- | --- |
| AI question | White bubble, left. Optional footer `de ce întreb: {checklist item}` (P1-3) in `text-xs text-stone-500`. | Yes (assistant) |
| AI proposal | White bubble with the reflect-back body (P1-2), followed by a **proposal digest** box (P0-2) | Text yes; digest is UI state |
| User | Teal-50 bubble, right | Yes (user) |
| System line | Centred, `text-sm`, no bubble: „✓ Salvat: 3 actori.” | No (ephemeral, `role="status"`) |

**P0-2 Proposal digest (inside the chat, under the latest AI proposal while proposals are pending):**

```
┌──────────────────────────────────────────────────┐
│ 3 propuneri, încă nesalvate                       │
│ Actor: Primăria S3 · Actor: ANAF · Actor: Locatari│
│ [ Acceptă tot ]   Vezi și editează →              │
└──────────────────────────────────────────────────┘
```

- Border `border-dashed border-amber-300 bg-amber-50/60`, the same language as proposed cards.
- Title: `{n} propuneri, încă nesalvate` (singular `1 propunere, încă nesalvată`).
- Item line: up to 4 `KIND_LABEL: title` items joined with ` · `, then `și încă {k}`.
- *Acceptă tot* calls the same `acceptAll()` as the cards panel.
- *Vezi și editează →* scrolls the proposals section into view and focuses its heading (desktop). On mobile it switches to the *Rezultatul* tab.
- After accepting, replace the digest with the system line `✓ Salvat: {summary}.` If the step is now complete, add an inline link-button **„Treci la pasul următor: {next}”**.
- Only the latest proposal gets a digest. Proposals from older turns that are still pending are merged into it, since they are the same `proposed` array.

**P0-3 Affirmative answers save:**

When proposals are pending and the user sends a message, normalise it the same way as `isDontKnow` (lowercase, no diacritics, no punctuation). If **all** of these hold:
- the text has at most 4 words and at most 30 characters;
- it matches the affirm set: `da`, `ok`, `okay`, `bine`, `e bine`, `corect`, `exact`, `perfect`, `de acord`, `suna bine`, `accept`, `accepta`, `accepta tot`, `salveaza`, `da e corect`, `da e bine`, `da accepta`;

then:
1. Append the user message to the chat (stored, as today).
2. **Do not call the AI.**
3. Call `acceptAll()`.
4. Show the system line „✓ Am salvat {n} elemente.” If the step is now complete, add „Poți trece la pasul următor.” and the inline button. If it is not, add „Mai lipsește: {first missing required item}.” and let the AI ask about it: call `ask()` once, with the updated draft.

Anything else ("da, dar adaugă și ANAF", "nu", "schimbă X") goes to the AI as today. The existing hint under the user bubble (`ACCEPT_HINT`) is then only shown for those messages.

**Quick-reply chips under the input:**

| Chip | Action |
| --- | --- |
| **Nu știu** | Existing behaviour |
| **Dă-mi un exemplu** *(new, P1)* | Sends „Dă-mi un exemplu dintr-un proiect asemănător.” |
| **Propune acum** | Sends the existing `PROPOSE_NOW`. Rename the visible label from „Propune rezumatul acum”, which is long and uses "rezumat" for what the UI calls "propuneri". |

- Style: text-chips (`rounded-full border px-3 py-1 text-sm`), not buttons as heavy as *Trimite* (NN/g, prompt controls).
- Keyboard: Ctrl/⌘+Enter sends (existing). Add the visible hint „Ctrl+Enter trimite” in `text-xs` on desktop.

**States of the conversation column:**

| State | What shows |
| --- | --- |
| Empty, first question loading | Skeleton AI bubble with the text „Pregătesc prima întrebare…” (only if > 1 s, per Cloudscape). Input enabled, so the user can start typing. |
| AI thinking after a user message | Skeleton bubble: „Mă gândesc…” for a question. If the user pressed *Propune acum*: „Pregătesc propunerile pentru pas…”. Input disabled; chips disabled. |
| Proposals pending | Digest under the last AI message (above); the action bar is in state A or B (§3.5). |
| Error | Red box, as today: „AI-ul nu răspunde acum.” with **[Reîncearcă]** and **[Completează în formular]**. Add: „Ce ai scris e salvat.” |
| Form mode | No change in the conversation; the right column opens the editor. |
| "De aflat" noted | Existing notice, reworded: „Am notat întrebarea ca «de aflat» — apare pe pagina publică la «Întrebări la care ne poți ajuta». Mergem mai departe.” |

### 3.4 Result column (right)

Order from top to bottom:

1. **Ce cere pasul**: the checklist (§4), header `Ce cere pasul` and counter `{done} din {total}` (required and recommended together).
2. **Card editor**, when open. Existing component.
3. **Propuse de AI · nesalvate ({n})**: header with **[Acceptă tot]**. Cards as today: dashed amber border, the `propus` pill, *Acceptă / Editează / Șterge*. **Rename** *Șterge* on proposed cards to **„Renunță”**, because nothing is deleted.
4. **Salvate ({n})**: solid border cards with a ✓ in teal before the kind label. Card actions as today. Each card that has open questions gets a sky `?` indicator (P1-4).
5. **Întrebări deschise ({n})**: collapsed by default, see §5.
6. **Adaugă manual**: kind selector plus button, as today.

**Empty states:**
- Proposals: hidden when there are none.
- Saved: „Nimic salvat încă. Răspunde în conversație sau adaugă manual.”

### 3.5 Action bar: the state machine (P0-1) **[UI]**

A bar fixed to the bottom of the main area (`sticky bottom-0`, white, top border, `py-3`). It contains, from left to right, a status text, an optional secondary button and one primary button.

Inputs:
- `P` = number of pending proposals
- `C` = `isStepComplete(draft)`
- `CA` = `isStepComplete(acceptCards(draft, proposed))`
- `busy` = AI call in flight
- `next` = the next step's title, or „Rezumat și publicare” after step 10

| State | Condition | Status text (left) | Secondary | Primary |
| --- | --- | --- | --- | --- |
| **A** | `P>0 && CA` | „{P} propuneri nesalvate” | **Doar acceptă** (accepts, stays) | **Acceptă și treci la pasul următor →**, with the sub-label „Salvează {P} propuneri · apoi: {next}” |
| **B** | `P>0 && !CA` | „{P} propuneri nesalvate · după ele mai lipsește: {firstMissingAfterAccept}” | — | **Acceptă {P} propuneri** (stays; the AI then continues, see below) |
| **C** | `P==0 && C` | „✓ Pasul e complet” (+ „ · {k} recomandări deschise” if any) | — | **Treci la pasul următor: {next} →** |
| **D** | `P==0 && !C` | „Mai lipsește: {firstMissing}” | **Propune acum** (sends `PROPOSE_NOW`) | **Treci la pasul următor →** with `aria-disabled`; a click focuses the checklist's first missing row and announces „Ca să treci mai departe: {firstMissing}.” |
| **busy** | `busy` | „AI-ul pregătește…” | disabled | In A: disabled with the same label (no accept during regeneration, to avoid a race with new cards). In C: stays enabled. |

**Rules:**
- **Skipping proposals.** When `P>0 && C` (the step was already complete and the AI proposes more), state A shows a tertiary text link to the left of *Doar acceptă*: „Treci peste propuneri”. It discards them and advances, the old *Continuă fără ele*. This replaces the confirmation row; no extra click.
- **After B's accept,** if the step is still incomplete, call `ask()` automatically once, so the AI asks about the first missing item. P1-1 makes that targeted.
- **Advancing** sets status `done` (as today), runs `refreshAlerts()`, moves to the next step and shows the toast (P1-8): „✓ Salvat la «{step}»: {n} elemente. [Înapoi la pas]” for 8 s, `role="status"`.
- **Recommended items never block.** Only `obligatoriu` rows gate the step.
- **Step 10:** the primary label is „Acceptă și mergi la rezumat →” (A) or „Mergi la rezumat →” (C).

**Acceptance criteria (P0-1, P0-2, P0-3):**
- With 3 proposals that complete the step, one click saves 3 cards and opens the next step.
- The screen never shows more than one teal primary button.
- Typing „da” with pending proposals saves them and makes no `/ai` call.
- Typing „da, dar adaugă X” calls `/ai`.
- On mobile (375 px) the primary button is visible without scrolling in every state.

### 3.6 Mobile layout (< 768 px) (P0-7) **[UI]**

```
┌───────────────────────────────┐
│ Proiect X            Meniu    │
│ Pasul 5 din 10 · ~14 min  ▾   │  ← compact stepper (existing), tap = list
├───────────────────────────────┤
│ Actorii                  (h1) │
│ ⓘ AI-ul întreabă până se      │
│ bifează «Ce cere pasul».      │
│ Se salvează doar ce accepți.  │
│ ┌───────────┬───────────────┐ │
│ │Conversația│Rezultatul ·3◐ │ │  ← tabs (role=tablist)
│ └───────────┴───────────────┘ │
│  …messages…                   │
│  ┌──────────────────────────┐ │
│  │3 propuneri, nesalvate    │ │
│  │[Acceptă tot] Vezi →      │ │
│  └──────────────────────────┘ │
│ [Scrie răspunsul tău…       ] │
│ Nu știu · Exemplu · Propune   │
├───────────────────────────────┤
│ [Acceptă și treci mai departe→]│ ← sticky, full width
│  3 propuneri · apoi: Relațiile│
└───────────────────────────────┘
```

**Tabs:**
- *Conversația* (default) and *Rezultatul*.
- The *Rezultatul* tab label carries a badge: `· {P}` with ◐ amber when proposals are pending; `· ✓` when the step is complete; otherwise `· {done}/{total}`.
- When a proposal arrives and the user is on *Conversația*, **don't switch tabs automatically**. The digest in the chat is enough; switch only from *Vezi →*.

**Action bar:**
- Full width; the primary button fills it.
- The secondary (*Doar acceptă*, *Propune acum*) moves to a text link above the button, because two buttons side by side at 375 px truncate Romanian labels.
- Short label on screens < 400 px: „Acceptă și treci mai departe →”. Keep the full label in `aria-label`.

**Other mobile rules:**
- Input chips wrap; the input is 2 rows.
- The checklist is the first thing in the *Rezultatul* tab.

---

## 4. "Ce cere pasul" checklist (P0-4) **[UI]**, with alerts merged (P0-6)

### 4.1 Model

Extend `src/lib/steps/completion.ts`. This is additive; keep `isStepComplete` and `missingForStep` working.

```ts
type Requirement = {
  id: string;                    // 'project.description'
  label: string;                 // Romanian, short
  level: 'required' | 'recommended';
  done: (p: Project) => boolean;
  why?: string;                  // one line, shown on expand / tooltip
  alertCode?: AlertCode;         // a code alert this row replaces (§5)
  action?: 'none_found' | 'add_suggested' | 'ask';  // inline button inside the row
};
export function requirementsFor(step: StepId): Requirement[];
```

**Row state:**
- **saved (✓):** `done(draft)`.
- **proposed (◐):** `!done(draft) && done(acceptCards(draft, proposed))`.
- **missing (○):** neither.

**Row anatomy:**

```
✓  Cel puțin un actor                              obligatoriu
◐  Cine decide (o instituție)                      recomandat
   propus — acceptă ca să salvezi
○  Cine e exclus sau pierde ceva dacă reușești     recomandat
   De ce contează: ca să nu construiești pentru cine are deja acces.
```

- The `obligatoriu` / `recomandat` tag is `text-xs`.
- For missing rows, the `why` line is shown under the label in `text-xs text-stone-600`.
- P1-9: clicking a missing row prefills the chat input with „Hai să vorbim despre: {label}.” (editable, not sent; Cloudscape editable support prompt).

### 4.2 Requirements per step

`obligatoriu` rows reproduce the current `RULES` exactly, so gating doesn't change. `recomandat` rows replace code alerts (§5).

| Step | Row (label, Romanian) | Level | Predicate | Replaces alert / row action |
| --- | --- | --- | --- | --- |
| 1 Proiectul | Ce face proiectul (descrierea) | obligatoriu | `description` filled | — |
| | Cine e în echipă (cel puțin un om) | obligatoriu | `team.length ≥ 1` | — |
| | Funcțiile aplicației | recomandat | `features.length ≥ 1` · why: „Fără ele, la pasul 10 n-avem ce ordona.” | — |
| | Numele tău, nu „tu” | recomandat | no team name matches `/^(tu\|eu\|me)$/i` · why: „Apare pe pagina publică.” | — |
| | Stadiul (idee / prototip / live) | recomandat | `stage != null` | — |
| | Un contact pentru cine vrea să ajute | recomandat | `contact` filled · why: „Fără el, grupul nu are cum să te găsească.” | — |
| 2 Problema | Problema, în 2–3 propoziții | obligatoriu | `statement` filled | — |
| | De unde știi (o dovadă) | recomandat | `evidence.length ≥ 1` | `no_evidence` |
| 3 Ce există | O inițiativă asemănătoare — sau „nu am găsit nimic” | obligatoriu | `existing.length ≥ 1` | `first_in_world` · action **[Nu am găsit nimic similar]** in the row, plus a link „Caută în Civic Tech Field Guide ↗” (https://civictech.guide) |
| | Ce faci diferit | recomandat | every `existing.difference` filled (excluding the "nimic" card) | — |
| 4 Schimbarea | Cel puțin o schimbare țintă | obligatoriu | `targetChanges ≥ 1` | — |
| | Un semn observabil pentru fiecare | recomandat | every `signal` filled | — |
| | Direcția pe termen lung | recomandat | `direction` filled | — |
| 5 Actorii | Cel puțin un actor | obligatoriu | `actors ≥ 1` | — |
| | Cel puțin 2 actori (pentru pasul Relațiile) | recomandat | `actors ≥ 2` · why: „Relațiile leagă doi actori.” | — |
| | Cine decide (o instituție) | recomandat | some `type=institution` | `only_users` |
| | Cine e exclus sau pierde ceva | recomandat | some `excluded \|\| stance=opposes` | `nobody_excluded` |
| 6 Relațiile | Cel puțin o relație | obligatoriu | `relations ≥ 1` (existing 2-actor message kept as `why`) | — |
| | Cel mai puternic actor ({name}) e legat de ceilalți | recomandat | per `powerful_actor_unused` logic | `powerful_actor_unused` |
| 7 Precondițiile | Cel puțin o precondiție | obligatoriu | `preconditions ≥ 1` | — |
| | Fiecare are un actor care face ceva diferit | recomandat | every `actorId != null` | — |
| | Ceva ce se întâmplă fără aplicație | recomandat | some `!coveredByApp` | `all_through_app` |
| | Ceva despre cum ajung primii oameni la aplicație | recomandat | stays an LLM question (§5); not a row | (`build_and_they_come` stays a question) |
| 8 Ipotezele | Cel puțin o ipoteză marcată riscantă | obligatoriu | some `risky` | — |
| | Un test ieftin pentru fiecare ipoteză riscantă | recomandat | every risky has `test` | `hypothesis_without_test` |
| 9 Oamenii | Cel puțin un rol | obligatoriu | `roles ≥ 1` | — |
| | O stare pentru fiecare rol (caut / partener / acoperit) | recomandat | all have status (default exists; true unless P1 adds "nedecis") | — |
| 10 Backlog | Cel puțin un element | obligatoriu | `backlog ≥ 1` | action **[Adaugă pașii sugerați]** in the row |
| | Cel puțin un pas în afara codului | recomandat | some `kind != feature` | `only_code` |
| | Fiecare funcție e legată de o precondiție sau mutată la „mai târziu” | recomandat | no orphan features · expands to the grouped list (§5.3) | `orphan_feature` |

**Feeding the AI (P1-1) [MODEL]:** add the step's missing rows to the context message, e.g. „Încă lipsește la acest pas: Cine decide (o instituție); Cine e exclus.” Also add a system-prompt rule: „Următoarea întrebare țintește primul element care lipsește. Dacă ai pus o întrebare despre un element, întoarce în JSON și câmpul `"targets": "<id cerință>"`.” The UI renders `targets` as the `de ce întreb` footer (P1-3). The `AiTurn` type gets an optional `targets?: string`.

---

## 5. Open questions (alerts) (P0-6)

### 5.1 Classification

| Code | Detection | New presentation |
| --- | --- | --- |
| `no_evidence`, `first_in_world`, `nobody_excluded`, `only_users`, `powerful_actor_unused`, `all_through_app`, `hypothesis_without_test`, `only_code`, `orphan_feature` | Code | **Checklist rows** (§4.2). No box. They keep their `Alert` records so the public page and the sidebar `!` still work. The sidebar `!` shows only for *question* alerts (below), not for open recommended rows. |
| `team_no_time`, `all_on_one` | Code | **Question** (grouped block) |
| `solution_in_problem`, `app_as_goal`, `abstract_change`, `magic_leap`, `build_and_they_come` | LLM | **Question** (grouped block) |

### 5.2 The "Întrebări deschise" block

It sits in the result column, below *Salvate*. It is collapsed to one header row when there are 2 or more questions. One question opens expanded.

```
┌ ÎNTREBĂRI DESCHISE (2) ───────────────────────────── ▾ ┐   sky-50, left border sky-600
│ ? Schimbare fără actor                                   │
│   Cine anume face ceva diferit? Ce ai vedea concret?     │
│   De ce contează: o schimbare fără cine o face nu se     │
│   poate verifica și nu-ți spune pe cine să cauți.        │
│   Despre: „Transparență crescută în primărie”            │
│   [Discută cu AI-ul]   Lasă deschisă                     │
│ ─────────────────────────────────────────────────────── │
│ ? Aplicația ca scop                              ▸       │
└──────────────────────────────────────────────────────────┘
```

**Rules:**
- **One block per step**, sky style, never amber.
- **De-duplicate by `code`.** If the same code has several `refs`, show one item that lists all the referenced names on the *Despre:* line, comma-separated.
- **Only one item expanded at a time** (accordion). The first item is expanded when the block opens.
- **Fields per item:** title (from `ALERT_MESSAGES.title`), question (`message`), **De ce contează** (new `why` copy, §5.4), *Despre:* the names of the `refs` (actor, precondition, change).
- **Buttons:**
  - **[Discută cu AI-ul]** (primary-outline). It does what *Lucrez la asta acum* does today (appends the question as an AI message), then focuses the input with a placeholder that echoes the topic: „Răspunde la întrebarea despre {title}…”.
  - **Lasă deschisă** (text button). Dismisses the item. Under the button, `text-xs`: „Apare pe pagina publică la «Întrebări la care ne poți ajuta».” That way the user knows the consequence (HAX G16).
- **Timing:** questions are fetched after acceptance (as today), but **not rendered while proposals are pending** (`P>0`). This avoids two competing calls to action.

### 5.3 Orphan features: the grouped row (P0-6, P1-4)

The step-10 checklist row „Fiecare funcție e legată de o precondiție sau mutată la «mai târziu»” expands to:

```
○ Fiecare funcție e legată de o precondiție …           recomandat
  6 funcții nu ajută încă la nicio precondiție:
  • Hartă cu sesizări        [Leagă de… ▾]  [Mai târziu]  [Păstrează]
  • Export CSV               [Leagă de… ▾]  [Mai târziu]  [Păstrează]
  • …
  [Mută toate la „mai târziu”]
  De ce contează: ce nu ajută la o precondiție poate aștepta; așa
  rămâne timp pentru ce mișcă proiectul acum.
```

**Actions per feature:**
- **Leagă de…** opens a select of preconditions. It creates or updates the feature's backlog item with that `preconditionId` and the precondition's stage.
- **Mai târziu** sets the backlog item stage to `later` **[DATA: add `'later'` to the backlog `stage` enum]**. Until that field exists, store the feature in a backlog item of kind `feature` with `preconditionId: null` and render that as *mai târziu*.
- **Păstrează** dismisses that one alert ref.

When no orphans remain, the row turns ✓.

### 5.4 "De ce contează" copy **[UI]** (add a `why` field to `ALERT_MESSAGES`)

| Code | `why` |
| --- | --- |
| team_no_time | Cu puține ore, contează mai mult ce alegi să **nu** faci în primele 3 luni. |
| solution_in_problem | Grupul ajută mai ușor când vede ce pățesc oamenii azi, nu ce lipsește din tehnologie. |
| no_evidence | O dovadă mică (o discuție, un articol, o cerere 544) face problema credibilă pentru alții. |
| first_in_world | Ce s-a încercat deja îți arată ce a mers, ce nu și cu cine poți colabora. |
| app_as_goal | Folosirea aplicației e un mijloc; grupul vrea să știe ce se schimbă în viața oamenilor. |
| abstract_change | O schimbare fără cine o face nu se poate verifica și nu-ți spune pe cine să cauți. |
| nobody_excluded | Ca să nu construiești doar pentru cei care au deja acces. |
| only_users | Problemele civice se rezolvă de obicei când cineva cu putere schimbă o regulă. |
| powerful_actor_unused | Cel mai puternic actor poate debloca sau opri tot; merită să știi de ce parte e. |
| magic_leap | Pasul lipsă e de obicei exact locul unde proiectele se blochează. |
| all_through_app | Proiectele civice eșuează mai des din lipsă de relații decât din lipsă de cod. |
| build_and_they_come | Fără un plan pentru primii utilizatori, aplicația rămâne goală. |
| hypothesis_without_test | Un test de două săptămâni te poate scuti de luni de cod. |
| all_on_one | Un singur om pe toate rolurile e primul motiv pentru care proiectele se opresc. |
| orphan_feature | Ce nu ajută la o precondiție poate aștepta; rămâne timp pentru ce mișcă proiectul acum. |
| only_code | Întâlnirile și testele cu oameni sunt de obicei pașii care deblochează restul. |

Tone check (PRD §5): curious, never "greșit / naiv / slab". ✔

---

## 6. Sidebar (small changes) **[UI]**

- The status ring stays as today.
- **Replace the amber `!`** with a sky `?`, shown only for *question* alerts (§5.1).
- **Locked steps:** add the visible text „nu poți începe încă” under the title in `text-xs` (GOV.UK *Cannot start yet*), instead of only a tooltip. Tooltips don't work on touch.
- The bottom line „~{n} min rămase” stays.

---

## 7. *Tot proiectul* as a task list (P1-7) **[UI]**

```
Tot proiectul                                             (h1)
6 din 10 pași gata · ~9 min rămase
[ Continuă cu pasul 7: Precondițiile → ]        ← primary, hidden when all done

┌ Pe scurt (AI) ────────────────────────────────────────────┐
│ {3-line summary, existing}                                 │
└────────────────────────────────────────────────────────────┘

Contextul
 1  Proiectul și echipa       Gata                    Editează
    Sesizări pentru asociații · 2 oameni · 5 funcții
 2  Problema                  Gata · 1 întrebare      Editează
    Asociațiile raportează la telefon și nu primesc…
 3  Ce există deja            Gata                    Editează
Teoria schimbării
 …
 7  Precondițiile             În lucru                Continuă
 8  Ipotezele riscante        Nu poți începe încă
Organizarea
 …

┌ Pagina publică ────────────────────────────────────────────┐
│ Ultima publicare: 21 oct · Ai modificări nepublicate        │
│ [Vezi rezumatul și publică]   Deschide pagina publică ↗     │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Status tags: **Gata** (quiet black text, no background), **În lucru** (teal tag), **Neînceput** (stone tag), **Nu poți începe încă** (grey text, row not clickable), **· {n} întrebări** appended when question alerts are open (GOV.UK task list).
- Each row shows a one-line preview: counts plus the first item, not the full list as today. The full list moves behind a `<details>` „Vezi tot ({n})”.
- The row action is *Editează* (done), *Continuă* (in progress) or *Începe* (first untouched).

---

## 8. Rezumat, publishing and links

### 8.1 Pre-publish check (P0-9) **[UI]**

The *Rezumat* screen gets a check box **above** the preview. It doesn't block publishing; it uses the same three-state rows as §4.

```
Rezumat                                                     (h1)
Așa va vedea grupul pagina. Verifică întâi:

┌ Înainte să publici ──────────────────────────────────────┐
│ ✓ O propoziție despre proiect (apare sus)                 │
│ ○ Un contact pentru cine vrea să ajute         [Adaugă]   │
│     [ email, Discord sau link de grup        ] [Salvează] │
│ ○ Nume reale în echipă (acum: „tu”)            [Corectează]│
│ ✓ Cel puțin un rol căutat                                  │
│ ○ 2 întrebări deschise vor apărea public       [Vezi]     │
└───────────────────────────────────────────────────────────┘
[ Publică pagina ]        ← single primary

{ProjectView preview, with an "Previzualizare" ribbon}
```

**Copy and behaviour:**
- **Contact row:** an inline input bound to `project.contact`, placeholder „email, Discord sau link de grup”, and a helper line: „Apare public. Nu folosi un număr personal dacă nu vrei să fie văzut.”
- **Names row:** *Corectează* opens the team-member editor for the first matching member.
- **Questions row:** *Vezi* scrolls to that section of the preview, and each item there gets a **Ascunde de pe pagină** toggle **[DATA: `alert.public?: boolean`, default true]**.
- **Button:** „Publică pagina” for the first publication, „Actualizează pagina publică” after that.

### 8.2 *Păstrează-ți linkurile* (small changes, plus P1-6) **[UI]**

Keep the structure (F6). The changes:

1. **Visually separate the two links.**
   - Public link card: teal border, title „Pagina publică — pentru grup”, buttons **[Copiază]** and **[Deschide ↗]**.
   - Edit link card: amber border with a lock icon, title „Linkul de editare — doar pentru tine și echipă”, the warning inside this card (not above both), button **[Copiază]**.
2. **P1-6 Mesaj pentru grup:** a read-only textarea with a **[Copiază mesajul]** button and the WhatsApp/Discord-ready text:
   > Salut! Lucrez la **{name}**: {pitch}. Căutăm: {roles joined with ", "}. Detalii și cum poți ajuta: {publicUrl}

   Never include the edit link in this message. Shown only when published.
3. Primary: „Am salvat linkurile” (unchanged).

---

## 9. Public page `/p/[slug]` (P0-8, P1-5)

**Audience and goal:** volunteers in the civic-tech group decide in about 2 minutes whether and how to help. The page follows the inverted pyramid: what it is, then how to help, then the plan, then details.

### 9.1 Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│ PROIECT CIVIC TECH · Prototip · București      Actualizat 21 oct│ ← meta line, chips
│ Sesizări pentru asociații de proprietari                (h1) │
│ Asociațiile raportează problemele blocului într-un singur loc│ ← pitch (1 sentence)
│ și primăria răspunde public, în 30 de zile.                  │
│ [ Vreau să ajut ↓ ]  [ Scrie-ne ]  Codul pe GitHub ↗         │ ← CTAs
├──────────────────────────────────────────────────────────────┤
│ PE SCURT                                                      │
│ ┌ Problema ──────────┐┌ Ce vrem să schimbăm ┐┌ Unde suntem ───┐│
│ │Asociațiile sună la ││Primăria răspunde    ││Prototip ·      ││
│ │primărie și nu află ││public la sesizări în││2 oameni,       ││
│ │ce s-a întâmplat.   ││30 de zile.          ││~7 ore/săpt.    ││
│ └────────────────────┘└─────────────────────┘└────────────────┘│
├──────────────────────────────────────────────────────────────┤
│ CUM POȚI AJUTA                                         (h2)  │
│ ┌ Jurist (drept administrativ) ─────────────── Acum ┐        │
│ │ De ce: primăria trebuie să adopte o procedură      │        │
│ │ nouă prin hotărâre de consiliu.                     │        │
│ │ Primul lucru: o discuție de 30 min despre ce cere   │        │
│ │ o astfel de hotărâre.                               │        │
│ └─────────────────────────────────────────────────────┘        │
│ ┌ Organizator comunitar ─────────────── Acum ┐ ┌ ONG partener ─┐│
│ └───────────────────────────────────────────────┘ └ caut partener┘│
│ Nu te regăsești? Scrie-ne oricum: [contact button]            │
├──────────────────────────────────────────────────────────────┤
│ URMĂTORII PAȘI                                          (h2) │
│ 1 [Organizare] Discuție cu 5 asociații despre cum raportează │
│ 2 [Test]       Cerere 544 la primărie: câte sesizări/lună    │
│ 3 [Cod]        Formular de raportare cu poză și locație      │
│ 4 …  5 …                                                     │
│ ▸ Tot planul de lucru (17)                                   │
├──────────────────────────────────────────────────────────────┤
│ CUM CREDEM CĂ SE PRODUCE SCHIMBAREA                     (h2) │
│  ┌ Direcția: Blocuri întreținute fără cozi la primărie ┐     │
│  └──────────────────────▲──────────────────────────────┘     │
│  ┌ Schimbarea: Primăria răspunde public în 30 de zile ┐      │
│  │ Semn: răspunsurile apar pe site-ul primăriei        │      │
│  └──────────────────────▲──────────────────────────────┘     │
│  ┌ Mediu (3–12 luni) ─────────────────────────────────┐      │
│  │ • Direcția tehnică acceptă sesizările din platformă │      │
│  │   Primăria S3 · ⚠ nesigur — îl testăm               │      │
│  └──────────────────────▲──────────────────────────────┘     │
│  ┌ Început (primele 3 luni) ──────────────────────────┐      │
│  │ • 10 asociații raportează prin platformă            │      │
│  │   Asociațiile de proprietari                         │      │
│  └─────────────────────────────────────────────────────┘     │
├──────────────────────────────────────────────────────────────┤
│ CE VERIFICĂM ÎNTÂI                                      (h2) │
│ ⚠ Primăria acceptă sesizări care nu vin prin registratură    │
│   Test: o întâlnire cu direcția tehnică, în 2 săptămâni.     │
├──────────────────────────────────────────────────────────────┤
│ CINE CONTEAZĂ                                           (h2) │
│ Cine decide        Pe cine afectează    Aliați       Pot bloca│
│ Primăria S3 ●mare  Asociațiile          ONG X        —        │
│                    Locatari vârstnici ⓧ exclus                 │
│ Legături:                                                    │
│ Primăria S3  ─[decide]→  Asociațiile de proprietari          │
│ ANAF  ─[are datele]→  Locatarii                              │
├──────────────────────────────────────────────────────────────┤
│ ECHIPA                                                  (h2) │
│ Ana — frontend, design · 5 h/săpt.                           │
│ Inițiatorul proiectului — backend · 2 h/săpt.                │
├──────────────────────────────────────────────────────────────┤
│ ▸ Ce există deja (2)                                         │
│ ▸ Întrebări la care ne poți ajuta (3)                        │
├──────────────────────────────────────────────────────────────┤
│ Vrei să ajuți? [Scrie-ne]                                    │
│ Pagină făcută cu Ghidul de pornire · actualizată 21 oct 2026 │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Section rules (data → UI)

| Section | Data | Rules and copy |
| --- | --- | --- |
| **Meta line** | `stage`, `area`, `publishedAt` | „Proiect civic tech · {Stadiu} · {zona}” on the left; „Actualizat {d MMM}” on the right. **Stage appears only here.** Stage labels: Idee / Prototip / Funcționează deja. |
| **h1 + pitch** | `project.pitch` [DATA, P1-6]; P0 fallback: `firstSentence(description)` capped at 160 characters on a word boundary with „…” | Pitch in `text-lg`. If both are empty, use `firstSentence(problem.statement)`. |
| **CTAs** | `roles`, `contact`, `links[0]` | 1. **Vreau să ajut ↓** (anchor to `#cum-poti-ajuta`), shown if there are seeking or partner roles. 2. **Contact button** (see contact rules). 3. Text link to the first repo or demo link, labelled by host: „Codul pe GitHub ↗”, „Demo ↗” (if the host isn't a known forge), „Site ↗”. |
| **Pe scurt** | `problem.statement`, `targetChanges[0].text`, stage + team | Three equal boxes (they stack on mobile): **Problema** (first sentence), **Ce vrem să schimbăm** (first change), **Unde suntem** („{Stadiu} · {n} oameni, ~{h} ore/săpt.”). |
| **Cum poți ajuta** | `roles` with status `seeking` or `partner` | One card per role: name (h3); stage chip **Acum** (`start`) or **În 3–12 luni** (`mid`); „De ce:” followed by `reason`; for `partner`, the subtitle „Căutăm o organizație parteneră”. P1: „Primul lucru:” from the first backlog item (kind `organizing` or `test`) whose `preconditionId ∈ role.reasonRefs`; omit if none. Footer: „Nu te regăsești? Scrie-ne oricum.” plus the contact button. **The status word „Caut” is never printed**; being in this section already means that. If the section is empty, hide it, and the hero CTA becomes the contact only. |
| **Următorii pași** | `backlog` stage `start`, by `order` | The first 5, numbered. Kind chips: **Cod** (feature), **Test**, **Organizare**. Then `<details>` „Tot planul de lucru ({n})” with start + mid grouped (and `later` as „Mai târziu” when P1-4 lands). |
| **Cum credem că se produce schimbarea** (P1-5) | `direction`, `targetChanges`, `preconditions` (by stage), `actorId`, `risky` | A vertical chain read **bottom-up**, with a sentence above it: „Citește de jos în sus: ce facem acum duce la ce urmează.” Levels: Început, then Mediu, then Schimbarea (each with „Semn: …”), then Direcția. At most 4 preconditions per level, then „+{k}”. Each precondition shows its actor name in `text-sm` and, if `risky`, the tag „⚠ nesigur — îl testăm”. Multiple target changes: one column per change on ≥ 768 px if preconditions have `leadsTo` to them; otherwise a single chain. **P0 version:** keep the current lists but add the „Citește de jos în sus” order and the actor and risk tags. |
| **Ce verificăm întâi** | risky preconditions (max 3) | Title: `assumption \|\| text`; „Test: {test}”. If `test` is empty: „Test: încă de stabilit — idei binevenite.” |
| **Cine contează** | `actors`, `relations` | **Grouping** (an actor goes into the first group that matches): *Cine decide* (type institution or funder, or power high); *Pot bloca* (stance opposes); *Aliați posibili* (stance supports, or type ngo or media); *Pe cine afectează* (type user, or excluded); *Alții*. Each actor: name, a power dot (●●● mare / ●● medie / ● mică, with a text label for screen readers), and the „exclus” tag if excluded. **Relations** are rows `A ─[chip]→ B` with chip labels: decides „decide”, funds „finanțează”, influences „influențează”, blocks „poate bloca”, holds_data „are datele”, represents „reprezintă”. Then `note` on its own line if present. **Never build a sentence from the verb template.** P2-1: power×stance grid SVG on desktop. |
| **Echipa** | `team`, `roles` covered | „{name} — {skills} · {h} h/săpt.” A name matching `/^(tu\|eu\|me)$/i` renders as „Inițiatorul proiectului”. Covered roles add „· acoperă: {role}”. Total hours line: „În total ~{H} ore pe săptămână.” |
| **Ce există deja** | `existing` | Collapsed `<details>`. Hide the auto-generated „Nimic similar găsit” card; show instead „Nu am găsit inițiative asemănătoare. Știi una? Spune-ne.” |
| **Întrebări la care ne poți ajuta** | dismissed *question* alerts with `public !== false`, plus `toFindOut` | Collapsed `<details>`. De-duplicate by text and show at most 6. Intro: „Lucruri pe care încă nu le știm. Dacă ai un răspuns, scrie-ne.” Checklist-type alerts (§5.1) are **not** listed. |
| **Footer** | contact | „Vrei să ajuți?” plus the contact button; „Pagină făcută cu Ghidul de pornire · actualizată {date}”. |

**Contact rendering:**
- If it is an email (regex), show the button „Scrie-ne” with `mailto:`.
- If it is an http(s) URL: Discord gets „Intră pe Discord”, WhatsApp „Intră în grupul WhatsApp”, anything else „Contactează-ne ↗”.
- Otherwise show the text with the label „Contact:”.
- With no contact, the public page shows no contact button, and the hero CTA links to the roles. The pre-publish check warns about it.

**Empty sections on the public page are hidden.** No „Nimic adăugat încă.” on the public page; that copy stays in the owner's preview only, rendered as a dashed placeholder with „(nu apare public)”.

**Metadata:** `description` = pitch. P2-4: an OG image with the name, pitch and „Căutăm: …”.

### 9.3 Bugs fixed by this redesign

| Bug | Fix |
| --- | --- |
| "instituțiile publice deține datele lui cetățenii" | Chip layout (§9.2, *Cine contează*) |
| Team shown as "tu" | Render rule + pre-publish row + prompt change (§10) |
| 17-line backlog | Top 5 + `<details>` |
| Stage twice, role status twice | Meta line only; roles grouped without a status word |
| No CTA | Hero CTAs + contact button + footer |

---

## 10. Data and model changes (everything not pure UI)

| ID | Change | Why | Risk |
| --- | --- | --- | --- |
| D1 | `project.pitch: string ≤160` (schema + projectInfo card field + editor field) | Public hero, share message | Migration: default `''`; fallback derivation keeps old drafts working |
| D2 | Backlog `stage: 'start' \| 'mid' \| 'later'` | Orphan features „mai târziu” (PRD already names this list) | Check alerts and organizing code that assume 2 values |
| D3 | `alert.public?: boolean` (default true) | Hide sensitive open questions from the public page | None |
| D4 | `requirementsFor(step)` in `completion.ts` (derived, no schema) | Checklist, action bar, AI context | Must match `RULES` for required rows; add a unit test asserting equivalence |
| D5 | `ALERT_MESSAGES[code].why` | Alert copy | None |
| M1 | `prompts/steps/project.md`: replace „name "tu" dacă nu și-a spus numele” with „întreabă-l cum îl cheamă; dacă nu vrea să spună, name „Inițiatorul”” and ask for a one-sentence pitch („Cum ai descrie proiectul într-o propoziție, pentru cineva din grup?”) → `pitch` | „tu” on the public page; pitch | Low |
| M2 | Context message lists the step's missing requirements; the system prompt says to target the first one; optional `targets` in the question JSON | AI feels purposeful (P1-1, P1-3) | `stepTurn` parser must accept and ignore the unknown field |
| M3 | Proposal `text` format: „Am reținut:\n• …\n• …\nÎncă nu știu: …” (max 3 bullets, user's words; the „Încă nu știu” line only if recommended rows are missing) | Reflect-back (P1-2) | Render with `whitespace-pre-wrap` (already) or parse the bullets |
| M4 | Relations prompt: ask for a `note` phrased as a full Romanian sentence („Primăria aprobă bugetul asociațiilor”); allow „necunoscut” | Readable relation notes (eval report) | Low |

Everything else in this spec is **[UI]** only.

---

## 11. Copy reference (new or changed strings)

| Key | Romanian |
| --- | --- |
| step.explainer | AI-ul îți pune întrebări până când lista „Ce cere pasul” e bifată. Ce propune apare punctat — se salvează doar ce accepți. |
| step.explainer.short | AI-ul întreabă până se bifează „Ce cere pasul”. Se salvează doar ce accepți. |
| step.explainer.step1 | Poți scrie liber, lipi o listă din README sau răspunde „nu știu”. |
| checklist.title | Ce cere pasul |
| checklist.counter | {done} din {total} |
| checklist.required / recommended | obligatoriu / recomandat |
| checklist.proposed | propus — acceptă ca să salvezi |
| bar.A.primary | Acceptă și treci la pasul următor → |
| bar.A.sub | Salvează {P} propuneri · apoi: {next} |
| bar.A.secondary | Doar acceptă |
| bar.A.skip | Treci peste propuneri |
| bar.B.primary | Acceptă {P} propuneri |
| bar.B.status | {P} propuneri nesalvate · după ele mai lipsește: {missing} |
| bar.C.primary | Treci la pasul următor: {next} → |
| bar.C.status | ✓ Pasul e complet |
| bar.D.status | Mai lipsește: {missing} |
| bar.D.announce | Ca să treci mai departe: {missing}. |
| bar.last.A / C | Acceptă și mergi la rezumat → / Mergi la rezumat → |
| digest.title | {n} propuneri, încă nesalvate |
| digest.view | Vezi și editează → |
| chat.saved | ✓ Am salvat {n} elemente. |
| chat.saved.complete | Poți trece la pasul următor. |
| chat.saved.missing | Mai lipsește: {missing}. |
| chat.loading.first | Pregătesc prima întrebare… |
| chat.loading.question | Mă gândesc… |
| chat.loading.proposal | Pregătesc propunerile pentru pas… |
| chat.error.saved | Ce ai scris e salvat. |
| chip.example | Dă-mi un exemplu |
| chip.propose | Propune acum |
| card.discard | Renunță |
| saved.empty | Nimic salvat încă. Răspunde în conversație sau adaugă manual. |
| toast.advanced | ✓ Salvat la „{step}”: {n} elemente. |
| toast.back | Înapoi la pas |
| questions.title | Întrebări deschise ({n}) |
| questions.why | De ce contează: |
| questions.about | Despre: |
| questions.discuss | Discută cu AI-ul |
| questions.leave | Lasă deschisă |
| questions.leave.note | Apare pe pagina publică la „Întrebări la care ne poți ajuta”. |
| sidebar.locked | nu poți începe încă |
| publish.check.title | Înainte să publici |
| publish.contact.placeholder | email, Discord sau link de grup |
| publish.contact.help | Apare public. Nu folosi un număr personal dacă nu vrei să fie văzut. |
| public.cta.help | Vreau să ajut ↓ |
| public.cta.write | Scrie-ne |
| public.short | Pe scurt |
| public.help | Cum poți ajuta |
| public.help.why / first | De ce: / Primul lucru: |
| public.help.partner | Căutăm o organizație parteneră |
| public.help.footer | Nu te regăsești? Scrie-ne oricum. |
| public.next | Următorii pași |
| public.next.all | Tot planul de lucru ({n}) |
| public.toc | Cum credem că se produce schimbarea |
| public.toc.read | Citește de jos în sus: ce facem acum duce la ce urmează. |
| public.risk.tag | ⚠ nesigur — îl testăm |
| public.risks | Ce verificăm întâi |
| public.risks.notest | Test: încă de stabilit — idei binevenite. |
| public.actors | Cine contează |
| public.actors.groups | Cine decide · Pe cine afectează · Aliați posibili · Pot bloca · Alții |
| public.team.self | Inițiatorul proiectului |
| public.open | Întrebări la care ne poți ajuta |
| public.open.intro | Lucruri pe care încă nu le știm. Dacă ai un răspuns, scrie-ne. |
| public.footer | Pagină făcută cu Ghidul de pornire · actualizată {date} |
| share.group | Salut! Lucrez la {name}: {pitch}. Căutăm: {roles}. Detalii și cum poți ajuta: {url} |

---

## 12. Test notes

**Unit:**
- `requirementsFor` required rows ≡ `isStepComplete` for all fixtures.
- Affirm matcher: positive list, and negatives („da, dar…”, „nu”, „dar”, 31+ characters).
- Relation chip labels.
- Contact parser.
- Pitch fallback.

**Component (`StepScreen.test.tsx`):** the action-bar states A–D and busy; a single primary button; „da” makes no fetch call; the digest accept equals the cards accept.

**e2e (Playwright, 375 px and 1280 px):** step 1 → step 2 in one click after a proposal; the mobile bar is visible; the public page shows no „tu” and no verb-template relation sentence.

**Manual:** run one real session with the owner on the redesigned steps 1, 5 and 10, and the public page read by one person from the group. Time: under 2 minutes to answer „ce face proiectul și cum pot ajuta?”.
