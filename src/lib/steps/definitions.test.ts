import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import { fillSteps } from './completion.fixtures';
import { STEPS, minutesLeft } from './definitions';

describe('step definitions', () => {
  it('minutes sum to 30', () => {
    expect(STEPS.reduce((a, s) => a + s.minutes, 0)).toBe(30);
  });

  it('keeps the canonical step order', () => {
    expect(STEPS.map((s) => s.id)).toEqual([
      'project', 'problem', 'existing', 'target', 'actors',
      'relations', 'preconditions', 'risks', 'roles', 'backlog',
    ]);
  });

  it('minutesLeft is 30 on an empty project', () => {
    expect(minutesLeft(createEmptyProject('x'))).toBe(30);
  });

  it('minutesLeft skips done steps', () => {
    const p = createEmptyProject('x');
    fillSteps(p, ['project', 'problem']);
    p.steps.project.status = 'done';
    p.steps.problem.status = 'done';
    expect(minutesLeft(p)).toBe(23);
  });

  it('minutesLeft ignores a done status without saved content', () => {
    const p = createEmptyProject('x');
    p.steps.project.status = 'done';
    expect(minutesLeft(p)).toBe(30);
  });
});
