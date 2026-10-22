'use client';

import { useState, type ReactNode, type Ref } from 'react';
import { entitiesForStep, isSingleton, savedEntitiesForStep, remainingCapacity, STEP_ENTITIES, type Card, type EntityKind } from '@/lib/project/entities';
import type { Project, StepId } from '@/lib/project/schema';
import { CardEditor, FIELDS, KIND_LABEL, RISKS_FIELDS, relationLabel, type Field } from './CardEditor';

export type Editing = {
  origin: 'new' | 'proposed' | 'accepted';
  card: Card;
  /** Index in the proposed list, for origin 'proposed'. */
  index?: number;
};

type Props = {
  step: StepId;
  draft: Project;
  proposed: Card[];
  editing: Editing | null;
  setEditing: (e: Editing | null) => void;
  onSaveEdit: (editing: Editing, data: Card['data']) => void;
  onAccept: (index: number) => void;
  onAcceptAll: () => void;
  onDiscard: (index: number) => void;
  onRemove: (card: Card) => void;
  onKeep: (id: string) => void;
  onAddManual: (kind: EntityKind) => void;
  /** The "Ce cere pasul" checklist, first in the column. */
  top?: ReactNode;
  /** The open questions, after the saved cards. */
  afterSaved?: ReactNode;
  /** The proposals heading, focused by "Vezi și editează →". */
  proposalsHeadingRef?: Ref<HTMLHeadingElement>;
};

const TITLE_KEYS = ['name', 'text', 'statement'];

function fieldText(f: Field, value: unknown, project: Project): string {
  switch (f.type) {
    case 'checkbox':
      return value === true ? f.label : '';
    case 'enum':
      return value == null ? '' : `${f.label}: ${f.options.find(([v]) => v === value)?.[1] ?? String(value)}`;
    case 'ref': {
      if (typeof value !== 'string' || value === '') return '';
      const all = [...project.actors, ...project.preconditions, ...project.targetChanges, ...project.team, ...project.features];
      const e = all.find((x) => x.id === value) as Record<string, unknown> | undefined;
      return `${f.label}: ${String(e?.name ?? e?.text ?? value)}`;
    }
    case 'lines':
      return Array.isArray(value) && value.length > 0 ? `${f.label}: ${value.join(', ')}` : '';
    case 'refs':
      return '';
    case 'number':
      return typeof value === 'number' ? `${f.label}: ${value}` : '';
    default:
      return typeof value === 'string' && value.trim() !== '' ? `${f.label}: ${value}` : '';
  }
}

/** A title and short detail lines for a card, from the same field list the form uses. */
function cardView(card: Card, project: Project): { title: string; details: string[] } {
  const d = card.data as Record<string, unknown>;
  const fields = FIELDS[card.kind];
  if (card.kind === 'relation') {
    return { title: relationLabel(project, d), details: d.note ? [String(d.note)] : [] };
  }
  const titleField = fields.find((f) => TITLE_KEYS.includes(f.key));
  const title = titleField ? String(d[titleField.key] ?? '') : '';
  const details = fields
    .filter((f) => f !== titleField)
    .map((f) => fieldText(f, d[f.key], project))
    .filter((t) => t !== '');
  return { title, details };
}

/** The card's title as the cards show it (for the proposal digest in the chat). */
export const cardTitle = (card: Card, project: Project) => cardView(card, project).title;

const small =
  'rounded-lg px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';
// Outlined: the step's single filled primary button is in the action bar.
const accept = `${small} border border-teal-800 text-teal-900 hover:bg-teal-50`;
const secondary = `${small} border border-stone-400 text-stone-800 hover:bg-stone-100`;

function CardBody({ card, project, saved = false }: { card: Card; project: Project; saved?: boolean }) {
  const { title, details } = cardView(card, project);
  return (
    <>
      {saved ? (
        <p className="text-xs font-medium uppercase tracking-wide text-teal-800">✓ {KIND_LABEL[card.kind]}</p>
      ) : (
        <p className="text-xs font-medium uppercase tracking-wide text-stone-600">{KIND_LABEL[card.kind]}</p>
      )}
      <p className="mt-1 font-medium text-stone-900">{title || <span className="italic text-stone-500">Necompletat</span>}</p>
      {details.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-sm text-stone-700">
          {details.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </>
  );
}

export function CardsPanel(props: Props) {
  const { step, draft, proposed, editing, setEditing, onSaveEdit } = props;
  const listKinds = STEP_ENTITIES[step].filter((k) => !isSingleton(k));
  const [addKind, setAddKind] = useState<EntityKind | undefined>(listKinds[0]);
  const accepted = entitiesForStep(draft, step);
  // An empty singleton (project info, problem) is listed so it can be edited, but is not counted as saved.
  const savedCount = savedEntitiesForStep(draft, step).length;
  const risks = step === 'risks';
  const stale = new Set(draft.stale);
  const full = addKind !== undefined && !isSingleton(addKind) && remainingCapacity(draft, addKind) === 0;

  return (
    <section aria-label="Rezultatul pasului" className="min-w-0 space-y-5">
      {props.top}

      {editing && (
        <CardEditor
          key={`${editing.origin}-${editing.card.kind}-${editing.card.data.id}-${editing.index ?? ''}`}
          kind={editing.card.kind}
          data={editing.card.data}
          project={draft}
          only={risks && editing.card.kind === 'precondition' && editing.origin !== 'proposed' ? RISKS_FIELDS : undefined}
          title={editing.origin === 'new' ? `${KIND_LABEL[editing.card.kind]} nou` : undefined}
          onSave={(data) => onSaveEdit(editing, data)}
          onCancel={() => setEditing(null)}
        />
      )}

      {proposed.length > 0 && (
        <section aria-label="Propuneri" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 ref={props.proposalsHeadingRef} tabIndex={-1} className="text-sm font-medium text-stone-800 focus-visible:outline-2 focus-visible:outline-teal-800">
              Propuse de AI · nesalvate ({proposed.length})
            </h2>
            <button type="button" onClick={props.onAcceptAll} className={accept}>
              Acceptă tot
            </button>
          </div>
          <ul className="space-y-3">
            {proposed.map((card, i) => (
              <li key={`${card.kind}-${card.data.id}-${i}`} className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-3">
                <span className="float-right rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">propus</span>
                <CardBody card={card} project={draft} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => props.onAccept(i)} className={accept}>
                    Acceptă
                  </button>
                  <button type="button" onClick={() => setEditing({ origin: 'proposed', card, index: i })} className={secondary}>
                    Editează
                  </button>
                  <button type="button" onClick={() => props.onDiscard(i)} className={secondary}>
                    Renunță
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Salvate" className="space-y-3">
        <h2 className="text-sm font-medium text-stone-800">
          Salvate ({savedCount})
        </h2>
        {savedCount === 0 && <p className="text-sm text-stone-600">Nimic salvat încă. Răspunde în conversație sau adaugă manual.</p>}
        {accepted.length > 0 && (
          <ul className="space-y-3">
            {accepted.map((card) => {
              const isStale = stale.has(card.data.id);
              return (
                <li key={`${card.kind}-${card.data.id}`} className="rounded-xl border border-stone-300 bg-white p-3">
                  {isStale && (
                    <span className="float-right rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">de revizuit</span>
                  )}
                  <CardBody card={card} project={draft} saved />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isStale && (
                      <button type="button" onClick={() => props.onKeep(card.data.id)} className={secondary}>
                        Păstrează
                      </button>
                    )}
                    <button type="button" onClick={() => setEditing({ origin: 'accepted', card })} className={secondary}>
                      Editează
                    </button>
                    {!risks && !isSingleton(card.kind) && (
                      <button type="button" onClick={() => props.onRemove(card)} className={secondary}>
                        Șterge
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {props.afterSaved}

      {!risks && addKind && (
        <div className="flex flex-wrap items-center gap-2">
          {listKinds.length > 1 && (
            <select
              aria-label="Ce adaugi"
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as EntityKind)}
              className="rounded-lg border border-stone-400 bg-white px-2 py-1 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-teal-800"
            >
              {listKinds.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          )}
          {full ? (
            <p className="text-sm text-stone-700">Ai atins numărul maxim pentru această listă.</p>
          ) : (
            <button type="button" onClick={() => props.onAddManual(addKind)} className={secondary}>
              Adaugă manual
            </button>
          )}
        </div>
      )}
    </section>
  );
}
