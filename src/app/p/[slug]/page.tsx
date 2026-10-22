import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectView } from '@/components/project/ProjectView';
import { pitchOf } from '@/components/project/publicPage';
import { getRepo } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/** Only the published version is ever read; the draft never leaves the database. */
const loadPublished = (slug: string) => getRepo().getPublishedBySlug(slug);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadPublished(slug);
  if (!found) return { title: 'Ghidul de pornire' };
  const p = found.published;
  const description = pitchOf(p).text;
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
