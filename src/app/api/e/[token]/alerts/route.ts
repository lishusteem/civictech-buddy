import { z } from 'zod';
import { AI_DOWN_ERROR, AI_LIMIT_ERROR, hitAiLimits } from '@/lib/ai/limits';
import { runLlmAlerts } from '@/lib/ai/llmAlerts';
import { getProvider, withRetry } from '@/lib/ai/provider';
import { getRepo } from '@/lib/db/repo';
import { INVALID_LINK, json } from '@/lib/http';
import { StepIdSchema } from '@/lib/project/schema';

type Ctx = { params: Promise<{ token: string }> };

/** One model call (25 s) plus its retry, with headroom. */
export const maxDuration = 60;

const BodySchema = z.object({ step: StepIdSchema });

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  const { token } = await params;
  const stored = await getRepo().getByToken(token);
  if (!stored) return json(404, { error: INVALID_LINK });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(422, { error: 'Corp invalid.', issues: [] });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json(422, { error: 'Corp invalid.', issues: parsed.error.issues });

  if (!(await hitAiLimits(req, stored.id))) return json(429, { error: AI_LIMIT_ERROR });

  try {
    const alerts = await runLlmAlerts(stored.draft, parsed.data.step, withRetry(getProvider()));
    return json(200, { alerts });
  } catch {
    return json(502, { error: AI_DOWN_ERROR });
  }
}
