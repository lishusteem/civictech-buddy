import type { ReactNode } from 'react';

/** Owner preview only: an empty section stands in as a dashed box that says it is not public. */
export function Placeholder({ title }: { title: string }) {
  return (
    <p className="mt-8 rounded-xl border border-dashed border-stone-400 p-4 text-sm text-stone-600">
      {title}: Nimic adăugat încă. (nu apare public)
    </p>
  );
}

type Props = {
  /** id of the h2 (the region is named by it). */
  headingId: string;
  title: string;
  /** Empty sections are hidden on the public page and shown as a placeholder in the preview. */
  empty: boolean;
  preview: boolean;
  /** id of the <section> itself, for anchors. */
  id?: string;
  /** Small uppercase label instead of a large heading („Pe scurt”). */
  small?: boolean;
  children?: ReactNode;
};

export function Section({ headingId, title, empty, preview, id, small = false, children }: Props) {
  if (empty) return preview ? <Placeholder title={title} /> : null;
  return (
    <section id={id} aria-labelledby={headingId} className="mt-10 scroll-mt-4">
      <h2
        id={headingId}
        className={small ? 'text-sm font-semibold uppercase tracking-wide text-teal-800' : 'text-2xl font-semibold text-stone-900'}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
