'use client';

import { useEffect, useState } from 'react';
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

export function KeepLinks({ slug, editToken, projectName, published = true, onDone }: Props) {
  const [copied, setCopied] = useState<'public' | 'edit' | null>(null);
  const [saved, setSaved] = useState(false);

  const origin = window.location.origin;
  const publicUrl = `${origin}/p/${slug}`;
  const editUrl = `${origin}/e/${editToken}`;
  const message = buildShareMessage({ publicUrl, editUrl, projectName });
  const canShare = typeof navigator.share === 'function';

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

  const rows = [
    ...(published
      ? [{ key: 'public' as const, label: 'Pagina publică (o poți da oricui)', url: publicUrl, button: 'Copiază linkul public' }]
      : []),
    { key: 'edit' as const, label: 'Linkul de editare (doar pentru echipă)', url: editUrl, button: 'Copiază linkul de editare' },
  ];

  return (
    <div className="mx-auto max-w-2xl text-stone-900">
      <h1 className="text-2xl font-semibold tracking-tight">Păstrează-ți linkurile</h1>
      <p role="note" className="mt-4 rounded-xl border border-amber-400 bg-amber-50 p-4 font-medium text-amber-950">
        Linkul de editare e singura cheie a proiectului. Dacă îl pierzi, nu-l putem recupera.
      </p>

      <ul className="mt-6 space-y-4">
        {rows.map((r) => (
          <li key={r.key} className="rounded-xl border border-stone-300 bg-white p-4">
            <p className="text-sm font-medium text-stone-700">{r.label}</p>
            <p className="mt-1 break-all font-mono text-sm">{r.url}</p>
            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={() => copy(r.key, r.url)} aria-label={r.button} className={btn}>
                Copiază
              </button>
              {copied === r.key && (
                <span role="status" className="text-sm text-teal-900">
                  Copiat
                </span>
              )}
            </div>
          </li>
        ))}
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
