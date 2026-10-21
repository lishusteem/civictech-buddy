import fs from 'node:fs';
import path from 'node:path';
import { entitiesForStep, STEP_ENTITIES, type Card, type EntityKind } from '../project/entities';
import type { Message, Project, StepId } from '../project/schema';
import { ROLE_RULES } from '../roles/rules';
import { STEPS } from '../steps/definitions';
import { CONTEXT_MARKER, STEP_MARKER, type ChatMessage } from './provider';

const cache = new Map<string, string>();

/** Reads a file under prompts/ (cached). */
export function loadPrompt(relPath: string): string {
  let text = cache.get(relPath);
  if (text === undefined) {
    text = fs.readFileSync(path.join(process.cwd(), 'prompts', relPath), 'utf8');
    cache.set(relPath, text);
  }
  return text;
}

/**
 * Accepted entities of every step up to and including `upTo` (all steps when
 * omitted), grouped by step. A kind shown in an earlier step is not repeated.
 */
export function acceptedContext(p: Project, upTo?: StepId): Partial<Record<StepId, Card[]>> {
  const last = upTo ? STEPS.findIndex((s) => s.id === upTo) : STEPS.length - 1;
  const seen = new Set<EntityKind>();
  const out: Partial<Record<StepId, Card[]>> = {};
  for (const { id } of STEPS.slice(0, last + 1)) {
    const fresh = STEP_ENTITIES[id].filter((k) => !seen.has(k));
    fresh.forEach((k) => seen.add(k));
    const cards = entitiesForStep(p, id).filter((c) => fresh.includes(c.kind));
    if (cards.length > 0) out[id] = cards;
  }
  return out;
}

export function contextMessage(p: Project, upTo?: StepId): ChatMessage {
  return {
    role: 'user',
    content: `${CONTEXT_MARKER} ce a acceptat deja dev-ul, pe pași (JSON)\n${JSON.stringify(acceptedContext(p, upTo))}`,
  };
}

function roleRulesText(): string {
  const lines = ROLE_RULES.map(
    (r) => `- Semnal: ${r.signal} → rol: ${r.role} (etapă tipică: ${r.stage})`,
  );
  return `Reguli de derivare a rolurilor:\n${lines.join('\n')}`;
}

export function buildMessages(p: Project, step: StepId, chat: Message[]): ChatMessage[] {
  const parts = [loadPrompt('system.md'), `${STEP_MARKER} ${step}`, loadPrompt(`steps/${step}.md`)];
  if (step === 'roles') parts.push(roleRulesText());
  return [
    { role: 'system', content: parts.join('\n\n') },
    contextMessage(p, step),
    ...chat.map((m) => ({ role: m.role, content: m.content })),
  ];
}
