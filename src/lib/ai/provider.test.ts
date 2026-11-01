import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeepSeekProvider, defaultProposal } from './provider';
import type { Card } from '../project/entities';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DeepSeekProvider', () => {
  it('aborts a call after 28 s', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }),
    );
    await new DeepSeekProvider().complete([{ role: 'user', content: 'x' }]);
    expect(timeout).toHaveBeenCalledWith(28_000);
  });
});

describe('defaultProposal measures', () => {
  it('proposes a measure on a precondition from the context', () => {
    const pre: Card = { kind: 'precondition', data: { id: 'p1', text: 'x' } };
    const out = JSON.parse(defaultProposal('measures', [pre]));
    expect(out.kind).toBe('proposal');
    expect(out.cards[0].data.stepId).toBe('p1');
  });
});
