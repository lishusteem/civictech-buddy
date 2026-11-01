import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import { STEPS } from './definitions';
import { fill, precondition } from './completion.fixtures';
import { effectiveStatus, firstIncompleteStep, isStepComplete, isStepUnlocked, missingForStep } from './completion';

describe('isStepComplete / missingForStep', () => {
  for (const { id } of STEPS) {
    it(`${id}: incomplete when empty (with a hint), complete once filled`, () => {
      const p = createEmptyProject('P');
      expect(isStepComplete(p, id)).toBe(false);
      expect(missingForStep(p, id)).not.toBe('');
      fill[id](p);
      expect(isStepComplete(p, id)).toBe(true);
      expect(missingForStep(p, id)).toBe('');
    });
  }

  it('project needs both a description and a team member', () => {
    const p = createEmptyProject('P');
    p.project.description = 'Ceva';
    expect(isStepComplete(p, 'project')).toBe(false);
    expect(missingForStep(p, 'project')).toBe('Acceptă descrierea proiectului și echipa.');
    p.project.description = '   ';
    p.team = [{ id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 5 }];
    expect(isStepComplete(p, 'project')).toBe(false);
  });

  it('risks needs a risky precondition, not just any precondition', () => {
    const p = createEmptyProject('P');
    p.preconditions = [{ ...precondition }];
    expect(isStepComplete(p, 'risks')).toBe(false);
    expect(missingForStep(p, 'risks')).toBe('Marchează cel puțin o ipoteză riscantă.');
  });

  it('uses the product hints', () => {
    const p = createEmptyProject('P');
    expect(missingForStep(p, 'existing')).toBe('Adaugă cel puțin o inițiativă similară sau apasă «Nu am găsit nimic similar».');
    expect(missingForStep(p, 'relations')).toBe(
      'Ai nevoie de cel puțin 2 actori: întoarce-te la pasul Actorii sau adaugă un actor nou.',
    );
    fill.actors(p);
    p.actors.push({ ...p.actors[0], id: 'a2' });
    expect(missingForStep(p, 'relations')).toBe('Acceptă cel puțin o relație între actori.');
  });
});

describe('effectiveStatus / firstIncompleteStep', () => {
  it('shows done only when the step is complete', () => {
    const p = createEmptyProject('P');
    p.steps.problem.status = 'done';
    expect(effectiveStatus(p, 'problem')).toBe('in_progress');
    fill.problem(p);
    expect(effectiveStatus(p, 'problem')).toBe('done');
    p.steps.problem.status = 'in_progress';
    expect(effectiveStatus(p, 'problem')).toBe('in_progress');
  });

  it('keeps untouched steps untouched', () => {
    expect(effectiveStatus(createEmptyProject('P'), 'actors')).toBe('untouched');
  });

  it('finds the first incomplete step, or null when all are complete', () => {
    const p = createEmptyProject('P');
    expect(firstIncompleteStep(p)).toBe('project');
    fill.project(p);
    fill.problem(p);
    expect(firstIncompleteStep(p)).toBe('existing');
    for (const s of STEPS) fill[s.id](p);
    p.actors = [...p.actors];
    fill.risks(p);
    expect(firstIncompleteStep(p)).toBeNull();
  });
});

describe('measures step', () => {
  const upTo8 = () => {
    const p = createEmptyProject('P');
    for (const s of ['project', 'problem', 'existing', 'target', 'actors', 'relations', 'preconditions', 'risks'] as const) fill[s](p);
    return p;
  };

  it('gates the roles step on the key measure', () => {
    const p = upTo8();
    expect(isStepUnlocked(p, 'measures')).toBe(true);
    expect(isStepUnlocked(p, 'roles')).toBe(false);
    p.measures = [{ id: 'ms1', role: 'key', stepId: 'p1', what: 'ce' }];
    expect(isStepUnlocked(p, 'roles')).toBe(true);
  });

  it('hints at the key measure', () => {
    expect(missingForStep(upTo8(), 'measures')).toBe('Alege măsura-cheie: un pas din drum și ce urmărești la el.');
  });
});

