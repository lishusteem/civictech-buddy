import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import { removeEntity, upsertEntity } from './entities';
import { computeStale } from './stale';
import type { Project } from './schema';

function fixture(): Project {
  let p = createEmptyProject('T');
  p = upsertEntity(p, {
    kind: 'actor',
    data: { id: 'a1', name: 'A', type: 'user', power: 'low', stance: 'unknown', excluded: false },
  });
  p = upsertEntity(p, { kind: 'relation', data: { id: 'r1', from: 'a1', to: 'a2', type: 'funds', note: '' } });
  p = upsertEntity(p, {
    kind: 'precondition',
    data: {
      id: 'p1', text: 'one', actorId: 'a1', stage: 'start', leadsTo: '',
      coveredByApp: false, assumption: '', risky: false, test: '',
    },
  });
  p = upsertEntity(p, {
    kind: 'role',
    data: { id: 'o1', name: 'R', reason: '', reasonRefs: ['p1', 'a1'], stage: 'start', status: 'seeking', coveredBy: null },
  });
  p = upsertEntity(p, {
    kind: 'backlogItem',
    data: { id: 'b1', stage: 'start', kind: 'test', featureId: null, preconditionId: 'p1', text: 'b', order: 0 },
  });
  return p;
}

describe('computeStale', () => {
  it('deleting an actor marks its relation, precondition and role', () => {
    const prev = fixture();
    const next = removeEntity(prev, 'actor', 'a1');
    expect(computeStale(prev, next).sort()).toEqual(['o1', 'p1', 'r1']);
  });

  it('modifying a precondition marks the backlog item that points at it', () => {
    const prev = fixture();
    const next = upsertEntity(prev, { kind: 'precondition', data: { ...prev.preconditions[0], text: 'changed' } });
    const stale = computeStale(prev, next);
    expect(stale).toContain('b1');
    expect(stale).toContain('o1');
    expect(stale).not.toContain('p1');
  });

  it('returns [] when nothing referenced changed', () => {
    const prev = fixture();
    const next = upsertEntity(prev, { kind: 'backlogItem', data: { ...prev.backlog[0], text: 'edited' } });
    expect(computeStale(prev, next)).toEqual([]);
  });

  it('returns [] for identical projects', () => {
    const p = fixture();
    expect(computeStale(p, structuredClone(p))).toEqual([]);
  });
});
