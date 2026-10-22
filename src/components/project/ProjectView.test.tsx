// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import { ProjectView, firstSentence } from './ProjectView';

afterEach(cleanup);

describe('firstSentence', () => {
  it('cuts at the first . ! or ? followed by space or end', () => {
    expect(firstSentence('Prima. A doua.')).toBe('Prima.');
    expect(firstSentence('Oare? Da.')).toBe('Oare?');
    expect(firstSentence('Versiunea 2.5 e gata. Mai e ceva.')).toBe('Versiunea 2.5 e gata.');
    expect(firstSentence('Fără punct')).toBe('Fără punct');
    expect(firstSentence('')).toBe('');
  });
});

describe('ProjectView', () => {
  it('shows only seeking/partner roles in the business card', () => {
    const p = createEmptyProject('Proiect');
    p.roles = [
      { id: 'r1', name: 'Jurist', reason: 'x', reasonRefs: [], stage: 'start', status: 'seeking', coveredBy: null },
      { id: 'r2', name: 'Designer', reason: 'y', reasonRefs: [], stage: 'mid', status: 'covered', coveredBy: 'Ana' },
    ];
    render(<ProjectView project={p} publishedAt="2026-10-21T10:00:00.000Z" />);
    const card = screen.getByLabelText('Cartea de vizită');
    expect(within(card).getByText(/Jurist/)).toBeTruthy();
    expect(within(card).queryByText(/Designer/)).toBeNull();
  });

  it('renders a name with <script> as text, not as an element', () => {
    const p = createEmptyProject('<script>alert(1)</script>');
    const { container } = render(<ProjectView project={p} publishedAt={null} />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getAllByText('<script>alert(1)</script>').length).toBeGreaterThan(0);
  });

  it('shows the first sentence of the problem, the first target change and the date', () => {
    const p = createEmptyProject('P');
    p.problem.statement = 'Oamenii nu pot raporta gropile. Nimeni nu răspunde.';
    p.targetChanges = [{ id: 't1', text: 'Gropile se repară în 30 de zile', signal: 's' }];
    render(<ProjectView project={p} publishedAt="2026-10-21T10:00:00.000Z" />);
    const card = screen.getByLabelText('Cartea de vizită');
    expect(within(card).getByText('Oamenii nu pot raporta gropile.')).toBeTruthy();
    expect(within(card).getByText('Gropile se repară în 30 de zile')).toBeTruthy();
    expect(screen.getByText(/^Actualizat la .*2026/)).toBeTruthy();
  });

  it('does not render unsafe link schemes as links', () => {
    const p = createEmptyProject('P');
    p.project.links = ['javascript:alert(1)', 'https://exemplu.ro'];
    render(<ProjectView project={p} publishedAt={null} />);
    const hrefs = screen.queryAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://exemplu.ro');
    expect(hrefs.some((h) => h?.startsWith('javascript'))).toBe(false);
  });

  it('never shows internal ids in the human text (safety net)', () => {
    const p = createEmptyProject('P');
    p.actors = [{ id: 'a4', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false }];
    p.roles = [{ id: 'o1', name: 'Jurist', reason: 'a4 decide și (a4) contează', reasonRefs: ['a4'], stage: 'start', status: 'seeking', coveredBy: null }];
    p.existing = [{ id: 'e1', name: 'Alt proiect', url: null, difference: 'Spre deosebire de a4' }];
    render(<ProjectView project={p} publishedAt={null} />);
    expect(screen.getByText('Primăria decide și (Primăria) contează')).toBeTruthy();
    expect(screen.getByText(/Spre deosebire de Primăria/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\ba4\b/);
  });

  it('lists backlog start before mid and open points', () => {
    const p = createEmptyProject('P');
    p.backlog = [
      { id: 'b1', stage: 'mid', kind: 'organizing', featureId: null, preconditionId: null, text: 'Pas mid', order: 1 },
      { id: 'b2', stage: 'start', kind: 'organizing', featureId: null, preconditionId: null, text: 'Pas start', order: 2 },
    ];
    p.toFindOut = [{ id: 'q1', step: 'problem', text: 'Câți oameni?' }];
    render(<ProjectView project={p} publishedAt={null} />);
    const html = document.body.textContent!;
    expect(html.indexOf('Pas start')).toBeLessThan(html.indexOf('Pas mid'));
    expect(screen.getByRole('heading', { name: 'Puncte deschise' })).toBeTruthy();
    expect(screen.getByText('Câți oameni?')).toBeTruthy();
  });
});
