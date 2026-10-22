import { ALERT_MESSAGES } from '../alerts/messages';
import { remainingCapacity } from '../project/entities';
import type { Project } from '../project/schema';

// Actions of the step-10 row "Fiecare funcție e legată de o precondiție sau mutată la «mai târziu»" (UX spec §5.3).
// Until the backlog has a 'later' stage, "mai târziu" is a feature item with no precondition, stage 'mid',
// and the feature's orphan alert dismissed (the same as "Păstrează").

type Item = Project['backlog'][number];

function nextItemId(p: Project): string {
  const n = p.backlog.reduce((max, b) => {
    const m = /^b(\d+)$/.exec(b.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `b${n + 1}`;
}

/** Updates the feature's backlog item, or appends one when there is room. */
function upsertFeatureItem(p: Project, featureId: string, fields: Pick<Item, 'stage' | 'preconditionId'>): Project {
  const feature = p.features.find((f) => f.id === featureId);
  if (!feature) return p;
  if (p.backlog.some((b) => b.featureId === featureId)) {
    return { ...p, backlog: p.backlog.map((b) => (b.featureId === featureId ? { ...b, ...fields } : b)) };
  }
  if (remainingCapacity(p, 'backlogItem') === 0) return p;
  const order = p.backlog.reduce((max, b) => Math.max(max, b.order), 0) + 1;
  const item: Item = { id: nextItemId(p), kind: 'feature', featureId, text: feature.text.slice(0, 300), order, ...fields };
  return { ...p, backlog: [...p.backlog, item] };
}

/** "Leagă de…": the feature's backlog item points at the precondition, at its stage. */
export function linkFeature(p: Project, featureId: string, preconditionId: string): Project {
  const pre = p.preconditions.find((c) => c.id === preconditionId);
  return pre ? upsertFeatureItem(p, featureId, { preconditionId, stage: pre.stage }) : p;
}

/** "Păstrează": dismisses the feature's orphan alert (creating it dismissed if the check has not run yet). */
export function keepFeature(p: Project, featureId: string): Project {
  const isIt = (a: Project['alerts'][number]) => a.code === 'orphan_feature' && a.refs.length === 1 && a.refs[0] === featureId;
  if (p.alerts.some(isIt)) {
    return { ...p, alerts: p.alerts.map((a) => (isIt(a) ? { ...a, status: 'dismissed' as const } : a)) };
  }
  const text = p.features.find((f) => f.id === featureId)?.text.trim() ?? '';
  const short = text.length > 200 ? `${text.slice(0, 199)}…` : text;
  const def = ALERT_MESSAGES.orphan_feature;
  const alert = { code: 'orphan_feature' as const, step: def.step, refs: [featureId], status: 'dismissed' as const, message: def.message.replace('{text}', () => short) };
  return { ...p, alerts: [...p.alerts, alert] };
}

/** "Mai târziu": the feature waits in the backlog, unlinked, and no longer counts as an orphan. */
export function laterFeature(p: Project, featureId: string): Project {
  return keepFeature(upsertFeatureItem(p, featureId, { preconditionId: null, stage: 'mid' }), featureId);
}
