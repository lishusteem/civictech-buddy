import type { ZodError } from 'zod';
import {
  allListEntities,
  ENTITY_SCHEMAS,
  isSingleton,
  normalizeCardIds,
  STEP_ENTITIES,
  type Card,
  type EntityKind,
} from '../project/entities';
import type { Message, Project, StepId } from '../project/schema';
import { buildMessages, contextMessage, loadPrompt } from './prompts';
import { RECAP_MARKER, type ChatMessage, type ChatProvider } from './provider';

export type AiTurn =
  | { kind: 'question'; text: string }
  | { kind: 'proposal'; text: string; cards: Card[] }
  | { kind: 'fallback'; text: string; cards: Card[] };

export const FALLBACK_TEXT = 'N-am reușit să structurez răspunsul. Completează direct în formular.';

type Parsed =
  | { ok: true; turn: { kind: 'question'; text: string } | { kind: 'proposal'; text: string; cards: Card[] } }
  | { ok: false; error: string; cards: Card[] };

type CardResult = { card: Card } | { error: string } | { drop: true };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function issuesText(kind: string, id: unknown, err: ZodError): string {
  const where = typeof id === 'string' && id ? ` (${id})` : '';
  const issues = err.issues.map((i) => `${i.path.join('.') || 'data'}: ${i.message}`).join('; ');
  return `Cardul ${kind}${where} nu respectă forma: ${issues}.`;
}

function validateCard(raw: unknown, p: Project, step: StepId): CardResult {
  const allowed = STEP_ENTITIES[step];
  if (!isObject(raw) || typeof raw.kind !== 'string') return { error: 'Un card nu are forma {"kind", "data"}.' };
  if (!allowed.includes(raw.kind as EntityKind)) {
    return { error: `Tipul de card "${raw.kind}" nu e permis la pasul ${step}. Tipuri permise: ${allowed.join(', ')}.` };
  }
  const kind = raw.kind as EntityKind;
  if (!isObject(raw.data)) return { error: `Cardul ${kind} nu are câmpul "data" ca obiect.` };
  let data: Record<string, unknown> = raw.data;

  if (kind === 'direction') {
    const r = ENTITY_SCHEMAS.direction.safeParse(data.text);
    if (!r.success) return { error: issuesText(kind, null, r.error) };
    return { card: { kind, data: { id: 'direction', text: r.data } } };
  }

  // The risks step may only change `risky` and `test` of an existing precondition.
  if (step === 'risks') {
    const existing = p.preconditions.find((c) => c.id === data.id);
    if (!existing) return { drop: true };
    data = {
      ...existing,
      risky: 'risky' in data ? data.risky : existing.risky,
      test: 'test' in data ? data.test : existing.test,
    };
  }

  const candidate = isSingleton(kind) ? data : { ...data, id: typeof data.id === 'string' ? data.id : '' };
  const r = ENTITY_SCHEMAS[kind].safeParse(candidate);
  if (!r.success) return { error: issuesText(kind, data.id, r.error) };
  const parsed = r.data as Record<string, unknown>;
  const card: Card = { kind, data: { ...parsed, id: isSingleton(kind) ? kind : String(parsed.id) } };

  if (kind === 'backlogItem') {
    const { featureId, preconditionId } = parsed;
    if (featureId !== null && !p.features.some((f) => f.id === featureId)) {
      return { error: `featureId "${String(featureId)}" nu există în funcțiile proiectului. Folosește doar funcțiile din context.` };
    }
    if (preconditionId !== null && !p.preconditions.some((c) => c.id === preconditionId)) {
      return { error: `preconditionId "${String(preconditionId)}" nu există în precondițiile proiectului.` };
    }
  }
  return { card };
}

/** Drops roles whose reasonRefs are empty or point to nothing in the project or the batch. */
function dropUnanchoredRoles(p: Project, cards: Card[]): Card[] {
  const known = new Set<string>(allListEntities(p).map((e) => e.entity.id));
  for (const c of cards) known.add(c.data.id);
  return cards.filter((c) => {
    if (c.kind !== 'role') return true;
    const refs = c.data.reasonRefs as string[];
    return refs.length > 0 && refs.every((r) => r !== c.data.id && known.has(r));
  });
}

function parseTurn(raw: string, p: Project, step: StepId): Parsed {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Răspunsul nu e JSON valid.', cards: [] };
  }
  if (!isObject(obj)) return { ok: false, error: 'Răspunsul trebuie să fie un obiect JSON.', cards: [] };

  if (obj.kind === 'question') {
    if (typeof obj.text !== 'string' || obj.text.trim() === '') {
      return { ok: false, error: 'O întrebare trebuie să aibă câmpul "text".', cards: [] };
    }
    return { ok: true, turn: { kind: 'question', text: obj.text } };
  }
  if (obj.kind !== 'proposal' || !Array.isArray(obj.cards)) {
    return { ok: false, error: 'Câmpul "kind" trebuie să fie "question" sau "proposal" (cu "cards" ca listă).', cards: [] };
  }

  const cards: Card[] = [];
  const errors: string[] = [];
  for (const raw of obj.cards) {
    const r = validateCard(raw, p, step);
    if ('card' in r) cards.push(r.card);
    else if ('error' in r) errors.push(r.error);
  }
  const text = typeof obj.text === 'string' ? obj.text : '';
  if (errors.length > 0) return { ok: false, error: errors.join(' '), cards };
  return { ok: true, turn: { kind: 'proposal', text, cards } };
}

function finish(p: Project, cards: Card[]): Card[] {
  return normalizeCardIds(p, dropUnanchoredRoles(p, cards));
}

export async function runStepTurn(
  p: Project,
  step: StepId,
  chat: Message[],
  provider: ChatProvider,
): Promise<AiTurn> {
  const messages = buildMessages(p, step, chat);
  const first = await provider.complete(messages, { json: true });
  let result = parseTurn(first, p, step);

  if (!result.ok) {
    const retry: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: first.slice(0, 4000) },
      {
        role: 'user',
        content: `Răspunsul tău nu a putut fi folosit: ${result.error} Răspunde din nou doar cu JSON valid, în forma cerută.`,
      },
    ];
    const second = await provider.complete(retry, { json: true });
    result = parseTurn(second, p, step);
    if (!result.ok) return { kind: 'fallback', text: FALLBACK_TEXT, cards: finish(p, result.cards) };
  }

  const { turn } = result;
  if (turn.kind === 'question') return turn;
  return { kind: 'proposal', text: turn.text, cards: finish(p, turn.cards) };
}

/** Up to 3 lines recapping the project, for coming back via the edit link (F7). '' on any error. */
export async function summarizeProject(p: Project, provider: ChatProvider): Promise<string> {
  try {
    const raw = await provider.complete(
      [{ role: 'system', content: `${loadPrompt('recap.md')}\n\n${RECAP_MARKER}` }, contextMessage(p)],
      { json: true },
    );
    const obj: unknown = JSON.parse(raw);
    if (!isObject(obj) || typeof obj.text !== 'string') return '';
    return obj.text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '')
      .slice(0, 3)
      .join('\n');
  } catch {
    return '';
  }
}
