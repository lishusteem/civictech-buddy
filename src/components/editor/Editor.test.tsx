// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project } from '@/lib/project/schema';
import { fillSteps } from '@/lib/steps/completion.fixtures';
import { STEPS } from '@/lib/steps/definitions';
import { Editor } from './Editor';

const T1 = '2026-10-21T10:00:00.000Z';
const T0 = '2026-10-20T10:00:00.000Z';

/** A project that already has its functions: step 1 then opens with the AI's question, not the three fields. */
const withFeature = (p: Project): Project => ({ ...p, features: [{ id: 'f1', text: 'Hartă', done: true }] });

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

const ALL = STEPS.map((s) => s.id);
const BEFORE_BACKLOG = ALL.slice(0, -1);

describe('Editor', () => {
  it('opens on step 1 when no step is done and skips the summary call', () => {
    const fetchMock = stubFetch(() => ({}));
    render(<Editor token="t" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Proiectul și echipa' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens on the overview with the AI summary when a step is done', async () => {
    stubFetch(() => ({ text: 'Un rezumat scurt.' }));
    const draft = fillSteps(createEmptyProject('P'), ALL);
    draft.steps.project.status = 'done';
    render(<Editor token="t" slug="s" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Tot proiectul' })).toBeTruthy();
    expect(await screen.findByText('Un rezumat scurt.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Editează: Problema' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
  });

  it('reopens a legacy draft (steps marked done but empty) at its first incomplete step', () => {
    stubFetch(() => ({ text: '' }));
    const draft = fillSteps(createEmptyProject('P'), ['project']);
    draft.steps.project.status = 'done';
    draft.steps.problem.status = 'done';
    draft.steps.existing.status = 'done';
    render(<Editor token="t" slug="s" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
    expect(screen.getByText(/Nimic salvat încă/)).toBeTruthy();
  });

  it('does not let the sidebar jump past the first incomplete step, but allows going back', () => {
    stubFetch(() => ({ text: '' }));
    const initial = { draft: fillSteps(createEmptyProject('P'), ['project']), draftUpdatedAt: T1 };
    render(<Editor token="t" slug="s" initial={initial} publishedAt={T1} />);
    expect((screen.getByRole('button', { name: /^Ce există deja/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^Ce există deja/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Proiectul și echipa/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Proiectul și echipa' })).toBeTruthy();
  });

  it('shows no summary when the call returns empty text', async () => {
    const fetchMock = stubFetch(() => ({ text: '' }));
    const draft = fillSteps(createEmptyProject('P'), ALL);
    draft.steps.project.status = 'done';
    render(<Editor token="t" slug="s" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('summary')).toBeNull();
  });

  it('shows the unpublished bar when the draft is newer and publishes from it', async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith('/publish') ? { slug: 's', publishedAt: '2026-10-21T11:00:00.000Z' } : {},
    );
    render(<Editor token="t" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T0} />);
    expect(screen.getByText('Ai modificări nepublicate')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizează pagina publică' }));
    await waitFor(() => expect(screen.queryByText('Ai modificări nepublicate')).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith('/api/e/t/publish', { method: 'POST' });
  });

  it('keeps the step action bar the only filled button while the unpublished bar shows', () => {
    stubFetch(() => ({}));
    render(<Editor token="t" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T0} />);
    expect(screen.getByText('Ai modificări nepublicate')).toBeTruthy();
    expect(document.querySelectorAll('button.bg-primary')).toHaveLength(1);
    expect(screen.getByTestId('bar-primary').classList.contains('bg-primary')).toBe(true);
  });

  it('hides the bar when published and offers "Publică" when never published', () => {
    stubFetch(() => ({}));
    const initial = { draft: createEmptyProject('P'), draftUpdatedAt: T1 };
    const { unmount } = render(<Editor token="t" slug="s" initial={initial} publishedAt={T1} />);
    expect(screen.queryByText('Ai modificări nepublicate')).toBeNull();
    unmount();
    render(<Editor token="t" slug="s" initial={initial} publishedAt={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    expect(screen.getByRole('button', { name: 'Publică' })).toBeTruthy();
  });

  it('disables publish while saving has failed or edits are pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(
      <Editor
        token="t"
        slug="s"
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
        slug="s"
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

  it('shows the limit message when a save is rejected with 413', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({}) }));
    render(
      <Editor
        token="t"
        slug="s"
        initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }}
        publishedAt={T1}
        renderStep={(_s, draft, setDraft) => (
          <button onClick={() => setDraft({ ...draft, direction: 'x' })}>edit</button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    expect(
      await screen.findByText('Proiectul a depășit o limită. Șterge ceva și încearcă din nou.', {}, { timeout: 3000 }),
    ).toBeTruthy();
  });

  it('repairs backlog items whose featureId points at themselves on load, and saves the repair', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ draftUpdatedAt: '2026-10-21T10:00:05.000Z' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const draft = createEmptyProject('P');
    draft.features = [{ id: 'f1', text: 'Harta' }];
    draft.backlog = [
      { id: 'b1', stage: 'start', kind: 'feature', featureId: 'b1', preconditionId: null, text: 'Harta', order: 1 },
      { id: 'b2', stage: 'start', kind: 'feature', featureId: 'b2', preconditionId: null, text: 'Altceva', order: 2 },
    ];
    render(
      <Editor
        token="t"
        slug="s"
        initial={{ draft, draftUpdatedAt: T1 }}
        publishedAt={T1}
        renderStep={(_s, d) => <p>{d.backlog.map((b) => String(b.featureId)).join(',')}</p>}
      />,
    );
    expect(screen.getByText('f1,null')).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), { timeout: 3000 });
    const sent = JSON.parse(fetchMock.mock.calls[0][1]!.body as string).draft;
    expect(sent.backlog.map((b: { featureId: string | null }) => b.featureId)).toEqual(['f1', null]);
  });

  it('saves an accepted card before asking for alerts', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(async (url) => ({
      ok: true,
      status: 200,
      json: async () => (url.endsWith('/alerts') ? { alerts: [] } : { draftUpdatedAt: '2026-10-21T10:00:05.000Z' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const draft = createEmptyProject('P');
    draft.project.description = 'O descriere';
    render(<Editor token="t" slug="s" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Nume'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    fireEvent.click(screen.getByTestId('bar-primary'));

    await waitFor(() => expect(fetchMock.mock.calls.map((c) => c[0])).toContain('/api/e/t/alerts'));
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    const put = urls.indexOf('/api/e/t');
    expect(put).toBeGreaterThanOrEqual(0);
    expect(put).toBeLessThan(urls.indexOf('/api/e/t/alerts'));
    const saved = JSON.parse(fetchMock.mock.calls[put][1]!.body as string).draft;
    expect(saved.team.map((m: { name: string }) => m.name)).toEqual(['Ana']);
    expect(saved.steps.project.status).toBe('done');
  });

  it('renders the step screen and moves on when the step is complete, to the summary after step 10', async () => {
    const fetchMock = stubFetch(() => ({ alerts: [], text: '' }));
    const draft = fillSteps(createEmptyProject('P'), ALL);
    render(<Editor token="t" slug="s" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editează: Proiectul și echipa' }));
    fireEvent.click(screen.getByTestId('bar-primary'));
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Activitățile/ }));
    fireEvent.click(screen.getByTestId('bar-primary'));
    expect(screen.getByRole('heading', { level: 1, name: 'Rezumat' })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/e/t/alerts', expect.objectContaining({ method: 'POST' })));
  });

  it('keeps unaccepted proposals when switching to another step and back', async () => {
    const card = { kind: 'teamMember', data: { id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 5 } };
    stubFetch((url) => (url.endsWith('/ai') ? { kind: 'proposal', text: 'Uite.', cards: [card] } : { alerts: [] }));
    const initial = { draft: fillSteps(createEmptyProject('P'), ['project']), draftUpdatedAt: T1 };
    render(<Editor token="t" slug="s" initial={initial} publishedAt={T1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
    expect(await screen.findByText('propus')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Proiectul și echipa/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Proiectul și echipa' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Problema/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Propuneri în conversație' })).toBeTruthy();
    expect(screen.getByText('propus')).toBeTruthy();
  });

  describe('automatic first question', () => {
    const aiCalls = (fetchMock: ReturnType<typeof vi.fn>) =>
      fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/ai')).length;

    it('leaving a step while the first call is in flight and returning does not ask twice', async () => {
      let release: () => void = () => {};
      const gate = new Promise<void>((r) => (release = r));
      const fetchMock = vi.fn(async (url: string) => {
        if (url.endsWith('/ai')) await gate;
        return { ok: true, status: 200, json: async () => (url.endsWith('/ai') ? { kind: 'question', text: 'Prima întrebare.' } : { alerts: [] }) };
      });
      vi.stubGlobal('fetch', fetchMock);
      const initial = { draft: withFeature(fillSteps(createEmptyProject('P'), ['project'])), draftUpdatedAt: T1 };
      render(<Editor token="t" slug="s" initial={initial} publishedAt={T1} />);
      expect(screen.getByText('Pregătesc prima întrebare…')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Proiectul și echipa/ }));
      fireEvent.click(screen.getByRole('button', { name: /^Problema/ }));
      expect(screen.getByRole('heading', { level: 1, name: 'Problema' })).toBeTruthy();
      expect(screen.getByText('Pregătesc prima întrebare…')).toBeTruthy();
      release();
      expect(await screen.findByText('Prima întrebare.')).toBeTruthy();
      expect(aiCalls(fetchMock)).toBe(2); // one for the project step, one for the problem step; none repeated
      expect(screen.getAllByText('Prima întrebare.')).toHaveLength(1);
    });

    it('reopening a step after an error does not ask again', async () => {
      const fetchMock = vi.fn(async (url: string) => ({
        ok: !url.endsWith('/ai'),
        status: url.endsWith('/ai') ? 502 : 200,
        json: async () => (url.endsWith('/ai') ? { error: 'AI-ul nu răspunde acum.' } : { alerts: [] }),
      }));
      vi.stubGlobal('fetch', fetchMock);
      const initial = { draft: withFeature(fillSteps(createEmptyProject('P'), ['project'])), draftUpdatedAt: T1 };
      render(<Editor token="t" slug="s" initial={initial} publishedAt={T1} />);
      expect(await screen.findByText('AI-ul nu răspunde acum.')).toBeTruthy();
      const before = aiCalls(fetchMock);
      fireEvent.click(screen.getByRole('button', { name: /Proiectul și echipa/ }));
      await screen.findByText('AI-ul nu răspunde acum.'); // project step: its own first ask failed too
      fireEvent.click(screen.getByRole('button', { name: /^Problema/ }));
      expect(screen.getByText('AI-ul nu răspunde acum.')).toBeTruthy(); // the error is remembered
      expect(aiCalls(fetchMock)).toBe(before + 1); // only the project step's first ask
    });
  });

  it('appends organizing items on the first entry only; the button adds them back on demand', async () => {
    stubFetch(() => ({ alerts: [], draftUpdatedAt: T1 }));
    // Steps 1-9 complete: the editor opens on the backlog, which is entered "for the first time" through the sidebar.
    const draft = fillSteps(createEmptyProject('P'), BEFORE_BACKLOG);
    draft.toFindOut = [{ id: 'q1', step: 'problem', text: 'Câți oameni?' }];
    render(<Editor token="t" slug="s" initial={{ draft, draftUpdatedAt: T1 }} publishedAt={T1} />);
    const backlogBtn = () => screen.getByRole('button', { name: /Activitățile/ });
    fireEvent.click(screen.getByRole('button', { name: /Proiectul și echipa/ }));
    fireEvent.click(backlogBtn());
    expect(await screen.findByText('Află: Câți oameni?')).toBeTruthy();
    const card = screen.getByText('Află: Câți oameni?').closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: 'Șterge' }));
    expect(screen.queryByText('Află: Câți oameni?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Proiectul și echipa/ }));
    fireEvent.click(backlogBtn());
    expect(screen.queryByText('Află: Câți oameni?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Adaugă pașii sugerați' }));
    expect(await screen.findByText('Află: Câți oameni?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă pașii sugerați' }));
    expect(screen.getByText('Nu sunt pași noi de adăugat.')).toBeTruthy();
    expect(screen.getAllByText('Află: Câți oameni?')).toHaveLength(1);
  });

  it('first publish shows KeepLinks with absolute links; later publishes only show a notice', async () => {
    const fetchMock = stubFetch((url) =>
      url.endsWith('/publish') ? { slug: 'proiect-abc', publishedAt: '2026-10-21T11:00:00.000Z' } : {},
    );
    render(<Editor token="tok" slug="proiect-abc" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publică' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Păstrează-ți linkurile' })).toBeTruthy();
    expect(screen.getByText(`${window.location.origin}/e/tok`)).toBeTruthy();
    expect(screen.getByText(`${window.location.origin}/p/proiect-abc`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    expect(screen.queryByRole('heading', { name: 'Păstrează-ți linkurile' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/e/tok/publish', { method: 'POST' });
  });

  it('does not show KeepLinks again when updating an already published page', async () => {
    stubFetch((url) => (url.endsWith('/publish') ? { slug: 's', publishedAt: '2026-10-21T11:00:00.000Z' } : {}));
    render(<Editor token="t" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizează pagina publică' }));
    expect(await screen.findByText('Pagina publică a fost actualizată.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Păstrează-ți linkurile' })).toBeNull();
  });

  it('regenerates the edit link after confirmation and shows the new one', async () => {
    const fetchMock = stubFetch((url) => (url.endsWith('/regenerate') ? { editToken: 'nou' } : {}));
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    render(<Editor token="vechi" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Meniu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generează link nou' }));
    expect(confirm).toHaveBeenCalledWith('Linkul vechi nu va mai funcționa.');
    expect(await screen.findByText(`${window.location.origin}/e/nou`)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/e/vechi/regenerate', { method: 'POST' });
    expect(window.location.pathname).toBe('/e/nou');
    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Nume'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    await waitFor(() => expect((fetchMock.mock.calls as unknown[][]).some((c) => c[0] === '/api/e/nou' && (c[1] as RequestInit | undefined)?.method === 'PUT')).toBe(true), { timeout: 3000 });
  });

  it('hides the public link on KeepLinks when the project was never published', async () => {
    stubFetch((url) => (url.endsWith('/regenerate') ? { editToken: 'nou' } : {}));
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    render(<Editor token="v" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Meniu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generează link nou' }));
    expect(await screen.findByText('Pagina publică apare după ce apeși Publică.')).toBeTruthy();
    expect(screen.queryByText(`${window.location.origin}/p/s`)).toBeNull();
    expect(screen.getByText(`${window.location.origin}/e/nou`)).toBeTruthy();
  });

  it('shows the links once on a brand-new project; dismissing it continues to step 1', () => {
    stubFetch(() => ({}));
    render(<Editor token="tok" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Păstrează-ți linkurile' })).toBeTruthy();
    expect(screen.getByText(`${window.location.origin}/e/tok`)).toBeTruthy();
    expect(screen.queryByText(`${window.location.origin}/p/s`)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Proiectul și echipa' })).toBeTruthy();
  });

  it('does not show the links on load once a step was started or the project was published', () => {
    stubFetch(() => ({}));
    const started = createEmptyProject('P');
    started.steps.project.status = 'in_progress';
    const { unmount } = render(<Editor token="t" slug="s" initial={{ draft: started, draftUpdatedAt: T1 }} publishedAt={null} />);
    expect(screen.queryByRole('heading', { name: 'Păstrează-ți linkurile' })).toBeNull();
    unmount();
    render(<Editor token="t" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.queryByRole('heading', { name: 'Păstrează-ți linkurile' })).toBeNull();
  });

  it('hints to keep the address-bar link until the first publication', () => {
    stubFetch(() => ({}));
    const started = createEmptyProject('P');
    started.steps.project.status = 'in_progress';
    const hint = 'Păstrează linkul din bara de adrese — e singura cheie a proiectului.';
    const { unmount } = render(<Editor token="t" slug="s" initial={{ draft: started, draftUpdatedAt: T1 }} publishedAt={null} />);
    expect(screen.getByText(hint)).toBeTruthy();
    unmount();
    render(<Editor token="t" slug="s" initial={{ draft: started, draftUpdatedAt: T1 }} publishedAt={T1} />);
    expect(screen.queryByText(hint)).toBeNull();
  });

  it('copies the edit link from the menu', async () => {
    stubFetch(() => ({}));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<Editor token="tok" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Meniu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiază linkul de editare' }));
    expect(await screen.findByText('Copiat')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/e/tok`);
  });

  it('does nothing when the regenerate confirmation is declined', () => {
    const fetchMock = stubFetch(() => ({}));
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(<Editor token="t" slug="s" initial={{ draft: createEmptyProject('P'), draftUpdatedAt: T1 }} publishedAt={T1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Meniu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generează link nou' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
