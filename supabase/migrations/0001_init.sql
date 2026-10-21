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

-- Atomic fixed-window rate limit. Returns true when the call is allowed.
create or replace function hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
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

revoke all on function hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, int, int) to service_role;
