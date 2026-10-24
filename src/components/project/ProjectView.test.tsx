// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project } from '@/lib/project/schema';
import { ProjectView } from './ProjectView';

afterEach(cleanup);

const T = '2026-10-21T10:00:00.000Z';

type Role = Project['roles'][number];
type Item = Project['backlog'][number];
type Pre = Project['preconditions'][number];

const role = (id: string, over: Partial<Role> = {}): Role => ({
  id,
  name: `Rol ${id}`,
  reason: `motiv ${id}`,
  reasonRefs: [],
  stage: 'start',
  status: 'seeking',
  coveredBy: null,
  ...over,
});
const item = (id: string, order: number, over: Partial<Item> = {}): Item => ({
  id,
  stage: 'start',
  kind: 'organizing',
  featureId: null,
  preconditionId: null,
  text: `Pas ${id}`,
  order,
  ...over,
});
const pre = (id: string, over: Partial<Pre> = {}): Pre => ({
  id,
  text: `Precondiție ${id}`,
  actorId: null,
  stage: 'start',
  leadsTo: 't1',
  coveredByApp: false,
  assumption: '',
  risky: false,
  test: '',
  ...over,
});

/** A project like the owner's: everything filled, with the data that caused the bugs in §9.3. */
function fullProject(): Project {
  const p = createEmptyProject('Sesizări pentru asociații');
  p.project.description = 'Asociațiile raportează problemele blocului într-un singur loc. Mai multe detalii aici.';
  p.project.stage = 'prototype';
  p.project.area = 'București';
  p.project.links = ['https://github.com/ana/sesizari'];
  p.project.contact = 'https://discord.gg/abc';
  p.team = [
    { id: 'm1', name: 'Ana', skills: ['frontend', 'design'], hoursPerWeek: 5 },
    { id: 'm2', name: 'tu', skills: ['backend'], hoursPerWeek: 2 },
  ];
  p.problem.statement = 'Asociațiile sună la primărie și nu află ce s-a întâmplat. Și altele.';
  p.direction = 'Blocuri întreținute fără cozi.';
  p.targetChanges = [{ id: 't1', text: 'Primăria răspunde public în 30 de zile', signal: 'răspunsurile apar pe site' }];
  p.actors = [
    { id: 'a1', name: 'Instituțiile publice', type: 'institution', power: 'high', stance: 'neutral', excluded: false },
    { id: 'a2', name: 'Cetățenii', type: 'user', power: 'low', stance: 'neutral', excluded: true },
  ];
  p.relations = [{ id: 'r1', from: 'a1', to: 'a2', type: 'holds_data', note: 'Primăria are registrul sesizărilor.' }];
  p.preconditions = [
    pre('p1', { text: '10 asociații raportează prin platformă', actorId: 'a2' }),
    pre('p2', { text: 'Direcția tehnică acceptă sesizările', actorId: 'a1', stage: 'mid', risky: true, assumption: 'Primăria acceptă sesizări din afara registraturii', test: 'O întâlnire cu direcția tehnică.' }),
    pre('p3', { text: 'Ceva riscant fără test', risky: true }),
  ];
  p.roles = [
    role('o1', { name: 'Jurist', reason: 'primăria trebuie să adopte o procedură', reasonRefs: ['p2'] }),
    role('o2', { name: 'ONG partener', status: 'partner', stage: 'mid', reason: 'au relația cu blocurile' }),
    role('o3', { name: 'Dezvoltator', status: 'covered', coveredBy: 'm1' }),
  ];
  p.backlog = [
    ...Array.from({ length: 6 }, (_, i) => item(`b${i + 1}`, i + 1, { kind: i === 0 ? 'test' : i === 1 ? 'feature' : 'organizing' })),
    item('m1x', 1, { stage: 'mid', text: 'Pas mediu' }),
    item('first', 0, { stage: 'mid', kind: 'organizing', preconditionId: 'p2', text: 'Discuție de 30 min cu un jurist' }),
  ];
  p.existing = [
    { id: 'e1', name: 'Platforma X', url: 'https://x.ro', difference: 'e pentru tot orașul' },
    { id: 'e2', name: 'Nimic similar găsit', url: null, difference: 'Dev-ul a căutat și n-a găsit inițiative similare.' },
  ];
  p.toFindOut = [{ id: 'q1', step: 'problem', text: 'Câte asociații folosesc email?' }];
  p.alerts = [{ code: 'build_and_they_come', step: 7, refs: [], status: 'dismissed', message: 'Cum află primii 50 de oameni?' }];
  return p;
}

const text = () => document.body.textContent ?? '';
const hero = () => document.querySelector('header')!;

describe('ProjectView — public page (§9)', () => {
  it('shows the meta line with the team, the h1 and the three-line summary', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    expect(screen.getByText(/Proiect civic tech/)).toBeTruthy();
    expect(screen.getByText(/2 oameni, ~7 ore\/săpt\./)).toBeTruthy();
    expect(screen.getByText('Actualizat 21 oct 2026')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Sesizări pentru asociații' })).toBeTruthy();
    const summary = within(hero());
    expect(summary.getByText('Problema')).toBeTruthy();
    expect(summary.getByText('Ce facem')).toBeTruthy();
    expect(summary.getByText('Ținta')).toBeTruthy();
    expect(summary.getByText('Primăria răspunde public în 30 de zile')).toBeTruthy();
  });

  it('has the hero CTAs: help anchor, contact button, code link by host', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const top = hero();
    expect(within(top).getByRole('link', { name: 'Vreau să ajut ↓' }).getAttribute('href')).toBe('#cum-poti-ajuta');
    expect(within(top).getByRole('link', { name: 'Intră pe Discord' }).getAttribute('href')).toBe('https://discord.gg/abc');
    expect(within(top).getByRole('link', { name: 'Codul pe GitHub ↗' }).getAttribute('href')).toBe('https://github.com/ana/sesizari');
  });

  it('shows the whole problem with a concrete case, and the solution with what works and what comes next', () => {
    const p = fullProject();
    p.problem.example = 'O asociație din Titan a sunat de 5 ori pentru același acoperiș.';
    p.project.traction = '40 de sesizări trimise.';
    p.features = [{ id: 'f1', text: 'Trimite sesizarea direct la primărie', done: true }, { id: 'f2', text: 'Hartă publică' }];
    render(<ProjectView project={p} publishedAt={T} />);
    const problem = screen.getByRole('region', { name: 'Problema' });
    expect(within(problem).getByText('Asociațiile sună la primărie și nu află ce s-a întâmplat. Și altele.')).toBeTruthy();
    expect(within(problem).getByText('O asociație din Titan a sunat de 5 ori pentru același acoperiș.')).toBeTruthy();
    const solution = screen.getByRole('region', { name: 'Soluția' });
    expect(within(solution).getByText('Merge deja')).toBeTruthy();
    expect(within(solution).getByText('Trimite sesizarea direct la primărie')).toBeTruthy();
    expect(within(solution).getByText('Urmează')).toBeTruthy();
    expect(within(solution).getByText('Hartă publică')).toBeTruthy();
    expect(within(solution).getByText(/40 de sesizări trimise/)).toBeTruthy();
  });

  it('shows seeking and partner roles as cards without the word „Caut”', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const help = screen.getByRole('region', { name: 'Cum poți ajuta' });
    expect(help.id).toBe('cum-poti-ajuta');
    expect(within(help).getByRole('heading', { level: 3, name: 'Jurist' })).toBeTruthy();
    expect(within(help).getByRole('heading', { level: 3, name: 'ONG partener' })).toBeTruthy();
    expect(within(help).queryByText('Dezvoltator')).toBeNull();
    expect(within(help).getByText('Acum')).toBeTruthy();
    expect(within(help).getByText('În 3–12 luni')).toBeTruthy();
    expect(within(help).getByText('Căutăm o organizație parteneră')).toBeTruthy();
    expect(within(help).getByText('Discuție de 30 min cu un jurist')).toBeTruthy();
    expect(within(help).getByText(/Nu te regăsești\? Scrie-ne oricum\./)).toBeTruthy();
    expect(help.textContent).not.toMatch(/\bCaut\b|Partener\b/);
  });

  it('hides „Cum poți ajuta” and the help CTA when no role is sought', () => {
    const p = fullProject();
    p.roles = [role('o3', { status: 'covered' })];
    render(<ProjectView project={p} publishedAt={T} />);
    expect(screen.queryByRole('region', { name: 'Cum poți ajuta' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Vreau să ajut ↓' })).toBeNull();
    expect(within(hero()).getByRole('link', { name: 'Intră pe Discord' })).toBeTruthy();
  });

  it('shows at most 5 next steps, then the whole plan in a <details>', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const next = screen.getByRole('region', { name: 'Următorii pași' });
    const top = within(next).getAllByRole('listitem').filter((li) => li.closest('details') === null);
    expect(top).toHaveLength(5);
    expect(top[0].textContent).toContain('Test');
    expect(top[0].textContent).toContain('Pas b1');
    expect(top[1].textContent).toContain('Cod');
    expect(top[2].textContent).toContain('Organizare');
    expect(within(next).getByText('Tot planul de lucru (8)')).toBeTruthy();
    expect(next.querySelector('details')!.textContent).toContain('Pas mediu');
  });

  it('leaves functions that already work out of the next steps and marks them in the whole plan', () => {
    const p = fullProject();
    p.features = [{ id: 'f1', text: 'Harta sesizărilor', done: true }];
    p.backlog = p.backlog.map((b) => (b.id === 'b2' ? { ...b, featureId: 'f1', text: 'Harta sesizărilor' } : b));
    render(<ProjectView project={p} publishedAt={T} />);
    const next = screen.getByRole('region', { name: 'Următorii pași' });
    const top = within(next).getAllByRole('listitem').filter((li) => li.closest('details') === null);
    expect(top.map((li) => li.textContent).join('|')).not.toContain('Harta sesizărilor');
    const working = within(next.querySelector('details')!).getByText('Harta sesizărilor').closest('li')!;
    expect(working.textContent).toContain('Funcționează');
  });

  it('relinks a published function item that points at itself, so a live function still counts as working', () => {
    const p = fullProject();
    p.project.stage = 'live';
    p.features = [{ id: 'f1', text: 'Harta sesizărilor' }];
    p.backlog = p.backlog.map((b) => (b.id === 'b2' ? { ...b, featureId: 'b2', text: 'Harta sesizărilor' } : b));
    render(<ProjectView project={p} publishedAt={T} />);
    const next = screen.getByRole('region', { name: 'Următorii pași' });
    const top = within(next).getAllByRole('listitem').filter((li) => li.closest('details') === null);
    expect(top.map((li) => li.textContent).join('|')).not.toContain('Harta sesizărilor');
  });

  it('shows the long-term outcomes and tells the first pathway top to bottom, with the map one click away', () => {
    const p = fullProject();
    p.preconditions = [
      pre('o1', { text: 'Raport lunar cu sesizările nerezolvate', level: 'output', leadsTo: 'p1' }),
      pre('p1', { text: 'Asociațiile citesc raportul', actorId: 'a2', leadsTo: 'p2', assumption: 'Raportul e ușor de citit' }),
      pre('p2', { text: 'Direcția tehnică răspunde mai repede', actorId: 'a1', stage: 'mid', risky: true, test: 'x' }),
    ];
    render(<ProjectView project={p} publishedAt={T} mapHref="/p/x?v=harta" />);
    const change = screen.getByRole('region', { name: 'Rezultatele pe care le urmărim' });
    expect(within(change).getByText('Indicator: răspunsurile apar pe site')).toBeTruthy();
    const t = change.textContent!;
    expect(t.indexOf('Raport lunar')).toBeLessThan(t.indexOf('Asociațiile citesc'));
    expect(t.indexOf('Asociațiile citesc')).toBeLessThan(t.indexOf('Direcția tehnică răspunde'));
    expect(t).toContain('Output · Realizare');
    expect(t).toContain('pentru că raportul e ușor de citit');
    expect(t).toContain('Impact pe termen lung');
    expect(within(change).getByRole('link', { name: 'Vezi toată harta schimbării →' }).getAttribute('href')).toBe('/p/x?v=harta');
  });



  it('lists risky assumptions with their test, or the „încă de stabilit” line', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const risks = screen.getByRole('region', { name: 'Ce încă nu știm' });
    expect(within(risks).getByText(/Primăria acceptă sesizări din afara registraturii/)).toBeTruthy();
    expect(within(risks).getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Test: O întâlnire cu direcția tehnică.')).toBeTruthy();
    expect(within(risks).getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Test: încă de stabilit — idei binevenite.')).toBeTruthy();
  });

  it('leaves the actors to the map variant', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    expect(screen.queryByRole('region', { name: 'Cine contează' })).toBeNull();
  });

  it('never shows „tu” in the team; shows hours, covered roles and the total', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const team = screen.getByRole('region', { name: 'Echipa' });
    expect(team.textContent).toContain('Ana — frontend, design · 5 h/săpt. · acoperă: Dezvoltator');
    expect(team.textContent).toContain('Inițiatorul proiectului — backend · 2 h/săpt.');
    expect(within(team).getByText('În total ~7 ore pe săptămână.')).toBeTruthy();
    expect(text()).not.toMatch(/\btu\b/);
  });

  it('collapses „Ce există deja” and hides the auto-generated „Nimic similar găsit” card', () => {
    const p = fullProject();
    render(<ProjectView project={p} publishedAt={T} />);
    expect(screen.getByText('Ce există deja (1)').closest('details')).toBeTruthy();
    expect(screen.queryByText(/Nimic similar găsit/)).toBeNull();
    cleanup();
    p.existing = [p.existing[1]];
    render(<ProjectView project={p} publishedAt={T} />);
    expect(screen.getByText('Nu am găsit inițiative asemănătoare. Știi una? Spune-ne.')).toBeTruthy();
  });

  it('lists open questions in a collapsed <details> with the intro', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const summary = screen.getByText('Întrebări la care ne poți ajuta (2)');
    const details = summary.closest('details')!;
    expect(details.id).toBe('intrebari');
    expect(within(details).getByText('Lucruri pe care încă nu le știm. Dacă ai un răspuns, scrie-ne.')).toBeTruthy();
    expect(within(details).getByText('Cum află primii 50 de oameni?')).toBeTruthy();
    expect(within(details).getByText('Câte asociații folosesc email?')).toBeTruthy();
  });

  it('ends with the footer CTA and the date', () => {
    render(<ProjectView project={fullProject()} publishedAt={T} />);
    const footer = document.querySelector('footer')!;
    expect(within(footer).getByText('Vrei să ajuți?')).toBeTruthy();
    expect(within(footer).getByRole('link', { name: 'Intră pe Discord' })).toBeTruthy();
    expect(within(footer).getByText('Pagină făcută cu Ghidul de pornire · actualizată 21 oct 2026')).toBeTruthy();
  });

  it('with an email contact shows „Scrie-ne” (mailto); with plain text shows „Contact:”', () => {
    const p = fullProject();
    p.project.contact = 'ana@exemplu.ro';
    render(<ProjectView project={p} publishedAt={T} />);
    expect(within(hero()).getByRole('link', { name: 'Scrie-ne' }).getAttribute('href')).toBe('mailto:ana@exemplu.ro');
    cleanup();
    p.project.contact = 'Telegram @ana';
    render(<ProjectView project={p} publishedAt={T} />);
    expect(within(hero()).getByText('Telegram @ana')).toBeTruthy();
    expect(within(hero()).getByText('Contact:')).toBeTruthy();
  });

  it('hides empty sections on the public page and never says „Nimic adăugat încă.”', () => {
    render(<ProjectView project={createEmptyProject('Gol')} publishedAt={T} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Gol' })).toBeTruthy();
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    expect(text()).not.toContain('Nimic adăugat încă.');
    expect(text()).not.toContain('nu apare public');
    expect(screen.queryByText('Vrei să ajuți?')).toBeNull();
  });

  it('in the owner preview shows empty sections as dashed placeholders „(nu apare public)”', () => {
    render(<ProjectView project={createEmptyProject('Gol')} publishedAt={null} preview />);
    expect(screen.getAllByText(/\(nu apare public\)/).length).toBeGreaterThan(3);
    expect(screen.getByText(/Cum poți ajuta: Nimic adăugat încă\./)).toBeTruthy();
  });

  it('renders a name with <script> as text, not as an element', () => {
    const p = createEmptyProject('<script>alert(1)</script>');
    const { container } = render(<ProjectView project={p} publishedAt={null} />);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getAllByText('<script>alert(1)</script>').length).toBeGreaterThan(0);
  });

  it('does not render unsafe link schemes as links', () => {
    const p = createEmptyProject('P');
    p.project.links = ['javascript:alert(1)', 'https://exemplu.ro'];
    p.project.contact = 'javascript:alert(2)';
    render(<ProjectView project={p} publishedAt={null} />);
    const hrefs = screen.queryAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://exemplu.ro');
    expect(hrefs.some((h) => h?.startsWith('javascript'))).toBe(false);
  });

  it('never shows internal ids in the human text (safety net)', () => {
    const p = createEmptyProject('P');
    p.actors = [{ id: 'a4', name: 'Primăria', type: 'institution', power: 'high', stance: 'neutral', excluded: false }];
    p.roles = [role('o1', { name: 'Jurist', reason: 'a4 decide și (a4) contează', reasonRefs: ['a4'] })];
    p.existing = [{ id: 'e1', name: 'Alt proiect', url: null, difference: 'Spre deosebire de a4' }];
    p.relations = [{ id: 'r1', from: 'a4', to: 'a4', type: 'decides', note: 'a4 aprobă' }];
    render(<ProjectView project={p} publishedAt={null} />);
    expect(screen.getByText(/Primăria decide și \(Primăria\) contează/)).toBeTruthy();
    expect(screen.getByText(/Spre deosebire de Primăria/)).toBeTruthy();
    expect(text()).not.toMatch(/\b(a4|o1|e1|r1)\b/);
  });
});
