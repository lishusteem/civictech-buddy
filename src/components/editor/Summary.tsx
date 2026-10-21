'use client';

import { ProjectView } from '@/components/project/ProjectView';
import type { Project } from '@/lib/project/schema';

type Props = {
  draft: Project;
  publishing: boolean;
  disabled: boolean;
  error: boolean;
  onPublish: () => void;
};

/** Preview of the public page built from the draft, with the publish button. */
export function Summary({ draft, publishing, disabled, error, onPublish }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Rezumat</h1>
          <p className="mt-1 text-stone-700">Așa va arăta pagina publică. Verifică-o, apoi public-o.</p>
        </div>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || disabled}
          className="rounded-lg bg-teal-800 px-5 py-2 font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60"
        >
          Publică
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          Nu am putut publica. Încearcă din nou.
        </p>
      )}
      <div className="mt-6">
        <ProjectView project={draft} publishedAt={null} />
      </div>
    </div>
  );
}
