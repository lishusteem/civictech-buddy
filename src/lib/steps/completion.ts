import { StepIdSchema, type Project, type StepId } from '../project/schema';

type Rule = { done: (p: Project) => boolean; hint: string };

const filled = (s: string) => s.trim() !== '';

const RULES: Record<StepId, Rule> = {
  project: {
    done: (p) => filled(p.project.description) && p.team.length >= 1,
    hint: 'Acceptă descrierea proiectului și echipa.',
  },
  problem: { done: (p) => filled(p.problem.statement), hint: 'Acceptă formularea problemei.' },
  existing: {
    done: (p) => p.existing.length >= 1,
    hint: 'Adaugă cel puțin o inițiativă similară sau apasă «Nu am găsit nimic similar».',
  },
  target: { done: (p) => p.targetChanges.length >= 1, hint: 'Acceptă cel puțin o schimbare țintă.' },
  actors: { done: (p) => p.actors.length >= 1, hint: 'Acceptă cel puțin un actor.' },
  relations: { done: (p) => p.relations.length >= 1, hint: 'Acceptă cel puțin o relație între actori.' },
  preconditions: { done: (p) => p.preconditions.length >= 1, hint: 'Acceptă cel puțin o precondiție.' },
  risks: { done: (p) => p.preconditions.some((x) => x.risky), hint: 'Marchează cel puțin o ipoteză riscantă.' },
  roles: { done: (p) => p.roles.length >= 1, hint: 'Acceptă cel puțin un rol.' },
  backlog: { done: (p) => p.backlog.length >= 1, hint: 'Acceptă cel puțin un element în backlog.' },
};

/** A step can be left (and counts as done) only when it has the saved content that the next steps build on. */
export function isStepComplete(p: Project, step: StepId): boolean {
  return RULES[step].done(p);
}

/** What is still missing for the step, or '' when it is complete. */
export function missingForStep(p: Project, step: StepId): string {
  if (isStepComplete(p, step)) return '';
  if (step === 'relations' && p.actors.length < 2) {
    return 'Ai nevoie de cel puțin 2 actori: întoarce-te la pasul Actorii sau adaugă un actor nou.';
  }
  return RULES[step].hint;
}

/** The stored status, except that 'done' only holds for a complete step (older drafts may say done with nothing saved). */
export function effectiveStatus(p: Project, step: StepId): Project['steps'][StepId]['status'] {
  const status = p.steps[step].status;
  return status === 'done' && !isStepComplete(p, step) ? 'in_progress' : status;
}

export function firstIncompleteStep(p: Project): StepId | null {
  return StepIdSchema.options.find((s) => !isStepComplete(p, s)) ?? null;
}

/** A step is open when every step before it is complete. */
export function isStepUnlocked(p: Project, step: StepId): boolean {
  const first = firstIncompleteStep(p);
  return first === null || StepIdSchema.options.indexOf(step) <= StepIdSchema.options.indexOf(first);
}
