import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './empty';
import {
  entitiesForStep,
  listMax,
  normalizeCardIds,
  remainingCapacity,
  removeEntity,
  savedEntitiesForStep,
  STEP_ENTITIES,
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
  it('shows only preconditions as the content of the preconditions step (actors live on their own step)', () => {
    let p = upsertEntity(createEmptyProject('T'), actor('a1'));
    p = upsertEntity(p, precondition('p1'));
    expect(entitiesForStep(p, 'preconditions').map((c) => c.kind)).toEqual(['precondition']);
    expect(savedEntitiesForStep(p, 'preconditions').map((c) => c.kind)).toEqual(['precondition']);
    expect(entitiesForStep(p, 'actors').map((c) => c.kind)).toEqual(['actor']);
    // the AI may still propose a new actor on the preconditions step
    expect(STEP_ENTITIES.preconditions).toContain('actor');
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

  it('does not rewrite a reasonRefs entry that also names an existing entity of another kind', () => {
    const p = upsertEntity(createEmptyProject('T'), precondition('x'));
    const role: Card = {
      kind: 'role',
      data: { id: 'o1', name: 'n', reason: '', reasonRefs: ['x', 'p1'], stage: 'start', status: 'seeking', coveredBy: null },
    };
    const out = normalizeCardIds(p, [role, actor('x')]);
    expect(out[1].data.id).toBe('a1');
    expect(out[0].data.reasonRefs).toEqual(['x', 'p1']);
  });

  it('keeps featureId f1/f2 on backlog items whose own ids collide with the features (production bug)', () => {
    const p = createEmptyProject('T');
    p.features = [{ id: 'f1', text: 'Harta' }, { id: 'f2', text: 'Alerte' }];
    p.backlog = Array.from({ length: 10 }, (_, i) => ({
      id: `b${i + 1}`, stage: 'start' as const, kind: 'organizing' as const, featureId: null, preconditionId: null, text: `o${i}`, order: i + 1,
    }));
    const item = (id: string, featureId: string): Card => ({
      kind: 'backlogItem',
      data: { id, stage: 'start', kind: 'feature', featureId, preconditionId: 'p1', text: 'x', order: 1 },
    });
    const out = normalizeCardIds(p, [item('f1', 'f1'), item('f2', 'f2')]);
    expect(out.map((c) => c.data.id)).toEqual(['b11', 'b12']);
    expect(out.map((c) => c.data.featureId)).toEqual(['f1', 'f2']);
    expect(out.map((c) => c.data.preconditionId)).toEqual(['p1', 'p1']);
  });

  it('rewrites a reference only in fields that point at the renamed card kind', () => {
    // existing precondition p1; the AI proposes a new actor also called p1, a relation from it and a precondition leading to p1
    const p = upsertEntity(createEmptyProject('T'), precondition('p1'));
    const rel: Card = { kind: 'relation', data: { id: 'r1', from: 'p1', to: 'p1', type: 'funds', note: '' } };
    const pre: Card = precondition('p2', { actorId: 'p1', leadsTo: 'p1' });
    const out = normalizeCardIds(p, [actor('p1'), rel, pre]);
    expect(out[0].data.id).toBe('a1');
    expect(out[1].data.from).toBe('a1');
    expect(out[1].data.to).toBe('a1');
    expect(out[2].data.actorId).toBe('a1');
    expect(out[2].data.leadsTo).toBe('p1'); // leadsTo points to a precondition, which is not renamed
  });

  it('rewrites coveredBy for a renamed team member', () => {
    const p = upsertEntity(createEmptyProject('T'), actor('m1'));
    const member: Card = { kind: 'teamMember', data: { id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 3 } };
    const role: Card = {
      kind: 'role',
      data: { id: 'o1', name: 'n', reason: '', reasonRefs: [], stage: 'start', status: 'covered', coveredBy: 'm1' },
    };
    const out = normalizeCardIds(p, [member, role]);
    expect(out[0].data.id).toBe('m2');
    expect(out[1].data.coveredBy).toBe('m2');
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
    p.project.description = 'O descriere';
    expect(savedEntitiesForStep(p, 'problem')).toHaveLength(1);
    expect(savedEntitiesForStep(p, 'project')).toHaveLength(1);
  });

  it('is not sensitive to key order (jsonb reorders keys)', () => {
    const p = createEmptyProject('P');
    p.problem = { verified: false, evidence: [], statement: '' };
    p.project = { contact: '', motivation: '', links: [], area: '', stage: null, description: '', name: 'P' };
    expect(savedEntitiesForStep(p, 'problem')).toEqual([]);
    expect(savedEntitiesForStep(p, 'project')).toEqual([]);
    p.direction = '   ';
    expect(savedEntitiesForStep(p, 'target')).toEqual([]);
    p.direction = 'Spre mai bine';
    expect(savedEntitiesForStep(p, 'target')).toHaveLength(1);
  });
});
