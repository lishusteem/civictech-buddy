import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import {
  entitiesForStep,
  listMax,
  normalizeCardIds,
  remainingCapacity,
  removeEntity,
  savedEntitiesForStep,
  upsertEntity,
  type Card,
} from './entities';

const actor = (id: string, name = 'X'): Card => ({
  kind: 'actor',
  data: { id, name, type: 'user', power: 'low', stance: 'unknown', excluded: false },
});

const precondition = (id: string, extra: Record<string, unknown> = {}): Card => ({
  kind: 'precondition',
  data: {
    id,
    text: 't',
    actorId: null,
    stage: 'start',
    leadsTo: '',
    coveredByApp: false,
    assumption: '',
    risky: false,
    test: '',
    ...extra,
  },
});

describe('upsertEntity / removeEntity', () => {
  it('adds a new actor, then replaces it on second upsert with the same id', () => {
    let p = upsertEntity(createEmptyProject('T'), actor('a1', 'One'));
    expect(p.actors).toHaveLength(1);
    p = upsertEntity(p, actor('a1', 'Two'));
    expect(p.actors).toHaveLength(1);
    expect(p.actors[0].name).toBe('Two');
  });

  it('does not mutate the input project', () => {
    const p0 = createEmptyProject('T');
    upsertEntity(p0, actor('a1'));
    expect(p0.actors).toHaveLength(0);
  });

  it('removes an actor but keeps its relations', () => {
    let p = upsertEntity(createEmptyProject('T'), actor('a1'));
    p = upsertEntity(p, { kind: 'relation', data: { id: 'r1', from: 'a1', to: 'a2', type: 'funds', note: '' } });
    p = removeEntity(p, 'actor', 'a1');
    expect(p.actors).toHaveLength(0);
    expect(p.relations).toHaveLength(1);
  });

  it('handles singletons: problem, direction, projectInfo', () => {
    let p = createEmptyProject('T');
    p = upsertEntity(p, { kind: 'problem', data: { id: 'problem', statement: 'S', evidence: [], verified: true } });
    expect(p.problem).toEqual({ statement: 'S', evidence: [], verified: true });
    p = upsertEntity(p, { kind: 'direction', data: { id: 'direction', text: 'Dir' } });
    expect(p.direction).toBe('Dir');
    p = upsertEntity(p, {
      kind: 'projectInfo',
      data: { id: 'projectInfo', ...p.project, name: 'New' },
    });
    expect(p.project.name).toBe('New');
    expect('id' in p.project).toBe(false);
    p = removeEntity(p, 'problem', 'problem');
    p = removeEntity(p, 'direction', 'direction');
    expect(p.problem.statement).toBe('');
    expect(p.direction).toBe('');
  });
});

describe('entitiesForStep', () => {
  it('includes actors in the preconditions step', () => {
    let p = upsertEntity(createEmptyProject('T'), actor('a1'));
    p = upsertEntity(p, precondition('p1'));
    const kinds = entitiesForStep(p, 'preconditions').map((c) => c.kind);
    expect(kinds).toEqual(['precondition', 'actor']);
  });

  it('returns singleton cards with fixed ids', () => {
    const cards = entitiesForStep(createEmptyProject('T'), 'target');
    expect(cards.map((c) => c.data.id)).toEqual(['direction']);
  });
});

describe('normalizeCardIds', () => {
  it('re-ids a colliding card and rewrites references in the batch', () => {
    const p = upsertEntity(createEmptyProject('T'), precondition('x'));
    const out = normalizeCardIds(p, [actor('x'), precondition('p9', { actorId: 'x' })]);
    expect(out[0].data.id).toBe('a1');
    expect(out[1].data.id).toBe('p9');
    expect(out[1].data.actorId).toBe('a1');
  });

  it('gives ids to cards without one, continuing the numeric suffix', () => {
    let p = upsertEntity(createEmptyProject('T'), actor('a7'));
    p = upsertEntity(p, actor('a2'));
    const out = normalizeCardIds(p, [actor(''), actor('')]);
    expect(out.map((c) => c.data.id)).toEqual(['a8', 'a9']);
  });

  it('keeps the id of a card updating an existing entity of the same kind', () => {
    const p = upsertEntity(createEmptyProject('T'), actor('a1'));
    expect(normalizeCardIds(p, [actor('a1', 'Renamed')])[0].data.id).toBe('a1');
  });

  it('rewrites array references (reasonRefs)', () => {
    const p = upsertEntity(createEmptyProject('T'), precondition('x'));
    const role: Card = {
      kind: 'role',
      data: { id: 'o1', name: 'n', reason: '', reasonRefs: ['x', 'p1'], stage: 'start', status: 'seeking', coveredBy: null },
    };
    const out = normalizeCardIds(p, [role, actor('x')]);
    expect(out[0].data.reasonRefs).toEqual(['a1', 'p1']);
  });
});

describe('listMax / remainingCapacity', () => {
  it('reads the list caps from the project schema', () => {
    expect(listMax('targetChange')).toBe(3);
    expect(listMax('backlogItem')).toBe(150);
    expect(listMax('actor')).toBe(40);
  });

  it('is the room left in a list, never negative', () => {
    const p = createEmptyProject('P');
    expect(remainingCapacity(p, 'targetChange')).toBe(3);
    p.targetChanges = [
      { id: 't1', text: 'a', signal: '' },
      { id: 't2', text: 'b', signal: '' },
    ];
    expect(remainingCapacity(p, 'targetChange')).toBe(1);
    p.targetChanges.push({ id: 't3', text: 'c', signal: '' }, { id: 't4', text: 'd', signal: '' });
    expect(remainingCapacity(p, 'targetChange')).toBe(0);
  });
});

describe('savedEntitiesForStep', () => {
  it('does not count an empty singleton, but counts a filled one', () => {
    const p = createEmptyProject('P');
    expect(savedEntitiesForStep(p, 'problem')).toEqual([]);
    expect(savedEntitiesForStep(p, 'project')).toEqual([]);
    expect(savedEntitiesForStep(p, 'target')).toEqual([]);
    p.problem.statement = 'Sesizările se pierd.';
    p.project.area = 'Cluj';
    expect(savedEntitiesForStep(p, 'problem')).toHaveLength(1);
    expect(savedEntitiesForStep(p, 'project')).toHaveLength(1);
  });
});
