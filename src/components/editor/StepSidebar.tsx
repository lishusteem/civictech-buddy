'use client';

import { useState } from 'react';
import { PHASES, STEPS } from '@/lib/steps/definitions';
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
  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function StepSidebar({ project, current, onSelect, onOverview }: Props) {
  const [open, setOpen] = useState(false);
  const doneIds = new Set(STEPS.filter((s) => effectiveStatus(project, s.id) === 'done').map((s) => s.id));
  const percent = Math.round((doneIds.size / STEPS.length) * 100);
  const currentDef = STEPS.find((s) => s.id === current);

  return (
    <nav aria-label="Pașii proiectului" className="flex flex-col border-b border-line bg-subtle md:h-full md:border-b-0 md:border-r">
      <div
        className="order-1 flex items-center justify-between gap-3 px-4 py-3 md:order-1 md:block md:px-5 md:pb-2 md:pt-5"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2 text-sm font-medium text-fg">
            <span>
              <span className="md:hidden">
                {currentDef ? `Pasul ${currentDef.number} din ${STEPS.length} · ` : 'Tot proiectul · '}
              </span>
              <span className="max-md:hidden">Progres</span>
            </span>
            <span data-testid="progress-percent" className="tabular-nums">
              {percent}% {percent === 100 ? 'gata' : 'complet'}
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Progresul proiectului"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          {percent === 100 && <p className="mt-2 text-xs text-fg-muted max-md:hidden">Toți pașii sunt gata: poți publica.</p>}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="step-list"
          className="rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-focus md:hidden"
        >
          {open ? 'Ascunde pașii' : 'Arată pașii'}
        </button>
      </div>

      <div id="step-list" className={`order-2 px-2 pb-3 md:block md:flex-1 md:overflow-y-auto md:px-3 md:pt-3 ${open ? 'block' : 'hidden'}`}>
        {onOverview && (
          <button
            type="button"
            onClick={() => {
              onOverview();
              setOpen(false);
            }}
            aria-current={current === null ? 'page' : undefined}
            className={`${itemClass} mb-3 font-medium ${current === null ? 'bg-primary-soft-2 text-accent' : 'text-fg'}`}
          >
            Tot proiectul
          </button>
        )}
        {PHASES.map((phase) => (
          <section key={phase.id} aria-label={phase.title} className="mb-3">
            <h2 className="flex items-baseline justify-between px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-accent">
              <span>{phase.title}</span>
              <span className="font-medium normal-case tracking-normal text-fg-subtle tabular-nums">
                {STEPS.filter((s) => s.phase === phase.id && doneIds.has(s.id)).length}/{STEPS.filter((s) => s.phase === phase.id).length}
              </span>
            </h2>
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
                      className={`${itemClass} ${isCurrent ? 'bg-primary-soft-2 font-medium text-accent' : 'text-fg'} ${locked ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : ''}`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          status === 'done'
                            ? 'bg-primary text-on-primary'
                            : status === 'in_progress'
                              ? 'border-2 border-primary text-accent'
                              : 'border border-line-strong text-fg-muted'
                        }`}
                      >
                        {status === 'done' ? '✓' : s.number}
                      </span>
                      <span className="flex-1">
                        {s.title}
                        <span className="sr-only"> ({STATUS_LABEL[status]})</span>
                        {locked && <span className="block text-xs text-fg-muted">nu poți începe încă</span>}
                      </span>
                      {hasAlert && (
                        <span className="rounded-full bg-question-2 px-2 text-xs font-semibold text-question-fg">
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
