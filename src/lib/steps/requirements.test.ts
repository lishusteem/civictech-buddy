import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import type { Project, StepId } from '../project/schema';
import { STEPS } from './definitions';
import { fill, fillSteps, precondition } from './completion.fixtures';
import { isStepComplete, requirementsFor } from './completion';
import { firstMissingRequired, NONE_FOUND_NAME, openRecommended, rowState } from './requirements';

const ids = STEPS.map((s) => s.id);
const requiredDone = (p: Project, step: StepId) => requirementsFor(step, p).filter((r) => r.level === 'required').every((r) => r.done(p));
const row = (step: StepId, p: Project, id: string) => requirementsFor(step, p).find((r) => r.id === id)!;

/** Drafts that cover each step empty, partly filled, filled, and filled with extra content. */
function fixtures(): Project[] {
  const out: Project[] = [createEmptyProject('P')];
  for (const s of ids) out.push(fillSteps(createEmptyProject('P'), [s]));
  out.push(fillSteps(createEmptyProject('P'), ids));
  const partProject = createEmptyProject('P');
  partProject.project.description = 'Ceva';
  out.push(partProject);
  const blankDescription = fillSteps(createEmptyProject('P'), ['project']);
  blankDescription.project.description = '   ';
  out.push(blankDescription);
  const notRisky = createEmptyProject('P');
  notRisky.preconditions = [{ ...precondition }];
  out.push(notRisky);
  return out;
}

describe('requirementsFor', () => {
  it('required rows are equivalent to isStepComplete for every fixture and step', () => {
    for (const p of fixtures()) {
      for (const s of ids) expect(requiredDone(p, s), s).toBe(isStepComplete(p, s));
    }
  });

  it('every step has at least one required row with a Romanian label', () => {
    for (const s of ids) {
      const rows = requirementsFor(s, createEmptyProject('P'));
      expect(rows.some((r) => r.level === 'required'), s).toBe(true);
      for (const r of rows) expect(r.label.trim()).not.toBe('');
    }
  });

  it('step 1 rows: names, stage, contact and features are recommended', () => {
    const p = fillSteps(createEmptyProject('P'), ['project']);
    const labels = requirementsFor('project', p).map((r) => [r.label, r.level]);
    expect(labels).toEqual([
      ['Ce face proiectul (descrierea)', 'required'],
      ['Cine e în echipă (cel puțin un om)', 'required'],
      ['Funcțiile aplicației', 'recommended'],
      ['Numele tău, nu „tu”', 'recommended'],
      ['Stadiul (idee / prototip / live)', 'recommended'],
      ['Un contact pentru cine vrea să ajute', 'recommended'],
    ]);
    expect(row('project', p, 'project.names').done(p)).toBe(true);
    p.team[0].name = ' Tu ';
    expect(row('project', p, 'project.names').done(p)).toBe(false);
    expect(row('project', createEmptyProject('P'), 'project.names').done(createEmptyProject('P'))).toBe(false);
    expect(row('project', p, 'project.contact').why).toBe('Fără el, grupul nu are cum să te găsească.');
  });

  it('rows that replace a code alert use its why copy', () => {
    const p = createEmptyProject('P');
    const r = row('actors', p, 'actors.excluded');
    expect(r.alertCode).toBe('nobody_excluded');
    expect(r.why).toBe('Ca să nu construiești doar pentru cei care au deja acces.');
  });

  it('step 3 offers "nu am găsit nimic" and ignores that card for the difference row', () => {
    const p = createEmptyProject('P');
    expect(row('existing', p, 'existing.any').action).toBe('none_found');
    p.existing = [{ id: 'e1', name: NONE_FOUND_NAME, url: null, difference: '' }];
    expect(row('existing', p, 'existing.difference').done(p)).toBe(true);
    p.existing.push({ id: 'e2', name: 'X', url: null, difference: '' });
    expect(row('existing', p, 'existing.difference').done(p)).toBe(false);
  });

  it('step 5 recommended rows follow the actors', () => {
    const p = fillSteps(createEmptyProject('P'), ['actors']);
    expect(row('actors', p, 'actors.two').done(p)).toBe(false);
    expect(row('actors', p, 'actors.decider').done(p)).toBe(false);
    p.actors.push({ id: 'a2', name: 'Primăria', type: 'institution', power: 'high', stance: 'opposes', excluded: false });
    expect(row('actors', p, 'actors.two').done(p)).toBe(true);
    expect(row('actors', p, 'actors.decider').done(p)).toBe(true);
    expect(row('actors', p, 'actors.excluded').done(p)).toBe(true);
  });

  it('step 6 names the most powerful actor and the 2-actor hint while actors are missing', () => {
    const p = fillSteps(createEmptyProject('P'), ['actors']);
    expect(row('relations', p, 'relations.any').why).toBe(
      'Ai nevoie de cel puțin 2 actori: întoarce-te la pasul Actorii sau adaugă un actor nou.',
    );
    fill.relations(p);
    p.actors.push({ id: 'a3', name: 'Ministerul', type: 'institution', power: 'high', stance: 'unknown', excluded: false });
    const powerful = row('relations', p, 'relations.powerful');
    expect(powerful.label).toBe('Cel mai puternic actor (Ministerul) e legat de ceilalți');
    expect(powerful.done(p)).toBe(false);
    p.relations.push({ id: 'r2', from: 'a3', to: 'a1', type: 'decides', note: '' });
    expect(powerful.done(p)).toBe(true);
    expect(row('relations', p, 'relations.any').why).toBeUndefined();
  });

  it('step 10 orphan row: done when each feature is linked or its alert was kept', () => {
    const p = fillSteps(createEmptyProject('P'), ['backlog']);
    p.features = [{ id: 'f1', text: 'Harta' }, { id: 'f2', text: 'Export' }];
    p.preconditions = [{ ...precondition }];
    const orphans = row('backlog', p, 'backlog.orphans');
    expect(orphans.done(p)).toBe(false);
    p.backlog.push({ id: 'b2', stage: 'start', kind: 'feature', featureId: 'f1', preconditionId: 'p1', text: 'Harta', order: 2 });
    expect(orphans.done(p)).toBe(false);
    p.alerts = [{ code: 'orphan_feature', step: 10, refs: ['f2'], status: 'dismissed', message: 'm' }];
    expect(orphans.done(p)).toBe(true);
  });

  it('every-item rows need at least one item', () => {
    const p = createEmptyProject('P');
    expect(row('target', p, 'target.signals').done(p)).toBe(false);
    expect(row('preconditions', p, 'preconditions.actors').done(p)).toBe(false);
    expect(row('risks', p, 'risks.tests').done(p)).toBe(false);
    expect(row('roles', p, 'roles.status').done(p)).toBe(false);
    fill.roles(p);
    expect(row('roles', p, 'roles.status').done(p)).toBe(true);
  });
});

describe('rowState / firstMissingRequired / openRecommended', () => {
  it('saved, proposed (only after accepting) or missing', () => {
    const empty = createEmptyProject('P');
    const after = fillSteps(createEmptyProject('P'), ['actors']);
    const r = row('actors', empty, 'actors.any');
    expect(rowState(r, empty, after)).toBe('proposed');
    expect(rowState(r, empty, empty)).toBe('missing');
    expect(rowState(r, after, after)).toBe('saved');
  });

  it('names the first missing required row, or null', () => {
    const p = createEmptyProject('P');
    expect(firstMissingRequired(p, 'project')).toBe('Ce face proiectul (descrierea)');
    p.project.description = 'x';
    expect(firstMissingRequired(p, 'project')).toBe('Cine e în echipă (cel puțin un om)');
    fill.project(p);
    expect(firstMissingRequired(p, 'project')).toBeNull();
  });

  it('counts the recommended rows still open', () => {
    const p = fillSteps(createEmptyProject('P'), ['actors']);
    expect(openRecommended(p, 'actors')).toBe(3);
  });
});
