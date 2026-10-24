import type { ReactNode } from 'react';
import { nameIndex, scrubIds } from '@/lib/project/humanText';
import { isFeatureWorking } from '@/lib/project/features';
import type { Project } from '@/lib/project/schema';
import { ContactAction } from './ContactAction';
import { HELP_ANCHOR, HowToHelp, helpRoles } from './HowToHelp';
import { NextSteps } from './NextSteps';
import { PathStory } from './PathStory';
import { Placeholder, Section } from './PublicSection';
import { Points } from '../Points';
import { repairBacklogLinks } from '@/lib/backlog/repair';
import {
  STAGE_LABEL,
  formatShortDate,
  isNothingFoundCard,
  linkLabel,
  memberName,
  parseContact,
  publicQuestions,
  safeHttpUrl,
  summaryOf,
  teamLine,
} from './publicPage';

export { firstSentence } from './publicPage';

/** Anchor of „Întrebări la care ne poți ajuta” (the pre-publish check scrolls to it). */
export const QUESTIONS_ANCHOR = 'intrebari';

type Props = {
  project: Project;
  /** ISO timestamp of the publication; null hides the dates (draft preview). */
  publishedAt: string | null;
  /** Owner preview (Rezumat): empty sections show as dashed placeholders instead of being hidden. */
  preview?: boolean;
  /** Link to the map variant („Vezi toată harta”); none in the preview. */
  mapHref?: string;
};

const hours = (h: number) => (Number.isInteger(h) ? String(h) : String(h).replace('.', ','));

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-900 underline underline-offset-2">
      {children}
    </a>
  );
}

/** The data every public variant needs, cleaned of internal ids. */
export function publicData(project: Project) {
  // Pages published before the backlog fix may link a function item to itself; relink it like the editor does.
  const p = repairBacklogLinks(project);
  // Safety net: older data may carry internal ids ("a4", "p1") inside human text.
  const names = nameIndex(p);
  const clean = (text: string) => scrubIds(text, names);
  const actorName = (id: string | null) => {
    const actor = p.actors.find((a) => a.id === id);
    if (actor) return actor.name;
    const member = p.team.find((m) => m.id === id);
    return member ? memberName(member.name) : null;
  };
  return { p, clean, actorName, contact: parseContact(p.project.contact), summary: summaryOf(p) };
}

/** The top of both variants: what it is, the three-line summary, and the calls to action. */
export function Hero({ project: p, clean, date }: { project: Project; clean: (t: string) => string; date: string | null }) {
  const stage = p.project.stage ? STAGE_LABEL[p.project.stage] : null;
  const contact = parseContact(p.project.contact);
  const canHelp = helpRoles(p).length > 0;
  const firstLink = p.project.links.map(safeHttpUrl).find((u): u is string => u !== null) ?? null;
  const summary = summaryOf(p);
  const team = teamLine(p);
  const lines: [string, string][] = (
    [
      ['Problema', summary.problem],
      ['Ce facem', summary.work],
      ['Ținta', summary.goal],
    ] as [string, string][]
  ).filter(([, text]) => text !== '');
  return (
    <header className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <p>
          <span className="font-medium text-teal-900">Proiect civic tech</span>
          {stage && (
            <>
              {' · '}
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-900">{stage}</span>
            </>
          )}
          {p.project.area.trim() !== '' && ` · ${p.project.area}`}
          {team && ` · ${team}`}
        </p>
        {date && <p>Actualizat {date}</p>}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{p.project.name || 'Proiect fără nume'}</h1>
      {lines.length > 0 && (
        <dl className="mt-4 grid gap-1.5 text-lg text-stone-800 sm:grid-cols-[auto_1fr] sm:gap-x-4">
          {lines.map(([label, text]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-teal-800">{label}</dt>
              <dd className="mb-1 sm:mb-0">{clean(text)}</dd>
            </div>
          ))}
        </dl>
      )}
      {(canHelp || contact || firstLink) && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {canHelp && (
            <a
              href={`#${HELP_ANCHOR}`}
              className="rounded-lg bg-teal-800 px-5 py-2.5 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              Vreau să ajut ↓
            </a>
          )}
          {contact && <ContactAction contact={contact} variant={canHelp ? 'outline' : 'primary'} />}
          {firstLink && <ExtLink href={firstLink}>{linkLabel(firstLink, p.project.stage)}</ExtLink>}
        </div>
      )}
    </header>
  );
}

export function PublicFooter({ project: p, date }: { project: Project; date: string | null }) {
  const contact = parseContact(p.project.contact);
  return (
    <footer className="mt-12 rounded-2xl bg-teal-800 p-6 text-white">
      {contact && (
        <>
          <p className="text-xl font-semibold">Vrei să ajuți?</p>
          <div className="mt-3">
            {contact.kind === 'link' ? <ContactAction contact={contact} variant="inverse" /> : <ContactAction contact={contact} variant="text" />}
          </div>
        </>
      )}
      <p className={`${contact ? 'mt-4 ' : ''}text-sm text-teal-100`}>
        {date ? `Pagină făcută cu Ghidul de pornire · actualizată ${date}` : 'Pagină făcută cu Ghidul de pornire'}
      </p>
    </footer>
  );
}

/**
 * Variant A, „Povestea”: the public page (/p/[slug]) and its preview in Rezumat. Inverted pyramid in the
 * order a newcomer asks: what is it → why care → what does it do → what changes → is it realistic →
 * is it alive → what can I do (docs/ux/2026-10-24-pagina-publica-spec.md).
 */
export function ProjectView({ project, publishedAt, preview = false, mapHref }: Props) {
  const { p, clean, actorName, contact } = publicData(project);
  const date = publishedAt ? formatShortDate(publishedAt) : null;

  const problem = clean(p.problem.statement.trim());
  const example = clean(p.problem.example?.trim() ?? '');
  const evidence = p.problem.evidence.map((e) => clean(e.trim())).filter((e) => e !== '');
  const solution = clean(p.project.description.trim());
  const traction = clean(p.project.traction?.trim() ?? '');
  const working = p.features.filter((f) => isFeatureWorking(p, f.id) && f.text.trim() !== '');
  const planned = p.features.filter((f) => !isFeatureWorking(p, f.id) && f.text.trim() !== '');
  const changes = p.targetChanges.filter((t) => t.text.trim() !== '');
  const firstWithPath = changes.find((t) => p.preconditions.some((c) => c.leadsTo === t.id));

  const risky = p.preconditions.filter((c) => c.risky).slice(0, 3);
  const existing = p.existing.filter((x) => !isNothingFoundCard(x));
  const onlyNothingFound = existing.length === 0 && p.existing.length > 0;
  const questions = publicQuestions(p);

  return (
    <article className="text-stone-900">
      <Hero project={p} clean={clean} date={date} />

      <Section headingId="h-problem" eyebrow="Ce e în joc" title="Problema" empty={!problem} preview={preview}>
        <div className={`mt-3 grid gap-3 ${example ? 'md:grid-cols-2' : ''}`}>
          <div className="rounded-xl border border-stone-300 bg-white p-4">
            <Points text={problem} />
            {evidence.length > 0 && <Points className="mt-2 text-sm text-stone-600" label="De unde știm" text={evidence.join('\n')} />}
          </div>
          {example && (
            <blockquote className="rounded-xl border-l-4 border-teal-700 bg-teal-50 p-4 text-stone-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Un caz concret</p>
              <p className="mt-1">{example}</p>
            </blockquote>
          )}
        </div>
      </Section>

      <Section headingId="h-solution" eyebrow="Ce facem" title="Soluția" empty={!solution && working.length === 0 && planned.length === 0} preview={preview}>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {solution && (
            <div className="rounded-xl border border-stone-300 bg-white p-4">
              <Points text={solution} />
            </div>
          )}
          {(working.length > 0 || planned.length > 0 || traction) && (
            <div className="rounded-xl border border-stone-300 bg-white p-4 text-sm">
              {working.length > 0 && (
                <>
                  <p className="font-medium">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">Merge deja</span>
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {working.map((f) => (
                      <li key={f.id}>{clean(f.text)}</li>
                    ))}
                  </ul>
                </>
              )}
              {planned.length > 0 && (
                <>
                  <p className="mt-3 font-medium">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">Urmează</span>
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {planned.map((f) => (
                      <li key={f.id}>{clean(f.text)}</li>
                    ))}
                  </ul>
                </>
              )}
              {traction && <Points className="mt-3 text-stone-800" label="Până acum" text={traction} />}
            </div>
          )}
        </div>
      </Section>

      <Section headingId="h-change" eyebrow="Ce se schimbă" title="Rezultatele pe care le urmărim" empty={changes.length === 0} preview={preview}>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {changes.map((t) => (
            <div key={t.id} className="rounded-xl border-2 border-teal-700 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Long-term outcome · Rezultat pe termen lung</p>
              <p className="mt-1 font-medium">{clean(t.text)}</p>
              {t.signal.trim() !== '' && <p className="mt-1 text-sm text-stone-600">Indicator: {clean(t.signal)}</p>}
            </div>
          ))}
        </div>
        {firstWithPath && (
          <div className="mt-4 rounded-xl border border-stone-300 bg-stone-50 p-4">
            <h3 className="font-semibold">Cum ajungem acolo</h3>
            <p className="text-sm text-stone-600">Citit de sus în jos: ce livrăm noi duce, pas cu pas, la ce fac alții diferit.</p>
            <PathStory project={p} targetId={firstWithPath.id} clean={clean} actorName={actorName} />
          </div>
        )}
        {p.direction.trim() !== '' && (
          <p className="mt-3">
            <span className="font-medium">Impact pe termen lung:</span> {clean(p.direction)}
          </p>
        )}
        {mapHref && (
          <p className="mt-2">
            <a href={mapHref} className="font-medium text-teal-900 underline underline-offset-2">
              Vezi toată harta schimbării →
            </a>
          </p>
        )}
      </Section>

      <Section headingId="h-risk" eyebrow="E realist?" title="Ce încă nu știm" empty={risky.length === 0} preview={preview}>
        <p className="mt-1 text-stone-600">Ipotezele de care depinde drumul și cum le verificăm, fără cod.</p>
        <ul className="mt-3 space-y-3">
          {risky.map((c) => (
            <li key={c.id} className="rounded-xl border border-amber-300 bg-white p-4">
              <p className="font-medium">⚠ {clean(c.assumption || c.text)}</p>
              <Points className="mt-1 text-stone-700" label="Test" text={c.test.trim() !== '' ? clean(c.test) : 'încă de stabilit — idei binevenite.'} />
            </li>
          ))}
        </ul>
      </Section>

      <NextSteps project={p} clean={clean} preview={preview} />

      <div className="mt-10 space-y-3">
        {p.existing.length === 0 ? (
          preview && <Placeholder title="Ce există deja" />
        ) : (
          <details className="rounded-xl bg-white p-4">
            <summary className="cursor-pointer font-semibold">
              {onlyNothingFound ? 'Ce există deja' : `Ce există deja (${existing.length})`}
            </summary>
            {onlyNothingFound ? (
              <p className="mt-2">Nu am găsit inițiative asemănătoare. Știi una? Spune-ne.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {existing.map((x) => {
                  const href = x.url ? safeHttpUrl(x.url) : null;
                  return (
                    <li key={x.id}>
                      {href ? <ExtLink href={href}>{x.name}</ExtLink> : x.name}
                      {x.difference && ` — ${clean(x.difference)}`}
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        )}
        {questions.length === 0 ? (
          preview && <Placeholder title="Întrebări la care ne poți ajuta" />
        ) : (
          <details id={QUESTIONS_ANCHOR} className="scroll-mt-4 rounded-xl bg-white p-4">
            <summary className="cursor-pointer font-semibold">Întrebări la care ne poți ajuta ({questions.length})</summary>
            <p className="mt-2 text-sm text-stone-600">Lucruri pe care încă nu le știm. Dacă ai un răspuns, scrie-ne.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {questions.map((q) => (
                <li key={q}>{clean(q)}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <Section headingId="h-team" title="Echipa" empty={p.team.length === 0} preview={preview}>
        <ul className="mt-3 space-y-1">
          {p.team.map((m) => {
            const covered = p.roles.filter((r) => r.status === 'covered' && r.coveredBy !== null && (r.coveredBy === m.id || r.coveredBy === m.name));
            return (
              <li key={m.id}>
                <span className="font-medium">{memberName(m.name)}</span>
                {m.skills.length > 0 && ` — ${m.skills.join(', ')}`}
                {` · ${hours(m.hoursPerWeek)} h/săpt.`}
                {covered.length > 0 && ` · acoperă: ${covered.map((r) => r.name).join(', ')}`}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-sm text-stone-600">În total ~{hours(Math.round(p.team.reduce((sum, m) => sum + m.hoursPerWeek, 0)))} ore pe săptămână.</p>
      </Section>

      {/* Last, right before the contact: by now the reader knows the project well enough to help. */}
      <HowToHelp project={p} contact={contact} clean={clean} preview={preview} />

      <PublicFooter project={p} date={date} />
    </article>
  );
}
