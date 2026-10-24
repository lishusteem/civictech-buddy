# Cât costă AI-ul pe proiect: DeepSeek vs OpenAI vs Claude (24 oct 2026)

**Pe scurt:**

- Un proiect complet (10 pași) costă azi **~4 cenți** cu DeepSeek flash.
- Un model „deștept” costă **~0,6 $** (OpenAI gpt-6.1-sol, Claude Sonnet 5.5), **~1,1 $** (Claude Opus 5.5) sau **~1,7–2,9 $** (gpt-5.5, gpt-6-astra, Claude Fable 5.1) pe proiect.
- La 100 de proiecte pe lună, diferența e între **4 $** și **~60–290 $**.
- Varianta mixtă (model deștept doar la pașii grei) iese **~0,25–0,30 $** pe proiect.

## 1. Câți tokeni consumă un proiect (măsurat)

Am refăcut toate apelurile AI dintr-un proiect real: răspunsurile tale de la Implicare Civica, trecute prin prompturile actuale (scriptul `.superpowers/eval/measure-tokens.ts`).

| | Valoare |
| --- | --- |
| Apeluri AI per proiect | ~36 (32 de ture de conversație + alerte + rezumat) |
| Tokeni de intrare | **~135.000** (promptul de sistem și al pasului are ~2.300; contextul proiectului crește de la pas la pas) |
| Tokeni de ieșire vizibili | **~7.000** (întrebări + carduri JSON) |
| Tokeni de „gândire” (reasoning, plătiți ca ieșire) | 0 fără thinking · ~36.000 la nivel mediu · ~90.000 la nivel mare |
| Cache | ~50% din intrare se repetă de la un apel la altul (promptul pasului, contextul) și se poate citi din cache, mult mai ieftin |

Estimarea e aproximativă, ±30%. Tokenizatoarele diferă între furnizori; Claude Sonnet 5, de exemplu, numără ~30% mai mulți tokeni pentru același text. În plus, un dev care revine și editează adaugă apeluri.

## 2. Prețuri folosite (per 1 milion de tokeni)

| Model | Intrare | Intrare din cache | Ieșire | Sursa |
| --- | --- | --- | --- | --- |
| DeepSeek flash (actual, off-peak / peak) | 0,15 / 0,30 | 0,003 | 0,60 / 1,20 | agregatori, pagina oficială n-a putut fi citită |
| DeepSeek v4-pro (off-peak) | 0,66 | 0,022 | 1,98 | idem |
| OpenAI gpt-6-luna | 0,10 | 0,01 | 0,50 | [pagina oficială OpenAI](https://developers.openai.com/api/docs/pricing) |
| OpenAI gpt-5.4-mini | 0,75 | 0,075 | 4,50 | idem |
| OpenAI gpt-6.1-sol | 2,00 | 0,10 | 10,00 | idem |
| OpenAI gpt-5.6-terra | 2,00 | 0,20 | 12,00 | idem |
| OpenAI gpt-5.5 | 5,00 | 0,50 | 30,00 | idem |
| OpenAI gpt-6-astra (flagship) | 10,00 | 1,00 | 50,00 | idem |
| Claude Haiku 5.5 | 0,10 | 0,01 | 0,50 | documentația Anthropic |
| Claude Sonnet 5.5 | 2,00 | 0,20 | 10,00 | idem |
| Claude Opus 5.5 | 4,00 | 0,20 | 20,00 | idem |
| Claude Fable 5.1 (top) | 10,00 | 0,25 | 50,00 | idem |

Surse pentru prețurile DeepSeek: [CloudZero](https://www.cloudzero.com/blog/deepseek-pricing/), [nxcode](https://www.nxcode.io/resources/news/deepseek-api-pricing-complete-guide-2026), [aipricing.guru](https://www.aipricing.guru/deepseek-pricing/). Le-am luat de la agregatori, pentru că pagina oficială DeepSeek n-a putut fi citită; de verificat acolo.

## 3. Cost per proiect (USD)

Cele trei scenarii:

- **Fără thinking:** fără gândire, fără cache.
- **Thinking mediu:** ~36.000 de tokeni de gândire, cu 50% din intrare din cache. **Ăsta e scenariul realist** și apare îngroșat în tabel.
- **Thinking mare:** ~90.000 de tokeni de gândire, fără cache. E cazul cel mai scump.

| Model | Fără thinking | **Thinking mediu** | Thinking mare | 100 proiecte/lună | 1.000 proiecte/lună |
| --- | --- | --- | --- | --- | --- |
| DeepSeek flash (acum) | 0,02 | **0,04** | 0,08 | 4 $ | 36 $ |
| Claude Haiku 5.5 | 0,02 | **0,03** | 0,06 | 3 $ | 29 $ |
| OpenAI gpt-6-luna | 0,02 | **0,03** | 0,06 | 3 $ | 29 $ |
| DeepSeek v4-pro | 0,10 | **0,13** | 0,28 | 13 $ | 131 $ |
| OpenAI gpt-5.4-mini | 0,13 | **0,25** | 0,54 | 25 $ | 249 $ |
| OpenAI gpt-6.1-sol | 0,34 | **0,57** | 1,24 | 57 $ | 572 $ |
| Claude Sonnet 5.5 | 0,34 | **0,58** | 1,24 | 58 $ | 578 $ |
| OpenAI gpt-5.6-terra | 0,35 | **0,66** | 1,43 | 66 $ | 664 $ |
| Claude Opus 5.5 | 0,68 | **1,14** | 2,48 | 114 $ | 1.144 $ |
| OpenAI gpt-5.5 | 0,89 | **1,66** | 3,59 | 166 $ | 1.661 $ |
| Claude Fable 5.1 | 1,70 | **2,84** | 6,20 | 284 $ | 2.842 $ |
| OpenAI gpt-6-astra | 1,70 | **2,89** | 6,20 | 289 $ | 2.892 $ |

## 4. Variante recomandate

1. **Mixt (cel mai bun raport):**
   - **Ce face:** un model deștept (Sonnet 5.5 sau gpt-6.1-sol) doar la pașii unde contează raționamentul: 4 (impact), 7 (drumul schimbării), 8 (ipoteze), 9 (roluri) și propunerile de carduri. Un model ieftin (Haiku 5.5, gpt-6-luna sau DeepSeek flash) face întrebările simple și pașii 1–3, 5–6 și 10.
   - **Cost:** ~40% din apeluri merg la modelul deștept, adică **~0,25–0,30 $** pe proiect.
   - **Implementare:** codul are deja un singur `ChatProvider`. Ar trebui doar o regulă de rutare pe pas.
2. **Tot pe un model deștept de nivel mediu** (Sonnet 5.5 sau gpt-6.1-sol): **~0,6 $** pe proiect, cu calitate uniformă.
3. **Opus 5.5 / gpt-5.5:** **1,1–1,7 $** pe proiect. Merită doar dacă evaluarea arată o diferență clară față de nivelul mediu.
4. **Rămânem pe DeepSeek flash** cu prompturile noi: **4 cenți**. Merită măsurat întâi cât au rezolvat prompturile noi.

**Plafonul de cost:** limitele din aplicație rămân plasa de siguranță: 300 de apeluri pe zi per proiect, 600 per IP și 5.000 global. Cu Sonnet 5.5, plafonul global înseamnă cel mult ~80 $ pe zi în cel mai rău caz (5.000 de apeluri × ~16 cenți / 1.000 de tokeni). Merită coborât la 1.500 dacă trecem pe un model scump.

## 5. Ce n-a fost măsurat

- **Calitatea:** n-am comparat-o pe aceleași răspunsuri cu OpenAI. Pentru Claude avem rularea cu Haiku și cele vechi cu Sonnet. Pasul următor ar fi rularea răspunsurilor tale reale prin 2–3 candidați și compararea cardurilor.
- **Integrarea OpenAI:** ar cere un provider nou, separat de DeepSeek. API-ul de Chat Completions e același stil, deci schimbarea e mică.
