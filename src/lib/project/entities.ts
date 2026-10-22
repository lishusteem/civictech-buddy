import type { z } from 'zod';
import { createEmptyProject } from './empty';
import { ProjectSchema, type Project, type StepId } from './schema';

export type EntityKind =
  | 'projectInfo'
  | 'teamMember'
  | 'feature'
  | 'problem'
  | 'existing'
  | 'direction'
  | 'targetChange'
  | 'actor'
  | 'relation'
  | 'precondition'
  | 'role'
  | 'backlogItem'
  | 'toFindOut';

export type Card = { kind: EntityKind; data: { id: string } & Record<string, unknown> };

const shape = ProjectSchema.shape;

export const ENTITY_SCHEMAS: Record<EntityKind, z.ZodTypeAny> = {
  projectInfo: shape.project,
  teamMember: shape.team.element,
  feature: shape.features.element,
  problem: shape.problem,
  existing: shape.existing.element,
  direction: shape.direction,
  targetChange: shape.targetChanges.element,
  actor: shape.actors.element,
  relation: shape.relations.element,
  precondition: shape.preconditions.element,
  role: shape.roles.element,
  backlogItem: shape.backlog.element,
  toFindOut: shape.toFindOut.element,
};

export const STEP_ENTITIES: Record<StepId, EntityKind[]> = {
  project: ['projectInfo', 'teamMember', 'feature'],
  problem: ['problem'],
  existing: ['existing'],
  target: ['direction', 'targetChange'],
  actors: ['actor'],
  relations: ['relation'],
  preconditions: ['precondition', 'actor'],
  // The UI restricts this step to the `risky` and `test` fields.
  risks: ['precondition'],
  roles: ['role'],
  backlog: ['backlogItem'],
};

type SingletonKind = 'projectInfo' | 'problem' | 'direction';
export type ListKind = Exclude<EntityKind, SingletonKind>;
type ListKey =
  | 'team'
  | 'features'
  | 'existing'
  | 'targetChanges'
  | 'actors'
  | 'relations'
  | 'preconditions'
  | 'roles'
  | 'backlog'
  | 'toFindOut';

export const LIST_KEY: Record<ListKind, ListKey> = {
  teamMember: 'team',
  feature: 'features',
  existing: 'existing',
  targetChange: 'targetChanges',
  actor: 'actors',
  relation: 'relations',
  precondition: 'preconditions',
  role: 'roles',
  backlogItem: 'backlog',
  toFindOut: 'toFindOut',
};

const ID_PREFIX: Record<ListKind, string> = {
  teamMember: 'm',
  feature: 'f',
  existing: 'e',
  targetChange: 't',
  actor: 'a',
  relation: 'r',
  precondition: 'p',
  role: 'o',
  backlogItem: 'b',
  toFindOut: 'q',
};

/** Fields holding ids of other entities. */
export const REF_FIELDS = [
  'from',
  'to',
  'actorId',
  'leadsTo',
  'reasonRefs',
  'featureId',
  'preconditionId',
  'coveredBy',
] as const;

type AnyEntity = { id: string } & Record<string, unknown>;

export function isSingleton(kind: EntityKind): kind is SingletonKind {
  return kind === 'projectInfo' || kind === 'problem' || kind === 'direction';
}

function listOf(p: Project, kind: ListKind): AnyEntity[] {
  return p[LIST_KEY[kind]] as AnyEntity[];
}

/** Every list entity in the project with its kind (singletons excluded). */
export function allListEntities(p: Project): { kind: ListKind; entity: AnyEntity }[] {
  const out: { kind: ListKind; entity: AnyEntity }[] = [];
  for (const kind of Object.keys(LIST_KEY) as ListKind[]) {
    for (const entity of listOf(p, kind)) out.push({ kind, entity });
  }
  return out;
}

/** The ProjectSchema max length of a list kind. */
export function listMax(kind: ListKind): number {
  return (shape[LIST_KEY[kind]] as z.ZodArray<z.ZodTypeAny>)._def.maxLength?.value ?? Infinity;
}

/** How many more entities of this kind fit in the project (never negative). */
export function remainingCapacity(p: Project, kind: ListKind): number {
  return Math.max(0, listMax(kind) - listOf(p, kind).length);
}

/** False when the card would add a new entity to a list that is already full. */
export function fitsInList(p: Project, card: Card): boolean {
  if (isSingleton(card.kind)) return true;
  if (listOf(p, card.kind).some((e) => e.id === card.data.id)) return true;
  return remainingCapacity(p, card.kind) > 0;
}

export function upsertEntity(p: Project, card: Card): Project {
  const next: Project = structuredClone(p);
  const { kind, data } = card;
  if (kind === 'projectInfo' || kind === 'problem') {
    const { id: _id, ...rest } = data;
    if (kind === 'projectInfo') next.project = rest as Project['project'];
    else next.problem = rest as Project['problem'];
    return next;
  }
  if (kind === 'direction') {
    next.direction = String(data.text ?? '');
    return next;
  }
  const list = listOf(next, kind);
  const i = list.findIndex((e) => e.id === data.id);
  if (i >= 0) list[i] = { ...data };
  else list.push({ ...data });
  return next;
}

export function removeEntity(p: Project, kind: EntityKind, id: string): Project {
  const next: Project = structuredClone(p);
  if (isSingleton(kind)) {
    const empty = createEmptyProject(p.project.name);
    if (kind === 'projectInfo') next.project = empty.project;
    else if (kind === 'problem') next.problem = empty.problem;
    else next.direction = empty.direction;
    return next;
  }
  const list = listOf(next, kind);
  const i = list.findIndex((e) => e.id === id);
  if (i >= 0) list.splice(i, 1);
  return next;
}

function cardsOfKind(p: Project, kind: EntityKind): Card[] {
  if (kind === 'projectInfo') return [{ kind, data: { id: kind, ...p.project } }];
  if (kind === 'problem') return [{ kind, data: { id: kind, ...p.problem } }];
  if (kind === 'direction') return [{ kind, data: { id: kind, text: p.direction } }];
  return listOf(p, kind).map((e) => ({ kind, data: { ...e } }));
}

export function entitiesForStep(p: Project, step: StepId): Card[] {
  return STEP_ENTITIES[step].flatMap((kind) => cardsOfKind(p, kind));
}

/** Like entitiesForStep, but a singleton (project info, problem, direction) that is still empty does not count. */
export function savedEntitiesForStep(p: Project, step: StepId): Card[] {
  const field: Record<SingletonKind, string> = { projectInfo: 'description', problem: 'statement', direction: 'text' };
  return entitiesForStep(p, step).filter((card) => {
    if (!isSingleton(card.kind)) return true;
    const value = (card.data as Record<string, unknown>)[field[card.kind]];
    return typeof value === 'string' && value.trim() !== '';
  });
}

function mapRef(value: unknown, renames: Map<string, string>): unknown {
  if (typeof value === 'string') return renames.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => mapRef(v, renames));
  return value;
}

export function normalizeCardIds(p: Project, cards: Card[]): Card[] {
  // id -> kind, for every entity already in the project (and earlier in the batch).
  const taken = new Map<string, EntityKind>();
  const allIds: string[] = [];
  for (const { kind, entity } of allListEntities(p)) {
    taken.set(entity.id, kind);
    allIds.push(entity.id);
  }
  for (const c of cards) if (typeof c.data.id === 'string') allIds.push(c.data.id);

  const counters = new Map<string, number>();
  const nextId = (prefix: string): string => {
    let n = counters.get(prefix);
    if (n === undefined) {
      const re = new RegExp(`^${prefix}(\\d+)$`);
      n = 0;
      for (const id of allIds) {
        const m = re.exec(id);
        if (m) n = Math.max(n, Number(m[1]));
      }
    }
    n += 1;
    counters.set(prefix, n);
    return `${prefix}${n}`;
  };

  const renames = new Map<string, string>();
  const assigned = cards.map((card): Card => {
    if (isSingleton(card.kind)) return { kind: card.kind, data: { ...card.data, id: card.kind } };
    const oldId = card.data.id;
    const has = typeof oldId === 'string' && oldId !== '';
    const owner = has ? taken.get(oldId) : undefined;
    if (has && (owner === undefined || owner === card.kind)) {
      taken.set(oldId, card.kind);
      return { kind: card.kind, data: { ...card.data } };
    }
    const id = nextId(ID_PREFIX[card.kind]);
    taken.set(id, card.kind);
    if (has) renames.set(oldId, id);
    return { kind: card.kind, data: { ...card.data, id } };
  });

  if (renames.size === 0) return assigned;
  return assigned.map((card) => {
    const data: Record<string, unknown> = { ...card.data };
    for (const f of REF_FIELDS) if (f in data) data[f] = mapRef(data[f], renames);
    return { kind: card.kind, data: data as Card['data'] };
  });
}
