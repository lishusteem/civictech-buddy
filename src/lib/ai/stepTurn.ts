import type { z, ZodError } from 'zod';
import {
  allListEntities,
  ENTITY_SCHEMAS,
  isSingleton,
  LIST_KEY,
  normalizeCardIds,
  STEP_ENTITIES,
  type Card,
  type EntityKind,
  type ListKind,
} from '../project/entities';
import { ProjectSchema, type Message, type Project, type StepId } from '../project/schema';
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
  return { card: { kind, data: { ...parsed, id: isSingleton(kind) ? kind : String(parsed.id) } } };
}

type HasId = (id: unknown, ...kinds: EntityKind[]) => boolean;

/** id -> kinds, over the project's list entities and the proposal batch. */
function idIndex(p: Project, cards: Card[]): HasId {
  const index = new Map<string, Set<EntityKind>>();
  const add = (id: string, kind: EntityKind) => (index.get(id) ?? index.set(id, new Set()).get(id)!).add(kind);
  for (const { kind, entity } of allListEntities(p)) add(entity.id, kind);
  for (const c of cards) add(c.data.id, c.kind);
  return (id, ...kinds) => typeof id === 'string' && kinds.some((k) => index.get(id)?.has(k));
}

/** A dangling reference makes the card invalid. */
function refError(card: Card, has: HasId): string | null {
  const d = card.data;
  const bad = (field: string, what: string) =>
    `Cardul ${card.kind} (${d.id}): ${field} "${String(d[field])}" nu e id-ul unui ${what} din context sau din propunere.`;
  switch (card.kind) {
    case 'relation':
      if (!has(d.from, 'actor')) return bad('from', 'actor');
      if (!has(d.to, 'actor')) return bad('to', 'actor');
      return null;
    case 'precondition':
      if (d.actorId !== null && !has(d.actorId, 'actor')) return bad('actorId', 'actor');
      if (d.leadsTo === d.id || !has(d.leadsTo, 'precondition', 'targetChange')) {
        return bad('leadsTo', 'precondiții sau al unei schimbări țintă');
      }
      return null;
    case 'role':
      if (d.coveredBy !== null && !has(d.coveredBy, 'teamMember')) return bad('coveredBy', 'membru al echipei');
      return null;
    case 'backlogItem':
      if (d.kind === 'feature') {
        if (!has(d.featureId, 'feature')) {
          return `${bad('featureId', 'funcții')} Un element "feature" trebuie să folosească o funcție existentă; nu inventa funcții.`;
        }
      } else if (d.featureId !== null) {
        return `Cardul backlogItem (${d.id}): un element "${String(d.kind)}" are featureId null.`;
      }
      if (d.preconditionId !== null && !has(d.preconditionId, 'precondition')) return bad('preconditionId', 'precondiții');
      return null;
    default:
      return null;
  }
}

const listMax = (kind: ListKind): number =>
  (ProjectSchema.shape[LIST_KEY[kind]] as z.ZodArray<z.ZodTypeAny>)._def.maxLength?.value ?? Infinity;

/** Keeps the new cards of each list kind within the ProjectSchema max; the excess is invalid. */
function capErrors(p: Project, cards: Card[]): { kept: Card[]; errors: string[] } {
  const existing = new Map<EntityKind, Set<string>>();
  for (const { kind, entity } of allListEntities(p)) {
    (existing.get(kind) ?? existing.set(kind, new Set()).get(kind)!).add(entity.id);
  }
  const newIds = new Map<EntityKind, Set<string>>();
  const errors = new Set<string>();
  const kept = cards.filter((c, i) => {
    if (isSingleton(c.kind)) return true;
    const have = existing.get(c.kind) ?? new Set<string>();
    if (have.has(c.data.id)) return true; // an update
    const fresh = newIds.get(c.kind) ?? newIds.set(c.kind, new Set()).get(c.kind)!;
    const key = c.data.id || `#${i}`;
    if (fresh.has(key)) return true;
    const max = listMax(c.kind as ListKind);
    if (have.size + fresh.size + 1 > max) {
      errors.add(`Proiectul poate avea cel mult ${max} carduri ${c.kind}; are deja ${have.size}. Modifică-le pe cele existente (același id) în loc să adaugi altele.`);
      return false;
    }
    fresh.add(key);
    return true;
  });
  return { kept, errors: [...errors] };
}

/** Batch-level checks: references and list caps. Invalid cards are removed. */
function checkBatch(p: Project, step: StepId, cards: Card[]): { cards: Card[]; errors: string[] } {
  const errors: string[] = [];
  // On risks only `risky`/`test` change; the rest is the existing precondition as is.
  const has = idIndex(p, cards);
  const referenced =
    step === 'risks'
      ? cards
      : cards.filter((c) => {
          const e = refError(c, has);
          if (e) errors.push(e);
          return !e;
        });
  const capped = capErrors(p, referenced);
  return { cards: capped.kept, errors: [...errors, ...capped.errors] };
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
  const batch = checkBatch(p, step, cards);
  errors.push(...batch.errors);
  const text = typeof obj.text === 'string' ? obj.text : '';
  if (errors.length > 0) return { ok: false, error: errors.join(' '), cards: batch.cards };
  return { ok: true, turn: { kind: 'proposal', text, cards: batch.cards } };
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
