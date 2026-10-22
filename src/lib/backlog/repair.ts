import type { Project } from '../project/schema';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Repairs backlog items whose featureId is not the id of a feature (older drafts could have an
 * item pointing at itself): relinks it to the feature with the same text, else clears it.
 * Returns the same project when nothing needed repair.
 */
export function repairBacklogLinks(p: Project): Project {
  const featureIds = new Set(p.features.map((f) => f.id));
  let changed = false;
  const backlog = p.backlog.map((b) => {
    if (b.featureId === null || featureIds.has(b.featureId)) return b;
    const match = p.features.find((f) => norm(f.text) === norm(b.text));
    changed = true;
    return { ...b, featureId: match ? match.id : null };
  });
  return changed ? { ...p, backlog } : p;
}
