import { ALERT_MESSAGES } from '../alerts/messages';
import { AlertCodeSchema, type Alert, type AlertCode, type Project, type StepId } from '../project/schema';
import { STEPS } from '../steps/definitions';
import { contextMessage, loadPrompt } from './prompts';
import { ALERTS_MARKER, STEP_MARKER, type ChatProvider } from './provider';

// LLM-detected alerts (PRD section 5) and the steps where each may be raised.
export const LLM_ALERTS_BY_STEP: Partial<Record<StepId, AlertCode[]>> = {
  problem: ['solution_in_problem'],
  target: ['app_as_goal', 'abstract_change'],
  preconditions: ['abstract_change', 'magic_leap', 'build_and_they_come'],
  backlog: ['build_and_they_come'],
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export async function runLlmAlerts(p: Project, step: StepId, provider: ChatProvider): Promise<Alert[]> {
  const allowed = LLM_ALERTS_BY_STEP[step] ?? [];
  if (allowed.length === 0) return [];

  const system = [
    loadPrompt('alerts.md'),
    ALERTS_MARKER,
    `${STEP_MARKER} ${step}`,
    `Coduri permise la acest pas: ${allowed.join(', ')}.`,
  ].join('\n\n');
  const raw = await provider.complete([{ role: 'system', content: system }, contextMessage(p, step)], { json: true });

  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!isObject(obj) || !Array.isArray(obj.alerts)) return [];

  const stepNumber = STEPS.find((s) => s.id === step)!.number;
  const out: Alert[] = [];
  for (const a of obj.alerts) {
    if (!isObject(a)) continue;
    const code = AlertCodeSchema.safeParse(a.code);
    if (!code.success || !allowed.includes(code.data)) continue;
    const refs = Array.isArray(a.refs) ? a.refs.filter((r): r is string => typeof r === 'string') : [];
    const message =
      typeof a.message === 'string' && a.message.trim() !== '' && a.message.length <= 400
        ? a.message.trim()
        : ALERT_MESSAGES[code.data].message;
    out.push({ code: code.data, step: stepNumber, refs, status: 'open', message });
  }
  return out;
}
