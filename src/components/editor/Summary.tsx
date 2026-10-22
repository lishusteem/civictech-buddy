'use client';

import { useState, type ReactNode } from 'react';
import { ProjectView, QUESTIONS_ANCHOR } from '@/components/project/ProjectView';
import { prepublishCheck } from '@/components/project/prepublish';
import type { Project } from '@/lib/project/schema';

/** useAutosave().setDraft: a draft, or an updater applied to the latest draft. */
type SetDraft = (update: Project | ((prev: Project) => Project)) => void;

type Props = {
  draft: Project;
  /** Lets the check fix the contact and names in place; without it the check is read-only. */
  setDraft?: SetDraft;
  /** true once the public page exists (changes the button label). */
  published?: boolean;
  publishing: boolean;
  disabled: boolean;
  error: boolean;
  onPublish: () => void;
};

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';
const smallBtn = `shrink-0 rounded-lg border border-teal-800 px-3 py-1 text-sm font-medium text-teal-900 hover:bg-teal-50 ${FOCUS}`;
const input = 'min-w-0 flex-1 rounded-lg border border-stone-400 px-3 py-1.5 text-sm';

function CheckRow({ done, label, action, children }: { done: boolean; label: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <li className="py-2">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`w-4 shrink-0 font-semibold ${done ? 'text-teal-800' : 'text-stone-500'}`}>
          {done ? '✓' : '○'}
        </span>
        <span className="sr-only">{done ? 'gata: ' : 'lipsește: '}</span>
        <span className="flex-1">{label}</span>
        {action}
      </div>
      {children && <div className="mt-2 pl-7">{children}</div>}
    </li>
  );
}

/** Rezumat: the pre-publish check (§8.1), the publish button, then the preview of the public page. */
export function Summary({ draft, setDraft, published = false, publishing, disabled, error, onPublish }: Props) {
  const check = prepublishCheck(draft);
  const [contactOpen, setContactOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState('');

  function saveContact() {
    const value = contact.trim();
    if (!setDraft || value === '') return;
    setDraft((prev) => ({ ...prev, project: { ...prev.project, contact: value } }));
    setContactOpen(false);
  }

  function saveName() {
    const value = name.trim();
    const target = check.selfNamed;
    if (!setDraft || !target || value === '') return;
    setDraft((prev) => ({ ...prev, team: prev.team.map((m) => (m.id === target.id ? { ...m, name: value } : m)) }));
    setNameOpen(false);
    setName('');
  }

  function showQuestions() {
    const details = document.getElementById(QUESTIONS_ANCHOR);
    if (details instanceof HTMLDetailsElement) details.open = true;
    details?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  const n = check.publicQuestions;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Rezumat</h1>
      <p className="mt-1 text-stone-700">Așa va vedea grupul pagina. Verifică întâi:</p>

      <section aria-labelledby="prepublish-title" className="mt-4 rounded-xl border border-stone-300 bg-white p-4">
        <h2 id="prepublish-title" className="font-semibold text-stone-900">
          Înainte să publici
        </h2>
        <ul className="mt-2 divide-y divide-stone-200">
          <CheckRow done={check.pitch} label="O propoziție despre proiect (apare sus)" />
          <CheckRow
            done={check.contact}
            label="Un contact pentru cine vrea să ajute"
            action={
              !check.contact && setDraft && !contactOpen ? (
                <button type="button" onClick={() => setContactOpen(true)} className={smallBtn}>
                  Adaugă
                </button>
              ) : null
            }
          >
            {!check.contact && setDraft && contactOpen && (
              <>
                <div className="flex gap-2">
                  <input
                    aria-label="Contact"
                    value={contact}
                    maxLength={200}
                    onChange={(e) => setContact(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveContact()}
                    placeholder="email, Discord sau link de grup"
                    className={input}
                  />
                  <button type="button" onClick={saveContact} className={smallBtn}>
                    Salvează
                  </button>
                </div>
                <p className="mt-1 text-xs text-stone-600">Apare public. Nu folosi un număr personal dacă nu vrei să fie văzut.</p>
              </>
            )}
          </CheckRow>
          <CheckRow
            done={check.selfNamed === null}
            label={check.selfNamed ? `Nume reale în echipă (acum: „${check.selfNamed.name}”)` : 'Nume reale în echipă'}
            action={
              check.selfNamed && setDraft && !nameOpen ? (
                <button type="button" onClick={() => setNameOpen(true)} className={smallBtn}>
                  Corectează
                </button>
              ) : null
            }
          >
            {check.selfNamed && setDraft && nameOpen && (
              <div className="flex items-center gap-2">
                <label htmlFor="prepublish-name" className="text-sm font-medium">
                  Nume
                </label>
                <input
                  id="prepublish-name"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className={input}
                />
                <button type="button" onClick={saveName} className={smallBtn}>
                  Salvează
                </button>
              </div>
            )}
          </CheckRow>
          <CheckRow done={check.seekingRole} label="Cel puțin un rol căutat" />
          {n > 0 && (
            <CheckRow
              done={false}
              label={n === 1 ? '1 întrebare deschisă va apărea public' : `${n} întrebări deschise vor apărea public`}
              action={
                <button type="button" onClick={showQuestions} className={smallBtn}>
                  Vezi
                </button>
              }
            />
          )}
        </ul>
      </section>

      <button
        type="button"
        onClick={onPublish}
        disabled={publishing || disabled}
        className={`mt-4 rounded-lg bg-teal-800 px-5 py-2 font-medium text-white hover:bg-teal-900 disabled:opacity-60 ${FOCUS}`}
      >
        {published ? 'Actualizează pagina publică' : 'Publică pagina'}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          Nu am putut publica. Încearcă din nou.
        </p>
      )}

      <div className="relative mt-8 rounded-2xl border-2 border-dashed border-stone-300 p-3 pt-8 sm:p-5 sm:pt-9">
        <p className="absolute left-3 top-0 -translate-y-1/2 rounded-full bg-stone-700 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          Previzualizare
        </p>
        <ProjectView project={draft} publishedAt={null} preview />
      </div>
    </div>
  );
}
