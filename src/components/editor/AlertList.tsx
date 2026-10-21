'use client';

import { ALERT_MESSAGES } from '@/lib/alerts/messages';
import type { Alert } from '@/lib/project/schema';

type Props = {
  /** The open alerts of the current step. */
  alerts: Alert[];
  onWork: (alert: Alert) => void;
  onDismiss: (alert: Alert) => void;
};

export const alertKey = (a: Alert) => `${a.code}:${[...a.refs].sort().join(',')}`;

/** Open questions next to the cards; they never block "Pasul următor". */
export function AlertList({ alerts, onWork, onDismiss }: Props) {
  if (alerts.length === 0) return null;
  return (
    <section aria-label="Întrebări deschise" className="space-y-3">
      {alerts.map((a) => (
        <div key={alertKey(a)} className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-900">întrebare deschisă</p>
          <p className="mt-1 font-semibold text-stone-900">{ALERT_MESSAGES[a.code].title}</p>
          <p className="mt-1 text-stone-800">{a.message || ALERT_MESSAGES[a.code].message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onWork(a)}
              className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              Lucrez la asta acum
            </button>
            <button
              type="button"
              onClick={() => onDismiss(a)}
              className="rounded-lg border border-stone-400 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              Merg mai departe
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
