import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import { normalizeProject } from './normalize';
import { ProjectSchema, type Project } from './schema';

function oldProject(): Project {
  const p = createEmptyProject('Parcul') as Record<string, unknown> & Project;
  const steps = { ...p.steps } as Record<string, unknown>;
  delete steps.measures;
  const msg = (text: string) => ({ role: 'user', content: text });
  steps.roles = { status: 'done', messages: [msg('roluri')] };
  const alert = (step: number) => ({ code: 'only_code', step, refs: [], status: 'open', message: `pas ${step}` });
  const old = { ...p, steps, alerts: [alert(8), alert(9), alert(10)] } as Record<string, unknown>;
  delete old.measures;
  return old as unknown as Project;
}

describe('normalizeProject', () => {
  it('brings an old project to the new shape', () => {
    const old = oldProject();
    const out = normalizeProject(old);
    expect(out.measures).toEqual([]);
    expect(out.steps.measures).toEqual({ status: 'untouched', messages: [] });
    expect(out.alerts.map((a) => a.step)).toEqual([8, 10, 11]);
    expect(out.steps.roles.messages).toEqual(old.steps.roles.messages);
    expect(normalizeProject(out)).toEqual(out);
    expect(old.alerts[1].step).toBe(9);
    expect(ProjectSchema.safeParse(out).success).toBe(true);
    expect(normalizeProject({ version: 1 } as never)).toEqual({ version: 1 });
  });

  it('leaves an up-to-date project untouched', () => {
    const p = createEmptyProject('P');
    expect(normalizeProject(p)).toEqual(p);
  });

  it('leaves non-list alerts alone', () => {
    const old = { ...oldProject(), alerts: 'x' } as never;
    expect((normalizeProject(old) as { alerts: unknown }).alerts).toBe('x');
  });
});
