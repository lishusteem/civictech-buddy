import type { Project } from '@/lib/project/schema';
import { Section } from './PublicSection';
import { Points } from '../Points';
import { RELATION_CHIP, groupActors } from './publicPage';

type Power = Project['actors'][number]['power'];

const POWER: Record<Power, { dots: string; label: string }> = {
  high: { dots: '●●●', label: 'putere mare' },
  medium: { dots: '●●', label: 'putere medie' },
  low: { dots: '●', label: 'putere mică' },
};

type Props = {
  project: Project;
  clean: (t: string) => string;
  actorName: (id: string | null) => string | null;
  preview: boolean;
};

/** „Cine contează”: actors grouped by what they mean for the project, then relations as chips. */
export function WhoMatters({ project: p, clean, actorName, preview }: Props) {
  const groups = groupActors(p.actors);
  const relations = p.relations
    .map((r) => ({ r, from: actorName(r.from), to: actorName(r.to) }))
    .filter((x): x is { r: (typeof p.relations)[number]; from: string; to: string } => x.from !== null && x.to !== null);

  return (
    <Section headingId="h-actors" title="Cine contează" empty={groups.length === 0 && relations.length === 0} preview={preview}>
      {groups.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => (
            <div key={g.title} className="rounded-xl bg-white p-4">
              <h3 className="text-sm font-semibold text-teal-800">{g.title}</h3>
              <ul className="mt-2 space-y-1">
                {g.actors.map((a) => (
                  <li key={a.id}>
                    {a.name}{' '}
                    <span className="text-xs text-stone-500" title={POWER[a.power].label}>
                      <span aria-hidden="true">{POWER[a.power].dots}</span>
                      <span className="sr-only">{POWER[a.power].label}</span>
                    </span>
                    {a.excluded && (
                      <>
                        {' '}
                        <span className="rounded bg-stone-200 px-1 text-xs">exclus</span>
                      </>
                    )}
                    {a.note && <Points className="text-sm text-stone-600" text={clean(a.note)} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {relations.length > 0 && (
        <>
          <h3 className="mt-5 font-medium">Legături</h3>
          <ul className="mt-2 space-y-2">
            {relations.map(({ r, from, to }) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3">
                <span className="font-medium">{from}</span>
                <span className="rounded-full border border-stone-400 px-2 text-xs">{RELATION_CHIP[r.type]}</span>
                <span aria-hidden="true">→</span>
                <span className="font-medium">{to}</span>
                {r.note.trim() !== '' && <span className="w-full text-sm text-stone-600">{clean(r.note)}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
