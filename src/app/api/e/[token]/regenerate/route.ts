import { getRepo } from '@/lib/db/repo';
import { INVALID_LINK, json } from '@/lib/http';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const result = await getRepo().regenerateToken(token);
  if (!result) return json(404, { error: INVALID_LINK });
  return json(200, { editToken: result.editToken });
}
