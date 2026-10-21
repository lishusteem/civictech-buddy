import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createProject } from './projects/route';
import { GET, PUT } from './e/[token]/route';
import { POST as regenerate } from './e/[token]/regenerate/route';

beforeAll(() => {
  process.env.REPO = 'memory';
});

// The memory repo is a process-wide singleton: give every test its own client IP.
let ipCounter = 0;
const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

function create(name: string, ip = freshIp()) {
  return createProject(
    new Request('http://x/api/projects', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: JSON.stringify({ name }),
    }),
  );
}
const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
const get = (token: string) => GET(new Request('http://x/api/e/t'), ctx(token));
const put = (token: string, body: unknown) =>
  PUT(
    new Request('http://x/api/e/t', {
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    ctx(token),
  );

async function setup() {
  const res = await create('Parcul nostru');
  const { editToken } = await res.json();
  const got = await (await get(editToken)).json();
  return { editToken, got };
}

describe('project API', () => {
  it('creates a project and reads it back', async () => {
    const res = await create('Parcul nostru');
    expect(res.status).toBe(201);
    const { slug, editToken } = await res.json();
    expect(slug).toBeTruthy();
    const got = await get(editToken);
    expect(got.status).toBe(200);
    const body = await got.json();
    expect(body.draft.project.name).toBe('Parcul nostru');
    expect(body.published).toBe(false);
  });

  it('rejects names over 120 chars', async () => {
    expect((await create('a'.repeat(121))).status).toBe(422);
  });

  it('saves a draft, then returns 409 for a stale timestamp', async () => {
    const { editToken, got } = await setup();
    const ok = await put(editToken, { draft: got.draft, expectedUpdatedAt: got.draftUpdatedAt });
    expect(ok.status).toBe(200);
    const stale = await put(editToken, { draft: got.draft, expectedUpdatedAt: got.draftUpdatedAt });
    expect(stale.status).toBe(409);
    expect((await stale.json()).conflict.draftUpdatedAt).toBeTruthy();
  });

  it('returns 422 for an invalid draft', async () => {
    const { editToken, got } = await setup();
    const res = await put(editToken, {
      draft: { nope: true },
      expectedUpdatedAt: got.draftUpdatedAt,
    });
    expect(res.status).toBe(422);
    expect((await res.json()).issues.length).toBeGreaterThan(0);
  });

  it('returns 413 for a 600 KB body', async () => {
    const { editToken } = await setup();
    const res = await put(editToken, JSON.stringify({ pad: 'x'.repeat(600 * 1024) }));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe('Conținutul e prea mare.');
  });

  it('returns 404 with the exact message for an unknown token', async () => {
    const res = await get('nu-exista');
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Linkul nu mai e valid.');
  });

  it('invalidates the old token after regenerate', async () => {
    const { editToken } = await setup();
    const res = await regenerate(new Request('http://x', { method: 'POST' }), ctx(editToken));
    expect(res.status).toBe(200);
    const { editToken: next } = await res.json();
    expect((await get(editToken)).status).toBe(404);
    expect((await get(next)).status).toBe(200);
  });

  it('rate limits the 11th creation from one IP', async () => {
    const ip = '203.0.113.7';
    for (let i = 0; i < 10; i++) expect((await create('x', ip)).status).toBe(201);
    const res = await create('x', ip);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('Prea multe proiecte noi. Încearcă peste o oră.');
  });
});
