import type { Project } from './schema';

type Pre = Project['preconditions'][number];
export type Level = 'output' | 'outcome';

/**
 * ToC level of a pathway step. Older drafts have none: a step the team itself does (a team member as
 * actor, or covered by the app) counts as an output, anything else as an outcome.
 */
export function levelOf(p: Project, c: Pre): Level {
  if (c.level) return c.level;
  if (c.coveredByApp) return 'output';
  return p.team.some((m) => m.id === c.actorId) ? 'output' : 'outcome';
}

/** Every pathway step that leads, directly or not, to `targetId`. */
export function upstreamOf(p: Project, targetId: string): Pre[] {
  const found = new Map<string, Pre>();
  const visit = (id: string) => {
    for (const c of p.preconditions) {
      if (c.leadsTo === id && !found.has(c.id)) {
        found.set(c.id, c);
        visit(c.id);
      }
    }
  };
  visit(targetId);
  return [...found.values()];
}

/**
 * The longest single chain into `targetId`, in the order things happen (first step first), preferring a
 * chain that starts with an output. This is the "ca să…" story of the pathway.
 */
export function chainTo(p: Project, targetId: string): Pre[] {
  let best: Pre[] = [];
  const score = (chain: Pre[]) => chain.length + (chain[0] && levelOf(p, chain[0]) === 'output' ? 100 : 0);
  const walk = (id: string, acc: Pre[], seen: Set<string>) => {
    const parents = p.preconditions.filter((c) => c.leadsTo === id && !seen.has(c.id));
    if (parents.length === 0) {
      if (score(acc) > score(best)) best = acc;
      return;
    }
    for (const c of parents) walk(c.id, [c, ...acc], new Set([...seen, c.id]));
  };
  walk(targetId, [], new Set());
  return best;
}
