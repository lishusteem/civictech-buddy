import type { Project } from '@/lib/project/schema';
import { isPendingItem } from '@/lib/project/features';
import { Section } from './PublicSection';

type Item = Project['backlog'][number];

const SHOWN = 5;

const KIND_CHIP: Record<Item['kind'], { label: string; className: string }> = {
  feature: { label: 'Cod', className: 'bg-sky-100 text-sky-900' },
  test: { label: 'Test', className: 'bg-amber-100 text-amber-900' },
  organizing: { label: 'Organizare', className: 'bg-violet-100 text-violet-900' },
};

const PHASES = [
  { stage: 'start', label: 'Început' },
  { stage: 'mid', label: 'Mediu' },
] as const;

const WORKING_CHIP = { label: 'Funcționează', className: 'bg-emerald-100 text-emerald-900' };

function Chip({ kind, working = false }: { kind: Item['kind']; working?: boolean }) {
  const c = working ? WORKING_CHIP : KIND_CHIP[kind];
  return <span className={`shrink-0 rounded px-1.5 text-xs font-medium leading-5 ${c.className}`}>{c.label}</span>;
}

const byOrder = (a: Item, b: Item) => a.order - b.order;

type Props = { project: Project; clean: (t: string) => string; preview: boolean };

/**
 * „Următorii pași”: the first 5 steps still to do, then the whole plan grouped by stage in a <details>.
 * Functions that already work are not next steps; the whole plan shows them as working.
 */
export function NextSteps({ project: p, clean, preview }: Props) {
  const ordered = PHASES.flatMap(({ stage }) => p.backlog.filter((b) => b.stage === stage).sort(byOrder));
  const pending = ordered.filter((b) => isPendingItem(p, b));
  const top = pending.slice(0, SHOWN);
  return (
    <Section headingId="h-next" title="Următorii pași" empty={pending.length === 0} preview={preview}>
      <ol className="mt-4 space-y-2">
        {top.map((b, i) => (
          <li key={b.id} className="flex gap-3 rounded-lg bg-white p-3">
            <span className="font-semibold text-teal-800">{i + 1}</span>
            <Chip kind={b.kind} />
            <span>{clean(b.text)}</span>
          </li>
        ))}
      </ol>
      {ordered.length > top.length && (
        <details className="mt-3">
          <summary className="cursor-pointer font-medium text-teal-900">Tot planul de lucru ({ordered.length})</summary>
          {PHASES.map(({ stage, label }) => {
            const items = ordered.filter((b) => b.stage === stage);
            if (items.length === 0) return null;
            return (
              <div key={stage} className="mt-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{label}</h3>
                <ul className="mt-1 space-y-1">
                  {items.map((b) => (
                    <li key={b.id} className="flex gap-2">
                      <Chip kind={b.kind} working={!isPendingItem(p, b)} />
                      <span>{clean(b.text)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </details>
      )}
    </Section>
  );
}
