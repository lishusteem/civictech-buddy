'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { AiTurn } from '@/lib/ai/stepTurn';
import { normalizeCardIds, upsertEntity } from '@/lib/project/entities';
import type { Message, Project, StepId } from '@/lib/project/schema';
import type { SetDraft } from './StepScreen';

export const MAX_CHARS = 4000;
const COUNTER_FROM = 3500;
const MAX_MESSAGES = 60;
const DONT_KNOW = 'Nu știu';
const PROPOSE_NOW = 'Propune rezumatul acum.';
const AI_DOWN = 'AI-ul nu răspunde acum.';
const NOTED = 'Am notat întrebarea ca «de aflat». Mergi mai departe.';
const PROPOSAL_TEXT = 'Uite ce am înțeles. Verifică propunerile de lângă conversație.';

type Props = {
  step: StepId;
  token: string;
  messages: Message[];
  setDraft: SetDraft;
  /** Saves pending edits so the AI route sees the latest draft. */
  flush: () => Promise<void>;
  onTurn: (turn: AiTurn) => void;
  onFormMode: () => void;
};

const isDontKnow = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim() === 'nu stiu';

/** Number of consecutive "Nu știu" answers at the end of the chat (AI messages in between don't break it). */
function dontKnowStreak(chat: Message[]): number {
  let n = 0;
  for (let i = chat.length - 1; i >= 0; i--) {
    if (chat[i].role !== 'user') continue;
    if (!isDontKnow(chat[i].content)) break;
    n++;
  }
  return n;
}

function isTurn(v: unknown): v is AiTurn {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  if (typeof t.text !== 'string') return false;
  if (t.kind === 'question') return true;
  return (t.kind === 'proposal' || t.kind === 'fallback') && Array.isArray(t.cards);
}

const withMessages = (p: Project, step: StepId, added: Message[]): Project => ({
  ...p,
  steps: {
    ...p.steps,
    [step]: { ...p.steps[step], messages: [...p.steps[step].messages, ...added].slice(-MAX_MESSAGES) },
  },
});

function addToFindOut(p: Project, step: StepId, text: string): Project {
  if (p.toFindOut.length >= 40) return p;
  const [card] = normalizeCardIds(p, [{ kind: 'toFindOut', data: { id: '', step, text: text.slice(0, 300) } }]);
  return upsertEntity(p, card);
}

const buttonBase =
  'rounded-lg px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60';
const secondary = `${buttonBase} border border-teal-800 text-teal-900 hover:bg-teal-50`;

export function ChatPanel({ step, token, messages, setDraft, flush, onTurn, onFormMode }: Props) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const inputId = useId();
  const lastAiRef = useRef<HTMLLIElement>(null);
  const seenAi = useRef<number | null>(null);

  const aiCount = messages.filter((m) => m.role === 'assistant').length;
  const lastAiIndex = messages.findLastIndex((m) => m.role === 'assistant');

  // Focus moves to the AI's newest message (and to its last one when the step opens).
  useEffect(() => {
    if (seenAi.current === null || aiCount > seenAi.current) lastAiRef.current?.focus();
    seenAi.current = aiCount;
  }, [aiCount]);

  async function ask(chat: Message[]) {
    setPending(true);
    setError(null);
    try {
      await flush();
      const res = await fetch(`/api/e/${token}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, chat }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok || !isTurn(data)) {
        const msg = (data as { error?: unknown }).error;
        setError(typeof msg === 'string' && msg !== '' ? msg : AI_DOWN);
        return;
      }
      const reply = data.text.trim() !== '' ? data.text : PROPOSAL_TEXT;
      setDraft((p) => withMessages(p, step, [{ role: 'assistant', content: reply.slice(0, MAX_CHARS) }]));
      onTurn(data);
    } catch {
      setError(AI_DOWN);
    } finally {
      setPending(false);
    }
  }

  function send(content: string) {
    const userMessage: Message = { role: 'user', content };
    const chat = [...messages, userMessage].slice(-MAX_MESSAGES);
    setNotice(false);
    const streak = dontKnowStreak(chat);
    if (streak > 0 && streak % 3 === 0 && lastAiIndex >= 0) {
      // F3: after the hint and the example, the question becomes "de aflat" and the dev moves on.
      const question = messages[lastAiIndex].content;
      setDraft((p) => addToFindOut(withMessages(p, step, [userMessage]), step, question));
      setNotice(true);
      return;
    }
    setDraft((p) => withMessages(p, step, [userMessage]));
    void ask(chat);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    send(text.trim());
    setText('');
  }

  const tooLong = text.length > MAX_CHARS;
  const canSend = !pending && !tooLong && text.trim() !== '';

  return (
    <section aria-label="Conversația" className="flex min-w-0 flex-col gap-4">
      {messages.length === 0 ? (
        <div className="rounded-xl border border-stone-300 bg-stone-50 p-4 text-stone-800">
          <p>Scrie liber ce știi despre pasul ăsta sau lasă AI-ul să pună prima întrebare.</p>
          <button type="button" onClick={() => void ask([])} disabled={pending} className={`${secondary} mt-3`}>
            Începe conversația
          </button>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {messages.map((m, i) =>
            m.role === 'assistant' ? (
              <li
                key={i}
                ref={i === lastAiIndex ? lastAiRef : undefined}
                tabIndex={i === lastAiIndex ? -1 : undefined}
                className="max-w-[90%] whitespace-pre-wrap rounded-xl border border-stone-300 bg-white p-3 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                <span className="sr-only">AI: </span>
                {m.content}
              </li>
            ) : (
              <li key={i} className="max-w-[90%] self-end whitespace-pre-wrap rounded-xl bg-teal-50 p-3 text-stone-900">
                <span className="sr-only">Tu: </span>
                {m.content}
              </li>
            ),
          )}
        </ol>
      )}

      {pending && (
        <p role="status" className="text-sm text-stone-600">
          AI-ul se gândește…
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-950">
          {NOTED}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void ask(messages.slice(-MAX_MESSAGES))} className={secondary}>
              Reîncearcă
            </button>
            <button type="button" onClick={onFormMode} className={secondary}>
              Completează în formular
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="sr-only">
          Răspunsul tău
        </label>
        <textarea
          id={inputId}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
          }}
          aria-describedby={text.length > COUNTER_FROM ? `${inputId}-count` : undefined}
          placeholder="Scrie răspunsul tău…"
          className="w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800"
        />
        {text.length > COUNTER_FROM && (
          <p id={`${inputId}-count`} className={`text-right text-sm ${tooLong ? 'text-red-800' : 'text-stone-600'}`}>
            {text.length} / {MAX_CHARS}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canSend}
            className={`${buttonBase} bg-teal-800 text-white hover:bg-teal-900`}
          >
            Trimite
          </button>
          <button type="button" onClick={() => send(DONT_KNOW)} disabled={pending} className={secondary}>
            Nu știu
          </button>
          <button type="button" onClick={() => send(PROPOSE_NOW)} disabled={pending} className={secondary}>
            Propune rezumatul acum
          </button>
        </div>
      </form>
    </section>
  );
}
