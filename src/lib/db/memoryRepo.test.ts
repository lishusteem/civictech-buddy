import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from './memoryRepo';
import { createEmptyProject } from '@/lib/project/empty';

describe('memoryRepo', () => {
  it('create returns a token that works with getByToken', async () => {
    const repo = createMemoryRepo();
    const { stored, editToken } = await repo.create('Proiect Test');
    const found = await repo.getByToken(editToken);
    expect(found?.id).toBe(stored.id);
    expect(await repo.getByToken('nope')).toBeNull();
  });

  it('getBySlug on an unpublished project has published === null', async () => {
    const repo = createMemoryRepo();
    const { stored } = await repo.create('Proiect Test');
    const found = await repo.getBySlug(stored.slug);
    expect(found).not.toBeNull();
    expect(found!.published).toBeNull();
  });

  it('saveDraft with correct expectedUpdatedAt succeeds with a new timestamp', async () => {
    const repo = createMemoryRepo();
    const { stored, editToken } = await repo.create('A');
    const draft = { ...stored.draft, direction: 'x' };
    const res = await repo.saveDraft(editToken, draft, stored.draftUpdatedAt);
    expect(res).toMatchObject({ ok: true });
    if (res && res.ok) expect(res.draftUpdatedAt).not.toBe(stored.draftUpdatedAt);
  });

  it('second save with the stale timestamp conflicts and returns the first draft', async () => {
    const repo = createMemoryRepo();
    const { stored, editToken } = await repo.create('A');
    const first = { ...stored.draft, direction: 'first' };
    const second = { ...stored.draft, direction: 'second' };
    await repo.saveDraft(editToken, first, stored.draftUpdatedAt);
    const res = await repo.saveDraft(editToken, second, stored.draftUpdatedAt);
    expect(res && !res.ok).toBe(true);
    if (res && !res.ok) expect(res.conflict.draft.direction).toBe('first');
  });

  it('force overrides the conflict', async () => {
    const repo = createMemoryRepo();
    const { stored, editToken } = await repo.create('A');
    await repo.saveDraft(editToken, { ...stored.draft, direction: 'first' }, stored.draftUpdatedAt);
    const res = await repo.saveDraft(
      editToken,
      { ...stored.draft, direction: 'second' },
      stored.draftUpdatedAt,
      true,
    );
    expect(res).toMatchObject({ ok: true });
    expect((await repo.getByToken(editToken))!.draft.direction).toBe('second');
  });

  it('saveDraft with an invalid token returns null', async () => {
    const repo = createMemoryRepo();
    expect(await repo.saveDraft('bad', createEmptyProject('x'), 'whatever')).toBeNull();
  });

  it('publish copies draft to published and sets publishedAt', async () => {
    const repo = createMemoryRepo();
    const { stored, editToken } = await repo.create('A');
    await repo.saveDraft(editToken, { ...stored.draft, direction: 'dir' }, stored.draftUpdatedAt);
    const pub = await repo.publish(editToken);
    expect(pub!.published?.direction).toBe('dir');
    expect(pub!.publishedAt).not.toBeNull();
    expect((await repo.getBySlug(stored.slug))!.published?.direction).toBe('dir');
    expect(await repo.publish('bad')).toBeNull();
  });

  it('regenerateToken invalidates the old token', async () => {
    const repo = createMemoryRepo();
    const { editToken } = await repo.create('A');
    const res = await repo.regenerateToken(editToken);
    expect(res).not.toBeNull();
    expect(await repo.getByToken(editToken)).toBeNull();
    expect(await repo.getByToken(res!.editToken)).not.toBeNull();
    expect(await repo.regenerateToken(editToken)).toBeNull();
  });

  it('hitRateLimit allows up to the limit then refuses', async () => {
    const repo = createMemoryRepo();
    expect(await repo.hitRateLimit('k', 2, 60)).toBe(true);
    expect(await repo.hitRateLimit('k', 2, 60)).toBe(true);
    expect(await repo.hitRateLimit('k', 2, 60)).toBe(false);
    expect(await repo.hitRateLimit('other', 2, 60)).toBe(true);
  });
});
