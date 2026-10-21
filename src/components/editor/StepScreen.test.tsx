// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project, StepId } from '@/lib/project/schema';
import { STEPS } from '@/lib/steps/definitions';
import { StepScreen, type SetDraft } from './StepScreen';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Reply = { status?: number; body: unknown };

/** fetch mock: `/ai` answers come from the queue in order; `/alerts` from `alerts`. */
function stubFetch(aiReplies: Reply[], alerts: Reply = { body: { alerts: [] } }) {
  const queue = [...aiReplies];
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>(async (url) => {
    const r = url.endsWith('/alerts') ? alerts : (queue.shift() ?? { body: { kind: 'question', text: '?' } });
    const status = r.status ?? 200;
    return { ok: status < 400, status, json: async () => r.body };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call: number) =>
  JSON.parse((fetchMock.mock.calls[call][1] as RequestInit).body as string);

/** Holds the draft like useAutosave does; `spy` receives every resolved draft. */
function Harness({ initial, step, spy, onNext }: { initial: Project; step: StepId; spy: (p: Project) => void; onNext?: () => void }) {
  const [draft, setDraftState] = useState(initial);
  const ref = useRef(initial);
  const setDraft: SetDraft = (next) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    spy(value);
    setDraftState(value);
  };
  const def = STEPS.find((s) => s.id === step)!;
  return <StepScreen step={def} draft={draft} setDraft={setDraft} token="t" onNext={onNext ?? (() => {})} />;
}

function setup(step: StepId, draft = createEmptyProject('P'), onNext?: () => void) {
  const spy = vi.fn<(p: Project) => void>();
  render(<Harness initial={draft} step={step} spy={spy} onNext={onNext} />);
  const last = () => spy.mock.calls.at(-1)![0];
  return { spy, last };
}

const actor = { id: 'a1', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false } as const;

describe('StepScreen', () => {
  it('shows the step title as h1 and an AI question in the chat, focused', async () => {
    const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Cine decide la primărie?' } }]);
    const { last } = setup('actors');
    expect(screen.getByRole('heading', { level: 1, name: 'Actorii' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'O aplicație de sesizări' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));

    const question = await screen.findByText('Cine decide la primărie?');
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Cine decide la primărie?'));
    expect(question).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/e/t/ai');
    expect(bodyOf(fetchMock, 0)).toEqual({
      step: 'actors',
      chat: [{ role: 'user', content: 'O aplicație de sesizări' }],
    });
    expect(last().steps.actors.messages).toEqual([
      { role: 'user', content: 'O aplicație de sesizări' },
      { role: 'assistant', content: 'Cine decide la primărie?' },
    ]);
    // Chat messages alone do not move the step to in_progress.
    expect(last().steps.actors.status).toBe('untouched');
  });

  it('sends the saved messages plus the new one as chat', async () => {
    const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Și altcineva?' } }]);
    const draft = createEmptyProject('P');
    draft.steps.actors.messages = [{ role: 'assistant', content: 'Cine suferă?' }];
    setup('actors', draft);
    fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'Pietonii' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));
    await screen.findByText('Și altcineva?');
    expect(bodyOf(fetchMock, 0).chat).toEqual([
      { role: 'assistant', content: 'Cine suferă?' },
      { role: 'user', content: 'Pietonii' },
    ]);
  });

  it('shows a proposed actor card and accepts it into the draft', async () => {
    stubFetch([{ body: { kind: 'proposal', text: 'Uite actorii.', cards: [{ kind: 'actor', data: actor }] } }]);
    const { last } = setup('actors');
    fireEvent.click(screen.getByRole('button', { name: 'Propune rezumatul acum' }));

    expect(await screen.findByText('propus')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Acceptă' }));

    expect(last().actors).toEqual([actor]);
    expect(last().steps.actors.status).toBe('in_progress');
    expect(screen.queryByText('propus')).toBeNull();
    expect(screen.getByText('Primăria')).toBeTruthy();
  });

  it('accepts all proposed cards at once and discards one with Șterge', async () => {
    const a2 = { ...actor, id: 'a2', name: 'Consiliul local' };
    const a3 = { ...actor, id: 'a3', name: 'Presa locală', type: 'media' };
    stubFetch([{ body: { kind: 'proposal', text: '', cards: [actor, a2, a3].map((data) => ({ kind: 'actor', data })) } }]);
    const { last } = setup('actors');
    fireEvent.click(screen.getByRole('button', { name: 'Propune rezumatul acum' }));
    await screen.findByText('Presa locală');

    const proposed = screen.getByRole('region', { name: 'Propuneri' });
    fireEvent.click(within(proposed).getAllByRole('button', { name: 'Șterge' })[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Acceptă tot' }));

    expect(last().actors.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(screen.queryByText('Presa locală')).toBeNull();
  });

  it('marks the last AI question as "de aflat" on the third consecutive Nu știu', async () => {
    const fetchMock = stubFetch([
      { body: { kind: 'question', text: 'Indiciu: cine semnează autorizațiile?' } },
      { body: { kind: 'question', text: 'De exemplu, la un proiect fictiv: Direcția de urbanism. La voi?' } },
    ]);
    const draft = createEmptyProject('P');
    draft.steps.actors.messages = [{ role: 'assistant', content: 'Cine decide?' }];
    const { last } = setup('actors', draft);

    fireEvent.click(screen.getByRole('button', { name: 'Nu știu' }));
    await screen.findByText('Indiciu: cine semnează autorizațiile?');
    fireEvent.click(screen.getByRole('button', { name: 'Nu știu' }));
    await screen.findByText(/proiect fictiv/);
    fireEvent.click(screen.getByRole('button', { name: 'Nu știu' }));

    expect(await screen.findByText('Am notat întrebarea ca «de aflat». Mergi mai departe.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchMock, 0).chat.at(-1)).toEqual({ role: 'user', content: 'Nu știu' });
    expect(last().toFindOut).toEqual([
      { id: 'q1', step: 'actors', text: 'De exemplu, la un proiect fictiv: Direcția de urbanism. La voi?' },
    ]);
  });

  it('on 502 shows the error and opens the form mode', async () => {
    stubFetch([{ status: 502, body: { error: 'AI-ul nu răspunde acum.' } }]);
    setup('actors');
    fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'Salut' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));

    expect(await screen.findByText('AI-ul nu răspunde acum.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Completează în formular' }));
    expect(screen.getByLabelText('Nume')).toBeTruthy();
  });

  it('retries the same chat after an error', async () => {
    const fetchMock = stubFetch([
      { status: 429, body: { error: 'Ai atins limita de azi pentru AI. Poți continua în modul formular.' } },
      { body: { kind: 'question', text: 'Gata, merge.' } },
    ]);
    const { last } = setup('actors');
    fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'Salut' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));
    await screen.findByText(/limita de azi/);
    fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }));
    await screen.findByText('Gata, merge.');
    expect(bodyOf(fetchMock, 1).chat).toEqual([{ role: 'user', content: 'Salut' }]);
    expect(last().steps.actors.messages).toHaveLength(2);
  });

  it('adds a card manually through the form, validating it first', () => {
    const { spy, last } = setup('actors');
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(screen.getByText('Completează acest câmp.')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Nume'), { target: { value: 'Asociația Pietonilor' } });
    fireEvent.change(screen.getByLabelText('Tip'), { target: { value: 'ngo' } });
    fireEvent.click(screen.getByLabelText('Exclus sau afectat negativ'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));

    expect(last().actors).toEqual([
      { id: 'a1', name: 'Asociația Pietonilor', type: 'ngo', power: 'medium', stance: 'unknown', excluded: true },
    ]);
    expect(last().steps.actors.status).toBe('in_progress');
  });

  it('shows zod length errors inline', () => {
    setup('actors');
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Nume'), { target: { value: 'x'.repeat(121) } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(screen.getByText('Cel mult 120 de caractere.')).toBeTruthy();
  });

  it('lists actors in the reference selects of a relation', () => {
    const draft = createEmptyProject('P');
    draft.actors = [actor, { ...actor, id: 'a2', name: 'Cetățenii', type: 'user' }];
    const { last } = setup('relations', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('De la'), { target: { value: 'a1' } });
    fireEvent.change(screen.getByLabelText('Către'), { target: { value: 'a2' } });
    fireEvent.change(screen.getByLabelText('Relație'), { target: { value: 'decides' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(last().relations).toEqual([{ id: 'r1', from: 'a1', to: 'a2', type: 'decides', note: '' }]);
  });

  it('on the risks step edits only risky and test, with the text read-only', () => {
    const draft = createEmptyProject('P');
    draft.preconditions = [
      {
        id: 'p1',
        text: 'Primăria acceptă datele',
        actorId: null,
        stage: 'start',
        leadsTo: 't1',
        coveredByApp: false,
        assumption: '',
        risky: false,
        test: '',
      },
    ];
    const { last } = setup('risks', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Editează' }));
    expect(screen.queryByLabelText('Precondiția')).toBeNull();
    expect(screen.queryByLabelText('Etapa')).toBeNull();
    fireEvent.click(screen.getByLabelText('Ipoteză riscantă'));
    fireEvent.change(screen.getByLabelText('Test ieftin'), { target: { value: 'O cerere 544' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(last().preconditions[0]).toMatchObject({ text: 'Primăria acceptă datele', risky: true, test: 'O cerere 544' });
  });

  it('keeps Pasul următor active with an open alert; Merg mai departe dismisses it', () => {
    stubFetch([]);
    const draft = createEmptyProject('P');
    draft.alerts = [
      { code: 'nobody_excluded', step: 5, refs: [], status: 'open', message: 'Cine nu poate folosi asta sau pierde ceva dacă reușești?' },
    ];
    const { last } = setup('actors', draft);
    expect(screen.getByText('Nimeni exclus')).toBeTruthy();
    const next = screen.getByRole('button', { name: 'Pasul următor →' }) as HTMLButtonElement;
    expect(next.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Merg mai departe' }));
    expect(last().alerts[0].status).toBe('dismissed');
    expect(screen.queryByText('Nimeni exclus')).toBeNull();
    expect((screen.getByRole('button', { name: 'Pasul următor →' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Lucrez la asta acum puts the alert question into the chat', async () => {
    const draft = createEmptyProject('P');
    draft.alerts = [{ code: 'nobody_excluded', step: 5, refs: [], status: 'open', message: 'Cine pierde ceva?' }];
    const { last } = setup('actors', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Lucrez la asta acum' }));
    expect(last().steps.actors.messages).toEqual([{ role: 'assistant', content: 'Cine pierde ceva?' }]);
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Cine pierde ceva?'));
  });

  it('Pasul următor marks the step done, moves on and merges the background alerts', async () => {
    const llmAlert = { code: 'magic_leap', step: 7, refs: ['p1'], status: 'open', message: 'De ce ar duce A la B?' };
    const fetchMock = stubFetch([], { body: { alerts: [llmAlert] } });
    const onNext = vi.fn();
    const { last } = setup('preconditions', createEmptyProject('P'), onNext);

    fireEvent.click(screen.getByRole('button', { name: 'Pasul următor →' }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/e/t/alerts');
    expect(bodyOf(fetchMock, 0)).toEqual({ step: 'preconditions' });
    await waitFor(() => expect(last().alerts).toContainEqual(llmAlert));
    expect(last().steps.preconditions.status).toBe('done');
  });

  it('ignores a failed alerts call', async () => {
    const fetchMock = stubFetch([], { status: 502, body: { error: 'AI-ul nu răspunde acum.' } });
    const { spy } = setup('preconditions');
    fireEvent.click(screen.getByRole('button', { name: 'Pasul următor →' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('labels a stale card "de revizuit" and Păstrează clears it', () => {
    const draft = createEmptyProject('P');
    draft.actors = [actor];
    draft.stale = ['a1'];
    const { last } = setup('actors', draft);
    expect(screen.getByText('de revizuit')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Păstrează' }));
    expect(last().stale).toEqual([]);
    expect(screen.queryByText('de revizuit')).toBeNull();
  });

  it('disables sending above 4,000 characters and shows the counter above 3,500', () => {
    setup('actors');
    const input = screen.getByLabelText('Răspunsul tău');
    fireEvent.change(input, { target: { value: 'a'.repeat(3500) } });
    expect(screen.queryByText(/\/ 4000/)).toBeNull();
    fireEvent.change(input, { target: { value: 'a'.repeat(4001) } });
    expect(screen.getByText('4001 / 4000')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Trimite' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
