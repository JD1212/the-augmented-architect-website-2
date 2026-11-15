-- Explicitly approved Scout Phase 1 addition; dedicated Website 2.0 project only.
-- Shared counters prevent new serverless instances from resetting IP request limits.
create table scout_private.request_limits (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (action in ('read', 'send', 'reset')),
  window_start timestamptz not null,
  expires_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 90),
  primary key (key_hash, action)
);
create index scout_request_limits_expires_idx on scout_private.request_limits (expires_at);
alter table scout_private.request_limits enable row level security;
alter table scout_private.request_limits force row level security;
revoke all on table scout_private.request_limits from public, anon, authenticated, service_role;
grant usage on schema scout_private to service_role;
grant select, insert, update, delete on scout_private.request_limits to service_role;

create function public.scout_consume_request_limit(p_key_hash text, p_action text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  started timestamptz;
  duration interval;
  maximum integer;
  consumed integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' or p_key_hash is null then
    raise exception 'Invalid request key' using errcode = '22023';
  end if;
  case p_action
    when 'read' then maximum := 90; duration := interval '1 minute';
    when 'send' then maximum := 20; duration := interval '1 minute';
    when 'reset' then maximum := 5; duration := interval '1 hour';
    else raise exception 'Invalid request action' using errcode = '22023';
  end case;
  started := date_trunc(case when p_action = 'reset' then 'hour' else 'minute' end, statement_timestamp());
  -- Small bounded cleanup; no scheduler or extra service is needed.
  delete from scout_private.request_limits where (key_hash, action) in (
    select key_hash, action from scout_private.request_limits
    where expires_at < statement_timestamp() - interval '1 day' order by expires_at limit 100
  );
  insert into scout_private.request_limits as limits (key_hash, action, window_start, expires_at, request_count)
    values (p_key_hash, p_action, started, started + duration, 1)
    on conflict (key_hash, action) do update
    set window_start = excluded.window_start, expires_at = excluded.expires_at,
      request_count = case when limits.window_start < excluded.window_start then 1 else limits.request_count + 1 end
    where limits.window_start < excluded.window_start or limits.request_count < maximum
    returning request_count into consumed;
  return consumed is not null;
end;
$$;
revoke all on function public.scout_consume_request_limit(text, text) from public, anon, authenticated;
grant execute on function public.scout_consume_request_limit(text, text) to service_role;
