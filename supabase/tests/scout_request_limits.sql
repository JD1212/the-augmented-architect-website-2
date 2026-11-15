-- Dedicated Scout project only. Synthetic counter rows roll back.
begin;
do $$
begin
  if has_function_privilege('anon','public.scout_consume_request_limit(text,text)','EXECUTE')
    or has_function_privilege('authenticated','public.scout_consume_request_limit(text,text)','EXECUTE')
    or has_table_privilege('anon','scout_private.request_limits','SELECT')
    or has_table_privilege('authenticated','scout_private.request_limits','SELECT') then
    raise exception 'Request limits exposed to visitors';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='scout_private' and c.relname='request_limits' and c.relrowsecurity and c.relforcerowsecurity) then
    raise exception 'Request-counter RLS missing';
  end if;
end;
$$;
set local role service_role;
do $$
declare
  test_hash text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  i integer;
begin
  for i in 1..20 loop
    if not public.scout_consume_request_limit(test_hash,'send') then raise exception 'Allowed send rejected'; end if;
  end loop;
  if public.scout_consume_request_limit(test_hash,'send') then raise exception 'Send limit bypassed'; end if;
  for i in 1..5 loop
    if not public.scout_consume_request_limit(test_hash,'reset') then raise exception 'Allowed reset rejected'; end if;
  end loop;
  if public.scout_consume_request_limit(test_hash,'reset') then raise exception 'Reset limit bypassed'; end if;
  for i in 1..90 loop
    if not public.scout_consume_request_limit(test_hash,'read') then raise exception 'Allowed read rejected'; end if;
  end loop;
  if public.scout_consume_request_limit(test_hash,'read') then raise exception 'Read limit bypassed'; end if;
  begin
    perform public.scout_consume_request_limit(test_hash,'unknown');
    raise exception 'Unknown action accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.scout_consume_request_limit('invalid-hash','send');
    raise exception 'Invalid hash accepted';
  exception when invalid_parameter_value then null; end;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.scout_consume_request_limit(repeat('a',64),'send');
    raise exception 'Visitor can call rate-limit RPC';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
select 'Shared Scout request limits, validation, and visitor restrictions passed; synthetic counters rolled back.' as verification;
