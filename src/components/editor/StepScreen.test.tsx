// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode, useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project, StepId } from '@/lib/project/schema';
import { precondition } from '@/lib/steps/completion.fixtures';
import { STEPS } from '@/lib/steps/definitions';
import type { Card } from '@/lib/project/entities';
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
function Harness({
  initial,
  step,
  spy,
  onNext,
  initialProposed = [],
}: {
  initial: Project;
  step: StepId;
  spy: (p: Project) => void;
  onNext?: () => void;
  initialProposed?: Card[];
}) {
  const [draft, setDraftState] = useState(initial);
  const [proposed, setProposed] = useState<Card[]>(initialProposed);
  const ref = useRef(initial);
  const setDraft: SetDraft = (next) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    spy(value);
    setDraftState(value);
  };
  const def = STEPS.find((s) => s.id === step)!;
  return (
    <StepScreen step={def} draft={draft} setDraft={setDraft} token="t" onNext={onNext ?? (() => {})} proposed={proposed} setProposed={setProposed} />
  );
}

/** Unless `empty`, the step starts with an AI message so the chat does not auto-ask on mount. */
function setup(
  step: StepId,
  draft = createEmptyProject('P'),
  onNext?: () => void,
  opts: { empty?: boolean; proposed?: Card[] } = {},
) {
  const spy = vi.fn<(p: Project) => void>();
  if (!opts.empty && draft.steps[step].messages.length === 0) {
    draft.steps[step].messages = [{ role: 'assistant', content: 'Să începem.' }];
  }
  render(<Harness initial={draft} step={step} spy={spy} onNext={onNext} initialProposed={opts.proposed} />);
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
      chat: [
        { role: 'assistant', content: 'Să începem.' },
        { role: 'user', content: 'O aplicație de sesizări' },
      ],
    });
    expect(last().steps.actors.messages).toEqual([
      { role: 'assistant', content: 'Să începem.' },
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
    fireEvent.click(within(screen.getByRole('region', { name: 'Propuneri' })).getByRole('button', { name: 'Acceptă tot' }));

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
    expect(bodyOf(fetchMock, 1).chat).toEqual([
      { role: 'assistant', content: 'Să începem.' },
      { role: 'user', content: 'Salut' },
    ]);
    expect(last().steps.actors.messages).toHaveLength(3);
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

  it('hides Adaugă manual when the list is full and says why', () => {
    const draft = createEmptyProject('P');
    draft.targetChanges = ['t1', 't2', 't3'].map((id) => ({ id, text: `Schimbare ${id}`, signal: '' }));
    setup('target', draft);
    expect(screen.queryByRole('button', { name: 'Adaugă manual' })).toBeNull();
    expect(screen.getByText('Ai atins numărul maxim pentru această listă.')).toBeTruthy();
  });

  it('does not add a new card past the list cap when a proposal is accepted', async () => {
    const draft = createEmptyProject('P');
    draft.targetChanges = ['t1', 't2', 't3'].map((id) => ({ id, text: `Schimbare ${id}`, signal: '' }));
    stubFetch([{ body: { kind: 'proposal', text: '', cards: [{ kind: 'targetChange', data: { id: 't9', text: 'A patra', signal: '' } }] } }]);
    const { last } = setup('target', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Propune rezumatul acum' }));
    await screen.findByText('A patra');
    fireEvent.click(screen.getByRole('button', { name: 'Acceptă' }));
    expect(last().targetChanges).toHaveLength(3);
  });

  it('keeps at most the last 40 messages of a step', async () => {
    const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Și apoi?' } }]);
    const draft = createEmptyProject('P');
    draft.steps.actors.messages = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? ('assistant' as const) : ('user' as const),
      content: `m${i}`,
    }));
    const { last } = setup('actors', draft);
    fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'nou' } });
    fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));
    await screen.findByText('Și apoi?');
    expect(bodyOf(fetchMock, 0).chat).toHaveLength(40);
    const messages = last().steps.actors.messages;
    expect(messages).toHaveLength(40);
    expect(messages.at(-1)).toEqual({ role: 'assistant', content: 'Și apoi?' });
    expect(messages.at(-2)).toEqual({ role: 'user', content: 'nou' });
  });

  it('keeps a done step done when a card is accepted', () => {
    const draft = createEmptyProject('P');
    draft.steps.actors.status = 'done';
    const { last } = setup('actors', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Nume'), { target: { value: 'Primăria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(last().actors).toHaveLength(1);
    expect(last().steps.actors.status).toBe('done');
  });

  it('requires a feature for backlog items of kind feature', () => {
    const draft = createEmptyProject('P');
    draft.features = [{ id: 'f1', text: 'Harta sesizărilor' }];
    const { spy, last } = setup('backlog', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Ce e de făcut'), { target: { value: 'Lansează harta' } });
    fireEvent.change(screen.getByLabelText('Tip'), { target: { value: 'feature' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(screen.getByText('Alege funcția din listă.')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Funcția'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(last().backlog).toEqual([
      { id: 'b1', stage: 'start', kind: 'feature', featureId: 'f1', preconditionId: null, text: 'Lansează harta', order: 1 },
    ]);
  });

  it('clears featureId for backlog items that are not features', () => {
    const draft = createEmptyProject('P');
    draft.features = [{ id: 'f1', text: 'Harta sesizărilor' }];
    const { last } = setup('backlog', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
    fireEvent.change(screen.getByLabelText('Ce e de făcut'), { target: { value: 'Vorbește cu 3 vecini' } });
    fireEvent.change(screen.getByLabelText('Tip'), { target: { value: 'test' } });
    fireEvent.change(screen.getByLabelText('Funcția'), { target: { value: 'f1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvează' }));
    expect(last().backlog[0]).toMatchObject({ kind: 'test', featureId: null });
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
    draft.actors = [actor];
    const { last } = setup('actors', draft);
    expect(screen.getByText('Nimeni exclus')).toBeTruthy();
    const next = screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement;
    expect(next.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Merg mai departe' }));
    expect(last().alerts[0].status).toBe('dismissed');
    expect(screen.queryByText('Nimeni exclus')).toBeNull();
    expect((screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Lucrez la asta acum puts the alert question into the chat', async () => {
    const draft = createEmptyProject('P');
    draft.alerts = [{ code: 'nobody_excluded', step: 5, refs: [], status: 'open', message: 'Cine pierde ceva?' }];
    const { last } = setup('actors', draft);
    fireEvent.click(screen.getByRole('button', { name: 'Lucrez la asta acum' }));
    expect(last().steps.actors.messages.at(-1)).toEqual({ role: 'assistant', content: 'Cine pierde ceva?' });
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Cine pierde ceva?'));
  });

  it('Pasul următor marks the step done, moves on and merges the background alerts', async () => {
    const llmAlert = { code: 'magic_leap', step: 7, refs: ['p1'], status: 'open', message: 'De ce ar duce A la B?' };
    const fetchMock = stubFetch([], { body: { alerts: [llmAlert] } });
    const onNext = vi.fn();
    const draft = createEmptyProject('P');
    draft.preconditions = [precondition];
    const { last } = setup('preconditions', draft, onNext);

    fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/e/t/alerts');
    expect(bodyOf(fetchMock, 0)).toEqual({ step: 'preconditions' });
    await waitFor(() => expect(last().alerts).toContainEqual(llmAlert));
    expect(last().steps.preconditions.status).toBe('done');
  });

  it('a second alerts refresh replaces the step\'s LLM alert instead of piling up', async () => {
    const draft = createEmptyProject('P');
    draft.alerts = [{ code: 'magic_leap', step: 7, refs: ['p1'], status: 'open', message: 'Vechi.' }];
    const fresh = { code: 'magic_leap', step: 7, refs: ['p2'], status: 'open', message: 'Nou.' };
    draft.preconditions = [precondition];
    const fetchMock = stubFetch([], { body: { alerts: [fresh] } });
    const { last } = setup('preconditions', draft);
    fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(last().alerts).toContainEqual(fresh));
    expect(last().alerts.filter((a) => a.code === 'magic_leap')).toHaveLength(1);
  });

  it('ignores a failed alerts call', async () => {
    const fetchMock = stubFetch([], { status: 502, body: { error: 'AI-ul nu răspunde acum.' } });
    const draft = createEmptyProject('P');
    draft.preconditions = [precondition];
    const { spy } = setup('preconditions', draft);
    fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
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

  describe('AI asks first', () => {
    it('asks automatically on mount with an empty chat, exactly once, also across re-renders', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Cine suferă cel mai mult?' } }]);
      const { last } = setup('actors', createEmptyProject('P'), undefined, { empty: true });
      expect(screen.getByText('AI-ul pregătește prima întrebare…')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Începe conversația' })).toBeNull();
      expect(screen.queryByText(/Scrie liber/)).toBeNull();
      await screen.findByText('Cine suferă cel mai mult?');
      expect(screen.queryByText('AI-ul pregătește prima întrebare…')).toBeNull();
      expect(fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/ai'))).toHaveLength(1);
      expect(bodyOf(fetchMock, 0)).toEqual({ step: 'actors', chat: [] });
      expect(last().steps.actors.messages).toEqual([{ role: 'assistant', content: 'Cine suferă cel mai mult?' }]);
    });

    it('asks only once under StrictMode double effects', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Prima întrebare.' } }]);
      render(
        <StrictMode>
          <Harness initial={createEmptyProject('P')} step="actors" spy={() => {}} />
        </StrictMode>,
      );
      await screen.findByText('Prima întrebare.');
      expect(fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/ai'))).toHaveLength(1);
    });

    it('does not ask when the step already has messages', async () => {
      const fetchMock = stubFetch([]);
      setup('actors');
      await Promise.resolve();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not re-ask after an error; Reîncearcă asks again', async () => {
      const fetchMock = stubFetch([
        { status: 502, body: { error: 'AI-ul nu răspunde acum.' } },
        { body: { kind: 'question', text: 'Acum merge.' } },
      ]);
      setup('actors', createEmptyProject('P'), undefined, { empty: true });
      await screen.findByText('AI-ul nu răspunde acum.');
      expect(screen.getByRole('button', { name: 'Completează în formular' })).toBeTruthy();
      await Promise.resolve();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }));
      await screen.findByText('Acum merge.');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('shows a non-stored hint under the last AI message when a proposal arrives', async () => {
      stubFetch([{ body: { kind: 'proposal', text: 'Uite actorii.', cards: [{ kind: 'actor', data: actor }] } }]);
      const { last } = setup('actors');
      expect(screen.queryByText(/Propunerea e în/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Propune rezumatul acum' }));
      expect(await screen.findByText(/Propunerea e în «Rezultatul pasului»/)).toBeTruthy();
      expect(last().steps.actors.messages.every((m) => !m.content.includes('Propunerea e în'))).toBe(true);
    });
  });

  describe('pending proposals', () => {
    const two = [actor, { ...actor, id: 'a2', name: 'Consiliul local' }].map((data) => ({ kind: 'actor' as const, data }));

    it('shows the unaccepted bar and Acceptă tot there saves them', () => {
      const { last } = setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      const bar = screen.getByRole('region', { name: 'Propuneri neacceptate' });
      expect(within(bar).getByText('Ai 2 propuneri neacceptate. Nu se salvează până nu le accepți.')).toBeTruthy();
      fireEvent.click(within(bar).getByRole('button', { name: 'Acceptă tot' }));
      expect(last().actors.map((a) => a.id)).toEqual(['a1', 'a2']);
      expect(screen.queryByRole('region', { name: 'Propuneri neacceptate' })).toBeNull();
    });

    it('Am terminat pasul with pending proposals asks first; Continuă fără ele moves on without saving', () => {
      const onNext = vi.fn();
      stubFetch([]);
      const draft = createEmptyProject('P');
      draft.actors = [{ ...actor, id: 'a9', name: 'Deja salvat' }];
      const { spy } = setup('actors', draft, onNext, { proposed: two });
      fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
      expect(onNext).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Acceptă tot și continuă' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Continuă fără ele' }));
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls.at(-1)![0].actors.map((a) => a.id)).toEqual(['a9']);
    });

    it('Înapoi cancels the choice, and the choice resets when the proposals are gone', () => {
      stubFetch([]);
      const draft = createEmptyProject('P');
      draft.actors = [{ ...actor, id: 'a9' }];
      setup('actors', draft, vi.fn(), { proposed: two });
      fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Înapoi' }));
      expect(screen.queryByRole('button', { name: 'Continuă fără ele' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Acceptă tot și continuă' }));
      expect(screen.queryByRole('button', { name: 'Continuă fără ele' })).toBeNull();
    });

    it('a disabled Continuă fără ele carries the missing-step hint', () => {
      stubFetch([]);
      setup('actors', createEmptyProject('P'), vi.fn(), { proposed: two });
      fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
      const skip = screen.getByRole('button', { name: 'Continuă fără ele' });
      expect(skip.getAttribute('title')).toBe('Acceptă cel puțin un actor.');
      expect(document.getElementById(skip.getAttribute('aria-describedby')!)!.textContent).toBe('Acceptă cel puțin un actor.');
    });

    it('a new AI proposal is merged with the pending cards, replacing the same kind and id', async () => {
      const a2 = { ...actor, id: 'a2', name: 'Consiliul local' };
      const a1new = { ...actor, name: 'Primăria (nou)' };
      stubFetch([
        { body: { kind: 'proposal', text: 'Unu.', cards: [{ kind: 'actor', data: actor }, { kind: 'actor', data: a2 }] } },
        { body: { kind: 'proposal', text: 'Doi.', cards: [{ kind: 'actor', data: a1new }] } },
      ]);
      setup('actors');
      fireEvent.click(screen.getByRole('button', { name: 'Propune rezumatul acum' }));
      await screen.findByText('Unu.');
      fireEvent.click(screen.getByRole('button', { name: 'Propune rezumatul acum' }));
      await screen.findByText('Doi.');
      const region = screen.getByRole('region', { name: 'Propuneri' });
      expect(within(region).getByText('Consiliul local')).toBeTruthy();
      expect(within(region).getByText('Primăria (nou)')).toBeTruthy();
      expect(within(region).queryByText('Primăria')).toBeNull();
      expect(within(region).getAllByText('propus')).toHaveLength(2);
    });

    it('Acceptă tot și continuă saves the proposals, then moves on and marks the step done', () => {
      const onNext = vi.fn();
      stubFetch([]);
      const { last } = setup('actors', createEmptyProject('P'), onNext, { proposed: two });
      fireEvent.click(screen.getByRole('button', { name: /Am terminat pasul/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Acceptă tot și continuă' }));
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(last().actors.map((a) => a.id)).toEqual(['a1', 'a2']);
      expect(last().steps.actors.status).toBe('done');
    });

    it('typing "da" while proposals are pending shows the accept hint and keeps the proposals', async () => {
      stubFetch([{ body: { kind: 'question', text: 'Mai spune-mi.' } }]);
      const { last } = setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'da' } });
      fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));
      expect(await screen.findByText('Ca să salvezi propunerea, apasă «Acceptă tot» sau «Acceptă» pe fiecare card.')).toBeTruthy();
      await screen.findByText('Mai spune-mi.');
      expect(screen.getByRole('region', { name: 'Propuneri neacceptate' })).toBeTruthy();
      expect(screen.getAllByText('propus')).toHaveLength(2);
      expect(last().steps.actors.messages.every((m) => !m.content.includes('Ca să salvezi'))).toBe(true);
    });

    it('does not show the accept hint when nothing is pending', async () => {
      stubFetch([{ body: { kind: 'question', text: 'Mai spune-mi.' } }]);
      setup('actors');
      fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: 'da' } });
      fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));
      await screen.findByText('Mai spune-mi.');
      expect(screen.queryByText(/Ca să salvezi propunerea/)).toBeNull();
    });
  });

  describe('step state', () => {
    it('says nothing is saved yet for an empty step', () => {
      setup('actors');
      expect(screen.getByText('Încă nimic salvat la acest pas. Acceptă propunerile AI-ului sau adaugă manual.')).toBeTruthy();
    });

    it('counts accepted elements', () => {
      const draft = createEmptyProject('P');
      draft.actors = [actor, { ...actor, id: 'a2', name: 'Alt actor' }];
      setup('actors', draft);
      expect(screen.getByText('✓ Salvat pentru acest pas: 2 elemente.')).toBeTruthy();
    });

    it('prefixes Pas încheiat for a done step', () => {
      const draft = createEmptyProject('P');
      draft.actors = [actor];
      draft.steps.actors.status = 'done';
      setup('actors', draft);
      expect(screen.getByText('Pas încheiat · ✓ Salvat pentru acest pas: 1 elemente.')).toBeTruthy();
    });

    it('labels the bottom button with the next step title, Rezumat after step 10', () => {
      setup('actors');
      expect(screen.getByRole('button', { name: 'Am terminat pasul → Relațiile' })).toBeTruthy();
      cleanup();
      setup('backlog');
      expect(screen.getByRole('button', { name: 'Am terminat pasul → Rezumat' })).toBeTruthy();
    });

    it('disables Am terminat pasul while the step is incomplete, with the hint linked by aria-describedby', () => {
      stubFetch([]);
      const onNext = vi.fn();
      const { spy } = setup('actors', createEmptyProject('P'), onNext);
      const button = screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      const hint = screen.getByText('Acceptă cel puțin un actor.');
      expect(button.getAttribute('aria-describedby')).toBe(hint.id);
      fireEvent.click(button);
      expect(onNext).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('enables the button and drops the hint once the step is complete', () => {
      const draft = createEmptyProject('P');
      draft.actors = [actor];
      setup('actors', draft);
      expect((screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement).disabled).toBe(false);
      expect(screen.queryByText('Acceptă cel puțin un actor.')).toBeNull();
    });

    it('Nu am găsit nimic similar completes the existing step', () => {
      stubFetch([]);
      const { last } = setup('existing');
      const button = () => screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement;
      expect(button().disabled).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Nu am găsit nimic similar' }));
      expect(last().existing).toEqual([
        { id: 'e1', name: 'Nimic similar găsit', url: null, difference: 'Dev-ul a căutat și n-a găsit inițiative similare.' },
      ]);
      expect(button().disabled).toBe(false);
    });

    it('hides Nu am găsit nimic similar once an existing entry exists', () => {
      const draft = createEmptyProject('P');
      draft.existing = [{ id: 'e1', name: 'X', url: null, difference: 'y' }];
      setup('existing', draft);
      expect(screen.queryByRole('button', { name: 'Nu am găsit nimic similar' })).toBeNull();
    });

    it('does not offer Nu am găsit nimic similar on other steps', () => {
      setup('actors');
      expect(screen.queryByRole('button', { name: 'Nu am găsit nimic similar' })).toBeNull();
    });

    it('with pending proposals that would complete the step, only Acceptă tot și continuă is possible', () => {
      stubFetch([]);
      const onNext = vi.fn();
      setup('actors', createEmptyProject('P'), onNext, { proposed: [{ kind: 'actor', data: actor }] });
      const button = screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      fireEvent.click(button);
      expect((screen.getByRole('button', { name: 'Continuă fără ele' }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: 'Acceptă tot și continuă' }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('with pending proposals that would not complete the step, the button stays disabled', () => {
      setup('relations', createEmptyProject('P'), vi.fn(), { proposed: [{ kind: 'actor', data: actor }] });
      expect((screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('an empty singleton step (problem) shows nothing saved and is not marked done', () => {
      stubFetch([]);
      setup('problem', createEmptyProject('P'), vi.fn());
      expect(screen.getByText(/Încă nimic salvat la acest pas/)).toBeTruthy();
      expect((screen.getByRole('button', { name: /Am terminat pasul/ }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText('Acceptă formularea problemei.')).toBeTruthy();
    });

    it('a stored done on an empty step is not shown as Pas încheiat', () => {
      const draft = createEmptyProject('P');
      draft.steps.actors.status = 'done';
      setup('actors', draft);
      expect(screen.queryByText(/Pas încheiat/)).toBeNull();
    });
  });
});
