// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { StartScreen } from './StartScreen';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => push.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StartScreen', () => {
  it('shows 10 steps and the total time', () => {
    render(<StartScreen />);
    expect(screen.getAllByRole('listitem').filter((li) => li.hasAttribute('data-step'))).toHaveLength(10);
    expect(screen.getByText(/~30 de minute/)).toBeTruthy();
  });

  it('creates a project and redirects to the edit link', async () => {
    const fetchMock = mockFetch(201, { slug: 's', editToken: 'tok' });
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Începe un proiect nou' }));
    fireEvent.change(screen.getByLabelText(/Numele proiectului/), { target: { value: 'Parcul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Începe' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/e/tok'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Parcul' }) }),
    );
  });

  it('shows the server error and does not redirect', async () => {
    mockFetch(429, { error: 'Prea multe cereri.' });
    render(<StartScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Începe un proiect nou' }));
    fireEvent.click(screen.getByRole('button', { name: 'Începe' }));
    expect(await screen.findByText('Prea multe cereri.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('continues a project from a pasted link', () => {
    render(<StartScreen />);
    fireEvent.change(screen.getByLabelText(/Continuă un proiect/), {
      target: { value: 'https://x.vercel.app/e/abc?x=1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuă' }));
    expect(push).toHaveBeenCalledWith('/e/abc');
  });

  it('rejects text that is not an edit link', () => {
    render(<StartScreen />);
    fireEvent.change(screen.getByLabelText(/Continuă un proiect/), { target: { value: 'ceva random' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuă' }));
    expect(screen.getByText('Linkul nu pare un link de editare.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
