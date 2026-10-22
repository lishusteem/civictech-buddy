// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createEmptyProject } from '@/lib/project/empty';
import { fillSteps } from '@/lib/steps/completion.fixtures';
import { StepSidebar } from './StepSidebar';

afterEach(cleanup);

describe('StepSidebar', () => {
  it('marks the current step with aria-current="step"', () => {
    const { container } = render(
      <StepSidebar project={createEmptyProject('P')} current="actors" onSelect={() => {}} />,
    );
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Actorii');
  });

  it('shows remaining minutes (30 minus done steps)', () => {
    const p = fillSteps(createEmptyProject('P'), ['project', 'problem']);
    p.steps.project.status = 'done';
    p.steps.problem.status = 'done';
    render(<StepSidebar project={p} current="existing" onSelect={() => {}} />);
    expect(screen.getByText('~23 min rămase')).toBeTruthy();
  });

  it('flags only steps with an open alert', () => {
    const p = createEmptyProject('P');
    p.alerts = [
      { code: 'no_evidence', step: 2, refs: [], status: 'open', message: 'm' },
      { code: 'first_in_world', step: 3, refs: [], status: 'dismissed', message: 'm' },
    ];
    const { container } = render(<StepSidebar project={p} current="project" onSelect={() => {}} />);
    const flagged = container.querySelectorAll('[data-alert="true"]');
    expect(flagged).toHaveLength(1);
    expect(flagged[0].textContent).toContain('Problema');
  });

  it('groups 10 steps in 3 phases and reports selection', () => {
    const onSelect = vi.fn();
    const p = fillSteps(createEmptyProject('P'), ['project', 'problem', 'existing', 'target', 'actors', 'relations', 'preconditions']);
    render(<StepSidebar project={p} current="project" onSelect={onSelect} />);
    for (const t of ['Contextul', 'Teoria schimbării', 'Organizarea']) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: /Ipotezele riscante/ }));
    expect(onSelect).toHaveBeenCalledWith('risks');
  });

  it('shows the compact mobile line and toggles the step list', () => {
    render(<StepSidebar project={createEmptyProject('P')} current="target" onSelect={() => {}} />);
    expect(screen.getByText(/Pasul 4 din 10/)).toBeTruthy();
    const toggle = screen.getByRole('button', { name: /Arată pașii/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('blocks steps after the first incomplete one, allows earlier ones, and ✓ needs saved content', () => {
    const onSelect = vi.fn();
    const p = fillSteps(createEmptyProject('P'), ['project', 'problem']);
    p.steps.project.status = 'done';
    p.steps.problem.status = 'done';
    p.steps.existing.status = 'done'; // done but empty: not a ✓
    const { container } = render(<StepSidebar project={p} current="existing" onSelect={onSelect} />);
    const btn = (name: RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
    expect(btn(/Proiectul și echipa/).disabled).toBe(false);
    expect(btn(/Ce există deja/).disabled).toBe(false);
    const blocked = btn(/Schimbarea țintă/);
    expect(blocked.disabled).toBe(true);
    expect(blocked.getAttribute('title')).toBe('Termină întâi pașii anteriori.');
    fireEvent.click(blocked);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(btn(/Proiectul și echipa/));
    expect(onSelect).toHaveBeenCalledWith('project');
    expect(container.querySelector('[data-step="existing"]')!.textContent).not.toContain('✓');
    expect(container.querySelector('[data-step="problem"]')!.textContent).toContain('✓');
  });
});
