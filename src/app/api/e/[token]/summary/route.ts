import { AI_LIMIT_ERROR, hitAiLimits } from '@/lib/ai/limits';
import { getProvider, withRetry } from '@/lib/ai/provider';
import { summarizeProject } from '@/lib/ai/stepTurn';
import { getRepo } from '@/lib/db/repo';
import { INVALID_LINK, json } from '@/lib/http';

type Ctx = { params: Promise<{ token: string }> };

/** One model call (25 s) plus its retry, with headroom. */
export const maxDuration = 60;

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const { token } = await params;
  const stored = await getRepo().getByToken(token);
  if (!stored) return json(404, { error: INVALID_LINK });
  if (!(await hitAiLimits(req, stored.id))) return json(429, { error: AI_LIMIT_ERROR });
  // summarizeProject never throws; on error the UI shows nothing.
  const text = await summarizeProject(stored.draft, withRetry(getProvider()));
  return json(200, { text });
}
