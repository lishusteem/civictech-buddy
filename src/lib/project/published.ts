import type { Project } from './schema';

/** The public copy of a draft: without the chat messages and the stale ids (mirrors publish_project in SQL). */
export function toPublished(draft: Project): Project {
  const p = structuredClone(draft);
  for (const step of Object.values(p.steps)) step.messages = [];
  p.stale = [];
  return p;
}
