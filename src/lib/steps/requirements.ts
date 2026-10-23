import { ALERT_MESSAGES } from '../alerts/messages';
import type { AlertCode, Project, StepId } from '../project/schema';

/**
 * One row of a step's "Ce cere pasul" checklist (UX spec §4). Required rows reproduce the gating rules of
 * completion.ts exactly (a unit test checks the equivalence); recommended rows never block and replace the
 * code alerts that used to be shown as boxes.
 */
export type Requirement = {
  id: string;
  /** Romanian, short. */
  label: string;
  level: 'required' | 'recommended';
  done: (p: Project) => boolean;
  /** One line, shown under a missing row after "De ce contează:". */
  why?: string;
  /** The code alert this row replaces. */
  alertCode?: AlertCode;
  /** An inline button inside the row. */
  action?: 'none_found' | 'add_suggested' | 'orphan_features';
};

export type RowState = 'saved' | 'proposed' | 'missing';

/** The card saved by "Nu am găsit nimic similar" on step 3. */
export const NONE_FOUND_NAME = 'Nimic similar găsit';

const filled = (s: string) => s.trim() !== '';
const everyNonEmpty = <T,>(xs: T[], ok: (x: T) => boolean) => xs.length > 0 && xs.every(ok);
const SELF_NAME = /^(tu|eu|me)$/i;
const POWER_RANK = { low: 0, medium: 1, high: 2 } as const;
const TWO_ACTORS = 'Ai nevoie de cel puțin 2 actori: întoarce-te la pasul Actorii sau adaugă un actor nou.';

const req = (id: string, label: string, done: Requirement['done'], extra: Partial<Requirement> = {}): Requirement => ({
  id,
  label,
  level: 'required',
  done,
  ...extra,
});

const rec = (id: string, label: string, done: Requirement['done'], extra: Partial<Requirement> = {}): Requirement => ({
  id,
  label,
  level: 'recommended',
  done,
  ...(extra.alertCode ? { why: ALERT_MESSAGES[extra.alertCode].why } : {}),
  ...extra,
});

/** The most powerful actors, and those of them in no relation and no precondition (as the powerful_actor_unused alert). */
function powerfulActors(p: Project) {
  if (p.actors.length === 0) return { top: [], unused: [] };
  const max = Math.max(...p.actors.map((a) => POWER_RANK[a.power]));
  const top = p.actors.filter((a) => POWER_RANK[a.power] === max);
  const unused = top.filter(
    (a) => !p.relations.some((r) => r.from === a.id || r.to === a.id) && !p.preconditions.some((c) => c.actorId === a.id),
  );
  return { top, unused };
}

/** A feature is linked when a backlog item ties it to a precondition (as the orphan_feature alert). */
export const isFeatureLinked = (p: Project, featureId: string) =>
  p.backlog.some((b) => b.featureId === featureId && b.preconditionId !== null);

/** "Păstrează" or "Mai târziu" dismissed the feature's orphan alert. */
export const isFeatureKept = (p: Project, featureId: string) =>
  p.alerts.some((a) => a.code === 'orphan_feature' && a.status === 'dismissed' && a.refs.includes(featureId));

/** Features that help no precondition yet and were not kept or moved to "mai târziu". */
export const orphanFeatures = (p: Project) => p.features.filter((f) => !isFeatureLinked(p, f.id) && !isFeatureKept(p, f.id));

/** The checklist rows of a step; `p` fills in the labels that name something from the project. */
export function requirementsFor(step: StepId, p: Project): Requirement[] {
  switch (step) {
    case 'project':
      return [
        req('project.description', 'Ce face proiectul (descrierea)', (x) => filled(x.project.description)),
        req('project.team', 'Cine e în echipă (cel puțin un om)', (x) => x.team.length >= 1),
        rec('project.features', 'Funcțiile aplicației', (x) => x.features.length >= 1, {
          why: 'Fără ele, la pasul 10 n-avem ce ordona.',
        }),
        rec('project.names', 'Numele tău, nu „tu”', (x) => everyNonEmpty(x.team, (m) => !SELF_NAME.test(m.name.trim())), {
          why: 'Apare pe pagina publică.',
        }),
        rec('project.stage', 'Stadiul (idee / prototip / live)', (x) => x.project.stage !== null),
        rec('project.contact', 'Un contact pentru cine vrea să ajute', (x) => filled(x.project.contact), {
          why: 'Fără el, grupul nu are cum să te găsească.',
        }),
      ];
    case 'problem':
      return [
        req('problem.statement', 'Problema, în 2–3 propoziții', (x) => filled(x.problem.statement)),
        rec('problem.evidence', 'De unde știi (o dovadă)', (x) => x.problem.evidence.length >= 1, { alertCode: 'no_evidence' }),
      ];
    case 'existing':
      return [
        req('existing.any', 'O inițiativă asemănătoare — sau „nu am găsit nimic”', (x) => x.existing.length >= 1, {
          alertCode: 'first_in_world',
          why: ALERT_MESSAGES.first_in_world.why,
          action: 'none_found',
        }),
        rec('existing.difference', 'Ce faci diferit', (x) => {
          const real = x.existing.filter((e) => e.name !== NONE_FOUND_NAME);
          return real.length === 0 ? x.existing.length > 0 : real.every((e) => filled(e.difference));
        }),
      ];
    case 'target':
      return [
        req('target.any', 'Cel puțin o schimbare țintă', (x) => x.targetChanges.length >= 1),
        rec('target.signals', 'Un semn observabil pentru fiecare', (x) => everyNonEmpty(x.targetChanges, (t) => filled(t.signal))),
        rec('target.direction', 'Direcția pe termen lung', (x) => filled(x.direction)),
      ];
    case 'actors':
      return [
        req('actors.any', 'Cel puțin un actor', (x) => x.actors.length >= 1),
        rec('actors.two', 'Cel puțin 2 actori (pentru pasul Relațiile)', (x) => x.actors.length >= 2, {
          why: 'Relațiile leagă doi actori.',
        }),
        rec('actors.decider', 'Cine decide (o instituție)', (x) => x.actors.some((a) => a.type === 'institution'), {
          alertCode: 'only_users',
        }),
        rec('actors.excluded', 'Cine e exclus sau pierde ceva', (x) => x.actors.some((a) => a.excluded || a.stance === 'opposes'), {
          alertCode: 'nobody_excluded',
        }),
      ];
    case 'relations': {
      const { top, unused } = powerfulActors(p);
      const name = (unused[0] ?? top[0])?.name;
      return [
        req('relations.any', 'Cel puțin o relație', (x) => x.relations.length >= 1, p.actors.length < 2 ? { why: TWO_ACTORS } : {}),
        rec(
          'relations.powerful',
          name ? `Cel mai puternic actor (${name}) e legat de ceilalți` : 'Cel mai puternic actor e legat de ceilalți',
          (x) => x.actors.length > 0 && powerfulActors(x).unused.length === 0,
          { alertCode: 'powerful_actor_unused' },
        ),
      ];
    }
    case 'preconditions':
      return [
        req('preconditions.any', 'Cel puțin o precondiție', (x) => x.preconditions.length >= 1),
        rec('preconditions.actors', 'Fiecare are un actor care face ceva diferit', (x) =>
          everyNonEmpty(x.preconditions, (c) => c.actorId !== null),
        ),
        rec('preconditions.offApp', 'Ceva ce se întâmplă fără aplicație', (x) => x.preconditions.some((c) => !c.coveredByApp), {
          alertCode: 'all_through_app',
        }),
      ];
    case 'risks':
      return [
        req('risks.any', 'Cel puțin o ipoteză marcată riscantă', (x) => x.preconditions.some((c) => c.risky)),
        rec('risks.dev', 'Cel puțin 2 ipoteze riscante spuse de tine, nu doar sugerate de AI', (x) =>
          x.preconditions.filter((c) => c.risky && c.riskBy !== 'ai').length >= 2,
        ),
        rec(
          'risks.tests',
          'Un test ieftin pentru fiecare ipoteză riscantă',
          (x) => everyNonEmpty(x.preconditions.filter((c) => c.risky), (c) => filled(c.test)),
          { alertCode: 'hypothesis_without_test' },
        ),
      ];
    case 'roles':
      return [
        req('roles.any', 'Cel puțin un rol', (x) => x.roles.length >= 1),
        rec('roles.status', 'O stare pentru fiecare rol (caut / partener / acoperit)', (x) => everyNonEmpty(x.roles, (r) => !!r.status)),
      ];
    case 'backlog':
      return [
        req('backlog.any', 'Cel puțin un element', (x) => x.backlog.length >= 1, { action: 'add_suggested' }),
        rec('backlog.offCode', 'Cel puțin un pas în afara codului', (x) => x.backlog.some((b) => b.kind !== 'feature'), {
          alertCode: 'only_code',
        }),
        rec(
          'backlog.orphans',
          'Fiecare funcție e legată de o precondiție sau mutată la „mai târziu”',
          (x) => orphanFeatures(x).length === 0,
          { alertCode: 'orphan_feature', action: 'orphan_features' },
        ),
      ];
  }
}

/** ✓ saved in the draft, ◐ saved only once the pending proposals are accepted, ○ missing. */
export function rowState(r: Requirement, draft: Project, afterAccept: Project): RowState {
  if (r.done(draft)) return 'saved';
  return r.done(afterAccept) ? 'proposed' : 'missing';
}

/** The label of the first required row not done, or null when the step is complete. */
export function firstMissingRequired(p: Project, step: StepId): string | null {
  return requirementsFor(step, p).find((r) => r.level === 'required' && !r.done(p))?.label ?? null;
}

/** How many recommended rows are still not done. */
export function openRecommended(p: Project, step: StepId): number {
  return requirementsFor(step, p).filter((r) => r.level === 'recommended' && !r.done(p)).length;
}
