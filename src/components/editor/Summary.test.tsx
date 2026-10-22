// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project } from '@/lib/project/schema';
import { Summary } from './Summary';

afterEach(cleanup);

function project(): Project {
  const p = createEmptyProject('Proiect');
  p.problem.statement = 'Oamenii nu pot raporta. Rest.';
  p.team = [
    { id: 'm1', name: 'Ana', skills: [], hoursPerWeek: 3 },
    { id: 'm2', name: 'tu', skills: [], hoursPerWeek: 2 },
  ];
  p.roles = [{ id: 'o1', name: 'Jurist', reason: 'x', reasonRefs: [], stage: 'start', status: 'seeking', coveredBy: null }];
  p.alerts = [{ code: 'magic_leap', step: 7, refs: [], status: 'dismissed', message: 'Ce lipsește între pași?' }];
  p.toFindOut = [{ id: 'q1', step: 'problem', text: 'Câți oameni?' }];
  return p;
}

/** Summary wired to real state, as the Editor does it. */
function Harness({ initial, published = false, onPublish = () => {} }: { initial: Project; published?: boolean; onPublish?: () => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <>
      <Summary draft={draft} setDraft={setDraft} published={published} publishing={false} disabled={false} error={false} onPublish={onPublish} />
      <output data-testid="contact">{draft.project.contact}</output>
      <output data-testid="names">{draft.team.map((m) => m.name).join(',')}</output>
    </>
  );
}

const check = () => screen.getByRole('region', { name: 'Înainte să publici' });
const row = (text: RegExp) => within(check()).getByText(text).closest('li')!;

describe('Summary — pre-publish check (§8.1)', () => {
  it('shows the intro and the check above a single primary button and the preview', () => {
    render(<Harness initial={project()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Rezumat' })).toBeTruthy();
    expect(screen.getByText('Așa va vedea grupul pagina. Verifică întâi:')).toBeTruthy();
    expect(screen.getByText('Previzualizare')).toBeTruthy();
    const html = document.body.innerHTML;
    expect(html.indexOf('Înainte să publici')).toBeLessThan(html.indexOf('Publică pagina'));
    expect(html.indexOf('Publică pagina')).toBeLessThan(html.indexOf('Previzualizare'));
  });

  it('marks the rows saved (✓) or missing (○)', () => {
    render(<Harness initial={project()} />);
    expect(row(/O propoziție despre proiect \(apare sus\)/).textContent).toContain('✓');
    expect(row(/Un contact pentru cine vrea să ajute/).textContent).toContain('○');
    expect(row(/Nume reale în echipă \(acum: „tu”\)/).textContent).toContain('○');
    expect(row(/Cel puțin un rol căutat/).textContent).toContain('✓');
    expect(row(/2 întrebări deschise vor apărea public/)).toBeTruthy();
  });

  it('saves the contact inline, with the placeholder and the public warning', () => {
    render(<Harness initial={project()} />);
    fireEvent.click(within(row(/Un contact/)).getByRole('button', { name: 'Adaugă' }));
    const input = screen.getByPlaceholderText('email, Discord sau link de grup');
    expect(screen.getByText('Apare public. Nu folosi un număr personal dacă nu vrei să fie văzut.')).toBeTruthy();
    fireEvent.change(input, { target: { value: '  https://discord.gg/abc ' } });
    fireEvent.click(within(row(/Un contact/)).getByRole('button', { name: 'Salvează' }));
    expect(screen.getByTestId('contact').textContent).toBe('https://discord.gg/abc');
    expect(row(/Un contact pentru cine vrea să ajute/).textContent).toContain('✓');
    // The preview picks the contact up.
    expect(screen.getAllByRole('link', { name: 'Intră pe Discord' }).length).toBeGreaterThan(0);
  });

  it('„Corectează” edits the first member named „tu”', () => {
    render(<Harness initial={project()} />);
    fireEvent.click(within(row(/Nume reale/)).getByRole('button', { name: 'Corectează' }));
    fireEvent.change(within(row(/Nume reale/)).getByLabelText('Nume'), { target: { value: 'Mihai' } });
    fireEvent.click(within(row(/Nume reale/)).getByRole('button', { name: 'Salvează' }));
    expect(screen.getByTestId('names').textContent).toBe('Ana,Mihai');
    expect(row(/^Nume reale în echipă$/).textContent).toContain('✓');
  });

  it('„Vezi” opens the questions in the preview', () => {
    render(<Harness initial={project()} />);
    const details = document.getElementById('intrebari') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(within(row(/întrebări deschise/)).getByRole('button', { name: 'Vezi' }));
    expect(details.open).toBe(true);
  });

  it('hides the questions row when nothing would appear publicly', () => {
    const p = project();
    p.alerts = [];
    p.toFindOut = [];
    render(<Harness initial={p} />);
    expect(within(check()).queryByText(/întrebări deschise|întrebare deschisă/)).toBeNull();
  });

  it('does not block publishing; the label depends on whether the page exists', () => {
    const onPublish = vi.fn();
    const p = createEmptyProject('Gol');
    render(<Harness initial={p} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publică pagina' }));
    expect(onPublish).toHaveBeenCalledTimes(1);
    cleanup();
    render(<Harness initial={p} published />);
    expect(screen.getByRole('button', { name: 'Actualizează pagina publică' })).toBeTruthy();
  });

  it('shows the preview with placeholders for empty sections', () => {
    render(<Harness initial={createEmptyProject('Gol')} />);
    expect(screen.getAllByText(/\(nu apare public\)/).length).toBeGreaterThan(0);
  });

  it('without setDraft shows the check read-only', () => {
    render(<Summary draft={project()} publishing={false} disabled={false} error={false} onPublish={() => {}} />);
    expect(within(check()).queryByRole('button', { name: 'Adaugă' })).toBeNull();
    expect(within(check()).queryByRole('button', { name: 'Corectează' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Publică pagina' })).toBeTruthy();
  });
});
