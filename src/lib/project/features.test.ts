import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import { isFeatureWorking, isOutcomeCopy, isPendingItem } from './features';

const item = (featureId: string | null, kind: 'feature' | 'test' = 'feature') => ({
  id: 'b1', stage: 'start' as const, kind, featureId, preconditionId: null, text: 'x', order: 1,
});

describe('isFeatureWorking', () => {
  it('follows the done flag, and counts unmarked functions of a live project as working', () => {
    const p = createEmptyProject('T');
    p.features = [
      { id: 'f1', text: 'a', done: true },
      { id: 'f2', text: 'b', done: false },
      { id: 'f3', text: 'c' },
    ];
    expect(isFeatureWorking(p, 'f1')).toBe(true);
    expect(isFeatureWorking(p, 'f2')).toBe(false);
    expect(isFeatureWorking(p, 'f3')).toBe(false);
    p.project.stage = 'live';
    expect(isFeatureWorking(p, 'f2')).toBe(false);
    expect(isFeatureWorking(p, 'f3')).toBe(true);
    expect(isFeatureWorking(p, 'nope')).toBe(false);
  });

  it('treats only working functions as not pending', () => {
    const p = createEmptyProject('T');
    p.features = [{ id: 'f1', text: 'a', done: true }];
    expect(isPendingItem(p, item('f1'))).toBe(false);
    expect(isPendingItem(p, item(null, 'test'))).toBe(true);
  });
});

describe('isOutcomeCopy', () => {
  it('spots an organizing item that only repeats an outcome step', () => {
    const p = createEmptyProject('T');
    p.preconditions = [
      { id: 'p1', text: 'Guvernul adoptă penalizări', actorId: null, stage: 'mid', leadsTo: 't1', coveredByApp: false, assumption: '', risky: false, test: '', level: 'outcome' },
      { id: 'p2', text: 'Coaliție de ONG-uri', actorId: null, stage: 'mid', leadsTo: 'p1', coveredByApp: false, assumption: '', risky: false, test: '', level: 'output' },
    ];
    const org = (preconditionId: string, text: string) => ({ id: 'b', stage: 'mid' as const, kind: 'organizing' as const, featureId: null, preconditionId, text, order: 1 });
    expect(isOutcomeCopy(p, org('p1', 'Guvernul adoptă penalizări'))).toBe(true);
    expect(isOutcomeCopy(p, org('p1', 'Cerere 544 la minister'))).toBe(false);
    expect(isOutcomeCopy(p, org('p2', 'Coaliție de ONG-uri'))).toBe(false);
  });
});
