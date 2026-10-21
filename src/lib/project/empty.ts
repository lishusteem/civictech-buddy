import { StepIdSchema, type Project } from './schema';

export function createEmptyProject(name: string): Project {
  const steps = Object.fromEntries(
    StepIdSchema.options.map((id) => [id, { status: 'untouched', messages: [] }]),
  ) as unknown as Project['steps'];

  return {
    version: 1,
    project: { name, description: '', stage: null, area: '', links: [], motivation: '', contact: '' },
    team: [],
    features: [],
    steps,
    problem: { statement: '', evidence: [], verified: false },
    existing: [],
    direction: '',
    targetChanges: [],
    actors: [],
    relations: [],
    preconditions: [],
    roles: [],
    backlog: [],
    toFindOut: [],
    alerts: [],
    stale: [],
  };
}
