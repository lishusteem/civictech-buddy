'use client';

import { useId, useState } from 'react';
import { ALERT_MESSAGES } from '@/lib/alerts/messages';
import type { Alert, AlertCode, Project } from '@/lib/project/schema';

type Props = {
  /** The open question alerts of the current step (checklist alerts are rows of "Ce cere pasul" instead). */
  alerts: Alert[];
  project: Project;
  /** "Discută cu AI-ul": the group's question goes into the chat. */
  onDiscuss: (group: Alert[]) => void;
  /** "Lasă deschisă": every alert of the group is dismissed. */
  onLeave: (group: Alert[]) => void;
};

export const alertKey = (a: Alert) => `${a.code}:${[...a.refs].sort().join(',')}`;

/** Alerts with the same code, shown as one question. */
function groupByCode(alerts: Alert[]): { code: AlertCode; alerts: Alert[] }[] {
  const groups: { code: AlertCode; alerts: Alert[] }[] = [];
  for (const a of alerts) {
    const g = groups.find((x) => x.code === a.code);
    if (g) g.alerts.push(a);
    else groups.push({ code: a.code, alerts: [a] });
  }
  return groups;
}

/** The names of what the alerts refer to (an actor, a precondition, a change…), without repeats. */
function refNames(project: Project, alerts: Alert[]): string[] {
  const all: { id: string; name?: string; text?: string }[] = [
    ...project.actors,
    ...project.preconditions,
    ...project.targetChanges,
    ...project.features,
    ...project.team,
    ...project.roles,
  ];
  const names = alerts.flatMap((a) => a.refs).map((id) => {
    const e = all.find((x) => x.id === id);
    return e ? (e.name ?? e.text ?? '') : '';
  });
  return [...new Set(names.filter((n) => n.trim() !== ''))];
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700';

/** "Întrebări deschise" (UX spec §5.2): one calm sky block per step; questions never block the step. */
export function AlertList({ alerts, project, onDiscuss, onLeave }: Props) {
  const groups = groupByCode(alerts);
  const toggleId = useId();
  const [open, setOpen] = useState(groups.length < 2);
  const [expanded, setExpanded] = useState<AlertCode | null>(null);
  if (groups.length === 0) return null;
  const current = groups.some((g) => g.code === expanded) ? expanded : groups[0].code;

  return (
    <section aria-labelledby={toggleId} className="rounded-xl border-l-4 border-sky-600 bg-sky-50 p-3">
      <h2>
        <button
          id={toggleId}
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-between text-left text-sm font-medium text-sky-900 ${focusRing}`}
        >
          Întrebări deschise ({groups.length})<span aria-hidden>{open ? '▾' : '▸'}</span>
        </button>
      </h2>
      {open && (
        <ul className="mt-2 divide-y divide-sky-200">
          {groups.map((g) => {
            const def = ALERT_MESSAGES[g.code];
            const isOpen = g.code === current;
            const names = refNames(project, g.alerts);
            return (
              <li key={g.code} className="py-2">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(g.code)}
                    className={`flex w-full items-center justify-between gap-2 text-left font-medium text-stone-900 ${focusRing}`}
                  >
                    <span>
                      <span aria-hidden className="mr-1 text-sky-700">
                        ?
                      </span>
                      {def.title}
                    </span>
                    {!isOpen && <span aria-hidden>▸</span>}
                  </button>
                </h3>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-stone-800">{g.alerts[0].message || def.message}</p>
                    <p className="text-xs text-stone-600">{`De ce contează: ${def.why}`}</p>
                    {names.length > 0 && <p className="text-xs text-stone-600">{`Despre: ${names.join(', ')}`}</p>}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => onDiscuss(g.alerts)}
                        className={`rounded-lg border border-sky-700 bg-white px-3 py-1 text-sm font-medium text-sky-900 hover:bg-sky-100 ${focusRing}`}
                      >
                        Discută cu AI-ul
                      </button>
                      <button type="button" onClick={() => onLeave(g.alerts)} className={`text-sm text-stone-700 underline ${focusRing}`}>
                        Lasă deschisă
                      </button>
                    </div>
                    <p className="text-xs text-stone-500">Apare pe pagina publică la „Întrebări la care ne poți ajuta”.</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
