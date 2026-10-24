'use client';

import { useId, useState } from 'react';
import { MAX_CHARS } from './ChatPanel';

export const INTAKE_HEADINGS = {
  description: 'Ce face aplicația',
  done: 'Funcții care merg deja',
  planned: 'Funcții care urmează',
} as const;

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter((l) => l !== '');

/** The three answers as one chat message, in sections the step 1 prompt knows how to read. */
export function intakeMessage(description: string, done: string, planned: string): string {
  const parts = [`${INTAKE_HEADINGS.description}:\n${description.trim()}`];
  const list = (title: string, text: string) => {
    const items = lines(text);
    parts.push(`${title}:\n${items.length > 0 ? items.map((l) => `- ${l}`).join('\n') : '(niciuna)'}`);
  };
  list(INTAKE_HEADINGS.done, done);
  list(INTAKE_HEADINGS.planned, planned);
  return parts.join('\n\n');
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const field =
  'mt-1 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

type Props = {
  /** Sends the answers to the AI as the first message of step 1. */
  onSubmit: (message: string) => void;
  /** Starts the usual conversation instead. */
  onSkip: () => void;
  disabled?: boolean;
};

/** Step 1 opens with three fields: what the app does, what already works, what comes next. */
export function ProjectIntake({ onSubmit, onSkip, disabled = false }: Props) {
  const [description, setDescription] = useState('');
  const [done, setDone] = useState('');
  const [planned, setPlanned] = useState('');
  const id = useId();
  const message = intakeMessage(description, done, planned);
  const canSend = !disabled && description.trim() !== '' && (lines(done).length > 0 || lines(planned).length > 0) && message.length <= MAX_CHARS;

  return (
    <form
      aria-label="Despre aplicație"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit(message);
      }}
    >
      <p className="text-fg">Spune-mi pe scurt despre aplicație. Pe baza asta îți pun apoi câteva întrebări despre echipă.</p>
      <div>
        <label htmlFor={`${id}-d`} className="font-medium">
          {INTAKE_HEADINGS.description}
        </label>
        <p id={`${id}-dh`} className="text-sm text-fg-muted">
          Pentru cine e, ce problemă rezolvă și cum. Câteva propoziții.
        </p>
        <textarea id={`${id}-d`} aria-describedby={`${id}-dh`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor={`${id}-w`} className="font-medium">
          {INTAKE_HEADINGS.done}
        </label>
        <p id={`${id}-wh`} className="text-sm text-fg-muted">
          Ce pot face utilizatorii azi. Câte una pe rând.
        </p>
        <textarea id={`${id}-w`} aria-describedby={`${id}-wh`} rows={4} value={done} onChange={(e) => setDone(e.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor={`${id}-p`} className="font-medium">
          {INTAKE_HEADINGS.planned}
        </label>
        <p id={`${id}-ph`} className="text-sm text-fg-muted">
          Ce vrei să construiești de acum încolo. Câte una pe rând.
        </p>
        <textarea id={`${id}-p`} aria-describedby={`${id}-ph`} rows={4} value={planned} onChange={(e) => setPlanned(e.target.value)} className={field} />
      </div>
      {message.length > MAX_CHARS && <p className="text-sm text-danger-fg">E prea lung pentru un singur mesaj; scurtează puțin.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSend}
          className={`rounded-lg border border-primary px-4 py-2 font-medium text-accent hover:bg-primary-soft disabled:opacity-60 ${focusRing}`}
        >
          Trimite
        </button>
        <button type="button" onClick={onSkip} disabled={disabled} className={`text-sm text-accent underline ${focusRing}`}>
          Prefer să răspund în conversație
        </button>
      </div>
    </form>
  );
}
