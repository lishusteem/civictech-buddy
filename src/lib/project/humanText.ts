import { allListEntities, type Card } from './entities';
import type { Project } from './schema';

/** Fields of a card that hold human-readable text (never ids). */
export const HUMAN_TEXT_FIELDS = ['reason', 'text', 'note', 'difference', 'signal', 'assumption', 'test'] as const;

/** id -> how to call that entity in a sentence ('' when there is no short way). */
export type NameIndex = Map<string, string>;

const ID_TOKEN = /\b[a-z]{1,2}\d+\b/g;
const MAX_QUOTED = 60;

function labelOf(data: Record<string, unknown>): string {
  if (typeof data.name === 'string' && data.name.trim() !== '') return data.name.trim();
  if (typeof data.text === 'string') {
    const text = data.text.trim();
    if (text !== '' && text.length <= MAX_QUOTED) return `«${text}»`;
    // A long text is quoted by its first words, so a removed id never leaves a hole in the sentence.
    if (text !== '') return `«${text.slice(0, MAX_QUOTED).replace(/\s+\S*$/, '')}…»`;
  }
  return '';
}

/** Names of every list entity in the project, then of the cards in `batch` for ids the project does not use. */
export function nameIndex(p: Project, batch: Card[] = []): NameIndex {
  const index: NameIndex = new Map();
  for (const { entity } of allListEntities(p)) index.set(entity.id, labelOf(entity));
  for (const c of batch) if (!index.has(c.data.id)) index.set(c.data.id, labelOf(c.data));
  return index;
}

/** Replaces standalone ids that belong to real entities with the entity name; without a name, removes them. */
export function scrubIds(text: string, names: NameIndex): string {
  let stripped = false;
  const replaced = text.replace(ID_TOKEN, (token) => {
    const name = names.get(token);
    if (name === undefined) return token;
    if (name === '') stripped = true;
    return name;
  });
  if (!stripped) return replaced;
  // Drop the leftovers of a removed id: empty parentheses and stray spaces before punctuation.
  return replaced
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

const HEDGE = /^\s*(sugestie|propunere|exemplu)\s*[:\-–—]\s*/i;
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('ro') + s.slice(1);

/** Tidies the human text of a card: trimmed, no „Sugestie:” prefix, a capital first letter on names and sentences. */
export function polishCard(card: Card): Card {
  const data: Record<string, unknown> = { ...card.data };
  for (const f of [...HUMAN_TEXT_FIELDS, 'name', 'statement'] as const) {
    if (typeof data[f] !== 'string') continue;
    const s = (data[f] as string).trim().replace(HEDGE, '');
    data[f] = /^https?:/.test(s) ? s : capitalize(s);
  }
  return { kind: card.kind, data: data as Card['data'] };
}

/** Same card with the ids removed from its human text fields; ids and references are untouched. */
export function scrubCardIds(card: Card, names: NameIndex): Card {
  const data: Record<string, unknown> = { ...card.data };
  for (const f of HUMAN_TEXT_FIELDS) if (typeof data[f] === 'string') data[f] = scrubIds(data[f] as string, names);
  return { kind: card.kind, data: data as Card['data'] };
}
