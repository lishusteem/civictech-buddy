/** Above this length a text with several sentences reads better as a list. */
const LONG = 140;
const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;
// A sentence ends at . ! ? followed by a space and a capital or an opening quote; „nr. 544” stays whole.
const SENTENCE_END = /(?<=[.!?…])\s+(?=[A-ZĂÂÎȘŞȚŢ„"«(])/u;

/**
 * Splits a card text into the points it is made of: one per line when the text has lines,
 * one per sentence when it is long, otherwise the text itself.
 */
export function toPoints(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(BULLET, '').trim())
    .filter((l) => l !== '');
  if (lines.length > 1) return lines;
  const one = lines[0] ?? '';
  if (one.length <= LONG) return one === '' ? [] : [one];
  const sentences = one.split(SENTENCE_END).map((s) => s.trim()).filter((s) => s !== '');
  return sentences.length > 1 ? sentences : [one];
}
