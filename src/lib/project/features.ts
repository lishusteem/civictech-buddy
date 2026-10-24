import type { Project } from './schema';
import { levelOf } from './pathway';

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

/**
 * Older drafts got an organizing item for every pathway step outside the app, with the step's own text,
 * even for outcomes (what others do). Those are not the team's work; the public page leaves them out.
 */
export function isOutcomeCopy(p: Project, b: BacklogItem): boolean {
  if (b.kind !== 'organizing' || b.preconditionId === null) return false;
  const step = p.preconditions.find((c) => c.id === b.preconditionId);
  return !!step && step.text.trim() === b.text.trim() && levelOf(p, step) === 'outcome';
}
