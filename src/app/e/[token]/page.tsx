import Link from 'next/link';
import { Editor } from '@/components/editor/Editor';
import { getRepo } from '@/lib/db/repo';

export default async function EditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stored = await getRepo().getByToken(token);

  if (!stored) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-stone-900">
        <h1 className="text-2xl font-semibold">Linkul nu mai e valid.</h1>
        <p className="mt-4">
          <Link href="/" className="font-medium text-teal-900 underline underline-offset-2">
            Înapoi la început
          </Link>
        </p>
      </main>
    );
  }

  // Only the draft and timestamps cross to the client, never the stored `published` object.
  return (
    <Editor
      token={token}
      slug={stored.slug}
      initial={{ draft: stored.draft, draftUpdatedAt: stored.draftUpdatedAt }}
      publishedAt={stored.publishedAt}
    />
  );
}
