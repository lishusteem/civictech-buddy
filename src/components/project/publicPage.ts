import type { AlertCode, Project } from '@/lib/project/schema';
import { QUESTION_CODES } from '@/lib/alerts/messages';

type Actor = Project['actors'][number];
type Stage = Project['project']['stage'];

export const STAGE_LABEL: Record<NonNullable<Stage>, string> = {
  idea: 'Idee',
  prototype: 'Prototip',
  live: 'Funcționează deja',
};

/** Chip labels for relations (spec §9.2). Never build a sentence from them. */
export const RELATION_CHIP: Record<Project['relations'][number]['type'], string> = {
  decides: 'decide',
  funds: 'finanțează',
  influences: 'influențează',
  blocks: 'poate bloca',
  holds_data: 'are datele',
  represents: 'reprezintă',
};

export const SELF_NAME_LABEL = 'Inițiatorul proiectului';
const PITCH_MAX = 160;

/** First sentence: up to the first ., ! or ? followed by whitespace or the end. */
export function firstSentence(text: string): string {
  const t = text.trim();
  const m = /^[\s\S]*?[.!?](?=\s|$)/.exec(t);
  return m ? m[0] : t;
}

/** Caps text at `max` characters on a word boundary, ending with „…”. */
function capOnWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

export type Pitch = { text: string; source: 'pitch' | 'description' | 'problem' | 'none' };

/**
 * The one-sentence pitch under the title. `project.pitch` does not exist yet (P1-6), so it is read
 * when present and otherwise derived: first sentence of the description, then of the problem.
 */
export function pitchOf(p: Project): Pitch {
  const explicit = (p.project as { pitch?: unknown }).pitch;
  if (typeof explicit === 'string' && explicit.trim() !== '') return { text: capOnWord(explicit.trim(), PITCH_MAX), source: 'pitch' };
  const fromDescription = firstSentence(p.project.description);
  if (fromDescription) return { text: capOnWord(fromDescription, PITCH_MAX), source: 'description' };
  const fromProblem = firstSentence(p.problem.statement);
  if (fromProblem) return { text: capOnWord(fromProblem, PITCH_MAX), source: 'problem' };
  return { text: '', source: 'none' };
}

export function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

const hostIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export type Contact =
  | { kind: 'link'; label: string; href: string; external: boolean }
  | { kind: 'text'; text: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** How the contact is shown on the public page (spec §9.2, "Contact rendering"). Null when empty. */
export function parseContact(raw: string): Contact | null {
  const text = raw.trim();
  if (text === '') return null;
  if (EMAIL.test(text)) return { kind: 'link', label: 'Scrie-ne', href: `mailto:${text}`, external: false };
  const href = safeHttpUrl(text);
  if (!href) return { kind: 'text', text };
  const host = hostOf(href);
  const label =
    hostIs(host, 'discord.gg') || hostIs(host, 'discord.com')
      ? 'Intră pe Discord'
      : hostIs(host, 'chat.whatsapp.com') || hostIs(host, 'wa.me') || hostIs(host, 'whatsapp.com')
        ? 'Intră în grupul WhatsApp'
        : 'Contactează-ne ↗';
  return { kind: 'link', label, href, external: true };
}

const FORGES: [string, string][] = [
  ['github.com', 'GitHub'],
  ['gitlab.com', 'GitLab'],
  ['codeberg.org', 'Codeberg'],
  ['bitbucket.org', 'Bitbucket'],
];

/** Label of the hero text link: the forge name for code, else „Demo” once something runs, else „Site”. */
export function linkLabel(url: string, stage: Stage): string {
  const host = hostOf(url);
  const forge = FORGES.find(([domain]) => hostIs(host, domain));
  if (forge) return `Codul pe ${forge[1]} ↗`;
  return stage === 'prototype' || stage === 'live' ? 'Demo ↗' : 'Site ↗';
}

export function isSelfName(name: string): boolean {
  return /^(tu|eu|me)$/i.test(name.trim());
}

/** A team member's public name: „tu” / „eu” / „me” never reach the page. */
export function memberName(name: string): string {
  return isSelfName(name) ? SELF_NAME_LABEL : name;
}

export type ActorGroup = { title: string; actors: Actor[] };

/** Groups for „Cine contează”; an actor goes into the first rule that matches, groups are shown in display order. */
export function groupActors(actors: Actor[]): ActorGroup[] {
  const rules: { key: string; match: (a: Actor) => boolean }[] = [
    { key: 'Cine decide', match: (a) => a.type === 'institution' || a.type === 'funder' || a.power === 'high' },
    { key: 'Pot bloca', match: (a) => a.stance === 'opposes' },
    { key: 'Aliați posibili', match: (a) => a.stance === 'supports' || a.type === 'ngo' || a.type === 'media' },
    { key: 'Pe cine afectează', match: (a) => a.type === 'user' || a.excluded },
    { key: 'Alții', match: () => true },
  ];
  const byKey = new Map<string, Actor[]>(rules.map((r) => [r.key, []]));
  for (const a of actors) byKey.get(rules.find((r) => r.match(a))!.key)!.push(a);
  const order = ['Cine decide', 'Pe cine afectează', 'Aliați posibili', 'Pot bloca', 'Alții'];
  return order.map((title) => ({ title, actors: byKey.get(title)! })).filter((g) => g.actors.length > 0);
}

/** Alerts that are questions for the person (spec §5.1); the other codes are checklist rows and never public. */
export const QUESTION_ALERT_CODES: ReadonlySet<AlertCode> = new Set<AlertCode>(QUESTION_CODES);

const MAX_PUBLIC_QUESTIONS = 6;

/** „Întrebări la care ne poți ajuta”: dismissed question alerts (unless hidden) and toFindOut, de-duplicated, at most 6. */
export function publicQuestions(p: Project): string[] {
  const fromAlerts = p.alerts
    .filter((a) => a.status === 'dismissed' && QUESTION_ALERT_CODES.has(a.code))
    .filter((a) => (a as { public?: boolean }).public !== false)
    .map((a) => a.message);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...fromAlerts, ...p.toFindOut.map((q) => q.text)]) {
    const text = raw.trim();
    const key = text.toLowerCase();
    if (text === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === MAX_PUBLIC_QUESTIONS) break;
  }
  return out;
}

const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sept', 'oct', 'nov', 'dec'];

/** „21 oct 2026”, in Romanian time so the server and the browser agree. */
export function formatShortDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((x) => x.type === type)!.value);
  return `${get('day')} ${MONTHS[get('month') - 1]} ${get('year')}`;
}

/** The auto-generated card from „Nu am găsit nimic similar” (StepScreen). */
export function isNothingFoundCard(x: Project['existing'][number]): boolean {
  return x.name.trim() === 'Nimic similar găsit' && x.url === null;
}
