import type { Project } from './schema';

type BacklogItem = Project['backlog'][number];

/**
 * Whether a function already works for users. Older drafts did not record it: there a live
 * project's functions count as working, since the dev described what the app already does.
 */
export function isFeatureWorking(p: Project, featureId: string | null): boolean {
  const f = p.features.find((x) => x.id === featureId);
  if (!f) return false;
  return f.done ?? p.project.stage === 'live';
}

/** A backlog item still to do: everything except a function that already works. */
export const isPendingItem = (p: Project, b: BacklogItem) => !(b.kind === 'feature' && isFeatureWorking(p, b.featureId));
