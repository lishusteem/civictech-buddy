'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { PHASES, STEPS } from '@/lib/steps/definitions';

const TOTAL_MINUTES = STEPS.reduce((sum, s) => sum + s.minutes, 0);

function extractToken(input: string): string | null {
  const match = input.match(/\/e\/([^/?#\s]+)/);
  return match ? match[1] : null;
}

const inputClass =
  'w-full rounded-lg border border-stone-400 bg-white px-3 py-2.5 text-base text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700';
const primaryButton =
  'rounded-lg bg-teal-800 px-5 py-2.5 text-base font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60';

export function StartScreen() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.editToken) {
        router.push(`/e/${data.editToken}`);
        return;
      }
      setCreateError(data.error ?? 'Nu am putut crea proiectul. Încearcă din nou.');
    } catch {
      setCreateError('Nu am putut crea proiectul. Verifică conexiunea și încearcă din nou.');
    }
    setPending(false);
  }

  function resume(e: FormEvent) {
    e.preventDefault();
    const token = extractToken(link);
    if (!token) {
      setLinkError('Linkul nu pare un link de editare.');
      return;
    }
    setLinkError(null);
    router.push(`/e/${token}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 text-stone-900 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ghidul de pornire</h1>
      <p className="mt-4 text-lg text-stone-700">
        În aproximativ {TOTAL_MINUTES} de minute îți transformi ideea într-un plan clar: contextul,
        schimbarea pe care o urmărești și cine trebuie să facă ce.
      </p>

      <section aria-labelledby="steps-heading" className="mt-10">
        <h2 id="steps-heading" className="text-xl font-semibold">
          10 pași, 3 faze, ~{TOTAL_MINUTES} de minute
        </h2>
        <div className="mt-4 space-y-4">
          {PHASES.map((phase) => {
            const steps = STEPS.filter((s) => s.phase === phase.id);
            const minutes = steps.reduce((sum, s) => sum + s.minutes, 0);
            return (
              <section
                key={phase.id}
                aria-label={phase.title}
                className="rounded-xl border border-stone-300 bg-stone-50 p-4"
              >
                <h3 className="flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-teal-800">
                  <span>{phase.title}</span>
                  <span className="font-normal normal-case text-stone-600">{minutes} min</span>
                </h3>
                <ol className="mt-3 space-y-3">
                  {steps.map((s) => (
                    <li key={s.id} data-step={s.id} value={s.number} className="flex gap-3">
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-medium text-white"
                      >
                        {s.number}
                      </span>
                      <div>
                        <p className="font-medium">
                          {s.title} <span className="font-normal text-stone-600">· {s.minutes} min</span>
                        </p>
                        <p className="text-sm text-stone-700">{s.summary}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        {creating ? (
          <form onSubmit={create} className="space-y-3">
            <label htmlFor="project-name" className="block font-medium">
              Numele proiectului <span className="font-normal text-stone-600">(opțional)</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className={inputClass}
            />
            <button type="submit" disabled={pending} className={primaryButton}>
              Începe
            </button>
            {createError && (
              <p role="alert" className="text-sm text-red-800">
                {createError}
              </p>
            )}
          </form>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
            Începe un proiect nou
          </button>
        )}
      </section>

      <section className="mt-12 border-t border-stone-300 pt-8">
        <form onSubmit={resume} className="space-y-3" noValidate>
          <label htmlFor="resume-link" className="block font-medium">
            Continuă un proiect
          </label>
          <p id="resume-hint" className="text-sm text-stone-600">
            Lipește linkul de editare pe care l-ai salvat.
          </p>
          <input
            id="resume-link"
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            aria-describedby="resume-hint"
            aria-invalid={linkError ? true : undefined}
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-lg border border-teal-800 px-5 py-2.5 text-base font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Continuă
          </button>
          {linkError && (
            <p role="alert" className="text-sm text-red-800">
              {linkError}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
