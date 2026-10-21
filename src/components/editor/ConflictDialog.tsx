'use client';

import { useEffect, useRef } from 'react';

export function ConflictDialog({ onResolve }: { onResolve: (choice: 'mine' | 'theirs') => void }) {
  const firstButton = useRef<HTMLButtonElement>(null);
  useEffect(() => firstButton.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        aria-describedby="conflict-body"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="conflict-title" className="text-lg font-semibold text-stone-900">
          Proiectul a fost modificat în altă parte
        </h2>
        <p id="conflict-body" className="mt-2 text-stone-700">
          Cineva (sau alt tab) a salvat o versiune mai nouă. Ce păstrezi?
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={firstButton}
            type="button"
            onClick={() => onResolve('mine')}
            className="rounded-lg bg-teal-800 px-4 py-2.5 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Păstrează versiunea mea
          </button>
          <button
            type="button"
            onClick={() => onResolve('theirs')}
            className="rounded-lg border border-teal-800 px-4 py-2.5 font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Încarcă versiunea salvată
          </button>
        </div>
      </div>
    </div>
  );
}
