import type { Project } from './schema';

export type Measure = Project['measures'][number];

/** Measure fields only the key measure has; the simple roles drop them. */
export const KEY_ONLY_FIELDS: string[] = ['counts', 'routine', 'today', 'firstCheck', 'enough', 'ifBelow'];

const filled = (s: string | undefined) => (s ?? '').trim() !== '';

/** Measures with text whose step (a precondition or a long-term result) still exists. */
export function liveMeasures(p: Project): Measure[] {
  return p.measures.filter((m) => filled(m.what) && (p.preconditions.some((x) => x.id === m.stepId) || p.targetChanges.some((t) => t.id === m.stepId)));
}

/** The live measure of a step; the key measure when the step has more than one. */
export function measureFor(p: Project, stepId: string): Measure | undefined {
  const onStep = liveMeasures(p).filter((m) => m.stepId === stepId);
  return onStep.find((m) => m.role === 'key') ?? onStep[0];
}

/** The key measure, when it has text and is tied to a step of the path. */
export function liveKeyMeasure(p: Project): Measure | undefined {
  return p.measures.find((m) => m.role === 'key' && filled(m.what) && p.preconditions.some((x) => x.id === m.stepId));
}

/** The completion rule. */
export function isKeyMeasureSet(p: Project): boolean {
  return liveKeyMeasure(p) !== undefined;
}

/** How well the key measure is thought through; the simple measures have no state. */
export function measureState(m: Measure): 'clear' | 'sketch' | null {
  if (m.role !== 'key') return null;
  const defined = [m.what, m.source, m.counts, m.routine, m.enough, m.ifBelow].every(filled);
  return defined && (filled(m.today) || filled(m.firstCheck)) ? 'clear' : 'sketch';
}

/** The line under a step or long-term result: its measure, else the free-text indicator, else nothing. */
export function indicatorLine(p: Project, stepId: string, signal: string | undefined): string | null {
  const m = measureFor(p, stepId);
  if (m) return `Urmărim: ${m.what.trim()}`;
  return filled(signal) ? `Indicator: ${(signal ?? '').trim()}` : null;
}
