create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  edit_token_hash text unique not null,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz,
  draft_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

alter table projects enable row level security;
alter table rate_limits enable row level security;
-- No policies: only the service role (which bypasses RLS) can access these tables.

-- Explicit privileges: Supabase grants new public tables to anon/authenticated by default.
revoke all on table projects, rate_limits from anon, authenticated;
grant select, insert, update, delete on table projects, rate_limits to service_role;

-- Atomic fixed-window rate limit. Returns true when the call is allowed.
create or replace function hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_window timestamptz;
  v_count int;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- opportunistic cleanup of old windows for this key
  delete from rate_limits
  where key = p_key and window_start < v_window - make_interval(secs => p_window_seconds * 2);

  return v_count <= p_limit;
end;
$fn$;

-- Optimistic save of a draft, in one statement.
--   status 'ok'       -> draft_updated_at is the new timestamp (clock_timestamp(), unique per save)
--   status 'conflict' -> draft / draft_updated_at are the stored version (the expected timestamp did not match)
--   status 'invalid'  -> no project has this token hash
-- p_force skips the timestamp check ("keep my version").
create or replace function save_draft(p_hash text, p_draft jsonb, p_expected timestamptz, p_force boolean)
returns table (status text, draft jsonb, draft_updated_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $fn$
#variable_conflict use_column
declare
  v_ts timestamptz;
begin
  update projects as p
  set draft = p_draft,
      draft_updated_at = clock_timestamp()
  where p.edit_token_hash = p_hash
    and (p_force or p.draft_updated_at = p_expected)
  returning p.draft_updated_at into v_ts;

  if found then
    return query select 'ok'::text, null::jsonb, v_ts;
    return;
  end if;

  return query
    select 'conflict'::text, p.draft, p.draft_updated_at
    from projects as p
    where p.edit_token_hash = p_hash;
  if not found then
    return query select 'invalid'::text, null::jsonb, null::timestamptz;
  end if;
end;
$fn$;

-- Publishes the current draft: the public copy has no chat messages (steps.*.messages = [])
-- and no stale ids (stale = []), like toPublished() in src/lib/project/published.ts.
-- Returns no row for an unknown token hash.
create or replace function publish_project(p_hash text)
returns table (slug text, published_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $fn$
#variable_conflict use_column
begin
  return query
  with updated as (
    update projects as p
    set published = jsonb_set(
          p.draft || jsonb_build_object('stale', '[]'::jsonb),
          '{steps}',
          coalesce(
            (select jsonb_object_agg(s.key, s.value || jsonb_build_object('messages', '[]'::jsonb))
             from jsonb_each(p.draft -> 'steps') as s),
            '{}'::jsonb
          )
        ),
        published_at = now()
    where p.edit_token_hash = p_hash
    returning p.slug, p.published_at
  )
  select u.slug, u.published_at from updated as u;
end;
$fn$;

revoke all on function hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, int, int) to service_role;
revoke all on function save_draft(text, jsonb, timestamptz, boolean) from public, anon, authenticated;
grant execute on function save_draft(text, jsonb, timestamptz, boolean) to service_role;
revoke all on function publish_project(text) from public, anon, authenticated;
grant execute on function publish_project(text) to service_role;
