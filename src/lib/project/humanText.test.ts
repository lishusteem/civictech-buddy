import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import { nameIndex, polishCard, scrubCardIds, scrubIds } from './humanText';
import type { Project } from './schema';

function proj(): Project {
  const p = createEmptyProject('T');
  p.actors = [
    { id: 'a4', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false },
    { id: 'a6', name: 'ONG-ul Verde', type: 'ngo', power: 'low', stance: 'supports', excluded: false },
  ];
  p.preconditions = [
    { id: 'p1', text: 'Datele sunt publice', actorId: null, stage: 'start', leadsTo: 't1', coveredByApp: false, assumption: '', risky: false, test: '' },
  ];
  p.targetChanges = [
    { id: 't1', text: '', signal: '' },
    { id: 't2', text: 'Instituțiile publice răspund mai repede și complet la toate cererile de informații', signal: '' },
  ];
  return p;
}

describe('scrubIds', () => {
  it('replaces real ids with the entity name, or the quoted text', () => {
    const names = nameIndex(proj());
    expect(scrubIds('a4 are control asupra datelor', names)).toBe('Primăria are control asupra datelor');
    expect(scrubIds('Din cauza lui p1 apar probleme', names)).toBe('Din cauza lui «Datele sunt publice» apar probleme');
    expect(scrubIds('Primăria (a6) ajută', names)).toBe('Primăria (ONG-ul Verde) ajută');
  });

  it('quotes a long text by its first words', () => {
    const names = nameIndex(proj());
    expect(scrubIds('Ajută la t2', names)).toBe('Ajută la «Instituțiile publice răspund mai repede și complet la toate…»');
  });

  it('strips an id with no short name, with its parentheses', () => {
    const names = nameIndex(proj());
    expect(scrubIds('Duce la schimbarea (t1) direct', names)).toBe('Duce la schimbarea direct');
    expect(scrubIds('Doar t1, apoi altceva', names)).toBe('Doar, apoi altceva');
  });

  it('leaves tokens that are not real ids alone', () => {
    const names = nameIndex(proj());
    expect(scrubIds('Folosim h2 și covid19 și a99', names)).toBe('Folosim h2 și covid19 și a99');
  });

  it('also knows ids of the batch being proposed', () => {
    const cards = [{ kind: 'actor' as const, data: { id: 'a9', name: 'Ziarul', type: 'media', power: 'low', stance: 'unknown', excluded: false } }];
    expect(scrubIds('a9 scrie despre asta', nameIndex(proj(), cards))).toBe('Ziarul scrie despre asta');
  });
});

describe('scrubCardIds', () => {
  it('cleans the human text fields and leaves ids and references alone', () => {
    const names = nameIndex(proj());
    const card = {
      kind: 'role' as const,
      data: { id: 'o1', name: 'Jurist', reason: 'p1 spune că a4 decide', reasonRefs: ['p1', 'a4'], stage: 'start', status: 'seeking', coveredBy: null },
    };
    const out = scrubCardIds(card, names);
    expect(out.data.reason).toBe('«Datele sunt publice» spune că Primăria decide');
    expect(out.data.reasonRefs).toEqual(['p1', 'a4']);
    expect(out.data.id).toBe('o1');
  });
});

describe('polishCard', () => {
  it('drops a „Sugestie:” prefix and capitalizes names and sentences', () => {
    const card = polishCard({ kind: 'precondition', data: { id: 'p1', text: ' guvernul aprobă', actorId: null, stage: 'mid', leadsTo: 't1', coveredByApp: false, assumption: '', risky: true, test: 'Sugestie: o cerere 544 către minister' } });
    expect(card.data).toMatchObject({ text: 'Guvernul aprobă', test: 'O cerere 544 către minister', assumption: '' });
    const actor = polishCard({ kind: 'actor', data: { id: 'a1', name: 'cetățenii', type: 'user', power: 'low', stance: 'supports', excluded: false } });
    expect(actor.data).toMatchObject({ name: 'Cetățenii' });
  });
});
