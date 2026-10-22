import { describe, expect, it } from 'vitest';
import { toPoints } from './points';

describe('toPoints', () => {
  it('keeps a short text whole', () => {
    expect(toPoints('Primăria răspunde. Apoi tace.')).toEqual(['Primăria răspunde. Apoi tace.']);
    expect(toPoints('  ')).toEqual([]);
  });

  it('splits lines and drops their bullets', () => {
    expect(toPoints('- Cetățenii nu știu cui să scrie\n- Uită de cereri\n\n• Nu există date')).toEqual([
      'Cetățenii nu știu cui să scrie',
      'Uită de cereri',
      'Nu există date',
    ]);
  });

  it('splits a long text into sentences, keeping abbreviations whole', () => {
    const text =
      'Cetățenii obișnuiți nu știu cărei instituții să-i trimită cererea pe Legea nr. 544. Apoi uită dacă au primit răspuns, pentru că nu au unde să urmărească cererile. Nu există date publice despre cât de repede răspund instituțiile.';
    expect(toPoints(text)).toEqual([
      'Cetățenii obișnuiți nu știu cărei instituții să-i trimită cererea pe Legea nr. 544.',
      'Apoi uită dacă au primit răspuns, pentru că nu au unde să urmărească cererile.',
      'Nu există date publice despre cât de repede răspund instituțiile.',
    ]);
  });
});
