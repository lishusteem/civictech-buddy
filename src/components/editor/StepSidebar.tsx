'use client';

import { useState } from 'react';
import { PHASES, STEPS, minutesLeft } from '@/lib/steps/definitions';
import type { Project, StepId } from '@/lib/project/schema';
import { effectiveStatus, isStepUnlocked } from '@/lib/steps/completion';
import { isQuestionAlert } from '@/lib/alerts/messages';

type Props = {
  project: Project;
  /** null while the "Tot proiectul" overview is shown. */
  current: StepId | null;
  onSelect: (step: StepId) => void;
  onOverview?: () => void;
};

const STATUS_LABEL = { done: 'terminat', in_progress: 'în lucru', untouched: 'neînceput' } as const;

const itemClass =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';

export function StepSidebar({ project, current, onSelect, onOverview }: Props) {
  const [open, setOpen] = useState(false);
  const left = minutesLeft(project);
  const currentDef = STEPS.find((s) => s.id === current);

  return (
    <nav aria-label="Pașii proiectului" className="flex flex-col border-b border-stone-300 bg-stone-50 md:border-b-0 md:border-r">
      <div
        className="order-1 flex items-center justify-between gap-3 px-4 py-3 md:order-2 md:border-t md:border-stone-300"
        onClick={() => setOpen((o) => !o)}
      >
        <p className="text-sm font-medium text-stone-800">
          <span className="md:hidden">
            {currentDef ? `Pasul ${currentDef.number} din ${STEPS.length} · ` : 'Tot proiectul · '}
          </span>
          ~{left} min rămase
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="step-list"
          className="rounded-md px-2 py-1 text-sm font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-800 md:hidden"
        >
          {open ? 'Ascunde pașii' : 'Arată pașii'}
        </button>
      </div>

      <div id="step-list" className={`order-2 px-2 pb-3 md:order-1 md:block md:pt-4 ${open ? 'block' : 'hidden'}`}>
        {onOverview && (
          <button
            type="button"
            onClick={() => {
              onOverview();
              setOpen(false);
            }}
            aria-current={current === null ? 'page' : undefined}
            className={`${itemClass} mb-3 font-medium ${current === null ? 'bg-teal-100 text-teal-950' : 'text-stone-900'}`}
          >
            Tot proiectul
          </button>
        )}
        {PHASES.map((phase) => (
          <section key={phase.id} aria-label={phase.title} className="mb-3">
            <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">{phase.title}</h2>
            <ol>
              {STEPS.filter((s) => s.phase === phase.id).map((s) => {
                const status = effectiveStatus(project, s.id);
                const locked = !isStepUnlocked(project, s.id);
                const isCurrent = s.id === current;
                // Only open questions are flagged; checklist alerts show up in the step's "Ce cere pasul" rows.
                const hasAlert = project.alerts.some((a) => a.status === 'open' && a.step === s.number && isQuestionAlert(a.code));
                return (
                  <li key={s.id} data-step={s.id} data-alert={hasAlert ? 'true' : undefined} aria-current={isCurrent ? 'step' : undefined}>
                    <button
                      type="button"
                      disabled={locked}
                      title={locked ? 'Termină întâi pașii anteriori.' : undefined}
                      onClick={() => {
                        onSelect(s.id);
                        setOpen(false);
                      }}
                      className={`${itemClass} ${isCurrent ? 'bg-teal-100 font-medium text-teal-950' : 'text-stone-800'} ${locked ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : ''}`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          status === 'done'
                            ? 'bg-teal-800 text-white'
                            : status === 'in_progress'
                              ? 'border-2 border-teal-800 text-teal-900'
                              : 'border border-stone-400 text-stone-600'
                        }`}
                      >
                        {status === 'done' ? '✓' : s.number}
                      </span>
                      <span className="flex-1">
                        {s.title}
                        <span className="sr-only"> ({STATUS_LABEL[status]})</span>
                        {locked && <span className="block text-xs text-stone-600">nu poți începe încă</span>}
                      </span>
                      {hasAlert && (
                        <span className="rounded-full bg-sky-100 px-2 text-xs font-semibold text-sky-800">
                          <span aria-hidden>?</span>
                          <span className="sr-only">are întrebări deschise</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </nav>
  );
}
