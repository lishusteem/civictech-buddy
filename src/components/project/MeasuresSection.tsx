import type { Project } from '@/lib/project/schema';
import { liveMeasures, measureState, type Measure } from '@/lib/project/measures';
import { Section } from './PublicSection';

const ROLE_LABEL = { key: 'Măsura-cheie', delivery: 'Ce livrăm', longTerm: 'Schimbarea mare' } as const;

const filled = (s: string | undefined): s is string => (s ?? '').trim() !== '';

type DetailsProps = { measure: Measure; project: Project; clean: (t: string) => string; preview: boolean };

/** The measure's fields in reading order; only the filled ones get a label. Key-only fields stay off the other roles. */
export function MeasureDetails({ measure: m, clean, preview }: DetailsProps) {
  const isKey = m.role === 'key';
  const rows: [string, string][] = [['Urmărim', m.what]];
  if (isKey && filled(m.counts)) rows.push(['Ce se numără', m.counts]);
  if (isKey) rows.push(['Azi', filled(m.today) ? m.today : 'nu știm încă']);
  if (isKey && filled(m.firstCheck)) rows.push(['Probă', m.firstCheck]);
  if (isKey && filled(m.enough)) rows.push(['Suficient', m.enough]);
  if (isKey && filled(m.ifBelow)) rows.push(['Dacă iese sub', m.ifBelow]);
  if (filled(m.source)) rows.push(['Sursa', m.source]);
  if (preview && isKey && filled(m.routine)) rows.push(['Cine o scoate', m.routine]);
  return (
    <ul className="mt-1 space-y-0.5 text-sm">
      {rows.map(([label, value]) => (
        <li key={label}>
          <span className="font-medium">{label}:</span> {clean(value.trim())}
        </li>
      ))}
    </ul>
  );
}

export function MeasuresSection({ project: p, clean, preview }: { project: Project; clean: (t: string) => string; preview: boolean }) {
  const live = liveMeasures(p);
  const ordered = [...live.filter((m) => m.role === 'key'), ...live.filter((m) => m.role !== 'key')];
  const stepText = (m: Measure) => {
    const step = p.preconditions.find((x) => x.id === m.stepId) ?? p.targetChanges.find((x) => x.id === m.stepId);
    return step ? clean(step.text.trim()) : '';
  };
  return (
    <Section headingId="h-measures" eyebrow="Se vede?" title="Cum vedem dacă merge" empty={ordered.length === 0} preview={preview}>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {ordered.map((m) => {
          const key = m.role === 'key';
          return (
            <li key={m.id} className={`rounded-xl border bg-surface ${key ? 'border-2 border-primary p-5 md:col-span-2' : 'border-line p-4'}`}>
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                {ROLE_LABEL[m.role]}
                {measureState(m) === 'sketch' && (
                  <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-medium normal-case tracking-normal text-fg-muted">schiță</span>
                )}
              </p>
              {stepText(m) && <p className={`mt-1 ${key ? 'text-lg font-medium' : 'font-medium'}`}>{stepText(m)}</p>}
              <MeasureDetails measure={m} project={p} clean={clean} preview={preview} />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
