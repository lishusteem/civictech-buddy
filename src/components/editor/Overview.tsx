'use client';

import { useEffect, useState } from 'react';
import { STEPS } from '@/lib/steps/definitions';
import { effectiveStatus, isStepUnlocked } from '@/lib/steps/completion';
import { entitiesForStep, type Card } from '@/lib/project/entities';
import type { Project, StepId } from '@/lib/project/schema';

type Props = {
  token: string;
  project: Project;
  onEditStep: (step: StepId) => void;
};

const STATUS_LABEL = { done: 'Terminat', in_progress: 'În lucru', untouched: 'Neînceput' } as const;

const RELATION_LABEL: Record<string, string> = {
  decides: 'decide asupra',
  funds: 'finanțează',
  influences: 'influențează',
  blocks: 'blochează',
  holds_data: 'deține datele lui',
  represents: 'reprezintă',
};

function cardLabel(project: Project, card: Card): string {
  const d = card.data as Record<string, unknown>;
  if (card.kind === 'relation') {
    const name = (id: unknown) => project.actors.find((a) => a.id === id)?.name ?? '?';
    return `${name(d.from)} ${RELATION_LABEL[String(d.type)] ?? String(d.type)} ${name(d.to)}`;
  }
  for (const key of ['name', 'text', 'statement']) {
    const v = d[key];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return '';
}

function useSummary(token: string, enabled: boolean): string {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/e/${token}/summary`, { method: 'POST' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.text === 'string') setText(data.text.trim());
      } catch {
        // No summary on failure; the overview works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Fetched once per visit, not on every edit.
  }, [token, enabled]);
  return text;
}

export function Overview({ token, project, onEditStep }: Props) {
  const anyDone = STEPS.some((s) => effectiveStatus(project, s.id) === 'done');
  const summary = useSummary(token, anyDone);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Tot proiectul</h1>
      {summary && (
        <p className="mt-4 rounded-xl border border-primary-line bg-primary-soft p-4 text-fg" data-testid="summary">
          {summary}
        </p>
      )}
      <div className="mt-6 space-y-4">
        {STEPS.map((s) => {
          const items = entitiesForStep(project, s.id)
            .map((card) => ({ card, label: cardLabel(project, card) }))
            .filter((x) => x.label !== '');
          return (
            <section
              key={s.id}
              aria-labelledby={`overview-${s.id}`}
              data-step={s.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`overview-${s.id}`} className="font-semibold text-fg">
                  {s.number}. {s.title}{' '}
                  <span className="text-sm font-normal text-fg-muted">· {STATUS_LABEL[effectiveStatus(project, s.id)]}</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onEditStep(s.id)}
                  disabled={!isStepUnlocked(project, s.id)}
                  title={isStepUnlocked(project, s.id) ? undefined : 'Termină întâi pașii anteriori.'}
                  aria-label={`Editează: ${s.title}`}
                  className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-accent hover:bg-primary-soft disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Editează
                </button>
              </div>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-fg-muted">Nimic adăugat încă.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-fg">
                  {items.map(({ card, label }) => (
                    <li key={`${card.kind}-${card.data.id}`}>{label}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
