'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { buildShareMessage, gmailComposeUrl, mailtoUrl } from '@/lib/share/links';

type Props = {
  slug: string;
  editToken: string;
  projectName: string;
  /** false: the public page does not exist yet, so its link is not shown. */
  published?: boolean;
  onDone: () => void;
};

const btn =
  'rounded-lg border border-teal-800 px-3 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';

const noSubscribe = () => () => {};

/** Browser-only values; on the server (a brand-new project opens on this screen) they start empty until hydration. */
function useBrowser<T>(read: () => T, onServer: T): T {
  return useSyncExternalStore(noSubscribe, read, () => onServer);
}

export function KeepLinks({ slug, editToken, projectName, published = true, onDone }: Props) {
  const [copied, setCopied] = useState<'public' | 'edit' | null>(null);
  const [saved, setSaved] = useState(false);

  const origin = useBrowser(() => window.location.origin, '');
  const publicUrl = `${origin}/p/${slug}`;
  const editUrl = `${origin}/e/${editToken}`;
  const message = buildShareMessage({ publicUrl, editUrl, projectName });
  const canShare = useBrowser(() => typeof navigator.share === 'function', false);

  // The browser asks for confirmation before the tab closes, until the links are saved.
  useEffect(() => {
    if (saved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saved]);

  async function copy(which: 'public' | 'edit', url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: message.subject, text: message.body });
    } catch {
      // The person dismissed the share sheet.
    }
  }

  const copiedNote = (which: 'public' | 'edit') =>
    copied === which && (
      <span role="status" className="text-sm text-teal-900">
        Copiat
      </span>
    );

  return (
    <div className="mx-auto max-w-2xl text-stone-900">
      <h1 className="text-2xl font-semibold tracking-tight">Păstrează-ți linkurile</h1>

      <ul className="mt-6 space-y-4">
        {published && (
          <li className="rounded-xl border-2 border-teal-700 bg-white p-4">
            <p className="font-semibold text-teal-900">Pagina publică — pentru grup</p>
            <p className="mt-1 break-all font-mono text-sm">{publicUrl}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => copy('public', publicUrl)} aria-label="Copiază linkul public" className={btn}>
                Copiază
              </button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={btn}>
                Deschide ↗
              </a>
              {copiedNote('public')}
            </div>
          </li>
        )}
        <li className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-amber-950">
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
              <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6H6V4.5a2 2 0 1 1 4 0V7Z" />
            </svg>
            Linkul de editare — doar pentru tine și echipă
          </p>
          <p role="note" className="mt-2 font-medium text-amber-950">
            Linkul de editare e singura cheie a proiectului. Dacă îl pierzi, nu-l putem recupera.
          </p>
          <p className="mt-2 break-all font-mono text-sm">{editUrl}</p>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => copy('edit', editUrl)} aria-label="Copiază linkul de editare" className={btn}>
              Copiază
            </button>
            {copiedNote('edit')}
          </div>
        </li>
      </ul>

      {!published && <p className="mt-4 text-stone-700">Pagina publică apare după ce apeși Publică.</p>}

      <section aria-labelledby="send-links" className="mt-6">
        <h2 id="send-links" className="font-semibold">
          Trimite-ți-le
        </h2>
        <div className="mt-2 flex flex-wrap gap-3">
          <a href={gmailComposeUrl(message)} target="_blank" rel="noopener" className={btn}>
            Gmail
          </a>
          <a href={mailtoUrl(message)} className={btn}>
            Aplicația de email
          </a>
          {canShare && (
            <button type="button" onClick={share} className={btn}>
              Partajează
            </button>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          setSaved(true);
          onDone();
        }}
        className="mt-8 rounded-lg bg-teal-800 px-5 py-2 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
      >
        Am salvat linkurile
      </button>
    </div>
  );
}
