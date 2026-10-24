'use client';

import { useId, type Ref } from 'react';
import type { Project, StepId } from '@/lib/project/schema';
import { requirementsFor, rowState, type Requirement, type RowState } from '@/lib/steps/requirements';

type Props = {
  step: StepId;
  draft: Project;
  /** The draft as it would be with every pending proposal accepted (for the ◐ rows). */
  afterAccept: Project;
  /** Attached to the first missing required row; the action bar focuses it. */
  firstMissingRef?: Ref<HTMLLIElement>;
  onNoneFound: () => void;
};

const ICON: Record<RowState, { mark: string; className: string; label: string }> = {
  saved: { mark: '✓', className: 'text-accent', label: 'salvat' },
  proposed: { mark: '◐', className: 'text-proposed-fg', label: 'propus' },
  missing: { mark: '○', className: 'text-fg-subtle', label: 'lipsește' },
};

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const rowButton = `rounded-lg border border-primary px-3 py-1 text-sm font-medium text-accent hover:bg-primary-soft ${focusRing}`;
const smallButton = `rounded-lg border border-line-strong px-2 py-0.5 text-xs font-medium text-fg hover:bg-surface-2 ${focusRing}`;

/** Counts "{done} din {total}" over the required and recommended rows together. */
export function checklistProgress(step: StepId, draft: Project) {
  const rows = requirementsFor(step, draft);
  return { done: rows.filter((r) => r.done(draft)).length, total: rows.length };
}

/** "Ce cere pasul" (UX spec §4): saved ✓, proposed ◐ (saved once accepted) or missing ○, required or recommended. */
export function StepChecklist(props: Props) {
  const { step, draft, afterAccept, firstMissingRef } = props;
  const headingId = useId();
  const rows = requirementsFor(step, draft);
  const states = rows.map((r) => rowState(r, draft, afterAccept));
  const firstMissing = rows.findIndex((r, i) => r.level === 'required' && states[i] !== 'saved');
  const { done, total } = checklistProgress(step, draft);

  function actions(r: Requirement, state: RowState) {
    if (r.action === 'none_found' && state !== 'saved') {
      return (
        <span className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" onClick={props.onNoneFound} className={rowButton}>
            Nu am găsit nimic similar
          </button>
          <a href="https://civictech.guide" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent underline underline-offset-2">
            Caută în Civic Tech Field Guide ↗
          </a>
        </span>
      );
    }
    return null;
  }

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={headingId} className="font-semibold text-fg">
          Ce cere pasul
        </h2>
        <span className="text-sm text-fg-muted">
          {done} din {total}
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((r, i) => {
          const state = states[i];
          const icon = ICON[state];
          return (
            <li
              key={r.id}
              data-state={state}
              ref={i === firstMissing ? firstMissingRef : undefined}
              tabIndex={i === firstMissing ? -1 : undefined}
              className={`flex gap-2 rounded-md ${focusRing}`}
            >
              <span aria-hidden className={`w-4 shrink-0 text-center ${icon.className}`}>
                {icon.mark}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-fg">{r.label}</span>
                <span className="sr-only"> ({icon.label})</span>
                {state === 'proposed' && <span className="block text-xs text-proposed-fg">propus — acceptă ca să salvezi</span>}
                {state === 'missing' && r.why && <span className="block text-xs text-fg-muted">{`De ce contează: ${r.why}`}</span>}
                {actions(r, state)}
              </div>
              <span className="shrink-0 text-xs text-fg-subtle">{r.level === 'required' ? 'obligatoriu' : 'recomandat'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
