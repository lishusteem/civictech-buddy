import { getRepo } from '@/lib/db/repo';
import { INVALID_LINK, json } from '@/lib/http';
import { ProjectSchema } from '@/lib/project/schema';

type Ctx = { params: Promise<{ token: string }> };

const MAX_BODY_BYTES = 512 * 1024;
const TOO_LARGE = { error: 'Conținutul e prea mare.' };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { token } = await params;
  const stored = await getRepo().getByToken(token);
  if (!stored) return json(404, { error: INVALID_LINK });
  return json(200, {
    slug: stored.slug,
    draft: stored.draft,
    published: stored.published !== null,
    draftUpdatedAt: stored.draftUpdatedAt,
    publishedAt: stored.publishedAt,
  });
}

export async function PUT(req: Request, { params }: Ctx): Promise<Response> {
  const { token } = await params;

  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json(413, TOO_LARGE);

  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json(413, TOO_LARGE);

  let body: { draft?: unknown; expectedUpdatedAt?: unknown; force?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return json(422, { error: 'Corp invalid.', issues: [] });
  }
  if (typeof body !== 'object' || body === null) {
    return json(422, { error: 'Corp invalid.', issues: [] });
  }

  const parsed = ProjectSchema.safeParse(body.draft);
  if (!parsed.success || typeof body.expectedUpdatedAt !== 'string') {
    return json(422, {
      error: 'Datele proiectului nu sunt valide.',
      issues: parsed.success ? [] : parsed.error.issues,
    });
  }

  const result = await getRepo().saveDraft(
    token,
    parsed.data,
    body.expectedUpdatedAt,
    body.force === true,
  );
  if (result === null) return json(404, { error: INVALID_LINK });
  if (!result.ok) {
    return json(409, {
      conflict: { draft: result.conflict.draft, draftUpdatedAt: result.conflict.draftUpdatedAt },
    });
  }
  return json(200, { draftUpdatedAt: result.draftUpdatedAt });
}
