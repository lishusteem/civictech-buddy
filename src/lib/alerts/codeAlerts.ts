import { STEPS } from '../steps/definitions';
import type { Alert, AlertCode, Project } from '../project/schema';
import { ALERT_MESSAGES } from './messages';

// Alerts marked "Cod" or "Cod + LLM" in PRD section 5. The rest are LLM-only;
// mergeAlerts only replaces them when a step's LLM alerts are refreshed.
export const CODE_ALERT_CODES: AlertCode[] = [
  'team_no_time',
  'no_evidence',
  'first_in_world',
  'nobody_excluded',
  'only_users',
  'powerful_actor_unused',
  'all_through_app',
  'hypothesis_without_test',
  'all_on_one',
  'orphan_feature',
  'only_code',
];

const POWER_RANK = { low: 0, medium: 1, high: 2 } as const;

function make(code: AlertCode, refs: string[] = [], message?: string): Alert {
  const def = ALERT_MESSAGES[code];
  return { code, step: def.step, refs, status: 'open', message: message ?? def.message };
}

/** Keeps an alert message within the 400 characters the schema allows. */
function shorten(text: string): string {
  const t = text.trim();
  return t.length > 200 ? `${t.slice(0, 199)}…` : t;
}

function touched(p: Project, stepNumber: number): boolean {
  const def = STEPS.find((s) => s.number === stepNumber);
  return !!def && p.steps[def.id].status !== 'untouched';
}

export function computeCodeAlerts(p: Project): Project['alerts'] {
  const out: Alert[] = [];
  const on = (code: AlertCode) => touched(p, ALERT_MESSAGES[code].step);

  if (on('team_no_time') && p.team.length > 0) {
    const hours = p.team.reduce((sum, m) => sum + m.hoursPerWeek, 0);
    if (hours < 5) {
      out.push(make('team_no_time', [], ALERT_MESSAGES.team_no_time.message.replace('{h}', String(hours))));
    }
  }

  if (on('no_evidence') && p.problem.statement.trim() !== '' && p.problem.evidence.length === 0) {
    out.push(make('no_evidence'));
  }

  if (on('first_in_world') && p.existing.length === 0) {
    out.push(make('first_in_world'));
  }

  if (on('nobody_excluded') && p.actors.length > 0 && !p.actors.some((a) => a.excluded || a.stance === 'opposes')) {
    out.push(make('nobody_excluded'));
  }

  if (on('only_users') && p.actors.length > 0 && !p.actors.some((a) => a.type === 'institution')) {
    out.push(make('only_users'));
  }

  if (on('powerful_actor_unused') && p.actors.length > 0) {
    const max = Math.max(...p.actors.map((a) => POWER_RANK[a.power]));
    for (const a of p.actors) {
      if (POWER_RANK[a.power] !== max) continue;
      const inRelation = p.relations.some((r) => r.from === a.id || r.to === a.id);
      const inPrecondition = p.preconditions.some((c) => c.actorId === a.id);
      if (!inRelation && !inPrecondition) {
        out.push(make('powerful_actor_unused', [a.id], ALERT_MESSAGES.powerful_actor_unused.message.replace('Ministerul X', a.name)));
      }
    }
  }

  if (on('all_through_app') && p.preconditions.length > 0 && p.preconditions.every((c) => c.coveredByApp)) {
    out.push(make('all_through_app'));
  }

  if (on('hypothesis_without_test')) {
    for (const c of p.preconditions) {
      if (c.risky && c.test.trim() === '') out.push(make('hypothesis_without_test', [c.id]));
    }
  }

  if (on('all_on_one') && p.team.length === 1 && p.roles.length >= 2 && p.roles.every((r) => r.status === 'covered')) {
    out.push(make('all_on_one', [], ALERT_MESSAGES.all_on_one.message.replace('în 4 ore', `în ${p.team[0].hoursPerWeek} ore`)));
  }

  if (on('orphan_feature')) {
    for (const f of p.features) {
      const linked = p.backlog.some((b) => b.featureId === f.id && b.preconditionId !== null);
      if (!linked) out.push(make('orphan_feature', [f.id], ALERT_MESSAGES.orphan_feature.message.replace('{text}', () => shorten(f.text))));
    }
  }

  if (on('only_code') && p.backlog.length > 0 && !p.backlog.some((b) => b.kind === 'organizing' || b.kind === 'test')) {
    out.push(make('only_code'));
  }

  return out;
}

const isCodeAlert = (a: Alert) => CODE_ALERT_CODES.includes(a.code);

/** Code alerts are keyed by code and refs; LLM alerts by code and step, so a refresh replaces them. */
const keyOf = (a: Alert) => (isCodeAlert(a) ? `${a.code}:${[...a.refs].sort().join(',')}` : `${a.code}@${a.step}`);

/**
 * Merges freshly computed alerts into the stored ones, keeping dismissed statuses.
 * Code alerts that vanish become resolved. LLM alerts are left as they are, except with
 * `llmStep`: the fresh list then holds that step's new LLM alerts, which replace its open ones.
 */
export function mergeAlerts(previous: Alert[], fresh: Alert[], opts: { llmStep?: number } = {}): Alert[] {
  const prevByKey = new Map(previous.map((a) => [keyOf(a), a]));
  const freshByKey = new Map<string, Alert>();
  for (const a of fresh) if (!freshByKey.has(keyOf(a))) freshByKey.set(keyOf(a), a);

  const merged: Alert[] = [...freshByKey.values()].map((a) => {
    const prev = prevByKey.get(keyOf(a));
    if (!prev) return a;
    return { ...a, status: prev.status === 'resolved' ? 'open' : prev.status };
  });

  for (const prev of previous) {
    if (freshByKey.has(keyOf(prev))) continue;
    if (isCodeAlert(prev)) {
      merged.push(prev.status === 'open' ? { ...prev, status: 'resolved' } : prev);
    } else if (!(prev.step === opts.llmStep && prev.status === 'open')) {
      merged.push(prev);
    }
  }
  // The same LLM question can come back from a later step; keep only the earliest step's copy.
  const firstStep = new Map<AlertCode, number>();
  for (const a of merged) if (!isCodeAlert(a)) firstStep.set(a.code, Math.min(a.step, firstStep.get(a.code) ?? Infinity));
  return merged.filter((a) => isCodeAlert(a) || a.step === firstStep.get(a.code));
}
