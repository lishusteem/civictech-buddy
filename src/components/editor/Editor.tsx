'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { STEPS, type StepDef } from '@/lib/steps/definitions';
import type { Project, StepId } from '@/lib/project/schema';
import { ConflictDialog } from './ConflictDialog';
import { Overview } from './Overview';
import { StepScreen, type SetDraft } from './StepScreen';
import { StepSidebar } from './StepSidebar';
import { useAutosave, type SaveStatus } from './useAutosave';

export type RenderStep = (step: StepDef, draft: Project, setDraft: SetDraft, onNext: () => void) => ReactNode;

type Props = {
  token: string;
  initial: { draft: Project; draftUpdatedAt: string };
  /** ISO timestamp of the last publication, null if never published. */
  publishedAt: string | null;
  /** Overrides the step screen (defaults to StepScreen). */
  renderStep?: RenderStep;
};

type View = StepId | 'overview';

const STATUS_TEXT: Partial<Record<SaveStatus, string>> = {
  saved: 'Salvat',
  saving: 'Se salvează…',
  error: 'Eroare la salvare — reîncercăm',
};

const time = (iso: string) => Date.parse(iso);

export function Editor({ token, initial, publishedAt: initialPublishedAt, renderStep }: Props) {
  const { draft, draftUpdatedAt, setDraft, flush, status, fatal, conflict, resolveConflict } = useAutosave(token, initial);
  const [view, setView] = useState<View>(() =>
    STEPS.some((s) => initial.draft.steps[s.id].status === 'done') ? 'overview' : 'project',
  );
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(false);

  const unpublished = publishedAt === null || time(draftUpdatedAt) > time(publishedAt);
  const neverPublished = publishedAt === null;
  const stepDef = view === 'overview' ? null : STEPS.find((s) => s.id === view)!;

  /** After "Pasul următor": the next step, or the overview after the last one (Task 12 shows the summary there). */
  function goNext() {
    const i = STEPS.findIndex((s) => s.id === view);
    setView(i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1].id : 'overview');
  }

  // PLACEHOLDER for Task 12: the full publish flow (KeepLinks, summary) replaces this handler.
  async function publish() {
    setPublishing(true);
    setPublishError(false);
    try {
      const res = await fetch(`/api/e/${token}/publish`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.publishedAt === 'string') setPublishedAt(data.publishedAt);
      else setPublishError(true);
    } catch {
      setPublishError(true);
    }
    setPublishing(false);
  }

  if (status === 'invalid') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-stone-900">
        <h1 className="text-2xl font-semibold">Linkul nu mai e valid.</h1>
        <p className="mt-4">
          <Link href="/" className="font-medium text-teal-900 underline underline-offset-2">
            Înapoi la început
          </Link>
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col text-stone-900">
      <header className="flex items-center justify-between gap-4 border-b border-stone-300 px-4 py-3">
        <p className="font-semibold">{draft.project.name || 'Proiect fără nume'}</p>
        <p role="status" aria-live="polite" className="text-sm text-stone-600">
          {fatal ? 'Nu am putut salva. Reîncarcă pagina.' : (STATUS_TEXT[status] ?? '')}
        </p>
      </header>

      {unpublished && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2">
          <p className="text-sm font-medium text-amber-950">Ai modificări nepublicate</p>
          <div className="flex items-center gap-3">
            {publishError && (
              <span role="alert" className="text-sm text-red-800">
                Nu am putut publica. Încearcă din nou.
              </span>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={publishing || status !== 'saved'}
              className="rounded-lg bg-teal-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60"
            >
              {neverPublished ? 'Publică' : 'Actualizează pagina publică'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col md:flex-row">
        <div className="md:w-72 md:shrink-0">
          <StepSidebar
            project={draft}
            current={view === 'overview' ? null : view}
            onSelect={setView}
            onOverview={() => setView('overview')}
          />
        </div>
        <main className="w-full min-w-0 flex-1 px-4 py-6">
          {stepDef === null ? (
            <div className="mx-auto max-w-3xl">
              <Overview token={token} project={draft} onEditStep={setView} />
            </div>
          ) : renderStep ? (
            renderStep(stepDef, draft, setDraft, goNext)
          ) : (
            <StepScreen key={stepDef.id} step={stepDef} draft={draft} setDraft={setDraft} token={token} onNext={goNext} flush={flush} />
          )}
        </main>
      </div>

      {conflict && <ConflictDialog onResolve={resolveConflict} />}
    </div>
  );
}
