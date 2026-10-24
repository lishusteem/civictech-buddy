import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MapView } from '@/components/project/MapView';
import { ProjectView } from '@/components/project/ProjectView';
import { pitchOf } from '@/components/project/publicPage';
import { getRepo } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string }> };

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

const tab = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-medium ${active ? 'bg-teal-800 text-white' : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-100'}`;

/** Two views of the same published project: the story (default) and the map of the theory of change. */
export default async function PublicProjectPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { v } = await searchParams;
  const found = await loadPublished(slug);
  if (!found) notFound();
  const map = v === 'harta';
  const storyHref = `/p/${slug}`;
  const mapHref = `/p/${slug}?v=harta`;

  return (
    <main className={`mx-auto w-full px-4 py-6 sm:py-10 ${map ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <nav aria-label="Cum vezi proiectul" className="mb-5 flex flex-wrap gap-2">
        <a href={storyHref} aria-current={map ? undefined : 'page'} className={tab(!map)}>
          Povestea
        </a>
        <a href={mapHref} aria-current={map ? 'page' : undefined} className={tab(map)}>
          Harta schimbării
        </a>
      </nav>
      {map ? (
        <MapView project={found.published} publishedAt={found.publishedAt} storyHref={storyHref} />
      ) : (
        <ProjectView project={found.published} publishedAt={found.publishedAt} mapHref={mapHref} />
      )}
    </main>
  );
}
