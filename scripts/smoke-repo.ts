// Manual smoke test against a real Supabase project (not run in CI).
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/smoke-repo.ts
import assert from 'node:assert/strict';
import { createSupabaseRepo } from '../src/lib/db/supabaseRepo';

async function main() {
  const repo = createSupabaseRepo();
  const { stored, editToken } = await repo.create('Smoke test');
  const draft = { ...stored.draft, direction: 'smoke' };
  const saved = await repo.saveDraft(editToken, draft, stored.draftUpdatedAt);
  assert.ok(saved && saved.ok, 'saveDraft should succeed');
  const stale = await repo.saveDraft(editToken, draft, stored.draftUpdatedAt);
  assert.ok(stale && !stale.ok, 'stale saveDraft should conflict');
  const pub = await repo.publish(editToken);
  assert.equal(pub?.published?.direction, 'smoke');
  const bySlug = await repo.getBySlug(stored.slug);
  assert.equal(bySlug?.published?.direction, 'smoke');
  const key = `smoke-${Date.now()}`;
  assert.equal(await repo.hitRateLimit(key, 1, 60), true);
  assert.equal(await repo.hitRateLimit(key, 1, 60), false);
  console.log('OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
