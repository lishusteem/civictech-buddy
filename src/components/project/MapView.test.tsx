// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project } from '@/lib/project/schema';
import { MapView } from './MapView';

afterEach(cleanup);

type Pre = Project['preconditions'][number];
const pre = (id: string, over: Partial<Pre>): Pre => ({
  id, text: id, actorId: null, stage: 'start', leadsTo: 't1', coveredByApp: false, assumption: '', risky: false, test: '', ...over,
});

function project(): Project {
  const p = createEmptyProject('Implicare Civica');
  p.project.stage = 'live';
  p.project.description = '- Platformă pentru cereri pe Legea 544.';
  p.problem.statement = '- Oamenii nu știu cui să scrie.';
  p.direction = 'Cetățenii au informațiile de care au nevoie.';
  p.targetChanges = [
    { id: 't1', text: 'Instituțiile răspund în 30 de zile', signal: '90% la termen' },
    { id: 't2', text: 'Răspunsurile sunt complete', signal: '' },
  ];
  p.actors = [{ id: 'a1', name: 'Jurnaliștii', type: 'media', power: 'medium', stance: 'supports', excluded: false, note: 'Scriu despre instituții.' }];
  p.preconditions = [
    pre('o1', { text: 'Clasament lunar public', level: 'output', leadsTo: 'p1', signal: '12 pe an', assumption: 'Presa caută date' }),
    pre('p1', { text: 'Scriu despre restanțieri', actorId: 'a1', level: 'outcome', risky: true, test: 'Întreb 5 jurnaliști.' }),
    pre('x1', { text: 'Marcaj „incomplet”', level: 'output', leadsTo: 't2' }),
  ];
  p.backlog = [{ id: 'b1', stage: 'start', kind: 'organizing', featureId: null, preconditionId: 'o1', text: 'Trimite clasamentul la 20 de redacții', order: 1 }];
  return p;
}

const map = () => screen.getByRole('group', { name: 'Harta' });
const detail = () => within(screen.getByRole('region', { name: 'Detalii despre pasul ales' }));

describe('MapView — variant B', () => {
  it('shows the summary on the side and the first long-term outcome’s pathway in the four bands', () => {
    render(<MapView project={project()} publishedAt={null} storyHref="/p/x" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Implicare Civica' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Problema și soluția, pe larg →' }).getAttribute('href')).toBe('/p/x');
    const m = within(map());
    expect(m.getByText('Trimite clasamentul la 20 de redacții')).toBeTruthy();
    expect(m.getByText('Clasament lunar public')).toBeTruthy();
    expect(m.getByText('Scriu despre restanțieri')).toBeTruthy();
    expect(m.queryByText('Marcaj „incomplet”')).toBeNull();
    expect(m.getByText('Cetățenii au informațiile de care au nevoie.')).toBeTruthy();
  });

  it('switches the pathway, and „Tot” shows every step', () => {
    render(<MapView project={project()} publishedAt={null} storyHref="/p/x" />);
    fireEvent.click(screen.getByRole('button', { name: 'Răspunsurile sunt complete' }));
    expect(within(map()).getByText('Marcaj „incomplet”')).toBeTruthy();
    expect(within(map()).queryByText('Clasament lunar public')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tot' }));
    expect(within(map()).getByText('Clasament lunar public')).toBeTruthy();
    expect(within(map()).getByText('Marcaj „incomplet”')).toBeTruthy();
  });

  it('opens a step’s indicator, assumption and test on click', () => {
    render(<MapView project={project()} publishedAt={null} storyHref="/p/x" />);
    fireEvent.click(within(map()).getByRole('button', { name: /Clasament lunar public/ }));
    expect(detail().getByText('Indicator: 12 pe an')).toBeTruthy();
    expect(detail().getByText('De ce duce mai departe (ipoteză): Presa caută date')).toBeTruthy();
    fireEvent.click(within(map()).getByRole('button', { name: /Scriu despre restanțieri/ }));
    expect(detail().getByText(/Test: Întreb 5 jurnaliști\./)).toBeTruthy();
  });

  it('tells the pathway as one sentence and keeps the actors, the unknowns and the roles below', () => {
    render(<MapView project={project()} publishedAt={null} storyHref="/p/x" />);
    expect(screen.getByText(/Pornim de la:/).closest('p')!.textContent).toContain('astfel încât instituțiile răspund în 30 de zile');
    expect(screen.getByRole('region', { name: 'Cine contează' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Ce încă nu știm' })).toBeTruthy();
  });
});
