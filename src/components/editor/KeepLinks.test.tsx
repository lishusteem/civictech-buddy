// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { KeepLinks } from './KeepLinks';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(nav: Record<string, unknown> = {}) {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText }, ...nav });
  const onDone = vi.fn();
  render(<KeepLinks slug="proiect-abc" editToken="tok123" projectName="Proiect" onDone={onDone} />);
  return { writeText, onDone };
}

describe('KeepLinks', () => {
  it('shows the exact warning', () => {
    setup();
    expect(
      screen.getByText('Linkul de editare e singura cheie a proiectului. Dacă îl pierzi, nu-l putem recupera.'),
    ).toBeTruthy();
  });

  it('separates the public card (Copiază, Deschide ↗) from the edit card that holds the warning', () => {
    setup();
    const publicCard = screen.getByText('Pagina publică — pentru grup').closest('li')!;
    expect(publicCard.className).toContain('border-primary');
    expect(within(publicCard).getByRole('button', { name: 'Copiază linkul public' })).toBeTruthy();
    const open = within(publicCard).getByRole('link', { name: 'Deschide ↗' });
    expect(open.getAttribute('href')).toBe(`${window.location.origin}/p/proiect-abc`);
    expect(open.getAttribute('target')).toBe('_blank');

    const editCard = screen.getByText('Linkul de editare — doar pentru tine și echipă').closest('li')!;
    expect(editCard.className).toContain('border-proposed');
    expect(within(editCard).getByText(/Linkul de editare e singura cheie a proiectului/)).toBeTruthy();
    expect(within(editCard).queryByRole('link', { name: 'Deschide ↗' })).toBeNull();
  });

  it('keeps the warning in the edit card when the page is not published yet', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    render(<KeepLinks slug="s" editToken="t" projectName="P" published={false} onDone={() => {}} />);
    expect(screen.queryByText('Pagina publică — pentru grup')).toBeNull();
    const editCard = screen.getByText('Linkul de editare — doar pentru tine și echipă').closest('li')!;
    expect(within(editCard).getByText(/Linkul de editare e singura cheie a proiectului/)).toBeTruthy();
  });

  it('shows both absolute links', () => {
    setup();
    expect(screen.getByText(`${window.location.origin}/p/proiect-abc`)).toBeTruthy();
    expect(screen.getByText(`${window.location.origin}/e/tok123`)).toBeTruthy();
  });

  it('copies the edit URL and confirms with "Copiat"', async () => {
    const { writeText } = setup();
    const buttons = screen.getAllByRole('button', { name: /^Copiază/ });
    expect(buttons).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Copiază linkul de editare' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/e/tok123`);
    expect(await screen.findByText('Copiat')).toBeTruthy();
  });

  it('offers Gmail (new tab) and the email app', () => {
    setup();
    const gmail = screen.getByRole('link', { name: 'Gmail' });
    expect(gmail.getAttribute('href')!.startsWith('https://mail.google.com/mail/?view=cm')).toBe(true);
    expect(gmail.getAttribute('target')).toBe('_blank');
    expect(gmail.getAttribute('rel')).toContain('noopener');
    const mail = screen.getByRole('link', { name: 'Aplicația de email' });
    expect(mail.getAttribute('href')!.startsWith('mailto:?subject=')).toBe(true);
  });

  it('hides "Partajează" without navigator.share and shows it with', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Partajează' })).toBeNull();
    cleanup();
    setup({ share: vi.fn() });
    expect(screen.getByRole('button', { name: 'Partajează' })).toBeTruthy();
  });

  it('asks for confirmation on beforeunload until "Am salvat linkurile"', async () => {
    const { onDone } = setup();
    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Am salvat linkurile' }));
    expect(onDone).toHaveBeenCalled();
    await waitFor(() => {
      const after = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(after);
      expect(after.defaultPrevented).toBe(false);
    });
  });
});
