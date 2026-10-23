'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ZodIssue } from 'zod';
import { ENTITY_SCHEMAS, type Card, type EntityKind } from '@/lib/project/entities';
import type { Project, StepId } from '@/lib/project/schema';

type RefSource = 'actors' | 'preconditions' | 'targetChanges' | 'team' | 'features' | 'relations';
type Options = [value: string, label: string][];

export type Field =
  | { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'checkbox' | 'lines'; required?: boolean; nullable?: boolean }
  | { key: string; label: string; type: 'enum'; options: Options; nullable?: boolean }
  | { key: string; label: string; type: 'ref'; refs: RefSource[]; nullable?: boolean; required?: boolean }
  | { key: string; label: string; type: 'refs'; refs: RefSource[] };

const STAGE: Options = [
  ['start', 'Început (primele ~3 luni)'],
  ['mid', 'Mediu (~3–12 luni)'],
];

const RELATION_TYPES: Options = [
  ['decides', 'decide asupra'],
  ['funds', 'finanțează'],
  ['influences', 'influențează'],
  ['blocks', 'blochează'],
  ['holds_data', 'deține datele lui'],
  ['represents', 'reprezintă'],
];

export const KIND_LABEL: Record<EntityKind, string> = {
  projectInfo: 'Proiectul',
  teamMember: 'Membru în echipă',
  feature: 'Funcție',
  problem: 'Problema',
  existing: 'Inițiativă existentă',
  direction: 'Direcția',
  targetChange: 'Schimbare țintă',
  actor: 'Actor',
  relation: 'Relație',
  precondition: 'Precondiție',
  role: 'Rol',
  backlogItem: 'Element de backlog',
  toFindOut: 'De aflat',
};

export const FIELDS: Record<EntityKind, Field[]> = {
  projectInfo: [
    { key: 'name', label: 'Numele proiectului', type: 'text', required: true },
    { key: 'description', label: 'Ce face', type: 'textarea' },
    { key: 'stage', label: 'Stadiu', type: 'enum', nullable: true, options: [['idea', 'Idee'], ['prototype', 'Prototip'], ['live', 'Live']] },
    { key: 'area', label: 'Zona (oraș, național)', type: 'text' },
    { key: 'links', label: 'Linkuri (unul pe rând)', type: 'lines' },
    { key: 'motivation', label: 'Motivația', type: 'textarea' },
    { key: 'contact', label: 'Contact', type: 'text' },
  ],
  teamMember: [
    { key: 'name', label: 'Nume', type: 'text', required: true },
    { key: 'skills', label: 'Ce știe (una pe rând)', type: 'lines' },
    { key: 'hoursPerWeek', label: 'Ore pe săptămână', type: 'number' },
  ],
  feature: [{ key: 'text', label: 'Funcția', type: 'text', required: true }],
  problem: [
    { key: 'statement', label: 'Problema', type: 'textarea', required: true },
    { key: 'evidence', label: 'Dovezi (una pe rând)', type: 'lines' },
    { key: 'verified', label: 'Verificată cu oameni care o au', type: 'checkbox' },
  ],
  existing: [
    { key: 'name', label: 'Nume', type: 'text', required: true },
    { key: 'url', label: 'Link', type: 'text', nullable: true },
    { key: 'difference', label: 'Ce faci diferit', type: 'textarea' },
  ],
  direction: [{ key: 'text', label: 'Direcția pe termen lung', type: 'textarea', required: true }],
  targetChange: [
    { key: 'text', label: 'Schimbarea', type: 'text', required: true },
    { key: 'signal', label: 'Semnul observabil', type: 'text' },
  ],
  actor: [
    { key: 'name', label: 'Nume', type: 'text', required: true },
    { key: 'note', label: 'De ce contează', type: 'textarea' },
    {
      key: 'type',
      label: 'Tip',
      type: 'enum',
      options: [
        ['user', 'Utilizatori'],
        ['institution', 'Instituție'],
        ['ngo', 'ONG'],
        ['media', 'Presă'],
        ['funder', 'Finanțator'],
        ['business', 'Firmă'],
        ['other', 'Altul'],
      ],
    },
    { key: 'power', label: 'Putere', type: 'enum', options: [['low', 'mică'], ['medium', 'medie'], ['high', 'mare']] },
    {
      key: 'stance',
      label: 'Poziție',
      type: 'enum',
      options: [['supports', 'susține'], ['neutral', 'neutru'], ['opposes', 'se opune'], ['unknown', 'nu știu încă']],
    },
    { key: 'excluded', label: 'Exclus sau afectat negativ', type: 'checkbox' },
  ],
  relation: [
    { key: 'from', label: 'De la', type: 'ref', refs: ['actors'], required: true },
    { key: 'type', label: 'Relație', type: 'enum', options: RELATION_TYPES },
    { key: 'to', label: 'Către', type: 'ref', refs: ['actors'], required: true },
    { key: 'note', label: 'Notă', type: 'text' },
  ],
  precondition: [
    { key: 'text', label: 'Precondiția', type: 'text', required: true },
    { key: 'actorId', label: 'Cine face ceva diferit', type: 'ref', refs: ['actors', 'team'], nullable: true },
    { key: 'stage', label: 'Etapa', type: 'enum', options: STAGE },
    { key: 'leadsTo', label: 'Duce la', type: 'ref', refs: ['preconditions', 'targetChanges'], required: true },
    { key: 'coveredByApp', label: 'O acoperă aplicația', type: 'checkbox' },
    { key: 'assumption', label: 'Ce presupunem', type: 'textarea' },
    { key: 'risky', label: 'Ipoteză riscantă', type: 'checkbox' },
    { key: 'test', label: 'Test ieftin', type: 'textarea' },
    { key: 'riskBy', label: 'Cine a spus-o', type: 'enum', options: [['dev', 'tu'], ['ai', 'sugestie AI']] },
  ],
  role: [
    { key: 'name', label: 'Rol', type: 'text', required: true },
    { key: 'reason', label: 'De ce e nevoie', type: 'textarea' },
    { key: 'reasonRefs', label: 'Ce din hartă îl cere', type: 'refs', refs: ['actors', 'relations', 'preconditions'] },
    { key: 'stage', label: 'Etapa', type: 'enum', options: STAGE },
    {
      key: 'status',
      label: 'Situația',
      type: 'enum',
      options: [
        ['covered', 'acoperit'],
        ['seeking', 'caut pe cineva'],
        ['partner', 'un partener poate face asta'],
        ['not_needed', 'nu e nevoie'],
      ],
    },
    { key: 'coveredBy', label: 'Acoperit de', type: 'ref', refs: ['team'], nullable: true },
  ],
  backlogItem: [
    { key: 'text', label: 'Ce e de făcut', type: 'text', required: true },
    { key: 'kind', label: 'Tip', type: 'enum', options: [['feature', 'Funcție'], ['test', 'Test'], ['organizing', 'Organizare']] },
    { key: 'stage', label: 'Etapa', type: 'enum', options: STAGE },
    { key: 'featureId', label: 'Funcția', type: 'ref', refs: ['features'], nullable: true },
    { key: 'preconditionId', label: 'Precondiția la care ajută', type: 'ref', refs: ['preconditions'], nullable: true },
  ],
  toFindOut: [{ key: 'text', label: 'Întrebarea', type: 'text', required: true }],
};

/** Field keys editable on the risks step; the precondition text stays read-only. */
export const RISKS_FIELDS = ['risky', 'test'];

export function defaultData(kind: EntityKind, project: Project, step: StepId): Card['data'] {
  switch (kind) {
    case 'teamMember':
      return { id: '', name: '', skills: [], hoursPerWeek: 0 };
    case 'feature':
      return { id: '', text: '' };
    case 'existing':
      return { id: '', name: '', url: null, difference: '' };
    case 'targetChange':
      return { id: '', text: '', signal: '' };
    case 'actor':
      return { id: '', name: '', type: 'user', power: 'medium', stance: 'unknown', excluded: false, note: '' };
    case 'relation':
      return { id: '', from: '', to: '', type: 'influences', note: '' };
    case 'precondition':
      return { id: '', text: '', actorId: null, stage: 'start', leadsTo: '', coveredByApp: false, assumption: '', risky: false, test: '' };
    case 'role':
      return { id: '', name: '', reason: '', reasonRefs: [], stage: 'start', status: 'seeking', coveredBy: null };
    case 'backlogItem': {
      const order = project.backlog.reduce((m, b) => Math.max(m, b.order), 0) + 1;
      return { id: '', stage: 'start', kind: 'organizing', featureId: null, preconditionId: null, text: '', order };
    }
    case 'toFindOut':
      return { id: '', step, text: '' };
    case 'projectInfo':
      return { id: kind, ...project.project };
    case 'problem':
      return { id: kind, ...project.problem };
    case 'direction':
      return { id: kind, text: project.direction };
  }
}

function refOptions(project: Project, sources: RefSource[], selfId: string): Options {
  const out: Options = [];
  for (const s of sources) {
    for (const e of project[s] as ({ id: string } & Record<string, unknown>)[]) {
      if (e.id === selfId) continue;
      const label = s === 'relations' ? relationLabel(project, e) : String(e.name ?? e.text ?? e.id);
      // When team members sit next to other kinds, mark them.
      out.push([e.id, `${label || e.id}${s === 'team' && sources.length > 1 ? ' (echipa)' : ''}`]);
    }
  }
  return out;
}

export function relationLabel(project: Project, r: Record<string, unknown>): string {
  const name = (id: unknown) => project.actors.find((a) => a.id === id)?.name ?? '?';
  const type = RELATION_TYPES.find(([v]) => v === r.type)?.[1] ?? String(r.type);
  return `${name(r.from)} ${type} ${name(r.to)}`;
}

const chars = (n: number) => (n >= 20 ? `${n} de caractere` : `${n} caractere`);

/** Romanian text for the zod issues our schemas can produce. */
function issueText(issue: ZodIssue): string {
  switch (issue.code) {
    case 'too_big':
      if (issue.type === 'string') return `Cel mult ${chars(Number(issue.maximum))}.`;
      if (issue.type === 'array') return `Cel mult ${issue.maximum} elemente.`;
      return `Cel mult ${issue.maximum}.`;
    case 'too_small':
      return `Cel puțin ${issue.minimum}.`;
    case 'invalid_type':
      return issue.received === 'nan' ? 'Scrie un număr.' : 'Completează acest câmp.';
    case 'invalid_string':
      return 'Link invalid (de forma https://…).';
    case 'invalid_enum_value':
      return 'Alege o opțiune.';
    default:
      return issue.message;
  }
}

type FormValue = string | boolean | string[];

function toForm(field: Field, value: unknown): FormValue {
  switch (field.type) {
    case 'checkbox':
      return value === true;
    case 'lines':
      return Array.isArray(value) ? value.join('\n') : '';
    case 'refs':
      return Array.isArray(value) ? value.map(String) : [];
    case 'number':
      return typeof value === 'number' ? String(value) : '';
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}

function fromForm(field: Field, value: FormValue): unknown {
  switch (field.type) {
    case 'checkbox':
    case 'refs':
      return value;
    case 'lines':
      return String(value)
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '');
    case 'number':
      return String(value).trim() === '' ? Number.NaN : Number(value);
    default: {
      const s = String(value);
      if (field.nullable && s.trim() === '') return null;
      return s;
    }
  }
}

type Props = {
  kind: EntityKind;
  data: Card['data'];
  project: Project;
  onSave: (data: Card['data']) => void;
  onCancel: () => void;
  /** When set, only these fields are editable (risks step); `text` is shown read-only. */
  only?: string[];
  title?: string;
};

const inputClass =
  'mt-1 w-full rounded-lg border border-stone-400 bg-white px-3 py-2 text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800';

export function CardEditor({ kind, data, project, onSave, onCancel, only, title }: Props) {
  const fields = FIELDS[kind].filter((f) => !only || only.includes(f.key));
  const [values, setValues] = useState<Record<string, FormValue>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, toForm(f, data[f.key])])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const baseId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
  }, []);

  const set = (key: string, v: FormValue) => setValues((prev) => ({ ...prev, [key]: v }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, unknown> = { ...data };
    for (const f of fields) next[f.key] = fromForm(f, values[f.key]);

    const errs: Record<string, string> = {};
    for (const f of fields) {
      if ('required' in f && f.required && String(next[f.key] ?? '').trim() === '') errs[f.key] = 'Completează acest câmp.';
    }
    // A backlog item of kind "feature" must point to one of the project's features; others have none.
    if (kind === 'backlogItem' && 'kind' in next) {
      if (next.kind === 'feature') {
        if (!next.featureId) errs.featureId = 'Alege funcția din listă.';
      } else {
        next.featureId = null;
      }
    }
    const target = kind === 'direction' ? next.text : next;
    const parsed = ENTITY_SCHEMAS[kind].safeParse(target);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = kind === 'direction' ? 'text' : String(issue.path[0] ?? '');
        if (!errs[key]) errs[key] = issueText(issue);
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = fields.find((f) => errs[f.key])?.key;
      if (firstKey) document.getElementById(`${baseId}-${firstKey}`)?.focus();
      return;
    }
    onSave(next as Card['data']);
  }

  return (
    <form ref={formRef} onSubmit={save} noValidate className="space-y-3 rounded-xl border border-teal-300 bg-white p-4">
      <h3 className="font-semibold text-stone-900">{title ?? KIND_LABEL[kind]}</h3>
      {only && typeof data.text === 'string' && <p className="text-stone-800">{data.text}</p>}
      {fields.map((f) => {
        const id = `${baseId}-${f.key}`;
        const err = errors[f.key];
        const errId = `${id}-err`;
        const aria = { 'aria-invalid': err ? true : undefined, 'aria-describedby': err ? errId : undefined };
        const v = values[f.key];
        let control: React.ReactNode;
        if (f.type === 'checkbox') {
          return (
            <div key={f.key}>
              <label htmlFor={id} className="flex items-center gap-2 text-sm text-stone-800">
                <input id={id} type="checkbox" checked={v === true} onChange={(e) => set(f.key, e.target.checked)} className="size-4 accent-teal-800" {...aria} />
                {f.label}
              </label>
              {err && <p id={errId} className="mt-1 text-sm text-red-800">{err}</p>}
            </div>
          );
        }
        if (f.type === 'refs') {
          const chosen = v as string[];
          const options = refOptions(project, f.refs, String(data.id));
          return (
            <fieldset key={f.key}>
              <legend className="text-sm font-medium text-stone-800">{f.label}</legend>
              {options.length === 0 && <p className="text-sm text-stone-600">Nimic în hartă încă.</p>}
              {options.map(([value, label]) => (
                <label key={value} className="mt-1 flex items-center gap-2 text-sm text-stone-800">
                  <input
                    type="checkbox"
                    className="size-4 accent-teal-800"
                    checked={chosen.includes(value)}
                    onChange={(e) => set(f.key, e.target.checked ? [...chosen, value] : chosen.filter((x) => x !== value))}
                  />
                  {label}
                </label>
              ))}
              {err && <p id={errId} className="mt-1 text-sm text-red-800">{err}</p>}
            </fieldset>
          );
        }
        if (f.type === 'enum' || f.type === 'ref') {
          const options = f.type === 'enum' ? f.options : refOptions(project, f.refs, String(data.id));
          const showEmpty = f.nullable || f.type === 'ref';
          control = (
            <select id={id} value={String(v)} onChange={(e) => set(f.key, e.target.value)} className={inputClass} {...aria}>
              {showEmpty && <option value="">{f.nullable ? '— niciunul —' : '— alege —'}</option>}
              {options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          );
        } else if (f.type === 'textarea' || f.type === 'lines') {
          control = <textarea id={id} rows={3} value={String(v)} onChange={(e) => set(f.key, e.target.value)} className={inputClass} {...aria} />;
        } else {
          control = (
            <input
              id={id}
              type={f.type === 'number' ? 'number' : 'text'}
              inputMode={f.type === 'number' ? 'decimal' : undefined}
              value={String(v)}
              onChange={(e) => set(f.key, e.target.value)}
              className={inputClass}
              {...aria}
            />
          );
        }
        return (
          <div key={f.key}>
            <label htmlFor={id} className="text-sm font-medium text-stone-800">
              {f.label}
            </label>
            {control}
            {err && <p id={errId} className="mt-1 text-sm text-red-800">{err}</p>}
          </div>
        );
      })}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="rounded-lg border border-teal-800 bg-white px-4 py-1.5 text-sm font-medium text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
        >
          Salvează
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-400 px-4 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
        >
          Renunță
        </button>
      </div>
    </form>
  );
}
