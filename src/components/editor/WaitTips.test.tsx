// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { waitTips } from '@/lib/steps/waitTips';
import { STEPS } from '@/lib/steps/definitions';
import { TIP_MS, WaitTips } from './WaitTips';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('waitTips', () => {
  it('has ideas for every step, short enough for two lines', () => {
    for (const s of STEPS) {
      const tips = waitTips(s.id);
      expect(tips.length).toBeGreaterThanOrEqual(5);
      for (const t of tips) expect(t.length).toBeLessThanOrEqual(130);
    }
  });
});

describe('WaitTips', () => {
  it('shows the step ideas first, then moves on every few seconds, outside the live region', () => {
    vi.useFakeTimers();
    const tips = waitTips('preconditions');
    const { container } = render(<WaitTips step="preconditions" />);
    expect(screen.getByText(tips[0])).toBeTruthy();
    act(() => vi.advanceTimersByTime(TIP_MS));
    expect(screen.getByText(tips[1])).toBeTruthy();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});
