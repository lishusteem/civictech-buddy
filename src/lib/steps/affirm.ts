/** Lowercase, no diacritics, no punctuation, single spaces (the same normalisation as the "Nu știu" check). */
export function normalizeReply(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const AFFIRM = new Set([
  'da',
  'ok',
  'okay',
  'bine',
  'e bine',
  'corect',
  'exact',
  'perfect',
  'de acord',
  'suna bine',
  'accept',
  'accepta',
  'accepta tot',
  'salveaza',
  'da e corect',
  'da e bine',
  'da accepta',
]);

/**
 * A short "yes" to pending proposals (UX spec §3.3, P0-3): at most 4 words and 30 characters,
 * and one of the affirm phrases. "da, dar adaugă X" is not one; it goes to the AI.
 */
export function isAffirmative(text: string): boolean {
  const t = text.trim();
  if (t === '' || t.length > 30) return false;
  const n = normalizeReply(t);
  return n.split(' ').length <= 4 && AFFIRM.has(n);
}
