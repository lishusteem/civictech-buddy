import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { fakeQueue } from '@/lib/ai/provider';
import { getRepo } from '@/lib/db/repo';
import { POST as ai } from './e/[token]/ai/route';
import { POST as alerts } from './e/[token]/alerts/route';
import { POST as summary } from './e/[token]/summary/route';

beforeAll(() => {
  process.env.REPO = 'memory';
  process.env.AI_PROVIDER = 'fake';
});
beforeEach(() => {
  fakeQueue.length = 0;
});

let ipCounter = 0;
const freshIp = () => `10.9.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;
const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
const post = (body: unknown, ip = freshIp()) =>
  new Request('http://x/api/e/t/ai', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

async function newToken() {
  const { editToken } = await getRepo().create('Parcul');
  return editToken;
}

describe('POST /api/e/:token/ai', () => {
  it('returns a default valid proposal from the fake provider', async () => {
    const token = await newToken();
    const res = await ai(post({ step: 'problem', chat: [{ role: 'user', content: 'Salut' }] }), ctx(token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('proposal');
    expect(body.cards[0].kind).toBe('problem');
  });

  it('returns 422 for an invalid body', async () => {
    const token = await newToken();
    expect((await ai(post({ step: 'nope', chat: [] }), ctx(token))).status).toBe(422);
    const tooLong = [{ role: 'user', content: 'x'.repeat(4001) }];
    expect((await ai(post({ step: 'problem', chat: tooLong }), ctx(token))).status).toBe(422);
    expect((await ai(post('not json'), ctx(token))).status).toBe(422);
  });

  it('returns 404 for an unknown token', async () => {
    const res = await ai(post({ step: 'problem', chat: [] }), ctx('nu-exista'));
    expect(res.status).toBe(404);
  });

  it('retries a provider error once, then returns 502', async () => {
    const token = await newToken();
    fakeQueue.push(new Error('down'), JSON.stringify({ kind: 'question', text: 'Cui?' }));
    const ok = await ai(post({ step: 'problem', chat: [] }), ctx(token));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ kind: 'question', text: 'Cui?' });

    fakeQueue.push(new Error('down'), new Error('down'));
    const bad = await ai(post({ step: 'problem', chat: [] }), ctx(token));
    expect(bad.status).toBe(502);
    expect((await bad.json()).error).toBe('AI-ul nu răspunde acum.');
  });

  it('rate limits per IP after 600 calls a day', async () => {
    const ip = '198.51.100.4';
    const repo = getRepo();
    for (let i = 0; i < 600; i++) await repo.hitRateLimit(`ai-ip:${ip}`, 600, 86400);
    const token = await newToken();
    const res = await ai(post({ step: 'problem', chat: [] }, ip), ctx(token));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('Ai atins limita de azi pentru AI. Poți continua în modul formular.');
  });
});

describe('POST /api/e/:token/alerts', () => {
  it('returns only the codes allowed on the step', async () => {
    const token = await newToken();
    fakeQueue.push(JSON.stringify({ alerts: [{ code: 'app_as_goal', refs: [] }, { code: 'magic_leap', refs: [] }] }));
    const res = await alerts(post({ step: 'target' }), ctx(token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts.map((a: { code: string }) => a.code)).toEqual(['app_as_goal']);
  });
});

describe('POST /api/e/:token/summary', () => {
  it('returns the summary text, or an empty text on error', async () => {
    const token = await newToken();
    fakeQueue.push(JSON.stringify({ text: 'Un rezumat.' }));
    expect(await (await summary(post({}), ctx(token))).json()).toEqual({ text: 'Un rezumat.' });
    fakeQueue.push(new Error('down'), new Error('down'));
    const res = await summary(post({}), ctx(token));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: '' });
  });
});
