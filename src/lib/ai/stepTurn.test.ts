import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../project/empty';
import { ProjectSchema, StepIdSchema, type Project } from '../project/schema';
import { FakeProvider, type ChatMessage, type ChatProvider } from './provider';
import { buildMessages } from './prompts';
import { runStepTurn, summarizeProject } from './stepTurn';

/** Replies with the given strings in order and records every call. */
function scripted(...replies: string[]) {
  const calls: ChatMessage[][] = [];
  const provider: ChatProvider = {
    async complete(messages) {
      calls.push(messages);
      const next = replies.shift();
      if (next === undefined) throw new Error('no more replies');
      return next;
    },
  };
  return { provider, calls };
}

const actorCard = {
  kind: 'actor',
  data: { id: 'a1', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false },
};

function withFeature(): Project {
  const p = createEmptyProject('Parcul');
  p.features = [{ id: 'f1', text: 'Hartă cu parcuri' }];
  p.preconditions = [
    {
      id: 'p1',
      text: 'Primăria publică datele',
      actorId: null,
      stage: 'start',
      leadsTo: 't1',
      coveredByApp: false,
      assumption: '',
      risky: false,
      test: '',
    },
  ];
  return p;
}

describe('runStepTurn', () => {
  it('passes a valid question through unchanged', async () => {
    const { provider, calls } = scripted(JSON.stringify({ kind: 'question', text: 'Cui i se întâmplă?' }));
    const turn = await runStepTurn(createEmptyProject('x'), 'problem', [], provider);
    expect(turn).toEqual({ kind: 'question', text: 'Cui i se întâmplă?' });
    expect(calls).toHaveLength(1);
  });

  it('retries once when a card kind is not allowed on the step', async () => {
    const good = {
      kind: 'proposal',
      text: 'Așa am înțeles problema.',
      cards: [{ kind: 'problem', data: { statement: 'Oamenii nu găsesc parcuri.', evidence: [], verified: false } }],
    };
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [actorCard] }),
      JSON.stringify(good),
    );
    const turn = await runStepTurn(createEmptyProject('x'), 'problem', [], provider);
    expect(calls).toHaveLength(2);
    // The retry carries the error as a user message.
    const last = calls[1][calls[1].length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toContain('actor');
    expect(turn.kind).toBe('proposal');
    if (turn.kind !== 'question') {
      expect(turn.cards).toEqual([
        { kind: 'problem', data: { id: 'problem', statement: 'Oamenii nu găsesc parcuri.', evidence: [], verified: false } },
      ]);
    }
  });

  it('falls back with no cards after two non-JSON answers', async () => {
    const { provider, calls } = scripted('not json', 'not json');
    const turn = await runStepTurn(createEmptyProject('x'), 'problem', [], provider);
    expect(calls).toHaveLength(2);
    expect(turn).toEqual({
      kind: 'fallback',
      text: 'N-am reușit să structurez răspunsul. Completează direct în formular.',
      cards: [],
    });
  });

  it('retries a backlog proposal that references an unknown feature', async () => {
    const item = (featureId: string) => ({
      kind: 'backlogItem',
      data: { id: 'b1', stage: 'start', kind: 'feature', featureId, preconditionId: 'p1', text: 'Hartă', order: 1 },
    });
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [item('f99')] }),
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [item('f1')] }),
    );
    const turn = await runStepTurn(withFeature(), 'backlog', [], provider);
    expect(calls).toHaveLength(2);
    expect(calls[1][calls[1].length - 1].content).toContain('f99');
    expect(turn.kind).toBe('proposal');
  });

  it('retries a backlog feature item with no featureId (an invented feature)', async () => {
    const invented = { kind: 'backlogItem', data: { id: 'b1', stage: 'start', kind: 'feature', featureId: null, preconditionId: null, text: 'Notificări push', order: 1 } };
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [invented] }),
      JSON.stringify({ kind: 'question', text: 'Ce funcții ai?' }),
    );
    const turn = await runStepTurn(withFeature(), 'backlog', [], provider);
    expect(calls).toHaveLength(2);
    expect(turn.kind).toBe('question');
  });

  it('retries a test/organizing backlog item that carries a featureId', async () => {
    const item = { kind: 'backlogItem', data: { id: 'b1', stage: 'start', kind: 'organizing', featureId: 'f1', preconditionId: null, text: 'Întâlnire', order: 1 } };
    const { provider, calls } = scripted(JSON.stringify({ kind: 'proposal', text: 'x', cards: [item] }), 'not json');
    expect((await runStepTurn(withFeature(), 'backlog', [], provider)).kind).toBe('fallback');
    expect(calls).toHaveLength(2);
  });

  it('retries a relation pointing to an unknown actor', async () => {
    const p = withFeature();
    p.actors = [
      { id: 'a1', name: 'Părinți', type: 'user', power: 'low', stance: 'supports', excluded: false },
      { id: 'a2', name: 'Școala', type: 'institution', power: 'high', stance: 'neutral', excluded: false },
    ];
    const rel = (to: string) => ({ kind: 'relation', data: { id: 'r1', from: 'a1', to, type: 'influences', note: '' } });
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [rel('a99')] }),
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [rel('a2')] }),
    );
    const turn = await runStepTurn(p, 'relations', [], provider);
    expect(calls).toHaveLength(2);
    expect(calls[1][calls[1].length - 1].content).toContain('a99');
    expect(turn.kind).toBe('proposal');
  });

  it('retries a relation from an actor to itself', async () => {
    const p = withFeature();
    p.actors = [{ id: 'a1', name: 'Părinți', type: 'user', power: 'low', stance: 'supports', excluded: false }];
    const self = { kind: 'relation', data: { id: 'r1', from: 'a1', to: 'a1', type: 'influences', note: '' } };
    const { provider, calls } = scripted(JSON.stringify({ kind: 'proposal', text: 'x', cards: [self] }), JSON.stringify({ kind: 'question', text: 'Cine altcineva?' }));
    await runStepTurn(p, 'relations', [], provider);
    expect(calls[1][calls[1].length - 1].content).toContain('același actor');
  });

  it('retries a precondition whose leadsTo is unknown, accepting refs to new cards in the batch', async () => {
    const pre = (leadsTo: string) => ({
      kind: 'precondition',
      data: { id: 'p2', text: 'x', actorId: 'a9', stage: 'start', leadsTo, coveredByApp: false, assumption: '', risky: false, test: '' },
    });
    const newActor = { kind: 'actor', data: { id: 'a9', name: 'Școala', type: 'institution', power: 'medium', stance: 'unknown', excluded: false } };
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [pre('zz'), newActor] }),
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [pre('p1'), newActor] }),
    );
    const turn = await runStepTurn(withFeature(), 'preconditions', [], provider);
    expect(calls).toHaveLength(2);
    expect(turn.kind).toBe('proposal');
    if (turn.kind !== 'question') expect(turn.cards).toHaveLength(2);
  });

  it('retries a role covered by someone not in the team', async () => {
    const role = { kind: 'role', data: { id: 'o1', name: 'Jurist', reason: 'x', reasonRefs: ['p1'], stage: 'mid', status: 'covered', coveredBy: 'm9' } };
    const { provider, calls } = scripted(JSON.stringify({ kind: 'proposal', text: 'x', cards: [role] }), 'not json');
    expect((await runStepTurn(withFeature(), 'roles', [], provider)).kind).toBe('fallback');
    expect(calls).toHaveLength(2);
  });

  it('retries a proposal that would push targetChanges over 3, but allows updates', async () => {
    const p = withFeature();
    p.targetChanges = [1, 2, 3].map((n) => ({ id: `t${n}`, text: 'x', signal: 'y' }));
    const tc = (id: string) => ({ kind: 'targetChange', data: { id, text: 'nou', signal: 's' } });
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [tc('t4')] }),
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [tc('t2')] }),
    );
    const turn = await runStepTurn(p, 'target', [], provider);
    expect(calls).toHaveLength(2);
    expect(calls[1][calls[1].length - 1].content).toContain('targetChange');
    expect(turn.kind).toBe('proposal');
  });

  it('drops a role with empty reasonRefs', async () => {
    const role = (id: string, reasonRefs: string[]) => ({
      kind: 'role',
      data: { id, name: 'Jurist', reason: 'Primăria trebuie convinsă', reasonRefs, stage: 'mid', status: 'seeking', coveredBy: null },
    });
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'Roluri', cards: [role('o1', []), role('o2', ['p1']), role('o3', ['x9'])] }),
    );
    const turn = await runStepTurn(withFeature(), 'roles', [], provider);
    expect(calls).toHaveLength(1);
    expect(turn.kind).toBe('proposal');
    if (turn.kind !== 'question') expect(turn.cards.map((c) => c.data.id)).toEqual(['o2']);
  });

  it('on risks, keeps only risky and test of an existing precondition', async () => {
    const { provider } = scripted(
      JSON.stringify({
        kind: 'proposal',
        text: 'Ipoteze',
        cards: [
          { kind: 'precondition', data: { id: 'p1', text: 'Alt text', risky: true, test: 'Sună la primărie' } },
          { kind: 'precondition', data: { id: 'p7', risky: true, test: 'x' } },
        ],
      }),
    );
    const turn = await runStepTurn(withFeature(), 'risks', [], provider);
    expect(turn.kind).toBe('proposal');
    if (turn.kind !== 'question') {
      expect(turn.cards).toHaveLength(1);
      expect(turn.cards[0].data).toMatchObject({ id: 'p1', text: 'Primăria publică datele', risky: true, test: 'Sună la primărie' });
    }
  });

  it('on risks, records who named a risk and accepts a new precondition the dev names', async () => {
    const fresh = {
      id: 'p9', text: 'Părinții află de hartă', actorId: null, stage: 'start', leadsTo: 'p1', coveredByApp: false,
      assumption: '', risky: true, test: 'Întreabă 10 părinți', riskBy: 'dev',
    };
    const { provider } = scripted(
      JSON.stringify({
        kind: 'proposal',
        text: 'Ipoteze',
        cards: [
          { kind: 'precondition', data: { id: 'p1', risky: true, test: 'Sună la primărie', riskBy: 'ai' } },
          { kind: 'precondition', data: fresh },
        ],
      }),
    );
    const turn = await runStepTurn(withFeature(), 'risks', [], provider);
    expect(turn.kind).toBe('proposal');
    if (turn.kind !== 'question') {
      expect(turn.cards.map((c) => c.data)).toMatchObject([{ id: 'p1', riskBy: 'ai' }, { text: 'Părinții află de hartă', riskBy: 'dev', leadsTo: 'p1' }]);
    }
  });
});

describe('project step completeness', () => {
  const info = { kind: 'projectInfo', data: { id: 'projectInfo', name: 'P', description: 'D', stage: 'idea', area: '', links: [], motivation: '', contact: '' } };
  const member = { kind: 'teamMember', data: { id: 'm1', name: 'tu', skills: ['cod'], hoursPerWeek: 4 } };
  const feature = { kind: 'feature', data: { id: 'f1', text: 'Hartă' } };
  const proposal = (...cards: unknown[]) => JSON.stringify({ kind: 'proposal', text: 'x', cards });

  it('does not force feature cards (the AI must not invent functions)', async () => {
    const { provider, calls } = scripted(proposal(info, member));
    expect((await runStepTurn(createEmptyProject('x'), 'project', [], provider)).kind).toBe('proposal');
    expect(calls).toHaveLength(1);
  });

  it('retries a proposal with no teamMember card while the team is empty', async () => {
    const { provider, calls } = scripted(proposal(info, feature), proposal(info, member, feature));
    const turn = await runStepTurn(createEmptyProject('x'), 'project', [], provider);
    expect(calls).toHaveLength(2);
    expect(calls[1][calls[1].length - 1].content).toContain('teamMember');
    expect(turn.kind).toBe('proposal');
  });

  it('accepts a proposal without features/team when the project already has them', async () => {
    const p = createEmptyProject('x');
    p.features = [{ id: 'f1', text: 'Hartă' }];
    p.team = [{ id: 'm1', name: 'tu', skills: [], hoursPerWeek: 4 }];
    const { provider, calls } = scripted(proposal(info));
    expect((await runStepTurn(p, 'project', [], provider)).kind).toBe('proposal');
    expect(calls).toHaveLength(1);
  });

  it('rejects a teamMember with an empty name', async () => {
    const blank = { kind: 'teamMember', data: { id: 'm1', name: '', skills: [], hoursPerWeek: 4 } };
    const { provider, calls } = scripted(proposal(info, blank, feature), proposal(info, blank, feature));
    expect((await runStepTurn(createEmptyProject('x'), 'project', [], provider)).kind).toBe('fallback');
    expect(calls).toHaveLength(2);
  });

  it('retries on a whitespace-only teamMember name', async () => {
    const blank = { kind: 'teamMember', data: { id: 'm1', name: '  ', skills: [], hoursPerWeek: 4 } };
    const { provider, calls } = scripted(proposal(info, blank), proposal(info, member));
    expect((await runStepTurn(createEmptyProject('x'), 'project', [], provider)).kind).toBe('proposal');
    expect(calls).toHaveLength(2);
    expect(calls[1][calls[1].length - 1].content).toContain('teamMember');
  });

  it('ProjectSchema still accepts a stored draft with an empty team member name', () => {
    const p = createEmptyProject('x');
    p.team = [{ id: 'm1', name: '', skills: [], hoursPerWeek: 0 }];
    expect(ProjectSchema.safeParse(p).success).toBe(true);
  });
});

describe('precondition actorId', () => {
  it('accepts a team member id as actorId', async () => {
    const p = withFeature();
    p.team = [{ id: 'm1', name: 'Irina', skills: [], hoursPerWeek: 4 }];
    const card = { kind: 'precondition', data: { id: 'p2', text: 'Irina scrie', actorId: 'm1', stage: 'start', leadsTo: 'p1', coveredByApp: false, assumption: '', risky: false, test: '' } };
    const { provider, calls } = scripted(JSON.stringify({ kind: 'proposal', text: 'x', cards: [card] }));
    const turn = await runStepTurn(p, 'preconditions', [], provider);
    expect(turn.kind).toBe('proposal');
    expect(calls).toHaveLength(1);
  });

  it('still rejects an unknown actorId', async () => {
    const card = { kind: 'precondition', data: { id: 'p2', text: 'x', actorId: 'zzz', stage: 'start', leadsTo: 'p1', coveredByApp: false, assumption: '', risky: false, test: '' } };
    const { provider } = scripted(JSON.stringify({ kind: 'proposal', text: 'x', cards: [card] }), 'nope');
    expect((await runStepTurn(withFeature(), 'preconditions', [], provider)).kind).toBe('fallback');
  });
});

describe('tolerant JSON parsing', () => {
  it('extracts the first top-level object from surrounding text', async () => {
    const obj = JSON.stringify({ kind: 'question', text: 'Ce {faci}?' });
    const { provider, calls } = scripted(`Sigur! Iată răspunsul:
\`\`\`json
${obj}
\`\`\`
Sper că ajută.`);
    const turn = await runStepTurn(createEmptyProject('x'), 'problem', [], provider);
    expect(turn).toEqual({ kind: 'question', text: 'Ce {faci}?' });
    expect(calls).toHaveLength(1);
  });

  it('still fails when there is no object at all', async () => {
    const { provider, calls } = scripted('doar text', '{ stricat');
    expect((await runStepTurn(createEmptyProject('x'), 'problem', [], provider)).kind).toBe('fallback');
    expect(calls).toHaveLength(2);
  });
});

describe('backlog context', () => {
  it('lists the project features with their ids', () => {
    const msgs = buildMessages(withFeature(), 'backlog', []);
    const ctx = msgs[1].content;
    expect(ctx).toContain('"id":"f1"');
    expect(ctx).toContain('Hartă cu parcuri');
  });
});

describe('FakeProvider default', () => {
  it('proposes valid cards on every step', async () => {
    const p = withFeature();
    p.actors = [
      { id: 'a1', name: 'Părinți', type: 'user', power: 'low', stance: 'supports', excluded: false },
      { id: 'a2', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false },
    ];
    p.targetChanges = [{ id: 't1', text: 'x', signal: 'y' }];
    for (const step of StepIdSchema.options) {
      const turn = await runStepTurn(p, step, [], new FakeProvider());
      expect(turn.kind, step).toBe('proposal');
      if (turn.kind !== 'question') expect(turn.cards.length, step).toBeGreaterThan(0);
    }
  });

  it('asks a question on backlog when there are no features', async () => {
    const turn = await runStepTurn(createEmptyProject('x'), 'backlog', [], new FakeProvider());
    expect(turn.kind).toBe('question');
  });
});

describe('buildMessages', () => {
  it('on actors, omits the problem chat but includes problem.statement', () => {
    const p = createEmptyProject('Parcul');
    p.problem.statement = 'Copiii nu au unde să se joace.';
    p.steps.problem.messages = [{ role: 'user', content: 'MESAJ-SECRET-DIN-PASUL-2' }];
    const msgs = buildMessages(p, 'actors', [{ role: 'user', content: 'Primăria decide.' }]);
    const all = msgs.map((m) => m.content).join('\n');
    expect(all).not.toContain('MESAJ-SECRET-DIN-PASUL-2');
    expect(all).toContain('Copiii nu au unde să se joace.');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('PAS: actors');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'Primăria decide.' });
  });

  it('adds the role rules only on the roles step', () => {
    const p = createEmptyProject('x');
    const rule = 'Jurist GDPR / acces la informații';
    expect(buildMessages(p, 'roles', [])[0].content).toContain(rule);
    expect(buildMessages(p, 'actors', [])[0].content).not.toContain(rule);
  });
});

describe('summarizeProject', () => {
  it('returns at most 3 lines', async () => {
    const { provider } = scripted(JSON.stringify({ text: 'unu\ndoi\ntrei\npatru' }));
    expect(await summarizeProject(createEmptyProject('x'), provider)).toBe('unu\ndoi\ntrei');
  });

  it('returns an empty string on provider error or bad JSON', async () => {
    expect(await summarizeProject(createEmptyProject('x'), scripted().provider)).toBe('');
    expect(await summarizeProject(createEmptyProject('x'), scripted('nope').provider)).toBe('');
  });
});

describe('runStepTurn: nothing cards and ids in text', () => {
  const existingCard = (name: string) => ({
    kind: 'existing',
    data: { id: 'e1', name, url: null, difference: '' },
  });

  it.each(['Nu există', 'nu exista.', 'Nimic', 'Niciuna', 'None'])('retries an existing card named "%s"', async (name) => {
    const good = { kind: 'proposal', text: 'Ok', cards: [existingCard('Civic Tech Field Guide')] };
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [existingCard(name)] }),
      JSON.stringify(good),
    );
    const turn = await runStepTurn(createEmptyProject('x'), 'existing', [], provider);
    expect(calls).toHaveLength(2);
    expect(calls[1][calls[1].length - 1].content).toContain('Nu am găsit nimic similar');
    expect(turn.kind).toBe('proposal');
  });

  it('keeps a real initiative whose name merely contains "nimic"', async () => {
    const { provider, calls } = scripted(
      JSON.stringify({ kind: 'proposal', text: 'x', cards: [existingCard('Nimic fără noi')] }),
    );
    const turn = await runStepTurn(createEmptyProject('x'), 'existing', [], provider);
    expect(calls).toHaveLength(1);
    expect(turn.kind).toBe('proposal');
  });

  it('replaces ids with names in the human text of proposed cards, but not in id/reference fields', async () => {
    const p = withFeature();
    p.actors = [{ id: 'a4', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false }];
    const role = {
      kind: 'role',
      data: { id: 'o1', name: 'Jurist', reason: 'p1 spune că a4 decide (a4)', reasonRefs: ['p1', 'a4'], stage: 'mid', status: 'seeking', coveredBy: null },
    };
    const { provider } = scripted(JSON.stringify({ kind: 'proposal', text: 'Pentru a4 propun un rol.', cards: [role] }));
    const turn = await runStepTurn(p, 'roles', [], provider);
    if (turn.kind !== 'proposal') throw new Error('expected a proposal');
    expect(turn.text).toBe('Pentru Primăria propun un rol.');
    expect(turn.cards[0].data.reason).toBe('«Primăria publică datele» spune că Primăria decide (Primăria)');
    expect(turn.cards[0].data.reasonRefs).toEqual(['p1', 'a4']);
  });

  it('names project actors in a relation note', async () => {
    const cards = [
      { kind: 'actor', data: { id: 'a7', name: 'Ziarul Local', type: 'media', power: 'low', stance: 'unknown', excluded: false } },
      { kind: 'actor', data: { id: 'a8', name: 'Cititorii', type: 'user', power: 'low', stance: 'supports', excluded: false } },
    ];
    const rel = { kind: 'relation', data: { id: 'r1', from: 'a7', to: 'a8', type: 'influences', note: 'a7 scrie pentru a8' } };
    const p = createEmptyProject('x');
    p.actors = cards.map((c) => c.data) as Project['actors'];
    const { provider } = scripted(JSON.stringify({ kind: 'proposal', text: 'x', cards: [rel] }));
    const turn = await runStepTurn(p, 'relations', [], provider);
    if (turn.kind !== 'proposal') throw new Error('expected a proposal');
    expect(turn.cards.find((c) => c.kind === 'relation')!.data.note).toBe('Ziarul Local scrie pentru Cititorii');
  });
});
