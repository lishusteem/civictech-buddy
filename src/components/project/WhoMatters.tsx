import type { Project } from '@/lib/project/schema';
import { Section } from './PublicSection';
import { Points } from '../Points';
import { GROUP_HINT, RELATION_CHIP, groupActors } from './publicPage';

type Actor = Project['actors'][number];
type Relation = Project['relations'][number];

const POWER: Record<Actor['power'], string> = { high: 'Putere mare', medium: 'Putere medie', low: 'Putere mică' };

const STANCE: Record<Actor['stance'], string> = {
  supports: 'susține proiectul',
  neutral: 'neutru față de proiect',
  opposes: 'se opune',
  unknown: 'poziție încă necunoscută',
};

/** How a relation reads from the side of one actor: what it does (out) or what is done to it (in). */
const RELATION_SENTENCE: Record<Relation['type'], { out: (to: string) => string; in: (from: string) => string }> = {
  decides: { out: (to) => `Decide pentru ${to}`, in: (from) => `${from} decide pentru el` },
  funds: { out: (to) => `Finanțează ${to}`, in: (from) => `Primește bani de la ${from}` },
  influences: { out: (to) => `Poate influența ${to}`, in: (from) => `Poate fi influențat de ${from}` },
  blocks: { out: (to) => `Poate bloca ${to}`, in: (from) => `Poate fi blocat de ${from}` },
  holds_data: { out: (to) => `Are datele de care are nevoie ${to}`, in: (from) => `Are nevoie de datele de la ${from}` },
  represents: { out: (to) => `Vorbește în numele ${to}`, in: (from) => `Reprezentat de ${from}` },
};

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('ro') + s.slice(1);

type Props = {
  project: Project;
  clean: (t: string) => string;
  actorName: (id: string | null) => string | null;
  preview: boolean;
};

/** „Cine contează”: actors grouped by what they mean for the project, each with why it matters, then relations. */
export function WhoMatters({ project: p, clean, actorName, preview }: Props) {
  const groups = groupActors(p.actors);
  const relations = p.relations
    .map((r) => ({ r, from: actorName(r.from), to: actorName(r.to) }))
    .filter((x): x is { r: Relation; from: string; to: string } => x.from !== null && x.to !== null);

  // Without a note from the dev, an actor is explained by its relations.
  const why = (a: Actor): string => {
    if (a.note?.trim()) return clean(a.note);
    return relations
      .flatMap(({ r, from, to }) => {
        if (r.from === a.id) return [RELATION_SENTENCE[r.type].out(to)];
        if (r.to === a.id) return [RELATION_SENTENCE[r.type].in(from)];
        return [];
      })
      .map((t) => `${t}.`)
      .join('\n');
  };

  return (
    <Section headingId="h-actors" title="Cine contează" empty={groups.length === 0 && relations.length === 0} preview={preview}>
      <p className="mt-1 text-stone-600">Oamenii și instituțiile de care depinde schimbarea, grupați după rolul lor în problemă.</p>
      {groups.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title} className="rounded-xl bg-white p-4">
              <h3 className="font-semibold text-teal-800">{g.title}</h3>
              {GROUP_HINT[g.title] && <p className="text-sm text-stone-600">{GROUP_HINT[g.title]}</p>}
              <ul className="mt-3 space-y-3">
                {g.actors.map((a) => (
                  <li key={a.id}>
                    <p className="font-medium">{capitalize(a.name)}</p>
                    <p className="text-xs text-stone-600">
                      {POWER[a.power]} · {STANCE[a.stance]}
                      {a.excluded && ' · lăsat pe dinafară de soluțiile de azi'}
                    </p>
                    <Points className="mt-1 text-sm text-stone-700" text={why(a)} />
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
                <span className="font-medium">{capitalize(from)}</span>
                <span className="rounded-full border border-stone-400 px-2 text-xs">{RELATION_CHIP[r.type]}</span>
                <span aria-hidden="true">→</span>
                <span className="font-medium">{capitalize(to)}</span>
                {r.note.trim() !== '' && <span className="w-full text-sm text-stone-600">{clean(r.note)}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
