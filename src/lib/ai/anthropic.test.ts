import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));

const { AnthropicProvider, toAnthropic } = await import('./anthropic');

afterEach(() => {
  create.mockReset();
  vi.unstubAllEnvs();
});

describe('toAnthropic', () => {
  it('lifts system messages out and joins consecutive same-role turns', () => {
    const out = toAnthropic([
      { role: 'system', content: 'A' },
      { role: 'system', content: 'B' },
      { role: 'user', content: 'context' },
      { role: 'user', content: 'Ce face aplicația:' },
      { role: 'assistant', content: 'Întrebare' },
    ]);
    expect(out.system).toBe('A\n\nB');
    expect(out.messages).toEqual([
      { role: 'user', content: 'context\n\nCe face aplicația:' },
      { role: 'assistant', content: 'Întrebare' },
    ]);
  });

  it('opens with a user turn when the history starts with the assistant', () => {
    expect(toAnthropic([{ role: 'assistant', content: 'x' }]).messages[0].role).toBe('user');
  });
});

describe('AnthropicProvider', () => {
  it('asks Opus 5.5 at medium effort by default and returns the text blocks', async () => {
    create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"kind":"question","text":"?"}' }] });
    const out = await new AnthropicProvider().complete([{ role: 'system', content: 'S' }, { role: 'user', content: 'u' }]);
    expect(out).toBe('{"kind":"question","text":"?"}');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-opus-5-5', output_config: { effort: 'medium' } }));
  });

  it('follows ANTHROPIC_MODEL and ANTHROPIC_EFFORT, ignoring an unknown effort', async () => {
    create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] });
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-sonnet-5-5');
    vi.stubEnv('ANTHROPIC_EFFORT', 'high');
    await new AnthropicProvider().complete([{ role: 'user', content: 'u' }]);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ model: 'claude-sonnet-5-5', output_config: { effort: 'high' } }));
    vi.stubEnv('ANTHROPIC_EFFORT', 'turbo');
    await new AnthropicProvider().complete([{ role: 'user', content: 'u' }]);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ output_config: { effort: 'medium' } }));
  });

  it('throws on a refusal, so the route falls back like any failed call', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    await expect(new AnthropicProvider().complete([{ role: 'user', content: 'u' }])).rejects.toThrow('refusal');
  });
});
