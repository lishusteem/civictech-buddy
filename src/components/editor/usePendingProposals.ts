'use client';

import { useEffect, useState } from 'react';
import { ENTITY_SCHEMAS, type Card, type EntityKind } from '@/lib/project/entities';
import { StepIdSchema, type StepId } from '@/lib/project/schema';

export type PendingProposals = Partial<Record<StepId, Card[]>>;

const storageKey = (slug: string) => `ghid:propuneri:${slug}`;

/** Keeps only cards that still fit their entity schema; anything else in storage is dropped. */
export function parsePending(raw: string | null): PendingProposals {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof value !== 'object' || value === null) return {};
  const out: PendingProposals = {};
  for (const [step, cards] of Object.entries(value)) {
    if (!StepIdSchema.safeParse(step).success || !Array.isArray(cards)) continue;
    const valid = cards.filter(
      (c): c is Card =>
        typeof c === 'object' &&
        c !== null &&
        Object.hasOwn(ENTITY_SCHEMAS, c.kind) &&
        ENTITY_SCHEMAS[c.kind as EntityKind].safeParse(c.data).success,
    );
    if (valid.length > 0) out[step as StepId] = valid;
  }
  return out;
}

/**
 * Unaccepted AI proposals per step, kept in this browser so a reload or a closed tab does not lose them.
 * Never stored with the project: they are not the team's answers and must not reach the public page.
 */
export function usePendingProposals(slug: string) {
  const [proposals, setProposals] = useState<PendingProposals>({});
  const [loaded, setLoaded] = useState(false);

  // Read after mount: the server render has no storage.
  useEffect(() => {
    try {
      setProposals(parsePending(window.localStorage.getItem(storageKey(slug))));
    } catch {
      // Storage blocked: proposals live for this session only.
    }
    setLoaded(true);
  }, [slug]);

  useEffect(() => {
    if (!loaded) return;
    try {
      const kept = Object.fromEntries(Object.entries(proposals).filter(([, cards]) => cards && cards.length > 0));
      if (Object.keys(kept).length === 0) window.localStorage.removeItem(storageKey(slug));
      else window.localStorage.setItem(storageKey(slug), JSON.stringify(kept));
    } catch {
      // Storage full or blocked: nothing else to do.
    }
  }, [proposals, loaded, slug]);

  return [proposals, setProposals] as const;
}
