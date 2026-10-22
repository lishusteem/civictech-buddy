'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { AiTurn } from '@/lib/ai/stepTurn';
import { computeCodeAlerts, mergeAlerts } from '@/lib/alerts/codeAlerts';
import { ALERT_MESSAGES } from '@/lib/alerts/messages';
import {
  savedEntitiesForStep,
  fitsInList,
  isSingleton,
  normalizeCardIds,
  removeEntity,
  STEP_ENTITIES,
  upsertEntity,
  type Card,
  type EntityKind,
} from '@/lib/project/entities';
import type { Alert, Project, StepId } from '@/lib/project/schema';
import { effectiveStatus, isStepComplete, missingForStep } from '@/lib/steps/completion';
import { STEPS, type StepDef } from '@/lib/steps/definitions';
import { AlertList, alertKey } from './AlertList';
import { defaultData } from './CardEditor';
import { CardsPanel, type Editing } from './CardsPanel';
import { appendOrganizingItems, buildOrganizingItems } from '@/lib/backlog/organizing';
import { AskTracker, ChatPanel, MAX_MESSAGES } from './ChatPanel';

/** useAutosave().setDraft: a draft, or an updater applied to the latest draft. */
export type SetDraft = (update: Project | ((prev: Project) => Project)) => void;

type Props = {
  step: StepDef;
  draft: Project;
  setDraft: SetDraft;
  token: string;
  /** Called after "Pasul următor"; the Editor moves to the next step (or the overview after step 10). */
  onNext: () => void;
  /** useAutosave().flush: the AI routes read the server-saved draft, so pending edits are saved first. */
  flush?: () => Promise<void>;
  /** Unaccepted AI proposals of this step; the Editor keeps them per step for the session. */
  /** Owned by the Editor so the automatic first question is asked once per step per session. */
  askTracker?: AskTracker;
  proposed: Card[];
  setProposed: Dispatch<SetStateAction<Card[]>>;
};

const noFlush = () => Promise.resolve();

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

export function StepScreen({ step, draft, setDraft, token, onNext, flush = noFlush, proposed, setProposed, askTracker }: Props) {
  const [ownTracker] = useState(() => new AskTracker());
  const [confirmingNext, setConfirmingNext] = useState(false);
  useEffect(() => {
    if (proposed.length === 0) setConfirmingNext(false);
  }, [proposed.length]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [suggestNote, setSuggestNote] = useState(false);
  const stepId = step.id;

  const alerts = draft.alerts.filter((a) => a.step === step.number && a.status === 'open');

  function onTurn(turn: AiTurn) {
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

  function acceptAll() {
    const cards = proposed;
    setDraft((p) => acceptCards(p, stepId, cards));
    setProposed([]);
    if (editing?.origin === 'proposed') setEditing(null);
  }

  function discard(index: number) {
    setProposed((list) => list.filter((_, i) => i !== index));
    if (editing?.origin === 'proposed') setEditing(null);
  }

  const setAlertStatus = (target: Alert, status: Alert['status']) =>
    setDraft((p) => ({
      ...p,
      alerts: p.alerts.map((a) => (a.step === target.step && alertKey(a) === alertKey(target) ? { ...a, status } : a)),
    }));

  /** "Lucrez la asta acum": back to the conversation, with the alert's question. */
  function workOn(alert: Alert) {
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
          data: { id: '', name: 'Nimic similar găsit', url: null, difference: 'Dev-ul a căutat și n-a găsit inițiative similare.' },
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

  function next() {
    if (proposed.length > 0) setConfirmingNext(true);
    else finish();
  }

  function acceptAllAndContinue() {
    acceptAll();
    finish();
  }

  const savedCount = savedEntitiesForStep(draft, stepId).length;
  const done = effectiveStatus(draft, stepId) === 'done';
  const complete = isStepComplete(draft, stepId);
  const completeAfterAccept = proposed.length > 0 && isStepComplete(acceptCards(draft, stepId, proposed), stepId);
  const canFinish = complete || completeAfterAccept;
  const hint = canFinish ? '' : missingForStep(draft, stepId);
  const nextTitle = STEPS[step.number]?.title ?? 'Rezumat';
  const primaryBtn =
    'rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';

  return (
    <div>
      <p className="text-sm font-medium text-teal-900">
        Pasul {step.number} din {STEPS.length}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{step.title}</h1>
      <p className="mt-1 text-stone-700">{step.summary}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <ChatPanel
          step={stepId}
          tracker={askTracker ?? ownTracker}
          token={token}
          messages={draft.steps[stepId].messages}
          setDraft={setDraft}
          flush={flush}
          onTurn={onTurn}
          hasPending={proposed.length > 0}
          onFormMode={openForm}
        />
        <div className="min-w-0 space-y-4">
          <AlertList alerts={alerts} onWork={workOn} onDismiss={(a) => setAlertStatus(a, 'dismissed')} />
          {stepId === 'existing' && draft.existing.length === 0 && (
            <div>
              <button
                type="button"
                onClick={noneFound}
                className="rounded-lg border border-teal-800 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                Nu am găsit nimic similar
              </button>
            </div>
          )}
          {stepId === 'backlog' && (
            <div>
              <button
                type="button"
                onClick={addSuggested}
                className="rounded-lg border border-teal-800 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                Adaugă pașii sugerați
              </button>
              {suggestNote && (
                <p role="status" className="mt-2 text-sm text-stone-700">
                  Nu sunt pași noi de adăugat.
                </p>
              )}
            </div>
          )}
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
          />
        </div>
      </div>

      {proposed.length > 0 && (
        <section
          aria-label="Propuneri neacceptate"
          className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3"
        >
          <p className="text-sm font-medium text-amber-950">
            Ai {proposed.length} {proposed.length === 1 ? 'propunere neacceptată' : 'propuneri neacceptate'}. Nu se salvează până nu le accepți.
          </p>
          <button type="button" onClick={acceptAll} className={primaryBtn}>
            Acceptă tot
          </button>
        </section>
      )}

      <p
        className={`${proposed.length > 0 ? 'mt-3' : 'mt-8'} text-sm ${
          savedCount > 0 ? 'font-medium text-teal-900' : 'text-amber-900'
        }`}
      >
        {done ? 'Pas încheiat · ' : ''}
        {savedCount > 0
          ? `✓ Salvat pentru acest pas: ${savedCount} elemente.`
          : 'Încă nimic salvat la acest pas. Acceptă propunerile AI-ului sau adaugă manual.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-stone-300 pt-4">
        {confirmingNext && proposed.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => {
                setConfirmingNext(false);
                setProposed([]);
                finish();
              }}
              disabled={!complete}
              title={complete ? undefined : missingForStep(draft, stepId)}
              aria-describedby={complete ? undefined : 'skip-hint'}
              className="rounded-lg border border-teal-800 px-4 py-2 text-sm font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-50"
            >
              Continuă fără ele
            </button>
            {!complete && (
              <span id="skip-hint" className="sr-only">
                {missingForStep(draft, stepId)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setConfirmingNext(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              Înapoi
            </button>
            <button type="button" onClick={acceptAllAndContinue} disabled={!completeAfterAccept} className={`${primaryBtn} disabled:opacity-50`}>
              Acceptă tot și continuă
            </button>
          </>
        ) : (
          <>
            {hint && (
              <p id="finish-hint" className="text-sm text-amber-900">
                {hint}
              </p>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!canFinish}
              aria-describedby={hint ? 'finish-hint' : undefined}
              className={`${primaryBtn} px-5 disabled:opacity-50`}
            >
              Am terminat pasul → {nextTitle}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
