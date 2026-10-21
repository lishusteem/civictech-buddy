import { REF_FIELDS, allListEntities } from './entities';
import type { Project } from './schema';

function refsOf(entity: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const f of REF_FIELDS) {
    const v = entity[f];
    if (typeof v === 'string' && v !== '') out.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.push(x);
  }
  return out;
}

/** Ids of entities in `next` that reference an entity deleted or modified between `prev` and `next`. */
export function computeStale(prev: Project, next: Project): string[] {
  const nextJson = new Map<string, string>();
  for (const { entity } of allListEntities(next)) nextJson.set(entity.id, JSON.stringify(entity));

  const changed = new Set<string>();
  for (const { entity } of allListEntities(prev)) {
    if (nextJson.get(entity.id) !== JSON.stringify(entity)) changed.add(entity.id);
  }
  if (changed.size === 0) return [];

  const result = new Set<string>();
  for (const { entity } of allListEntities(next)) {
    if (changed.has(entity.id)) continue;
    if (refsOf(entity).some((r) => changed.has(r))) result.add(entity.id);
  }
  return [...result];
}
