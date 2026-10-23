import type { ReactNode } from 'react';
import { nameIndex, scrubIds } from '@/lib/project/humanText';
import type { Project } from '@/lib/project/schema';
import { ChangeChain } from './ChangeChain';
import { ContactAction } from './ContactAction';
import { HELP_ANCHOR, HowToHelp, helpRoles } from './HowToHelp';
import { NextSteps } from './NextSteps';
import { Placeholder, Section } from './PublicSection';
import { WhoMatters } from './WhoMatters';
import { Points } from '../Points';
import {
  STAGE_LABEL,
  formatShortDate,
  isNothingFoundCard,
  linkLabel,
  memberName,
  parseContact,
  pitchOf,
  publicQuestions,
  safeHttpUrl,
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
};

const hours = (h: number) => (Number.isInteger(h) ? String(h) : String(h).replace('.', ','));
const people = (n: number) => (n === 1 ? '1 om' : n >= 20 ? `${n} de oameni` : `${n} oameni`);

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-900 underline underline-offset-2">
      {children}
    </a>
  );
}

function ShortBox({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-stone-300 bg-white p-4 ${wide ? 'sm:p-5' : ''}`}>
      <h3 className={`font-semibold text-teal-900 ${wide ? 'text-base' : 'text-sm'}`}>{title}</h3>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

/** At most this many functions in „Soluția”; the rest are in the backlog further down. */
const MAX_BRIEF_FEATURES = 6;

/** The public page of a project (/p/[slug]) and its preview in Rezumat. Spec §9: inverted pyramid for the group. */
export function ProjectView({ project: p, publishedAt, preview = false }: Props) {
  // Safety net: older data may carry internal ids ("a4", "p1") inside human text.
  const names = nameIndex(p);
  const clean = (text: string) => scrubIds(text, names);
  const actorName = (id: string | null) => {
    const actor = p.actors.find((a) => a.id === id);
    if (actor) return actor.name;
    const member = p.team.find((m) => m.id === id);
    return member ? memberName(member.name) : null;
  };

  const date = publishedAt ? formatShortDate(publishedAt) : null;
  const stage = p.project.stage ? STAGE_LABEL[p.project.stage] : null;
  const pitch = pitchOf(p);
  const contact = parseContact(p.project.contact);
  const canHelp = helpRoles(p).length > 0;
  const firstLink = p.project.links.map(safeHttpUrl).find((u): u is string => u !== null) ?? null;

  const problem = clean(p.problem.statement.trim());
  const evidence = p.problem.evidence.map((e) => clean(e.trim())).filter((e) => e !== '');
  const solution = clean(p.project.description.trim());
  const features = p.features.map((f) => clean(f.text.trim())).filter((t) => t !== '');
  const totalHours = p.team.reduce((sum, m) => sum + m.hoursPerWeek, 0);
  const teamLine = p.team.length > 0 ? `${people(p.team.length)}, ~${hours(Math.round(totalHours))} ore/săpt.` : '';
  const whereWeAre = [stage, teamLine].filter(Boolean).join(' · ');

  const risky = p.preconditions.filter((c) => c.risky).slice(0, 3);
  const existing = p.existing.filter((x) => !isNothingFoundCard(x));
  const onlyNothingFound = existing.length === 0 && p.existing.length > 0;
  const questions = publicQuestions(p);
  const coveredBy = (m: Project['team'][number]) =>
    p.roles.filter((r) => r.status === 'covered' && r.coveredBy !== null && (r.coveredBy === m.id || r.coveredBy === m.name));

  return (
    <article className="text-stone-900">
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
          </p>
          {date && <p>Actualizat {date}</p>}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{p.project.name || 'Proiect fără nume'}</h1>
        {pitch.text && <p className="mt-3 text-lg text-stone-800">{clean(pitch.text)}</p>}
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

      <Section
        headingId="pe-scurt"
        title="Problema și soluția"
        small
        empty={!problem && !solution && features.length === 0 && !whereWeAre}
        preview={preview}
      >
        {(problem || solution || features.length > 0) && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {problem && (
              <ShortBox title="Problema" wide>
                <Points text={problem} />
                {evidence.length > 0 && (
                  <Points className="text-sm text-stone-600" label="De unde știm" text={evidence.join('\n')} />
                )}
              </ShortBox>
            )}
            {(solution || features.length > 0) && (
              <ShortBox title="Soluția" wide>
                {solution && <Points text={solution} />}
                {features.length > 0 && (
                  <Points
                    className="text-sm text-stone-700"
                    label="Ce face aplicația"
                    text={[...features.slice(0, MAX_BRIEF_FEATURES), ...(features.length > MAX_BRIEF_FEATURES ? [`și încă ${features.length - MAX_BRIEF_FEATURES}`] : [])].join('\n')}
                  />
                )}
              </ShortBox>
            )}
          </div>
        )}
        {whereWeAre && (
          <p className="mt-3 text-sm text-stone-700">
            <span className="font-medium">Unde suntem:</span> {whereWeAre}
          </p>
        )}
      </Section>

      <HowToHelp project={p} contact={contact} clean={clean} preview={preview} />
      <NextSteps project={p} clean={clean} preview={preview} />
      <ChangeChain project={p} clean={clean} actorName={actorName} preview={preview} />

      <Section headingId="h-risk" title="Ce verificăm întâi" empty={risky.length === 0} preview={preview}>
        <ul className="mt-3 space-y-3">
          {risky.map((c) => (
            <li key={c.id} className="rounded-xl border border-amber-300 bg-white p-4">
              <p className="font-medium">⚠ {clean(c.assumption || c.text)}</p>
              <Points className="mt-1 text-stone-700" label="Test" text={c.test.trim() !== '' ? clean(c.test) : 'încă de stabilit — idei binevenite.'} />
            </li>
          ))}
        </ul>
      </Section>

      <WhoMatters project={p} clean={clean} actorName={actorName} preview={preview} />

      <Section headingId="h-team" title="Echipa" empty={p.team.length === 0} preview={preview}>
        <ul className="mt-3 space-y-1">
          {p.team.map((m) => {
            const covered = coveredBy(m);
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
        <p className="mt-2 text-sm text-stone-600">În total ~{hours(Math.round(totalHours))} ore pe săptămână.</p>
      </Section>

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
    </article>
  );
}
