# Ghidul de pornire v1 — Plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O aplicație web în care un dev solo parcurge, în ~30 de minute, un wizard de 10 pași ghidat de AI și obține o pagină publică a proiectului, plus un link privat de editare, fără cont.

**Architecture:** Next.js (App Router, TypeScript) pe Vercel. Tot proiectul e un singur obiect JSON validat cu zod și salvat în Supabase ca `draft` și `published`. Browserul vorbește doar cu rutele server din Next; acestea folosesc cheia `service_role` și apelează DeepSeek. Logica deterministă (alerte, „de revizuit”, pași de organizare, linkuri de partajare) stă în funcții pure, testate cu Vitest. AI-ul doar propune carduri, iar dev-ul le acceptă.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, zod 3, @supabase/supabase-js 2, Vitest 3 + @testing-library/react, Playwright. DeepSeek se apelează prin API-ul compatibil OpenAI, cu `fetch`, fără SDK.

**Spec:** `docs/superpowers/specs/2026-10-21-ghid-pornire-prd.md` (export al PRD-ului din Claude Docs: https://claude.ai/artifact/AoEmrqrPEBgBPS7mXu6VvD)

## Global Constraints

- Interfața și AI-ul sunt în română; identificatorii din cod sunt în engleză.
- 10 pași, în această ordine, cu minutele: `project` 4, `problem` 3, `existing` 2, `target` 3, `actors` 3, `relations` 3, `preconditions` 4, `risks` 3, `roles` 3, `backlog` 2 (total 30). Fazele: Contextul (1–3), Teoria schimbării (4–8), Organizarea (9–10).
- Etapele pentru precondiții, roluri și backlog sunt doar `start` | `mid`. Termenul lung există doar ca text, în `direction`.
- AI-ul nu inventează funcții: orice element de backlog `kind: "feature"` are `featureId` dintr-un `project.features` existent.
- În proiect și pe pagina publică intră doar cardurile acceptate. Alertele nu blochează niciodată navigarea.
- La fiecare pas, modelul primește doar datele acceptate din pași, plus conversația pasului curent.
- Fără conturi și fără email stocat. Linkul public e `/p/<slug>`, iar linkul de editare e `/e/<token>`.
- Tokenul de editare are 32 de octeți aleatori (base64url, 256 de biți). În bază se ține doar `sha256(token)` în hex.
- Pe `/e/*` și `/api/e/*`: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`. Pe paginile `/e/*` nu se încarcă scripturi externe.
- RLS e activ pe toate tabelele, fără politici pentru `anon`. Cheia `SUPABASE_SERVICE_ROLE_KEY` și `DEEPSEEK_API_KEY` se folosesc doar pe server.
- Modelul se citește din `DEEPSEEK_MODEL`, iar URL-ul de bază din `DEEPSEEK_BASE_URL` (implicit `https://api.deepseek.com`). Modelul folosit e `deepseek-flash`; `.env.example` îl setează implicit.
- Mesajul de partajare (subiect + corp) are maximum 1.500 de caractere înainte de encodare.
- Limitele de apeluri sunt propunerea mea, nu vin din PRD: maximum 10 proiecte noi pe oră per IP, 300 de apeluri AI pe zi per proiect și 600 pe zi per IP.
- Conținutul utilizatorului se randează doar prin React (escapat). Nu se folosește `dangerouslySetInnerHTML`.
- Prompturile stau în fișiere `.md` în `prompts/`, ca să poată fi editate fără cod.

## Decizii de implementare care nu sunt în PRD

- Proiectul se creează în baza de date când dev-ul apasă „Începe”. De atunci lucrează la `/e/<token>`, cu salvare automată. `published` rămâne `null` până la prima publicare, iar `/p/<slug>` dă 404 până atunci.
- `power` actor = `low` | `medium` | `high`. `stance` = `supports` | `neutral` | `opposes` | `unknown`.
- Alerta „Echipă fără timp” se declanșează când suma `hoursPerWeek` e sub 5. Partea LLM a acestei alerte nu intră în v1.
- Un AI de test (`AI_PROVIDER=fake`) dă răspunsuri scriptate, pentru dezvoltare și pentru e2e.

## Review Focus

1. **Același link de editare deschis în două taburi sau la doi devi.** A doua salvare nu suprascrie în tăcere: primește 409 și un dialog de alegere. Testele sunt în Task 5 și Task 10.
2. **Link de editare vechi, după regenerare, sau link greșit.** Utilizatorul vede mesajul „Linkul nu mai e valid”, nu o eroare de server. `/p/<slug>` nepublicat dă 404. Testele sunt în Task 5 și Task 12.
3. **Model care răspunde cu JSON invalid sau cu carduri care nu respectă schema.** Se face o reîncercare, apoi trecerea în mod formular cu cardurile valide. Testul e în Task 8.
4. **Input foarte lung.** O listă de funcții lipită din README sau un mesaj de 10.000 de caractere: serverul respinge peste limitele din schemă cu 413 și mesaj clar, iar clientul blochează trimiterea peste 4.000 de caractere. Testele sunt în Task 1 și Task 5.
5. **Nume de proiect cu diacritice, emoji sau foarte lung.** Slug-ul e ASCII valid, iar mesajul de partajare rămâne sub 1.500 de caractere. Testele sunt în Task 3.

---

## Structura fișierelor

```
ghid-schimbare/
  prompts/system.md, prompts/alerts.md, prompts/steps/<stepId>.md   — prompturi editabile
  supabase/migrations/0001_init.sql                                 — tabele + funcția de rate limit
  src/lib/project/schema.ts      — schema zod a proiectului + tipuri
  src/lib/project/empty.ts       — createEmptyProject
  src/lib/project/entities.ts    — carduri: tipuri de entități, upsert/remove, entitiesForStep
  src/lib/project/stale.ts       — „de revizuit” (F4)
  src/lib/steps/definitions.ts   — cei 10 pași, faze, minute
  src/lib/alerts/messages.ts     — textele alertelor (copie exactă din PRD)
  src/lib/alerts/codeAlerts.ts   — alertele deterministe + merge
  src/lib/roles/rules.ts         — regulile de derivare a rolurilor (date)
  src/lib/backlog/organizing.ts  — pași de organizare generați din cod (F5b)
  src/lib/tokens.ts              — token, hash, slug
  src/lib/share/links.ts         — mesaj, Gmail, mailto
  src/lib/db/repo.ts             — interfața ProjectRepo + getRepo()
  src/lib/db/memoryRepo.ts       — implementare în memorie (teste, dev)
  src/lib/db/supabaseRepo.ts     — implementare Supabase
  src/lib/http.ts                — helpers pentru răspunsuri + IP
  src/lib/ai/provider.ts         — DeepSeek + fake
  src/lib/ai/prompts.ts          — încărcarea și compunerea prompturilor
  src/lib/ai/stepTurn.ts         — o tură AI pe un pas, validare + reîncercare
  src/lib/ai/llmAlerts.ts        — alertele LLM
  src/app/page.tsx                         — ecranul de start
  src/app/e/[token]/page.tsx               — editorul (shell server → client)
  src/app/p/[slug]/page.tsx                — pagina publică
  src/app/api/projects/route.ts            — POST creare
  src/app/api/e/[token]/route.ts           — GET / PUT ciornă
  src/app/api/e/[token]/publish/route.ts   — POST publicare
  src/app/api/e/[token]/regenerate/route.ts— POST link nou
  src/app/api/e/[token]/ai/route.ts        — POST tură AI
  src/app/api/e/[token]/alerts/route.ts    — POST alerte LLM după acceptare
  src/components/editor/*        — Editor, StepSidebar, ChatPanel, CardsPanel, CardEditor, AlertList, ConflictDialog, Overview, KeepLinks
  src/components/project/ProjectView.tsx   — randarea paginii publice (folosită și ca preview)
  e2e/full-flow.spec.ts
```

---

### Task 1: Scaffold + schema proiectului

**Files:**
- Create: proiect Next.js în `ghid-schimbare/` (`package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`)
- Create: `src/lib/project/schema.ts`, `src/lib/project/empty.ts`
- Test: `src/lib/project/schema.test.ts`

**Interfaces:**
- Produces:
  - `StepIdSchema = z.enum(['project','problem','existing','target','actors','relations','preconditions','risks','roles','backlog'])`, `type StepId`
  - `StageSchema = z.enum(['start','mid'])`, `type Stage`
  - `ProjectSchema` și `type Project`, cu câmpurile (limitele sunt maxime):
    - `version: 1`
    - `project: { name ≤120, description ≤2000, stage: 'idea'|'prototype'|'live'|null, area ≤120, links: url[] ≤10, motivation ≤1000, contact ≤200 }`
    - `team: { id, name ≤80, skills: string≤60[] ≤20, hoursPerWeek 0–80 }[] ≤20`
    - `features: { id, text ≤300 }[] ≤100`
    - `steps: Record<StepId, { status: 'untouched'|'in_progress'|'done', messages: { role: 'assistant'|'user', content ≤4000 }[] ≤60 }>`
    - `problem: { statement ≤1500, evidence: string≤500[] ≤10, verified: boolean }`
    - `existing: { id, name ≤200, url: string|null, difference ≤500 }[] ≤20`
    - `direction: string ≤500`
    - `targetChanges: { id, text ≤300, signal ≤300 }[] ≤3`
    - `actors: { id, name ≤120, type: 'user'|'institution'|'ngo'|'media'|'funder'|'business'|'other', power: 'low'|'medium'|'high', stance: 'supports'|'neutral'|'opposes'|'unknown', excluded: boolean }[] ≤40`
    - `relations: { id, from, to, type: 'decides'|'funds'|'influences'|'blocks'|'holds_data'|'represents', note ≤300 }[] ≤80`
    - `preconditions: { id, text ≤300, actorId: string|null, stage, leadsTo: string, coveredByApp: boolean, assumption ≤500, risky: boolean, test ≤500 }[] ≤40`
    - `roles: { id, name ≤80, reason ≤500, reasonRefs: string[], stage, status: 'covered'|'seeking'|'partner'|'not_needed', coveredBy: string|null }[] ≤30`
    - `backlog: { id, stage, kind: 'feature'|'test'|'organizing', featureId: string|null, preconditionId: string|null, text ≤300, order: number }[] ≤150`
    - `toFindOut: { id, step: StepId, text ≤300 }[] ≤40`
    - `alerts: { code: AlertCode, step: number, refs: string[], status: 'open'|'dismissed'|'resolved', message ≤400 }[]`
    - `stale: string[]`
  - `AlertCodeSchema = z.enum(['team_no_time','solution_in_problem','no_evidence','first_in_world','app_as_goal','abstract_change','nobody_excluded','only_users','powerful_actor_unused','magic_leap','all_through_app','build_and_they_come','hypothesis_without_test','all_on_one','orphan_feature','only_code'])`
  - Tipuri derivate, exportate tot din `schema.ts`: `type Message = Project['steps'][StepId]['messages'][number]`, `type Alert = Project['alerts'][number]`, `type AlertCode`
  - `createEmptyProject(name: string): Project`, în `empty.ts`: toate listele goale, toți pașii `untouched`, `project.stage = null`.

- [ ] **Step 1: Scaffold.** Rulează `npx create-next-app@15 ghid-schimbare --ts --tailwind --app --src-dir --eslint --use-npm --no-turbopack --import-alias "@/*"` în `C:\Users\lishh\civic tech`. Șterge folderul `docs` generat, dacă există unul gol, și păstrează `docs/superpowers`. Apoi rulează `git init`, iar `npm i zod@3 @supabase/supabase-js@2` și `npm i -D vitest@3 @vitejs/plugin-react @testing-library/react @testing-library/dom jsdom @playwright/test`. `vitest.config.ts` folosește mediul `jsdom` și aliasul `@` → `src`. În `package.json` adaugă scriptul `"test": "vitest run"`. `.env.example` listează `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-flash`, `DEEPSEEK_BASE_URL`, `AI_PROVIDER`, `REPO`.
- [ ] **Step 2: Scrie testele care pică** în `schema.test.ts`:
  - `createEmptyProject('Test')` trece `ProjectSchema.parse` și are `steps.backlog.status === 'untouched'`;
  - exemplul JSON din secțiunea 9 a PRD-ului, completat cu câmpurile lipsă, trece validarea;
  - un mesaj cu `content` de 4.001 caractere pică validarea;
  - `stage: 'long'` pe o precondiție pică validarea;
  - 4 elemente `targetChanges` pică validarea.
- [ ] **Step 3: Rulează** `npx vitest run src/lib/project/schema.test.ts`. Rezultat așteptat: FAIL, modulul nu există.
- [ ] **Step 4: Implementează** `schema.ts` și `empty.ts` după blocul Interfaces.
- [ ] **Step 5: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 6: Commit** cu mesajul `chore: scaffold app and project schema`.

### Task 2: Definițiile pașilor

**Files:**
- Create: `src/lib/steps/definitions.ts`
- Test: `src/lib/steps/definitions.test.ts`

**Interfaces:**
- Consumes: `StepId`, `Project` (Task 1)
- Produces:
  - `type StepDef = { id: StepId; number: number; phase: 'context'|'toc'|'organize'; title: string; minutes: number; summary: string }`
  - `STEPS: StepDef[]`, în ordinea din Global Constraints. Titlurile, ca în PRD: „Proiectul și echipa”, „Problema”, „Ce există deja”, „Schimbarea țintă”, „Actorii”, „Relațiile”, „Precondițiile”, „Ipotezele riscante”, „Oamenii de care ai nevoie”, „Backlog de organizare”. `summary` = descrierea scurtă din diagrama PRD-ului.
  - `PHASES: { id: 'context'|'toc'|'organize'; title: 'Contextul'|'Teoria schimbării'|'Organizarea' }[]`
  - `minutesLeft(project: Project): number`: suma minutelor pașilor care nu sunt `done`.

- [ ] **Step 1: Scrie testele care pică:**
  - suma minutelor din `STEPS` e 30;
  - `STEPS.map(s => s.id)` e egal cu ordinea din Global Constraints;
  - `minutesLeft` pe un proiect gol întoarce 30;
  - cu `project` și `problem` marcate `done`, `minutesLeft` întoarce 23.
- [ ] **Step 2: Rulează** `npx vitest run src/lib/steps`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** `definitions.ts`.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: step definitions`.

### Task 3: Tokenuri, slug, linkuri de partajare

**Files:**
- Create: `src/lib/tokens.ts`, `src/lib/share/links.ts`
- Test: `src/lib/tokens.test.ts`, `src/lib/share/links.test.ts`

**Interfaces:**
- Produces:
  - `generateEditToken(): string`: 32 de octeți din `crypto.getRandomValues`, codați base64url, 43 de caractere
  - `hashToken(token: string): Promise<string>`: sha256, hex, 64 de caractere
  - `makeSlug(name: string): string`: transliterează ă→a, â→a, î→i, ș/ş→s, ț/ţ→t; păstrează doar `[a-z0-9-]`, maximum 40 de caractere, plus `-` și un sufix aleator de 6 caractere `[a-z0-9]`; numele gol devine `proiect`
  - `type ShareLinks = { publicUrl: string; editUrl: string; projectName: string }`
  - `buildShareMessage(l: ShareLinks): { subject: string; body: string }`. Subiectul e `Linkurile proiectului ${nume}` (numele tăiat la 80 de caractere). Corpul are, pe rânduri separate: „Pagina publică (o poți da oricui):”, URL-ul public, rând gol, „Linkul de editare (păstrează-l doar pentru echipă; nu poate fi recuperat):”, URL-ul de editare.
  - `gmailComposeUrl(m): string` = `https://mail.google.com/mail/?view=cm&fs=1&su=<enc>&body=<enc>`
  - `mailtoUrl(m): string` = `mailto:?subject=<enc>&body=<enc>`
  - `<enc>` = `encodeURIComponent`

- [ ] **Step 1: Scrie testele care pică:**
  - `generateEditToken()` are 43 de caractere și se potrivește cu `/^[A-Za-z0-9_-]+$/`;
  - două apeluri dau rezultate diferite;
  - `hashToken('abc')` întoarce `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`;
  - `makeSlug('Sesizări în Ștefănești 🚧')` se potrivește cu `/^sesizari-in-stefanesti-[a-z0-9]{6}$/`;
  - `makeSlug('')` începe cu `proiect-`;
  - `makeSlug('a'.repeat(200))` are maximum 47 de caractere;
  - `buildShareMessage` cu un nume de 300 de caractere și URL-uri de 100 de caractere: `subject.length + body.length <= 1500`;
  - `gmailComposeUrl` conține `su=Linkurile%20proiectului`;
  - `mailtoUrl` începe cu `mailto:?subject=`;
- [ ] **Step 2: Rulează** `npx vitest run src/lib/tokens.test.ts src/lib/share`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** ambele fișiere. Folosește `crypto.subtle.digest('SHA-256', …)`, care merge în Node 20 și în browser.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: tokens, slugs and share links`.

### Task 4: Stocarea (interfață, memorie, Supabase, rate limit)

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/db/repo.ts`, `src/lib/db/memoryRepo.ts`, `src/lib/db/supabaseRepo.ts`
- Test: `src/lib/db/memoryRepo.test.ts`

**Interfaces:**
- Consumes: `Project`, `createEmptyProject`, `generateEditToken`, `hashToken`, `makeSlug`
- Produces, în `repo.ts`:
  ```ts
  type StoredProject = { id: string; slug: string; draft: Project; published: Project | null;
    publishedAt: string | null; draftUpdatedAt: string };
  type SaveResult = { ok: true; draftUpdatedAt: string } | { ok: false; conflict: StoredProject };
  interface ProjectRepo {
    create(name: string): Promise<{ stored: StoredProject; editToken: string }>;
    getByToken(token: string): Promise<StoredProject | null>;
    getBySlug(slug: string): Promise<StoredProject | null>;
    saveDraft(token: string, draft: Project, expectedUpdatedAt: string, force?: boolean): Promise<SaveResult | null>; // null = token invalid
    publish(token: string): Promise<StoredProject | null>;
    regenerateToken(token: string): Promise<{ editToken: string } | null>;
    hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>; // true = permis
  }
  function getRepo(): ProjectRepo // REPO=memory → singleton în memorie, altfel Supabase
  ```
- Migrarea: tabelul `projects`, cu coloanele `id uuid pk default gen_random_uuid()`, `slug text unique not null`, `edit_token_hash text unique not null`, `draft jsonb not null`, `published jsonb`, `published_at timestamptz`, `draft_updated_at timestamptz not null default now()`, `created_at timestamptz not null default now()`. Tabelul `rate_limits`, cu `key text`, `window_start timestamptz` și `count int`, și cheia primară `(key, window_start)`. Funcția `hit_rate_limit(p_key text, p_limit int, p_window_seconds int) returns boolean`, care face upsert atomic și compară cu limita. `alter table … enable row level security` pe ambele tabele, fără politici.
- Conflictul: `saveDraft` compară `expectedUpdatedAt` cu `draft_updated_at` curent. Dacă diferă și `force` nu e setat, întoarce `{ ok: false, conflict }`. În Supabase, comparația se face în același `update … where edit_token_hash = $1 and draft_updated_at = $2`, iar 0 rânduri actualizate înseamnă că se citește rândul și se întoarce conflictul.

- [ ] **Step 1: Scrie testele care pică** pentru `memoryRepo`:
  - `create` întoarce un token care funcționează la `getByToken`;
  - `getBySlug` pe un proiect nepublicat întoarce `published === null`;
  - `saveDraft` cu `expectedUpdatedAt` corect întoarce `ok: true` și un `draftUpdatedAt` nou;
  - a doua salvare cu timestamp-ul vechi întoarce `ok: false`, iar `conflict.draft` e cea salvată prima;
  - același lucru cu `force: true` întoarce `ok: true`;
  - `publish` copiază `draft` în `published` și setează `publishedAt`;
  - după `regenerateToken`, vechiul token dă `null` la `getByToken`, iar cel nou funcționează;
  - `hitRateLimit('k', 2, 60)` întoarce true, true, apoi false.
- [ ] **Step 2: Rulează** `npx vitest run src/lib/db`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** `repo.ts`, `memoryRepo.ts`, migrarea și `supabaseRepo.ts`. Ultimul folosește `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })` și apelează funcția de rate limit cu `rpc('hit_rate_limit', …)`.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Verifică manual Supabase.** Rulează `npx supabase db push`, sau lipește SQL-ul în editorul Supabase. Apoi, cu `REPO=supabase`, rulează un script scurt `scripts/smoke-repo.ts` (`npx tsx scripts/smoke-repo.ts`) care face create → saveDraft → publish → getBySlug și afișează `OK`.
- [ ] **Step 6: Commit** cu mesajul `feat: project storage with conflict detection and rate limits`.

### Task 5: Rutele API pentru proiect + headere

**Files:**
- Create: `src/lib/http.ts`, `src/app/api/projects/route.ts`, `src/app/api/e/[token]/route.ts`, `src/app/api/e/[token]/publish/route.ts`, `src/app/api/e/[token]/regenerate/route.ts`
- Modify: `next.config.ts`, unde `headers()` pune headerele din Global Constraints pe `/e/:path*` și `/api/e/:path*`
- Test: `src/app/api/projects.test.ts`

**Interfaces:**
- Consumes: `getRepo()`, `ProjectSchema`
- Produces (HTTP, JSON):
  - `POST /api/projects` `{ name }` → 201 `{ slug, editToken }`. Rate limit: `create:<ip>` 10 / 3600 s, depășirea dă 429 `{ error: 'Prea multe proiecte noi. Încearcă peste o oră.' }`.
  - `GET /api/e/:token` → 200 `{ slug, draft, published: boolean, draftUpdatedAt, publishedAt }` sau 404 `{ error: 'Linkul nu mai e valid.' }`.
  - `PUT /api/e/:token` `{ draft, expectedUpdatedAt, force? }`. Corpul e validat cu `ProjectSchema`. Răspunsuri: 200 `{ draftUpdatedAt }`, 409 `{ conflict: { draft, draftUpdatedAt } }`, 404, 422 `{ error, issues }` la schemă invalidă, 413 `{ error: 'Conținutul e prea mare.' }` la corp peste 512 KB.
  - `POST /api/e/:token/publish` → 200 `{ slug, publishedAt }`.
  - `POST /api/e/:token/regenerate` → 200 `{ editToken }`.
  - `clientIp(req: Request): string` (din `x-forwarded-for`, primul IP) și `json(status, body)`, în `http.ts`.

- [ ] **Step 1: Scrie testele care pică.** Apelează direct funcțiile `POST`/`GET`/`PUT` exportate, cu `REPO=memory` și `new Request(...)`:
  - create, apoi GET întoarce `draft.project.name`;
  - PUT cu un timestamp vechi întoarce 409;
  - PUT cu `draft` invalid întoarce 422;
  - PUT cu un corp de 600 KB întoarce 413;
  - GET cu un token inexistent întoarce 404 și mesajul exact „Linkul nu mai e valid.”;
  - după regenerate, vechiul token dă 404;
  - a 11-a creare de pe același IP întoarce 429.
- [ ] **Step 2: Rulează** `npx vitest run src/app/api`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** rutele și `http.ts`. Adaugă headerele în `next.config.ts`.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: project API routes`.

### Task 6: Entități, carduri și „de revizuit”

**Files:**
- Create: `src/lib/project/entities.ts`, `src/lib/project/stale.ts`
- Test: `src/lib/project/entities.test.ts`, `src/lib/project/stale.test.ts`

**Interfaces:**
- Consumes: `Project`, `StepId`
- Produces:
  - `type EntityKind = 'projectInfo'|'teamMember'|'feature'|'problem'|'existing'|'direction'|'targetChange'|'actor'|'relation'|'precondition'|'role'|'backlogItem'|'toFindOut'`. `projectInfo`, `problem` și `direction` sunt entități unice, cu `id` fix egal cu numele tipului.
  - `ENTITY_SCHEMAS: Record<EntityKind, z.ZodTypeAny>`, adică subschemele din `ProjectSchema`
  - `STEP_ENTITIES: Record<StepId, EntityKind[]>`. `project` → projectInfo, teamMember, feature; `problem` → problem; `existing` → existing; `target` → direction, targetChange; `actors` → actor; `relations` → relation; `preconditions` → precondition, actor; `risks` → precondition (doar câmpurile `risky` și `test`); `roles` → role; `backlog` → backlogItem.
  - `type Card = { kind: EntityKind; data: { id: string } & Record<string, unknown> }`
  - `upsertEntity(p: Project, card: Card): Project`, `removeEntity(p: Project, kind: EntityKind, id: string): Project`, `entitiesForStep(p: Project, step: StepId): Card[]`
  - `normalizeCardIds(p: Project, cards: Card[]): Card[]`: dă un id nou, `<prefix><n>` (de exemplu `a7`), oricărui card fără id sau al cărui id se ciocnește cu o entitate de alt tip. Rescrie referințele (`from`, `to`, `actorId`, `leadsTo`, `reasonRefs`, `featureId`, `preconditionId`) din același lot.
  - `computeStale(prev: Project, next: Project): string[]`: id-urile entităților care referă (prin câmpurile de mai sus sau `coveredBy`) un id șters sau modificat între `prev` și `next`. Rezultatul se adaugă (uniune) la `next.stale`. Nimic nu se șterge.

- [ ] **Step 1: Scrie testele care pică:**
  - `upsertEntity` cu `actor` nou îl adaugă, iar al doilea upsert cu același id îl înlocuiește;
  - `removeEntity` pe un actor îl scoate, dar relațiile lui rămân;
  - `entitiesForStep(p, 'preconditions')` include actorii;
  - `normalizeCardIds`: un lot cu actorul `x` nou și o precondiție cu `actorId: 'x'`, unde `x` există deja ca precondiție, produce un actor cu id nou, iar precondiția referă noul id;
  - `computeStale`: ștergerea actorului `a1` marchează relația `r1` (`from: 'a1'`), precondiția `p1` (`actorId: 'a1'`) și rolul `o1` (`reasonRefs: ['p1','a1']`);
  - modificarea textului `p1` marchează elementul de backlog `b1` (`preconditionId: 'p1'`);
  - o modificare fără impact întoarce `[]`.
- [ ] **Step 2: Rulează** `npx vitest run src/lib/project`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** ambele fișiere.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: entity cards and stale tracking`.

### Task 7: Alertele deterministe, regulile pentru roluri, pașii de organizare

**Files:**
- Create: `src/lib/alerts/messages.ts`, `src/lib/alerts/codeAlerts.ts`, `src/lib/roles/rules.ts`, `src/lib/backlog/organizing.ts`
- Test: `src/lib/alerts/codeAlerts.test.ts`, `src/lib/backlog/organizing.test.ts`

**Interfaces:**
- Consumes: `Project`, `AlertCode`, `STEPS`
- Produces:
  - `ALERT_MESSAGES: Record<AlertCode, { title: string; step: number; message: string }>`. Textele vin exact din tabelul de alerte din secțiunea 5 a PRD-ului (coloanele „Alertă”, „Pas”, „Exemplu de mesaj”). Pentru `team_no_time`, mesajul e „Aveți împreună {h} ore pe săptămână. Ce ar fi realist de făcut în primele 3 luni?”, iar `{h}` se înlocuiește. Pentru `powerful_actor_unused`, „*Ministerul X*” se înlocuiește cu numele actorului.
  - `computeCodeAlerts(p: Project): Project['alerts']`. Calculează doar codurile marcate „Cod” în PRD, și doar pentru pașii al căror `status !== 'untouched'`:
    - `team_no_time`: `team.length > 0`, iar suma `hoursPerWeek` e sub 5
    - `no_evidence`: `problem.statement` nu e gol, iar `evidence` e gol
    - `first_in_world`: `existing` e gol
    - `nobody_excluded`: există actori, dar niciunul cu `excluded: true` sau `stance: 'opposes'`
    - `only_users`: există actori, dar niciunul cu `type: 'institution'`
    - `powerful_actor_unused`: un actor de putere maximă (`high` > `medium` > `low`) nu apare în nicio relație și în nicio precondiție; `refs = [actor.id]`
    - `all_through_app`: există precondiții și toate au `coveredByApp: true`
    - `hypothesis_without_test`: o precondiție are `risky: true` și `test` gol; `refs = [id]`
    - `all_on_one`: `team.length === 1`, există cel puțin 2 roluri și toate sunt `covered`
    - `orphan_feature`: o funcție nu are niciun element de backlog cu `featureId` egal cu id-ul ei și `preconditionId` nenul; `refs = [feature.id]`
    - `only_code`: backlog-ul nu e gol, dar nu are niciun element `organizing` sau `test`
  - `mergeAlerts(previous: Alert[], fresh: Alert[]): Alert[]`: cheia e `code + refs.sort().join(',')`. Păstrează `status` din `previous` pentru cheile care există încă. Alertele care nu mai apar în `fresh` și erau `open` devin `resolved`. Alertele LLM (codurile non-„Cod”) din `previous` rămân neatinse.
  - `ROLE_RULES: { signal: string; role: string; stage: Stage }[]`: tabelul „Reguli de derivare” din secțiunea 4 a PRD-ului, copiat exact, cu etapele `start`/`mid`
  - `buildOrganizingItems(p: Project): Project['backlog']`: câte un element pentru fiecare precondiție cu `test` nevid și `risky: true` (`kind 'test'`, `text = test`, `stage` = cea a precondiției), pentru fiecare rol `seeking` sau `partner` (`kind 'organizing'`, `text = 'Găsește: ' + name` sau `'Vorbește cu un partener pentru: ' + name`), pentru fiecare precondiție cu `coveredByApp: false` (`kind 'organizing'`, `text = precondiție.text`) și pentru fiecare `toFindOut` (`kind 'organizing'`, `text = 'Află: ' + text`, `stage 'start'`). Elementele deja prezente în `p.backlog`, cu același `kind` și `text`, nu se dublează.

- [ ] **Step 1: Scrie testele care pică.** Câte un test pozitiv și unul negativ pentru fiecare cod de mai sus. Plus:
  - pe un proiect gol cu toți pașii `untouched`, `computeCodeAlerts` întoarce `[]`;
  - `mergeAlerts` păstrează `dismissed`;
  - o alertă `open` care dispare devine `resolved`;
  - `buildOrganizingItems` pe un proiect cu o precondiție riscantă cu test, un rol `seeking` și o întrebare `toFindOut` întoarce 3 elemente cu textele exacte de mai sus;
  - un al doilea apel, cu acele elemente deja în backlog, întoarce `[]`.
- [ ] **Step 2: Rulează** `npx vitest run src/lib/alerts src/lib/backlog`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** cele patru fișiere.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: code alerts, role rules, organizing items`.

### Task 8: Stratul AI (provider, prompturi, tura pe pas, alerte LLM, rute)

**Files:**
- Create: `prompts/system.md`, `prompts/alerts.md`, `prompts/steps/{project,problem,existing,target,actors,relations,preconditions,risks,roles,backlog}.md`
- Create: `src/lib/ai/provider.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/stepTurn.ts`, `src/lib/ai/llmAlerts.ts`, `src/app/api/e/[token]/ai/route.ts`, `src/app/api/e/[token]/alerts/route.ts`
- Modify: `next.config.ts`, cu `outputFileTracingIncludes: { '/api/e/[token]/ai': ['./prompts/**'], '/api/e/[token]/alerts': ['./prompts/**'] }`
- Test: `src/lib/ai/stepTurn.test.ts`, `src/lib/ai/llmAlerts.test.ts`

**Interfaces:**
- Consumes: `Project`, `StepId`, `STEPS`, `Card`, `ENTITY_SCHEMAS`, `STEP_ENTITIES`, `normalizeCardIds`, `ROLE_RULES`, `getRepo`, `clientIp`
- Produces:
  - `interface ChatProvider { complete(messages: { role: 'system'|'user'|'assistant'; content: string }[], opts: { json: true }): Promise<string> }`
  - `getProvider(): ChatProvider`. Cu `AI_PROVIDER=fake`, întoarce `FakeProvider`, care dă, în ordine, răspunsurile dintr-o coadă setabilă (`fakeQueue.push(...)`) sau, implicit, o propunere minimă validă pentru pasul cerut. Altfel întoarce `DeepSeekProvider`, care face `POST ${DEEPSEEK_BASE_URL}/chat/completions` cu `{ model: DEEPSEEK_MODEL, messages, response_format: { type: 'json_object' } }` și întoarce `choices[0].message.content`.
  - `buildMessages(p: Project, step: StepId, chat: Message[]): ChatMessage[]`. Conține: system = `system.md`, prompt-ul pasului și `ROLE_RULES` (doar la pasul `roles`); un mesaj de context cu JSON-ul entităților acceptate din pașii anteriori celui curent, plus ale pasului curent, plus `project.features` (la `backlog`); apoi `chat`.
  - `type AiTurn = { kind: 'question'; text: string } | { kind: 'proposal'; text: string; cards: Card[] } | { kind: 'fallback'; text: string; cards: Card[] }`
  - `runStepTurn(p: Project, step: StepId, chat: Message[], provider: ChatProvider): Promise<AiTurn>`. Parsează JSON-ul și validează fiecare card cu `ENTITY_SCHEMAS[kind]`, iar `kind` trebuie să fie în `STEP_ENTITIES[step]`. Pe `backlog`, `featureId` trebuie să existe în `p.features`. Dacă JSON-ul e invalid sau un card e invalid, face exact o reîncercare, adăugând un mesaj `user` cu eroarea. Dacă a doua oară e tot invalid, întoarce `fallback`, cu cardurile valide și `text: 'N-am reușit să structurez răspunsul. Completează direct în formular.'`. Pe `roles`, elimină rolurile cu `reasonRefs` gol sau cu referințe inexistente. La final aplică `normalizeCardIds`.
  - `runLlmAlerts(p: Project, step: StepId, provider): Promise<Alert[]>`. Codurile permise pe pas: `problem` → `solution_in_problem`; `target` → `app_as_goal`, `abstract_change`; `preconditions` → `abstract_change`, `magic_leap`, `build_and_they_come`; `backlog` → `build_and_they_come`. Codurile nepermise se ignoră. Dacă JSON-ul e invalid, întoarce `[]`, fără reîncercare.
  - `POST /api/e/:token/ai` `{ step, chat }` → 200 `AiTurn`. Rate limit: `ai:<token-hash>` 300 / 86400 s și `ai-ip:<ip>` 600 / 86400 s; depășirea dă 429 `{ error: 'Ai atins limita de azi pentru AI. Poți continua în modul formular.' }`. Dacă providerul aruncă eroare, se reîncearcă o dată; apoi 502 `{ error: 'AI-ul nu răspunde acum.' }`.
  - `POST /api/e/:token/alerts` `{ step }` → 200 `{ alerts: Alert[] }`, din `runLlmAlerts` pe ciorna salvată.
  - `summarizeProject(p: Project, provider): Promise<string>`, în `stepTurn.ts`: un rezumat de maximum 3 rânduri, pentru revenirea din F7. Ruta e `POST /api/e/:token/summary` → 200 `{ text }`, cu același rate limit ca `/ai`. La eroare întoarce `{ text: '' }`, iar UI-ul nu afișează nimic.
- Conținutul prompturilor:
  - `system.md` (reguli comune): vorbești în română, simplu, fără jargon de ONG; pui o singură întrebare pe rând; după 1–3 întrebări propui rezumatul; nu scrii în locul dev-ului și nu inventezi funcții; la „nu știu” dai un indiciu legat de proiectul lui, iar a doua oară un exemplu fictiv; răspunzi doar cu JSON, în forma `AiTurn` (`question` sau `proposal`).
  - Fiecare `steps/<id>.md`: obiectivul pasului, întrebările-ghid din tabelul pașilor din PRD (secțiunea 3) și forma JSON a cardurilor acceptate.
  - `preconditions.md`: descrie mersul înapoi din F4b (precondiție → `leadsTo`, repetat de 2–3 ori).
  - `alerts.md`: explicația fiecărui cod LLM, după tabelul din PRD, și forma `{ alerts: [{ code, refs, message }] }`.

- [ ] **Step 1: Scrie testele care pică.** Folosește un provider fals construit în test.
  - Un răspuns `question` valid trece neschimbat.
  - O propunere cu un card `actor` pe pasul `problem` (tip nepermis): după reîncercare, al doilea răspuns e valid; providerul e apelat de 2 ori.
  - Două răspunsuri `not json`: rezultatul are `kind: 'fallback'`, cu `cards: []`.
  - O propunere de backlog cu `featureId: 'f99'` inexistent declanșează reîncercarea.
  - Un rol cu `reasonRefs: []` e eliminat din rezultat.
  - `buildMessages` pe pasul `actors` nu conține mesajele de chat ale pasului `problem`, dar conține `problem.statement`.
  - `runLlmAlerts` pe pasul `problem` ignoră un cod `magic_leap` primit de la model.
- [ ] **Step 2: Rulează** `npx vitest run src/lib/ai`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Scrie fișierele din `prompts/`** și implementează `provider.ts`, `prompts.ts` (citire cu `fs.readFileSync(path.join(process.cwd(), 'prompts', …))`, cu cache), `stepTurn.ts`, `llmAlerts.ts` și cele două rute.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Verifică manual DeepSeek.** Setează `DEEPSEEK_API_KEY` și `DEEPSEEK_MODEL` în `.env.local` și rulează `npx tsx scripts/smoke-ai.ts`, care face o tură reală pe pasul `problem`. Rezultat așteptat: un JSON `question` în română. Confirmă că modelul acceptă `response_format: json_object`; dacă nu, scoate parametrul și păstrează validarea.
- [ ] **Step 6: Commit** cu mesajul `feat: AI step turns and LLM alerts`.

### Task 9: Ecranul de start și crearea proiectului

**Files:**
- Create: `src/app/page.tsx`, `src/components/start/StartScreen.tsx`
- Test: `src/components/start/StartScreen.test.tsx`

**Interfaces:**
- Consumes: `STEPS`, `PHASES`, `POST /api/projects`
- Produces: ecranul de start. Are o propoziție despre ce obții, cei 10 pași grupați pe 3 faze, cu minutele, și totalul „~30 de minute”. Butonul **Începe un proiect nou** deschide un câmp opțional pentru nume, apoi face POST și redirect la `/e/<editToken>`. Câmpul **Continuă un proiect** acceptă un link `/e/...` lipit și face redirect.

- [ ] **Step 1: Scrie testele care pică** cu Testing Library:
  - apar 10 elemente de pas, iar textul „~30 de minute” e prezent;
  - un click pe „Începe” cu `fetch` mock-uit (`{ editToken: 'tok' }`) apelează `router.push('/e/tok')`;
  - lipirea `https://x.vercel.app/e/abc` în „Continuă” face push la `/e/abc`;
  - un text care nu conține `/e/` arată „Linkul nu pare un link de editare.”.
- [ ] **Step 2: Rulează** `npx vitest run src/components/start`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** componenta și pagina.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: start screen`.

### Task 10: Shell-ul editorului (bara de pași, autosave, conflict, „Tot proiectul”)

**Files:**
- Create: `src/app/e/[token]/page.tsx`, `src/components/editor/Editor.tsx`, `src/components/editor/StepSidebar.tsx`, `src/components/editor/useAutosave.ts`, `src/components/editor/ConflictDialog.tsx`, `src/components/editor/Overview.tsx`
- Test: `src/components/editor/useAutosave.test.ts`, `src/components/editor/StepSidebar.test.tsx`

**Interfaces:**
- Consumes: `GET/PUT /api/e/:token`, `STEPS`, `PHASES`, `minutesLeft`, `computeCodeAlerts`, `mergeAlerts`, `computeStale`
- Produces:
  - `useAutosave(token: string, initial: { draft: Project; draftUpdatedAt: string }): { draft: Project; setDraft(next: Project): void; status: 'saved'|'saving'|'error'|'conflict'; conflict: { draft: Project; draftUpdatedAt: string } | null; resolveConflict(choice: 'mine'|'theirs'): void }`. Face debounce de 800 ms și trimite PUT cu `expectedUpdatedAt`. La 409 trece în `conflict`. `mine` retrimite cu `force: true`, iar `theirs` înlocuiește ciorna locală. Înainte de fiecare PUT aplică `computeStale(prev, next)` și `mergeAlerts(prev.alerts, computeCodeAlerts(next))`.
  - `StepSidebar({ project, current, onSelect })`: 3 faze, 10 pași cu starea ✓ / în lucru / neatins, plus un semn dacă pasul are alerte `open`; `aria-current="step"` pe pasul curent; jos, „~{minutesLeft} min rămase”. Pe ecrane sub 768 px devine o bară compactă: „Pasul {n} din 10 · ~{m} min rămase”.
  - `Editor`: pasul curent, plus vederea „Tot proiectul” (`Overview`, carduri editabile pentru toți pașii, fără chat). Când proiectul are deja cel puțin un pas `done`, `Overview` e ecranul de intrare și arată sus rezumatul de la `POST /api/e/:token/summary`, plus bara „Ai modificări nepublicate”, cu butonul **Actualizează pagina publică**, vizibilă când `draftUpdatedAt > publishedAt`. Pagina de editare cu token invalid afișează „Linkul nu mai e valid.” și un link spre start.

- [ ] **Step 1: Scrie testele care pică:**
  - `useAutosave`, cu fake timers și `fetch` mock-uit: două `setDraft` în 500 ms dau un singur PUT;
  - un 409 trece `status` în `conflict` și populează `conflict.draft`;
  - `resolveConflict('mine')` trimite PUT cu `force: true`;
  - ștergerea unui actor referit adaugă relația în `draft.stale`;
  - `StepSidebar`: pasul curent are `aria-current="step"`;
  - cu `project` și `problem` `done`, apare textul „~23 min rămase”;
  - un pas cu alertă `open` are elementul `[data-alert="true"]`.
- [ ] **Step 2: Rulează** `npx vitest run src/components/editor`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** fișierele. `page.tsx` e o componentă server: face GET în repo (nu prin HTTP), dă 404-ul prietenos la token invalid și pasează datele la `Editor` (client).
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: editor shell with autosave and conflicts`.

### Task 11: Ecranul unui pas (conversație, carduri, „Nu știu”, mod formular, alerte)

**Files:**
- Create: `src/components/editor/StepScreen.tsx`, `src/components/editor/ChatPanel.tsx`, `src/components/editor/CardsPanel.tsx`, `src/components/editor/CardEditor.tsx`, `src/components/editor/AlertList.tsx`
- Test: `src/components/editor/StepScreen.test.tsx`

**Interfaces:**
- Consumes: `POST /api/e/:token/ai`, `POST /api/e/:token/alerts`, `entitiesForStep`, `upsertEntity`, `removeEntity`, `ENTITY_SCHEMAS`, `ALERT_MESSAGES`, `useAutosave().setDraft`
- Produces:
  - `StepScreen({ step, draft, setDraft, token })`. Pe desktop are 3 zone, ca în wireframe-ul din PRD; pe mobil, coloana e una singură. Are un `h1` cu titlul pasului, iar focusul se mută pe ultimul mesaj al AI-ului.
  - `ChatPanel`. Trimite `{ step, chat }`, unde `chat` vine din `draft.steps[step].messages`. Mesajele se salvează în ciornă. Câmpul are limita de 4.000 de caractere și contorul vizibil peste 3.500. Butonul **Nu știu** trimite mesajul „Nu știu”. La al treilea „Nu știu” consecutiv pe pas, ultima întrebare a AI-ului se adaugă în `toFindOut` și apare textul „Am notat întrebarea ca «de aflat». Mergi mai departe.”. Butonul **Propune rezumatul acum** trimite mesajul „Propune rezumatul acum.”. La 429 sau 502, afișează eroarea și butonul **Completează în formular**.
  - `CardsPanel`. Arată cardurile acceptate (`entitiesForStep`) și, separat, cardurile propuse din ultimul `AiTurn`: contur punctat, eticheta „propus”, butoanele **Acceptă** / **Editează** / **Șterge**. **Acceptă tot** acceptă toate cardurile. Un card acceptat intră prin `upsertEntity` și setează `steps[step].status` la `in_progress`. Cardurile cu id în `draft.stale` au eticheta „de revizuit” și butonul **Păstrează**, care scoate id-ul din `stale`.
  - `CardEditor({ kind, data, onSave, onCancel })`: formular generat din tipul de entitate, cu selecturi pentru enum-uri și pentru referințe (actor, precondiție, funcție). Acesta e și **modul formular**: butonul **Adaugă manual** din `CardsPanel` îl deschide fără AI.
  - `AlertList`: alertele `open` ale pasului, cu titlul și mesajul din `ALERT_MESSAGES` (sau mesajul LLM) și butoanele **Lucrez la asta acum** (trimite `message` în chat) și **Merg mai departe** (`dismissed`). Nu ascunde și nu dezactivează niciodată **Pasul următor**.
  - **Pasul următor** marchează pasul `done`, apelează `/alerts` pe fundal și îmbină rezultatul cu `mergeAlerts`.

- [ ] **Step 1: Scrie testele care pică.** `fetch` e mock-uit, iar `setDraft` e un spy.
  - Un răspuns `question` apare în chat, cu focus pe el.
  - Un răspuns `proposal` cu un card `actor` arată „propus”. După **Acceptă**, `setDraft` primește un draft cu actorul, iar cardul nu mai e marcat „propus”.
  - Trei click-uri pe **Nu știu** adaugă un `toFindOut` cu textul ultimei întrebări.
  - Un 502 arată „AI-ul nu răspunde acum.” și butonul **Completează în formular**.
  - O alertă `open` lasă **Pasul următor** activ; **Merg mai departe** o face `dismissed`.
  - Un card cu id în `stale` arată „de revizuit”.
  - Un textarea cu 4.001 caractere dezactivează trimiterea.
- [ ] **Step 2: Rulează** `npx vitest run src/components/editor/StepScreen.test.tsx`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** componentele.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: step screen with chat, cards, alerts and form mode`.

### Task 12: Rezumat, publicare, „Păstrează-ți linkurile”, regenerare, pagina publică

**Files:**
- Create: `src/components/project/ProjectView.tsx`, `src/app/p/[slug]/page.tsx`, `src/components/editor/Summary.tsx`, `src/components/editor/KeepLinks.tsx`
- Test: `src/components/editor/KeepLinks.test.tsx`, `src/components/project/ProjectView.test.tsx`

**Interfaces:**
- Consumes: `buildShareMessage`, `gmailComposeUrl`, `mailtoUrl`, `POST /publish`, `POST /regenerate`, `getRepo().getBySlug`, `buildOrganizingItems`
- Produces:
  - `ProjectView({ project, publishedAt })`. Sus e „cartea de vizită”: nume, problema într-o propoziție (`problem.statement`, prima frază), prima schimbare țintă, stadiul, rolurile cu `status` `seeking` sau `partner` și etapa lor, plus contactul, dacă există. Urmează secțiunile în ordinea din secțiunea 8 a PRD-ului: Proiectul și echipa, Problema, Ce există deja, Teoria schimbării, Ipotezele riscante, Harta actorilor (listă de actori și relații), Echipa căutată, Backlog de organizare (`start` apoi `mid`), Puncte deschise (alertele `dismissed` și `toFindOut`). Sub titlu apare „Actualizat la {dată, ro-RO}”.
  - `/p/[slug]` e o componentă server. Dacă `published` e `null`, dă `notFound()`. `generateMetadata` setează titlul `{nume} — Ghidul de pornire` și descrierea din prima schimbare țintă sau din problemă.
  - `Summary`: `ProjectView` pe ciornă, ca preview, și butonul **Publică**. La intrarea în pasul `backlog`, adaugă în ciornă `buildOrganizingItems(draft)`.
  - `KeepLinks({ slug, editToken, projectName, onDone })` are:
    - avertismentul „Linkul de editare e singura cheie a proiectului. Dacă îl pierzi, nu-l putem recupera.”, pe un fundal de avertizare;
    - cele două linkuri, fiecare cu butonul **Copiază** (`navigator.clipboard.writeText`) și confirmarea „Copiat”;
    - blocul **Trimite-ți-le**, cu linkurile `<a target="_blank" rel="noopener">` **Gmail** și `<a>` **Aplicația de email** (`mailtoUrl`);
    - butonul **Partajează**, randat doar dacă `typeof navigator.share === 'function'`;
    - butonul **Am salvat linkurile**.
    Până la click pe acest buton, un handler `beforeunload` cere confirmare.
  - În meniul editorului, butonul **Generează link nou** cere confirmare („Linkul vechi nu va mai funcționa.”), apelează `/regenerate`, apoi arată `KeepLinks` cu noul token și face `router.replace('/e/<nou>')`.

- [ ] **Step 1: Scrie testele care pică:**
  - `KeepLinks` arată textul exact al avertismentului;
  - **Copiază** apelează `clipboard.writeText` cu URL-ul de editare;
  - `href`-ul Gmail începe cu `https://mail.google.com/mail/?view=cm`;
  - fără `navigator.share`, butonul **Partajează** nu există;
  - un `beforeunload` declanșat înainte de **Am salvat linkurile** are `defaultPrevented === true`, iar după click nu;
  - `ProjectView` cu un proiect cu 2 roluri (unul `seeking`, unul `covered`) arată în cartea de vizită doar rolul `seeking`;
  - un nume cu `<script>` apare ca text, nu ca element.
- [ ] **Step 2: Rulează** `npx vitest run src/components/editor/KeepLinks.test.tsx src/components/project`. Rezultat așteptat: FAIL.
- [ ] **Step 3: Implementează** fișierele.
- [ ] **Step 4: Rulează** aceeași comandă. Rezultat așteptat: PASS.
- [ ] **Step 5: Commit** cu mesajul `feat: publish flow, keep-links screen, public page`.

### Task 13: E2E cu AI fals, README de deploy

**Files:**
- Create: `e2e/full-flow.spec.ts`, `playwright.config.ts`, `README.md`

**Interfaces:**
- Consumes: aplicația pornită cu `REPO=memory AI_PROVIDER=fake`.

- [ ] **Step 1: Scrie testul e2e.** Configurația Playwright pornește `npm run dev` cu env-urile de mai sus. Testul:
  1. pornește de la `/`, apasă Începe și ajunge pe `/e/...`;
  2. în fiecare pas, trimite un răspuns, apasă **Acceptă tot** pe propunerea falsă, apoi **Pasul următor**;
  3. pe Rezumat apasă **Publică**, verifică avertismentul de pe KeepLinks și apasă **Am salvat linkurile**;
  4. deschide `/p/<slug>` și verifică numele proiectului;
  5. revine la `/e/<token>`, modifică problema și apasă **Actualizează pagina publică**;
  6. verifică că `/p/<slug>` arată textul nou;
  7. deschide `/e/<token>` în al doilea context, salvează din amândouă și verifică că apare dialogul de conflict.
- [ ] **Step 2: Rulează** `npx playwright test`. Rezultat așteptat: FAIL până la reparații, apoi PASS. Repară doar ce testul arată ca fiind stricat.
- [ ] **Step 3: Scrie `README.md`.** Include: variabilele de mediu din `.env.example`; aplicarea migrării Supabase; proiectul Vercel cu `REPO=supabase`, `AI_PROVIDER=deepseek` și cheile ca env vars de producție; comenzile `npm test` și `npx playwright test`.
- [ ] **Step 4: Rulează** `npm test && npx playwright test && npm run build`. Rezultat așteptat: toate trec, iar build-ul se termină fără erori.
- [ ] **Step 5: Commit** cu mesajul `test: end-to-end flow; docs: deploy readme`.
