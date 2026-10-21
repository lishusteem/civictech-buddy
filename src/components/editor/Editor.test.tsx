// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import { Editor } from './Editor';

const T1 = '2026-10-21T10:00:00.000Z';
const T0 = '2026-10-20T10:00:00.000Z';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(handler: (url: string) => unknown) {
  const fn = vi.fn(async (url: string) => {
    const body = handler(url);
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('Editor', () => {
  it('opens on step 1 when no step is done and skips the summary call', () => {
    const fetchMock = stubFetch(() => ({}));
    render(<Editor token="t" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Proiectul și echipa' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens on the overview with the AI summary when a step is done', async () => {
    stubFetch(() => ({ text: 'Un rezumat scurt.' }));
    const draft = createEmptyProject('P');
    draft.steps.project.status = 'done';
    render(<Editor token="t" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Tot proiectul' })).toBeTruthy();
    expect(await screen.findByText('Un rezumat scurt.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Editează: Problema' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
  });

  it('shows no summary when the call returns empty text', async () => {
    const fetchMock = stubFetch(() => ({ text: '' }));
    const draft = createEmptyProject('P');
    draft.steps.project.status = 'done';
    render(<Editor token="t" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('summary')).toBeNull();
  });

  it('shows the unpublished bar when the draft is newer and publishes from it', async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith('/publish') ? { slug: 's', publishedAt: '2026-10-21T11:00:00.000Z' } : {},
    );
    render(<Editor token="t" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T0} />);
    expect(screen.getByText('Ai modificări nepublicate')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizează pagina publică' }));
    await waitFor(() => expect(screen.queryByText('Ai modificări nepublicate')).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith('/api/e/t/publish', { method: 'POST' });
  });

  it('hides the bar when published and offers "Publică" when never published', () => {
    stubFetch(() => ({}));
    const initial = { draft: createEmptyProject('P'), draftUpdatedAt: T1 };
    const { unmount } = render(<Editor token="t" initial={initial} publishedAt={T1} />);
    expect(screen.queryByText('Ai modificări nepublicate')).toBeNull();
    unmount();
    render(<Editor token="t" initial={initial} publishedAt={null} />);
    expect(screen.getByRole('button', { name: 'Publică' })).toBeTruthy();
  });

  it('disables publish while saving has failed or edits are pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(
      <Editor
        token="t"
        initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }}
        publishedAt={T0}
        renderStep={(_s, draft, setDraft) => (
          <button onClick={() => setDraft({ ...draft, direction: 'x' })}>edit</button>
        )}
      />,
    );
    const publish = () => screen.getByRole('button', { name: 'Actualizează pagina publică' }) as HTMLButtonElement;
    expect(publish().disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    expect(publish().disabled).toBe(true); // pending edit
    await waitFor(() => expect(screen.getByText('Eroare la salvare — reîncercăm')).toBeTruthy(), { timeout: 3000 });
    expect(publish().disabled).toBe(true); // error
  });

  it('shows the invalid-link page when saving returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    render(
      <Editor
        token="t"
        initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }}
        publishedAt={T1}
        renderStep={(_s, draft, setDraft) => (
          <button onClick={() => setDraft({ ...draft, direction: 'x' })}>edit</button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    expect(await screen.findByText('Linkul nu mai e valid.', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Înapoi la început' }).getAttribute('href')).toBe('/');
  });

  it('saves an accepted card before asking for alerts', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(async (url) => ({
      ok: true,
      status: 200,
      json: async () => (url.endsWith('/alerts') ? { alerts: [] } : { draftUpdatedAt: '2026-10-21T10:00:05.000Z' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Editor token="t" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Nume'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pasul următor →' }));

    await waitFor(() => expect(fetchMock.mock.calls.map((c) => c[0])).toContain('/api/e/t/alerts'));
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    const put = urls.indexOf('/api/e/t');
    expect(put).toBeGreaterThanOrEqual(0);
    expect(put).toBeLessThan(urls.indexOf('/api/e/t/alerts'));
    const saved = JSON.parse(fetchMock.mock.calls[put][1]!.body as string).draft;
    expect(saved.team.map((m: { name: string }) => m.name)).toEqual(['Ana']);
    expect(saved.steps.project.status).toBe('done');
  });

  it('renders the step screen and moves on with Pasul următor, to the overview after step 10', async () => {
    const fetchMock = stubFetch(() => ({ alerts: [], text: '' }));
    const draft = createEmptyProject('P');
    render(<Editor token="t" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pasul următor →' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Backlog de organizare/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Pasul următor →' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Tot proiectul' })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/e/t/alerts', expect.objectContaining({ method: 'POST' })));
  });
});
