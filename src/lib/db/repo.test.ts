import { afterEach, describe, expect, it } from 'vitest';
import { getRepo } from './repo';

const saved = { REPO: process.env.REPO, VERCEL_ENV: process.env.VERCEL_ENV };

afterEach(() => {
  process.env.REPO = saved.REPO;
  if (saved.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = saved.VERCEL_ENV;
});

describe('getRepo', () => {
  it('refuses the memory repo in Vercel production', () => {
    process.env.REPO = 'memory';
    process.env.VERCEL_ENV = 'production';
    expect(() => getRepo()).toThrow(/REPO=memory/);
  });

  it('allows the memory repo elsewhere', () => {
    process.env.REPO = 'memory';
    process.env.VERCEL_ENV = 'preview';
    expect(getRepo()).toBeTruthy();
  });
});
