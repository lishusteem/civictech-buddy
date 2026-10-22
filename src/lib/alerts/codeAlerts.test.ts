import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import type { Alert, Project, StepId } from '../project/schema';
import { CODE_ALERT_CODES, computeCodeAlerts, mergeAlerts } from './codeAlerts';
import { ALERT_MESSAGES } from './messages';

function proj(touch: StepId[], mutate: (p: Project) => void): Project {
  const p = createEmptyProject('T');
  for (const id of touch) p.steps[id].status = 'in_progress';
  mutate(p);
  return p;
}
const codes = (p: Project) => computeCodeAlerts(p).map((a) => a.code);
const actor = (id: string, over: Partial<Project['actors'][number]> = {}): Project['actors'][number] => ({
  id, name: id, type: 'user', power: 'low', stance: 'neutral', excluded: false, ...over,
});
const pre = (id: string, over: Partial<Project['preconditions'][number]> = {}): Project['preconditions'][number] => ({
  id, text: id, actorId: null, stage: 'start', leadsTo: '', coveredByApp: false, assumption: '', risky: false, test: '', ...over,
});
const role = (id: string, status: Project['roles'][number]['status']): Project['roles'][number] => ({
  id, name: id, reason: '', reasonRefs: [], stage: 'start', status, coveredBy: null,
});
const item = (over: Partial<Project['backlog'][number]>): Project['backlog'][number] => ({
  id: 'b1', stage: 'start', kind: 'feature', featureId: null, preconditionId: null, text: 't', order: 1, ...over,
});

describe('computeCodeAlerts', () => {
  it('returns [] on an empty project with untouched steps', () => {
    expect(computeCodeAlerts(createEmptyProject('T'))).toEqual([]);
  });

  it('ignores steps that are untouched', () => {
    const p = proj([], (p) => { p.team = [{ id: 'm1', name: 'A', skills: [], hoursPerWeek: 1 }]; });
    expect(codes(p)).toEqual([]);
  });

  it('team_no_time', () => {
    const mk = (h: number) => proj(['project'], (p) => {
      p.team = [{ id: 'm1', name: 'A', skills: [], hoursPerWeek: h }, { id: 'm2', name: 'B', skills: [], hoursPerWeek: 1 }];
    });
    const a = computeCodeAlerts(mk(2));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ code: 'team_no_time', step: 1, refs: [], status: 'open' });
    expect(a[0].message).toBe('Aveți împreună 3 ore pe săptămână. Ce ar fi realist de făcut în primele 3 luni?');
    expect(codes(mk(4))).toEqual([]);
    expect(codes(proj(['project'], () => {}))).toEqual([]);
  });

  it('no_evidence', () => {
    expect(codes(proj(['problem'], (p) => { p.problem.statement = 'x'; }))).toEqual(['no_evidence']);
    expect(codes(proj(['problem'], (p) => { p.problem.statement = 'x'; p.problem.evidence = ['e']; }))).toEqual([]);
    expect(codes(proj(['problem'], () => {}))).toEqual([]);
  });

  it('first_in_world', () => {
    expect(codes(proj(['existing'], () => {}))).toEqual(['first_in_world']);
    expect(codes(proj(['existing'], (p) => { p.existing = [{ id: 'e1', name: 'x', url: null, difference: '' }]; }))).toEqual([]);
  });

  it('nobody_excluded', () => {
    expect(codes(proj(['actors'], (p) => { p.actors = [actor('a1', { type: 'institution' })]; }))).toEqual(['nobody_excluded']);
    expect(codes(proj(['actors'], (p) => { p.actors = [actor('a1', { type: 'institution' }), actor('a2', { excluded: true })]; }))).toEqual([]);
    expect(codes(proj(['actors'], (p) => { p.actors = [actor('a1', { type: 'institution', stance: 'opposes' })]; }))).toEqual([]);
    expect(codes(proj(['actors'], () => {}))).toEqual([]);
  });

  it('only_users', () => {
    expect(codes(proj(['actors'], (p) => { p.actors = [actor('a1', { excluded: true })]; }))).toEqual(['only_users']);
    expect(codes(proj(['actors'], (p) => { p.actors = [actor('a1', { type: 'institution', excluded: true })]; }))).toEqual([]);
  });

  it('powerful_actor_unused', () => {
    const base = (p: Project) => {
      p.actors = [actor('a1', { power: 'high', type: 'institution', excluded: true, name: 'Ministerul Z' }), actor('a2', { power: 'low' })];
    };
    const a = computeCodeAlerts(proj(['relations'], base));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ code: 'powerful_actor_unused', step: 6, refs: ['a1'] });
    expect(a[0].message).toBe('Ministerul Z e cel mai puternic din hartă, dar nu apare nicăieri. E aliat, obstacol sau neutru?');
    expect(codes(proj(['relations'], (p) => { base(p); p.relations = [{ id: 'r1', from: 'a1', to: 'a2', type: 'decides', note: '' }]; }))).toEqual([]);
    expect(codes(proj(['preconditions'], (p) => { base(p); p.preconditions = [pre('p1', { actorId: 'a1' })]; }))).toEqual([]);
  });

  it('all_through_app', () => {
    expect(codes(proj(['preconditions'], (p) => { p.preconditions = [pre('p1', { coveredByApp: true })]; }))).toEqual(['all_through_app']);
    expect(codes(proj(['preconditions'], (p) => { p.preconditions = [pre('p1', { coveredByApp: true }), pre('p2')]; }))).toEqual([]);
    expect(codes(proj(['preconditions'], () => {}))).toEqual([]);
  });

  it('hypothesis_without_test', () => {
    const a = computeCodeAlerts(proj(['risks'], (p) => { p.preconditions = [pre('p1', { risky: true }), pre('p2', { risky: true, test: 't' })]; }));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ code: 'hypothesis_without_test', step: 8, refs: ['p1'] });
    expect(codes(proj(['risks'], (p) => { p.preconditions = [pre('p1', { risky: false })]; }))).toEqual([]);
  });

  it('all_on_one', () => {
    const mk = (statuses: Project['roles'][number]['status'][], team = 1) => proj(['roles'], (p) => {
      p.team = Array.from({ length: team }, (_, i) => ({ id: `m${i}`, name: 'A', skills: [], hoursPerWeek: 6 }));
      p.roles = statuses.map((s, i) => role(`r${i}`, s));
    });
    const a = computeCodeAlerts(mk(['covered', 'covered']));
    expect(a).toHaveLength(1);
    expect(a[0].code).toBe('all_on_one');
    expect(a[0].message).toBe('Ai marcat că faci tu și lobby, și juridic, și cod, în 6 ore pe săptămână. E realist?');
    expect(codes(mk(['covered']))).toEqual([]);
    expect(codes(mk(['covered', 'seeking']))).toEqual([]);
    expect(codes(mk(['covered', 'covered'], 2))).toEqual([]);
  });

  it('orphan_feature', () => {
    const feats = (p: Project) => { p.features = [{ id: 'f1', text: 'F' }]; };
    const a = computeCodeAlerts(proj(['backlog'], feats));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ code: 'orphan_feature', step: 10, refs: ['f1'] });
    expect(a[0].message).toBe('Funcția «F» nu ajută la nicio precondiție. La ce ajută? Poate așteaptă în lista „mai târziu”.');
    // linked to a feature but not to a precondition: still orphan
    expect(codes(proj(['backlog'], (p) => { feats(p); p.backlog = [item({ featureId: 'f1' })]; }))).toContain('orphan_feature');
    expect(codes(proj(['backlog'], (p) => { feats(p); p.backlog = [item({ featureId: 'f1', preconditionId: 'p1' })]; }))).not.toContain('orphan_feature');
  });

  it('only_code', () => {
    const k = (kind: Project['backlog'][number]['kind']) => item({ kind });
    expect(codes(proj(['backlog'], (p) => { p.backlog = [k('feature')]; }))).toEqual(['only_code']);
    expect(codes(proj(['backlog'], (p) => { p.backlog = [k('feature'), k('organizing')]; }))).toEqual([]);
    expect(codes(proj(['backlog'], (p) => { p.backlog = [k('test')]; }))).toEqual([]);
    expect(codes(proj(['backlog'], () => {}))).toEqual([]);
  });
});

describe('mergeAlerts', () => {
  const al = (code: Alert['code'], status: Alert['status'], refs: string[] = []): Alert => ({
    code, step: ALERT_MESSAGES[code].step, refs, status, message: 'm',
  });

  it('keeps one copy of an LLM question asked again on a later step', () => {
    const early: Alert = { code: 'build_and_they_come', step: 3, refs: [], status: 'open', message: 'a' };
    const late: Alert = { code: 'build_and_they_come', step: 8, refs: [], status: 'open', message: 'b' };
    const out = mergeAlerts([early], [late], { llmStep: 8 });
    expect(out).toEqual([early]);
  });

  it('keeps dismissed status for existing keys', () => {
    const out = mergeAlerts([al('no_evidence', 'dismissed')], [al('no_evidence', 'open')]);
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe('dismissed');
  });

  it('turns a vanished open code alert into resolved', () => {
    const out = mergeAlerts([al('no_evidence', 'open')], []);
    expect(out).toEqual([{ ...al('no_evidence', 'open'), status: 'resolved' }]);
  });

  it('reopens a resolved alert that reappears', () => {
    expect(mergeAlerts([al('no_evidence', 'resolved')], [al('no_evidence', 'open')])[0].status).toBe('open');
  });

  it('adds new alerts and keys by sorted refs', () => {
    const out = mergeAlerts(
      [al('hypothesis_without_test', 'dismissed', ['b', 'a'])],
      [al('hypothesis_without_test', 'open', ['a', 'b']), al('only_code', 'open')],
    );
    expect(out).toHaveLength(2);
    expect(out.find((a) => a.code === 'hypothesis_without_test')!.status).toBe('dismissed');
  });

  it('leaves LLM alerts untouched', () => {
    const llm = al('magic_leap', 'open');
    expect(mergeAlerts([llm], [])).toEqual([llm]);
    expect(CODE_ALERT_CODES).not.toContain('magic_leap');
  });

  it('de-duplicates fresh alerts by key', () => {
    const out = mergeAlerts([], [al('no_evidence', 'open'), al('no_evidence', 'open')]);
    expect(out).toHaveLength(1);
  });

  describe('refreshing a step\'s LLM alerts', () => {
    const llm = (code: Alert['code'], step: number, refs: string[], status: Alert['status'] = 'open', message = 'm'): Alert => ({
      code, step, refs, status, message,
    });

    it('replaces the open LLM alert of the same code on that step instead of adding another', () => {
      const out = mergeAlerts([llm('magic_leap', 7, ['p1'], 'open', 'vechi')], [llm('magic_leap', 7, ['p2'], 'open', 'nou')], { llmStep: 7 });
      expect(out).toEqual([llm('magic_leap', 7, ['p2'], 'open', 'nou')]);
    });

    it('drops the open LLM alerts of that step that the refresh no longer raises, keeping other steps', () => {
      const other = llm('abstract_change', 4, []);
      const out = mergeAlerts([llm('magic_leap', 7, ['p1']), other], [], { llmStep: 7 });
      expect(out).toEqual([other]);
    });

    it('keeps a dismissed LLM alert dismissed', () => {
      const out = mergeAlerts([llm('magic_leap', 7, ['p1'], 'dismissed')], [llm('magic_leap', 7, ['p2'])], { llmStep: 7 });
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({ refs: ['p2'], status: 'dismissed' });
    });

    it('keeps one LLM alert per code and step from the fresh list', () => {
      const out = mergeAlerts([], [llm('magic_leap', 7, ['p1']), llm('magic_leap', 7, ['p2'])], { llmStep: 7 });
      expect(out).toHaveLength(1);
    });
  });

  it('does not touch dismissed code alerts that vanish', () => {
    expect(mergeAlerts([al('no_evidence', 'dismissed')], [])[0].status).toBe('dismissed');
  });
});
