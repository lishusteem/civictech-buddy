'use client';

import { useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import type { AiTurn } from '@/lib/ai/stepTurn';
import { normalizeCardIds, upsertEntity } from '@/lib/project/entities';
import type { Message, Project, StepId } from '@/lib/project/schema';
import { isAffirmative, normalizeReply } from '@/lib/steps/affirm';
import type { SetDraft } from './StepScreen';
import { WaitTips } from './WaitTips';

export const MAX_CHARS = 4000;
const COUNTER_FROM = 3500;
/** Messages kept per step (the schema allows 60); older ones are dropped so drafts stay small. */
export const MAX_MESSAGES = 40;
const DONT_KNOW = 'Nu știu';
export const PROPOSE_NOW = 'Propune rezumatul acum.';
const AI_DOWN = 'AI-ul nu răspunde acum.';
const NOTED = 'Am notat întrebarea ca «de aflat» — apare pe pagina publică la «Întrebări la care ne poți ajuta». Mergem mai departe.';
const ACCEPT_HINT = 'Ca să salvezi propunerea, apasă «Acceptă tot» sau «Acceptă» pe fiecare card.';
const PROPOSAL_TEXT = 'Uite ce am înțeles. Verifică propunerile de lângă conversație.';
const PLACEHOLDER = 'Scrie răspunsul tău…';
const LOADING = {
  first: 'Pregătesc prima întrebare…',
  question: 'Mă gândesc…',
  proposal: 'Pregătesc propunerile pentru pas…',
} as const;

/**
 * Per-session AI state per step, owned by the Editor so it survives step remounts:
 * which steps were already asked automatically, which calls are in flight, and the last error.
 */
export class AskTracker {
  readonly asked = new Set<StepId>();
  private inFlight = new Set<StepId>();
  private errors = new Map<StepId, string>();
  private listeners = new Set<() => void>();

  isPending = (step: StepId) => this.inFlight.has(step);
  errorOf = (step: StepId) => this.errors.get(step) ?? null;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  start(step: StepId) {
    this.inFlight.add(step);
    this.errors.delete(step);
    this.notify();
  }
  fail(step: StepId, message: string) {
    this.errors.set(step, message);
  }
  end(step: StepId) {
    this.inFlight.delete(step);
    this.notify();
  }
  private notify() {
    this.listeners.forEach((fn) => fn());
  }
}

/** What the step screen can ask of the conversation (the action bar, the open questions, a "da"). */
export type ChatHandle = {
  /** Sends a user message, as if typed. */
  send: (content: string) => void;
  /** Asks the AI with this chat (already stored), without adding a user message. */
  ask: (chat: Message[]) => void;
  /** Focuses the input, optionally with a placeholder that names the topic. */
  focusInput: (placeholder?: string) => void;
};

type Props = {
  step: StepId;
  tracker: AskTracker;
  token: string;
  messages: Message[];
  setDraft: SetDraft;
  /** Saves pending edits so the AI route sees the latest draft. */
  flush: () => Promise<void>;
  onTurn: (turn: AiTurn) => void;
  onFormMode: () => void;
  /** The step has unaccepted AI proposals (shown next to the chat). */
  hasPending: boolean;
  /** A short "da" while proposals are pending: the message is stored, the AI is not called (UX spec P0-3). */
  onAffirm: (chat: Message[]) => void;
  /** The proposal digest and the system line, under the last message. */
  footer?: ReactNode;
  /** Shown instead of the conversation before its first message; the AI then waits for it instead of asking first. */
  intake?: ReactNode;
  ref?: Ref<ChatHandle>;
};

const isDontKnow = (text: string) => normalizeReply(text) === 'nu stiu';

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

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';
const secondary = `rounded-lg border border-teal-800 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-50 disabled:opacity-60 ${focusRing}`;
const chip = `rounded-full border border-stone-400 px-3 py-1 text-sm text-stone-800 hover:bg-stone-100 disabled:opacity-60 ${focusRing}`;

export function ChatPanel({ step, tracker, token, messages, setDraft, flush, onTurn, onFormMode, hasPending, onAffirm, footer, intake, ref }: Props) {
  const [text, setText] = useState('');
  const [, rerender] = useState(0);
  const pending = tracker.isPending(step);
  const error = tracker.errorOf(step);
  const [notice, setNotice] = useState(false);
  const [loading, setLoading] = useState<'question' | 'proposal'>('question');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDER);
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const focusInputNext = useRef(false);
  const lastAiRef = useRef<HTMLLIElement>(null);
  const seenAi = useRef<number | null>(null);
  useEffect(() => tracker.subscribe(() => rerender((n) => n + 1)), [tracker]);
  // User messages sent while proposals were pending (a hint under them; never stored).
  const [hinted, setHinted] = useState<Message[]>([]);

  const aiCount = messages.filter((m) => m.role === 'assistant').length;
  const lastAiIndex = messages.findLastIndex((m) => m.role === 'assistant');

  // Focus moves to the AI's newest message (and to its last one when the step opens).
  useEffect(() => {
    if (seenAi.current === null || aiCount > seenAi.current) lastAiRef.current?.focus();
    seenAi.current = aiCount;
  }, [aiCount]);

  // "Discută cu AI-ul" adds an AI message and then wants the input focused: this runs after the effect above.
  useEffect(() => {
    if (!focusInputNext.current) return;
    focusInputNext.current = false;
    inputRef.current?.focus();
  });

  async function ask(chat: Message[]) {
    tracker.start(step);
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
        tracker.fail(step, typeof msg === 'string' && msg !== '' ? msg : AI_DOWN);
        return;
      }
      const reply = data.text.trim() !== '' ? data.text : PROPOSAL_TEXT;
      setDraft((p) => withMessages(p, step, [{ role: 'assistant', content: reply.slice(0, MAX_CHARS) }]));
      onTurn(data);
    } catch {
      tracker.fail(step, AI_DOWN);
    } finally {
      tracker.end(step);
    }
  }

  function send(content: string) {
    const userMessage: Message = { role: 'user', content };
    const chat = [...messages, userMessage].slice(-MAX_MESSAGES);
    setNotice(false);
    setPlaceholder(PLACEHOLDER);
    if (hasPending && isAffirmative(content)) {
      setDraft((p) => withMessages(p, step, [userMessage]));
      onAffirm(chat);
      return;
    }
    if (hasPending) setHinted((h) => [...h, userMessage]);
    const streak = dontKnowStreak(chat);
    if (streak > 0 && streak % 3 === 0 && lastAiIndex >= 0) {
      // F3: after the hint and the example, the question becomes "de aflat" and the dev moves on.
      const question = messages[lastAiIndex].content;
      setDraft((p) => addToFindOut(withMessages(p, step, [userMessage]), step, question));
      setNotice(true);
      return;
    }
    setDraft((p) => withMessages(p, step, [userMessage]));
    setLoading(content === PROPOSE_NOW ? 'proposal' : 'question');
    void ask(chat);
  }

  useImperativeHandle(ref, () => ({
    send,
    ask: (chat) => {
      setLoading('question');
      void ask(chat);
    },
    focusInput: (topic) => {
      if (topic) setPlaceholder(topic);
      focusInputNext.current = true;
      inputRef.current?.focus();
    },
  }));

  // The AI asks first: the first time a step without messages is opened in this session. Never again for that
  // step (not while a call is in flight, not after an error: "Reîncearcă" is the way).
  useEffect(() => {
    if (messages.length > 0 || tracker.asked.has(step) || intake) return;
    tracker.asked.add(step);
    void ask([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {messages.length > 0 && (
        <ol className="flex flex-col gap-3 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-1">
          {messages.map((m, i) =>
            m.role === 'assistant' ? (
              <li
                key={i}
                ref={i === lastAiIndex ? lastAiRef : undefined}
                tabIndex={i === lastAiIndex ? -1 : undefined}
                className={`max-w-[90%] whitespace-pre-wrap rounded-xl border border-stone-300 bg-white p-3 text-stone-900 ${focusRing}`}
              >
                <span className="sr-only">AI: </span>
                {m.content}
              </li>
            ) : (
              <li key={i} className="max-w-[90%] self-end whitespace-pre-wrap rounded-xl bg-teal-50 p-3 text-stone-900">
                <span className="sr-only">Tu: </span>
                {m.content}
                {hasPending && hinted.includes(m) && <span className="mt-1 block text-sm text-amber-900">{ACCEPT_HINT}</span>}
              </li>
            ),
          )}
        </ol>
      )}

      {pending && (
        <div className="max-w-[90%] rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
          <p role="status" className="animate-pulse text-stone-600">
            {messages.length === 0 ? LOADING.first : LOADING[loading]}
          </p>
          <WaitTips step={step} />
        </div>
      )}
      {footer}
      {notice && (
        <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-950">
          {NOTED}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
          <p className="mt-1 text-sm text-red-900">Ce ai scris e salvat.</p>
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

      {intake && messages.length === 0 && !pending ? (
        intake
      ) : (
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="sr-only">
          Răspunsul tău
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          rows={3}
          value={text}
          disabled={pending && messages.length > 0}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
          }}
          aria-describedby={text.length > COUNTER_FROM ? `${inputId}-count` : undefined}
          placeholder={placeholder}
          className="w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800 disabled:bg-stone-100 max-md:h-[4.5rem]"
        />
        {text.length > COUNTER_FROM && (
          <p id={`${inputId}-count`} className={`text-right text-sm ${tooLong ? 'text-red-800' : 'text-stone-600'}`}>
            {text.length} / {MAX_CHARS}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={!canSend} className={secondary}>
            Trimite
          </button>
          <button type="button" onClick={() => send(DONT_KNOW)} disabled={pending} className={chip}>
            Nu știu
          </button>
          <button type="button" onClick={() => send(PROPOSE_NOW)} disabled={pending} className={chip}>
            Propune acum
          </button>
          <span className="ml-auto hidden text-xs text-stone-500 md:inline">Ctrl+Enter trimite</span>
        </div>
      </form>
      )}
    </section>
  );
}
