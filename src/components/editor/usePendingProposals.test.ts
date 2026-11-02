import { describe, it, expect } from 'vitest';
import { parsePending } from './usePendingProposals';

describe('parsePending', () => {
  it('reads valid cards per step', () => {
    const raw = JSON.stringify({ project: [{ kind: 'feature', data: { id: 'f1', text: 'Hartă' } }] });
    expect(parsePending(raw)).toEqual({ project: [{ kind: 'feature', data: { id: 'f1', text: 'Hartă' } }] });
  });

  it('drops unknown steps, unknown kinds and cards that no longer fit their schema', () => {
    const raw = JSON.stringify({
      nope: [{ kind: 'feature', data: { id: 'f1', text: 'x' } }],
      problem: [{ kind: 'ghost', data: { id: 'g' } }],
      measures: [{ kind: 'measure', data: { id: 'm1', role: 'key', stepId: 'p1', what: '' } }],
    });
    expect(parsePending(raw)).toEqual({});
  });

  it('returns nothing for empty or broken storage', () => {
    expect(parsePending(null)).toEqual({});
    expect(parsePending('{nu e json')).toEqual({});
    expect(parsePending('[1,2]')).toEqual({});
  });
});
