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

const COLUMNS = 'id, slug, draft, published, published_at, draft_updated_at';
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

export function createSupabaseRepo(): ProjectRepo {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or REPO=memory for local use).',
    );
  }
  const db: SupabaseClient = createClient(url, key, { auth: { persistSession: false } });

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

    async getBySlug(slug) {
      const { data, error } = await db.from('projects').select(COLUMNS).eq('slug', slug).maybeSingle();
      if (error) fail('select', error);
      return data ? toStored(data as Row) : null;
    },

    async saveDraft(token, draft, expectedUpdatedAt, force) {
      const hash = await hashToken(token);
      let newTs = new Date().toISOString();
      if (newTs === expectedUpdatedAt) newTs = new Date(Date.now() + 1).toISOString();
      let query = db
        .from('projects')
        .update({ draft, draft_updated_at: newTs })
        .eq('edit_token_hash', hash);
      if (!force) query = query.eq('draft_updated_at', expectedUpdatedAt);
      const { data, error } = await query.select('draft_updated_at');
      if (error) fail('update', error);
      if (data && data.length > 0) return { ok: true, draftUpdatedAt: data[0].draft_updated_at };

      const current = await rowByHash(hash);
      if (!current) return null;
      return { ok: false, conflict: toStored(current) };
    },

    async publish(token) {
      const hash = await hashToken(token);
      const current = await rowByHash(hash);
      if (!current) return null;
      const { data, error } = await db
        .from('projects')
        .update({ published: current.draft, published_at: new Date().toISOString() })
        .eq('edit_token_hash', hash)
        .select(COLUMNS);
      if (error) fail('update', error);
      return data && data.length > 0 ? toStored(data[0] as Row) : null;
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
