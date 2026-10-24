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
    await expect(PublicProjectPage({ params: Promise.resolve({ slug: stored.slug }), searchParams: Promise.resolve({}) })).rejects.toThrow();
    await expect(PublicProjectPage({ params: Promise.resolve({ slug: 'nu-exista' }), searchParams: Promise.resolve({}) })).rejects.toThrow();
  });

  it('renders only the published version, never the newer draft', async () => {
    const { stored, editToken } = await getRepo().create('Public');
    const draft = { ...stored.draft, problem: { ...stored.draft.problem, statement: 'Versiune publicată. Rest.' } };
    const saved = await getRepo().saveDraft(editToken, draft, stored.draftUpdatedAt);
    expect(saved?.ok).toBe(true);
    await getRepo().publish(editToken);
    const current = (await getRepo().getByToken(editToken))!;
    await getRepo().saveDraft(editToken, { ...current.draft, direction: 'SECRET-DRAFT-ONLY' }, current.draftUpdatedAt);

    const el = await PublicProjectPage({ params: Promise.resolve({ slug: stored.slug }), searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('Versiune publicată.');
    expect(html).not.toContain('SECRET-DRAFT-ONLY');
    expect(html).not.toContain('/e/');

    const meta = await generateMetadata({ params: Promise.resolve({ slug: stored.slug }), searchParams: Promise.resolve({}) });
    expect(meta.title).toBe('Public — Ghidul de pornire');
    expect(meta.description).toBe('Versiune publicată.');
  });

  it('uses the pitch as the description and never shows „tu” or the internal ids', async () => {
    const { stored, editToken } = await getRepo().create('Cu pitch');
    const draft = {
      ...stored.draft,
      project: { ...stored.draft.project, description: 'Asociațiile raportează într-un loc. Detalii.' },
      targetChanges: [{ id: 't1', text: 'Primăria răspunde în 30 de zile', signal: '' }],
      team: [{ id: 'm1', name: 'tu', skills: ['backend'], hoursPerWeek: 2 }],
    };
    await getRepo().saveDraft(editToken, draft, stored.draftUpdatedAt);
    await getRepo().publish(editToken);

    const html = renderToStaticMarkup(await PublicProjectPage({ params: Promise.resolve({ slug: stored.slug }), searchParams: Promise.resolve({}) }));
    expect(html).toContain('Inițiatorul proiectului');
    expect(html).not.toMatch(/>tu</);
    expect(html).not.toMatch(/\b(m1|t1)\b/);
    const meta = await generateMetadata({ params: Promise.resolve({ slug: stored.slug }), searchParams: Promise.resolve({}) });
    expect(meta.description).toBe('Asociațiile raportează într-un loc.');
  });
});
