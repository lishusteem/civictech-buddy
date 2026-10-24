// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

afterEach(cleanup);

beforeAll(() => {
  // jsdom has no matchMedia; next-themes reads it for the system theme.
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe('ThemeToggle', () => {
  it('offers light, dark and system, and puts the choice on <html>', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Tema' });
    expect(group).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Ca sistemul' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Întunecat' }));
    expect(screen.getByRole('radio', { name: 'Întunecat' }).getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
