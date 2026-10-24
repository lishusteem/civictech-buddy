'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { Card } from '@/lib/project/entities';
import { firstIncompleteStep, isStepUnlocked } from '@/lib/steps/completion';
import { STEPS, type StepDef } from '@/lib/steps/definitions';
import type { Project, StepId } from '@/lib/project/schema';
import { AskTracker } from './ChatPanel';
import { ConflictDialog } from './ConflictDialog';
import { KeepLinks } from './KeepLinks';
import { Overview } from './Overview';
import { StepScreen, type SetDraft } from './StepScreen';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { StepSidebar } from './StepSidebar';
import { Summary } from './Summary';
import { REJECTED_TEXT, useAutosave, type SaveStatus } from './useAutosave';

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
  const { draft, draftUpdatedAt, setDraft, flush, status, fatal, rejected, conflict, resolveConflict } = useAutosave(token, initial);
  // Reopens at the first step that is not complete (a stored 'done' without saved content does not count).
  const [view, setView] = useState<View>(() => firstIncompleteStep(initial.draft) ?? 'overview');
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(false);
  // A brand-new project (never published, no step started) shows its edit link once, before step 1.
  const [keep, setKeep] = useState<KeepState | null>(() =>
    initialPublishedAt === null && STEPS.every((s) => initial.draft.steps[s.id].status === 'untouched')
      ? { slug, editToken: initialToken }
      : null,
  );
  const [updatedNotice, setUpdatedNotice] = useState(false);
  // Unaccepted AI proposals per step; kept while the user moves between steps (lost on reload).
  const [proposals, setProposals] = useState<Partial<Record<StepId, Card[]>>>({});
  const [askTracker] = useState(() => new AskTracker());
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuError, setMenuError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const unpublished = publishedAt === null || time(draftUpdatedAt) > time(publishedAt);
  const neverPublished = publishedAt === null;
  const stepDef = view === 'overview' || view === 'summary' ? null : STEPS.find((s) => s.id === view)!;

  /** Moves to a view. */
  function go(next: View, afterFinish = false) {
    // Steps open in order: a step is reachable once every step before it is complete.
    // (After finishing a step the draft in this closure is one update behind, and the button was gated already.)
    if (!afterFinish && next !== 'overview' && next !== 'summary' && !isStepUnlocked(draft, next)) return;
    setView(next);
  }

  /** After "Pasul următor": the next step, or the summary after the last one. */
  function goNext() {
    const i = STEPS.findIndex((s) => s.id === view);
    go(i >= 0 && i < STEPS.length - 1 ? STEPS[i + 1].id : 'summary', true);
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

  async function copyEditLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/e/${token}`);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
    }
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
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-fg">
        <h1 className="text-2xl font-semibold">Linkul nu mai e valid.</h1>
        <p className="mt-4">
          <Link href="/" className="font-medium text-accent underline underline-offset-2">
            Înapoi la început
          </Link>
        </p>
      </main>
    );
  }

  return (
    // Desktop: the editor is exactly one window tall; the sidebar and the main area scroll on their own.
    <div className="flex min-h-screen flex-col text-fg lg:h-dvh lg:min-h-0">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 lg:px-6">
        <p className="flex items-center gap-3 font-semibold">
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">G</span>
          {draft.project.name || 'Proiect fără nume'}
        </p>
        <div className="flex items-center gap-4">
          <ThemeToggle className="max-md:hidden" />
          <p role="status" aria-live="polite" className="text-sm text-fg-muted">
            {fatal ? 'Nu am putut salva. Reîncarcă pagina.' : rejected && status === 'error' ? REJECTED_TEXT : (STATUS_TEXT[status] ?? '')}
          </p>
          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((o) => !o);
                setLinkCopied(false);
              }}
              className="rounded-lg border border-line-strong px-3 py-1 text-sm font-medium text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Meniu
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-64 rounded-xl border border-line bg-surface p-3 shadow-md">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyEditLink}
                    className="flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    Copiază linkul de editare
                  </button>
                  {linkCopied && (
                    <span role="status" className="pr-2 text-sm text-accent">
                      Copiat
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={regenerate}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-fg hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus"
                >
                  Generează link nou
                </button>
                <p className="mt-1 px-3 text-xs text-fg-muted">Linkul vechi de editare nu va mai funcționa.</p>
                {menuError && (
                  <p role="alert" className="mt-2 px-3 text-sm text-danger-fg">
                    Nu am putut genera linkul nou. Încearcă din nou.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {neverPublished && (
        <p className="border-b border-line bg-subtle px-4 py-1.5 text-sm text-fg-muted">
          Păstrează linkul din bara de adrese — e singura cheie a proiectului.
        </p>
      )}

      {updatedNotice && !unpublished && (
        <p role="status" className="border-b border-primary-line bg-primary-soft px-4 py-2 text-sm font-medium text-accent">
          Pagina publică a fost actualizată.
        </p>
      )}

      {unpublished && view !== 'summary' && !keep && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-proposed-line bg-proposed px-4 py-2">
          <p className="text-sm font-medium text-proposed-fg">Ai modificări nepublicate</p>
          <div className="flex items-center gap-3">
            {publishError && (
              <span role="alert" className="text-sm text-danger-fg">
                Nu am putut publica. Încearcă din nou.
              </span>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={publishing || status !== 'saved'}
              // Outlined: on a step screen the action bar holds the single filled button.
              className="rounded-lg border border-primary bg-surface px-4 py-1.5 text-sm font-medium text-accent hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
            >
              {neverPublished ? 'Publică' : 'Actualizează pagina publică'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col md:flex-row lg:min-h-0">
        <div className="md:w-72 md:shrink-0 lg:min-h-0">
          <StepSidebar
            project={draft}
            current={view === 'overview' || view === 'summary' ? null : view}
            onSelect={go}
            onOverview={() => go('overview')}
          />
        </div>
        <main className="w-full min-w-0 flex-1 px-4 py-6 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5">
          {keep ? (
            <KeepLinks
              slug={keep.slug}
              editToken={keep.editToken}
              published={publishedAt !== null}
              projectName={draft.project.name}
              onDone={() => {
                setKeep(null);
                if (view === 'summary') setView('overview');
              }}
            />
          ) : view === 'summary' ? (
            <Summary draft={draft} setDraft={setDraft} published={publishedAt !== null} publishing={publishing} disabled={status !== 'saved'} error={publishError} onPublish={publish} />
          ) : stepDef === null ? (
            <div className="mx-auto max-w-3xl">
              <Overview token={token} project={draft} onEditStep={go} />
            </div>
          ) : renderStep ? (
            renderStep(stepDef, draft, setDraft, goNext)
          ) : (
            <StepScreen
              key={stepDef.id}
              step={stepDef}
              draft={draft}
              setDraft={setDraft}
              token={token}
              onNext={goNext}
              flush={flush}
              askTracker={askTracker}
              proposed={proposals[stepDef.id] ?? []}
              setProposed={(update) =>
                setProposals((all) => ({
                  ...all,
                  [stepDef.id]: typeof update === 'function' ? update(all[stepDef.id] ?? []) : update,
                }))
              }
            />
          )}
        </main>
      </div>

      {conflict && <ConflictDialog onResolve={resolveConflict} />}
    </div>
  );
}
