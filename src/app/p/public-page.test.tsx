import { describe, it, expect, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { getRepo } from '@/lib/db/repo';
import PublicProjectPage, { generateMetadata } from './[slug]/page';

beforeAll(() => {
  process.env.REPO = 'memory';
});

describe('public project page', () => {
  it('404s for an unpublished project and unknown slugs', async () => {
    const { stored } = await getRepo().create('Ascuns');
    await expect(PublicProjectPage({ params: Promise.resolve({ slug: stored.slug }) })).rejects.toThrow();
    await expect(PublicProjectPage({ params: Promise.resolve({ slug: 'nu-exista' }) })).rejects.toThrow();
  });

  it('renders only the published version, never the newer draft', async () => {
    const { stored, editToken } = await getRepo().create('Public');
    const draft = { ...stored.draft, problem: { ...stored.draft.problem, statement: 'Versiune publicată. Rest.' } };
    const saved = await getRepo().saveDraft(editToken, draft, stored.draftUpdatedAt);
    expect(saved?.ok).toBe(true);
    await getRepo().publish(editToken);
    const current = (await getRepo().getByToken(editToken))!;
    await getRepo().saveDraft(editToken, { ...current.draft, direction: 'SECRET-DRAFT-ONLY' }, current.draftUpdatedAt);

    const el = await PublicProjectPage({ params: Promise.resolve({ slug: stored.slug }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('Versiune publicată.');
    expect(html).not.toContain('SECRET-DRAFT-ONLY');
    expect(html).not.toContain('/e/');

    const meta = await generateMetadata({ params: Promise.resolve({ slug: stored.slug }) });
    expect(meta.title).toBe('Public — Ghidul de pornire');
    expect(meta.description).toBe('Versiune publicată.');
  });
});
