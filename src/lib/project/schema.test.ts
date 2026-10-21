import { describe, expect, it } from 'vitest';
import { ProjectSchema } from './schema';
import { createEmptyProject } from './empty';

describe('ProjectSchema', () => {
  it('accepts an empty project', () => {
    const p = createEmptyProject('Test');
    expect(() => ProjectSchema.parse(p)).not.toThrow();
    expect(p.steps.backlog.status).toBe('untouched');
    expect(p.project.stage).toBeNull();
  });

  it('accepts the PRD example completed with missing fields', () => {
    const base = createEmptyProject('Sesizări pentru asociații de proprietari');
    const example = {
      ...base,
      project: {
        name: 'Sesizări pentru asociații de proprietari',
        description: '...',
        stage: 'prototype',
        area: 'București',
        links: ['https://github.com/example/repo'],
        motivation: '...',
        contact: '...',
      },
      team: [{ id: 'm1', name: 'Ana', skills: ['frontend', 'design'], hoursPerWeek: 5 }],
      features: [{ id: 'f1', text: 'Formular de raportare cu poză și locație' }],
      steps: {
        ...base.steps,
        problem: { status: 'done', messages: [] },
      },
      problem: { statement: '...', evidence: ['...'], verified: false },
      existing: [{ id: 'e1', name: '...', url: 'https://example.com', difference: '...' }],
      direction: '...',
      targetChanges: [
        { id: 't1', text: 'Primăria răspunde public la sesizări în 30 de zile', signal: '...' },
      ],
      actors: [
        { id: 'a1', name: 'Primăria sectorului', type: 'institution', power: 'high', stance: 'unknown', excluded: false },
        { id: 'a2', name: 'Consiliul local', type: 'institution', power: 'medium', stance: 'neutral', excluded: false },
      ],
      relations: [{ id: 'r1', from: 'a1', to: 'a2', type: 'decides', note: '...' }],
      preconditions: [
        { id: 'p1', text: '...', actorId: 'a1', stage: 'mid', leadsTo: 't1', coveredByApp: false, assumption: '...', risky: true, test: '...' },
      ],
      roles: [
        { id: 'o1', name: 'Lobbist', reason: '...', reasonRefs: ['p1', 'r1'], stage: 'mid', status: 'seeking', coveredBy: null },
      ],
      backlog: [
        { id: 'b1', stage: 'start', kind: 'feature', featureId: 'f1', preconditionId: 'p2', text: '...', order: 0 },
      ],
      toFindOut: [],
      alerts: [{ code: 'powerful_actor_unused', step: 7, refs: ['a1'], status: 'dismissed', message: '...' }],
      stale: ['p1'],
    };
    expect(() => ProjectSchema.parse(example)).not.toThrow();
  });

  it('rejects a message over 4000 characters', () => {
    const p = createEmptyProject('Test');
    p.steps.problem.messages = [{ role: 'user', content: 'x'.repeat(4001) }];
    expect(ProjectSchema.safeParse(p).success).toBe(false);
  });

  it('accepts a message of exactly 4000 characters', () => {
    const p = createEmptyProject('Test');
    p.steps.problem.messages = [{ role: 'user', content: 'x'.repeat(4000) }];
    expect(ProjectSchema.safeParse(p).success).toBe(true);
  });

  it('rejects an invalid precondition stage', () => {
    const p = createEmptyProject('Test') as unknown as Record<string, unknown>;
    p.preconditions = [
      { id: 'p1', text: 'x', actorId: null, stage: 'long', leadsTo: 't1', coveredByApp: false, assumption: '', risky: false, test: '' },
    ];
    expect(ProjectSchema.safeParse(p).success).toBe(false);
  });

  it('rejects more than 3 target changes', () => {
    const p = createEmptyProject('Test');
    p.targetChanges = [1, 2, 3, 4].map((i) => ({ id: `t${i}`, text: 'x', signal: 'y' }));
    expect(ProjectSchema.safeParse(p).success).toBe(false);
  });
});
