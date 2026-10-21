import type { Project } from '@/lib/project/schema';
import { createEmptyProject } from '@/lib/project/empty';
import { generateEditToken, hashToken, makeSlug } from '@/lib/tokens';
import type { ProjectRepo, StoredProject } from './repo';

type Row = StoredProject & { tokenHash: string };

function toStored(row: Row): StoredProject {
  return {
    id: row.id,
    slug: row.slug,
    draft: structuredClone(row.draft),
    published: structuredClone(row.published),
    publishedAt: row.publishedAt,
    draftUpdatedAt: row.draftUpdatedAt,
  };
}

export function createMemoryRepo(): ProjectRepo {
  const rows = new Map<string, Row>(); // keyed by token hash
  const rateLimits = new Map<string, number>();
  let lastTs = 0;

  // ISO timestamps, strictly increasing even within the same millisecond.
  function nextTimestamp(): string {
    lastTs = Math.max(Date.now(), lastTs + 1);
    return new Date(lastTs).toISOString();
  }

  async function findByToken(token: string): Promise<Row | null> {
    return rows.get(await hashToken(token)) ?? null;
  }

  return {
    async create(name) {
      const editToken = generateEditToken();
      const tokenHash = await hashToken(editToken);
      let slug = makeSlug(name);
      while ([...rows.values()].some((r) => r.slug === slug)) slug = makeSlug(name);
      const row: Row = {
        id: crypto.randomUUID(),
        slug,
        draft: createEmptyProject(name),
        published: null,
        publishedAt: null,
        draftUpdatedAt: nextTimestamp(),
        tokenHash,
      };
      rows.set(tokenHash, row);
      return { stored: toStored(row), editToken };
    },

    async getByToken(token) {
      const row = await findByToken(token);
      return row ? toStored(row) : null;
    },

    async getBySlug(slug) {
      const row = [...rows.values()].find((r) => r.slug === slug);
      return row ? toStored(row) : null;
    },

    async saveDraft(token, draft: Project, expectedUpdatedAt, force) {
      const row = await findByToken(token);
      if (!row) return null;
      if (!force && row.draftUpdatedAt !== expectedUpdatedAt) {
        return { ok: false, conflict: toStored(row) };
      }
      row.draft = structuredClone(draft);
      row.draftUpdatedAt = nextTimestamp();
      return { ok: true, draftUpdatedAt: row.draftUpdatedAt };
    },

    async publish(token) {
      const row = await findByToken(token);
      if (!row) return null;
      row.published = structuredClone(row.draft);
      row.publishedAt = nextTimestamp();
      return toStored(row);
    },

    async regenerateToken(token) {
      const oldHash = await hashToken(token);
      const row = rows.get(oldHash);
      if (!row) return null;
      const editToken = generateEditToken();
      const newHash = await hashToken(editToken);
      rows.delete(oldHash);
      row.tokenHash = newHash;
      rows.set(newHash, row);
      return { editToken };
    },

    async hitRateLimit(key, limit, windowSeconds) {
      const windowStart = Math.floor(Date.now() / 1000 / windowSeconds);
      const k = `${key}:${windowSeconds}:${windowStart}`;
      const count = (rateLimits.get(k) ?? 0) + 1;
      rateLimits.set(k, count);
      return count <= limit;
    },
  };
}
