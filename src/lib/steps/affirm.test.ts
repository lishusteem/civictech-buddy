import { describe, expect, it } from 'vitest';
import { isAffirmative } from './affirm';

describe('isAffirmative', () => {
  it.each(['da', 'Da!', 'ok', 'OK.', 'okay', 'bine', 'e bine', 'Corect', 'exact', 'perfect', 'de acord', 'Sună bine', 'accept',
    'acceptă', 'Acceptă tot', 'salvează', 'Da, e corect.', 'da e bine', 'Da, acceptă', '  da  '])('accepts %j', (text) => {
    expect(isAffirmative(text)).toBe(true);
  });

  it.each(['da, dar adaugă și ANAF', 'nu', 'dar', 'Nu știu', 'da da da da da', '', 'corect'.padEnd(31, ' ') + 'x',
    'propune rezumatul acum'])('rejects %j', (text) => {
    expect(isAffirmative(text)).toBe(false);
  });

  it('rejects anything over 30 characters even if it normalises to a match', () => {
    expect(isAffirmative('da' + '!'.repeat(29))).toBe(false);
    expect(isAffirmative('da' + '!'.repeat(28))).toBe(true);
  });
});
