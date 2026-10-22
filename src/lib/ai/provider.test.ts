import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeepSeekProvider } from './provider';

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
