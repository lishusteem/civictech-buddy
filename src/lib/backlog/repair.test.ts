import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import type { Project } from '../project/schema';
import { repairBacklogLinks } from './repair';

const item = (id: string, over: Partial<Project['backlog'][number]> = {}): Project['backlog'][number] => ({
  id, stage: 'start', kind: 'feature', featureId: null, preconditionId: null, text: 't', order: 1, ...over,
});

function proj(): Project {
  const p = createEmptyProject('T');
  p.features = [{ id: 'f1', text: 'Harta parcurilor' }, { id: 'f2', text: 'Alerte' }];
  return p;
}

describe('repairBacklogLinks', () => {
  it('returns the same project when nothing is wrong', () => {
    const p = proj();
    p.backlog = [item('b1', { featureId: 'f1', text: 'x' }), item('b2', { kind: 'organizing' })];
    expect(repairBacklogLinks(p)).toBe(p);
  });

  it('relinks an item pointing at itself when its text equals a feature text', () => {
    const p = proj();
    p.backlog = [item('b12', { featureId: 'b12', text: ' harta parcurilor ' })];
    const out = repairBacklogLinks(p);
    expect(out.backlog[0].featureId).toBe('f1');
    expect(p.backlog[0].featureId).toBe('b12'); // input untouched
  });

  it('sets featureId to null when no feature has the same text', () => {
    const p = proj();
    p.backlog = [
      item('b3', { featureId: 'b3', text: 'altceva' }),
      item('b4', { featureId: 'p9', text: 'Alerte' }),
      item('b5', { featureId: 'zzz', text: 'nimic' }),
    ];
    const out = repairBacklogLinks(p);
    expect(out.backlog.map((b) => b.featureId)).toEqual([null, 'f2', null]);
  });
});
