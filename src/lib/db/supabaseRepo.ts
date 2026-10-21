import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Project } from '@/lib/project/schema';
import { createEmptyProject } from '@/lib/project/empty';
import { generateEditToken, hashToken, makeSlug } from '@/lib/tokens';
import type { ProjectRepo, StoredProject } from './repo';

type Row = {
  id: string;
  slug: string;
  draft: Project;
  published: Project | null;
  published_at: string | null;
  draft_updated_at: string;
};

/** A row returned by the save_draft SQL function. */
type SaveDraftRow = { status: 'ok' | 'conflict' | 'invalid'; draft: Project | null; draft_updated_at: string | null };

const COLUMNS = 'id, slug, draft, published, published_at, draft_updated_at';
const PUBLIC_COLUMNS = 'slug, published, published_at';
const UNIQUE_VIOLATION = '23505';

function toStored(row: Row): StoredProject {
  return {
    id: row.id,
    slug: row.slug,
    draft: row.draft,
    published: row.published,
    publishedAt: row.published_at,
    draftUpdatedAt: row.draft_updated_at,
  };
}

function fail(op: string, error: { message: string }): never {
  throw new Error(`Supabase ${op} failed: ${error.message}`);
}

function defaultClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or REPO=memory for local use).',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** `db` is injectable for tests; by default a service-role client from the environment. */
export function createSupabaseRepo(db: SupabaseClient = defaultClient()): ProjectRepo {
  async function rowByHash(hash: string): Promise<Row | null> {
    const { data, error } = await db
      .from('projects')
      .select(COLUMNS)
      .eq('edit_token_hash', hash)
      .maybeSingle();
    if (error) fail('select', error);
    return (data as Row | null) ?? null;
  }

  return {
    async create(name) {
      const editToken = generateEditToken();
      const hash = await hashToken(editToken);
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await db
          .from('projects')
          .insert({ slug: makeSlug(name), edit_token_hash: hash, draft: createEmptyProject(name) })
          .select(COLUMNS)
          .single();
        if (!error) return { stored: toStored(data as Row), editToken };
        if (error.code !== UNIQUE_VIOLATION) fail('insert', error);
      }
      throw new Error('Supabase insert failed: could not generate a unique slug');
    },

    async getByToken(token) {
      const row = await rowByHash(await hashToken(token));
      return row ? toStored(row) : null;
    },

    async getPublishedBySlug(slug) {
      const { data, error } = await db.from('projects').select(PUBLIC_COLUMNS).eq('slug', slug).maybeSingle();
      if (error) fail('select', error);
      const row = data as Pick<Row, 'slug' | 'published' | 'published_at'> | null;
      if (!row || row.published === null || row.published_at === null) return null;
      return { slug: row.slug, published: row.published, publishedAt: row.published_at };
    },

    async saveDraft(token, draft, expectedUpdatedAt, force) {
      // The compare-and-set and the new timestamp (clock_timestamp()) happen in one statement in SQL.
      const { data, error } = await db.rpc('save_draft', {
        p_hash: await hashToken(token),
        p_draft: draft,
        p_expected: expectedUpdatedAt,
        p_force: force === true,
      });
      if (error) fail('rpc save_draft', error);
      const row = (data as SaveDraftRow[] | null)?.[0];
      if (!row || row.status === 'invalid' || row.draft_updated_at === null) return null;
      if (row.status === 'ok') return { ok: true, draftUpdatedAt: row.draft_updated_at };
      if (row.draft === null) return null;
      return { ok: false, conflict: { draft: row.draft, draftUpdatedAt: row.draft_updated_at } };
    },

    async publish(token) {
      const { data, error } = await db.rpc('publish_project', { p_hash: await hashToken(token) });
      if (error) fail('rpc publish_project', error);
      const row = (data as { slug: string; published_at: string }[] | null)?.[0];
      return row ? { slug: row.slug, publishedAt: row.published_at } : null;
    },

    async regenerateToken(token) {
      const editToken = generateEditToken();
      const { data, error } = await db
        .from('projects')
        .update({ edit_token_hash: await hashToken(editToken) })
        .eq('edit_token_hash', await hashToken(token))
        .select('id');
      if (error) fail('update', error);
      return data && data.length > 0 ? { editToken } : null;
    },

    async hitRateLimit(rlKey, limit, windowSeconds) {
      const { data, error } = await db.rpc('hit_rate_limit', {
        p_key: rlKey,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) fail('rpc hit_rate_limit', error);
      return data === true;
    },
  };
}
