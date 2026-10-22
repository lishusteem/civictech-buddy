import { describe, it, expect } from 'vitest';
import { createEmptyProject } from '@/lib/project/empty';
import type { Project } from '@/lib/project/schema';
import {
  RELATION_CHIP,
  firstSentence,
  formatShortDate,
  groupActors,
  isSelfName,
  linkLabel,
  memberName,
  parseContact,
  pitchOf,
  publicQuestions,
} from './publicPage';

type Actor = Project['actors'][number];
const actor = (id: string, over: Partial<Actor> = {}): Actor => ({
  id,
  name: id.toUpperCase(),
  type: 'other',
  power: 'low',
  stance: 'neutral',
  excluded: false,
  ...over,
});

describe('firstSentence', () => {
  it('cuts at the first . ! or ? followed by space or end', () => {
    expect(firstSentence('Prima. A doua.')).toBe('Prima.');
    expect(firstSentence('Oare? Da.')).toBe('Oare?');
    expect(firstSentence('Versiunea 2.5 e gata. Mai e ceva.')).toBe('Versiunea 2.5 e gata.');
    expect(firstSentence('Fără punct')).toBe('Fără punct');
    expect(firstSentence('')).toBe('');
  });
});

describe('pitchOf (P0 fallback until project.pitch exists)', () => {
  it('uses the first sentence of the description', () => {
    const p = createEmptyProject('P');
    p.project.description = 'Asociațiile raportează problemele. Apoi altceva.';
    p.problem.statement = 'Problema. Rest.';
    expect(pitchOf(p)).toEqual({ text: 'Asociațiile raportează problemele.', source: 'description' });
  });

  it('caps at 160 characters on a word boundary with …', () => {
    const p = createEmptyProject('P');
    p.project.description = `${'cuvânt '.repeat(40)}final.`;
    const { text } = pitchOf(p);
    expect(text.length).toBeLessThanOrEqual(160);
    expect(text.endsWith('…')).toBe(true);
    expect(text).toMatch(/cuvânt…$/);
  });

  it('falls back to the first sentence of the problem, then to empty', () => {
    const p = createEmptyProject('P');
    p.problem.statement = 'Oamenii nu pot raporta gropile. Nimeni nu răspunde.';
    expect(pitchOf(p)).toEqual({ text: 'Oamenii nu pot raporta gropile.', source: 'problem' });
    expect(pitchOf(createEmptyProject('P'))).toEqual({ text: '', source: 'none' });
  });

  it('prefers an explicit pitch when the data has one', () => {
    const p = createEmptyProject('P');
    p.project.description = 'Descriere.';
    (p.project as Record<string, unknown>).pitch = 'Pitch explicit';
    expect(pitchOf(p)).toEqual({ text: 'Pitch explicit', source: 'pitch' });
  });
});

describe('parseContact', () => {
  it('turns an email into "Scrie-ne" with mailto', () => {
    expect(parseContact('ana@exemplu.ro')).toEqual({ kind: 'link', label: 'Scrie-ne', href: 'mailto:ana@exemplu.ro', external: false });
  });

  it('labels Discord, WhatsApp and other http(s) links', () => {
    expect(parseContact('https://discord.gg/abc')).toMatchObject({ kind: 'link', label: 'Intră pe Discord', href: 'https://discord.gg/abc', external: true });
    expect(parseContact('https://discord.com/invite/abc')).toMatchObject({ label: 'Intră pe Discord' });
    expect(parseContact('https://chat.whatsapp.com/xyz')).toMatchObject({ label: 'Intră în grupul WhatsApp' });
    expect(parseContact('https://wa.me/40700000000')).toMatchObject({ label: 'Intră în grupul WhatsApp' });
    expect(parseContact('https://exemplu.ro/grup')).toMatchObject({ label: 'Contactează-ne ↗', external: true });
  });

  it('shows anything else as text and nothing when empty', () => {
    expect(parseContact('Telegram: @ana')).toEqual({ kind: 'text', text: 'Telegram: @ana' });
    expect(parseContact('javascript:alert(1)')).toEqual({ kind: 'text', text: 'javascript:alert(1)' });
    expect(parseContact('   ')).toBeNull();
  });
});

describe('linkLabel', () => {
  it('labels forges by name, other hosts as Demo or Site', () => {
    expect(linkLabel('https://github.com/a/b', 'prototype')).toBe('Codul pe GitHub ↗');
    expect(linkLabel('https://gitlab.com/a/b', null)).toBe('Codul pe GitLab ↗');
    expect(linkLabel('https://codeberg.org/a/b', null)).toBe('Codul pe Codeberg ↗');
    expect(linkLabel('https://demo.exemplu.ro', 'prototype')).toBe('Demo ↗');
    expect(linkLabel('https://exemplu.ro', 'live')).toBe('Demo ↗');
    expect(linkLabel('https://exemplu.ro', 'idea')).toBe('Site ↗');
    expect(linkLabel('https://exemplu.ro', null)).toBe('Site ↗');
  });
});

describe('RELATION_CHIP', () => {
  it('uses short chip labels, never a sentence template', () => {
    expect(RELATION_CHIP).toEqual({
      decides: 'decide',
      funds: 'finanțează',
      influences: 'influențează',
      blocks: 'poate bloca',
      holds_data: 'are datele',
      represents: 'reprezintă',
    });
  });
});

describe('isSelfName / memberName', () => {
  it('replaces tu / eu / me with "Inițiatorul proiectului"', () => {
    for (const n of ['tu', 'Tu', ' EU ', 'me']) expect(isSelfName(n)).toBe(true);
    for (const n of ['Ana', 'tudor', 'meu', '']) expect(isSelfName(n)).toBe(false);
    expect(memberName('tu')).toBe('Inițiatorul proiectului');
    expect(memberName('Ana')).toBe('Ana');
  });
});

describe('groupActors', () => {
  it('puts each actor in the first matching group, in display order', () => {
    const groups = groupActors([
      actor('inst', { type: 'institution' }),
      actor('strong', { power: 'high', stance: 'opposes' }),
      actor('opp', { stance: 'opposes' }),
      actor('ngo', { type: 'ngo' }),
      actor('sup', { stance: 'supports' }),
      actor('usr', { type: 'user' }),
      actor('excl', { excluded: true }),
      actor('rest'),
    ]);
    expect(groups.map((g) => [g.title, g.actors.map((a) => a.id)])).toEqual([
      ['Cine decide', ['inst', 'strong']],
      ['Pe cine afectează', ['usr', 'excl']],
      ['Aliați posibili', ['ngo', 'sup']],
      ['Pot bloca', ['opp']],
      ['Alții', ['rest']],
    ]);
  });

  it('drops empty groups', () => {
    expect(groupActors([actor('u', { type: 'user' })]).map((g) => g.title)).toEqual(['Pe cine afectează']);
  });
});

describe('publicQuestions', () => {
  it('lists dismissed question alerts and toFindOut, de-duplicated, at most 6', () => {
    const p = createEmptyProject('P');
    p.alerts = [
      { code: 'build_and_they_come', step: 7, refs: [], status: 'dismissed', message: 'Cum află primii oameni?' },
      { code: 'build_and_they_come', step: 7, refs: [], status: 'dismissed', message: 'Cum află primii oameni?' },
      { code: 'team_no_time', step: 1, refs: [], status: 'open', message: 'Încă deschisă' },
      { code: 'no_evidence', step: 2, refs: [], status: 'dismissed', message: 'Checklist, nu întrebare' },
    ];
    p.toFindOut = [
      { id: 'q1', step: 'problem', text: 'Cum află primii oameni?' },
      ...['A', 'B', 'C', 'D', 'E', 'F'].map((t, i) => ({ id: `x${i}`, step: 'problem' as const, text: t })),
    ];
    expect(publicQuestions(p)).toEqual(['Cum află primii oameni?', 'A', 'B', 'C', 'D', 'E']);
  });

  it('skips alerts marked as not public', () => {
    const p = createEmptyProject('P');
    p.alerts = [{ code: 'magic_leap', step: 7, refs: [], status: 'dismissed', message: 'Ascunsă' }];
    (p.alerts[0] as Record<string, unknown>).public = false;
    expect(publicQuestions(p)).toEqual([]);
  });
});

describe('formatShortDate', () => {
  it('formats as "21 oct 2026" in Romanian time', () => {
    expect(formatShortDate('2026-10-21T10:00:00.000Z')).toBe('21 oct 2026');
    // 23:30 UTC is already the next day in Bucharest.
    expect(formatShortDate('2026-10-21T23:30:00.000Z')).toBe('22 oct 2026');
  });
});
