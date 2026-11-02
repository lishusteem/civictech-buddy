// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import { precondition } from '@/lib/steps/completion.fixtures';
import { Overview } from './Overview';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Overview', () => {
  it('lists a measure by what it tracks', () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const p = createEmptyProject('P');
    p.preconditions = [{ ...precondition }];
    p.measures = [{ id: 'ms1', role: 'key', stepId: 'p1', what: 'Cereri cu răspuns în termen' }];
    render(<Overview token="t" project={p} onEditStep={() => {}} />);
    const section = within(document.querySelector<HTMLElement>('[data-step="measures"]')!);
    expect(section.getByText('Cereri cu răspuns în termen')).toBeTruthy();
    expect(section.queryByText('Nimic adăugat încă.')).toBeNull();
  });
});
