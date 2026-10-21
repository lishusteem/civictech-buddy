// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import { removeEntity, upsertEntity } from '@/lib/project/entities';
import { useAutosave } from './useAutosave';

const T1 = '2026-10-21T10:00:00.000Z';
const T2 = '2026-10-21T10:00:05.000Z';
const T3 = '2026-10-21T10:00:09.000Z';
const T4 = '2026-10-21T10:00:12.000Z';

function reply(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function setup(fetchImpl: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchImpl);
  const initial = { draft: createEmptyProject('Parcul'), draftUpdatedAt: T1 };
  return { initial, ...renderHook(() => useAutosave('tok', initial)) };
}

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  JSON.parse(fetchMock.mock.calls[call][1].body as string);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useAutosave', () => {
  it('debounces two quick changes into a single PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'a' }));
    await act(() => vi.advanceTimersByTimeAsync(300));
    act(() => result.current.setDraft({ ...initial.draft, direction: 'ab' }));
    expect(result.current.status).toBe('saving');
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(400));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/e/tok');
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    const body = bodyOf(fetchMock);
    expect(body.draft.direction).toBe('ab');
    expect(body.expectedUpdatedAt).toBe(T1);
    expect(result.current.status).toBe('saved');
    expect(result.current.draftUpdatedAt).toBe(T2);
  });

  it('applies updater functions to the latest draft, even twice in one tick', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result } = setup(fetchMock);

    act(() => {
      result.current.setDraft((p) => ({ ...p, direction: 'a' }));
      result.current.setDraft((p) => ({ ...p, project: { ...p.project, area: 'Cluj' } }));
    });
    expect(result.current.draft.direction).toBe('a');
    expect(result.current.draft.project.area).toBe('Cluj');
    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(bodyOf(fetchMock).draft).toMatchObject({ direction: 'a', project: { area: 'Cluj' } });
  });

  it('flush saves pending edits at once and resolves after the save', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);
    let done = false;
    await act(async () => {
      await result.current.flush();
    });
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => result.current.setDraft({ ...initial.draft, direction: 'a' }));
    await act(async () => {
      await result.current.flush().then(() => (done = true));
    });
    expect(done).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });

  it('flush resolves without throwing when the save fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    const { result, initial } = setup(fetchMock);
    act(() => result.current.setDraft({ ...initial.draft, direction: 'a' }));
    await act(async () => {
      await result.current.flush();
    });
    expect(result.current.status).toBe('error');
  });

  it('uses the returned timestamp as expectedUpdatedAt for the next save', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'a' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    act(() => result.current.setDraft({ ...initial.draft, direction: 'b' }));
    await act(() => vi.advanceTimersByTimeAsync(800));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchMock, 1).expectedUpdatedAt).toBe(T2);
  });

  it('moves to conflict on 409 and exposes the stored draft', async () => {
    const theirs = { ...createEmptyProject('Parcul'), direction: 'al lor' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(reply(409, { conflict: { draft: theirs, draftUpdatedAt: T3 } }));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'al meu' }));
    await act(() => vi.advanceTimersByTimeAsync(800));

    expect(result.current.status).toBe('conflict');
    expect(result.current.conflict?.draft.direction).toBe('al lor');
    expect(result.current.draft.direction).toBe('al meu');
    // No retries while a conflict is pending.
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('resolveConflict mine resends with force: true against the stored timestamp', async () => {
    const theirs = { ...createEmptyProject('Parcul'), direction: 'al lor' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(409, { conflict: { draft: theirs, draftUpdatedAt: T3 } }))
      .mockResolvedValueOnce(reply(200, { draftUpdatedAt: T4 }));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'al meu' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(async () => result.current.resolveConflict('mine'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = bodyOf(fetchMock, 1);
    expect(body.force).toBe(true);
    expect(body.expectedUpdatedAt).toBe(T3);
    expect(body.draft.direction).toBe('al meu');
    expect(result.current.status).toBe('saved');
    expect(result.current.conflict).toBeNull();
    expect(result.current.draftUpdatedAt).toBe(T4);
  });

  it('resolveConflict theirs replaces the local draft without another PUT', async () => {
    const theirs = { ...createEmptyProject('Parcul'), direction: 'al lor' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(reply(409, { conflict: { draft: theirs, draftUpdatedAt: T3 } }));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'al meu' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    act(() => result.current.resolveConflict('theirs'));

    expect(result.current.draft.direction).toBe('al lor');
    expect(result.current.status).toBe('saved');
    expect(result.current.conflict).toBeNull();
    expect(result.current.draftUpdatedAt).toBe(T3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('marks relations of a deleted actor as stale', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    let p = createEmptyProject('Parcul');
    p = upsertEntity(p, {
      kind: 'actor',
      data: { id: 'a1', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false },
    });
    p = upsertEntity(p, {
      kind: 'actor',
      data: { id: 'a2', name: 'Locuitorii', type: 'user', power: 'low', stance: 'supports', excluded: false },
    });
    p = upsertEntity(p, { kind: 'relation', data: { id: 'r1', from: 'a1', to: 'a2', type: 'decides', note: '' } });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAutosave('tok', { draft: p, draftUpdatedAt: T1 }));

    act(() => result.current.setDraft(removeEntity(result.current.draft, 'actor', 'a1')));
    expect(result.current.draft.stale).toContain('r1');
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(bodyOf(fetchMock).draft.stale).toContain('r1');
  });

  it('keeps earlier stale ids when new ones are added', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);
    const withStale = { ...initial.draft, stale: ['x9'] };

    act(() => result.current.setDraft(withStale));
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(bodyOf(fetchMock).draft.stale).toEqual(['x9']);
  });

  it('recomputes code alerts before saving', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);
    const next = structuredClone(initial.draft);
    next.steps.problem.status = 'in_progress';
    next.problem.statement = 'Nimeni nu știe ce se întâmplă cu parcul';

    act(() => result.current.setDraft(next));
    await act(() => vi.advanceTimersByTimeAsync(800));

    expect(bodyOf(fetchMock).draft.alerts.some((a: { code: string }) => a.code === 'no_evidence')).toBe(true);
  });

  it('retries failed saves after 3 s, at most 3 times, keeping status error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('error');

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.current.status).toBe('error');
    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('recovers to saved when a retry succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);

    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(result.current.status).toBe('saved');
  });

  it('prevents unload while edits are unsaved, not after the save completes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);
    const fire = () => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(fire()).toBe(false);
    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    expect(fire()).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(fire()).toBe(false);
  });

  it('flushes immediately with keepalive when the page becomes hidden', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { draftUpdatedAt: T2 }));
    const { result, initial } = setup(fetchMock);
    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    spy.mockRestore();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].keepalive).toBe(true);
  });

  it('treats 404 as terminal: status invalid, a single PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(404, { error: 'x' }));
    const { result, initial } = setup(fetchMock);
    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(result.current.status).toBe('invalid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry 422', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(422, { error: 'x' }));
    const { result, initial } = setup(fetchMock);
    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(result.current.status).toBe('error');
    expect(result.current.fatal).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries 5xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(500, {}));
    const { result, initial } = setup(fetchMock);
    act(() => result.current.setDraft({ ...initial.draft, direction: 'x' }));
    await act(() => vi.advanceTimersByTimeAsync(800));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
