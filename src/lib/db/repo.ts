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

export type SaveResult =
  | { ok: true; draftUpdatedAt: string }
  | { ok: false; conflict: StoredProject };

export interface ProjectRepo {
  create(name: string): Promise<{ stored: StoredProject; editToken: string }>;
  getByToken(token: string): Promise<StoredProject | null>;
  getBySlug(slug: string): Promise<StoredProject | null>;
  /** null = invalid token */
  saveDraft(
    token: string,
    draft: Project,
    expectedUpdatedAt: string,
    force?: boolean,
  ): Promise<SaveResult | null>;
  publish(token: string): Promise<StoredProject | null>;
  regenerateToken(token: string): Promise<{ editToken: string } | null>;
  /** true = allowed */
  hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

const globalForRepo = globalThis as unknown as { __ghidMemoryRepo?: ProjectRepo };
let supabaseRepo: ProjectRepo | undefined;

export function getRepo(): ProjectRepo {
  if (process.env.REPO === 'memory') {
    // globalThis so the singleton survives Next dev hot reloads.
    return (globalForRepo.__ghidMemoryRepo ??= createMemoryRepo());
  }
  return (supabaseRepo ??= createSupabaseRepo());
}
