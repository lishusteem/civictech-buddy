import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createEmptyProject } from '@/lib/project/empty';
import { hashToken } from '@/lib/tokens';
import { createSupabaseRepo } from './supabaseRepo';

type Result = { data: unknown; error: { message: string; code?: string } | null };

/** A chainable stand-in for `db.from(...)`: every builder method records its call; the terminal ones resolve `result`. */
function fakeClient(opts: { rpc?: Result; from?: Result } = {}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const result = opts.from ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update', 'insert', 'not']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.maybeSingle = async () => result;
  builder.single = async () => result;
  builder.then = (resolve: (r: Result) => unknown) => resolve(result);
  const rpc = vi.fn(async () => opts.rpc ?? { data: null, error: null });
  const from = vi.fn(() => builder);
  const client = { rpc, from } as unknown as SupabaseClient;
  return { client, rpc, from, calls };
}

const draft = createEmptyProject('Parcul');
const T1 = '2026-10-21T10:00:00.123456+00:00';
const T2 = '2026-10-21T10:00:05.654321+00:00';

describe('supabaseRepo.saveDraft', () => {
  it('calls save_draft with the token hash and returns the new timestamp', async () => {
    const { client, rpc } = fakeClient({ rpc: { data: [{ status: 'ok', draft: null, draft_updated_at: T2 }], error: null } });
    const res = await createSupabaseRepo(client).saveDraft('tok', draft, T1);
    expect(rpc).toHaveBeenCalledWith('save_draft', {
      p_hash: await hashToken('tok'),
      p_draft: draft,
      p_expected: T1,
      p_force: false,
    });
    expect(res).toEqual({ ok: true, draftUpdatedAt: T2 });
  });

  it('passes force through', async () => {
    const { client, rpc } = fakeClient({ rpc: { data: [{ status: 'ok', draft: null, draft_updated_at: T2 }], error: null } });
    await createSupabaseRepo(client).saveDraft('tok', draft, T1, true);
    expect(rpc).toHaveBeenCalledWith('save_draft', expect.objectContaining({ p_force: true }));
  });

  it('returns the stored draft on a conflict', async () => {
    const theirs = { ...draft, direction: 'al lor' };
    const { client } = fakeClient({ rpc: { data: [{ status: 'conflict', draft: theirs, draft_updated_at: T2 }], error: null } });
    const res = await createSupabaseRepo(client).saveDraft('tok', draft, T1);
    expect(res).toEqual({ ok: false, conflict: { draft: theirs, draftUpdatedAt: T2 } });
  });

  it('returns null for an invalid token', async () => {
    const { client } = fakeClient({ rpc: { data: [{ status: 'invalid', draft: null, draft_updated_at: null }], error: null } });
    expect(await createSupabaseRepo(client).saveDraft('bad', draft, T1)).toBeNull();
    const empty = fakeClient({ rpc: { data: [], error: null } });
    expect(await createSupabaseRepo(empty.client).saveDraft('bad', draft, T1)).toBeNull();
  });

  it('throws on a database error', async () => {
    const { client } = fakeClient({ rpc: { data: null, error: { message: 'boom' } } });
    await expect(createSupabaseRepo(client).saveDraft('tok', draft, T1)).rejects.toThrow('Supabase rpc save_draft failed: boom');
  });
});

describe('supabaseRepo.publish', () => {
  it('calls publish_project with the token hash and returns slug and publishedAt', async () => {
    const { client, rpc } = fakeClient({ rpc: { data: [{ slug: 'parcul-abc', published_at: T2 }], error: null } });
    const res = await createSupabaseRepo(client).publish('tok');
    expect(rpc).toHaveBeenCalledWith('publish_project', { p_hash: await hashToken('tok') });
    expect(res).toEqual({ slug: 'parcul-abc', publishedAt: T2 });
  });

  it('returns null for an invalid token', async () => {
    const { client } = fakeClient({ rpc: { data: [], error: null } });
    expect(await createSupabaseRepo(client).publish('bad')).toBeNull();
  });
});

describe('supabaseRepo.getPublishedBySlug', () => {
  it('selects only the public columns and returns the published version', async () => {
    const published = { ...draft, direction: 'publicat' };
    const { client, calls } = fakeClient({ from: { data: { slug: 's', published, published_at: T2 }, error: null } });
    const res = await createSupabaseRepo(client).getPublishedBySlug('s');
    expect(calls).toContainEqual({ method: 'select', args: ['slug, published, published_at'] });
    expect(calls).toContainEqual({ method: 'eq', args: ['slug', 's'] });
    expect(res).toEqual({ slug: 's', published, publishedAt: T2 });
  });

  it('returns null when the project is not published or does not exist', async () => {
    const unpublished = fakeClient({ from: { data: { slug: 's', published: null, published_at: null }, error: null } });
    expect(await createSupabaseRepo(unpublished.client).getPublishedBySlug('s')).toBeNull();
    const missing = fakeClient({ from: { data: null, error: null } });
    expect(await createSupabaseRepo(missing.client).getPublishedBySlug('nope')).toBeNull();
  });
});
