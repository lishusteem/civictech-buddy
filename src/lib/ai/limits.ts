import { getRepo } from '../db/repo';
import { clientIp } from '../http';
import { hashToken } from '../tokens';

export const AI_LIMIT_ERROR = 'Ai atins limita de azi pentru AI. Poți continua în modul formular.';
export const AI_DOWN_ERROR = 'AI-ul nu răspunde acum.';

const DAY = 86400;

/** Counts one AI call against the project and IP daily limits; true = allowed. */
export async function hitAiLimits(req: Request, token: string): Promise<boolean> {
  const repo = getRepo();
  const byToken = await repo.hitRateLimit(`ai:${await hashToken(token)}`, 300, DAY);
  if (!byToken) return false;
  return repo.hitRateLimit(`ai-ip:${clientIp(req)}`, 600, DAY);
}
