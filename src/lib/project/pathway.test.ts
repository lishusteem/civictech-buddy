import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import { chainTo, levelOf, upstreamOf } from './pathway';
import type { Project } from './schema';

const pre = (id: string, leadsTo: string, over: Partial<Project['preconditions'][number]> = {}): Project['preconditions'][number] => ({
  id, text: id, actorId: null, stage: 'start', leadsTo, coveredByApp: false, assumption: '', risky: false, test: '', ...over,
});

function proj(): Project {
  const p = createEmptyProject('T');
  p.team = [{ id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 4 }];
  p.targetChanges = [{ id: 't1', text: 'T', signal: '' }, { id: 't2', text: 'U', signal: '' }];
  p.preconditions = [
    pre('o1', 'c1', { level: 'output' }),
    pre('c1', 'c2'),
    pre('c2', 't1'),
    pre('c3', 't1'),
    pre('x1', 't2'),
  ];
  return p;
}

describe('levelOf', () => {
  it('uses the stored level, else the team or the app as the sign of an output', () => {
    const p = proj();
    expect(levelOf(p, pre('a', 't1', { level: 'outcome', coveredByApp: true }))).toBe('outcome');
    expect(levelOf(p, pre('a', 't1', { coveredByApp: true }))).toBe('output');
    expect(levelOf(p, pre('a', 't1', { actorId: 'm1' }))).toBe('output');
    expect(levelOf(p, pre('a', 't1', { actorId: 'a1' }))).toBe('outcome');
  });
});

describe('pathways', () => {
  it('finds everything upstream of a target', () => {
    expect(upstreamOf(proj(), 't1').map((c) => c.id).sort()).toEqual(['c1', 'c2', 'c3', 'o1']);
    expect(upstreamOf(proj(), 't2').map((c) => c.id)).toEqual(['x1']);
  });

  it('tells the chain that starts with an output, first step first', () => {
    expect(chainTo(proj(), 't1').map((c) => c.id)).toEqual(['o1', 'c1', 'c2']);
  });

  it('survives a loop in older data', () => {
    const p = proj();
    p.preconditions.push(pre('l1', 'l2'), pre('l2', 'l1'));
    expect(chainTo(p, 'l1').length).toBeGreaterThan(0);
  });
});
