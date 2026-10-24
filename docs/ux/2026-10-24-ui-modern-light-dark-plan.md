# UI modern, cu temă luminoasă și întunecată: cercetare și plan

**Ce e:** cercetarea și planul de implementare pentru un UI mai modern și mai intuitiv, cu variante light și dark pe toate paginile (start, editor, rezumat, pagina publică „Povestea” și „Harta schimbării”).

**Regula de bază:** nu se schimbă structura datelor și nici informația afișată. Rămân la fel `src/lib/**`, schema Zod, API-urile, migrarea Supabase, prompturile, textele din UI și semantica stărilor (salvat / propus / întrebare deschisă / eroare din [ux-redesign-spec §1.1](2026-10-22-ux-redesign-spec.md)). Se schimbă doar componentele React, CSS-ul și layout-ul.

**Prioritatea pe dispozitive (decisă):**

| Ecran | Ținta principală | Mobil |
| --- | --- | --- |
| Start, editor (pași, Tot proiectul, Rezumat, linkuri) | **Desktop (≥ 1280 px)**; încurajăm lucrul pe PC | Rămâne utilizabil ca azi, fără investiție nouă. Pe ecrane mici apare o notă discretă: „Ghidul merge cel mai bine pe calculator” |
| Pagina publică (`/p/[slug]`, Povestea și Harta) | **Mobil și desktop la fel de important**: linkul se trimite pe grupuri și se deschide de pe telefon | Proiectată mobile-first, testată la 360–430 px |

---

## 1. Unde suntem (audit din cod și capturi)

Capturile au fost făcute pe un proiect complet (cel din `ProjectView.test.tsx`), la 1440 px și 390 px, cu sistemul pe light și pe dark.

| # | Constatare | Unde | Efect |
| --- | --- | --- | --- |
| A1 | Tema e forțată pe light (`color-scheme: light`, „keep it light even when the OS is in dark mode”) | `src/app/globals.css` | Dark mode-ul sistemului e ignorat complet: capturile dark sunt identice cu cele light |
| A2 | ~600 de clase de culoare hardcodate (`bg-white` ×43, `text-stone-600` ×42, `text-teal-900` ×37 …), zero `dark:` | 29 de fișiere `.tsx` | Dark mode nu se poate adăuga fără o trecere prin fiecare fișier |
| A3 | 21 de constante locale de stil duplicate (`primaryButton`, `secondary`, `chip`, `focusRing`, `inputClass` …), ușor diferite între ele | editor, start, project | Butoanele și câmpurile arată puțin diferit de la ecran la ecran; orice schimbare se face în 10 locuri |
| A4 | Marginea câmpurilor e `stone-400` (#a8a29e): contrast 2,52:1 pe alb | `inputClass`, `CardsPanel`, `ChatPanel` | Sub pragul WCAG 1.4.11 (3:1 pentru componente UI) |
| A5 | Totul e „cutie cu bordură”: secțiuni, carduri, liste, pași | toate ecranele | Pagina pare densă și plată; ierarhia vine doar din text |
| A6 | Ecranul pasului are trei rânduri de explicații (subtitlu, explicație cu ⓘ, „Ce cere pasul”) înainte de conversație | `StepScreen` | Conversația începe la jumătatea ecranului |
| A7 | Chat-ul: mesajele AI sunt cutii albe cu bordură, la fel ca inputul; butonul „Trimite” e secundar, la egalitate cu „Nu știu” | `ChatPanel` | Nu se vede la prima privire unde scrii și ce e acțiunea principală |
| A8 | Bara laterală arată „~0 min rămase” când totul e gata | `StepSidebar` | Pare o eroare; ar trebui să spună că poți publica |
| A9 | Pagina publică: hero bun, dar secțiunile de mai jos au aceeași greutate vizuală; „Următorii pași” arată ca o listă de cutii goale | `ProjectView`, `NextSteps` | Ochiul nu are unde să se oprească |
| A10 | Harta: coloanele sunt cutii gri pe gri; culorile nivelurilor (teal / emerald / amber) sunt clase directe | `MapView` | Fără tokenuri, harta e cel mai greu ecran de trecut pe dark |
| A11 | Trei teste verifică clase de culoare (`bg-teal-800`, `border-teal`, `border-amber`) | `Editor.test`, `StepScreen.test`, `KeepLinks.test` | Se rup la orice schimbare de culori, deci trebuie schimbate să verifice starea, nu culoarea |

Ce merge bine și rămâne: structura pe 3 faze, bara de acțiune cu stările A–D, cardurile propuse punctate, accesibilitatea (`aria-current="step"`, live region unic, `aria-disabled` cu explicație), Geist ca font, identitatea teal + stone.

---

## 2. Ce spune cercetarea

### 2.1 Dark mode: arhitectura

- **Tokenuri semantice, nu culori.** Culorile se numesc după rol (`surface`, `fg-muted`, `primary`), nu după valoare (`stone-100`). Organizarea recomandată are trei niveluri: primitive → semantice → componentă ([Muzli](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/), [Ambitious Designer](https://ambitiousdesigner.substack.com/p/unlocking-the-power-of-design-tokens), [SaaS UI](https://www.saasui.design/blog/saas-dark-mode-theming-ux-patterns)).
- **Gri închis, nu negru, iar înălțimea se arată prin suprafețe mai deschise.** Pe dark, umbrele aproape nu se văd, deci un element „ridicat” e mai deschis la culoare. Ajung 4–5 niveluri ([Material 2 dark theme](https://m2.material.io/design/color/dark-theme), [Material 3 surface roles](https://material.io/blog/tone-based-surface-color-m3)).
- **Nu se inversează culorile.** Culorile saturate pe fundal închis pică ușor sub 4,5:1, așa că accentul se deschide la culoare pe dark (teal-800 → teal-400) și textul de pe el devine închis ([UXMagic](https://uxmagic.ai/blog/dark-mode-ui-design-guide), [Pixso](https://pixso.net/articles/dark-mode/)).
- **`color-scheme` contează.** Fără `color-scheme: dark`, inputurile native, scrollbar-urile și `<select>` rămân albe. `light-dark()` merge în toate browserele majore din mai 2024 ([web.dev](https://web.dev/articles/light-dark), [MDN](https://developer.mozilla.org/en-us/docs/web/css/color_value/light-dark)).

### 2.2 Dark mode: implementarea în Next 15 + Tailwind v4

- În Tailwind v4, `dark:` urmează implicit `prefers-color-scheme`. Pentru un buton de temă, varianta se leagă de un atribut: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` ([DEV](https://dev.to/khanrabiul/nextjs-tailwindcss-v4-how-to-add-darklight-theme-with-next-themes-3c6l), [comparație](https://eastondev.com/blog/de/posts/dev/20260328-tailwind-dark-mode-comparison/)).
- **next-themes** pune atributul pe `<html>` printr-un script injectat înainte de randare, deci fără flash în producție (în dev poate apărea). Atributul implicit e `data-theme`, implicit urmează sistemul (`defaultTheme="system"`) și setează singur `color-scheme`. Cere `suppressHydrationWarning` pe `<html>`, iar butonul de temă se randează abia după mount, ca să nu dea hydration mismatch ([next-themes](https://github.com/pacocoursey/next-themes)).
- Greșeala frecventă e randarea condiționată pe `theme === 'dark'` în loc de clase `dark:`, care strică hidratarea ([PasteCode](https://pastecode.xyz/prompts/add-dark-mode-with-tailwind.md)). La noi, culorile vin din variabile CSS, deci componentele nu trebuie să știe tema deloc.

### 2.3 Chat + carduri (copilot cu „canvas”)

- Microsoft recomandă layoutul cu chat lângă spațiul de lucru pentru editare în mai mulți pași, cu stare persistentă. Conversația rămâne sursa intenției, iar spațiul de lucru arată starea comună ([Microsoft Copilot UI guidelines](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-mcp-apps-ui-guidelines), [lab Copilot canvas](https://microsoft.github.io/frontier-ghcp-ttt-rvas/sessions/session-08-copilot-app-canvases/trainer-content/)). Asta e deja structura aplicației; o confirmă.
- Modificările AI vin ca propuneri mici, cu Acceptă / Respinge vizibile și un Undo după aplicare. Publicarea rămâne un pas explicit ([IEEE Computer Society](https://www.computer.org/publications/tech-news/community-voices/copilot-ergonomics-ui-patterns), [Knogin](https://knogin.com/developers/ai-builder-partner)). Și asta există deja; trebuie doar arătat mai clar.
- Butoanele de răspuns rapid scad efortul, dar textul liber trebuie să rămână la îndemână. Un indicator de „scrie…” reduce frustrarea la răspunsurile lungi ([Lovable, care citează studii](https://lovable.dev/guides/how-to-build-a-chatbot-ui)).

### 2.4 Wizard / stepper

- Pe desktop, pașii cu nume rămân vizibili. Pe mobil, un stepper text („Pasul 4 din 10”) sus sau jos funcționează mai bine. Un studiu de caz a raportat −15% timp și +12% trecere la pasul următor ([Lollypop](https://lollypop.design/blog/2026/february/beyond-the-progress-bar-the-art-of-stepper-ui-design/), [Toyota DX](https://dx-playbook.toyota-europe.com/cds/components/forms/stepper/)).
- Progresul trebuie să fie onest, validarea să se facă la fiecare pas, iar munca să nu se piardă niciodată ([SaaS UI](https://www.saasui.design/blog/saas-multi-step-form-wizard-ux-patterns)).

*Rezervă: multe surse sunt bloguri de practică, nu standarde. Pentru contrast, standardul rămâne WCAG 2.2 (1.4.3 text 4,5:1, 1.4.11 componente 3:1).*

---

## 3. Direcția vizuală: „civic, calm, clar”

1. **Mai puține borduri, mai mult ton.** Secțiunile se separă prin spațiu și prin suprafețe ușor diferite (`surface` / `surface-2`), nu prin contururi. Bordura rămâne doar pe ce se poate apăsa sau completa.
2. **O singură acțiune evidentă per zonă.** Butonul primar e plin (teal), cel secundar e un buton cu fundal ușor, nu încă un contur, iar cel terțiar e link.
3. **Tipografie cu contrast de mărime.** Titlul pasului 28–32 px, textul 16 px, metadatele 13 px. Pe pagina publică, titlul proiectului 36–44 px.
4. **Colțuri și adâncime consecvente.** Raza e 12 px pentru carduri și 10 px pentru butoane și câmpuri. Umbre foarte fine doar pe light; pe dark adâncimea vine din suprafețe mai deschise.
5. **Culorile își păstrează sensul.** Teal = acțiune și salvat, amber = nesalvat sau nesigur, sky = întrebare deschisă, roșu = eroare, emerald = „merge deja”. Fiecare stare are și un simbol (✓ ◐ ○ ⚠ ?), nu doar o culoare.
6. **Mișcare discretă.** Fade sau slide de 150–200 ms la propuneri noi, la toast și la tab-uri. Totul se oprește sub `prefers-reduced-motion`.

---

## 4. Sistemul de tokenuri (propus și verificat)

Valorile sunt în `globals.css`, ca variabile CSS pe `:root` și pe `[data-theme=dark]`, mapate în Tailwind v4 prin `@theme inline`. Astfel apar clase ca `bg-surface`, `text-fg-muted`, `bg-primary`, `border-line` etc. Contrastul a fost calculat cu formula WCAG; vezi §4.2.

### 4.1 Tabel

| Token | Rol | Light | Dark |
| --- | --- | --- | --- |
| `bg` | fundalul paginii | `#fafaf9` stone-50 | `#0c0a09` stone-950 |
| `surface` | carduri, panouri | `#ffffff` | `#1c1917` stone-900 |
| `surface-2` | zone de grupare (coloanele hărții, bara laterală) | `#f5f5f4` stone-100 | `#292524` stone-800 |
| `line` | borduri decorative | `#e7e5e4` stone-200 | `#292524` stone-800 |
| `line-strong` | borduri de câmpuri și controale | `#78716c` stone-500 | `#78716c` stone-500 |
| `fg` | text | `#1c1917` | `#f5f5f4` |
| `fg-muted` | text secundar | `#57534e` stone-600 | `#a8a29e` stone-400 |
| `fg-subtle` | metadate | `#78716c` stone-500 | `#8f8780` |
| `primary` | buton primar, pas curent | `#115e59` teal-800 | `#2dd4bf` teal-400 |
| `primary-hover` | | `#134e4a` teal-900 | `#5eead4` teal-300 |
| `on-primary` | text pe primar | `#ffffff` | `#042f2e` teal-950 |
| `primary-soft` / `-fg` | salvat, selecție | `#f0fdfa` / `#134e4a` | `#12302d` / `#99f6e4` |
| `proposed` / `-fg` / `-line` | propus, nesalvat, nesigur | `#fffbeb` / `#78350f` / `#fcd34d` | `#2a2110` / `#fcd34d` / `#b45309` |
| `question` / `-fg` | întrebare deschisă | `#f0f9ff` / `#075985` | `#0f2533` / `#7dd3fc` |
| `danger` / `-fg` | eroare | `#fef2f2` / `#991b1b` | `#2c1414` / `#fca5a5` |
| `success` / `-fg` | „merge deja” | `#ecfdf5` / `#065f46` | `#0f2a20` / `#6ee7b7` |
| `focus` | inelul de focus | `#115e59` | `#5eead4` |
| `shadow-card` | | `0 1px 2px rgb(28 25 23 / .06), 0 1px 3px rgb(28 25 23 / .04)` | `none` |

### 4.2 Contrast măsurat

| Pereche | Light | Dark |
| --- | --- | --- |
| text pe suprafață | 17,49 | 16,03 |
| text secundar pe fundal | 7,30 | 7,83 |
| metadate pe suprafață | 4,80 | 4,95 |
| text pe butonul primar | 7,58 | 7,77 |
| link primar pe suprafață | 7,58 | 11,82 |
| propus / întrebare / eroare / succes | 8,75 / 7,09 / 7,60 / 7,29 | 11,00 / 9,45 / 9,09 / 10,04 |
| bordura câmpurilor (prag 3:1) | 4,80 (azi 2,52 ✗) | 3,65–4,12 |

Toate trec AA; majoritatea trec și AAA.

---

## 5. Mecanismul temei

1. **Dependență nouă:** `next-themes` (mică, fără dependențe), cu `attribute="data-theme"`, `defaultTheme="system"`, `enableSystem` și `disableTransitionOnChange`.
2. **`globals.css`:** se scoate `color-scheme: light`. Se adaugă `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`, variabilele pe `:root` / `[data-theme=dark]`, `color-scheme: light` / `dark` corespunzător și `@theme inline` cu tokenurile din §4.
3. **`layout.tsx`:** `<html lang="ro" suppressHydrationWarning>` și un `<Providers>` client care conține `ThemeProvider`. Plus `export const viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#fafaf9' }, { media: '(prefers-color-scheme: dark)', color: '#0c0a09' }] }`, ca bara browserului de pe mobil să se potrivească cu tema.
4. **`ThemeToggle`:** trei opțiuni (Luminos / Întunecat / Ca sistemul), ca segmented control cu `role="radiogroup"`. Se randează după mount, cu un placeholder de aceeași mărime ca să nu sară layoutul. Apare în meniul editorului, în colțul paginii de start și în subsolul paginii publice.
5. **Tipărire:** `@media print` forțează tokenurile light, pentru cine tipărește pagina publică.
6. **Fără cookie-uri sau date noi.** Tema stă în `localStorage` (cheia next-themes), pe browserul vizitatorului. Nu atinge proiectul și nici API-ul.

---

## 6. Componente de bază (`src/components/ui/`)

Fără shadcn sau alte biblioteci: sunt componente mici, scrise peste tokenuri, care înlocuiesc cele 21 de constante duplicate.

| Componentă | Variante | Înlocuiește |
| --- | --- | --- |
| `Button` | `primary` · `secondary` (fundal ușor) · `outline` · `ghost` · `link`; mărimi `sm` / `md`; suport `aria-disabled` | `primaryButton`, `primaryClass`, `secondary`, `accept`, `smallButton` … |
| `Field` (`Input`, `Textarea`, `Select`) | stare de eroare, hint, contor | `inputClass` ×4 |
| `Card` / `Surface` | `plain` · `raised` · `proposed` (punctat amber) · `selected` | cutiile din `CardsPanel`, `StepChecklist`, `ProjectView` |
| `Badge` | `saved` · `proposed` · `question` · `neutral` · `stage` | pastilele „propus”, „de revizuit”, „Acum”, „Prototip” |
| `Chip` | răspuns rapid, filtru (cu `aria-pressed`) | „Nu știu”, „Propune acum”, filtrele hărții |
| `Segmented` / `Tabs` | | tab-urile mobile Conversația / Rezultatul, Povestea / Harta |
| `Callout` | `info` · `warning` · `danger` · `success` | bannerele din `Editor`, eroarea din chat, riscurile |
| `ThemeToggle` | | nou |
| `cx()` | utilitar de 5 rânduri pentru clase | concatenări de string-uri |

Fiecare componentă de stare primește un atribut `data-variant` sau `data-state`. Cele trei teste din A11 vor verifica acel atribut în loc de culoare.

---

## 7. Ecran cu ecran

Textele, ordinea informației și datele rămân aceleași. Se schimbă doar ierarhia vizuală, layoutul și interacțiunile mici.

### 7.1 Start (`/`)

- **Deasupra liniei de pliere:** titlul mare, promisiunea („~30 de minute”), butonul primar „Începe un proiect nou” și, alături, un buton secundar „Am deja un link” care deschide câmpul de reluare. Azi, reluarea e la capătul paginii.
- **Cei 10 pași:** o cronologie pe 3 faze. Pe desktop sunt trei coloane, pe mobil o listă. Numărul pasului stă în cerc, iar minutele sunt metadate discrete, nu trei cutii cu bordură.
- **„Ce obții la final”:** o miniatură stilizată a paginii publice (doar HTML/CSS, fără date reale), ca să se vadă rezultatul. Corespunde punctului P2-3 din specificația anterioară.
- `ThemeToggle` în colțul din dreapta sus.

### 7.2 Cadrul editorului (`/e/[token]`)

- **Bara de sus:** numele proiectului, starea salvării ca pastilă cu iconiță (● Se salvează / ✓ Salvat / ⚠ Nesalvat), apoi „Meniu” ca buton cu iconiță. Meniul conține temă, linkuri și „Generează link nou”. Bara e sticky, cu fundal `surface` semi-transparent și blur.
- **Bannerele** („Ai modificări nepublicate”, conflict, toast) devin `Callout`-uri subțiri, sub bara de sus.
- **Bara laterală:**
  - fiecare fază are o bară mică de progres (3 / 3, 5 / 5, 2 / 2);
  - pasul curent are fundal `primary-soft` și o linie verticală de accent;
  - pașii blocați au lacăt, iar explicația apare în tooltip și ca text pentru cititoarele de ecran;
  - jos: „~12 min rămase” sau, când totul e gata, **„Gata: poți publica →”**. E text derivat din aceeași funcție `minutesLeft`, fără date noi (rezolvă A8).
  - pe `lg` se poate restrânge la doar numere.
- **Desktop larg:** pe ≥ 1280 px, conținutul se întinde până la ~1400 px, cu bara laterală fixă de 288 px, ca să încapă confortabil conversația și rezultatul unul lângă altul. Azi, `max-w-3xl` din „Tot proiectul” lasă mult spațiu gol.
- **Mobil (amânat):** rămâne cum e azi și primește doar tokenurile (deci și dark), plus nota „merge cel mai bine pe calculator”. Bottom sheet-ul pentru pași intră în backlog.

### 7.3 Ecranul pasului (cel mai important)

- **Antetul, mai compact:** „Pasul 2 din 10 · Contextul” ca eyebrow, titlul și subtitlul. Explicația lungă („AI-ul îți pune întrebări…”) devine o legătură „Cum merge pasul?” care se deschide în loc (disclosure). Prima dată e deschisă, apoi se ține minte local. Conversația urcă cu ~80 px (rezolvă A6).
- **Coloana conversației:**
  - mesajele AI sunt pe toată lățimea, fără cutie, cu o mică etichetă „AI” la stânga; mesajele tale sunt baloane `primary-soft` aliniate la dreapta. Așa se vede imediat cine vorbește (A7);
  - **compozitorul e o singură cutie:** textarea cu butonul de trimitere (iconiță ↑, `primary`) în colț, iar dedesubt chip-urile „Nu știu” și „Propune acum”. „Ctrl+Enter trimite” apare doar la focus;
  - în timpul așteptării: trei puncte animate plus `WaitTips` existent;
  - `ProposalDigest` devine un card `proposed` cu antet („1 propunere, încă nesalvată”) și butoanele aliniate.
- **Coloana rezultatului:**
  - pe `lg` e sticky (`top` sub bara de sus), ca rezultatul să rămână vizibil cât timp scrii;
  - „Ce cere pasul” are o bară subțire de progres (1 din 2) în antet, iar rândurile păstrează ✓ ◐ ○;
  - propunerile: contur punctat amber mai fin, fundal `proposed`, butoanele Acceptă (secondary-primar) / Editează (ghost) / Renunță (ghost);
  - salvatele: carduri `plain` cu ✓ și eticheta tipului, iar „Editează” apare la hover/focus pe desktop și e mereu vizibil pe mobil.
- **Bara de acțiune:** rămâne sticky jos, dar devine o bară „plutitoare”, cu `surface` și umbră pe light sau `surface-2` pe dark. Respectă `env(safe-area-inset-bottom)` pe iOS. Stările A–D și textele rămân identice.
- **Scurtături de tastatură pe desktop:** `Ctrl+Enter` trimite (există), `Alt+↓`/`Alt+↑` trece la pasul următor/anterior, `Ctrl+Shift+A` acceptă toate propunerile. Apar într-un mic „?” din bara de sus. Folosesc aceleași handlere ca butoanele, fără logică nouă.
- **Mobil (amânat):** tab-urile Conversația / Rezultatul rămân cum sunt, doar trecute pe tokenuri.

### 7.4 Tot proiectul, Rezumat, Păstrează-ți linkurile

- **„Tot proiectul”:** carduri pe 2 coloane pe desktop, fiecare cu starea în badge și „Editează” ca buton ghost. Rezumatul AI de sus devine un `Callout info`.
- **„Rezumat”:** verificarea dinainte de publicare apare ca listă de verificare cu aceleași simboluri; previzualizarea paginii publice e încadrată ca „browser” (un chenar cu o bară sus), ca să fie clar că e o previzualizare.
- **„Păstrează-ți linkurile”:** două carduri. Linkul public e `success` sau teal, linkul de editare e `proposed` sau amber („păstrează-l secret”). Fiecare are buton de copiere cu feedback „Copiat ✓” 2 s. Logica rămâne aceeași, iar testul verifică `data-variant`.

### 7.5 Pagina publică: „Povestea” (mobile-first)

Aici mobilul contează la fel de mult ca desktopul: majoritatea oamenilor o vor deschide dintr-un link primit pe WhatsApp, Signal sau Discord. Regulile pentru mobil:

- primul ecran (390 × 844) arată numele proiectului, rezumatul în trei rânduri și butonul „Vreau să ajut”, fără scroll;
- după ce hero-ul iese din ecran, apare jos o bară sticky subțire, cu „Vreau să ajut ↓” și link de contact (Discord / email), respectând `safe-area-inset-bottom`;
- tab-urile Povestea / Harta devin un `Segmented` pe toată lățimea, sticky sus;
- textul are minimum 16 px și rânduri de 1,6, fără scroll orizontal la 360 px, iar țintele de atingere au minimum 44 × 44 px;
- butonul „Distribuie” folosește `navigator.share` pe mobil și copiază linkul pe desktop. Folosește URL-ul paginii, deci fără date noi.

Pe desktop:

- **Hero:** eyebrow cu stadiul și zona, titlul mare (36–44 px), rezumatul în trei rânduri (Problema / Ce facem / Ținta) într-o grilă cu etichetele în `fg-muted`, apoi butoanele „Vreau să ajut ↓” (primar) și „Intră pe Discord” (secondary).
- **Ritmul secțiunilor:** fiecare secțiune are eyebrow, `h2` și conținut direct pe fundal, fără cutie. Cutiile rămân doar pentru elementele care sunt „lucruri” (un rol, o ipoteză, un rezultat).
- **„Cum ajungem acolo”:** lanțul ca linie verticală cu noduri (timeline), cu săgeata „ca să…” pe linie.
- **„Ce încă nu știm”:** `Callout warning` cu ⚠.
- **„Următorii pași”:** listă numerotată cu linie de timp; tipul (Test / Cod / Organizare) ca badge cu culori din tokenuri, nu violet sau galben ad-hoc.
- **„Cum poți ajuta”:** carduri de rol; rolul „Acum” are accent `primary`.
- **CTA-ul final** rămâne un bloc plin teal, iar pe dark devine `primary-soft` cu buton `primary`, ca să nu fie un dreptunghi luminos pe fundal negru.
- Subsolul are `ThemeToggle` și „Pagină făcută cu Ghidul de pornire”.

### 7.6 Pagina publică: „Harta schimbării”

- Coloanele (Activities → Outputs → Outcomes → Impact) primesc fundaluri pe tokenuri: `surface-2` pentru primele două, `primary-soft` pentru ultimele două. Pe dark devin tonuri închise distincte.
- Între coloane apar săgeți sau chevron-uri subțiri pe desktop, ca direcția să fie vizibilă, nu doar spusă în text.
- Cardurile: `plain`, `proposed` pentru cele nesigure (⚠ nesigur), `success` pentru „merge deja”, iar cel selectat are inel `focus`.
- Panoul de detalii devine un card care apare lângă hartă pe desktop și un bottom sheet pe mobil. E același conținut.
- **Pe mobil**, coloanele se așază deja una sub alta. Lipsesc săgeata ↓ între ele și titlul coloanei sticky la scroll, ca să nu te pierzi pe harta lungă. Filtrul pe rezultat (chip-urile) se derulează orizontal, nu pe mai multe rânduri.
- „Cine contează”: două coloane de carduri, iar relațiile devin rânduri cu pastila relației între nume.

---

## 8. Accesibilitate și calitate

- Contrast verificat pentru fiecare token (§4.2), iar bordura câmpurilor se repară (A4).
- Inel de focus unic, `outline-2 outline-offset-2 outline-[--focus]`, vizibil pe ambele teme.
- `prefers-reduced-motion`: fără animații, inclusiv `animate-pulse` și fade-ul din `WaitTips`.
- Ținte de atingere de minimum 44×44 px pe pagina publică pe mobil (butoane, chip-uri, cardurile hărții).
- Starea nu se transmite doar prin culoare; simbolurile existente rămân.
- **Teste automate noi:**
  - `@axe-core/playwright` (dependență de dev) rulează pe `/`, editor, `/p/[slug]` și `?v=harta`, în ambele teme;
  - Playwright cu două „proiecte” (`colorScheme: 'light'` și `'dark'`) pentru `full-flow.spec.ts`;
  - capturi de referință (`toHaveScreenshot`) în ambele teme: start și editor la 1440 px, iar pagina publică (Povestea și Harta) la 1440 px și 390 px, ca regresiile vizuale să fie prinse în PR;
  - un test Vitest pentru `ThemeToggle` (randare după mount, `aria-checked` corect).

---

## 9. Planul de implementare

Fiecare fază e un PR separat, care trece testele existente.

| Fază | Ce intră | Fișiere | Rezultat vizibil | Efort |
| --- | --- | --- | --- | --- |
| **F0 Fundație** | tokenuri în `globals.css`, `@custom-variant dark`, `next-themes`, `Providers`, `viewport.themeColor`, `ThemeToggle`, `ui/` (Button, Field, Card, Badge, Chip, Segmented, Callout, cx) | `globals.css`, `layout.tsx`, `src/components/ui/*` | Încă nimic: light arată la fel, dar fundația e pusă | ~0,5–1 zi |
| **F1 Migrare mecanică** | fiecare fișier trece de la `stone-*`/`teal-*`/`white` la tokenuri și componente `ui/`; testele din A11 trec pe `data-variant`; bordura câmpurilor (A4) | cele 29 de fișiere din A2, în ordinea: editor → start → project | **Dark mode funcționează peste tot**, iar light arată aproape la fel | ~1,5–2 zile |
| **F2 Editorul modern (desktop)** | §7.2, §7.3, §7.4: bara de sus, bara laterală cu progres și „Gata: poți publica”, antet compact, chat nou, coloană sticky, bara plutitoare, layout lat, scurtături, nota pentru mobil | `Editor`, `StepSidebar`, `StepScreen`, `ChatPanel`, `CardsPanel`, `StepChecklist`, `ActionBar`, `Overview`, `Summary`, `KeepLinks` | Editorul arată modern pe ambele teme | ~2–3 zile |
| **F3 Start + pagina publică (publică: mobil + desktop)** | §7.1, §7.5, §7.6, inclusiv bara sticky „Vreau să ajut”, Distribuie și harta verticală pe mobil | `StartScreen`, `ProjectView`, `MapView`, `NextSteps`, `HowToHelp`, `WhoMatters`, `PathStory`, `p/[slug]/page.tsx` | Paginile pe care le văd voluntarii | ~2 zile |
| **F4 Finisaje + QA** | mișcare, reduced-motion, ținte de 44 px, stări goale, print, axe, capturi de referință, Playwright pe două teme | `e2e/`, `playwright.config.ts`, `globals.css` | Calitate verificată automat | ~1 zi |

**Total estimat: ~7–9 zile de lucru.** F0 și F1 aduc dark mode-ul; F2 și F3 aduc „mai modern și intuitiv”.

**Backlog (mobil pentru editor, după F4):** bottom sheet pentru pași, `Segmented` sticky pentru Conversația / Rezultatul, bara de acțiune cu safe-area. Se reiau doar dacă vedeți utilizatori care lucrează de pe telefon.

### Ordinea de lucru în F1, ca riscul să rămână mic

1. Componentele `ui/` se folosesc întâi în `ActionBar` și `StartScreen` (mici, cu teste bune).
2. Urmează editorul, fișier cu fișier, cu `npm test` după fiecare.
3. `MapView` și `ProjectView` la final (cele mai multe clase).
4. Verificare finală: `grep -rE "(bg|text|border)-(stone|teal|amber|sky|red|emerald|violet)-[0-9]" src --include=*.tsx` trebuie să nu mai găsească nimic în afară de `ui/`.

---

## 10. Riscuri

| Risc | Cum îl prevenim |
| --- | --- |
| Flash de temă greșită la încărcare | Scriptul next-themes rulează înainte de randare; `suppressHydrationWarning` pe `<html>`. În dev poate apărea un flash scurt (documentat de next-themes) |
| Hydration mismatch la butonul de temă | Randare după mount, cu placeholder de aceeași mărime |
| Amber și sky arată „murdar” pe dark | Pe dark se folosesc fundaluri închise colorate (§4.1), nu nuanțele `-50` |
| Redesignul alunecă spre schimbări de date | Regula din antet; în PR, `git diff --stat` nu are voie să atingă `src/lib/`, `supabase/`, `prompts/` sau `src/app/api/` |
| Testele de clase se rup | Trecute pe `data-variant` în F1 (3 teste) |
| `next dev` foarte lent la prima compilare în e2e | Deja tratat prin `warmRoutes`; testele pe două teme rulează în serie |

---

## 11. Decizii de luat înainte de F0

1. **Tema implicită:** „Ca sistemul” *(recomandat)* sau mereu light, cu dark la cerere?
2. **Identitatea:** păstrăm teal + stone *(recomandat: e deja recognoscibil și trece contrastul pe ambele teme)* sau încercăm o paletă nouă?
3. **Machete înainte de cod:** fac întâi o machetă HTML statică light + dark pentru ecranul pasului și pagina publică, în `docs/ux/mockups/`, ca să alegi direcția *(recomandat)*, sau trec direct la F0?
4. **Ordinea:** F0 → F1 → F2 → F3 *(recomandat: dark mode-ul vine repede)* sau pagina publică înaintea editorului?
5. **Nota pentru mobil în editor:** doar informativă („merge cel mai bine pe calculator”) *(recomandat)* sau și cu un buton „Trimite-mi linkul pe email”, ca să continui pe PC? Butonul de email există deja în „Păstrează-ți linkurile”, deci n-ar cere date noi.
