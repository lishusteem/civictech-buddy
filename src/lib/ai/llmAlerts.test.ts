import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import type { ChatMessage, ChatProvider } from './provider';
import { runLlmAlerts } from './llmAlerts';

function scripted(reply: string) {
  const calls: ChatMessage[][] = [];
  const provider: ChatProvider = {
    async complete(messages) {
      calls.push(messages);
      return reply;
    },
  };
  return { provider, calls };
}

describe('runLlmAlerts', () => {
  it('on problem, ignores a magic_leap code from the model', async () => {
    const { provider } = scripted(
      JSON.stringify({
        alerts: [
          { code: 'magic_leap', refs: [], message: 'De ce ar duce A la B?' },
          { code: 'solution_in_problem', refs: [], message: 'Ce pățesc oamenii azi?' },
        ],
      }),
    );
    const alerts = await runLlmAlerts(createEmptyProject('x'), 'problem', provider);
    expect(alerts).toEqual([
      { code: 'solution_in_problem', step: 2, refs: [], status: 'open', message: 'Ce pățesc oamenii azi?' },
    ]);
  });

  it('returns [] for invalid JSON, with a single call', async () => {
    const { provider, calls } = scripted('not json');
    expect(await runLlmAlerts(createEmptyProject('x'), 'target', provider)).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('returns [] without calling the model on a step with no LLM alerts', async () => {
    const { provider, calls } = scripted('{"alerts":[]}');
    expect(await runLlmAlerts(createEmptyProject('x'), 'actors', provider)).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('uses the step number of the current step and the default message when missing', async () => {
    const { provider } = scripted(JSON.stringify({ alerts: [{ code: 'abstract_change', refs: ['p1'] }] }));
    const alerts = await runLlmAlerts(createEmptyProject('x'), 'preconditions', provider);
    expect(alerts).toEqual([
      { code: 'abstract_change', step: 7, refs: ['p1'], status: 'open', message: 'Cine anume face ceva diferit? Ce ai vedea concret?' },
    ]);
  });
});
