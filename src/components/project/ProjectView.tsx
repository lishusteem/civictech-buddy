import type { ReactNode } from 'react';
import { nameIndex, scrubIds } from '@/lib/project/humanText';
import type { Project, Stage } from '@/lib/project/schema';

type Props = {
  project: Project;
  /** ISO timestamp shown as "Actualizat la"; null hides the line (draft preview). */
  publishedAt: string | null;
};

type Role = Project['roles'][number];

const STAGE_LABEL: Record<NonNullable<Project['project']['stage']>, string> = {
  idea: 'Idee',
  prototype: 'Prototip',
  live: 'Funcționează deja',
};
const PHASE_LABEL: Record<Stage, string> = { start: 'Început', mid: 'Mediu' };
const ROLE_STATUS: Record<Role['status'], string> = {
  covered: 'Acoperit',
  seeking: 'Caut',
  partner: 'Partener',
  not_needed: 'Nu e nevoie',
};
const KIND_LABEL = { feature: 'Funcție', test: 'Test', organizing: 'Organizare' } as const;
const RELATION_LABEL: Record<string, string> = {
  decides: 'decide asupra',
  funds: 'finanțează',
  influences: 'influențează',
  blocks: 'blochează',
  holds_data: 'deține datele lui',
  represents: 'reprezintă',
};

/** First sentence: up to the first ., ! or ? followed by whitespace or the end. */
export function firstSentence(text: string): string {
  const t = text.trim();
  const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(t);
  return m ? m[0] : t;
}

function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-xl font-semibold text-stone-900">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-stone-800">{children}</div>
    </section>
  );
}

const Empty = () => <p className="text-stone-600">Nimic adăugat încă.</p>;

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-900 underline underline-offset-2">
      {children}
    </a>
  );
}

export function ProjectView({ project: p, publishedAt }: Props) {
  // Safety net: older data may carry internal ids ("a4", "p1") inside human text.
  const names = nameIndex(p);
  const clean = (text: string) => scrubIds(text, names);
  const actorName = (id: string | null) =>
    p.actors.find((a) => a.id === id)?.name ?? p.team.find((m) => m.id === id)?.name ?? null;
  const cardRoles = p.roles.filter((r) => r.status === 'seeking' || r.status === 'partner');
  const tableRoles = p.roles.filter((r) => r.status !== 'not_needed');
  const sentence = firstSentence(p.problem.statement);
  const firstChange = clean(p.targetChanges[0]?.text ?? '');
  const risky = p.preconditions.filter((c) => c.risky).slice(0, 3);
  const links = p.project.links.map((l) => ({ raw: l, href: safeHttpUrl(l) }));
  const dismissedAlerts = p.alerts.filter((a) => a.status === 'dismissed');
  const backlog = (['start', 'mid'] as const).map((stage) => ({
    stage,
    items: p.backlog.filter((b) => b.stage === stage).sort((a, b) => a.order - b.order),
  }));

  return (
    <article className="text-stone-900">
      <header aria-label="Cartea de vizită" className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
        <h1 className="text-3xl font-semibold tracking-tight">{p.project.name || 'Proiect fără nume'}</h1>
        {publishedAt && <p className="mt-1 text-sm text-stone-600">Actualizat la {formatDate(publishedAt)}</p>}
        {sentence && (
          <p className="mt-4 text-lg">
            <span className="block text-sm font-medium text-teal-900">Problema</span>
            {sentence}
          </p>
        )}
        {firstChange && (
          <p className="mt-3">
            <span className="block text-sm font-medium text-teal-900">Schimbarea țintă</span>
            {firstChange}
          </p>
        )}
        {p.project.stage && (
          <p className="mt-3">
            <span className="block text-sm font-medium text-teal-900">Stadiul</span>
            {STAGE_LABEL[p.project.stage]}
          </p>
        )}
        {cardRoles.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-teal-900">Căutăm</p>
            <ul className="mt-1 list-disc pl-5">
              {cardRoles.map((r) => (
                <li key={r.id}>
                  {r.name} · {PHASE_LABEL[r.stage]} · {ROLE_STATUS[r.status]}
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.project.contact.trim() !== '' && (
          <p className="mt-3">
            <span className="block text-sm font-medium text-teal-900">Contact</span>
            {p.project.contact}
          </p>
        )}
      </header>

      <Section id="sec-project" title="Proiectul și echipa">
        {p.project.description && <p>{p.project.description}</p>}
        {(p.project.area || p.project.stage) && (
          <p className="text-sm text-stone-700">
            {[p.project.stage ? STAGE_LABEL[p.project.stage] : '', p.project.area].filter(Boolean).join(' · ')}
          </p>
        )}
        {p.project.motivation && <p>{p.project.motivation}</p>}
        {links.length > 0 && (
          <ul className="list-disc pl-5">
            {links.map((l, i) => (
              <li key={i} className="break-words">
                {l.href ? <ExtLink href={l.href}>{l.raw}</ExtLink> : l.raw}
              </li>
            ))}
          </ul>
        )}
        {p.team.length > 0 && (
          <ul className="list-disc pl-5">
            {p.team.map((m) => (
              <li key={m.id}>
                {m.name}
                {m.skills.length > 0 && ` · ${m.skills.join(', ')}`} · {m.hoursPerWeek} ore/săptămână
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="sec-problem" title="Problema">
        {p.problem.statement ? <p>{p.problem.statement}</p> : <Empty />}
        {p.problem.evidence.length > 0 ? (
          <ul className="list-disc pl-5">
            {p.problem.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-600">Neverificat</p>
        )}
      </Section>

      <Section id="sec-existing" title="Ce există deja">
        {p.existing.length === 0 ? (
          <Empty />
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {p.existing.map((x) => {
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
      </Section>

      <Section id="sec-toc" title="Teoria schimbării">
        {p.direction && <p>{p.direction}</p>}
        {p.targetChanges.length > 0 && (
          <ul className="list-disc space-y-1 pl-5">
            {p.targetChanges.map((t) => (
              <li key={t.id}>
                {clean(t.text)}
                {t.signal && <span className="text-stone-700"> — semn observabil: {clean(t.signal)}</span>}
              </li>
            ))}
          </ul>
        )}
        {(['start', 'mid'] as const).map((stage) => {
          const items = p.preconditions.filter((c) => c.stage === stage);
          if (items.length === 0) return null;
          return (
            <div key={stage}>
              <h3 className="font-medium">{PHASE_LABEL[stage]}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {items.map((c) => (
                  <li key={c.id}>
                    {clean(c.text)}
                    {actorName(c.actorId) && <span className="text-stone-700"> · {actorName(c.actorId)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {!p.direction && p.targetChanges.length === 0 && p.preconditions.length === 0 && <Empty />}
      </Section>

      <Section id="sec-risks" title="Ipotezele riscante">
        {risky.length === 0 ? (
          <Empty />
        ) : (
          <ol className="list-decimal space-y-2 pl-5">
            {risky.map((c) => (
              <li key={c.id}>
                {clean(c.assumption || c.text)}
                {c.test && <span className="block text-stone-700">Test: {clean(c.test)}</span>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section id="sec-actors" title="Harta actorilor">
        {p.actors.length === 0 ? (
          <Empty />
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {p.actors.map((a) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
        )}
        {p.relations.length > 0 && (
          <ul className="list-disc space-y-1 pl-5">
            {p.relations.map((r) => (
              <li key={r.id}>
                {actorName(r.from) ?? '?'} {RELATION_LABEL[r.type] ?? r.type} {actorName(r.to) ?? '?'}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="sec-roles" title="Echipa căutată">
        {tableRoles.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-stone-300">
                  <th scope="col" className="py-2 pr-3 font-medium">Rol</th>
                  <th scope="col" className="py-2 pr-3 font-medium">De ce</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Etapă</th>
                  <th scope="col" className="py-2 font-medium">Stare</th>
                </tr>
              </thead>
              <tbody>
                {tableRoles.map((r) => (
                  <tr key={r.id} className="border-b border-stone-200 align-top">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{clean(r.reason)}</td>
                    <td className="py-2 pr-3">{PHASE_LABEL[r.stage]}</td>
                    <td className="py-2">{ROLE_STATUS[r.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="sec-backlog" title="Backlog de organizare">
        {p.backlog.length === 0 && <Empty />}
        {backlog.map(({ stage, items }) =>
          items.length === 0 ? null : (
            <div key={stage}>
              <h3 className="font-medium">{PHASE_LABEL[stage]}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {items.map((b) => (
                  <li key={b.id}>
                    <span className="text-sm text-stone-700">{KIND_LABEL[b.kind]}: </span>
                    {clean(b.text)}
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </Section>

      <Section id="sec-open" title="Puncte deschise">
        {dismissedAlerts.length === 0 && p.toFindOut.length === 0 ? (
          <p className="text-stone-600">Nimic deschis.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {dismissedAlerts.map((a, i) => (
              <li key={`${a.code}-${i}`}>{a.message}</li>
            ))}
            {p.toFindOut.map((q) => (
              <li key={q.id}>{clean(q.text)}</li>
            ))}
          </ul>
        )}
      </Section>
    </article>
  );
}
