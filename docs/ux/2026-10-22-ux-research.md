# UX research: Ghidul de pornire (Oct 22, 2026)

**What this covers:** findings from design systems, usability research and civic-tech practice, each tied to one of the 8 problems the product owner reported after real use. The implementable answer is in [2026-10-22-ux-redesign-spec.md](2026-10-22-ux-redesign-spec.md).

**How it was done:** I read the PRD (sections "UX și UI", 3, 5, 7, 8), the current UI code (`StartScreen`, `editor/*`, `ProjectView`, `/p/[slug]`, `steps/*`, `alerts/messages.ts`), the step prompts and the AI evaluation report. Then I looked for primary or authoritative sources: NN/g, GOV.UK Design System, W3C WAI, Google PAIR, Microsoft HAX, AWS Cloudscape, IBM Carbon, opensource.guide, and civic-tech organisations.

**Source quality:** design-system guidance is practice consensus, not controlled studies. Where a claim rests only on a secondary summary, it says so.

---

## Diagnosis from the code (before research)

| # | Owner's feedback | Root cause in the current UI |
| --- | --- | --- |
| 2 | "Rezultatele pașilor nu par că se salvează" | Nothing is saved until the user presses **Acceptă** on a card, but the proposals sit in a separate column, below the alerts and the step's extra buttons. In chat the user can type "da", which goes to the AI as a normal answer. Nothing in the chat itself can save. The only hint is a single line: *„Propunerea e în «Rezultatul pasului» (în dreapta) → verifică și apasă Acceptă.”* On mobile the column stacks under the chat, so the proposals are off-screen. |
| 3 | Wants "Acceptă și treci la pasul următor" | The bottom button reads *„Am terminat pasul → X”*. When proposals are pending it opens a second row with three buttons (*Continuă fără ele / Înapoi / Acceptă tot și continuă*). The path exists but takes two clicks, and the screen offers three "Acceptă tot" buttons in total (amber bar, cards header, confirm row). |
| 4 | Wants an explainer line | The step header shows only `step.summary` ("Ce faci, ce funcții ai, cine e în echipă"). Nothing explains the loop of questions, then proposals, then accepting. |
| 5 | Six identical "Feature orfan" boxes | `AlertList` renders one full amber card per alert, each with two buttons. `orphan_feature` is emitted once per feature, so N features produce N cards. Amber is also the colour of the "unaccepted proposals" bar, so everything looks like a warning. The two buttons don't say what they do: *Lucrez la asta acum* only appends the question to the chat, and *Merg mai departe* dismisses the alert, which then shows on the public page. |
| 6 | Actors shown on Preconditions | Already fixed (`STEP_CONTENT`). The underlying risk remains: the right column has no stated "what this step needs". |
| 7 | Public page reads like notes | `ProjectView` is a 1:1 dump of the data model in PRD order. There is no pitch and no call to action. The contact appears only if filled in, as plain text. Stage appears twice (card and section), and so does role status ("Căutăm: Jurist · Mediu · Caut"). Relations are built from verb templates such as `deține datele lui`, which break Romanian agreement and case. Team members can be named "tu", because `prompts/steps/project.md` tells the AI: *name "tu" dacă nu și-a spus numele*. The backlog shows every item. |
| 8 | AI seems shallow | The proposal message is a generic default (*„Uite ce am înțeles. Verifică propunerile…”*). The user never sees what the AI understood, or what is still missing and why the AI asks the next question. The completion rules (`completion.ts`) exist in code but are shown only as a single hint next to a disabled button. |

---

## Finding 1: In a chat + cards hybrid, saving must happen where the user is looking, including in chat (problems 2, 3, 8)

- **People treat chat as the place to act.** NN/g observed that users refine AI output by pointing at earlier parts of the conversation and typing new prompts ("apple picking"). They then often finish the work outside the chat because it is hard to edit there. NN/g recommends compartmentalised responses, direct in-place editing and point-to-select ([NN/g, Accordion Editing and Apple Picking](https://www.nngroup.com/articles/accordion-editing-apple-picking/)). Typing "da" to save is exactly this: the user answers in the channel they are in.
- **Cloudscape's in-flow pattern puts the review and the controls inside the response.** Its "In-flow user input" guidance shows AI output and editable values inline in the conversation. A completed step collapses into a read-only summary with a success indicator. Cards get specific titles, and the request explains why the input is needed and what it enables ([Cloudscape, In-flow user input](https://cloudscape.design/gen-ai/patterns/in-flow-user-input/)).
- **Microsoft's Guidelines for Human-AI Interaction** include G1 *Make clear what the system can do*, G8 *Support efficient dismissal*, G9 *Support efficient correction* and G16 *Convey the consequences of user actions* ([Amershi et al., CHI 2019](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/); [HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)). The current UI never tells the user that typing "da" does nothing to the proposals (G16), and correcting a proposal takes a trip to another column (G9).
- **Google PAIR:** users must be able to edit, override or turn off AI output, and must always have a manual way to finish the task. Requests to the user should explain the benefit and when the effect happens ([PAIR, Feedback + Control](https://pair.withgoogle.com/chapter/feedback-controls/)).

**Implication:** keep the cards panel as the source of truth, but mirror each proposal in the chat as a compact block with its own **Acceptă tot** button. When the user types a clear yes ("da", "ok", "corect", "acceptă") while proposals are pending, treat it as **accept** instead of sending it to the model. Confirm the save in the chat with a visible system line. *(Spec: P0-2, P0-3.)*

## Finding 2: Use one primary action, named after what it does, and let it carry the user forward (problem 3)

- **GOV.UK:** button text describes the action, for example *Save and continue*. Avoid several default buttons on one page, because they make the next step unclear ([GOV.UK, Button](https://design-system.service.gov.uk/components/button/)). The current step screen can show three "Acceptă tot" buttons at once.
- **NN/g on wizards:** generic labels such as *Next* have weak information scent. Name steps descriptively, show all steps with the current one highlighted, and support save-and-resume ([NN/g, Wizards](https://www.nngroup.com/articles/wizards/)). That supports the owner's wording, *„Acceptă și treci la pasul următor”*, with the next step's name underneath.
- **Microsoft HAX G16, convey consequences:** the button must say how many items it saves.
- **A caution:** one-click accept-all invites rubber-stamping. Research summarised by Microsoft on overreliance, and Bansal et al. (CHI 2021, *Does the Whole Exceed its Parts?*, [doi:10.1145/3411764.3445717](https://doi.org/10.1145/3411764.3445717)), shows that people accept AI output more readily when acceptance is cheap. Explanations can make this worse rather than better. I saw these through secondary summaries, e.g. [ThinkTech risk library](https://thinktech.ngo/risk-library/overreliance). The mitigation here is cheap because nothing is irreversible:
  1. the proposals stay visible next to the button;
  2. the button states the count;
  3. a toast on the next step offers *Înapoi la pas*;
  4. everything is reviewed again before publishing.

  The PRD already puts friction only on irreversible actions ([AI UX Playground](https://aiuxplayground.com/guides/how-to-design-human-in-the-loop)).

*(Spec: P0-1.)*

## Finding 3: Say up front how the step works, and show a live "what's still missing" list instead of a disabled button (problems 4, 6, 8)

- **GOV.UK task list:** status is shown per task, with a small set of labels (*Completed, Incomplete, In progress, Not yet started, Cannot start yet, There is a problem*). Completed rows are quiet and unfinished rows stand out. A blocked task says *Cannot start yet* and isn't a link ([GOV.UK, Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)). GOV.UK's 2023 iteration found that users don't start a task unless they think they can finish it ([GOV.UK Design Notes, 2023](https://designnotes.blog.gov.uk/2023/12/15/working-as-a-community-to-iterate-the-task-list-pattern/)). A visible "what this step needs" list lowers the cost of starting.
- **GOV.UK error summary:** put problems at the top, link each one to where it is fixed, and use the same wording as the inline message ([GOV.UK, Error summary](https://design-system.service.gov.uk/components/error-summary/)). The same idea fits "ce mai lipsește": each missing item points to where it gets filled (ask the AI, or add by hand).
- **NN/g on wizards:** put help *beside* the flow, not over it ([NN/g, Wizards](https://www.nngroup.com/articles/wizards/)).
- **W3C WAI, multi-page forms:** put "Step n of N: title" in the page title and the `h1`. Use an ordered list for steps, with hidden text marking current and completed ([W3C WAI, Multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/)).
- **NN/g, articulation barrier:** prompt-only interfaces disadvantage people who don't describe their goals well in writing ([NN/g, AI: First New UI Paradigm in 60 Years](https://www.nngroup.com/articles/ai-paradigm/)). A visible checklist tells the user *what kind* of answer moves the step forward, which also makes the AI look purposeful (problem 8).
- **Cloudscape, follow-up questions:** ask at most about 5 follow-ups per workflow. Don't ask for what the user already gave, and always offer a way to proceed, skip or exit ([Cloudscape, Follow-up questions](https://cloudscape.design/gen-ai/patterns/follow-up-questions/)). The checklist is the visible counterpart of the AI's "what I still need".

**Implication:** add one fixed explainer line under the step title, plus a per-step checklist at the top of the results column. The checklist marks each item *Salvat / Propus, neacceptat / Lipsește*, and separates **obligatoriu** (gates the step) from **recomandat** (doesn't gate). Feed the same missing items to the AI so its next question visibly targets one of them. *(Spec: P0-4, P0-5, P1-1.)*

## Finding 4: Alerts should be few, grouped, contextual and calm, with actions that say what happens (problem 5)

- **NN/g** separates *indicators* (passive, next to the element they describe, used sparingly), *validations* (about the user's own input, next to the field, explaining how to fix) and *notifications* (system events). Contextual information belongs as an indicator near the item; a notification there "would likely be ignored or annoy users" (paraphrase; [NN/g, Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/)). A "Feature orfan" note is contextual to one feature card, so it should be an indicator on that card plus one grouped summary, not six free-standing boxes.
- **GOV.UK notification banner:** use it sparingly, because users miss it. Show only one per page and combine related messages into one ([GOV.UK, Notification banner](https://design-system.service.gov.uk/components/notification-banner/)). The same rule against stacking repeated boxes applies.
- **Alert fatigue (practice literature):** duplicates are the main multiplier. One underlying issue reported several times looks like a flood. Remedies are de-duplication, conservative triggers and enough context to act ([Courier](https://www.courier.com/blog/what-is-alert-fatigue), [Rootly](https://rootly.com/alert-management/alert-fatigue.md); a 2026 systematic review warns that the evidence base is thin: [Ray Wilson et al.](https://www.metrohealth.org/globalassets/metrohealth-documents/population-health-research-institute/ray-wilson-et-al-2026-alert-fatigue-systematic-review.pdf)).
- **Google PAIR:** make requests strategic and easy to dismiss, and explain the benefit ([PAIR](https://pair.withgoogle.com/chapter/feedback-controls/)).
- **IBM Carbon for AI:** explanations appear on demand behind a small label or popover, so they don't distract from the workflow ([Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/)).

**Implications:**

1. Most code-detected alerts (no evidence, nobody excluded, only users, no test, no non-code step, orphan features) are really *recommended checklist items*. Turn them into unchecked "recomandat" rows instead of boxes.
2. Group the rest by alert code: one block that names every affected item, with an action per item (*Leagă de o precondiție / Mută la «mai târziu» / Păstrează*) and one bulk action.
3. Use a neutral info style. Keep amber only for "not saved yet".
4. Rename the buttons to what they do: *Discută cu AI-ul* and *Lasă deschis (apare la «Întrebări deschise»)*.
5. Add a one-line *De ce contează*.

*(Spec: P0-6, P1-4.)*

## Finding 5: Show AI proposals as provisional, editable, and reflected back in the user's terms (problems 2, 8)

- **PRD + practice blogs:** proposed cards look provisional (dashed border, *propus*) until confirmed ([AI UX Playground](https://aiuxplayground.com/pattern/human-in-the-loop)). Already implemented, and worth keeping.
- **Carbon for AI:** AI content carries a label. Once the user edits it, it becomes normal content, and a "revert to AI" option remains ([Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/)). This supports showing "editat de tine" vs "propus de AI" on saved cards (P2).
- **NN/g, prompt controls:** visible follow-up controls next to the input (regenerate, edit, suggested follow-ups) help discoverability and reduce typing. Labels must be specific, not iconic or branded ([NN/g, Prompt Controls in GenAI Chatbots](https://www.nngroup.com/articles/prompt-controls-genai/)).
- **Cloudscape, support prompts:** non-editable suggestions that send immediately suit follow-ups mid-conversation; editable ones prefill the input ([Cloudscape, Support prompts](https://cloudscape.design/gen-ai/patterns/support-prompts/)). This fits *Nu știu*, *Dă-mi un exemplu*, *Propune acum*.
- **Cloudscape, loading states:** name what is being produced (*"Generating [artifact]"*). Don't flash a state shorter than 1 s ([Cloudscape, Loading states](https://cloudscape.design/gen-ai/patterns/generative-ai-loading-states/)).
- **Perceived intelligence (problem 8):** a reply that restates the user's own facts and names the gap reads as understanding. A generic "Uite ce am înțeles" reads as a form filler. This is a UX inference consistent with HAX G11 (*make clear why the system did what it did*), not a cited study.

**Implication:**

- The proposal message becomes a structured *reflect-back*: "Am reținut: …" (2–3 bullets with the user's words), then "Încă nu știu: …" (from the checklist).
- Every AI question carries a small *de ce întreb* tag that names the checklist item it targets.
- These are prompt and data changes. The UI renders them. *(Spec: P1-1, P1-2.)*

## Finding 6: Mobile: the result must not sit below the fold (problems 2, 3)

- On a phone the current grid stacks chat above cards, so proposals appear far below the newest message and the bottom buttons sit below both.
- **NN/g, progressive disclosure:** use at most two levels, and make the path to the second level obvious ([NN/g, Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)).
- **W3C WAI** recommends compact progress ("Pasul 4 din 10") in the title ([W3C WAI](https://www.w3.org/WAI/tutorials/forms/multi-page/)).

**Implication:** on mobile, use two tabs (*Conversația / Rezultatul · 3 propuse*) and a sticky bottom action bar that always shows the primary button. Proposals are also mirrored in the chat (Finding 1), so the user rarely needs to switch tabs. *(Spec: P0-7.)*

## Finding 7: Theory of change and actor maps for non-experts: short chains in plain language, actors grouped by what they can do (problem 7)

- **Center for Theory of Change:** a theory of change starts from the long-term goal and maps backwards the preconditions that must be in place, filling in the "missing middle" ([theoryofchange.org](https://www.theoryofchange.org/what-is-theory-of-change/)).
- **Innovations for Poverty Action:** a diagram plus a short narrative works best. Diagrams read left to right or top to bottom, with an assumption attached to each link ([IPA, Theory of change](https://data.poverty-action.org/research-design/theory-of-change.html)).
- **Plain "so that" chains** make a pathway readable to laypeople ([Nonprofit Marketing Guide](https://www.nonprofitmarketingguide.com/the-theory-of-change-behind-nonprofit-marketing/)).
- **INTRAC:** assumptions are the conditions needed for one level to lead to the next ([INTRAC, Theory of Change](https://intrac.org/wpcms/wp-content/uploads/2024/11/Theory-of-Change.pdf)). This matches the app's "ipoteze riscante" attached to preconditions.
- **Stakeholder maps:** the classic power/interest grid sorts actors into four quadrants (*manage closely / keep satisfied / keep informed / monitor*) and colour-codes stance (supporter / neutral / blocker) ([Mind Tools, Stakeholder analysis](https://www.mindtools.com/aol0rms/stakeholder-analysis)). The data model already has `power` and `stance`, so this is pure UI.
- **Relations as sentences fail in Romanian:** template verbs can't agree in number and case with free-text actor names ("instituțiile publice *deține* datele *lui* cetățenii"). A layout of *actor → label → actor*, with a noun or participle label in a chip, avoids grammar entirely. This is an inference from the bug, not a cited source.

**Implication:**

- The public page shows the theory of change as a vertical chain of at most 3 levels, read top to bottom: *Ce facem acum → Ce trebuie să se întâmple → Schimbarea pe care o urmărim → Direcția*. Each precondition shows its actor and, where risky, a *nesigur · îl testăm* tag.
- The actor map is grouped into plain-language buckets: *Pe cine afectează / Cine decide / Aliați posibili / Cine poate bloca*. Relations are rendered as chips.

*(Spec: P0-8, P1-5.)*

## Finding 8: A page that recruits volunteers leads with the pitch and the ask (problem 7)

- **NN/g, inverted pyramid:** lead with the main point, then rank the rest by broad relevance, so the page still works if read for only a few lines ([NN/g, Inverted pyramid](https://www.nngroup.com/articles/inverted-pyramid/)). The PRD target is "citită în 2 minute".
- **opensource.guide:** make it easy to use and join the project. Say exactly how to contribute, label beginner-friendly tasks, and be explicit about the kinds of help wanted, including non-code help ([Open Source Guides, Building welcoming communities](https://opensource.guide/building-community/)).
- **Civic-tech practice:**
  - **Hack for LA** project pages are driven by a data file with `problem`, `solution`, `impact`, `status`, `partner`, `technologies` and a `looking` list. Each `looking` entry is a *category + skill* pair (e.g. Ops / Project Manager) ([hackforla/website `_projects/311-data.md`](https://raw.githubusercontent.com/hackforla/website/gh-pages/_projects/311-data.md)).
  - **Code for America brigades** report that projects tag "light lifts" as *help wanted* and keep a README with first steps for newcomers ([Code for America Discourse, contributor management](https://discourse.codeforamerica.org/t/contributor-management-practices-around-the-brigade-network/892)).
  - **The Civic Tech Field Guide** describes every project in one line: *"[Name] is a [type] from [org] that [does X]"* ([civictech.guide](https://civictech.guide/)).
  - **Code for Romania** project tiles show a title, a short description and one call to action ([code4.ro](https://code4.ro/ro)).

**Implication:** reorder the public page around the group's question, *"Ce e asta și cum pot ajuta?"*:

1. Hero: name, one-line pitch, stage chip, primary CTA *Vreau să ajut*.
2. *Pe scurt*: problem, change, stage.
3. *Cum poți ajuta*: role cards with "de ce" and "primul lucru de făcut".
4. *Următorii pași* (at most 5).
5. Then the plan (chain, risks, actors).
6. Then the details (team, existing initiatives, full backlog collapsed, open questions).

The contact becomes a button. A missing contact is flagged before publishing. *(Spec: P0-8, P0-9, P1-6.)*

---

## Problem → finding → spec item

| Owner feedback | Findings | Spec items |
| --- | --- | --- |
| 1. AI asks first (keep) | 3, 5 | First message in the reflect-back format; the explainer line sets the expectation |
| 2. Results don't seem saved | 1, 5, 6 | P0-2 inline accept in chat, P0-3 "da" means accept, P0-4 save states, P0-7 mobile |
| 3. "Acceptă și treci la pasul următor" | 2 | P0-1 action bar state table |
| 4. Explainer line at the top | 3 | P0-5 |
| 5. Noisy alerts | 4 | P0-6 grouping and checklist merge, P1-4 indicators on cards |
| 6. Wrong content on the right | 3 | P0-4 checklist states the step's content |
| 7. Public page not for others | 7, 8 | P0-8 page structure and fixes, P0-9 pre-publish check, P1-5 chain and map, P1-6 share text |
| 8. AI feels shallow | 1, 3, 5 | P1-1 checklist-aware prompts, P1-2 reflect-back, P1-3 "de ce întreb" |
