import type { Project } from '@/lib/project/schema';
import { chainTo, levelOf } from '@/lib/project/pathway';
import { continueSentence } from '@/lib/project/points';

type Props = { project: Project; targetId: string; clean: (t: string) => string; actorName: (id: string | null) => string | null };

const LEVEL = { output: 'Output · Realizare', outcome: 'Outcome · Rezultat' } as const;
const STAGE = { start: 'termen scurt', mid: 'intermediar' } as const;

/**
 * One pathway told top to bottom: what we deliver leads, step by step, to what others do differently,
 * up to the long-term outcome. Each link says why (the assumption on the arrow).
 */
export function PathStory({ project: p, targetId, clean, actorName }: Props) {
  const chain = chainTo(p, targetId);
  const target = p.targetChanges.find((t) => t.id === targetId);
  if (chain.length === 0 || !target) return null;
  return (
    <ol className="mt-3 space-y-1" aria-label="Drumul spre rezultat, pas cu pas">
      {chain.map((c) => {
        const level = levelOf(p, c);
        const who = actorName(c.actorId);
        return (
          <li key={c.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              {LEVEL[level]}
              {level === 'outcome' && ` · ${STAGE[c.stage]}`}
            </p>
            <div className="rounded-xl border border-line bg-surface px-4 py-2">
              {who && level === 'outcome' && !clean(c.text).toLowerCase().startsWith(who.toLowerCase().slice(0, 5)) && <span className="font-medium">{who}: </span>}
              {clean(c.text)}
              {c.signal?.trim() && <span className="block text-sm text-fg-muted">Indicator: {clean(c.signal)}</span>}
            </div>
            <p className={`ml-4 border-l-2 py-1 pl-3 text-sm ${c.risky ? 'border-proposed-line text-proposed-fg' : 'border-primary-line text-accent'}`}>
              ↓ ca să…
              {c.assumption.trim() && <span className="text-fg-muted"> (pentru că {continueSentence(clean(c.assumption))})</span>}
              {c.risky && ' ⚠ nesigur'}
            </p>
          </li>
        );
      })}
      <li>
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Long-term outcome · Rezultat pe termen lung</p>
        <div className="rounded-xl border-2 border-primary bg-primary-soft px-4 py-2 font-medium">{clean(target.text)}</div>
      </li>
    </ol>
  );
}
