'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { STEPS, type StepDef } from '@/lib/steps/definitions';
import { buildOrganizingItems } from '@/lib/backlog/organizing';
import type { Project, StepId } from '@/lib/project/schema';
import { ConflictDialog } from './ConflictDialog';
import { KeepLinks } from './KeepLinks';
import { Overview } from './Overview';
import { StepScreen, type SetDraft } from './StepScreen';
import { StepSidebar } from './StepSidebar';
import { Summary } from './Summary';
import { useAutosave, type SaveStatus } from './useAutosave';

export type RenderStep = (step: StepDef, draft: Project, setDraft: SetDraft, onNext: () => void) => ReactNode;

type Props = {
  token: string;
  /** Public page slug (the public link is /p/<slug>). */
  slug: string;
  initial: { draft: Project; draftUpdatedAt: string };
  /** ISO timestamp of the last publication, null if never published. */
  publishedAt: string | null;
  /** Overrides the step screen (defaults to StepScreen). */
  renderStep?: RenderStep;
};

type View = StepId | 'overview' | 'summary';

type KeepState = { slug: string; editToken: string };

const STATUS_TEXT: Partial<Record<SaveStatus, string>> = {
  saved: 'Salvat',
  saving: 'Se salvează…',
  error: 'Eroare la salvare — reîncercăm',
};

const time = (iso: string) => Date.parse(iso);

export function Editor({ token: initialToken, slug, initial, publishedAt: initialPublishedAt, renderStep }: Props) {
  // The token changes when the edit link is regenerated.
  const [token, setToken] = useState(initialToken);
  const { draft, draftUpdatedAt, setDraft, flush, status, fatal, conflict, resolveConflict } = useAutosave(token, initial);
  const [view, setView] = useState<View>(() =>
    STEPS.some((s) => initial.draft.steps[s.id].status === 'done') ? 'overview' : 'project',
  );
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(false);
  const [keep, setKeep] = useState<KeepState | null>(null);
  const [updatedNotice, setUpdatedNotice] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState(false);

  const unpublished = publishedAt === null || time(draftUpdatedAt) > time(publishedAt);
  const neverPublished = publishedAt === null;
  const stepDef = view === 'overview' || view === 'summary' ? null : STEPS.find((s) => s.id === view)!;

  /** Moves to a view. Entering the backlog step appends the organizing items (never removes anything). */
  function go(next: View) {
    if (next === 'backlog' && view !== 'backlog' && buildOrganizingItems(draft).length > 0) {
      setDraft((prev) => {
        const items = buildOrganizingItems(prev);
        return items.length > 0 ? { ...prev, backlog: [...prev.backlog, ...items] } : prev;
      });
    }
    setView(next);
  }

  /** After "Pasul următor": the next step, or the summary after the last one. */
  function goNext() {
    const i = STEPS.findIndex((s) => s.id === view);
    go(i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1].id : 'summary');
  }

  /** Shared by the summary and the unpublished bar: save, publish, then show the links on the first publication. */
  async function publish() {
    setPublishing(true);
    setPublishError(false);
    setUpdatedNotice(false);
    try {
      await flush();
      const res = await fetch(`/api/e/${token}/publish`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.publishedAt === 'string' && typeof data.slug === 'string') {
        if (publishedAt === null) setKeep({ slug: data.slug, editToken: token });
        else setUpdatedNotice(true);
        setPublishedAt(data.publishedAt);
      } else setPublishError(true);
    } catch {
      setPublishError(true);
    }
    setPublishing(false);
  }

  async function regenerate() {
    setMenuError(false);
    if (!window.confirm('Linkul vechi nu va mai funcționa.')) return;
    try {
      await flush();
      const res = await fetch(`/api/e/${token}/regenerate`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.editToken !== 'string') {
        setMenuError(true);
        return;
      }
      setToken(data.editToken);
      setMenuOpen(false);
      setKeep({ slug, editToken: data.editToken });
      // Not router.replace: a route change remounts this page and would drop the links screen.
      window.history.replaceState(null, '', `/e/${data.editToken}`);
    } catch {
      setMenuError(true);
    }
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
        <div className="flex items-center gap-4">
          <p role="status" aria-live="polite" className="text-sm text-stone-600">
            {fatal ? 'Nu am putut salva. Reîncarcă pagina.' : (STATUS_TEXT[status] ?? '')}
          </p>
          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg border border-stone-400 px-3 py-1 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              Meniu
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-64 rounded-xl border border-stone-300 bg-white p-3 shadow-md">
                <button
                  type="button"
                  onClick={regenerate}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-900 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-teal-800"
                >
                  Generează link nou
                </button>
                <p className="mt-1 px-3 text-xs text-stone-600">Linkul vechi de editare nu va mai funcționa.</p>
                {menuError && (
                  <p role="alert" className="mt-2 px-3 text-sm text-red-800">
                    Nu am putut genera linkul nou. Încearcă din nou.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {updatedNotice && !unpublished && (
        <p role="status" className="border-b border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-950">
          Pagina publică a fost actualizată.
        </p>
      )}

      {unpublished && view !== 'summary' && !keep && (
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
            current={view === 'overview' || view === 'summary' ? null : view}
            onSelect={go}
            onOverview={() => go('overview')}
          />
        </div>
        <main className="w-full min-w-0 flex-1 px-4 py-6">
          {keep ? (
            <KeepLinks
              slug={keep.slug}
              editToken={keep.editToken}
              projectName={draft.project.name}
              onDone={() => {
                setKeep(null);
                if (view === 'summary') setView('overview');
              }}
            />
          ) : view === 'summary' ? (
            <Summary draft={draft} publishing={publishing} disabled={status !== 'saved'} error={publishError} onPublish={publish} />
          ) : stepDef === null ? (
            <div className="mx-auto max-w-3xl">
              <Overview token={token} project={draft} onEditStep={go} />
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
