import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import { appendOrganizingItems, buildOrganizingItems } from './organizing';

function sample() {
  const p = createEmptyProject('T');
  p.preconditions = [
    { id: 'p1', text: 'Primăria publică datele', actorId: null, stage: 'mid', leadsTo: '', coveredByApp: true, assumption: '', risky: true, test: 'Sună la primărie' },
  ];
  p.roles = [{ id: 'r1', name: 'Jurist', reason: '', reasonRefs: [], stage: 'mid', status: 'seeking', coveredBy: null }];
  p.toFindOut = [{ id: 'q1', step: 'problem', text: 'Cine ține registrul?' }];
  return p;
}

describe('buildOrganizingItems', () => {
  it('builds test, role and toFindOut items with exact texts', () => {
    const items = buildOrganizingItems(sample());
    expect(items).toHaveLength(3);
    expect(items.find((i) => i.kind === 'test')).toMatchObject({ text: 'Sună la primărie', stage: 'mid', preconditionId: 'p1', featureId: null });
    expect(items.find((i) => i.text === 'Găsește: Jurist')).toMatchObject({ kind: 'organizing', stage: 'mid', preconditionId: null });
    expect(items.find((i) => i.text === 'Află: Cine ține registrul?')).toMatchObject({ kind: 'organizing', stage: 'start' });
    expect(new Set(items.map((i) => i.id)).size).toBe(3);
    expect(items.map((i) => i.order)).toEqual([1, 2, 3]);
  });

  it('is idempotent against existing backlog', () => {
    const p = sample();
    p.backlog = buildOrganizingItems(p);
    expect(buildOrganizingItems(p)).toEqual([]);
  });

  it('continues ids and order after existing items', () => {
    const p = sample();
    p.backlog = [{ id: 'b7', stage: 'start', kind: 'feature', featureId: 'f1', preconditionId: null, text: 'x', order: 9 }];
    const items = buildOrganizingItems(p);
    expect(items.map((i) => i.id)).toEqual(['b8', 'b9', 'b10']);
    expect(items.map((i) => i.order)).toEqual([10, 11, 12]);
  });

  it('handles partner roles and outputs the team delivers outside the app, but not outcomes', () => {
    const p = createEmptyProject('T');
    p.roles = [{ id: 'r1', name: 'Lobby', reason: '', reasonRefs: [], stage: 'start', status: 'partner', coveredBy: null }];
    p.preconditions = [
      { id: 'p1', text: 'Coaliția a 5 ONG-uri', actorId: null, stage: 'mid', leadsTo: '', coveredByApp: false, assumption: '', risky: false, test: '', level: 'output' },
      { id: 'p2', text: 'Guvernul adoptă penalizări', actorId: 'a1', stage: 'mid', leadsTo: '', coveredByApp: false, assumption: '', risky: false, test: '', level: 'outcome' },
    ];
    const items = buildOrganizingItems(p);
    expect(items.map((i) => i.text)).toEqual(['Vorbește cu un partener pentru: Lobby', 'Pregătește: Coaliția a 5 ONG-uri']);
    expect(items[1]).toMatchObject({ kind: 'organizing', stage: 'mid', preconditionId: 'p1' });
  });

  it('skips covered roles and non-risky tests', () => {
    const p = createEmptyProject('T');
    p.roles = [{ id: 'r1', name: 'X', reason: '', reasonRefs: [], stage: 'start', status: 'covered', coveredBy: 'm1' }];
    p.preconditions = [{ id: 'p1', text: 't', actorId: null, stage: 'start', leadsTo: '', coveredByApp: true, assumption: '', risky: false, test: 'abc' }];
    expect(buildOrganizingItems(p)).toEqual([]);
  });
});

describe('appendOrganizingItems', () => {
  it('appends the new items to the backlog', () => {
    const p = appendOrganizingItems(sample());
    expect(p.backlog).toHaveLength(3);
  });

  it('adds only as many items as the backlog cap leaves room for', () => {
    const p = sample();
    p.backlog = Array.from({ length: 149 }, (_, i) => ({
      id: `x${i}`, stage: 'start' as const, kind: 'organizing' as const, featureId: null, preconditionId: null, text: `Pas ${i}`, order: i + 1,
    }));
    const next = appendOrganizingItems(p);
    expect(next.backlog).toHaveLength(150);
    expect(appendOrganizingItems(next).backlog).toHaveLength(150);
  });
});
