'use client';

import { useId } from 'react';

/** "1 propunere" / "3 propuneri" (and "20 de propuneri"). */
export function proposals(n: number): string {
  if (n === 1) return '1 propunere';
  return n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? `${n} de propuneri` : `${n} propuneri`;
}

export type BarState = 'A' | 'B' | 'C' | 'D';

/** UX spec §3.5: P pending proposals, C step complete, CA complete once they are accepted. */
export function barState(pending: number, complete: boolean, completeAfterAccept: boolean): BarState {
  if (pending > 0) return completeAfterAccept ? 'A' : 'B';
  return complete ? 'C' : 'D';
}

type Props = {
  pending: number;
  complete: boolean;
  completeAfterAccept: boolean;
  /** An AI call is in flight. */
  busy: boolean;
  /** The next step's title, or "Rezumat și publicare" after the last one. */
  next: string;
  isLast: boolean;
  /** The first missing required item now, and after accepting the proposals. */
  missing: string | null;
  missingAfterAccept: string | null;
  /** Recommended items still open. */
  openRecommended: number;
  onAcceptAndNext: () => void;
  onAcceptOnly: () => void;
  onSkipProposals: () => void;
  /** State B: accept and stay. */
  onAcceptStay: () => void;
  onNext: () => void;
  /** A click on the aria-disabled primary of state D. */
  onBlocked: () => void;
  onProposeNow: () => void;
};

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';
const primaryClass = `w-full rounded-lg bg-teal-800 px-5 py-2 text-left font-medium text-white hover:bg-teal-900 disabled:opacity-60 aria-disabled:opacity-60 md:w-auto ${focusRing}`;
// A text link on phones (two buttons side by side truncate Romanian labels), an outlined button from md up.
const secondaryClass = `self-start text-sm font-medium text-teal-900 underline underline-offset-2 disabled:opacity-60 md:self-auto md:rounded-lg md:border md:border-teal-800 md:px-4 md:py-2 md:no-underline md:hover:bg-teal-50 ${focusRing}`;
const tertiaryClass = `self-start text-sm text-stone-700 underline underline-offset-2 hover:text-stone-900 disabled:opacity-60 md:self-auto ${focusRing}`;

/** The step's single action bar, sticky at the bottom (UX spec §3.5, P0-1). */
export function ActionBar(p: Props) {
  const subId = useId();
  const state = barState(p.pending, p.complete, p.completeAfterAccept);
  const unsaved = p.pending === 1 ? '1 propunere nesalvată' : `${proposals(p.pending)} nesalvate`;
  const open = p.openRecommended === 1 ? '1 recomandare deschisă' : `${p.openRecommended} recomandări deschise`;

  const status = p.busy
    ? 'AI-ul pregătește…'
    : state === 'A'
      ? unsaved
      : state === 'B'
        ? `${unsaved} · după ele mai lipsește: ${p.missingAfterAccept}`
        : state === 'C'
          ? `✓ Pasul e complet${p.openRecommended > 0 ? ` · ${open}` : ''}`
          : `Mai lipsește: ${p.missing}`;
  const statusColor = state === 'A' || state === 'B' ? 'text-amber-900' : state === 'C' ? 'text-teal-900' : 'text-stone-700';

  let primary;
  if (state === 'A') {
    const label = p.isLast ? 'Acceptă și mergi la rezumat →' : 'Acceptă și treci la pasul următor →';
    primary = (
      <button
        type="button"
        data-testid="bar-primary"
        aria-label={label}
        aria-describedby={subId}
        disabled={p.busy}
        onClick={p.onAcceptAndNext}
        className={primaryClass}
      >
        {p.isLast ? (
          label
        ) : (
          <>
            <span className="min-[400px]:hidden">Acceptă și treci mai departe →</span>
            <span className="hidden min-[400px]:inline">{label}</span>
          </>
        )}
        <span id={subId} className="block text-xs font-normal text-teal-100">
          Salvează {proposals(p.pending)} · apoi: {p.next}
        </span>
      </button>
    );
  } else if (state === 'B') {
    primary = (
      <button type="button" data-testid="bar-primary" disabled={p.busy} onClick={p.onAcceptStay} className={primaryClass}>
        Acceptă {proposals(p.pending)}
      </button>
    );
  } else if (state === 'C') {
    primary = (
      <button type="button" data-testid="bar-primary" onClick={p.onNext} className={primaryClass}>
        {p.isLast ? 'Mergi la rezumat →' : `Treci la pasul următor: ${p.next} →`}
      </button>
    );
  } else {
    // Not `disabled`: a click says what is missing (UX spec §1.3).
    primary = (
      <button type="button" data-testid="bar-primary" aria-disabled="true" onClick={p.onBlocked} className={primaryClass}>
        {p.isLast ? 'Mergi la rezumat →' : 'Treci la pasul următor →'}
      </button>
    );
  }

  return (
    <section
      aria-label="Acțiunile pasului"
      className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-8 border-t border-stone-300 bg-white px-4 py-3"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-4">
        <p className={`text-sm md:mr-auto ${statusColor}`}>{status}</p>
        {state === 'A' && p.complete && (
          <button type="button" disabled={p.busy} onClick={p.onSkipProposals} className={tertiaryClass}>
            Treci peste propuneri
          </button>
        )}
        {state === 'A' && (
          <button type="button" disabled={p.busy} onClick={p.onAcceptOnly} className={secondaryClass}>
            Doar acceptă
          </button>
        )}
        {state === 'D' && (
          <button type="button" disabled={p.busy} onClick={p.onProposeNow} className={secondaryClass}>
            Propune acum
          </button>
        )}
        {primary}
      </div>
    </section>
  );
}
