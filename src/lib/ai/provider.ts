import { StepIdSchema, type StepId } from '../project/schema';
import type { Card, EntityKind } from '../project/entities';
import { AnthropicProvider } from './anthropic';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatProvider {
  complete(messages: ChatMessage[], opts: { json: true }): Promise<string>;
}

// Markers written by prompts.ts / llmAlerts.ts / stepTurn.ts; the fake reads them.
export const STEP_MARKER = 'PAS:';
export const CONTEXT_MARKER = 'CONTEXT:';
export const ALERTS_MARKER = 'SARCINA: alerte';
export const RECAP_MARKER = 'SARCINA: rezumat';

/** Per call; with one retry this stays inside the routes' 60 s maxDuration. */
export const DEEPSEEK_TIMEOUT_MS = 28_000;

export class DeepSeekProvider implements ChatProvider {
  async complete(messages: ChatMessage[]): Promise<string> {
    const base = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ''}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('DeepSeek: empty response');
    return content;
  }
}

/** Replies queued here are returned first, in order; an Error is thrown instead. */
export const fakeQueue: (string | Error)[] = [];

type Context = Partial<Record<StepId, Card[]>>;

function readContext(messages: ChatMessage[]): Card[] {
  const msg = messages.find((m) => m.role === 'user' && m.content.startsWith(CONTEXT_MARKER));
  if (!msg) return [];
  try {
    const ctx = JSON.parse(msg.content.slice(msg.content.indexOf('\n') + 1)) as Context;
    return Object.values(ctx).flatMap((cards) => cards ?? []);
  } catch {
    return [];
  }
}

function readStep(system: string): StepId | null {
  const m = new RegExp(`^${STEP_MARKER} *(\\w+)`, 'm').exec(system);
  const parsed = StepIdSchema.safeParse(m?.[1]);
  return parsed.success ? parsed.data : null;
}

const question = (text: string) => JSON.stringify({ kind: 'question', text });
const proposal = (cards: Card[]) => JSON.stringify({ kind: 'proposal', text: 'Propunere de test.', cards });

/** A minimal proposal that passes validation for the step, given the accepted context. */
export function defaultProposal(step: StepId, context: Card[]): string {
  const ids = (kind: EntityKind) => context.filter((c) => c.kind === kind).map((c) => c.data.id);
  const actors = ids('actor');
  switch (step) {
    case 'project':
      return proposal([
        {
          kind: 'projectInfo',
          data: { id: 'projectInfo', name: 'Proiect de test', description: 'Descriere de test.', stage: 'idea', area: '', links: [], motivation: '', contact: '' },
        },
        { kind: 'teamMember', data: { id: 'm1', name: 'Dev', skills: ['cod'], hoursPerWeek: 5 } },
        { kind: 'feature', data: { id: 'f1', text: 'Funcție de test' } },
      ]);
    case 'problem':
      return proposal([{ kind: 'problem', data: { id: 'problem', statement: 'Problemă de test.', evidence: [], verified: false } }]);
    case 'existing':
      return proposal([{ kind: 'existing', data: { id: 'e1', name: 'Inițiativă de test', url: null, difference: 'Diferență de test.' } }]);
    case 'target':
      return proposal([
        { kind: 'direction', data: { id: 'direction', text: 'Direcție de test.' } },
        { kind: 'targetChange', data: { id: 't1', text: 'Schimbare de test.', signal: 'Semn de test.' } },
      ]);
    case 'actors':
      return proposal([
        { kind: 'actor', data: { id: 'a1', name: 'Actor de test', type: 'user', power: 'low', stance: 'unknown', excluded: false } },
        { kind: 'actor', data: { id: 'a2', name: 'Al doilea actor de test', type: 'institution', power: 'high', stance: 'unknown', excluded: false } },
      ]);
    case 'relations':
      if (actors.length < 2) return question('Ce actori vrei să legi?');
      return proposal([{ kind: 'relation', data: { id: 'r1', from: actors[0], to: actors[1], type: 'influences', note: '' } }]);
    case 'preconditions': {
      const target = ids('targetChange')[0];
      if (!target) return question('Ce schimbare țintești?');
      return proposal([
        {
          kind: 'precondition',
          data: { id: 'p1', text: 'Precondiție de test.', actorId: actors[0] ?? null, stage: 'start', leadsTo: target, coveredByApp: false, assumption: '', risky: false, test: '' },
        },
      ]);
    }
    case 'risks': {
      const pre = ids('precondition')[0];
      if (!pre) return question('Ce precondiții ai?');
      return proposal([{ kind: 'precondition', data: { id: pre, risky: true, test: 'Test de test.' } }]);
    }
    case 'roles': {
      const ref = [...ids('precondition'), ...actors, ...ids('relation')][0];
      if (!ref) return question('Ce actori și precondiții ai?');
      return proposal([
        { kind: 'role', data: { id: 'o1', name: 'Rol de test', reason: 'Motiv de test.', reasonRefs: [ref], stage: 'start', status: 'seeking', coveredBy: null } },
      ]);
    }
    case 'backlog': {
      const feature = ids('feature')[0];
      if (!feature) return question('Ce funcții are aplicația?');
      return proposal([
        { kind: 'backlogItem', data: { id: 'b1', stage: 'start', kind: 'feature', featureId: feature, preconditionId: null, text: 'Funcție de test', order: 1 } },
      ]);
    }
  }
}

export class FakeProvider implements ChatProvider {
  async complete(messages: ChatMessage[]): Promise<string> {
    const next = fakeQueue.shift();
    if (next instanceof Error) throw next;
    if (next !== undefined) return next;
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    if (system.includes(ALERTS_MARKER)) return JSON.stringify({ alerts: [] });
    if (system.includes(RECAP_MARKER)) return JSON.stringify({ text: 'Rezumat de test.' });
    const step = readStep(system);
    if (!step) return question('Despre ce pas vorbim?');
    return defaultProposal(step, readContext(messages));
  }
}

let fake: FakeProvider | undefined;
let deepSeek: DeepSeekProvider | undefined;
let anthropic: AnthropicProvider | undefined;

/** AI_PROVIDER: "anthropic" (Claude, ANTHROPIC_MODEL / ANTHROPIC_EFFORT), "fake" for tests, else DeepSeek. */
export function getProvider(): ChatProvider {
  if (process.env.AI_PROVIDER === 'fake') return (fake ??= new FakeProvider());
  if (process.env.AI_PROVIDER === 'anthropic') return (anthropic ??= new AnthropicProvider());
  return (deepSeek ??= new DeepSeekProvider());
}

/** Retries a throwing provider call once (F8). */
export function withRetry(provider: ChatProvider): ChatProvider {
  return {
    async complete(messages, opts) {
      try {
        return await provider.complete(messages, opts);
      } catch {
        return provider.complete(messages, opts);
      }
    },
  };
}
