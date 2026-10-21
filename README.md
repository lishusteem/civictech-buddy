# Ghidul de pornire

Aplicație web în română care îl ghidează pe un inițiator de proiect civic prin 10 pași (context, teoria schimbării, organizare), cu ajutorul unui AI. La final rezultă o pagină publică a proiectului, iar proiectul se editează doar cu un link secret de editare (fără cont).

## Dezvoltare locală

```bash
npm install
cp .env.example .env.local
npm run dev
```

Cu `REPO=memory` și `AI_PROVIDER=fake` (valorile din `.env.example`) aplicația merge fără nicio cheie: datele sunt ținute în memorie (se pierd la repornire), iar AI-ul este unul fals, cu răspunsuri fixe pentru teste. Deschide <http://localhost:3000>.

Variabile de mediu (vezi `.env.example`):

| Variabilă | Rol |
| --- | --- |
| `REPO` | `memory` (local, teste) sau `supabase` (producție) |
| `AI_PROVIDER` | `fake` (local, teste) sau `deepseek` (producție) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | necesare când `REPO=supabase` |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL` | necesare când `AI_PROVIDER=deepseek` |

## Teste

```bash
npm test               # teste unitare și de componente (Vitest)
npx playwright install chromium   # o singură dată
npx playwright test    # test end-to-end (pornește singur serverul pe portul 3100, cu REPO=memory și AI_PROVIDER=fake)
```

## Publicare (deploy)

### 1. Supabase

1. Creează un proiect Supabase.
2. Aplică migrarea `supabase/migrations/0001_init.sql`: fie lipește-o în SQL editor, fie rulează `npx supabase db push` (după `npx supabase link`).
3. Din setările proiectului ia **Project URL** și cheia **service_role** (Project Settings, API). Cheia service_role se folosește doar pe server; nu o pune în cod și nu o publica.

### 2. Vercel

1. Creează un proiect Vercel legat de repository-ul GitHub.
2. Adaugă variabilele de mediu de producție:

   ```
   REPO=supabase
   AI_PROVIDER=deepseek
   SUPABASE_URL=<Project URL din Supabase>
   SUPABASE_SERVICE_ROLE_KEY=<cheia service_role>
   DEEPSEEK_API_KEY=<cheia DeepSeek>
   DEEPSEEK_MODEL=deepseek-flash
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   ```

3. Fă deploy.

### 3. Verificare înainte de lansare

Cu variabilele reale în mediu (de exemplu într-un `.env.local` local, necomis), rulează:

```bash
npx tsx scripts/smoke-repo.ts
npx tsx scripts/smoke-ai.ts
```

Primul verifică scrierea și citirea în Supabase, al doilea un apel real către DeepSeek. Lansează aplicația doar dacă ambele trec.
