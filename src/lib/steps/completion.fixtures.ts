import type { Project, StepId } from '../project/schema';

// Test helpers: fill exactly what each step needs to count as complete.
export const precondition = {
  id: 'p1', text: 'x', actorId: null, stage: 'start', leadsTo: 't1', coveredByApp: false, assumption: '', risky: false, test: '',
} as const;

/** Fills exactly what each step needs. */
export const fill: Record<StepId, (p: Project) => void> = {
  project: (p) => {
    p.project.description = 'Descriere';
    p.team = [{ id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 5 }];
  },
  problem: (p) => void (p.problem.statement = 'Problema'),
  existing: (p) => void (p.existing = [{ id: 'e1', name: 'X', url: null, difference: 'y' }]),
  target: (p) => void (p.targetChanges = [{ id: 't1', text: 'T', signal: '' }]),
  actors: (p) => void (p.actors = [{ id: 'a1', name: 'A', type: 'user', power: 'low', stance: 'unknown', excluded: false }]),
  relations: (p) => void (p.relations = [{ id: 'r1', from: 'a1', to: 'a2', type: 'decides', note: '' }]),
  preconditions: (p) => void (p.preconditions = [{ ...precondition }]),
  risks: (p) => void (p.preconditions = [{ ...precondition, risky: true }]),
  roles: (p) =>
    void (p.roles = [{ id: 'o1', name: 'R', reason: 'm', reasonRefs: ['p1'], stage: 'start', status: 'seeking', coveredBy: null }]),
  backlog: (p) =>
    void (p.backlog = [{ id: 'b1', stage: 'start', kind: 'test', featureId: null, preconditionId: null, text: 't', order: 1 }]),
};


export function fillSteps(p: Project, steps: StepId[]): Project {
  for (const s of steps) fill[s](p);
  return p;
}
