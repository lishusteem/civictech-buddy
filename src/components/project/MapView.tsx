'use client';

import { useState } from 'react';
import type { Project } from '@/lib/project/schema';
import { isFeatureWorking, isOutcomeCopy, isPendingItem } from '@/lib/project/features';
import { chainTo, levelOf, upstreamOf } from '@/lib/project/pathway';
import { continueSentence } from '@/lib/project/points';
import { HELP_ANCHOR, HowToHelp, helpRoles } from './HowToHelp';
import { PublicFooter, publicData } from './ProjectView';
import { STAGE_LABEL, formatShortDate, teamLine } from './publicPage';
import { WhoMatters } from './WhoMatters';

type Pre = Project['preconditions'][number];
type Selected = { kind: 'step'; id: string } | { kind: 'goal'; id: string } | { kind: 'activity'; id: string } | null;

const STAGE = { start: 'termen scurt', mid: 'intermediar' } as const;
const lower = continueSentence;

/**
 * Variant B, „Harta”: the theory of change as the page. The summary stays on the left; the map shows one
 * long-term outcome's pathway at a time (or all), and a click opens the step's indicator, assumption and test.
 */
export function MapView({ project, publishedAt, storyHref }: { project: Project; publishedAt: string | null; storyHref: string }) {
  const { p, clean, actorName, contact, summary } = publicData(project);
  const date = publishedAt ? formatShortDate(publishedAt) : null;
  const goals = p.targetChanges.filter((t) => t.text.trim() !== '');
  const [path, setPath] = useState<string>(goals[0]?.id ?? 'all');
  const [selected, setSelected] = useState<Selected>(null);

  const visible: Pre[] = path === 'all' ? p.preconditions : upstreamOf(p, path);
  const visibleIds = new Set(visible.map((c) => c.id));
  const outputs = visible.filter((c) => levelOf(p, c) === 'output');
  const outcomes = visible.filter((c) => levelOf(p, c) === 'outcome').sort((a, b) => (a.stage === b.stage ? 0 : a.stage === 'start' ? -1 : 1));
  const shownGoals = path === 'all' ? goals : goals.filter((t) => t.id === path);
  const activities = p.backlog
    .filter((b) => isPendingItem(p, b) && !isOutcomeCopy(p, b) && (path === 'all' || (b.preconditionId !== null && visibleIds.has(b.preconditionId))))
    .sort((a, b) => (a.stage === b.stage ? a.order - b.order : a.stage === 'start' ? -1 : 1));
  const working = p.features.filter((f) => isFeatureWorking(p, f.id));
  const risky = p.preconditions.filter((c) => c.risky).slice(0, 3);
  const stage = p.project.stage ? STAGE_LABEL[p.project.stage] : null;
  const team = teamLine(p);
  const story = path === 'all' ? null : chainTo(p, path);
  const goal = goals.find((t) => t.id === path);

  const card = 'mt-2 block w-full rounded-lg border bg-surface px-2.5 py-2 text-left text-sm leading-snug focus-visible:outline-2 focus-visible:outline-focus';
  const isSel = (s: Selected) => selected !== null && s !== null && selected.kind === s.kind && selected.id === s.id;
  const StepCard = ({ c }: { c: Pre }) => {
    const who = actorName(c.actorId);
    const s: Selected = { kind: 'step', id: c.id };
    return (
      <button
        type="button"
        aria-pressed={isSel(s)}
        onClick={() => setSelected(isSel(s) ? null : s)}
        className={`${card} ${c.risky ? 'border-proposed-line bg-proposed' : 'border-line'} ${isSel(s) ? 'ring-2 ring-focus' : ''}`}
      >
        {who && levelOf(p, c) === 'outcome' && <span className="mb-0.5 inline-block rounded bg-primary-soft px-1.5 text-xs font-semibold text-accent">{who}</span>}
        <span className="block">{clean(c.text)}</span>
        {c.risky && <span className="mt-0.5 block text-xs text-proposed-fg">⚠ nesigur</span>}
      </button>
    );
  };

  const detail = (() => {
    if (!selected) return null;
    if (selected.kind === 'step') {
      const c = p.preconditions.find((x) => x.id === selected.id);
      if (!c) return null;
      const level = levelOf(p, c);
      return (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {level === 'output' ? 'Output · Realizare' : `Outcome · Rezultat · ${STAGE[c.stage]}`}
          </p>
          <p className="mt-1 font-medium">{clean(c.text)}</p>
          {actorName(c.actorId) && <p className="mt-1 text-sm">Cine: {actorName(c.actorId)}</p>}
          {c.signal?.trim() && <p className="mt-1 text-sm">Indicator: {clean(c.signal)}</p>}
          {c.assumption.trim() && <p className="mt-1 text-sm">De ce duce mai departe (ipoteză): {clean(c.assumption)}</p>}
          {c.risky && <p className="mt-1 text-sm text-proposed-fg">⚠ Nesigur. Test: {c.test.trim() ? clean(c.test) : 'încă de stabilit.'}</p>}
        </>
      );
    }
    if (selected.kind === 'goal') {
      const t = goals.find((x) => x.id === selected.id);
      if (!t) return null;
      return (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Long-term outcome · Rezultat pe termen lung</p>
          <p className="mt-1 font-medium">{clean(t.text)}</p>
          {t.signal.trim() && <p className="mt-1 text-sm">Indicator: {clean(t.signal)}</p>}
        </>
      );
    }
    const b = p.backlog.find((x) => x.id === selected.id);
    if (!b) return null;
    const forStep = p.preconditions.find((c) => c.id === b.preconditionId);
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Activity · Activitate</p>
        <p className="mt-1 font-medium">{clean(b.text)}</p>
        {forStep && <p className="mt-1 text-sm">Pentru: {clean(forStep.text)}</p>}
      </>
    );
  })();

  return (
    <article className="text-fg">
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-4">
          <p className="text-sm text-fg-muted">
            {stage && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-accent">{stage}</span>}
            {team && ` ${team}`}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{p.project.name || 'Proiect fără nume'}</h1>
          <dl className="space-y-2 rounded-xl border border-line bg-surface p-3 text-sm">
            {summary.problem && (
              <div>
                <dt className="font-semibold text-accent">Problema</dt>
                <dd>{clean(summary.problem)}</dd>
              </div>
            )}
            {summary.work && (
              <div>
                <dt className="font-semibold text-accent">Ce facem</dt>
                <dd>{clean(summary.work)}</dd>
              </div>
            )}
            {summary.goal && (
              <div>
                <dt className="font-semibold text-accent">Ținta</dt>
                <dd>{clean(summary.goal)}</dd>
              </div>
            )}
          </dl>
          <p className="text-sm">
            <a href={storyHref} className="text-accent underline underline-offset-2">
              Problema și soluția, pe larg →
            </a>
          </p>
          {helpRoles(p).length > 0 && (
            <a href={`#${HELP_ANCHOR}`} className="block rounded-lg bg-primary px-4 py-2.5 text-center font-medium text-on-primary hover:bg-primary-hover">
              Vreau să ajut ↓
            </a>
          )}
        </aside>

        <section aria-labelledby="h-map">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Theory of Change / Teoria schimbării</p>
          <h2 id="h-map" className="text-2xl font-semibold">Cum credem că se produce schimbarea</h2>
          <p className="mt-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg-muted">
            <span className="hidden md:inline">De la stânga la dreapta</span><span className="md:hidden">De sus în jos</span>: ce facem → ce livrăm → ce fac alții diferit → impactul. Galben = încă nesigur. Apasă pe un card pentru detalii.
          </p>
          {goals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Alege rezultatul">
              {[...goals.map((t) => ({ id: t.id, label: clean(t.text) })), { id: 'all', label: 'Tot' }].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={path === g.id}
                  onClick={() => {
                    setPath(g.id);
                    setSelected(null);
                  }}
                  className={`max-w-xs truncate rounded-full border px-3 py-1 text-sm ${path === g.id ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-fg-muted'}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <div role="group" aria-label="Harta" className="mt-3 grid gap-2 md:grid-cols-4">
            <div className="rounded-xl bg-surface-2 p-2.5">
              <h3 className="text-sm font-semibold">Activities</h3>
              <p className="text-xs text-fg-subtle">Activități · ce facem</p>
              {activities.map((b) => {
                const s: Selected = { kind: 'activity', id: b.id };
                return (
                  <button key={b.id} type="button" aria-pressed={isSel(s)} onClick={() => setSelected(isSel(s) ? null : s)} className={`${card} border-line ${isSel(s) ? 'ring-2 ring-focus' : ''}`}>
                    {clean(b.text)}
                  </button>
                );
              })}
              {activities.length === 0 && <p className="mt-2 text-xs text-fg-subtle">Nimic încă pe acest drum.</p>}
            </div>
            <div className="rounded-xl bg-surface-2 p-2.5">
              <h3 className="text-sm font-semibold">Outputs</h3>
              <p className="text-xs text-fg-subtle">Realizări · ce livrăm</p>
              {outputs.map((c) => (
                <StepCard key={c.id} c={c} />
              ))}
              {working.length > 0 && (
                <p className={`${card} border-success-line bg-success`}>
                  <span className="mb-0.5 inline-block rounded bg-success-2 px-1.5 text-xs font-semibold text-success-fg">merge deja</span>
                  <span className="block">Aplicația: {working.length} {working.length === 1 ? 'funcție' : 'funcții'}</span>
                </p>
              )}
            </div>
            <div className="rounded-xl bg-primary-soft p-2.5">
              <h3 className="text-sm font-semibold">Outcomes</h3>
              <p className="text-xs text-fg-subtle">Rezultate · ce fac alții diferit</p>
              {outcomes.map((c) => (
                <StepCard key={c.id} c={c} />
              ))}
              {shownGoals.map((t) => {
                const s: Selected = { kind: 'goal', id: t.id };
                return (
                  <button key={t.id} type="button" aria-pressed={isSel(s)} onClick={() => setSelected(isSel(s) ? null : s)} className={`${card} border-2 border-primary ${isSel(s) ? 'ring-2 ring-focus' : ''}`}>
                    <span className="mb-0.5 inline-block rounded bg-primary-soft px-1.5 text-xs font-semibold text-accent">pe termen lung</span>
                    <span className="block font-medium">{clean(t.text)}</span>
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl bg-success p-2.5">
              <h3 className="text-sm font-semibold">Impact</h3>
              <p className="text-xs text-fg-subtle">Impact</p>
              {p.direction.trim() && <p className="mt-2 rounded-lg bg-primary px-2.5 py-2 text-sm text-on-primary">{clean(p.direction)}</p>}
            </div>
          </div>

          <div role="region" aria-label="Detalii despre pasul ales" className="mt-3 rounded-xl border border-line bg-surface p-4" aria-live="polite">
            {detail ?? <p className="text-sm text-fg-muted">Apasă pe un card din hartă: aici apar indicatorul, ipoteza de pe săgeată și, dacă e nesigur, testul.</p>}
          </div>

          {story && story.length > 0 && goal && (
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-accent">Narațiunea schimbării</p>
              <p className="mt-1 rounded-xl border border-line bg-surface p-4">
                {story.map((c, i) => (
                  <span key={c.id}>
                    {i === 0 ? <b className="text-accent">Pornim de la: </b> : ' → '}
                    {i === 0 ? clean(c.text) : lower(clean(c.text))}
                  </span>
                ))}
                {' → '}
                <b className="text-accent">astfel încât </b>
                {lower(clean(goal.text))}
                {p.direction.trim() && (
                  <>
                    {' → '}
                    <b className="text-accent">pe termen lung, </b>
                    {lower(clean(p.direction))}
                  </>
                )}
              </p>
            </div>
          )}

          <WhoMatters project={p} clean={clean} actorName={actorName} preview={false} />

          {risky.length > 0 && (
            <section aria-labelledby="h-risk-b" className="mt-10">
              <h2 id="h-risk-b" className="text-2xl font-semibold">
                Ce încă nu știm
              </h2>
              <ul className="mt-3 space-y-3">
                {risky.map((c) => (
                  <li key={c.id} className="rounded-xl border border-proposed-line bg-surface p-4">
                    <p className="font-medium">⚠ {clean(c.assumption || c.text)}</p>
                    <p className="mt-1 text-fg-muted">Test: {c.test.trim() ? clean(c.test) : 'încă de stabilit — idei binevenite.'}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <HowToHelp project={p} contact={contact} clean={clean} preview={false} />
        </section>
      </div>
      <PublicFooter project={p} date={date} />
    </article>
  );
}
