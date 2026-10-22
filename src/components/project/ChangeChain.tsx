import type { Project } from '@/lib/project/schema';
import { Section } from './PublicSection';

type Pre = Project['preconditions'][number];

const PER_LEVEL = 4;

const LEVELS = [
  { stage: 'start', label: 'Început · primele 3 luni' },
  { stage: 'mid', label: 'Mediu · 3–12 luni' },
] as const;

type Props = {
  project: Project;
  clean: (t: string) => string;
  actorName: (id: string | null) => string | null;
  preview: boolean;
};

const Arrow = () => (
  <li aria-hidden="true" className="py-1 text-center text-xl text-teal-700">
    ↑
  </li>
);

/**
 * „Cum credem că se produce schimbarea”, P0 version: the levels in the DOM go from what happens first
 * to the direction (screen readers read them in that order); on screen they stack bottom-up.
 */
export function ChangeChain({ project: p, clean, actorName, preview }: Props) {
  const levels = LEVELS.map((l) => ({ ...l, items: p.preconditions.filter((c) => c.stage === l.stage) })).filter(
    (l) => l.items.length > 0,
  );
  const blocks = [
    ...levels.map((l) => (
      <li key={l.stage} className="rounded-xl border border-stone-300 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{l.label}</p>
        <ul className="mt-2 space-y-2">
          {l.items.slice(0, PER_LEVEL).map((c) => (
            <PreconditionItem key={c.id} c={c} clean={clean} actor={actorName(c.actorId)} />
          ))}
          {l.items.length > PER_LEVEL && <li className="text-sm text-stone-600">+{l.items.length - PER_LEVEL}</li>}
        </ul>
      </li>
    )),
    ...(p.targetChanges.length > 0
      ? [
          <li key="change" className="rounded-xl border-2 border-teal-700 bg-teal-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Schimbarea</p>
            <ul className="mt-1 space-y-2">
              {p.targetChanges.map((t) => (
                <li key={t.id}>
                  <p className="font-medium">{clean(t.text)}</p>
                  {t.signal.trim() !== '' && <p className="text-sm text-stone-700">Semn: {clean(t.signal)}</p>}
                </li>
              ))}
            </ul>
          </li>,
        ]
      : []),
    ...(p.direction.trim() !== ''
      ? [
          <li key="direction" className="rounded-xl bg-teal-800 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Direcția</p>
            <p className="mt-1">{clean(p.direction)}</p>
          </li>,
        ]
      : []),
  ];

  return (
    <Section headingId="h-toc" title="Cum credem că se produce schimbarea" empty={blocks.length === 0} preview={preview}>
      <p className="mt-1 text-sm text-stone-600">Citește de jos în sus: ce facem acum duce la ce urmează.</p>
      <ol className="mt-4 flex flex-col-reverse">
        {blocks.flatMap((b, i) => (i === 0 ? [b] : [<Arrow key={`arrow-${i}`} />, b]))}
      </ol>
    </Section>
  );
}

function PreconditionItem({ c, clean, actor }: { c: Pre; clean: (t: string) => string; actor: string | null }) {
  return (
    <li>
      {clean(c.text)}
      {(actor || c.risky) && (
        <span className="block text-sm text-stone-600">
          {actor}
          {actor && c.risky && ' · '}
          {c.risky && <span className="text-amber-800">⚠ nesigur — îl testăm</span>}
        </span>
      )}
    </li>
  );
}
