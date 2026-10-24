import type { Project } from '@/lib/project/schema';
import { ContactAction } from './ContactAction';
import { Section } from './PublicSection';
import { Points } from '../Points';
import type { Contact } from './publicPage';

type Role = Project['roles'][number];

export const HELP_ANCHOR = 'cum-poti-ajuta';

/** Roles the group can fill: sought people and partner organisations. */
export function helpRoles(p: Project): Role[] {
  return p.roles.filter((r) => r.status === 'seeking' || r.status === 'partner');
}

/** „Primul lucru”: the first organizing or test step tied to a precondition the role is needed for. */
function firstTask(p: Project, r: Role): string | null {
  const refs = new Set(r.reasonRefs);
  const candidates = p.backlog
    .filter((b) => (b.kind === 'organizing' || b.kind === 'test') && b.preconditionId !== null && refs.has(b.preconditionId))
    .sort((a, b) => (a.stage === b.stage ? a.order - b.order : a.stage === 'start' ? -1 : 1));
  return candidates[0]?.text ?? null;
}

type Props = { project: Project; contact: Contact | null; clean: (t: string) => string; preview: boolean };

/** „Cum poți ajuta”: one card per role; the status word („Caut”) is never printed. */
export function HowToHelp({ project: p, contact, clean, preview }: Props) {
  const roles = helpRoles(p);
  return (
    <Section id={HELP_ANCHOR} headingId="h-ajuta" title="Cum poți ajuta" empty={roles.length === 0} preview={preview}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {roles.map((r, i) => {
          // The dev's own first task wins; else the first organizing step tied to the role.
          const first = r.firstTask?.trim() || firstTask(p, r);
          const lead = i === 0;
          return (
            <article
              key={r.id}
              className={`rounded-xl bg-white p-4 ${lead ? 'border-2 border-teal-700 sm:col-span-2' : 'border border-stone-300'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className={lead ? 'text-lg font-semibold' : 'font-semibold'}>{r.name}</h3>
                {r.stage === 'start' ? (
                  <span className="shrink-0 rounded-full bg-teal-800 px-2 py-0.5 text-xs font-medium text-white">Acum</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-800">În 3–12 luni</span>
                )}
              </div>
              {r.status === 'partner' && <p className="text-sm text-stone-600">Căutăm o organizație parteneră</p>}
              {r.timeCommitment?.trim() && <p className="text-sm text-stone-600">Cât timp: {r.timeCommitment.trim()}</p>}
              {r.reason.trim() !== '' && (
                <Points className={lead ? 'mt-2' : 'mt-2 text-sm'} label="De ce" text={clean(r.reason)} />
              )}
              {first && (
                <Points className={lead ? 'mt-1' : 'mt-1 text-sm'} label="Primul lucru" text={clean(first)} />
              )}
            </article>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-stone-600">Nu trebuie să știi cod: multe roluri sunt de advocacy, drept sau organizare.</p>
      {contact && (
        <p className="mt-2 text-stone-700">
          Nu te regăsești? Scrie-ne oricum. <ContactAction contact={contact} variant="text" />
        </p>
      )}
    </Section>
  );
}
