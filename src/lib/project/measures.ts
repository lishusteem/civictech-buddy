import type { Project } from './schema';

export type Measure = Project['measures'][number];

const filled = (s: string | undefined) => (s ?? '').trim() !== '';

/** Measures whose step (a precondition or a long-term result) still exists. */
export function liveMeasures(p: Project): Measure[] {
  return p.measures.filter((m) => p.preconditions.some((x) => x.id === m.stepId) || p.targetChanges.some((t) => t.id === m.stepId));
}

/** The live measure of a step. */
export function measureFor(p: Project, stepId: string): Measure | undefined {
  return liveMeasures(p).find((m) => m.stepId === stepId);
}

/** The completion rule: a key measure with text, tied to a step of the path. */
export function isKeyMeasureSet(p: Project): boolean {
  return p.measures.some((m) => m.role === 'key' && filled(m.what) && p.preconditions.some((x) => x.id === m.stepId));
}

/** How well the key measure is thought through; the simple measures have no state. */
export function measureState(m: Measure): 'clear' | 'sketch' | null {
  if (m.role !== 'key') return null;
  const defined = [m.what, m.source, m.counts, m.routine, m.enough, m.ifBelow].every(filled);
  return defined && (filled(m.today) || filled(m.firstCheck)) ? 'clear' : 'sketch';
}
