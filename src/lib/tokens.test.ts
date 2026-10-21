import { describe, expect, it } from 'vitest';
import { generateEditToken, hashToken, makeSlug } from './tokens';

describe('tokens', () => {
  it('generates a 43-char base64url token', () => {
    const t = generateEditToken();
    expect(t).toHaveLength(43);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates distinct tokens', () => {
    expect(generateEditToken()).not.toBe(generateEditToken());
  });

  it('hashes with sha256 hex', async () => {
    expect(await hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('makeSlug', () => {
  it('transliterates Romanian and strips emoji', () => {
    expect(makeSlug('Sesizări în Ștefănești 🚧')).toMatch(/^sesizari-in-stefanesti-[a-z0-9]{6}$/);
  });

  it('falls back to "proiect" for empty names', () => {
    expect(makeSlug('')).toMatch(/^proiect-[a-z0-9]{6}$/);
  });

  it('caps the length at 47', () => {
    expect(makeSlug('a'.repeat(200)).length).toBeLessThanOrEqual(47);
  });
});
