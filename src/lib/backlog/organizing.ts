import type { Project } from '../project/schema';

type Item = Project['backlog'][number];

export function buildOrganizingItems(p: Project): Project['backlog'] {
  const drafts: Omit<Item, 'id' | 'order'>[] = [];

  for (const c of p.preconditions) {
    if (c.risky && c.test.trim() !== '') {
      drafts.push({ stage: c.stage, kind: 'test', featureId: null, preconditionId: c.id, text: c.test });
    }
  }
  for (const r of p.roles) {
    if (r.status === 'seeking') {
      drafts.push({ stage: r.stage, kind: 'organizing', featureId: null, preconditionId: null, text: 'Găsește: ' + r.name });
    } else if (r.status === 'partner') {
      drafts.push({ stage: r.stage, kind: 'organizing', featureId: null, preconditionId: null, text: 'Vorbește cu un partener pentru: ' + r.name });
    }
  }
  for (const c of p.preconditions) {
    if (!c.coveredByApp) {
      drafts.push({ stage: c.stage, kind: 'organizing', featureId: null, preconditionId: c.id, text: c.text });
    }
  }
  for (const q of p.toFindOut) {
    drafts.push({ stage: 'start', kind: 'organizing', featureId: null, preconditionId: null, text: 'Află: ' + q.text });
  }

  const seen = new Set(p.backlog.map((b) => `${b.kind}\u0000${b.text}`));
  let nextId = p.backlog.reduce((max, b) => {
    const m = /^b(\d+)$/.exec(b.id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  let nextOrder = p.backlog.reduce((max, b) => Math.max(max, b.order), 0);

  const out: Item[] = [];
  for (const d of drafts) {
    const key = `${d.kind}\u0000${d.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...d, id: `b${++nextId}`, order: ++nextOrder });
  }
  return out;
}
