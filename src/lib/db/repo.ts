import type { Project } from '@/lib/project/schema';
import { createMemoryRepo } from './memoryRepo';
import { createSupabaseRepo } from './supabaseRepo';

export type StoredProject = {
  id: string;
  slug: string;
  draft: Project;
  published: Project | null;
  publishedAt: string | null;
  draftUpdatedAt: string;
};

/** What the public page needs; null from getPublishedBySlug until the first publication. */
export type PublishedProject = { slug: string; published: Project; publishedAt: string };

export type SaveResult =
  | { ok: true; draftUpdatedAt: string }
  | { ok: false; conflict: { draft: Project; draftUpdatedAt: string } };

export interface ProjectRepo {
  create(name: string): Promise<{ stored: StoredProject; editToken: string }>;
  getByToken(token: string): Promise<StoredProject | null>;
  getPublishedBySlug(slug: string): Promise<PublishedProject | null>;
  /** null = invalid token */
  saveDraft(
    token: string,
    draft: Project,
    expectedUpdatedAt: string,
    force?: boolean,
  ): Promise<SaveResult | null>;
  /** Copies the draft (without messages and stale ids) to the public version; null = invalid token. */
  publish(token: string): Promise<{ slug: string; publishedAt: string } | null>;
  regenerateToken(token: string): Promise<{ editToken: string } | null>;
  /** true = allowed */
  hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

const globalForRepo = globalThis as unknown as { __ghidMemoryRepo?: ProjectRepo };
let supabaseRepo: ProjectRepo | undefined;

export function getRepo(): ProjectRepo {
  if (process.env.REPO === 'memory') {
    if (process.env.VERCEL_ENV === 'production') {
      throw new Error('REPO=memory is not allowed in production: set REPO=supabase.');
    }
    // globalThis so the singleton survives Next dev hot reloads.
    return (globalForRepo.__ghidMemoryRepo ??= createMemoryRepo());
  }
  return (supabaseRepo ??= createSupabaseRepo());
}
