import { getRepo } from '@/lib/db/repo';
import { clientIp, json } from '@/lib/http';

export async function POST(req: Request): Promise<Response> {
  const repo = getRepo();
  const allowed = await repo.hitRateLimit(`create:${clientIp(req)}`, 10, 3600);
  if (!allowed) {
    return json(429, { error: 'Prea multe proiecte noi. Încearcă peste o oră.' });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const rawName = (body as { name?: unknown } | null)?.name;
  const name = typeof rawName === 'string' ? rawName : '';
  if (name.length > 120) {
    return json(422, { error: 'Numele e prea lung (maxim 120 de caractere).' });
  }

  const { stored, editToken } = await repo.create(name);
  return json(201, { slug: stored.slug, editToken });
}
