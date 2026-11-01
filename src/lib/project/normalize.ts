import type { Project } from './schema';

/**
 * Brings a project saved before the "measures" step to the current shape. Pure and idempotent:
 * a project is old only while `steps` lacks the `measures` key, and normalizing adds it.
 * Anything whose `steps` is not an object is returned unchanged so validation can reject it.
 */
export function normalizeProject(raw: Project): Project {
  const steps = (raw as { steps?: unknown } | null)?.steps;
  if (typeof steps !== 'object' || steps === null || Array.isArray(steps)) return raw;
  if ('measures' in steps) return raw;

  const out: Record<string, unknown> = {
    ...raw,
    steps: { ...steps, measures: { status: 'untouched', messages: [] } },
  };
  if (!('measures' in out)) out.measures = [];
  const alerts = out.alerts;
  if (Array.isArray(alerts)) {
    out.alerts = alerts.map((a) =>
      typeof a === 'object' && a !== null && typeof (a as { step?: unknown }).step === 'number' && (a as { step: number }).step >= 9
        ? { ...a, step: (a as { step: number }).step + 1 }
        : a,
    );
  }
  return out as unknown as Project;
}
