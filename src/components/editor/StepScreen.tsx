'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AiTurn } from '@/lib/ai/stepTurn';
import { computeCodeAlerts, mergeAlerts } from '@/lib/alerts/codeAlerts';
import { ALERT_MESSAGES, isQuestionAlert } from '@/lib/alerts/messages';
import {
  fitsInList,
  isSingleton,
  normalizeCardIds,
  removeEntity,
  STEP_ENTITIES,
  upsertEntity,
  type Card,
  type EntityKind,
} from '@/lib/project/entities';
import type { Alert, Message, Project, StepId } from '@/lib/project/schema';
import { isStepComplete } from '@/lib/steps/completion';
import { PHASES, STEPS, type StepDef } from '@/lib/steps/definitions';
import { keepFeature, laterFeature, linkFeature } from '@/lib/steps/orphans';
import { firstMissingRequired, NONE_FOUND_NAME, openRecommended, orphanFeatures } from '@/lib/steps/requirements';
import { appendOrganizingItems, buildOrganizingItems } from '@/lib/backlog/organizing';
import { ActionBar } from './ActionBar';
import { AlertList, alertKey } from './AlertList';
import { defaultData } from './CardEditor';
import { CardsPanel, type Editing } from './CardsPanel';
import { AskTracker, ChatPanel, MAX_MESSAGES, PROPOSE_NOW, type ChatHandle } from './ChatPanel';
import { ProjectIntake } from './ProjectIntake';
import { ProposalDigest } from './ProposalDigest';
import { checklistProgress, StepChecklist } from './StepChecklist';

/** useAutosave().setDraft: a draft, or an updater applied to the latest draft. */
export type SetDraft = (update: Project | ((prev: Project) => Project)) => void;

type Props = {
  step: StepDef;
  draft: Project;
  setDraft: SetDraft;
  token: string;
  /** Called after "Treci la pasul următor"; the Editor moves to the next step (or the summary after step 10). */
  onNext: () => void;
  /** useAutosave().flush: the AI routes read the server-saved draft, so pending edits are saved first. */
  flush?: () => Promise<void>;
  /** Owned by the Editor so the automatic first question is asked once per step per session. */
  askTracker?: AskTracker;
  /** Unaccepted AI proposals of this step; the Editor keeps them per step for the session. */
  proposed: Card[];
  setProposed: Dispatch<SetStateAction<Card[]>>;
};

const noFlush = () => Promise.resolve();

const EXPLAINER = 'AI-ul îți pune întrebări până când lista „Ce cere pasul” e bifată. Ce propune apare punctat — se salvează doar ce accepți.';
const EXPLAINER_SHORT = 'AI-ul întreabă până se bifează „Ce cere pasul”. Se salvează doar ce accepți.';
const EXPLAINER_STEP1 = 'Poți scrie liber, lipi o listă din README sau răspunde „nu știu”.';
const LAST_NEXT = 'Rezumat și publicare';

const elements = (n: number) => (n === 1 ? '1 element' : `${n} elemente`);

const withStatus = (p: Project, step: StepId, status: Project['steps'][StepId]['status']): Project => ({
  ...p,
  steps: { ...p.steps, [step]: { ...p.steps[step], status } },
});

/**
 * Accepted cards enter the project; an untouched step becomes in_progress, a done one stays done (ruling 7).
 * New cards for a list that is already full are skipped, so the draft always stays within the schema.
 */
function acceptCards(p: Project, step: StepId, cards: Card[]): Project {
  const next = normalizeCardIds(p, cards).reduce((acc, card) => (fitsInList(acc, card) ? upsertEntity(acc, card) : acc), p);
  return next.steps[step].status === 'untouched' ? withStatus(next, step, 'in_progress') : next;
}

/** Re-renders when the tracker's in-flight calls change; returns whether this step's AI call is running. */
function useBusy(tracker: AskTracker, step: StepId): boolean {
  const [, rerender] = useState(0);
  useEffect(() => tracker.subscribe(() => rerender((n) => n + 1)), [tracker]);
  return tracker.isPending(step);
}

/** A saved line in the chat after an accept (ephemeral), with the next step when the step is complete. */
type SavedLine = { text: string; complete: boolean };

export function StepScreen({ step, draft, setDraft, token, onNext, flush = noFlush, proposed, setProposed, askTracker }: Props) {
  const [ownTracker] = useState(() => new AskTracker());
  const tracker = askTracker ?? ownTracker;
  const busy = useBusy(tracker, step.id);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [suggestNote, setSuggestNote] = useState(false);
  const [savedLine, setSavedLine] = useState<SavedLine | null>(null);
  const [announce, setAnnounce] = useState('');
  const [tab, setTab] = useState<'chat' | 'result'>('chat');
  const [focusTarget, setFocusTarget] = useState<{ to: 'proposals' | 'missing'; n: number } | null>(null);
  const chatRef = useRef<ChatHandle>(null);
  // Step 1 starts with three fields (what the app does, what works, what comes next) instead of a first question.
  const [intakeSkipped, setIntakeSkipped] = useState(false);
  const showIntake =
    step.id === 'project' && draft.steps.project.messages.length === 0 && draft.features.length === 0 && !intakeSkipped;
  const proposalsHeadingRef = useRef<HTMLHeadingElement>(null);
  const firstMissingRef = useRef<HTMLLIElement>(null);
  const stepId = step.id;

  useEffect(() => {
    document.title = `Pasul ${step.number} din ${STEPS.length}: ${step.title}`;
  }, [step.number, step.title]);

  // Focus after a tab switch has rendered the target (mobile shows one column at a time).
  useEffect(() => {
    if (!focusTarget) return;
    const el = focusTarget.to === 'proposals' ? proposalsHeadingRef.current : firstMissingRef.current;
    el?.scrollIntoView?.({ block: 'center' });
    el?.focus();
  }, [focusTarget]);

  const questions = draft.alerts.filter((a) => a.step === step.number && a.status === 'open' && isQuestionAlert(a.code));

  function onTurn(turn: AiTurn) {
    setSavedLine(null);
    if (turn.kind === 'question') return;
    // New cards join the pending ones; a pending card with the same kind and id is replaced.
    setProposed((list) => [
      ...list.filter((c) => !turn.cards.some((n) => n.kind === c.kind && n.data.id === c.data.id)),
      ...turn.cards,
    ]);
    if (turn.kind === 'fallback' && turn.cards.length === 0) openForm();
  }

  function startNew(kind: EntityKind) {
    setEditing({ origin: 'new', card: { kind, data: defaultData(kind, draft, stepId) } });
  }

  /** Form mode without AI: the step's first entity kind. */
  function openForm() {
    const kind = STEP_ENTITIES[stepId][0];
    if (stepId === 'risks') {
      const first = draft.preconditions[0];
      setEditing(first ? { origin: 'accepted', card: { kind: 'precondition', data: { ...first } } } : null);
    } else if (isSingleton(kind)) {
      setEditing({ origin: 'accepted', card: { kind, data: defaultData(kind, draft, stepId) } });
    } else {
      startNew(kind);
    }
  }

  function saveEdit(e: Editing, data: Card['data']) {
    setDraft((p) => acceptCards(p, stepId, [{ kind: e.card.kind, data }]));
    if (e.origin === 'proposed') setProposed((list) => list.filter((_, i) => i !== e.index));
    setEditing(null);
  }

  function accept(index: number) {
    const card = proposed[index];
    setDraft((p) => acceptCards(p, stepId, [card]));
    setProposed((list) => list.filter((_, i) => i !== index));
    if (editing?.origin === 'proposed') setEditing(null);
  }

  /** Accepts every pending proposal; returns whether the step is complete afterwards. */
  function acceptAll(): boolean {
    const cards = proposed;
    setDraft((p) => acceptCards(p, stepId, cards));
    setProposed([]);
    if (editing?.origin === 'proposed') setEditing(null);
    return isStepComplete(acceptCards(draft, stepId, cards), stepId);
  }

  function discard(index: number) {
    setProposed((list) => list.filter((_, i) => i !== index));
    if (editing?.origin === 'proposed') setEditing(null);
  }

  function say(text: string) {
    setAnnounce(text);
  }

  /** The digest's Acceptă tot: the same accept as the cards, then a saved line in the chat. */
  function acceptFromDigest() {
    const n = proposed.length;
    const complete = acceptAll();
    const text = `✓ Salvat: ${elements(n)}.`;
    setSavedLine({ text, complete });
    say(text);
  }

  /** P0-3: a short "da" saves the proposals; if something required is still missing, the AI asks about it. */
  function onAffirm(chat: Message[]) {
    const n = proposed.length;
    const after = acceptCards(draft, stepId, proposed);
    const complete = acceptAll();
    const text = `✓ Am salvat ${elements(n)}. ${complete ? 'Poți trece la pasul următor.' : `Mai lipsește: ${firstMissingRequired(after, stepId)}.`}`;
    setSavedLine({ text, complete });
    say(text);
    if (!complete) chatRef.current?.ask(chat);
  }

  const setAlertStatus = (targets: Alert[], status: Alert['status']) =>
    setDraft((p) => ({
      ...p,
      alerts: p.alerts.map((a) => (targets.some((t) => t.step === a.step && alertKey(t) === alertKey(a)) ? { ...a, status } : a)),
    }));

  /** "Discută cu AI-ul": back to the conversation, with the question, and the input ready for the answer. */
  function discuss(group: Alert[]) {
    const alert = group[0];
    setDraft((p) => ({
      ...p,
      steps: {
        ...p.steps,
        [stepId]: {
          ...p.steps[stepId],
          messages: [...p.steps[stepId].messages, { role: 'assistant' as const, content: alert.message || ALERT_MESSAGES[alert.code].message }].slice(-MAX_MESSAGES),
        },
      },
    }));
    setTab('chat');
    chatRef.current?.focusInput(`Răspunde la întrebarea despre ${ALERT_MESSAGES[alert.code].title}…`);
  }

  async function refreshAlerts() {
    try {
      await flush();
      const res = await fetch(`/api/e/${token}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data?.alerts)) return;
      const llm = data.alerts as Alert[];
      setDraft((p) => ({ ...p, alerts: mergeAlerts(p.alerts, [...llm, ...computeCodeAlerts(p)], { llmStep: step.number }) }));
    } catch {
      // Background check: on failure the step simply shows no new LLM alerts.
    }
  }

  /** On demand: appends the suggested organizing steps that are not in the backlog yet. */
  function addSuggested() {
    const none = buildOrganizingItems(draft).length === 0;
    setSuggestNote(none);
    if (!none) setDraft(appendOrganizingItems);
  }

  /** The existing-initiatives step can be completed by saying that nothing similar was found. */
  function noneFound() {
    setDraft((p) =>
      acceptCards(p, stepId, [
        {
          kind: 'existing',
          data: { id: '', name: NONE_FOUND_NAME, url: null, difference: 'Dev-ul a căutat și n-a găsit inițiative similare.' },
        },
      ]),
    );
  }

  /** A step counts as done only when it is complete (the sidebar ✓ means saved content). */
  function finish() {
    setDraft((p) => (isStepComplete(p, stepId) ? withStatus(p, stepId, 'done') : p));
    void refreshAlerts();
    onNext();
  }

  const pending = proposed.length;
  const complete = isStepComplete(draft, stepId);
  const afterAccept = pending > 0 ? acceptCards(draft, stepId, proposed) : draft;
  const completeAfterAccept = pending > 0 && isStepComplete(afterAccept, stepId);
  const missing = firstMissingRequired(draft, stepId);
  const isLast = step.number === STEPS.length;
  const nextTitle = STEPS[step.number]?.title ?? LAST_NEXT;
  const phase = PHASES.find((p) => p.id === step.phase)!.title;
  const progress = checklistProgress(stepId, draft);

  const showFocus = (to: 'proposals' | 'missing') => {
    setTab('result');
    setFocusTarget((f) => ({ to, n: (f?.n ?? 0) + 1 }));
  };

  const nextLink = (
    <button
      type="button"
      onClick={finish}
      className="font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      Treci la pasul următor: {nextTitle}
    </button>
  );

  const chatFooter =
    pending > 0 ? (
      <ProposalDigest proposed={proposed} project={draft} onAcceptAll={acceptFromDigest} onView={() => showFocus('proposals')} />
    ) : savedLine ? (
      <div className="text-center text-sm text-accent">
        <p>{savedLine.text}</p>
        {savedLine.complete && <p className="mt-1">{nextLink}</p>}
      </div>
    ) : null;

  const tabClass = (selected: boolean) =>
    `py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${selected ? 'bg-primary-soft-2 text-accent' : 'text-fg'}`;

  return (
    // Desktop: the step fills the window. The header (what the step asks) stays put, each column scrolls on its own,
    // and the composer and the action bar are always in view.
    <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <header className="shrink-0">
        <p className="text-sm font-medium text-accent">
          Pasul {step.number} din {STEPS.length} · {phase}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{step.title}</h1>
          <p className="text-fg-muted">{step.summary}</p>
        </div>
        <p className="mt-2 flex gap-2 rounded-lg bg-question px-3 py-2 text-sm text-fg-muted">
          <span aria-hidden className="text-question-fg">
            ⓘ
          </span>
          <span>
            <span className="hidden md:inline">{EXPLAINER}</span>
            <span className="md:hidden">{EXPLAINER_SHORT}</span>
            {step.number === 1 && <span> {EXPLAINER_STEP1}</span>}
          </span>
        </p>
      </header>

      <div role="tablist" aria-label="Ce vezi" className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-line text-sm font-medium md:hidden">
        <button type="button" role="tab" id="tab-chat" aria-controls="panel-chat" aria-selected={tab === 'chat'} onClick={() => setTab('chat')} className={tabClass(tab === 'chat')}>
          Conversația
        </button>
        <button type="button" role="tab" id="tab-result" aria-controls="panel-result" aria-selected={tab === 'result'} onClick={() => setTab('result')} className={tabClass(tab === 'result')}>
          Rezultatul ·{' '}
          {pending > 0 ? (
            <span className={tab === 'result' ? '' : 'text-proposed-fg'}>{pending} ◐</span>
          ) : complete ? (
            '✓'
          ) : (
            `${progress.done}/${progress.total}`
          )}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:mt-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-8">
        <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" className={`min-w-0 lg:min-h-0 ${tab === 'chat' ? '' : 'max-md:hidden'}`}>
          <ChatPanel
            ref={chatRef}
            step={stepId}
            tracker={tracker}
            token={token}
            messages={draft.steps[stepId].messages}
            setDraft={setDraft}
            flush={flush}
            onTurn={onTurn}
            hasPending={pending > 0}
            onAffirm={onAffirm}
            onFormMode={openForm}
            footer={chatFooter}
            intake={
              showIntake ? (
                <ProjectIntake
                  onSubmit={(message) => chatRef.current?.send(message)}
                  onSkip={() => {
                    setIntakeSkipped(true);
                    chatRef.current?.ask([]);
                  }}
                />
              ) : undefined
            }
          />
        </div>
        <div role="tabpanel" id="panel-result" aria-labelledby="tab-result" className={`min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1 ${tab === 'result' ? '' : 'max-md:hidden'}`}>
          <CardsPanel
            step={stepId}
            draft={draft}
            proposed={proposed}
            editing={editing}
            setEditing={setEditing}
            onSaveEdit={saveEdit}
            onAccept={accept}
            onAcceptAll={acceptAll}
            onDiscard={discard}
            onRemove={(card) => setDraft((p) => removeEntity(p, card.kind, card.data.id))}
            onKeep={(id) => setDraft((p) => ({ ...p, stale: p.stale.filter((s) => s !== id) }))}
            onAddManual={startNew}
            proposalsHeadingRef={proposalsHeadingRef}
            top={
              <StepChecklist
                step={stepId}
                draft={draft}
                afterAccept={afterAccept}
                firstMissingRef={firstMissingRef}
                onNoneFound={noneFound}
                onAddSuggested={addSuggested}
                suggestNote={suggestNote}
                onLinkFeature={(f, c) => setDraft((p) => linkFeature(p, f, c))}
                onLaterFeature={(f) => setDraft((p) => laterFeature(p, f))}
                onKeepFeature={(f) => setDraft((p) => keepFeature(p, f))}
                onLaterAll={() => setDraft((p) => orphanFeatures(p).reduce((acc, f) => laterFeature(acc, f.id), p))}
              />
            }
            afterSaved={
              // Questions wait while proposals are pending: one call to action at a time.
              pending === 0 && (
                <AlertList alerts={questions} project={draft} onDiscuss={discuss} onLeave={(g) => setAlertStatus(g, 'dismissed')} />
              )
            }
          />
        </div>
      </div>

      <p data-testid="announcer" role="status" className="sr-only">
        {announce}
      </p>

      <ActionBar
        pending={pending}
        complete={complete}
        completeAfterAccept={completeAfterAccept}
        busy={busy}
        next={nextTitle}
        isLast={isLast}
        missing={missing}
        missingAfterAccept={firstMissingRequired(afterAccept, stepId)}
        openRecommended={openRecommended(draft, stepId)}
        onAcceptAndNext={() => {
          acceptAll();
          finish();
        }}
        onAcceptOnly={() => {
          const n = pending;
          acceptAll();
          say(`✓ Am salvat ${elements(n)}.`);
        }}
        onSkipProposals={() => {
          setProposed([]);
          finish();
        }}
        onAcceptStay={() => {
          const n = pending;
          const messages = draft.steps[stepId].messages;
          if (!acceptAll()) chatRef.current?.ask(messages);
          say(`✓ Am salvat ${elements(n)}.`);
        }}
        onNext={finish}
        onBlocked={() => {
          showFocus('missing');
          say(`Ca să treci mai departe: ${missing}.`);
        }}
        onProposeNow={() => chatRef.current?.send(PROPOSE_NOW)}
      />
    </div>
  );
}
