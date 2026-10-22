import { describe, it, expect } from 'vitest';
import { createEmptyProject } from '@/lib/project/empty';
import { prepublishCheck } from './prepublish';

describe('prepublishCheck (§8.1)', () => {
  it('reports everything missing on an empty project', () => {
    expect(prepublishCheck(createEmptyProject('P'))).toEqual({
      pitch: false,
      contact: false,
      selfNamed: null,
      seekingRole: false,
      publicQuestions: 0,
    });
  });

  it('passes with a pitch, contact, real names and a sought role; counts public questions', () => {
    const p = createEmptyProject('P');
    p.problem.statement = 'Problema.';
    p.project.contact = ' ana@exemplu.ro ';
    p.team = [{ id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 3 }];
    p.roles = [{ id: 'o1', name: 'Jurist', reason: '', reasonRefs: [], stage: 'start', status: 'partner', coveredBy: null }];
    p.toFindOut = [{ id: 'q1', step: 'problem', text: 'Câți?' }];
    expect(prepublishCheck(p)).toEqual({ pitch: true, contact: true, selfNamed: null, seekingRole: true, publicQuestions: 1 });
  });

  it('names the first member called „tu” / „eu” / „me”', () => {
    const p = createEmptyProject('P');
    p.team = [
      { id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 3 },
      { id: 'm2', name: 'Eu', skills: [], hoursPerWeek: 3 },
      { id: 'm3', name: 'tu', skills: [], hoursPerWeek: 3 },
    ];
    expect(prepublishCheck(p).selfNamed).toEqual({ id: 'm2', name: 'Eu' });
  });

  it('does not count a covered role as sought', () => {
    const p = createEmptyProject('P');
    p.roles = [{ id: 'o1', name: 'Dev', reason: '', reasonRefs: [], stage: 'start', status: 'covered', coveredBy: 'Ana' }];
    expect(prepublishCheck(p).seekingRole).toBe(false);
  });
});
