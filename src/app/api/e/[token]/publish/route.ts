import { getRepo } from '@/lib/db/repo';
import { INVALID_LINK, json } from '@/lib/http';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const stored = await getRepo().publish(token);
  if (!stored) return json(404, { error: INVALID_LINK });
  return json(200, { slug: stored.slug, publishedAt: stored.publishedAt });
}
