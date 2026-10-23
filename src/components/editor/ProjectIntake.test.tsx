// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { intakeMessage, ProjectIntake } from './ProjectIntake';

afterEach(cleanup);

describe('intakeMessage', () => {
  it('puts the three answers in sections, one function per line', () => {
    expect(intakeMessage(' Cereri pe Legea 544. ', '- Trimite cererea\n\n• Urmărește statusul', '')).toBe(
      'Ce face aplicația:\nCereri pe Legea 544.\n\nFuncții care merg deja:\n- Trimite cererea\n- Urmărește statusul\n\nFuncții care urmează:\n(niciuna)',
    );
  });
});

describe('ProjectIntake', () => {
  it('sends only with a description and at least one function, or lets the dev skip to the chat', () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();
    render(<ProjectIntake onSubmit={onSubmit} onSkip={onSkip} />);
    const send = screen.getByRole('button', { name: 'Trimite' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Ce face aplicația'), { target: { value: 'Hartă de gropi' } });
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Funcții care urmează'), { target: { value: 'Notificări' } });
    fireEvent.click(send);
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining('Funcții care urmează:\n- Notificări'));
    fireEvent.click(screen.getByRole('button', { name: 'Prefer să răspund în conversație' }));
    expect(onSkip).toHaveBeenCalled();
  });
});
