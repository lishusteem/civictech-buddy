import { getRepo } from '../db/repo';
import { clientIp } from '../http';

export const AI_LIMIT_ERROR = 'Ai atins limita de azi pentru AI. Poți continua în modul formular.';
export const AI_DOWN_ERROR = 'AI-ul nu răspunde acum.';

const DAY = 86400;
const PER_PROJECT = 300;
const PER_IP = 600;
const GLOBAL = 5000;

/**
 * Counts one AI call against the daily limits; true = allowed.
 * The project quota is keyed on the stored project id, so regenerating the edit link does not reset it.
 */
export async function hitAiLimits(req: Request, projectId: string): Promise<boolean> {
  const repo = getRepo();
  if (!(await repo.hitRateLimit(`ai:${projectId}`, PER_PROJECT, DAY))) return false;
  if (!(await repo.hitRateLimit(`ai-ip:${clientIp(req)}`, PER_IP, DAY))) return false;
  return repo.hitRateLimit('ai-global', GLOBAL, DAY);
}
