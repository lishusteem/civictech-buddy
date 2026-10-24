'use client';

import type { Card } from '@/lib/project/entities';
import type { Project } from '@/lib/project/schema';
import { cardTitle } from './CardsPanel';
import { KIND_LABEL } from './CardEditor';
import { proposals } from './ActionBar';

const MAX_ITEMS = 4;

type Props = {
  proposed: Card[];
  project: Project;
  onAcceptAll: () => void;
  /** "Vezi și editează →": shows the proposal cards. */
  onView: () => void;
};

/** The pending proposals summed up inside the conversation, with their own Acceptă tot (UX spec §3.3, P0-2). */
export function ProposalDigest({ proposed, project, onAcceptAll, onView }: Props) {
  const n = proposed.length;
  const items = proposed.slice(0, MAX_ITEMS).map((c) => `${KIND_LABEL[c.kind]}: ${cardTitle(c, project) || 'Necompletat'}`);
  const more = n > MAX_ITEMS ? ` și încă ${n - MAX_ITEMS}` : '';
  return (
    <section aria-label="Propuneri în conversație" className="max-w-[90%] rounded-lg border border-dashed border-proposed-line bg-proposed/60 p-3">
      <p className="text-sm font-medium text-proposed-fg">{n === 1 ? '1 propunere, încă nesalvată' : `${proposals(n)}, încă nesalvate`}</p>
      <p className="mt-1 text-sm text-fg-muted">{`${items.join(' · ')}${more}`}</p>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onAcceptAll}
          className="rounded-lg border border-primary bg-surface px-3 py-1.5 text-sm font-medium text-accent hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Acceptă tot
        </button>
        <button
          type="button"
          onClick={onView}
          className="text-sm font-medium text-accent underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Vezi și editează →
        </button>
      </div>
    </section>
  );
}
