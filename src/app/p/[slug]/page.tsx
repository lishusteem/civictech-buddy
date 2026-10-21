import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectView, firstSentence } from '@/components/project/ProjectView';
import { getRepo } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/** Only the published version is ever returned; the draft stays on the server. */
async function loadPublished(slug: string) {
  const stored = await getRepo().getBySlug(slug);
  if (!stored || stored.published === null) return null;
  return { published: stored.published, publishedAt: stored.publishedAt };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadPublished(slug);
  if (!found) return { title: 'Ghidul de pornire' };
  const p = found.published;
  const description = p.targetChanges[0]?.text || firstSentence(p.problem.statement);
  return {
    title: `${p.project.name} — Ghidul de pornire`,
    ...(description ? { description } : {}),
  };
}

export default async function PublicProjectPage({ params }: Params) {
  const { slug } = await params;
  const found = await loadPublished(slug);
  if (!found) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <ProjectView project={found.published} publishedAt={found.publishedAt} />
    </main>
  );
}
