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
const two = [actor, { ...actor, id: 'a2', name: 'Consiliul local' }].map((data) => ({ kind: 'actor' as const, data }));

const chat = () => screen.getByRole('region', { name: 'Conversația' });
const bar = () => screen.getByRole('region', { name: 'Acțiunile pasului' });
const checklist = () => screen.getByRole('region', { name: 'Ce cere pasul' });
const proposeChip = () => within(chat()).getByRole('button', { name: 'Propune acum' });
const primary = () => within(bar()).getByTestId('bar-primary');
const aiCalls = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/ai'));
const say = (text: string) => {
  fireEvent.change(screen.getByLabelText('Răspunsul tău'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Trimite' }));
};

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
    fireEvent.click(proposeChip());

    expect(await screen.findByText('propus')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Acceptă' }));

    expect(last().actors).toEqual([actor]);
    expect(last().steps.actors.status).toBe('in_progress');
    expect(screen.queryByText('propus')).toBeNull();
    expect(screen.getByText('Primăria')).toBeTruthy();
  });

  it('accepts all proposed cards at once and discards one with Renunță', async () => {
    const a2 = { ...actor, id: 'a2', name: 'Consiliul local' };
    const a3 = { ...actor, id: 'a3', name: 'Presa locală', type: 'media' };
    stubFetch([{ body: { kind: 'proposal', text: '', cards: [actor, a2, a3].map((data) => ({ kind: 'actor', data })) } }]);
    const { last } = setup('actors');
    fireEvent.click(proposeChip());
    await screen.findByText('Presa locală');

    const proposed = screen.getByRole('region', { name: 'Propuneri' });
    fireEvent.click(within(proposed).getAllByRole('button', { name: 'Renunță' })[2]);
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

    expect(
      await screen.findByText(
        'Am notat întrebarea ca «de aflat» — apare pe pagina publică la «Întrebări la care ne poți ajuta». Mergem mai departe.',
      ),
    ).toBeTruthy();
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
    expect(screen.getByText('Ce ai scris e salvat.')).toBeTruthy();
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
    fireEvent.click(proposeChip());
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
      expect(screen.getByText('Pregătesc prima întrebare…')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Începe conversația' })).toBeNull();
      expect(screen.queryByText(/Scrie liber/)).toBeNull();
      await screen.findByText('Cine suferă cel mai mult?');
      expect(screen.queryByText('Pregătesc prima întrebare…')).toBeNull();
      expect(aiCalls(fetchMock)).toHaveLength(1);
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
      expect(aiCalls(fetchMock)).toHaveLength(1);
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

    it('says what the AI prepares while thinking, and disables the input and chips', async () => {
      let release: () => void = () => {};
      const gate = new Promise<void>((r) => (release = r));
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          await gate;
          return { ok: true, status: 200, json: async () => ({ kind: 'question', text: 'Gata.' }) };
        }),
      );
      setup('actors');
      fireEvent.click(proposeChip());
      expect(screen.getByText('Pregătesc propunerile pentru pas…')).toBeTruthy();
      expect((screen.getByLabelText('Răspunsul tău') as HTMLTextAreaElement).disabled).toBe(true);
      expect((within(chat()).getByRole('button', { name: 'Nu știu' }) as HTMLButtonElement).disabled).toBe(true);
      release();
      await screen.findByText('Gata.');
      say('Ceva');
      expect(await screen.findByText('Mă gândesc…')).toBeTruthy();
    });

    it('shows the Ctrl+Enter hint', () => {
      setup('actors');
      expect(screen.getByText('Ctrl+Enter trimite')).toBeTruthy();
    });
  });

  describe('header', () => {
    it('shows the step number and phase, the summary and the explainer', () => {
      setup('actors');
      expect(screen.getByText('Pasul 5 din 10 · Teoria schimbării')).toBeTruthy();
      expect(
        screen.getByText('AI-ul îți pune întrebări până când lista „Ce cere pasul” e bifată. Ce propune apare punctat — se salvează doar ce accepți.'),
      ).toBeTruthy();
      expect(screen.getByText('AI-ul întreabă până se bifează „Ce cere pasul”. Se salvează doar ce accepți.')).toBeTruthy();
      expect(screen.queryByText(/Poți scrie liber/)).toBeNull();
      expect(document.title).toBe('Pasul 5 din 10: Actorii');
    });

    it('adds the free-text hint on step 1 only', () => {
      setup('project');
      expect(screen.getByText('Poți scrie liber, lipi o listă din README sau răspunde „nu știu”.')).toBeTruthy();
    });
  });

  describe('Ce cere pasul', () => {
    it('lists the rows with their level, counter and why line', () => {
      setup('actors');
      const list = checklist();
      expect(within(list).getByRole('heading', { name: 'Ce cere pasul' })).toBeTruthy();
      expect(within(list).getByText('0 din 4')).toBeTruthy();
      const first = within(list).getByText('Cel puțin un actor').closest('li')!;
      expect(within(first).getByText('obligatoriu')).toBeTruthy();
      const excluded = within(list).getByText('Cine e exclus sau pierde ceva').closest('li')!;
      expect(within(excluded).getByText('recomandat')).toBeTruthy();
      expect(within(excluded).getByText('De ce contează: Ca să nu construiești doar pentru cei care au deja acces.')).toBeTruthy();
    });

    it('marks rows that pending proposals would satisfy as proposed, and saved ones with ✓', () => {
      setup('actors', createEmptyProject('P'), undefined, { proposed: [{ kind: 'actor', data: actor }] });
      const row = within(checklist()).getByText('Cel puțin un actor').closest('li')!;
      expect(within(row).getByText('propus — acceptă ca să salvezi')).toBeTruthy();
      expect(row.getAttribute('data-state')).toBe('proposed');
      fireEvent.click(within(screen.getByRole('region', { name: 'Propuneri' })).getByRole('button', { name: 'Acceptă' }));
      expect(within(checklist()).getByText('Cel puțin un actor').closest('li')!.getAttribute('data-state')).toBe('saved');
      expect(within(checklist()).getByText('2 din 4')).toBeTruthy();
    });

    it('step 3: Nu am găsit nimic similar sits in its row and completes the step', () => {
      stubFetch([]);
      const { last } = setup('existing');
      const row = within(checklist()).getByText('O inițiativă asemănătoare — sau „nu am găsit nimic”').closest('li')!;
      expect(within(row).getByRole('link', { name: 'Caută în Civic Tech Field Guide ↗' }).getAttribute('href')).toBe('https://civictech.guide');
      fireEvent.click(within(row).getByRole('button', { name: 'Nu am găsit nimic similar' }));
      expect(last().existing).toEqual([
        { id: 'e1', name: 'Nimic similar găsit', url: null, difference: 'Dev-ul a căutat și n-a găsit inițiative similare.' },
      ]);
      expect(screen.queryByRole('button', { name: 'Nu am găsit nimic similar' })).toBeNull();
      expect(primary().getAttribute('aria-disabled')).toBeNull();
    });

    it('step 10: Adaugă pașii sugerați sits in the first row', () => {
      setup('backlog');
      const row = within(checklist()).getByText('Cel puțin un element').closest('li')!;
      fireEvent.click(within(row).getByRole('button', { name: 'Adaugă pașii sugerați' }));
      expect(within(row).getByText('Nu sunt pași noi de adăugat.')).toBeTruthy();
    });

    describe('orphan features', () => {
      function orphans() {
        const draft = createEmptyProject('P');
        draft.features = [
          { id: 'f1', text: 'Harta' },
          { id: 'f2', text: 'Export CSV' },
        ];
        draft.preconditions = [{ ...precondition, text: 'Primăria acceptă', stage: 'mid' }];
        draft.backlog = [{ id: 'b1', stage: 'start', kind: 'test', featureId: null, preconditionId: null, text: 't', order: 1 }];
        return draft;
      }
      const orphanRow = () => within(checklist()).getByText(/Fiecare funcție e legată/).closest('li')!;

      it('lists the unlinked features; Leagă de… links one to a precondition', () => {
        const { last } = setup('backlog', orphans());
        expect(within(orphanRow()).getByText('2 funcții nu ajută încă la nicio precondiție:')).toBeTruthy();
        fireEvent.change(within(orphanRow()).getByLabelText('Leagă de… (Harta)'), { target: { value: 'p1' } });
        expect(last().backlog.at(-1)).toMatchObject({ kind: 'feature', featureId: 'f1', preconditionId: 'p1', stage: 'mid', text: 'Harta' });
        expect(within(orphanRow()).queryByText('Harta')).toBeNull();
      });

      it('Mai târziu stores the feature unlinked and keeps it; Păstrează keeps it; the row turns ✓', () => {
        const { last } = setup('backlog', orphans());
        fireEvent.click(within(orphanRow()).getByRole('button', { name: 'Mai târziu: Harta' }));
        expect(last().backlog.at(-1)).toMatchObject({ kind: 'feature', featureId: 'f1', preconditionId: null, stage: 'mid' });
        expect(last().alerts).toContainEqual(expect.objectContaining({ code: 'orphan_feature', refs: ['f1'], status: 'dismissed' }));
        fireEvent.click(within(orphanRow()).getByRole('button', { name: 'Păstrează: Export CSV' }));
        expect(last().alerts.filter((a) => a.status === 'dismissed')).toHaveLength(2);
        expect(orphanRow().getAttribute('data-state')).toBe('saved');
      });

      it('Mută toate la „mai târziu” moves every orphan', () => {
        const { last } = setup('backlog', orphans());
        fireEvent.click(within(orphanRow()).getByRole('button', { name: 'Mută toate la „mai târziu”' }));
        expect(last().backlog.filter((b) => b.kind === 'feature').map((b) => b.featureId)).toEqual(['f1', 'f2']);
        expect(orphanRow().getAttribute('data-state')).toBe('saved');
      });
    });
  });

  describe('action bar', () => {
    it('D: names what is missing; the aria-disabled primary focuses the missing row and announces it', () => {
      stubFetch([]);
      const onNext = vi.fn();
      const { spy } = setup('actors', createEmptyProject('P'), onNext);
      expect(within(bar()).getByText('Mai lipsește: Cel puțin un actor')).toBeTruthy();
      expect(primary().textContent).toContain('Treci la pasul următor →');
      expect(primary().getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(primary());
      expect(onNext).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
      expect(document.activeElement?.textContent).toContain('Cel puțin un actor');
      expect(screen.getByTestId('announcer').textContent).toBe('Ca să treci mai departe: Cel puțin un actor.');
    });

    it('D: Propune acum asks the AI for proposals', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Ok.' } }]);
      setup('actors');
      fireEvent.click(within(bar()).getByRole('button', { name: 'Propune acum' }));
      await screen.findByText('Ok.');
      expect(bodyOf(fetchMock, 0).chat.at(-1)).toEqual({ role: 'user', content: 'Propune rezumatul acum.' });
    });

    it('A: one click saves the proposals, marks the step done and moves on', () => {
      const onNext = vi.fn();
      stubFetch([]);
      const { last } = setup('actors', createEmptyProject('P'), onNext, { proposed: two });
      expect(within(bar()).getByText('2 propuneri nesalvate')).toBeTruthy();
      expect(primary().getAttribute('aria-label')).toBe('Acceptă și treci la pasul următor →');
      expect(within(bar()).getByText('Salvează 2 propuneri · apoi: Relațiile')).toBeTruthy();
      fireEvent.click(primary());
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(last().actors.map((a) => a.id)).toEqual(['a1', 'a2']);
      expect(last().steps.actors.status).toBe('done');
    });

    it('A: Doar acceptă saves and stays; the bar becomes C', () => {
      const onNext = vi.fn();
      const { last } = setup('actors', createEmptyProject('P'), onNext, { proposed: two });
      fireEvent.click(within(bar()).getByRole('button', { name: 'Doar acceptă' }));
      expect(onNext).not.toHaveBeenCalled();
      expect(last().actors).toHaveLength(2);
      expect(within(bar()).getByText(/✓ Pasul e complet/)).toBeTruthy();
    });

    it('A on a complete step: Treci peste propuneri discards them and moves on', () => {
      const onNext = vi.fn();
      stubFetch([]);
      const draft = createEmptyProject('P');
      draft.actors = [{ ...actor, id: 'a9', name: 'Deja salvat' }];
      const { last } = setup('actors', draft, onNext, { proposed: two });
      fireEvent.click(within(bar()).getByRole('button', { name: 'Treci peste propuneri' }));
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(last().actors.map((a) => a.id)).toEqual(['a9']);
    });

    it('A without a complete step offers no skip', () => {
      setup('actors', createEmptyProject('P'), vi.fn(), { proposed: two });
      expect(within(bar()).queryByRole('button', { name: 'Treci peste propuneri' })).toBeNull();
    });

    it('B: accepts the proposals, stays, and lets the AI ask about what is still missing', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Cine decide pentru cine?' } }]);
      const onNext = vi.fn();
      const { last } = setup('relations', createEmptyProject('P'), onNext, { proposed: [{ kind: 'actor', data: actor }] });
      expect(within(bar()).getByText('1 propunere nesalvată · după ele mai lipsește: Cel puțin o relație')).toBeTruthy();
      fireEvent.click(primary());
      expect(primary().textContent).not.toContain('Acceptă');
      expect(last().actors).toEqual([actor]);
      expect(onNext).not.toHaveBeenCalled();
      await screen.findByText('Cine decide pentru cine?');
      expect(aiCalls(fetchMock)).toHaveLength(1);
    });

    it('B: the primary says how many it accepts', () => {
      setup('relations', createEmptyProject('P'), vi.fn(), { proposed: two });
      expect(primary().textContent).toBe('Acceptă 2 propuneri');
    });

    it('C: the step is complete, with the open recommendations, and moves on', async () => {
      const llmAlert = { code: 'magic_leap', step: 7, refs: ['p1'], status: 'open', message: 'De ce ar duce A la B?' };
      const fetchMock = stubFetch([], { body: { alerts: [llmAlert] } });
      const onNext = vi.fn();
      const draft = createEmptyProject('P');
      draft.preconditions = [precondition];
      const { last } = setup('preconditions', draft, onNext);
      expect(within(bar()).getByText('✓ Pasul e complet · 1 recomandare deschisă')).toBeTruthy();
      expect(primary().textContent).toBe('Treci la pasul următor: Ipotezele riscante →');
      fireEvent.click(primary());
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
      fireEvent.click(primary());
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await waitFor(() => expect(last().alerts).toContainEqual(fresh));
      expect(last().alerts.filter((a) => a.code === 'magic_leap')).toHaveLength(1);
    });

    it('ignores a failed alerts call', async () => {
      const fetchMock = stubFetch([], { status: 502, body: { error: 'AI-ul nu răspunde acum.' } });
      const draft = createEmptyProject('P');
      draft.preconditions = [precondition];
      const { spy } = setup('preconditions', draft);
      fireEvent.click(primary());
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await Promise.resolve();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('step 10 leads to the summary', () => {
      const draft = createEmptyProject('P');
      draft.backlog = [{ id: 'b1', stage: 'start', kind: 'test', featureId: null, preconditionId: null, text: 't', order: 1 }];
      setup('backlog', draft);
      expect(primary().textContent).toBe('Mergi la rezumat →');
      cleanup();
      setup('backlog', createEmptyProject('P'), undefined, {
        proposed: [{ kind: 'backlogItem', data: { id: 'b1', stage: 'start', kind: 'test', featureId: null, preconditionId: null, text: 't', order: 1 } }],
      });
      expect(primary().getAttribute('aria-label')).toBe('Acceptă și mergi la rezumat →');
      expect(within(bar()).getByText('Salvează 1 propunere · apoi: Rezumat și publicare')).toBeTruthy();
    });

    it('a stored done on an empty step is still state D', () => {
      const draft = createEmptyProject('P');
      draft.steps.actors.status = 'done';
      setup('actors', draft);
      expect(primary().getAttribute('aria-disabled')).toBe('true');
    });

    it('busy: no accept while the AI regenerates; a complete step can still move on', async () => {
      let release: () => void = () => {};
      const gate = new Promise<void>((r) => (release = r));
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          await gate;
          return { ok: true, status: 200, json: async () => ({ kind: 'question', text: 'Gata.' }) };
        }),
      );
      setup('actors', createEmptyProject('P'), vi.fn(), { proposed: two });
      say('Mai e cineva?');
      expect(within(bar()).getByText('AI-ul pregătește…')).toBeTruthy();
      expect((primary() as HTMLButtonElement).disabled).toBe(true);
      expect((within(bar()).getByRole('button', { name: 'Doar acceptă' }) as HTMLButtonElement).disabled).toBe(true);
      release();
      await screen.findByText('Gata.');
      expect((primary() as HTMLButtonElement).disabled).toBe(false);
      cleanup();

      const gate2 = new Promise<void>(() => {});
      vi.stubGlobal('fetch', vi.fn(async () => gate2));
      const draft = createEmptyProject('P');
      draft.actors = [actor];
      setup('actors', draft);
      say('Și altcineva?');
      expect(within(bar()).getByText('AI-ul pregătește…')).toBeTruthy();
      expect((primary() as HTMLButtonElement).disabled).toBe(false);
    });

    it('never shows more than one filled primary button', () => {
      const count = () => document.querySelectorAll('button.bg-teal-800').length;
      const complete = createEmptyProject('P');
      complete.actors = [actor];
      for (const [draft, step, proposed] of [
        [createEmptyProject('P'), 'actors', two],
        [createEmptyProject('P'), 'relations', two],
        [complete, 'actors', []],
        [createEmptyProject('P'), 'actors', []],
      ] as const) {
        setup(step, structuredClone(draft), vi.fn(), { proposed: [...proposed] });
        expect(count()).toBe(1);
        expect(primary().classList.contains('bg-teal-800')).toBe(true);
        cleanup();
      }
    });

    it("keeps the card form's Salvează outlined, so the bar stays the only filled button", () => {
      setup('actors');
      fireEvent.click(screen.getByRole('button', { name: 'Adaugă manual' }));
      expect(screen.getByRole('button', { name: 'Salvează' }).classList.contains('bg-teal-800')).toBe(false);
      expect(document.querySelectorAll('button.bg-teal-800')).toHaveLength(1);
    });
  });

  describe('proposals in the chat', () => {
    it('shows a digest under the conversation when a proposal arrives; it is not stored', async () => {
      stubFetch([{ body: { kind: 'proposal', text: 'Uite actorii.', cards: two } }]);
      const { last } = setup('actors');
      fireEvent.click(proposeChip());
      const digest = await screen.findByRole('region', { name: 'Propuneri în conversație' });
      expect(within(digest).getByText('2 propuneri, încă nesalvate')).toBeTruthy();
      expect(within(digest).getByText('Actor: Primăria · Actor: Consiliul local')).toBeTruthy();
      expect(last().steps.actors.messages.every((m) => !m.content.includes('nesalvate'))).toBe(true);
    });

    it('lists at most 4 items, then "și încă {k}"; singular title for one', () => {
      const many = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, i) => ({ kind: 'actor' as const, data: { ...actor, id: `a${i + 1}`, name } }));
      setup('actors', createEmptyProject('P'), undefined, { proposed: many });
      const digest = screen.getByRole('region', { name: 'Propuneri în conversație' });
      expect(within(digest).getByText('Actor: A · Actor: B · Actor: C · Actor: D și încă 2')).toBeTruthy();
      cleanup();
      setup('actors', createEmptyProject('P'), undefined, { proposed: [two[0]] });
      expect(screen.getByText('1 propunere, încă nesalvată')).toBeTruthy();
    });

    it('the digest Acceptă tot saves the same as the cards one, then offers the next step', () => {
      const viaCards = setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      fireEvent.click(within(screen.getByRole('region', { name: 'Propuneri' })).getByRole('button', { name: 'Acceptă tot' }));
      const fromCards = viaCards.last();
      cleanup();
      const onNext = vi.fn();
      stubFetch([]);
      const viaDigest = setup('actors', createEmptyProject('P'), onNext, { proposed: two });
      fireEvent.click(within(screen.getByRole('region', { name: 'Propuneri în conversație' })).getByRole('button', { name: 'Acceptă tot' }));
      expect(viaDigest.last().actors).toEqual(fromCards.actors);
      expect(screen.queryByRole('region', { name: 'Propuneri în conversație' })).toBeNull();
      expect(within(chat()).getByText('✓ Salvat: 2 elemente.')).toBeTruthy();
      fireEvent.click(within(chat()).getByRole('button', { name: 'Treci la pasul următor: Relațiile' }));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('Vezi și editează opens the results tab and focuses the proposals heading', () => {
      setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      fireEvent.click(screen.getByRole('button', { name: 'Vezi și editează →' }));
      expect(screen.getByRole('tab', { name: /Rezultatul/ }).getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement?.textContent).toBe('Propuse de AI · nesalvate (2)');
    });

    it('"da" with pending proposals saves them without calling the AI', async () => {
      const fetchMock = stubFetch([]);
      const onNext = vi.fn();
      const { last } = setup('actors', createEmptyProject('P'), onNext, { proposed: two });
      say('Da!');
      expect(last().actors.map((a) => a.id)).toEqual(['a1', 'a2']);
      expect(last().steps.actors.messages.at(-1)).toEqual({ role: 'user', content: 'Da!' });
      expect(within(chat()).getByText('✓ Am salvat 2 elemente. Poți trece la pasul următor.')).toBeTruthy();
      await Promise.resolve();
      expect(aiCalls(fetchMock)).toHaveLength(0);
      expect(screen.queryByText(/Ca să salvezi propunerea/)).toBeNull();
      fireEvent.click(within(chat()).getByRole('button', { name: 'Treci la pasul următor: Relațiile' }));
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('"ok" that leaves the step incomplete names what is missing and lets the AI ask once', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Cine decide?' } }]);
      setup('relations', createEmptyProject('P'), undefined, { proposed: [{ kind: 'actor', data: actor }] });
      say('ok');
      expect(within(chat()).getByText('✓ Am salvat 1 element. Mai lipsește: Cel puțin o relație.')).toBeTruthy();
      await screen.findByText('Cine decide?');
      expect(aiCalls(fetchMock)).toHaveLength(1);
      expect(bodyOf(fetchMock, 0).chat.at(-1)).toEqual({ role: 'user', content: 'ok' });
    });

    it('"da, dar adaugă X" goes to the AI and shows the accept hint', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Mai spune-mi.' } }]);
      const { last } = setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      say('da, dar adaugă și ANAF');
      expect(await screen.findByText('Ca să salvezi propunerea, apasă «Acceptă tot» sau «Acceptă» pe fiecare card.')).toBeTruthy();
      await screen.findByText('Mai spune-mi.');
      expect(aiCalls(fetchMock)).toHaveLength(1);
      expect(screen.getAllByText('propus')).toHaveLength(2);
      expect(last().steps.actors.messages.every((m) => !m.content.includes('Ca să salvezi'))).toBe(true);
    });

    it('"da" with nothing pending goes to the AI', async () => {
      const fetchMock = stubFetch([{ body: { kind: 'question', text: 'Mai spune-mi.' } }]);
      setup('actors');
      say('da');
      await screen.findByText('Mai spune-mi.');
      expect(aiCalls(fetchMock)).toHaveLength(1);
      expect(screen.queryByText(/Ca să salvezi propunerea/)).toBeNull();
    });

    it('a new AI proposal is merged with the pending cards, replacing the same kind and id', async () => {
      const a2 = { ...actor, id: 'a2', name: 'Consiliul local' };
      const a1new = { ...actor, name: 'Primăria (nou)' };
      stubFetch([
        { body: { kind: 'proposal', text: 'Unu.', cards: [{ kind: 'actor', data: actor }, { kind: 'actor', data: a2 }] } },
        { body: { kind: 'proposal', text: 'Doi.', cards: [{ kind: 'actor', data: a1new }] } },
      ]);
      setup('actors');
      fireEvent.click(proposeChip());
      await screen.findByText('Unu.');
      fireEvent.click(proposeChip());
      await screen.findByText('Doi.');
      const region = screen.getByRole('region', { name: 'Propuneri' });
      expect(within(region).getByText('Consiliul local')).toBeTruthy();
      expect(within(region).getByText('Primăria (nou)')).toBeTruthy();
      expect(within(region).queryByText('Primăria')).toBeNull();
      expect(within(region).getAllByText('propus')).toHaveLength(2);
    });
  });

  describe('results column', () => {
    it('says nothing is saved yet, and counts saved cards with a ✓', () => {
      setup('actors');
      expect(screen.getByText('Nimic salvat încă. Răspunde în conversație sau adaugă manual.')).toBeTruthy();
      cleanup();
      const draft = createEmptyProject('P');
      draft.actors = [actor, { ...actor, id: 'a2', name: 'Alt actor' }];
      setup('actors', draft);
      const saved = screen.getByRole('region', { name: 'Salvate' });
      expect(within(saved).getByRole('heading', { name: 'Salvate (2)' })).toBeTruthy();
      expect(within(saved).getAllByText('✓ Actor')).toHaveLength(2);
    });

    it('titles the proposals with their count', () => {
      setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      expect(screen.getByRole('heading', { name: 'Propuse de AI · nesalvate (2)' })).toBeTruthy();
    });
  });

  describe('Întrebări deschise', () => {
    const preconditions = [
      { ...precondition, id: 'p1', text: 'Primăria acceptă' },
      { ...precondition, id: 'p2', text: 'Asociațiile raportează' },
    ];
    function withQuestions(alerts: Project['alerts']) {
      const draft = createEmptyProject('P');
      draft.preconditions = preconditions;
      draft.alerts = alerts;
      return draft;
    }
    const magic = (ref: string) => ({ code: 'magic_leap' as const, step: 7, refs: [ref], status: 'open' as const, message: 'De ce ar duce A la B?' });
    const build = { code: 'build_and_they_come' as const, step: 7, refs: [], status: 'open' as const, message: 'Cum află primii 50?' };
    const block = () => screen.getByRole('region', { name: /Întrebări deschise/ });

    it('groups questions by code, collapsed with 2+, one expanded at a time', () => {
      setup('preconditions', withQuestions([magic('p1'), magic('p2'), build]));
      const toggle = within(block()).getByRole('button', { name: 'Întrebări deschise (2)' });
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(within(block()).queryByText('Salt magic')).toBeNull();
      fireEvent.click(toggle);
      const first = within(block()).getByRole('button', { name: 'Salt magic' });
      expect(first.getAttribute('aria-expanded')).toBe('true');
      expect(within(block()).getByText('De ce ar duce A la B?')).toBeTruthy();
      expect(within(block()).getByText('De ce contează: Pasul lipsă e de obicei exact locul unde proiectele se blochează.')).toBeTruthy();
      expect(within(block()).getByText('Despre: Primăria acceptă, Asociațiile raportează')).toBeTruthy();
      fireEvent.click(within(block()).getByRole('button', { name: '„Dacă o construim, vin”' }));
      expect(within(block()).getByRole('button', { name: 'Salt magic' }).getAttribute('aria-expanded')).toBe('false');
      expect(within(block()).getByText('Cum află primii 50?')).toBeTruthy();
      expect(within(block()).queryByText('De ce ar duce A la B?')).toBeNull();
    });

    it('a single question opens expanded; checklist alerts are not listed', () => {
      const draft = withQuestions([build, { code: 'all_through_app', step: 7, refs: [], status: 'open', message: 'Fără cod?' }]);
      setup('preconditions', draft);
      expect(within(block()).getByRole('button', { name: 'Întrebări deschise (1)' }).getAttribute('aria-expanded')).toBe('true');
      expect(within(block()).getByText('Cum află primii 50?')).toBeTruthy();
      expect(screen.queryByText('Fără cod?')).toBeNull();
    });

    it('Discută cu AI-ul puts the question in the chat and focuses the input with the topic', async () => {
      const { last } = setup('preconditions', withQuestions([build]));
      fireEvent.click(within(block()).getByRole('button', { name: 'Discută cu AI-ul' }));
      expect(last().steps.preconditions.messages.at(-1)).toEqual({ role: 'assistant', content: 'Cum află primii 50?' });
      const input = screen.getByLabelText('Răspunsul tău');
      await waitFor(() => expect(document.activeElement).toBe(input));
      expect(input.getAttribute('placeholder')).toBe('Răspunde la întrebarea despre „Dacă o construim, vin”…');
    });

    it('Lasă deschisă dismisses every alert of the group and says where it goes', () => {
      const { last } = setup('preconditions', withQuestions([magic('p1'), magic('p2')]));
      expect(within(block()).getByText('Apare pe pagina publică la „Întrebări la care ne poți ajuta”.')).toBeTruthy();
      fireEvent.click(within(block()).getByRole('button', { name: 'Lasă deschisă' }));
      expect(last().alerts.map((a) => a.status)).toEqual(['dismissed', 'dismissed']);
      expect(screen.queryByRole('region', { name: /Întrebări deschise/ })).toBeNull();
    });

    it('is hidden while proposals are pending, and never blocks moving on', () => {
      const draft = withQuestions([build]);
      setup('preconditions', draft, vi.fn(), { proposed: [{ kind: 'precondition', data: { ...precondition, id: 'p3' } }] });
      expect(screen.queryByRole('region', { name: /Întrebări deschise/ })).toBeNull();
      cleanup();
      setup('preconditions', withQuestions([build]));
      expect(primary().getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('mobile tabs', () => {
    it('switches between the conversation and the result; the badge follows the step', () => {
      setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      const tabs = screen.getByRole('tablist');
      const result = within(tabs).getByRole('tab', { name: /Rezultatul/ });
      expect(within(tabs).getByRole('tab', { name: 'Conversația' }).getAttribute('aria-selected')).toBe('true');
      expect(result.textContent).toBe('Rezultatul · 2 ◐');
      fireEvent.click(result);
      expect(result.getAttribute('aria-selected')).toBe('true');
      fireEvent.click(within(bar()).getByRole('button', { name: 'Doar acceptă' }));
      expect(result.textContent).toBe('Rezultatul · ✓');
    });

    it('shows done/total when nothing is pending and the step is incomplete', () => {
      setup('actors');
      expect(screen.getByRole('tab', { name: /Rezultatul/ }).textContent).toBe('Rezultatul · 0/4');
    });

    it('keeps the full label of the short mobile primary in aria-label', () => {
      setup('actors', createEmptyProject('P'), undefined, { proposed: two });
      expect(within(primary()).getByText('Acceptă și treci mai departe →')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Acceptă și treci la pasul următor →' })).toBe(primary());
    });
  });
});
