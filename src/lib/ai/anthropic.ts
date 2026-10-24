import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, ChatProvider } from './provider';

/** Per call. Opus thinks before answering; with stepTurn's one retry this stays inside the routes' maxDuration. */
export const ANTHROPIC_TIMEOUT_MS = 55_000;

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

/**
 * The system messages become the top-level system prompt (cached: it repeats across a step's turns);
 * the rest alternate user/assistant, with consecutive same-role messages joined.
 */
export function toAnthropic(messages: ChatMessage[]): { system: string; messages: Anthropic.MessageParam[] } {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const turns: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content = `${last.content as string}\n\n${m.content}`;
    else turns.push({ role: m.role, content: m.content });
  }
  // The API wants the conversation to open with the user.
  if (turns[0]?.role === 'assistant') turns.unshift({ role: 'user', content: '(începe)' });
  return { system, messages: turns };
}

export class AnthropicProvider implements ChatProvider {
  private client = new Anthropic({ timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: 1 });

  async complete(messages: ChatMessage[]): Promise<string> {
    const { system, messages: turns } = toAnthropic(messages);
    const effort = EFFORTS.find((e) => e === process.env.ANTHROPIC_EFFORT) ?? 'medium';
    const res = await this.client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
      max_tokens: 16000,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: turns,
      output_config: { effort },
    });
    if (res.stop_reason === 'refusal') throw new Error('Anthropic: refusal');
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    if (text.trim() === '') throw new Error('Anthropic: empty response');
    return text;
  }
}
