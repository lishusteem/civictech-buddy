'use client';

import { useEffect, useRef } from 'react';

export function ConflictDialog({ onResolve }: { onResolve: (choice: 'mine' | 'theirs') => void }) {
  const firstButton = useRef<HTMLButtonElement>(null);
  useEffect(() => firstButton.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-body"
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
      >
        <h2 id="conflict-title" className="text-lg font-semibold text-fg">
          Proiectul a fost modificat în altă parte
        </h2>
        <p id="conflict-body" className="mt-2 text-fg-muted">
          Cineva (sau alt tab) a salvat o versiune mai nouă. Ce păstrezi?
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={firstButton}
            type="button"
            onClick={() => onResolve('mine')}
            className="rounded-lg bg-primary px-4 py-2.5 font-medium text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Păstrează versiunea mea
          </button>
          <button
            type="button"
            onClick={() => onResolve('theirs')}
            className="rounded-lg border border-primary px-4 py-2.5 font-medium text-accent hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Încarcă versiunea salvată
          </button>
        </div>
      </div>
    </div>
  );
}
