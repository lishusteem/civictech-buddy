// Manual smoke test against a real Supabase project (not run in CI).
// Usage: npx tsx --env-file=.env.local scripts/smoke-repo.ts
// Leaves a "Smoke test" project in the database; delete it by hand afterwards.
import assert from 'node:assert/strict';
import { createSupabaseRepo } from '../src/lib/db/supabaseRepo';

async function main() {
  const repo = createSupabaseRepo();
  const { stored, editToken } = await repo.create('Smoke test');
  const draft = structuredClone(stored.draft);
  draft.direction = 'smoke';
  draft.steps.problem.messages = [{ role: 'user', content: 'smoke' }];
  const saved = await repo.saveDraft(editToken, draft, stored.draftUpdatedAt);
  assert.ok(saved && saved.ok, 'saveDraft should succeed');
  const stale = await repo.saveDraft(editToken, draft, stored.draftUpdatedAt);
  assert.ok(stale && !stale.ok, 'stale saveDraft should conflict');
  const forced = await repo.saveDraft(editToken, draft, stored.draftUpdatedAt, true);
  assert.ok(forced && forced.ok, 'forced saveDraft should succeed');
  assert.equal(await repo.saveDraft('not-a-token', draft, stored.draftUpdatedAt), null);
  const pub = await repo.publish(editToken);
  assert.equal(pub?.slug, stored.slug);
  const bySlug = await repo.getPublishedBySlug(stored.slug);
  assert.equal(bySlug?.published.direction, 'smoke');
  assert.deepEqual(bySlug?.published.steps.problem.messages, [], 'published copy has no messages');
  assert.equal((await repo.getByToken(editToken))?.draft.steps.problem.messages.length, 1);
  const key = `smoke-${Date.now()}`;
  assert.equal(await repo.hitRateLimit(key, 1, 60), true);
  assert.equal(await repo.hitRateLimit(key, 1, 60), false);
  console.log('OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
